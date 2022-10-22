const loggers = {};
function getLogger(name, level = "info") {
  if (!Object.prototype.hasOwnProperty.call(loggers, name) || loggers[name].level !== level) {
    const levels = ["trace", "debug", "info", "warn", "fail"];
    const coloredPrefix = `%c[${name}] `;
    const prefix = `[${name}] `;
    const noop = () => {
    };
    const fail = levels.indexOf(level) <= levels.indexOf("fail") ? console.error.bind(console, coloredPrefix, "color:#ED8784") : noop;
    const warn = levels.indexOf(level) <= levels.indexOf("warn") ? console.warn.bind(console, coloredPrefix, "color:#F3D9A2") : noop;
    const info = levels.indexOf(level) <= levels.indexOf("info") ? console.info.bind(console, coloredPrefix, "color:#8CE9FF") : noop;
    const debug = levels.indexOf(level) <= levels.indexOf("debug") ? console.log.bind(console, prefix) : noop;
    const trace = levels.indexOf(level) <= levels.indexOf("trace") ? console.log.bind(console, prefix) : noop;
    loggers[name] = {
      level,
      fail,
      warn,
      info,
      debug,
      trace
    };
  }
  return loggers[name];
}
const shuffle = function(array) {
  let currentIndex = array.length;
  let temporaryValue, randomIndex;
  while (0 !== currentIndex) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }
  return array;
};
const lexicoSort = (a, b) => {
  if (a < b)
    return -1;
  if (a > b)
    return 1;
  return 0;
};
export {
  getLogger as g,
  lexicoSort as l,
  shuffle as s
};
