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
const BACKGROUND_WIDTH = OBJECT_SIZE * BLOCKS_HORIZONTAL + LINE_WIDTH * 2;
const BACKGROUND_HEIGHT =
  OBJECT_SIZE * BLOCKS_VERTICAL + LINE_WIDTH * 3 + SCOREAREA_HEIGHT;
const BLOCK_COLOR = [
  "#4f4f4f",
  "royalblue",
  "blueviolet",
  "green",
  "sandybrown",
  "saddlebrown",
  "white",
];

const playarea = document.getElementById("playarea");
const scoreCtx = document.getElementById("score").getContext("2d");
const blockCtx = document.getElementById("blocks").getContext("2d");

const JPNFormat = new Intl.NumberFormat("ja-JP");

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
  if (color === "6") return [start];
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

const canOperation = (area) => {
  for (let i = 0; i < BLOCKS_HORIZONTAL; i++) {
    for (let j = 0; j < BLOCKS_VERTICAL; j++) {
      const block = area[j][i];
      if (block === "6") return true;
      if (block === "0") continue;
      const nexts = findSameBlocks([j, i]);
      if (nexts.length > 1) return true;
    }
  }
  return false;
};

let board;
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
  bg.fillRect(1, 1, BACKGROUND_WIDTH + 4, BACKGROUND_HEIGHT + 4);
  bg.strokeRect(1, 1, BACKGROUND_WIDTH + 4, BACKGROUND_HEIGHT + 4);
  bg.save();

  bg.beginPath();
  bg.moveTo(0, LINE_WIDTH + SCOREAREA_HEIGHT);
  bg.lineTo(BACKGROUND_WIDTH + 4, LINE_WIDTH + SCOREAREA_HEIGHT);
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
  if (typeof point === "number" && point !== 0) {
    scoreText += `  +${JPNFormat.format(point)}`;
  }
  scoreCtx.fillText(scoreText, OBJECT_SIZE, bottom);
  scoreCtx.fillText(`Level ${level}`, SCORE_WIDTH + 50, bottom);
  scoreCtx.fillText(
    `Score for level ${level + 1}: ${JPNFormat.format(750 * level ** 2)}`,
    SCORE_WIDTH + LEVEL_WIDTH + 30,
    bottom
  );
};

