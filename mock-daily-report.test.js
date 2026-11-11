const test = require("node:test");
const assert = require("node:assert/strict");
const {
  COLUMNS, HEADER_LINE, SCENARIO_NAMES, TOUR, TOUR_TOTAL_SECONDS,
  formatDate, formatTime, buildRow, toCsvLine, tourStepAt,
} = require("./mock-daily-report");

const LOW = () => 0;
const MID = () => 0.5;
const HIGH = () => 0.999999;

const gasLevelFor = (delta) => (delta >= 800 ? 2 : delta >= 300 ? 1 : 0);
function assertCoherentGas(row) {
  assert.equal(row.mq6_base, 290);
  assert.equal(row.mq2_base, 900);
  assert.ok(Number.isInteger(row.mq6) && Number.isInteger(row.mq2));
  assert.equal(row.mq6_nivel, gasLevelFor(row.mq6 - row.mq6_base));
  assert.equal(row.mq2_nivel, gasLevelFor(row.mq2 - row.mq2_base));
}

test("HEADER_LINE matches the CSV contract exactly", () => {
  assert.equal(
    HEADER_LINE,
    "hora,origem,nivel,cenario,mq6,mq6_base,mq6_nivel,mq2,mq2_base,mq2_nivel,chama,temp,temp_limite,temp_alta,movimento,fogao,seg_sem_movimento",
  );
  assert.equal(COLUMNS.length, 17);
});

test("SCENARIO_NAMES lists every scenario plus tour", () => {
  assert.deepEqual(SCENARIO_NAMES, [
    "normal", "gas_leak", "gas_leak_flame", "gas_leak_heat",
    "smoke", "unattended_stove", "sensor_failure", "tour",
  ]);
});

test("formatDate and formatTime use local time with zero padding", () => {
  const date = new Date(2026, 0, 5, 3, 4, 5);
  assert.equal(formatDate(date), "2026-01-05");
  assert.equal(formatTime(date), "03:04:05");
  assert.equal(formatDate(new Date(2026, 10, 10, 14, 32, 8)), "2026-11-10");
});

const EXPECTED = {
  normal: ["NORMAL", 0],
  gas_leak: ["ALERTA", 7],
  gas_leak_flame: ["CRITICO", 1],
  gas_leak_heat: ["ALTO", 3],
  smoke: ["ALERTA", 8],
  sensor_failure: ["FALHA", 16],
};
for (const [scenario, [nivel, cenario]] of Object.entries(EXPECTED)) {
  for (const [label, random] of [["low", LOW], ["mid", MID], ["high", HIGH]]) {
    test(`buildRow(${scenario}) is ${nivel}/${cenario} with ${label} randomness`, () => {
      const row = buildRow(scenario, 0, random);
      assert.equal(row.nivel, nivel);
      assert.equal(row.cenario, cenario);
      assertCoherentGas(row);
    });
  }
}

test("normal readings stay inside the clean-air ranges", () => {
  for (const random of [LOW, MID, HIGH]) {
    const row = buildRow("normal", 0, random);
    assert.ok(row.temp >= 25.8 && row.temp <= 26.4, `temp ${row.temp}`);
    assert.equal(row.temp_limite, 28.0);
    assert.equal(row.temp_alta, 0);
    assert.equal(row.chama, 0);
    assert.equal(row.fogao, 0);
    assert.equal(row.seg_sem_movimento, 0);
  }
  assert.equal(buildRow("normal", 0, LOW).movimento, 1);
  assert.equal(buildRow("normal", 0, HIGH).movimento, 0);
});

test("gas_leak_flame sets flame and gas_leak_heat sets high temperature", () => {
  assert.equal(buildRow("gas_leak", 0, MID).chama, 0);
  assert.equal(buildRow("gas_leak_flame", 0, MID).chama, 1);
  for (const random of [LOW, MID, HIGH]) {
    const row = buildRow("gas_leak_heat", 0, random);
    assert.ok(row.temp >= 28.6 && row.temp <= 30.0, `temp ${row.temp}`);
    assert.equal(row.temp_alta, 1);
  }
});

test("sensor_failure has no temperature", () => {
  const row = buildRow("sensor_failure", 0, MID);
  assert.equal(row.temp, null);
  assert.equal(row.temp_alta, 0);
});

test("unattended_stove escalates with the time without motion", () => {
  const cases = [
    [0, "NORMAL", 17], [29, "NORMAL", 17], [29.9, "NORMAL", 17],
    [30, "ATENCAO", 13], [59, "ATENCAO", 13],
    [60, "ALERTA", 9], [300, "ALERTA", 9],
  ];
  for (const [elapsed, nivel, cenario] of cases) {
    const row = buildRow("unattended_stove", elapsed, MID);
    assert.equal(row.nivel, nivel, `elapsed ${elapsed}`);
    assert.equal(row.cenario, cenario, `elapsed ${elapsed}`);
    assert.equal(row.seg_sem_movimento, Math.floor(elapsed));
    assert.equal(row.fogao, 1);
    assert.equal(row.chama, 1);
    assert.equal(row.movimento, 0);
  }
});

test("buildRow rejects tour and unknown scenarios", () => {
  assert.throws(() => buildRow("tour", 0, MID));
  assert.throws(() => buildRow("banana", 0, MID));
});

test("toCsvLine renders the 17 contract fields", () => {
  assert.equal(
    toCsvLine("14:32:08", buildRow("gas_leak_flame", 0, LOW)),
    "14:32:08,mock,CRITICO,1,1110,290,2,900,900,0,1,25.8,28.0,0,1,0,0",
  );
  assert.equal(
    toCsvLine("10:00:00", buildRow("sensor_failure", 0, HIGH)),
    "10:00:00,mock,FALHA,16,349,290,0,959,900,0,0,,28.0,0,0,0,0",
  );
});

test("TOUR runs every scenario and lasts 265 s", () => {
  assert.deepEqual(TOUR, [
    { scenario: "normal", seconds: 20 },
    { scenario: "gas_leak", seconds: 30 },
    { scenario: "gas_leak_flame", seconds: 30 },
    { scenario: "normal", seconds: 15 },
    { scenario: "gas_leak_heat", seconds: 30 },
    { scenario: "smoke", seconds: 30 },
    { scenario: "normal", seconds: 15 },
    { scenario: "unattended_stove", seconds: 75 },
    { scenario: "sensor_failure", seconds: 20 },
  ]);
  assert.equal(TOUR_TOTAL_SECONDS, 265);
});

test("tourStepAt maps elapsed time to the current step and loops", () => {
  const cases = [
    [0, "normal", 0], [19, "normal", 19], [19.5, "normal", 19.5],
    [20, "gas_leak", 0], [50, "gas_leak_flame", 0], [80, "normal", 0],
    [95, "gas_leak_heat", 0], [125, "smoke", 0], [155, "normal", 0],
    [170, "unattended_stove", 0], [244, "unattended_stove", 74],
    [245, "sensor_failure", 0], [264, "sensor_failure", 19],
    [265, "normal", 0], [265 + 170 + 61, "unattended_stove", 61],
  ];
  for (const [elapsed, scenario, elapsedInStep] of cases) {
    assert.deepEqual(tourStepAt(elapsed), { scenario, elapsedInStep }, `elapsed ${elapsed}`);
  }
});
