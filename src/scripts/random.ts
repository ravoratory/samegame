export const Random = class {
  w: number;
  x: number;
  y: number;
  z: number;
  constructor(seed: number) {
    this.w = seed ?? Math.floor(Math.random() * 1e9);
    this.x = 483210922;
    this.y = 854321471;
    this.z = 280934432;
  }
  int() {
    // xor shift
    const t = this.x ^ (this.x << 11);
    this.x = this.y;
    this.y = this.z;
    this.z = this.w;
    this.w = this.w ^ (this.w >>> 19) ^ (t ^ (t >>> 8));
    return Math.abs(this.w);
  }
  rangeInt(min = 0, max = 1e9) {
    const r = this.int();
    return min + (r % (max + 1 - min));
  }
};