const drawBlockArea = (area) => {
  if (!blockCtx) return;
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (area[i] === "7") continue;
    blockCtx.save();
    blockCtx.fillStyle = BLOCK_COLOR[area[i]];
    const [x, y] = [
      (i % 14) * OBJECT_SIZE + BLOCK_PADDING,
      Math.floor(i / 14) * OBJECT_SIZE + BLOCK_PADDING,
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

const drawDialog = (width, height, title, messages) => {
  const playareaCtx = playarea.getContext("2d");

  const x = (OBJECT_SIZE * BLOCKS_HORIZONTAL - width) / 2;
  const y = (OBJECT_SIZE * BLOCKS_VERTICAL - height) / 2;

  playareaCtx.fillStyle = "skyblue";
  playareaCtx.strokeStyle = "midnightblue";
  playareaCtx.lineWidth = 4;
  playareaCtx.fillRect(x, y, width, height);
  playareaCtx.strokeRect(x, y, width, height);

  playareaCtx.fillStyle = "black";
  playareaCtx.strokeStyle = "black";
  playareaCtx.lineWidth = 2;
  playareaCtx.beginPath();
  playareaCtx.moveTo(x + 10, y + 40);
  playareaCtx.lineTo(x + width - 10, y + 40);
  playareaCtx.stroke();

  playareaCtx.font = "34px serif";
  playareaCtx.textAlign = "center";
  playareaCtx.fillText(title, (OBJECT_SIZE * BLOCKS_HORIZONTAL) / 2, y + 32);

  playareaCtx.font = "20px serif";
  playareaCtx.textAlign = "left";
  const posX = x + 20;
  let posY = y + 80;
  const textMargin = 24;
  const divMargin = 8;

  for (const message of messages) {
    for (const text of message) {
      playareaCtx.fillText(text, posX, posY);
      posY += textMargin;
    }
    posY += divMargin;
  }
};

const drawStartDialog = () => {
  const messages = [
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
  ];
  drawDialog(630, 420, "How to play", messages);
  const playareaCtx = playarea.getContext("2d");
  playareaCtx.lineWidth = 2;
  playareaCtx.fillStyle = "deepskyblue";
  playareaCtx.fillRect(420, 460, 140, 32);
  playareaCtx.strokeRect(420, 460, 140, 32);
  playareaCtx.fillStyle = "black";
  playareaCtx.font = "20px serif";
  playareaCtx.textAlign = "center";
  playareaCtx.fillText("ゲーム開始", 490, 484);
};

const checkBoard = () => {
  if (canOperation(board)) return;
  let remainingBlocks = 0;
  for (let i = 0; i < BLOCKS_HORIZONTAL; i++) {
    for (let j = 0; j < BLOCKS_VERTICAL; j++) {
      if (board[j][i] !== "0") remainingBlocks++;
    }
  }

  const clearScore = calcClearBonusScore(remainingBlocks);
  const remainBlockPercent = Math.floor(
    (1 - remainingBlocks / BOARD_SIZE) * 100
  );
  status.score += clearScore;
  const playareaCtx = playarea.getContext("2d");
  if (status.score < 750 * status.level ** 2 || status.level === 20) {
    playarea.removeEventListener("click", onPlay);
    playarea.addEventListener("click", onFinished);
    const messages = [
      [`■ Remaining blocks: ${remainingBlocks}`],
      [`■ ${remainBlockPercent}% deleted. Bonus: ${clearScore}`],
      [`■ Total Score: ${status.score}`],
    ];
    drawDialog(350, 250, "GAME OVER", messages);
    playareaCtx.lineWidth = 2;
    playareaCtx.fillStyle = "deepskyblue";
    playareaCtx.strokeStyle = "midnightblue";
    playareaCtx.fillRect(420, 365, 140, 32);
    playareaCtx.strokeRect(420, 365, 140, 32);
    playareaCtx.fillStyle = "black";
    playareaCtx.font = "20px serif";
    playareaCtx.textAlign = "center";
    playareaCtx.fillText(`Restart Game`, 490, 389);
    return;
  }
  const messages = [
    [`■ Remaining blocks: ${remainingBlocks}`],
    [`■ ${remainBlockPercent}% deleted! Bonus: ${clearScore}`],
    [`■ Score Level ${status.level}: ${status.score}`],
  ];
  drawScoreArea(status.score, status.level, clearScore);
  drawDialog(350, 230, `CLEARED: Level ${status.level}`, messages);
  playarea.removeEventListener("click", onPlay);
  playarea.addEventListener("click", onResult);
  playareaCtx.lineWidth = 2;
  playareaCtx.fillStyle = "deepskyblue";
  playareaCtx.strokeStyle = "midnightblue";
  playareaCtx.fillRect(420, 365, 140, 32);
  playareaCtx.strokeRect(420, 365, 140, 32);
  playareaCtx.fillStyle = "black";
  playareaCtx.font = "20px serif";
  playareaCtx.textAlign = "center";
  playareaCtx.fillText(`Start Level ${status.level + 1}`, 490, 389);
};

const deleteBlocks = (blocks) => {
  for (const block of blocks) {
    const [gy, gx] = block;
    board[gy][gx] = "0";
  }
  status.selected = [];
  status.clicked = [];
  drawBlockArea(applyGravity(board).flat());
  const point = 5 * blocks.length ** 2;
  status.score += point;
  drawScoreArea(status.score, status.level, point);
  checkBoard();
};

const shuffleBlocks = (x, y) => {
  const [fx, fy] = [Math.max(0, x - 2), Math.max(0, y - 2)];
  const [tx, ty] = [
    Math.min(x + 2, BLOCKS_HORIZONTAL - 1),
    Math.min(y + 2, BLOCKS_VERTICAL - 1),
  ];
  const cp = [];
  for (let i = fy; i <= ty; i++) {
    for (let j = fx; j <= tx; j++) {
      if ((i === y && j === x) || board[i][j] === "0") continue;
      cp.push(board[i][j]);
    }
  }
  if (cp.length === 0) {
    board[y][x] = shuffle(["1", "2", "3", "4", "5"]).shift();
    drawBlockArea(board.flat());
    checkBoard();
    return;
  }
  const shuffled = shuffle(cp);
  for (let i = fy; i <= ty; i++) {
    for (let j = fx; j <= tx; j++) {
      if ((i === y && j === x) || board[i][j] === "0") continue;
      board[i][j] = shuffled.shift();
    }
  }
  board[y][x] = shuffle(cp).shift();
  drawBlockArea(board.flat());
  checkBoard();
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

const cursorInBox = (x, y, [xfrom, xto], [yfrom, yto]) =>
  xfrom < x && x < xto && yfrom < y && y < yto;

const beforePlay = (e) => {
  e.preventDefault();
  const [x, y] = [e.offsetX, e.offsetY];
  if (cursorInBox(x, y, [420, 560], [460, 492])) {
    playarea.removeEventListener("click", beforePlay);
    playarea.addEventListener("click", onPlay);
    const playareaCtx = playarea.getContext("2d");
    playareaCtx.clearRect(0, 0, BACKGROUND_WIDTH, BACKGROUND_HEIGHT);
    setBoard(`${status.level}`.padStart(2, "0"));
  }
};

const onPlay = (e) => {
  e.preventDefault();
  const [x, y] = [
    Math.floor(e.offsetX / OBJECT_SIZE),
    Math.floor(e.offsetY / OBJECT_SIZE),
  ];
  if (x >= BLOCKS_HORIZONTAL || y >= BLOCKS_VERTICAL) return;
  const needToShuffle = board[y][x] === "6";
  glowBlocks(x, y);
  if (needToShuffle) shuffleBlocks(x, y);
};

const onResult = (e) => {
  e.preventDefault();
  const [x, y] = [e.offsetX, e.offsetY];
  if (cursorInBox(x, y, [420, 560], [365, 397])) {
    playarea.removeEventListener("click", onResult);
    playarea.addEventListener("click", onPlay);
    const playareaCtx = playarea.getContext("2d");
    playareaCtx.clearRect(0, 0, BACKGROUND_WIDTH, BACKGROUND_HEIGHT);
    status.level++;
    drawScoreArea(status.score, status.level);
    setBoard(`${status.level}`.padStart(2, "0"));
  }
};

const onFinished = (e) => {
  e.preventDefault();
  const [x, y] = [e.offsetX, e.offsetY];
  if (cursorInBox(x, y, [420, 560], [365, 397])) {
    playarea.removeEventListener("click", onFinished);
    const playareaCtx = playarea.getContext("2d");
    playarea.addEventListener("click", beforePlay);
    playareaCtx.clearRect(0, 0, BACKGROUND_WIDTH, BACKGROUND_HEIGHT);
    status.level = 1;
    status.score = 0;
    drawScoreArea(status.score, status.level);
    drawBlockArea("".padStart(BOARD_SIZE, "0"));
    drawStartDialog();
  }
};
const setBoard = (q) => {
  const req = new XMLHttpRequest();
  const loadArea = (e) => {
    e.preventDefault();
    const result = req.responseText.split("");
    board = new Array(BLOCKS_VERTICAL)
      .fill()
      .map((_, i) =>
        result.slice(i * BLOCKS_HORIZONTAL, (i + 1) * BLOCKS_HORIZONTAL)
      );
    drawBlockArea(board.flat());
    req.removeEventListener("load", loadArea);
  };
  req.addEventListener("load", loadArea);
  req.open(
    "GET",
    `https://raw.githubusercontent.com/ravoratory/samegame/master/boards/p${q}`
  );
  req.send();
};

playarea.addEventListener("click", beforePlay);
drawBackGround();
drawScoreArea(status.score, status.level);
drawBlockArea("".padStart(BOARD_SIZE, "0"));
drawStartDialog();
