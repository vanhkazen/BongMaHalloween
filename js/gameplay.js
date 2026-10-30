const PIXEL_SIZE = 4;
const CANDY_POINTS = 100;
const FREEZE_CHARGE = 125;
const FREEZE_TIME = 125;
const POWERUP_TIME = 320;
const DEBUFF_TIME = 280;
const MAX_MINI_GHOSTS = 4;
const MAX_WEBS = 6;

export const CHARACTERS = [
  {
    id: "ghost-kid",
    name: "Ghost Kid",
    tagline: "Ma nhỏ tinh nghịch",
    description: "Một hồn ma bé xíu, áo choàng mềm và chiếc mũ fez đỏ may mắn.",
    palette: { 1: "#fff8e9", 2: "#a9d8f4", 3: "#242443", 4: "#ed6d79" },
  },
  {
    id: "pumpkin-boy",
    name: "Pumpkin Boy",
    tagline: "Bí ngô dũng cảm",
    description: "Bí ngô cam có cuống xanh và nụ cười răng cưa luôn sẵn sàng.",
    palette: { 1: "#f78a43", 2: "#bd4f37", 3: "#211b38", 4: "#8fd17a" },
  },
  {
    id: "witch-cat",
    name: "Witch Cat",
    tagline: "Phù thủy mèo phép thuật",
    description: "Mèo tím tai nhọn, ria mép bạc và chiếc mũ phù thủy lấp lánh.",
    palette: { 1: "#b894ed", 2: "#6d55a7", 3: "#fff0a5", 4: "#f184ba" },
  },
  {
    id: "vampire",
    name: "Vampire",
    tagline: "Ma cà rồng nhí lịch thiệp",
    description: "Áo choàng đỏ rượu, tóc đen bóng và hai chiếc nanh bé xíu.",
    palette: { 1: "#e9d8e8", 2: "#9b385e", 3: "#282038", 4: "#711d43" },
  },
];

const BIOMES = [
  { title: "Nghĩa địa trăng non", hue: 255, note: "Những bóng ma hiền lành đang chờ bạn." },
  { title: "Vườn bí ngô phát sáng", hue: 28, note: "Bí ngô lấp lánh, ma bắt đầu nhanh chân hơn." },
  { title: "Rừng kẹo phù thủy", hue: 176, note: "Đường đi ngoằn ngoèo và nhiều mạng nhện hơn." },
  { title: "Lâu đài ma trăng tím", hue: 282, note: "Các bóng ma bay theo đàn, hãy quan sát thật kỹ." },
  { title: "Đêm hội Halloween", hue: 333, note: "Thử thách cuối đang đến gần!" },
  { title: "Dạ tiệc bí ngô cuối cùng", hue: 43, note: "Màn cuối cùng — hãy gom kẹo và bước qua cổng chiến thắng!" },
];

export const LEVELS = Array.from({ length: 26 }, (_, index) => {
  const level = index + 1;
  const biomeIndex = level === 26 ? 5 : Math.min(4, Math.floor((level - 1) / 5));
  const biome = BIOMES[biomeIndex];
  return {
    level,
    title: biome.title,
    themeNote: biome.note,
    biome: biomeIndex,
    hue: biome.hue,
    candies: Math.min(8, 4 + Math.floor((level - 1) / 5)),
    miniGhosts: Math.min(MAX_MINI_GHOSTS, 1 + Math.floor((level - 1) / 7)),
    webs: Math.min(MAX_WEBS, 1 + Math.floor((level - 1) / 5)),
    ghostSpeed: Math.min(2.35, 1.15 + (level - 1) * 0.047),
    miniSpeed: Math.min(1.7, 0.85 + (level - 1) * 0.03),
  };
});

const pixelCache = new Map();
const PLAYER_WIDTH = 14 * PIXEL_SIZE;
const PLAYER_HEIGHT = 16 * PIXEL_SIZE;
const GHOST_WIDTH = 22 * PIXEL_SIZE;
const GHOST_HEIGHT = 20 * PIXEL_SIZE;

