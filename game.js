import { BoardGenerator } from "./utils/boardGenerator.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BLOCKS_HORIZONTAL = 14;
const BLOCKS_VERTICAL = 9;
const BOARD_SIZE = BLOCKS_HORIZONTAL * BLOCKS_VERTICAL;

const OBJECT_SIZE = 70;
const BLOCK_SIZE = 64;
const BLOCK_PADDING = OBJECT_SIZE - BLOCK_SIZE;
const LINE_WIDTH = 2;
const SCOREAREA_HEIGHT = 32;
const SCORE_WIDTH = 364;
const LEVEL_WIDTH = 220;
const PLAYAREA_WIDTH = OBJECT_SIZE * BLOCKS_HORIZONTAL;
const PLAYAREA_HEIGHT = OBJECT_SIZE * BLOCKS_VERTICAL;
const BACKGROUND_WIDTH = PLAYAREA_WIDTH + LINE_WIDTH * 2;
const BACKGROUND_HEIGHT = PLAYAREA_HEIGHT + LINE_WIDTH * 3 + SCOREAREA_HEIGHT;

/** Cell values on the board. */
const BLOCK = {
  EMPTY: "0",
  SHUFFLE: "6",
  /** Only used for drawing: the cell is left as it is on the canvas. */
  UNCHANGED: "7",
};
const COLOR_BLOCKS = ["1", "2", "3", "4", "5"];
const BLOCK_COLOR = [
  "#4f4f4f",
  "royalblue",
  "blueviolet",
  "green",
  "sandybrown",
  "saddlebrown",
  "white",
];

const MAX_LEVEL = 20;
const CLEAR_BONUS_INITIAL = 25;
const CLEAR_BONUS_DIFFERENCE = 50;

const BUTTON_START = { x: 420, y: 460, width: 140, height: 32 };
const BUTTON_RESULT = { x: 420, y: 365, width: 140, height: 32 };

const DIRECTIONS = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const playarea = document.getElementById("playarea");
const playareaCtx = playarea.getContext("2d");
const scoreCtx = document.getElementById("score").getContext("2d");
const blockCtx = document.getElementById("blocks").getContext("2d");

const JPNFormat = new Intl.NumberFormat("ja-JP");
const generator = new BoardGenerator();

/** @type {string[][]} board[y][x] */
let board;
const status = {
  /** @type {"start" | "play" | "cleared" | "gameover"} */
  phase: "start",
  score: 0,
  level: 1,
  /** [y, x] of the block clicked first, or [] */
  clicked: [],
  /** [y, x][] of the highlighted blocks */
  selected: [],
};

// ---------------------------------------------------------------------------
// Game logic
// ---------------------------------------------------------------------------

/**
 * Sum of an arithmetic progression.
 * @param {number} n number of terms
 * @param {number} a first term
 * @param {number} d common difference
 * @returns {number}
 */
const calcSumForArithmetic = (n, a, d) => (n / 2) * (2 * a + (n - 1) * d);

/**
 * @param {number} remaining number of remaining blocks
 * @returns {number} percentage of deleted blocks (floored)
 */
const calcDeletedPercent = (remaining) =>
  Math.floor((1 - remaining / BOARD_SIZE) * 100);

/**
 * @param {number} remaining number of remaining blocks
 * @returns {number} clear bonus score
 */
const calcClearBonusScore = (remaining) =>
  calcSumForArithmetic(
    Math.max(calcDeletedPercent(remaining) - 85, 0),
    CLEAR_BONUS_INITIAL,
    CLEAR_BONUS_DIFFERENCE
  );

/** @param {number} count number of deleted blocks */
const calcDeleteScore = (count) => 5 * count ** 2;

/** @param {number} level */
const borderScore = (level) => 750 * level ** 2;

const createGrid = (value) =>
  Array.from({ length: BLOCKS_VERTICAL }, () =>
    Array(BLOCKS_HORIZONTAL).fill(value)
  );

const inBoard = (y, x) =>
  0 <= y && y < BLOCKS_VERTICAL && 0 <= x && x < BLOCKS_HORIZONTAL;

/**
 * Find the blocks of the same kind connected to the start block.
 * @param {string[][]} area
 * @param {number[]} start [y, x]
 * @returns {number[][]} [y, x][]
 */
