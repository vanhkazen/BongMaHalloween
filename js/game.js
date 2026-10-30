import { createGameplay } from "./gameplay.js";
import { createUI } from "./ui.js";

class AudioManager {
  constructor() {
    this.context = null;
    this.master = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicStep = 0;
    this.musicGeneration = 0;
    this.sequenceTimers = new Set();
    this.activeNodes = new Set();
    this.unavailable = false;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.context) {
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(muted ? 0 : 0.55, now, 0.04);
    }
    if (muted) this.stopMusic();
    return this.muted;
  }

  async unlock() {
    if (this.muted) return;
    if (!this.context) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) {
        if (!this.unavailable) console.warn("Web Audio API is not available in this browser.");
        this.unavailable = true;
        return;
      }
      try {
        this.context = new Context();
        this.master = this.context.createGain();
        this.master.gain.value = 0.55;
        this.master.connect(this.context.destination);
      } catch (error) {
        console.warn("Unable to initialize game audio.", error);
        this.unavailable = true;
        return;
      }
    }
    if (this.context.state === "suspended") {
      try {
        await this.context.resume();
      } catch (error) {
        console.warn("Unable to resume game audio.", error);
      }
    }
  }

  tone(frequency, duration = 0.16, waveform = "triangle", volume = 0.12, delay = 0) {
    if (this.muted || !this.context || this.context.state !== "running" || !this.master) return;
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    this.activeNodes.add(oscillator);
    oscillator.addEventListener("ended", () => {
      this.activeNodes.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    }, { once: true });
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  play(name) {
    if (this.muted) return;
    const generation = this.musicGeneration;
    void this.unlock().then(() => {
      if (generation !== this.musicGeneration) return;
      const sounds = {
        candy: [[660, 0.12], [880, 0.19], [1100, 0.22]],
        powerup: [[523, 0.13], [659, 0.13], [784, 0.22]],
        "powerup-collected": [[784, 0.12], [988, 0.2]],
        hit: [[175, 0.24, "sawtooth", 0.16], [110, 0.3, "triangle", 0.12, 0.08]],
        web: [[220, 0.2, "sawtooth", 0.1], [165, 0.22, "triangle", 0.1, 0.08]],
        portal: [[523, 0.18], [659, 0.18, "triangle", 0.12, 0.12], [784, 0.25, "triangle", 0.12, 0.24]],
        freeze: [[880, 0.16], [1175, 0.2, "sine", 0.1, 0.09]],
        unfreeze: [[494, 0.25, "sine", 0.1]],
        shatter: [[1047, 0.13], [1319, 0.18, "sine", 0.13, 0.08]],
        level: [[523, 0.15], [659, 0.15, "triangle", 0.12, 0.12], [784, 0.28, "triangle", 0.12, 0.24]],
      };
      for (const [frequency, duration, waveform, volume, delay] of sounds[name] || []) {
        this.tone(frequency, duration, waveform || "triangle", volume ?? 0.11, delay || 0);
      }
    });
  }

  startMusic() {
    this.stopMusic();
    const generation = this.musicGeneration;
    if (this.muted) return;
    void this.unlock().then(() => {
      if (generation !== this.musicGeneration || this.muted || !this.context) return;
      const notes = [196, 247, 294, 247, 220, 262, 330, 262];
      this.musicStep = 0;
      this.tone(98, 0.75, "sine", 0.035);
      this.musicTimer = window.setInterval(() => {
        if (this.muted || !this.context || this.context.state !== "running") return;
        this.tone(notes[this.musicStep % notes.length], 0.4, "triangle", 0.035);
        this.musicStep++;
      }, 1100);
    });
  }

  playVictory() {
    this.stopMusic();
    if (this.muted) return;
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((note, index) => {
      const timer = window.setTimeout(() => {
        this.sequenceTimers.delete(timer);
        this.tone(note, 0.55, "triangle", 0.12);
      }, index * 190);
      this.sequenceTimers.add(timer);
    });
  }

  stopMusic() {
    this.musicGeneration++;
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    for (const timer of this.sequenceTimers) window.clearTimeout(timer);
    this.sequenceTimers.clear();
  }

  stopAll() {
    this.stopMusic();
    for (const node of this.activeNodes) {
      try { node.stop(); } catch (error) {
        if (error.name !== "InvalidStateError") console.warn("Unable to stop an audio node.", error);
      }
    }
    this.activeNodes.clear();
  }
}

