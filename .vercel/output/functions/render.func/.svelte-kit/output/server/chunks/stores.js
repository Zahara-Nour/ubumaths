import { w as writable } from "./index2.js";
const darkmode = writable(false);
const touchDevice = writable(false);
const toMarkup = writable((o) => o);
const fontSize = writable(16);
const formatLatex = writable((o) => o);
const mathliveReady = writable(false);
const MathfieldElement = writable(null);
const virtualKeyboardMode = writable(false);
export {
  MathfieldElement as M,
  toMarkup as a,
  fontSize as b,
  darkmode as d,
  formatLatex as f,
  mathliveReady as m,
  touchDevice as t,
  virtualKeyboardMode as v
};