const findSameBlocks = (area, [sy, sx]) => {
  const color = area[sy][sx];
  if (color === BLOCK.SHUFFLE) return [[sy, sx]];

  const visited = createGrid(false);
  visited[sy][sx] = true;
  const result = [[sy, sx]];
  for (let i = 0; i < result.length; i++) {
    const [y, x] = result[i];
    for (const [dy, dx] of DIRECTIONS) {
      const [ny, nx] = [y + dy, x + dx];
      if (!inBoard(ny, nx) || visited[ny][nx] || area[ny][nx] !== color) {
        continue;
      }
      visited[ny][nx] = true;
      result.push([ny, nx]);
    }
  }
  return result;
};

/**
 * Drop blocks to the bottom, then close empty columns to the right.
 * Mutates and returns the area.
 * @param {string[][]} area
 */
const applyGravity = (area) => {
  const columns = [];
  for (let x = 0; x < BLOCKS_HORIZONTAL; x++) {
    const blocks = area.map((row) => row[x]).filter((c) => c !== BLOCK.EMPTY);
    if (blocks.length === 0) continue;
    columns.push([
      ...Array(BLOCKS_VERTICAL - blocks.length).fill(BLOCK.EMPTY),
      ...blocks,
    ]);
  }
  while (columns.length < BLOCKS_HORIZONTAL) {
    columns.unshift(Array(BLOCKS_VERTICAL).fill(BLOCK.EMPTY));
  }
  for (let y = 0; y < BLOCKS_VERTICAL; y++) {
    for (let x = 0; x < BLOCKS_HORIZONTAL; x++) {
      area[y][x] = columns[x][y];
    }
  }
  return area;
};

/**
 * Whether any block can still be deleted or shuffled.
 * @param {string[][]} area
 */
const canOperate = (area) =>
  area.some((row, y) =>
    row.some((block, x) => {
      if (block === BLOCK.SHUFFLE) return true;
      if (block === BLOCK.EMPTY) return false;
      return DIRECTIONS.some(
        ([dy, dx]) => inBoard(y + dy, x + dx) && area[y + dy][x + dx] === block
      );
    })
  );

const countRemainingBlocks = (area) =>
  area.flat().filter((c) => c !== BLOCK.EMPTY).length;

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

const drawLine = (ctx, fromX, fromY, toX, toY) => {
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
};

const drawBackground = () => {
  const bg = document.getElementById("background").getContext("2d");
  if (!bg) return;
  bg.lineWidth = LINE_WIDTH;
  bg.strokeStyle = "orange";
  bg.fillStyle = "#0f0f0f";
  bg.lineCap = "round";
  bg.fillRect(1, 1, BACKGROUND_WIDTH + 4, BACKGROUND_HEIGHT + 4);
  bg.strokeRect(1, 1, BACKGROUND_WIDTH + 4, BACKGROUND_HEIGHT + 4);

  const scoreBottom = LINE_WIDTH + SCOREAREA_HEIGHT;
  drawLine(bg, 0, scoreBottom, BACKGROUND_WIDTH + 4, scoreBottom);
  drawLine(bg, SCORE_WIDTH, 0, SCORE_WIDTH, SCOREAREA_HEIGHT + 1);
  drawLine(
    bg,
    SCORE_WIDTH + LEVEL_WIDTH,
    0,
    SCORE_WIDTH + LEVEL_WIDTH,
    SCOREAREA_HEIGHT + 1
  );
};

/**
 * @param {number} [point] points just gained, shown next to the score
 */
const drawScoreArea = (point) => {
  if (!scoreCtx) return;
  const { score, level } = status;
  scoreCtx.clearRect(0, 0, BACKGROUND_WIDTH, SCOREAREA_HEIGHT);
  scoreCtx.font = "24px serif";
  scoreCtx.fillStyle = "white";
  const bottom = LINE_WIDTH + 24;
  let scoreText = `Score: ${JPNFormat.format(score)}`;
  if (typeof point === "number" && point !== 0) {
    scoreText += `  +${JPNFormat.format(point)}`;
  }
  scoreCtx.fillText(scoreText, OBJECT_SIZE, bottom);
  scoreCtx.fillText(`Level ${level}`, SCORE_WIDTH + 50, bottom);
  scoreCtx.fillText(
    `Score for level ${level + 1}: ${JPNFormat.format(borderScore(level))}`,
    SCORE_WIDTH + LEVEL_WIDTH + 30,
    bottom
  );
};

const isSelected = (y, x) =>
  status.selected.some(([sy, sx]) => sy === y && sx === x);

/**
 * Draw blocks. Cells with BLOCK.UNCHANGED are not redrawn.
 * @param {string[][]} area
 */