function buildPlayerMask(characterId, facingRight, bob) {
  const mask = Array.from({ length: 16 }, () => Array(14).fill(0));
  const put = (x, y, value) => {
    if (mask[y] && mask[y][x] !== undefined) mask[y][x] = value;
  };
  const fill = (left, right, top, bottom, value) => {
    for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) put(x, y, value);
  };

  if (characterId === "pumpkin-boy") {
    const rows = [[6, 7], [5, 8], [3, 10], [2, 11], [2, 11], [1, 12], [1, 12], [2, 11], [2, 11], [3, 10], [4, 9]];
    rows.forEach(([left, right], row) => fill(left, right, row + 4, row + 4, row === 0 ? 4 : 1));
    fill(6, 7, 2, 3, 4);
    fill(3, 4, 7, 8, 3);
    fill(9, 10, 7, 8, 3);
    fill(5, 8, 10, 10, 3);
    fill(4, 5, 11, 11, 3);
    fill(8, 9, 11, 11, 3);
    [5, 8].forEach((x) => { put(x, 6, 2); put(x, 9, 2); });
    return mask;
  }

  if (characterId === "witch-cat") {
    fill(3, 4, 2, 5, 2); fill(9, 10, 2, 5, 2);
    fill(4, 5, 3, 4, 1); fill(8, 9, 3, 4, 1);
    fill(3, 10, 5, 12, 1); fill(4, 9, 13, 14, 1);
    fill(1, 2, 10, 11, 1); fill(0, 1, 9, 10, 2);
    fill(4, 5, 8, 9, 3); fill(8, 9, 8, 9, 3);
    put(6, 10, 4); put(7, 10, 4);
    fill(4, 8, 3, 3, 4); fill(3, 9, 4, 4, 2);
    fill(5, 7, 1, 2, 4); put(6, 0, 4);
    put(1, 7, 4); put(0, 6, 4); put(2, 8, 4);
    return mask;
  }

  if (characterId === "vampire") {
    fill(2, 11, 6, 13, 4);
    fill(3, 10, 4, 10, 1);
    fill(4, 9, 5, 9, 1);
    fill(2, 4, 4, 6, 4); fill(9, 11, 4, 6, 4);
    fill(4, 5, 7, 8, 3); fill(8, 9, 7, 8, 3);
    put(6, 10, 4); put(7, 10, 4); put(5, 10, 4); put(8, 10, 4);
    fill(5, 8, 2, 3, 2); fill(4, 9, 3, 4, 2);
    put(5, 11, 4); put(8, 11, 4);
    return mask;
  }

  const bodyTop = 4 + Math.round(bob);
  fill(5, 8, 0, 2, 3);
  fill(5, 8, 3, 3, 4);
  put(9, 2, 4); put(10, 3, 4);
  for (let y = bodyTop; y < bodyTop + 8; y++) fill(2, 11, y, y, 1);
  [2, 11].forEach((x) => { put(x, bodyTop, 0); put(x, bodyTop + 7, 0); });
  fill(3, 4, bodyTop + 8, bodyTop + 8, 1);
  fill(9, 10, bodyTop + 8, bodyTop + 8, 1);
  const eyeOffset = facingRight ? 1 : -1;
  fill(3 + eyeOffset, 4 + eyeOffset, bodyTop + 2, bodyTop + 3, 3);
  fill(8 + eyeOffset, 9 + eyeOffset, bodyTop + 2, bodyTop + 3, 3);
  return mask;
}

function buildGhostMask(width, height, mini = false) {
  const mask = Array.from({ length: height }, () => Array(width).fill(0));
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.43;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const distance = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (distance <= radius) mask[y][x] = distance > radius - 1 ? 2 : 1;
    }
  }
  for (let x = 1; x < width - 1; x += 3) {
    const y = Math.floor(height * 0.72 + Math.sin(x) * 0.5);
    if (mask[y]) mask[y][x] = 2;
    if (mask[y + 1]) mask[y + 1][x] = 1;
  }
  const eyeY = Math.floor(height * 0.4);
  const eyeWidth = Math.max(2, Math.floor(width * 0.1));
  const eyeHeight = Math.max(2, Math.floor(height * 0.16));
  const eyeLeft = Math.floor(cx - radius * 0.45);
  const eyeRight = Math.floor(cx + radius * 0.25);
  for (let y = eyeY; y < eyeY + eyeHeight; y++) {
    for (let x = 0; x < eyeWidth; x++) {
      if (mask[y]) {
        if (mask[y][eyeLeft + x] !== undefined) mask[y][eyeLeft + x] = 3;
        if (mask[y][eyeRight + x] !== undefined) mask[y][eyeRight + x] = 3;
      }
    }
  }
  if (!mini) {
    for (let y = Math.floor(cy + 1); y < Math.floor(cy + 4); y++) {
      for (let x = Math.floor(cx - 3); x < Math.floor(cx + 3); x++) {
        if (mask[y] && mask[y][x]) mask[y][x] = 4;
      }
    }
  }
  return mask;
}

