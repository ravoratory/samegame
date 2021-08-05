const s =
  "531554242123345433245334213312221255344224112312235525525212544455411133143133425454311152245151314235315121453353142414415411".split(
    ""
  );

const BLOCKS_HORIZONTAL = 14;
const BLOCKS_VERTICAL = 9;
const OBJECT_SIZE = 70;
const BLOCK_SIZE = 66;
const LINE_WIDTH = 2;
const SCOREAREA_HEIGHT = 32;
const SCORE_WIDTH = 364;
const LEVEL_WIDTH = 220;
const BACKGROUND_WIDTH = OBJECT_SIZE * BLOCKS_HORIZONTAL + LINE_WIDTH * 2;
const BACKGROUND_HEIGHT =
  OBJECT_SIZE * BLOCKS_VERTICAL + LINE_WIDTH * 3 + SCOREAREA_HEIGHT;
const BLOCK_COLOR = [
  "#2f2f2f",
  "royalblue",
  "blueviolet",
  "green",
  "sandybrown",
  "saddlebrown",
  "cyan",
];

const playarea = document.getElementById("playarea");
const scoreCtx = document.getElementById("score").getContext("2d");
const blockCtx = document.getElementById("blocks").getContext("2d");

const JPNFormat = new Intl.NumberFormat("ja-JP");

const calcDeleteBlockScore = (n) => 5 * n ** 2;

/**
 * Shuffle array by Fisher–Yates shuffle
 * @param {any[]} array input array
 * @returns {any[]} shuffled array
 */