const audio = new AudioManager();
let gameplay;
let status = "menu";
let selectedCharacter = "ghost-kid";
let playerName = "Bạn";
let spookName = "Ghost";
let lastFrame = performance.now();
let frameAccumulator = 0;
let pointerId = null;
let animationFrame = 0;

const ui = createUI({
  onCharacterSelected: (id) => { selectedCharacter = id; },
  onNamesChanged: (nextPlayerName, nextSpookName) => {
    playerName = nextPlayerName;
    spookName = nextSpookName;
    gameplay?.setNames(playerName, spookName);
  },
  onConfirmCharacter: (id) => startRun(id),
  onLevelBegin: () => beginLevel(),
  onPause: () => pauseGame(),
  onResume: () => resumeGame(),
  onRestartLevel: () => restartLevel(),
  onNextLevel: () => advanceLevel(),
  onRestartRun: (id) => startRun(id),
  onHome: () => returnHome(),
  onOpenSettings: () => {
    if (status === "playing") pauseGame();
  },
  onToggleSound: () => {
    const muted = audio.setMuted(!audio.muted);
    if (!muted && status === "playing") void audio.unlock().then(() => audio.startMusic());
    return muted;
  },
  onAchievements: (returnTo) => ui.showAchievements(gameplay.achievements(), returnTo),
});

gameplay = createGameplay({
  onHud: (state) => ui.updateHud(state),
  onLevelComplete: (summary) => {
    status = "level-complete";
    audio.stopMusic();
    audio.play("level");
    ui.showLevelComplete(summary);
  },
  onGameComplete: (summary) => {
    status = "game-completed";
    audio.playVictory();
    ui.showVictory(summary);
  },
  onEffect: (effect, details) => {
    const effectSounds = {
      candy: "candy",
      powerup: "powerup",
      "powerup-collected": "powerup-collected",
      hit: "hit",
      web: "web",
      portal: "portal",
      freeze: "freeze",
      unfreeze: "unfreeze",
      shatter: "shatter",
    };
    if (effectSounds[effect]) audio.play(effectSounds[effect]);
    if (effect === "candy") ui.showCollectEffect(details);
    if (effect === "hit" || effect === "web") {
      document.getElementById("game").classList.add("hit-flash");
    }
    if (effect === "hit") {
      const boo = document.getElementById("boo-scare");
      boo.animate(
        [{ opacity: 0, transform: "translate(-50%, -50%) scale(.3)" }, { opacity: 1, transform: "translate(-50%, -50%) scale(1.1)" }, { opacity: 0, transform: "translate(-50%, -50%) scale(.75)" }],
        { duration: 360, easing: "ease-out" },
      );
    }
  },
});

function startRun(characterId) {
  selectedCharacter = characterId;
  audio.stopAll();
  void audio.unlock();
  const config = gameplay.startRun(characterId);
  status = "level-intro";
  ui.showLevelIntro(config);
}

function beginLevel() {
  if (status !== "level-intro") return;
  status = "playing";
  ui.showGameplay();
  void audio.unlock().then(() => audio.startMusic());
  document.getElementById("game").focus({ preventScroll: true });
}

function pauseGame() {
  if (status !== "playing") return;
  status = "paused";
  heldKeys.left = heldKeys.right = heldKeys.up = heldKeys.down = 0;
  gameplay.setKeys({ left: 0, right: 0, up: 0, down: 0 });
  gameplay.endDrag();
  pointerId = null;
  audio.stopMusic();
  ui.showPause();
}

function resumeGame() {
  if (status !== "paused") return;
  status = "playing";
  ui.showGameplay();
  void audio.unlock().then(() => audio.startMusic());
}

