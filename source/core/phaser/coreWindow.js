import { touchHere } from "../touchHere.js";

export default class coreWindow extends touchHere {
  constructor() {
    super();
    this.accumulator = 0;
    this.fixedDelta = 1000 / 80;
  }
}