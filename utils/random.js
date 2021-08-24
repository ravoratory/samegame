export const Random = class {
  constructor(seed) {
    this.w = seed ?? Math.floor(Math.random() * 1e9);
    this.x = 483210922;
    this.y = 854321471;
    this.z = 280934432;
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