const drawBlockArea = (area) => {
  if (!blockCtx) return;
  area.forEach((row, y) =>
    row.forEach((block, x) => {
      if (block === BLOCK.UNCHANGED) return;
      const [px, py] = [
        x * OBJECT_SIZE + BLOCK_PADDING,
        y * OBJECT_SIZE + BLOCK_PADDING,
      ];
      blockCtx.save();
      blockCtx.fillStyle = BLOCK_COLOR[block];
      blockCtx.fillRect(px, py, BLOCK_SIZE, BLOCK_SIZE);
      if (isSelected(y, x)) {
        blockCtx.globalCompositeOperation = "lighter";
        blockCtx.fillStyle = "#222";
        blockCtx.fillRect(px, py, BLOCK_SIZE, BLOCK_SIZE);
      }
      blockCtx.restore();
    })
  );
};

const clearOverlay = () =>
  playareaCtx.clearRect(0, 0, BACKGROUND_WIDTH, BACKGROUND_HEIGHT);

/**
 * @param {number} width
 * @param {number} height
 * @param {string} title
 * @param {string[][]} messages paragraphs of lines
 */
const drawDialog = (width, height, title, messages) => {
  const ctx = playareaCtx;
  const x = (PLAYAREA_WIDTH - width) / 2;
  const y = (PLAYAREA_HEIGHT - height) / 2;

  ctx.fillStyle = "skyblue";
  ctx.strokeStyle = "midnightblue";
  ctx.lineWidth = 4;
  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x, y, width, height);

  ctx.fillStyle = "black";
  ctx.strokeStyle = "black";
  ctx.lineWidth = 2;
  drawLine(ctx, x + 10, y + 40, x + width - 10, y + 40);

  ctx.font = "34px serif";
  ctx.textAlign = "center";
  ctx.fillText(title, PLAYAREA_WIDTH / 2, y + 32);

  ctx.font = "20px serif";
  ctx.textAlign = "left";
  const textMargin = 24;
  const paragraphMargin = 8;
  let posY = y + 80;
  for (const lines of messages) {
    for (const text of lines) {
      ctx.fillText(text, x + 20, posY);
      posY += textMargin;
    }
    posY += paragraphMargin;
  }
};

const drawButton = (rect, label, strokeStyle) => {
  const ctx = playareaCtx;
  ctx.lineWidth = 2;
  ctx.fillStyle = "deepskyblue";
  ctx.strokeStyle = strokeStyle;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  ctx.fillStyle = "black";
  ctx.font = "20px serif";
  ctx.textAlign = "center";
  ctx.fillText(label, rect.x + rect.width / 2, rect.y + 24);
};

