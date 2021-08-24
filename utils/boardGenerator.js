import { Random } from "./random.js";
export const BoardGenerator = class {
  constructor(seed) {
    this.horizontal = 14;
    this.vertical = 9;
    this.boardSize = this.horizontal * this.vertical;
    this.randomizer = new Random(
      typeof seed === "number" ? seed : new Date().getTime()
    );
    this.board = [
      ...Array(9)
        .fill()
        .map((_) => Array(14).fill(0)),
    ];
  }
  getBoard(reflesh = false) {
    if (!reflesh) return this.board;
    const board = this.board.map((row) =>
      row.map((c) => `${this.randomizer.rangeInt(1, 5)}`)
    );
    const randomBlocks = this.randomizer.rangeInt(1, 4);
    for (let i = 0; i < randomBlocks; i++) {
      const block = this.randomizer.rangeInt(0, this.boardSize - 1);
      const [x, y] = [block % 14, Math.floor(block / 14)];
      board[y][x] = "6";
    }
    this.board = board;
    return board;
  }
  /**
   * Shuffle array by Fisher–Yates shuffle
   * @param {any[]} array input array
   * @returns {any[]} shuffled array
   */
  shuffle([...array]) {
    for (let i = array.length - 1; i >= 0; i--) {
      const j = this.randomizer.rangeInt(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
};
