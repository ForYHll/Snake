const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.querySelector("#score");
const bestScoreEl = document.querySelector("#bestScore");
const levelEl = document.querySelector("#level");
const speedEl = document.querySelector("#speed");
const statusLabel = document.querySelector("#statusLabel");
const overlay = document.querySelector("#overlay");
const overlayTitle = document.querySelector("#overlayTitle");
const overlayText = document.querySelector("#overlayText");
const startButton = document.querySelector("#startButton");
const pauseButton = document.querySelector("#pauseButton");
const restartButton = document.querySelector("#restartButton");

const boardSize = 24;
const baseSpeed = 7;
const maxSpeed = 16;
const directions = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const keyMap = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};

let snake;
let food;
let direction;
let nextDirection;
let score;
let bestScore = Number(localStorage.getItem("snakeBestScore") || 0);
let level;
let speed;
let gameState;
let lastFrameTime = 0;
let touchStart = null;
let audioContext = null;

function resetGame() {
  const center = Math.floor(boardSize / 2);
  snake = [
    { x: center + 1, y: center },
    { x: center, y: center },
    { x: center - 1, y: center },
  ];
  direction = directions.right;
  nextDirection = directions.right;
  score = 0;
  level = 1;
  speed = baseSpeed;
  food = createFood();
  gameState = "ready";
  lastFrameTime = 0;
  updateHud();
  setOverlay("Ready to Play", "Press Enter or tap Start to begin.");
  draw();
}

function startGame() {
  if (gameState === "running") return;
  if (gameState === "gameover") resetGame();
  gameState = "running";
  hideOverlay();
  updateHud();
  requestAnimationFrame(gameLoop);
}

function restartGame() {
  resetGame();
  startGame();
}

function togglePause() {
  if (gameState === "ready") {
    startGame();
    return;
  }

  if (gameState === "running") {
    gameState = "paused";
    setOverlay("Paused", "Press Space or tap Continue to resume.");
  } else if (gameState === "paused") {
    gameState = "running";
    hideOverlay();
    requestAnimationFrame(gameLoop);
  }

  updateHud();
}

function gameLoop(timestamp) {
  if (gameState !== "running") return;

  const interval = 1000 / speed;
  if (timestamp - lastFrameTime >= interval) {
    lastFrameTime = timestamp;
    stepGame();
    draw();
  }

  requestAnimationFrame(gameLoop);
}

function stepGame() {
  direction = nextDirection;
  const head = snake[0];
  const nextHead = {
    x: head.x + direction.x,
    y: head.y + direction.y,
  };

  const isEating = nextHead.x === food.x && nextHead.y === food.y;
  if (isWallCollision(nextHead) || isSelfCollision(nextHead, isEating)) {
    endGame();
    return;
  }

  snake.unshift(nextHead);

  if (isEating) {
    score += 10;
    level = Math.floor(score / 50) + 1;
    speed = Math.min(maxSpeed, baseSpeed + Math.floor(score / 40));
    food = createFood();
    playTone(620, 0.06, "sine");
  } else {
    snake.pop();
  }

  updateHud();
}

function endGame() {
  gameState = "gameover";
  bestScore = Math.max(bestScore, score);
  localStorage.setItem("snakeBestScore", String(bestScore));
  updateHud();
  setOverlay("Game Over", "Press Enter or tap Restart to try again.");
  playTone(120, 0.18, "sawtooth");
}

function createFood() {
  let position;
  do {
    position = {
      x: Math.floor(Math.random() * boardSize),
      y: Math.floor(Math.random() * boardSize),
    };
  } while (snake.some((part) => part.x === position.x && part.y === position.y));
  return position;
}

function isWallCollision(position) {
  return (
    position.x < 0 ||
    position.y < 0 ||
    position.x >= boardSize ||
    position.y >= boardSize
  );
}

function isSelfCollision(position, tailStays) {
  const body = tailStays ? snake : snake.slice(0, -1);
  return body.some((part) => part.x === position.x && part.y === position.y);
}

function setDirection(name) {
  const requested = directions[name];
  if (!requested) return;

  const reversing =
    requested.x + direction.x === 0 && requested.y + direction.y === 0;
  if (!reversing) {
    nextDirection = requested;
  }
}