function restartLevel() {
  if (status === "menu" || status === "game-completed") return;
  audio.stopMusic();
  const config = gameplay.restartLevel();
  status = "level-intro";
  ui.showLevelIntro(config);
}

function advanceLevel() {
  if (status !== "level-complete") return;
  const config = gameplay.nextLevel();
  if (!config) return;
  status = "level-intro";
  ui.showLevelIntro(config);
}

function returnHome() {
  audio.stopAll();
  gameplay.stop();
  status = "menu";
  ui.showIntro();
}

function togglePause() {
  if (status === "playing") pauseGame();
  else if (status === "paused") resumeGame();
}

const gameEl = document.getElementById("game");
gameEl.tabIndex = 0;
gameEl.addEventListener("animationend", (event) => {
  if (event.animationName === "flash") gameEl.classList.remove("hit-flash");
});
gameEl.addEventListener("pointerdown", (event) => {
  if (status !== "playing" || event.target.closest("button")) return;
  event.preventDefault();
  void audio.unlock();
  gameEl.focus({ preventScroll: true });
  const rect = gameEl.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const player = gameplay.playerPosition;
  if (Math.hypot(x - player.x - 28, y - player.y - 32) < 70) {
    pointerId = event.pointerId;
    gameEl.setPointerCapture(event.pointerId);
    gameplay.beginDrag(x, y);
  } else {
    gameplay.moveTo(x, y);
  }
}, { passive: false });

gameEl.addEventListener("pointermove", (event) => {
  if (pointerId !== event.pointerId || status !== "playing") return;
  event.preventDefault();
  const rect = gameEl.getBoundingClientRect();
  gameplay.dragTo(event.clientX - rect.left, event.clientY - rect.top);
}, { passive: false });

function finishPointer(event) {
  if (pointerId !== event.pointerId) return;
  pointerId = null;
  gameplay.endDrag();
}
gameEl.addEventListener("pointerup", finishPointer);
gameEl.addEventListener("pointercancel", finishPointer);

const keyMap = {
  arrowleft: "left", a: "left",
  arrowright: "right", d: "right",
  arrowup: "up", w: "up",
  arrowdown: "down", s: "down",
};
const heldKeys = { left: 0, right: 0, up: 0, down: 0 };
window.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
  const key = event.key.toLowerCase();
  if (key === "escape" || key === "p") {
    event.preventDefault();
    togglePause();
    return;
  }
  if (status !== "playing" || !keyMap[key]) return;
  event.preventDefault();
  heldKeys[keyMap[key]] = 1;
  gameplay.setKeys(heldKeys);
}, { passive: false });
window.addEventListener("keyup", (event) => {
  const direction = keyMap[event.key.toLowerCase()];
  if (!direction) return;
  heldKeys[direction] = 0;
  gameplay.setKeys(heldKeys);
});
window.addEventListener("blur", () => {
  if (status === "playing") pauseGame();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && status === "playing") pauseGame();
});
window.addEventListener("resize", () => gameplay.updateSize(), { passive: true });

function loop(timestamp) {
  const elapsed = Math.max(0, Math.min(50, timestamp - lastFrame));
  lastFrame = timestamp;
  if (status === "playing" && !document.hidden) {
    frameAccumulator += elapsed;
    if (frameAccumulator >= 1000 / 60) {
      gameplay.tick(Math.min(2, frameAccumulator / (1000 / 60)));
      frameAccumulator = 0;
    }
  } else {
    frameAccumulator = 0;
  }
  animationFrame = window.requestAnimationFrame(loop);
}

ui.setSoundMuted(ui.muted);
gameplay.setNames(
  playerName,
  spookName,
);
gameplay.setCharacter(selectedCharacter);
animationFrame = window.requestAnimationFrame(loop);

window.addEventListener("pagehide", () => {
  if (status === "playing") pauseGame();
  audio.stopAll();
  window.cancelAnimationFrame(animationFrame);
  animationFrame = 0;
});
window.addEventListener("pageshow", () => {
  lastFrame = performance.now();
  if (!animationFrame) animationFrame = window.requestAnimationFrame(loop);
});