const shuffle = ([...array]) => {
  for (let i = array.length - 1; i >= 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

/**
 * sum of the arithmetic progression is calculated from the first term and the common difference and the range.
 * @param {number} n number of range
 * @param {number} a first term
 * @param {number} d common difference
 * @returns {number} sum of arithmetic progression
 */
const calcSumForArithmetic = (n, a, d) => (n / 2) * (2 * a + (n - 1) * d);

const CLEAR_BONUS_INITIAL = 25;
const CLEAR_BONUS_DIFFERNCE = 50;
/**
 * Calculate for clear bonus.
 * @param {number} n Number of rest blocks.
 * @returns {number} Score of clear Bonus.
 */
const calcClearBonusScore = (n) =>
  calcSumForArithmetic(
    Math.max(Math.floor((1 - n / BOARD_SIZE) * 100) - 85, 0),
    CLEAR_BONUS_INITIAL,
    CLEAR_BONUS_DIFFERNCE
  );

/**
 * Find the same block adjacent to the selected block
 * @param {number[]} indexes
 * @returns {number[]} block indexes
 */
const findSameBlocks = (start) => {
  const d = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ];
  const q = [];
  const result = [];
  const H = BLOCKS_VERTICAL;
  const W = BLOCKS_HORIZONTAL;
  const color = board[start[0]][start[1]];
  const visited = [
    ...Array(9)
      .fill()
      .map((_) => Array(14).fill(false)),
  ];
  q.push(start);
  while (q.length) {
    const p = q.shift();
    const [y, x] = p;
    if (visited[y][x]) continue;
    result.push([y, x]);
    visited[y][x] = true;
    for (let i = 0; i < 4; i++) {
      const [next_y, next_x] = [y + d[i][0], x + d[i][1]];
      if (next_y < 0 || W <= next_x || next_x < 0 || H <= next_y) continue;
      if (visited[next_y][next_x] || board[next_y][next_x] !== color) continue;
      q.push([next_y, next_x]);
    }
  }
  return result;
};

const applyGravity = (area) => {
  const horizontal = [];
  for (let i = 0; i < BLOCKS_HORIZONTAL; i++) {
    let col = [];
    for (let j = 0; j < BLOCKS_VERTICAL; j++) {
      col.push(area[j][i]);
    }
    col = col.filter((a) => a !== "0");
    col = "0"
      .repeat(BLOCKS_VERTICAL - col.length)
      .split("")
      .concat(col);
    for (let j = 0; j < BLOCKS_VERTICAL; j++) {
      area[j][i] = col[j];
    }
    if (col.every((c) => c === "0")) horizontal.push(i);
  }
  if (horizontal.length) {
    for (let i = 0; i < BLOCKS_VERTICAL; i++) {
      const row = area[i].filter((_, idx) => !horizontal.includes(idx));
      area[i] = "0"
        .repeat(BLOCKS_HORIZONTAL - row.length)
        .split("")
        .concat(row);
    }
  }
  return area;
};

const board = new Array(BLOCKS_VERTICAL)
  .fill()
  .map((_, i) => s.slice(i * BLOCKS_HORIZONTAL, (i + 1) * BLOCKS_HORIZONTAL));
const status = {
  score: 0,
  level: 1,
  clicked: [],
  selected: [],
};

const drawBackGround = () => {
  const bg = document.getElementById("background").getContext("2d");
  if (!bg) return;
  bg.lineWidth = LINE_WIDTH;
  bg.strokeStyle = "orange";
  bg.fillStyle = "#0f0f0f";
  bg.lineCap = "round";
  bg.fillRect(1, 1, BACKGROUND_WIDTH + 1, BACKGROUND_HEIGHT + 1);
  bg.strokeRect(1, 1, BACKGROUND_WIDTH + 1, BACKGROUND_HEIGHT + 1);
  bg.save();

  bg.beginPath();
  bg.moveTo(0, LINE_WIDTH + SCOREAREA_HEIGHT);
  bg.lineTo(BACKGROUND_WIDTH, LINE_WIDTH + SCOREAREA_HEIGHT);
  bg.stroke();
  bg.beginPath();
  bg.moveTo(SCORE_WIDTH, 0);
  bg.lineTo(SCORE_WIDTH, SCOREAREA_HEIGHT + 1);
  bg.stroke();
  bg.beginPath();
  bg.moveTo(SCORE_WIDTH + LEVEL_WIDTH, 0);
  bg.lineTo(SCORE_WIDTH + LEVEL_WIDTH, SCOREAREA_HEIGHT + 1);
  bg.stroke();
};

const drawScoreArea = (score, level, point) => {
  if (!scoreCtx) return;
  scoreCtx.clearRect(0, 0, BACKGROUND_WIDTH, SCOREAREA_HEIGHT);
  scoreCtx.font = "24px serif";
  scoreCtx.fillStyle = "white";
  const bottom = LINE_WIDTH + 24;
  let scoreText = `Score: ${JPNFormat.format(score)}`;
  if (typeof point === "number") {
    scoreText += `  +${JPNFormat.format(point)}`;
  }
  scoreCtx.fillText(scoreText, OBJECT_SIZE, bottom);
  scoreCtx.fillText(`Level ${level}`, SCORE_WIDTH + 50, bottom);
  scoreCtx.fillText(
    `Border-Level ${level}: ${JPNFormat.format(750 * level ** 2)}`,
    SCORE_WIDTH + LEVEL_WIDTH + 30,
    bottom
  );
};

const drawBlockArea = (area) => {
  if (!blockCtx) return;
  for (let i = 0; i < BLOCKS_HORIZONTAL * BLOCKS_VERTICAL; i++) {
    if (area[i] === "7") continue;
    blockCtx.save();
    blockCtx.fillStyle = BLOCK_COLOR[area[i]];
    const [x, y] = [
      (i % 14) * OBJECT_SIZE + 4,
      Math.floor(i / 14) * OBJECT_SIZE + 4,
    ];
    blockCtx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
    if (
      status.selected.some(
        (s) => s[0] === Math.floor(i / 14) && s[1] === i % 14
      )
    ) {
      blockCtx.globalCompositeOperation = "lighter";
      blockCtx.fillStyle = "#222";
      blockCtx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
    }
    blockCtx.restore();
  }
};

const deleteBlocks = (blocks) => {
  for (const block of blocks) {
    const [gy, gx] = block;
    board[gy][gx] = "0";
  }
  status.selected = [];
  status.clicked = [];
  drawBlockArea(applyGravity(board).flat());
  const point = calcDeleteBlockScore(blocks.length);
  status.score += point;
  drawScoreArea(status.score, status.level, point);
  return;
};

const glowBlocks = (x, y) => {
  const blocks = findSameBlocks([y, x]);
  if (blocks.length <= 1 && status.clicked.length === 0) return;

  const already = blocks.some(
    (s) => s[0] === status.clicked[0] && s[1] === status.clicked[1]
  );
  if (already) {
    deleteBlocks(blocks);
    return;
  }

  const prim = [
    ...Array(9)
      .fill()
      .map((_) => Array(14).fill("7")),
  ];

  if (status.clicked.length !== 0) {
    const [cy, cx] = status.clicked;
    const glowing = findSameBlocks([cy, cx]);
    console.log(glowing);
    for (const block of glowing) {
      const [gy, gx] = block;
      prim[gy][gx] = board[gy][gx];
    }
    status.selected = [];
  }

  if (blocks.length === 1 || board[y][x] === "0") {
    status.clicked = [];
  } else {
    status.selected = blocks;
    status.clicked = [y, x];
    for (const block of blocks) {
      const [gy, gx] = block;
      prim[gy][gx] = board[gy][gx];
    }
  }
  drawBlockArea(prim.flat());
};

playarea.addEventListener("click", (e) => {
  e.preventDefault();
  const [x, y] = [
    Math.floor(e.offsetX / OBJECT_SIZE),
    Math.floor(e.offsetY / OBJECT_SIZE),
  ];
  if (board[y][x] === "6") {
    return;
  }
  glowBlocks(x, y);
});

drawBackGround();
drawScoreArea(status.score, status.level);
drawBlockArea(board.flat());