function draw() {
  const size = canvas.width;
  const cell = size / boardSize;

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#0f191f";
  ctx.fillRect(0, 0, size, size);

  drawGrid(cell);
  drawFood(cell);
  drawSnake(cell);
}

function drawGrid(cell) {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.045)";
  ctx.lineWidth = 1;

  for (let index = 1; index < boardSize; index += 1) {
    const position = index * cell;
    ctx.beginPath();
    ctx.moveTo(position, 0);
    ctx.lineTo(position, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, position);
    ctx.lineTo(canvas.width, position);
    ctx.stroke();
  }
}

function drawSnake(cell) {
  snake.forEach((part, index) => {
    const padding = index === 0 ? 3 : 4;
    const x = part.x * cell + padding;
    const y = part.y * cell + padding;
    const size = cell - padding * 2;

    ctx.fillStyle = index === 0 ? "#d8ff7a" : "#5ee37d";
    roundRect(x, y, size, size, 7);
    ctx.fill();

    if (index === 0) {
      ctx.fillStyle = "rgba(16, 24, 32, 0.72)";
      const eyeSize = Math.max(2.8, cell * 0.09);
      const eyeOffsetX = direction.x === 0 ? cell * 0.18 : cell * 0.25 * direction.x;
      const eyeOffsetY = direction.y === 0 ? cell * 0.18 : cell * 0.25 * direction.y;
      ctx.beginPath();
      ctx.arc(x + size / 2 + eyeOffsetX, y + size / 2 + eyeOffsetY, eyeSize, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function drawFood(cell) {
  const centerX = food.x * cell + cell / 2;
  const centerY = food.y * cell + cell / 2;
  const radius = cell * 0.32;

  ctx.fillStyle = "#ff5f5f";
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  ctx.beginPath();
  ctx.arc(centerX - radius * 0.28, centerY - radius * 0.32, radius * 0.24, 0, Math.PI * 2);
  ctx.fill();
}

function roundRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function setOverlay(title, text) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function updateHud() {
  scoreEl.textContent = score;
  bestScoreEl.textContent = bestScore;
  levelEl.textContent = level;
  speedEl.textContent = speed;

  const labels = {
    ready: "Ready",
    running: "Playing",
    paused: "Paused",
    gameover: "Game Over",
  };
  statusLabel.textContent = labels[gameState];
  pauseButton.textContent = gameState === "paused" ? "Continue" : "Pause";
}

function playTone(frequency, duration, type) {
  try {
    audioContext ||= new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.05, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch {
    // Browsers can block audio until user interaction; gameplay should continue silently.
  }
}

function handleKeydown(event) {
  if (event.code in keyMap) {
    event.preventDefault();
    setDirection(keyMap[event.code]);
    if (gameState === "ready") startGame();
  }

  if (event.code === "Space") {
    event.preventDefault();
    togglePause();
  }

  if (event.code === "Enter") {
    event.preventDefault();
    if (gameState === "gameover" || gameState === "ready") {
      restartGame();
    } else if (gameState === "paused") {
      togglePause();
    }
  }
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  canvas.width = 640;
  canvas.height = 640;
  draw();
}

function handleTouchStart(event) {
  const touch = event.changedTouches[0];
  touchStart = { x: touch.clientX, y: touch.clientY };
}

function handleTouchEnd(event) {
  if (!touchStart) return;

  const touch = event.changedTouches[0];
  const deltaX = touch.clientX - touchStart.x;
  const deltaY = touch.clientY - touchStart.y;
  const threshold = 28;

  if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < threshold) return;

  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    setDirection(deltaX > 0 ? "right" : "left");
  } else {
    setDirection(deltaY > 0 ? "down" : "up");
  }

  if (gameState === "ready") startGame();
  touchStart = null;
}

startButton.addEventListener("click", startGame);
pauseButton.addEventListener("click", togglePause);
restartButton.addEventListener("click", restartGame);
window.addEventListener("keydown", handleKeydown);
window.addEventListener("resize", draw);
canvas.addEventListener("touchstart", handleTouchStart, { passive: true });
canvas.addEventListener("touchend", handleTouchEnd, { passive: true });

document.querySelectorAll("[data-direction]").forEach((button) => {
  button.addEventListener("click", () => {
    setDirection(button.dataset.direction);
    if (gameState === "ready") startGame();
  });
});

resetGame();
