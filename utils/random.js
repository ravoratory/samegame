export const Random = class {
  constructor(seed) {
    // Initial state from Marsaglia, "Xorshift RNGs" (2003)
    this.x = 123456789;
    this.y = 362436069;
    this.z = 521288629;
    this.w = 88675123 ^ (seed ?? Math.floor(Math.random() * 1e9));
  }
  int() {
    // xor shift
    const t = this.x ^ (this.x << 11);
    [this.x, this.y, this.z, this.w] = [
      this.y,
      this.z,
      this.w,
      this.w ^ (this.w >>> 19) ^ (t ^ (t >>> 8)),
    ];
    return Math.abs(this.w);
  }
  rangeInt(min = 0, max = 1e9) {
    const r = this.int();
    return min + (r % (max + 1 - min));
  }
};
