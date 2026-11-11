// Test-only producer: writes fake but coherent GasGuard readings to daily-report.csv,
// exactly like the board does. The file format is defined in docs/csv-contract.md.

const COLUMNS = [
  "hora", "origem", "nivel", "cenario",
  "mq6", "mq6_base", "mq6_nivel",
  "mq2", "mq2_base", "mq2_nivel",
  "chama", "temp", "temp_limite", "temp_alta",
  "movimento", "fogao", "seg_sem_movimento",
];
const HEADER_LINE = COLUMNS.join(",");

const MQ6_BASE = 290;
const MQ2_BASE = 900;
const TEMP_LIMIT = 28.0;

const TOUR = [
  { scenario: "normal", seconds: 20 },
  { scenario: "gas_leak", seconds: 30 },
  { scenario: "gas_leak_flame", seconds: 30 },
  { scenario: "normal", seconds: 15 },
  { scenario: "gas_leak_heat", seconds: 30 },
  { scenario: "smoke", seconds: 30 },
  { scenario: "normal", seconds: 15 },
  { scenario: "unattended_stove", seconds: 75 },
  { scenario: "sensor_failure", seconds: 20 },
];
const TOUR_TOTAL_SECONDS = TOUR.reduce((total, step) => total + step.seconds, 0);

const pad = (value) => String(value).padStart(2, "0");

function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatTime(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function randInt(random, min, maxExclusive) {
  return min + Math.floor(random() * (maxExclusive - min));
}

function randTemp(random, min, max) {
  return Math.round((min + random() * (max - min)) * 10) / 10;
}

function leakingMq6(row, random) {
  row.mq6 = MQ6_BASE + randInt(random, 820, 1000);
  row.mq6_nivel = 2;
}

const SCENARIOS = {
  normal: () => {},
  gas_leak: (row, random) => {
    leakingMq6(row, random);
    Object.assign(row, { nivel: "ALERTA", cenario: 7 });
  },
  gas_leak_flame: (row, random) => {
    leakingMq6(row, random);
    Object.assign(row, { nivel: "CRITICO", cenario: 1, chama: 1 });
  },
  gas_leak_heat: (row, random) => {
    leakingMq6(row, random);
    Object.assign(row, { nivel: "ALTO", cenario: 3, temp: randTemp(random, 28.6, 30.0), temp_alta: 1 });
  },
  smoke: (row, random) => {
    Object.assign(row, { nivel: "ALERTA", cenario: 8, mq2: MQ2_BASE + randInt(random, 820, 1000), mq2_nivel: 2 });
  },
  unattended_stove: (row, random, elapsedSeconds) => {
    const seconds = Math.floor(elapsedSeconds);
    const [nivel, cenario] = seconds >= 60 ? ["ALERTA", 9] : seconds >= 30 ? ["ATENCAO", 13] : ["NORMAL", 17];
    Object.assign(row, { nivel, cenario, fogao: 1, chama: 1, movimento: 0, seg_sem_movimento: seconds });
  },
  sensor_failure: (row) => {
    Object.assign(row, { nivel: "FALHA", cenario: 16, temp: null, temp_alta: 0 });
  },
};

const SCENARIO_NAMES = [...Object.keys(SCENARIOS), "tour"];

/** Builds one reading (all CSV columns except hora/origem). Draw order: mq6, mq2, temp, movement. */
function buildRow(scenario, elapsedSeconds, random) {
  const apply = SCENARIOS[scenario];
  if (!apply) throw new Error(`Not a concrete scenario: ${scenario}`);
  const row = {
    nivel: "NORMAL",
    cenario: 0,
    mq6: MQ6_BASE + randInt(random, 0, 60),
    mq6_base: MQ6_BASE,
    mq6_nivel: 0,
    mq2: MQ2_BASE + randInt(random, 0, 60),
    mq2_base: MQ2_BASE,
    mq2_nivel: 0,
    chama: 0,
    temp: randTemp(random, 25.8, 26.4),
    temp_limite: TEMP_LIMIT,
    temp_alta: 0,
    movimento: random() < 0.3 ? 1 : 0,
    fogao: 0,
    seg_sem_movimento: 0,
  };
  apply(row, random, elapsedSeconds);
  return row;
}

/** Renders a CSV data line (without the trailing newline). */
function toCsvLine(time, row) {
  const values = {
    ...row,
    hora: time,
    origem: "mock",
    temp: row.temp === null ? "" : row.temp.toFixed(1),
    temp_limite: row.temp_limite.toFixed(1),
  };
  return COLUMNS.map((column) => String(values[column])).join(",");
}

function tourStepAt(elapsedSeconds) {
  let t = elapsedSeconds % TOUR_TOTAL_SECONDS;
  for (const step of TOUR) {
    if (t < step.seconds) return { scenario: step.scenario, elapsedInStep: t };
    t -= step.seconds;
  }
  throw new Error("unreachable");
}

module.exports = {
  COLUMNS,
  HEADER_LINE,
  SCENARIO_NAMES,
  TOUR,
  TOUR_TOTAL_SECONDS,
  formatDate,
  formatTime,
  buildRow,
  toCsvLine,
  tourStepAt,
};