const drawStartDialog = () => {
  drawDialog(630, 420, "How to play", [
    [
      "■ 縦横に並んだ同じ種類のブロックをダブルクリックして、",
      "　 画面からブロックを消していってください。",
    ],
    [
      "■ シャッフルブロック（白いブロック）をクリックすると、",
      "　 縦横周囲2マスのブロックの配置がランダムに変わります。",
    ],
    [
      "■ 同じブロックが多く並んでいる場所をダブルクリックして",
      "　 一度に消すと、多くの得点を得ることができます。",
    ],
    [
      "■ ブロックが消せなくなるまでに残ったブロックが少ないほど、",
      "　 ボーナスとしてより多くの得点を得ることができます。",
    ],
    [
      "■ 各レベルには次のレベルに行くためのボーダーがあります。",
      "　 得点がボーダーに到達できない場合、ゲームが終了します。",
    ],
  ]);
  drawButton(BUTTON_START, "ゲーム開始", "black");
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

const showStartScreen = () => {
  status.phase = "start";
  drawScoreArea();
  drawBlockArea(createGrid(BLOCK.EMPTY));
  drawStartDialog();
};

const startLevel = () => {
  status.phase = "play";
  clearOverlay();
  board = generator.getBoard(true);
  drawBlockArea(board);
};

/** Finish the level if no block can be operated anymore. */
const checkBoard = () => {
  if (canOperate(board)) return;

  const remaining = countRemainingBlocks(board);
  const bonus = calcClearBonusScore(remaining);
  const deletedPercent = calcDeletedPercent(remaining);
  status.score += bonus;

  if (status.score < borderScore(status.level) || status.level === MAX_LEVEL) {
    status.phase = "gameover";
    drawDialog(350, 250, "GAME OVER", [
      [`■ Remaining blocks: ${remaining}`],
      [`■ ${deletedPercent}% deleted. Bonus: ${bonus}`],
      [`■ Total Score: ${status.score}`],
    ]);
    drawButton(BUTTON_RESULT, "Restart Game", "midnightblue");
    return;
  }

  status.phase = "cleared";
  drawScoreArea(bonus);
  drawDialog(350, 230, `CLEARED: Level ${status.level}`, [
    [`■ Remaining blocks: ${remaining}`],
    [`■ ${deletedPercent}% deleted! Bonus: ${bonus}`],
    [`■ Score Level ${status.level}: ${status.score}`],
  ]);
  drawButton(BUTTON_RESULT, `Start Level ${status.level + 1}`, "midnightblue");
};

const deleteBlocks = (blocks) => {
  for (const [y, x] of blocks) board[y][x] = BLOCK.EMPTY;
  status.selected = [];
  status.clicked = [];
  drawBlockArea(applyGravity(board));
  const point = calcDeleteScore(blocks.length);
  status.score += point;
  drawScoreArea(point);
  checkBoard();
};

/** Shuffle the blocks within 2 cells around the shuffle block at (x, y). */
const shuffleBlocks = (x, y) => {
  const [fromY, toY] = [Math.max(0, y - 2), Math.min(y + 2, BLOCKS_VERTICAL - 1)];
  const [fromX, toX] = [
    Math.max(0, x - 2),
    Math.min(x + 2, BLOCKS_HORIZONTAL - 1),
  ];
  const targets = [];
  for (let i = fromY; i <= toY; i++) {
    for (let j = fromX; j <= toX; j++) {
      if ((i === y && j === x) || board[i][j] === BLOCK.EMPTY) continue;
      targets.push([i, j]);
    }
  }

  if (targets.length === 0) {
    board[y][x] = generator.shuffle(COLOR_BLOCKS)[0];
  } else {
    const values = targets.map(([i, j]) => board[i][j]);
    const shuffled = generator.shuffle(values);
    targets.forEach(([i, j], k) => (board[i][j] = shuffled[k]));
    board[y][x] = generator.shuffle(values).find((b) => b !== BLOCK.SHUFFLE);
  }
  drawBlockArea(board);
  checkBoard();
};

/**
 * Highlight the group at (x, y), or delete it if it is already highlighted.
 */
const selectBlocks = (x, y) => {
  const blocks = findSameBlocks(board, [y, x]);
  if (blocks.length <= 1 && status.clicked.length === 0) return;

  const [cy, cx] = status.clicked;
  if (blocks.some(([by, bx]) => by === cy && bx === cx)) {
    deleteBlocks(blocks);
    return;
  }

  const redraw = createGrid(BLOCK.UNCHANGED);
  const markRedraw = (cells) => {
    for (const [gy, gx] of cells) redraw[gy][gx] = board[gy][gx];
  };

  if (status.clicked.length !== 0) {
    // un-highlight the previous group
    markRedraw(findSameBlocks(board, status.clicked));
    status.selected = [];
  }

  if (blocks.length === 1 || board[y][x] === BLOCK.EMPTY) {
    status.clicked = [];
  } else {
    status.selected = blocks;
    status.clicked = [y, x];
    markRedraw(blocks);
  }
  drawBlockArea(redraw);
};

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

const isInButton = (e, rect) =>
  rect.x < e.offsetX &&
  e.offsetX < rect.x + rect.width &&
  rect.y < e.offsetY &&
  e.offsetY < rect.y + rect.height;

const clickHandlers = {
  start: (e) => {
    if (isInButton(e, BUTTON_START)) startLevel();
  },
  play: (e) => {
    const x = Math.floor(e.offsetX / OBJECT_SIZE);
    const y = Math.floor(e.offsetY / OBJECT_SIZE);
    if (x >= BLOCKS_HORIZONTAL || y >= BLOCKS_VERTICAL) return;
    const isShuffle = board[y][x] === BLOCK.SHUFFLE;
    selectBlocks(x, y);
    if (isShuffle) shuffleBlocks(x, y);
  },
  cleared: (e) => {
    if (!isInButton(e, BUTTON_RESULT)) return;
    status.level++;
    drawScoreArea();
    startLevel();
  },
  gameover: (e) => {
    if (!isInButton(e, BUTTON_RESULT)) return;
    clearOverlay();
    status.level = 1;
    status.score = 0;
    showStartScreen();
  },
};

playarea.addEventListener("click", (e) => {
  e.preventDefault();
  clickHandlers[status.phase](e);
});

drawBackground();
showStartScreen();