function drawPixelMask(element, mask, palette, pixelSize = PIXEL_SIZE) {
  const colors = Object.values(palette).join("|");
  const key = `${pixelSize}:${colors}:${mask.map((row) => row.join("")).join("/")}`;
  let shadow = pixelCache.get(key);
  if (!shadow) {
    const pixels = [];
    for (let y = 0; y < mask.length; y++) {
      for (let x = 0; x < mask[y].length; x++) {
        const color = palette[mask[y][x]];
        if (color) pixels.push(`${x * pixelSize}px ${y * pixelSize}px 0 ${color}`);
      }
    }
    shadow = pixels.join(",");
    if (pixelCache.size > 160) pixelCache.clear();
    pixelCache.set(key, shadow);
  }
  if (element._pixelShadow !== shadow) {
    element.style.boxShadow = shadow;
    element._pixelShadow = shadow;
  }
  element.style.width = `${pixelSize}px`;
  element.style.height = `${pixelSize}px`;
}

export function paintCharacterPreview(element, characterId) {
  const character = CHARACTERS.find((item) => item.id === characterId) || CHARACTERS[0];
  drawPixelMask(element, buildPlayerMask(character.id, true, 0), character.palette, 5);
}

export function createGameplay({ onHud = () => {}, onLevelComplete = () => {}, onGameComplete = () => {}, onEffect = () => {} } = {}) {
  const gameEl = document.getElementById("game");
  const playerEl = document.getElementById("player");
  const playerShadowEl = document.getElementById("player-shadow");
  const spookEl = document.getElementById("spook");
  const candiesEl = document.getElementById("candies");
  const websEl = document.getElementById("webs");
  const miniGhostsEl = document.getElementById("mini-ghosts");
  const playerNameDisplay = document.getElementById("player-name-display");
  const spookNameDisplay = document.getElementById("spook-name-display");
  const pixelUnit = window.matchMedia("(max-width: 600px)").matches ? 3 : PIXEL_SIZE;
  const playerMaskCache = new Map();
  const world = {
    width: window.innerWidth,
    height: window.innerHeight,
    floorY: window.innerHeight - 42,
    time: 0,
    level: 1,
    levelScore: 0,
    totalScore: 0,
    keys: { left: 0, right: 0, up: 0, down: 0 },
    target: null,
    currentAngle: 0,
    p: { x: 70, y: 180, width: PLAYER_WIDTH, height: PLAYER_HEIGHT, vx: 0, vy: 0, speed: 2.2, baseSpeed: 2.2, dragged: false, dragOffsetX: 0, dragOffsetY: 0 },
    g: { x: 480, y: 200, width: GHOST_WIDTH, height: GHOST_HEIGHT, vx: 0, vy: 0, speed: 1.15, shy: false, freezeTimer: 0, frozen: false },
    candies: [],
    webs: [],
    miniGhosts: [],
    portal: null,
    powerup: null,
    powerupType: null,
    powerupTimer: 0,
    powerupSpawnTimer: 1000,
    debuffTimer: 0,
    invulnerable: 0,
    combo: 0,
    comboTimer: 0,
    wasHit: false,
    levelStartedAt: 0,
    selectedCharacter: "ghost-kid",
    playerName: "Bạn",
    spookName: "Ghost",
    collectedCandy: 0,
    completedLevels: 0,
    perfectLevels: 0,
    totalCandies: 0,
    bestCombo: 0,
    elapsedFastestLevel: Infinity,
    active: false,
    completed: false,
  };

  function config() { return LEVELS[world.level - 1]; }
  function playerPalette() {
    return CHARACTERS.find((item) => item.id === world.selectedCharacter)?.palette || CHARACTERS[0].palette;
  }
  function updateDimensions() {
    const rect = gameEl.getBoundingClientRect();
    world.width = rect.width;
    world.height = rect.height;
    world.floorY = world.height - 42;
    world.p.x = clamp(world.p.x, 8, Math.max(8, world.width - PLAYER_WIDTH - 8));
    world.p.y = clamp(world.p.y, 74, Math.max(74, world.floorY - PLAYER_HEIGHT - 8));
  }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function pointFor(entity, width = 42, height = width) { return { x: entity.x + width / 2, y: entity.y + height / 2 }; }
  function collides(first, second, radius) {
    const a = pointFor(first, first.width || 80, first.height || 80);
    const b = pointFor(second, second.width || 40, second.height || 40);
    return Math.hypot(a.x - b.x, a.y - b.y) < radius;
  }
  function position(element, x, y) { element.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`; }
  function updateHud() {
    onHud({
      level: world.level,
      levelScore: world.levelScore,
      totalScore: world.totalScore,
      candies: world.candies.filter((candy) => candy.collected).length,
      candyTotal: world.candies.length,
      freeze: Math.min(1, world.g.freezeTimer / FREEZE_CHARGE),
      character: world.selectedCharacter,
      playerName: world.playerName,
      spookName: world.spookName,
    });
  }
  function score(amount, x, y) {
    world.levelScore = Math.max(0, world.levelScore + amount);
    if (amount > 0) onEffect("score", { amount, x, y });
    updateHud();
  }
  function randomSpot(avoidPlayer = true) {
    const minX = Math.min(70, Math.max(10, world.width * 0.08));
    const maxX = Math.max(minX, world.width - 100);
    const minY = Math.min(115, Math.max(75, world.height * 0.15));
    const maxY = Math.max(minY, world.floorY - 95);
    let point = { x: minX, y: minY };
    for (let attempt = 0; attempt < 36; attempt++) {
      point = { x: minX + Math.random() * (maxX - minX), y: minY + Math.random() * (maxY - minY) };
      if (!avoidPlayer || Math.hypot(point.x - world.p.x, point.y - world.p.y) > 125) break;
    }
    return point;
  }
  function clearObjects() {
    candiesEl.replaceChildren();
    websEl.replaceChildren();
    miniGhostsEl.replaceChildren();
    if (world.portal?.element) world.portal.element.remove();
    if (world.powerup?.element) world.powerup.element.remove();
    world.portal = null;
    world.powerup = null;
    world.candies = [];
    world.webs = [];
    world.miniGhosts = [];
  }
  function addCandy() {
    const element = document.createElement("div");
    element.className = "actor candy";
    element.textContent = Math.random() < 0.16 ? "🍭" : "🍬";
    candiesEl.appendChild(element);
    const spot = randomSpot();
    const candy = { element, x: spot.x, y: spot.y, width: 36, height: 36, collected: false, bob: Math.random() * 6 };
    world.candies.push(candy);
    return candy;
  }
  function addWeb() {
    const element = document.createElement("div");
    element.className = "actor web";
    element.textContent = "🕸️";
    websEl.appendChild(element);
    const spot = randomSpot();
    world.webs.push({ element, x: spot.x, y: spot.y, width: 36, height: 36, bob: Math.random() * 7 });
  }
  function addMiniGhost() {
    const element = document.createElement("div");
    element.className = "actor glow";
    element.setAttribute("aria-label", "Bóng ma nhỏ");
    miniGhostsEl.appendChild(element);
    drawPixelMask(element, buildGhostMask(14, 12, true), { 1: "#d9eeff", 2: "#83b8e4", 3: "#20334f", 4: "#ff75ac" }, pixelUnit);
    world.miniGhosts.push({
      element,
      x: world.g.x + (Math.random() - 0.5) * 70,
      y: world.g.y + (Math.random() - 0.5) * 70,
      width: 56,
      height: 48,
      vx: 0,
      vy: 0,
      speed: config().miniSpeed,
      orbit: Math.random() * Math.PI * 2,
      bob: Math.random() * 6,
    });
  }
  function createPortal() {
    if (world.portal) return;
    const element = document.createElement("div");
    element.className = "actor portal";
    element.textContent = "✦";
    element.setAttribute("aria-label", "Cổng dịch chuyển");
    gameEl.appendChild(element);
    world.portal = { element, x: world.width / 2 - 39, y: world.floorY - 124, width: 78, height: 100, bob: Math.random() * 6 };
    onEffect("portal");
  }
  function spawnPowerup() {
    if (world.powerup) return;
    const types = ["speed", "magnet", "repel"];
    const type = types[Math.floor(Math.random() * types.length)];
    const icons = { speed: "🧃", magnet: "🍭", repel: "💚" };
    const element = document.createElement("div");
    element.className = "actor powerup";
    element.textContent = icons[type];
    gameEl.appendChild(element);
    const spot = randomSpot();
    world.powerup = { element, type, x: spot.x, y: spot.y, width: 42, height: 42, bob: Math.random() * 6 };
    onEffect("powerup");
  }
  function prepareLevel() {
    updateDimensions();
    clearObjects();
    world.completed = false;
    world.active = true;
    world.time = 0;
    world.levelScore = 0;
    world.combo = 0;
    world.comboTimer = 0;
    world.wasHit = false;
    world.invulnerable = 0;
    world.debuffTimer = 0;
    world.powerupTimer = 0;
    world.powerupSpawnTimer = 1000;
    world.p.x = Math.min(72, Math.max(12, world.width * 0.12));
    world.p.y = Math.max(100, Math.min(world.floorY - PLAYER_HEIGHT - 12, world.height * 0.45));
    world.p.vx = 0;
    world.p.vy = 0;
    world.p.speed = world.p.baseSpeed;
    world.p.dragged = false;
    world.target = null;
    world.g.x = Math.max(150, world.width - 150);
    world.g.y = Math.max(105, Math.min(world.floorY - GHOST_HEIGHT - 12, world.height * 0.35));
    world.g.vx = 0;
    world.g.vy = 0;
    world.g.speed = config().ghostSpeed;
    world.g.freezeTimer = 0;
    world.g.frozen = false;
    world.levelStartedAt = performance.now();
    gameEl.dataset.biome = String(config().biome);
    gameEl.style.setProperty("--biome-hue", config().hue);
    playerEl.classList.remove("dragged", "boosted");
    playerEl.style.opacity = "1";
    playerNameDisplay.textContent = world.playerName;
    spookNameDisplay.textContent = world.spookName;
    drawPixelMask(spookEl, buildGhostMask(22, 20), { 1: "#d6edff", 2: "#82bce8", 3: "#23354f", 4: "#ff70a9" }, pixelUnit);
    for (let i = 0; i < config().candies; i++) addCandy();
    for (let i = 0; i < config().webs; i++) addWeb();
    for (let i = 0; i < config().miniGhosts; i++) addMiniGhost();
    render();
    updateHud();
  }
  function getSnapshot() {
    return {
      level: world.level,
      levelScore: world.levelScore,
      totalScore: world.totalScore,
      finalScore: world.totalScore,
      character: CHARACTERS.find((item) => item.id === world.selectedCharacter),
      completedLevels: world.completedLevels,
      perfectLevels: world.perfectLevels,
      candiesCollected: world.totalCandies,
      bestCombo: world.bestCombo,
      fastestLevelSeconds: Number.isFinite(world.elapsedFastestLevel) ? Math.round(world.elapsedFastestLevel) : 0,
      wasHit: world.wasHit,
    };
  }
  function finishLevel() {
    if (world.completed) return;
    world.completed = true;
    world.active = false;
    world.completedLevels++;
    if (!world.wasHit) {
      world.perfectLevels++;
      world.p.baseSpeed = Math.min(2.8, world.p.baseSpeed * 1.015);
    }
    const elapsed = (performance.now() - world.levelStartedAt) / 1000;
    world.elapsedFastestLevel = Math.min(world.elapsedFastestLevel, elapsed);
    world.totalScore += world.levelScore;
    updateHud();
    const snapshot = getSnapshot();
    if (world.level === 26) onGameComplete(snapshot);
    else onLevelComplete(snapshot);
  }
  function dropCollectedCandy() {
    let lost = 0;
    for (const candy of world.candies) {
      if (candy.collected) lost += CANDY_POINTS;
      candy.collected = false;
      candy.element.style.opacity = "1";
      candy.element.style.visibility = "visible";
      const spot = randomSpot();
      candy.x = spot.x;
      candy.y = spot.y;
    }
    if (lost) score(-lost);
    world.combo = 0;
    world.comboTimer = 0;
    world.portal?.element.remove();
    world.portal = null;
    updateHud();
  }
  function collectCandy(candy) {
    candy.collected = true;
    candy.element.style.opacity = "0";
    candy.element.style.visibility = "hidden";
    world.totalCandies++;
    world.combo = world.comboTimer > 0 ? world.combo + 1 : 1;
    world.comboTimer = 180;
    world.bestCombo = Math.max(world.bestCombo, world.combo);
    const bonus = world.combo >= 3 && world.combo % 3 === 0 ? 50 : 0;
    score(CANDY_POINTS + bonus, candy.x + 18, candy.y + 18);
    onEffect("candy", { combo: world.combo, bonus, x: candy.x + 18, y: candy.y + 18 });
  }
  function hitByGhost(ghost, mainGhost) {
    if (world.invulnerable > 0) return;
    world.invulnerable = 85;
    world.wasHit = true;
    if (mainGhost && ghost.frozen) {
      ghost.frozen = false;
      ghost.freezeTimer = 0;
      ghost.x = Math.random() < 0.5 ? 20 : world.width - 100;
      ghost.y = 95 + Math.random() * Math.max(20, world.floorY - 220);
      score(200, ghost.x, ghost.y);
      onEffect("shatter");
      return;
    }
    score(-CANDY_POINTS);
    world.p.vx = (world.p.x - ghost.x) * 0.12;
    world.p.vy = (world.p.y - ghost.y) * 0.12;
    onEffect("hit");
  }
  function completeCandySet() {
    if (!world.portal && world.candies.length && world.candies.every((candy) => candy.collected)) createPortal();
  }
  function updatePlayer(dt) {
    const player = world.p;
    if (player.dragged) {
      player.vx = 0;
      player.vy = 0;
    } else {
      if (world.target) {
        const dx = world.target.x - player.x;
        const dy = world.target.y - player.y;
        const distance = Math.hypot(dx, dy);
        if (distance < player.speed * dt + 2) {
          player.x = world.target.x;
          player.y = world.target.y;
          player.target = null;
          world.target = null;
          player.vx *= 0.2;
          player.vy *= 0.2;
        } else {
          player.vx += ((dx / distance) * player.speed - player.vx) * 0.2;
          player.vy += ((dy / distance) * player.speed - player.vy) * 0.2;
        }
      } else {
        player.vx += ((world.keys.right - world.keys.left) * player.speed - player.vx) * 0.2;
        player.vy += ((world.keys.down - world.keys.up) * player.speed - player.vy) * 0.2;
      }
      player.x += player.vx * dt;
      player.y += player.vy * dt;
    }
    player.x = clamp(player.x, 8, Math.max(8, world.width - PLAYER_WIDTH - 8));
    player.y = clamp(player.y, 72, Math.max(72, world.floorY - PLAYER_HEIGHT - 8));
    if (Math.abs(player.vx) > 0.15 || Math.abs(player.vy) > 0.15) world.currentAngle = Math.atan2(player.vy, player.vx);
  }
  function updateGhosts(dt) {
    const player = world.p;
    const ghost = world.g;
    const facingRight = Math.cos(world.currentAngle) > -0.1;
    const lookingAtGhost = facingRight ? ghost.x >= player.x : ghost.x <= player.x;
    ghost.shy = lookingAtGhost && Math.abs(ghost.y - player.y) < 140 && Math.hypot(player.x - ghost.x, player.y - ghost.y) < 440;
    if (ghost.shy && !ghost.frozen) ghost.freezeTimer += dt;
    else if (!ghost.frozen) ghost.freezeTimer = Math.max(0, ghost.freezeTimer - dt * 1.4);
    if (ghost.freezeTimer >= FREEZE_CHARGE && !ghost.frozen) {
      ghost.frozen = true;
      ghost.freezeTimer = FREEZE_TIME;
      onEffect("freeze");
    }
    if (ghost.frozen) ghost.freezeTimer -= dt;
    if (ghost.frozen && ghost.freezeTimer <= 0) {
      ghost.frozen = false;
      ghost.freezeTimer = 0;
      onEffect("unfreeze");
    }
    const dx = player.x - ghost.x;
    const dy = player.y - ghost.y;
    const distance = Math.hypot(dx, dy) || 1;
    const targetSpeed = ghost.shy && !ghost.frozen ? 0 : ghost.speed;
    ghost.vx += ((dx / distance) * targetSpeed - ghost.vx) * 0.08;
    ghost.vy += ((dy / distance) * targetSpeed - ghost.vy) * 0.08;
    ghost.x = clamp(ghost.x + ghost.vx * dt, 0, world.width - GHOST_WIDTH);
    ghost.y = clamp(ghost.y + ghost.vy * dt, 76, world.floorY - GHOST_HEIGHT);

    world.miniGhosts.forEach((mini) => {
      mini.orbit += 0.018 * dt;
      const orbitRadius = 85 + Math.sin(mini.orbit * 0.5) * 16;
      const targetX = ghost.x + Math.cos(mini.orbit) * orbitRadius;
      const targetY = ghost.y + Math.sin(mini.orbit) * orbitRadius;
      const mx = targetX - mini.x;
      const my = targetY - mini.y;
      const md = Math.hypot(mx, my) || 1;
      const speed = ghost.shy && !ghost.frozen ? 0 : mini.speed;
      mini.vx += ((mx / md) * speed - mini.vx) * 0.1;
      mini.vy += ((my / md) * speed - mini.vy) * 0.1;
      mini.x = clamp(mini.x + mini.vx * dt, 0, world.width - 56);
      mini.y = clamp(mini.y + mini.vy * dt, 76, world.floorY - 56);
    });
  }
  function updateItems(dt) {
    if (world.comboTimer > 0) {
      world.comboTimer -= dt;
      if (world.comboTimer <= 0) world.combo = 0;
    }
    if (world.invulnerable > 0) world.invulnerable -= dt;
    if (world.debuffTimer > 0) {
      world.debuffTimer -= dt;
      if (world.debuffTimer <= 0) world.p.speed = world.p.baseSpeed;
    }
    if (world.powerupTimer > 0) {
      world.powerupTimer -= dt;
      if (world.powerupTimer <= 0) {
        world.powerupType = null;
        world.p.speed = world.p.baseSpeed;
        playerEl.classList.remove("boosted");
      }
    }
    world.powerupSpawnTimer -= dt;
    if (world.powerupSpawnTimer <= 0) {
      spawnPowerup();
      world.powerupSpawnTimer = 1050 + Math.random() * 450;
    }

    for (const candy of world.candies) {
      if (world.powerupType === "magnet" && !candy.collected) {
        const dx = world.p.x - candy.x;
        const dy = world.p.y - candy.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 180 && distance > 1) {
          candy.x += (dx / distance) * 1.8 * dt;
          candy.y += (dy / distance) * 1.8 * dt;
        }
      }
      if (!candy.collected && !world.p.dragged && collides(world.p, candy, 47)) collectCandy(candy);
    }
    completeCandySet();

    if (world.powerup && collides(world.p, world.powerup, 48)) {
      const type = world.powerup.type;
      world.powerup.element.remove();
      world.powerup = null;
      world.powerupType = type;
      world.powerupTimer = POWERUP_TIME;
      if (type === "speed") {
        world.p.speed = world.p.baseSpeed * 1.45;
        playerEl.classList.add("boosted");
      }
      onEffect("powerup-collected", { type });
    }

    for (let index = world.webs.length - 1; index >= 0; index--) {
      const web = world.webs[index];
      if (collides(world.p, web, 48)) {
        web.element.remove();
        world.webs.splice(index, 1);
        world.p.speed = world.p.baseSpeed * 0.58;
        world.debuffTimer = DEBUFF_TIME;
        dropCollectedCandy();
        onEffect("web");
        break;
      }
    }
  }
  function updateCollisions() {
    const ghosts = [{ actor: world.g, main: true }, ...world.miniGhosts.map((actor) => ({ actor, main: false }))];
    for (const { actor, main } of ghosts) {
      if (!world.p.dragged && collides(world.p, actor, main ? 65 : 52) && (!actor.frozen || main)) hitByGhost(actor, main);
      if (!actor.frozen) {
        const stolenCandy = world.candies.find((candy) => !candy.collected && collides(actor, candy, 37));
        if (stolenCandy) {
          score(-CANDY_POINTS);
          const spot = randomSpot();
          stolenCandy.x = spot.x;
          stolenCandy.y = spot.y;
          onEffect("candy-stolen");
        }
      }
    }
    if (world.portal && !world.p.dragged && collides(world.p, world.portal, 72)) finishLevel();
  }
  function render() {
    const player = world.p;
    const bob = player.dragged ? 0 : Math.sin(world.time * 0.08) * 0.65;
    const facingRight = Math.cos(world.currentAngle) > -0.1;
    const bobStep = Math.round(bob);
    const maskKey = `${world.selectedCharacter}:${facingRight}:${bobStep}`;
    let playerMask = playerMaskCache.get(maskKey);
    if (!playerMask) {
      playerMask = buildPlayerMask(world.selectedCharacter, facingRight, bobStep);
      playerMaskCache.set(maskKey, playerMask);
    }
    drawPixelMask(playerEl, playerMask, playerPalette(), pixelUnit);
    playerEl.style.transform = `translate3d(${Math.round(player.x)}px, ${Math.round(player.y)}px, 0) scale(${player.dragged ? 1.08 : 1})`;
    playerEl.style.opacity = world.invulnerable > 0 && Math.floor(world.time / 7) % 2 ? "0.55" : "1";
    const lift = player.dragged ? Math.max(0, world.floorY - player.y - 115) : 0;
    playerShadowEl.style.visibility = player.dragged ? "visible" : "hidden";
    playerShadowEl.style.opacity = player.dragged ? String(Math.max(0, 0.38 - lift / world.height * 0.6)) : "0";
    playerShadowEl.style.transform = `translate3d(${player.x + 22}px, ${player.y + 58 + lift * 0.08}px, 0) scale(${1 + lift / Math.max(1, world.height)})`;
    playerNameDisplay.style.left = `${player.x + PLAYER_WIDTH / 2}px`;
    playerNameDisplay.style.top = `${player.y}px`;
    spookNameDisplay.style.left = `${world.g.x + GHOST_WIDTH / 2}px`;
    spookNameDisplay.style.top = `${world.g.y}px`;
    spookEl.style.transform = `translate3d(${Math.round(world.g.x)}px, ${Math.round(world.g.y)}px, 0)`;
    spookEl.style.opacity = world.g.shy ? "0.68" : "1";
    spookEl.style.filter = world.g.frozen ? "hue-rotate(170deg) brightness(1.4)" : world.g.shy ? "drop-shadow(0 0 7px #88cfff)" : "drop-shadow(0 0 10px #ff9fbd)";
    world.miniGhosts.forEach((mini) => {
      mini.element.style.transform = `translate3d(${Math.round(mini.x)}px, ${Math.round(mini.y)}px, 0)`;
      mini.element.style.opacity = world.g.shy ? "0.7" : "1";
    });
    world.candies.forEach((candy) => {
      if (!candy.collected) position(candy.element, candy.x, candy.y + Math.sin(world.time * 0.07 + candy.bob) * 6);
    });
    world.webs.forEach((web) => position(web.element, web.x, web.y + Math.sin(world.time * 0.07 + web.bob) * 5));
    if (world.powerup) position(world.powerup.element, world.powerup.x, world.powerup.y + Math.sin(world.time * 0.1 + world.powerup.bob) * 7);
    if (world.portal) position(world.portal.element, world.portal.x, world.portal.y + Math.sin(world.time * 0.07 + world.portal.bob) * 5);
  }

  function tick(dt) {
    if (!world.active || world.completed) return;
    world.time += dt;
    updatePlayer(dt);
    updateGhosts(dt);
    updateItems(dt);
    updateCollisions();
    render();
    updateHud();
  }
  function setCharacter(id) {
    if (!CHARACTERS.some((character) => character.id === id)) return;
    world.selectedCharacter = id;
    render();
  }
  function setNames(playerName, spookName) {
    world.playerName = playerName || "Bạn";
    world.spookName = spookName || "Ghost";
    playerNameDisplay.textContent = world.playerName;
    spookNameDisplay.textContent = world.spookName;
  }
  function startRun(characterId = world.selectedCharacter) {
    setCharacter(characterId);
    world.level = 1;
    world.levelScore = 0;
    world.totalScore = 0;
    world.completedLevels = 0;
    world.perfectLevels = 0;
    world.totalCandies = 0;
    world.bestCombo = 0;
    world.elapsedFastestLevel = Infinity;
    world.p.baseSpeed = 2.2;
    world.p.speed = 2.2;
    prepareLevel();
    return config();
  }
  function restartLevel() {
    prepareLevel();
    return config();
  }
  function nextLevel() {
    if (world.level >= 26) return null;
    world.level++;
    prepareLevel();
    return config();
  }
  function stop() {
    world.active = false;
    world.p.dragged = false;
    world.keys = { left: 0, right: 0, up: 0, down: 0 };
    playerEl.classList.remove("dragged");
  }
  function setKeys(keys) {
    world.keys = { ...world.keys, ...keys };
    if (keys.left || keys.right || keys.up || keys.down) world.target = null;
  }
  function moveTo(x, y) {
    world.target = {
      x: clamp(x - PLAYER_WIDTH / 2, 8, Math.max(8, world.width - PLAYER_WIDTH - 8)),
      y: clamp(y - PLAYER_HEIGHT / 2, 72, Math.max(72, world.floorY - PLAYER_HEIGHT - 8)),
    };
    world.keys = { left: 0, right: 0, up: 0, down: 0 };
  }
  function beginDrag(x, y) {
    world.p.dragged = true;
    world.p.dragOffsetX = x - world.p.x;
    world.p.dragOffsetY = y - world.p.y;
    world.target = null;
    playerEl.classList.add("dragged");
  }
  function dragTo(x, y) {
    if (!world.p.dragged) return;
    world.p.x = x - world.p.dragOffsetX;
    world.p.y = y - world.p.dragOffsetY;
  }
  function endDrag() {
    world.p.dragged = false;
    playerEl.classList.remove("dragged");
  }
  function updateSize() {
    updateDimensions();
    if (world.active) render();
  }
  function achievements() {
    return [
      { title: "Màn đã hoàn thành", value: `${world.completedLevels}/26` },
      { title: "Màn không bị ma chạm", value: String(world.perfectLevels) },
      { title: "Kẹo đã thu thập", value: String(world.totalCandies) },
      { title: "Combo kẹo tốt nhất", value: `${world.bestCombo} viên` },
      { title: "Màn nhanh nhất", value: world.elapsedFastestLevel < Infinity ? `${Math.round(world.elapsedFastestLevel)} giây` : "Chưa có" },
    ];
  }

  return {
    tick,
    setCharacter,
    setNames,
    startRun,
    restartLevel,
    nextLevel,
    stop,
    setKeys,
    moveTo,
    beginDrag,
    dragTo,
    endDrag,
    updateSize,
    config,
    snapshot: getSnapshot,
    achievements,
    get level() { return world.level; },
    get playerPosition() { return { x: world.p.x, y: world.p.y }; },
  };
}
