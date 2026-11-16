"""Testes do filtro do Monitor Serial (sem PlatformIO e sem placa).

Rodar na raiz do repositório:  python -m unittest discover -s hardware/monitor/tests -v
"""

import sys
import tempfile
import unittest
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import filter_gasguard as fg  # noqa: E402

PREAMBLE = f"data,2026-11-10\n{fg.HEADER}\n"
# Exemplo do docs/csv-contract.md, como o firmware imprime (sem hora e origem).
BOARD_LINE = "CSV,CRITICO,1,1120,290,2,1350,900,1,1,29.1,28.4,1,0,1,42"
CSV_ROW = "14:32:08,placa,CRITICO,1,1120,290,2,1350,900,1,1,29.1,28.4,1,0,1,42"


class Clock:
    def __init__(self, *moment):
        self.moment = datetime(*moment)

    def __call__(self):
        return self.moment


class FilterTest(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.path = Path(self.dir.name) / "daily-report.csv"
        self.clock = Clock(2026, 11, 10, 14, 32, 8)
        self.warnings = []
        self.csv = fg.GasGuardCsv(self.path, now=self.clock, warn=self.warnings.append)

    def tearDown(self):
        self.dir.cleanup()

    def content(self):
        return self.path.read_bytes().decode("utf-8")

    def test_writes_the_contract_example_with_date_line_and_header(self):
        self.csv.feed(BOARD_LINE + "\n")
        self.assertEqual(self.content(), PREAMBLE + CSV_ROW + "\n")

    def test_csv_path_is_the_repository_root(self):
        repo_root = Path(__file__).resolve().parents[3]
        self.assertEqual(fg.CSV_PATH, repo_root / "daily-report.csv")

    def test_waits_for_the_end_of_a_line_split_across_chunks(self):
        self.csv.feed(BOARD_LINE[:20])
        self.assertFalse(self.path.exists())
        self.csv.feed(BOARD_LINE[20:] + "\n")
        self.assertEqual(self.content(), PREAMBLE + CSV_ROW + "\n")

    def test_serial_crlf_becomes_lf_only(self):
        self.csv.feed(BOARD_LINE + "\r\n")
        self.assertNotIn("\r", self.content())
        self.assertTrue(self.content().endswith(CSV_ROW + "\n"))

    def test_ignores_logs_and_usb_noise(self):
        noise = [
            "[ALERTA] MQ-6 VAZAMENTO (+850) | MQ-2 atencao (+320)",
            "!!!!!!!!!!!!!!!!!!!!",
            "CSV,ALERTA,7,1131",  # campos de menos
            BOARD_LINE + ",9",  # campos de mais
            "CSV,ALTO RISCO,3,1,2,2,1,2,0,0,26.0,28.0,1,0,0,0",  # espaço: nome do log, não do CSV
            "CSV,alerta,7,1131,290,2,955,900,0,0,26.1,28.0,0,0,0,0",  # minúsculas
            "CSV,ALERTA,7,11�1,290,2,955,900,0,0,26.1,28.0,0,0,0,0",  # byte corrompido
            "CSV,BANANA,7,1131,290,2,955,900,0,0,26.1,28.0,0,0,0,0",  # nível inexistente
        ]
        self.csv.feed("\n".join(noise) + "\n")
        self.assertFalse(self.path.exists())

    def test_accepts_empty_temperature_and_limit(self):
        self.csv.feed("CSV,FALHA,16,300,290,0,910,900,0,0,,,0,1,0,0\n")
        self.assertTrue(self.content().endswith("14:32:08,placa,FALHA,16,300,290,0,910,900,0,0,,,0,1,0,0\n"))

    def test_keeps_only_the_first_line_of_a_second(self):
        self.csv.feed(BOARD_LINE + "\n" + BOARD_LINE.replace(",42", ",43") + "\n")
        self.assertEqual(self.content().count("\n"), 3)
        self.clock.moment = datetime(2026, 11, 10, 14, 32, 9)
        self.csv.feed(BOARD_LINE.replace(",42", ",43") + "\n")
        self.assertTrue(self.content().endswith("14:32:09,placa,CRITICO,1,1120,290,2,1350,900,1,1,29.1,28.4,1,0,1,43\n"))

    def test_rolls_over_at_midnight(self):
        self.clock.moment = datetime(2026, 11, 10, 23, 59, 59)
        self.csv.feed(BOARD_LINE + "\n")
        self.clock.moment = datetime(2026, 11, 11, 0, 0, 0)
        self.csv.feed(BOARD_LINE + "\n")
        self.assertEqual(
            self.content(),
            f"data,2026-11-11\n{fg.HEADER}\n00:00:00,placa,CRITICO,1,1120,290,2,1350,900,1,1,29.1,28.4,1,0,1,42\n",
        )

    def test_recreates_a_corrupted_or_deleted_file(self):
        self.path.write_bytes(b"\xff\xfe lixo\nmais lixo\n")
        self.csv.feed(BOARD_LINE + "\n")
        self.assertEqual(self.content(), PREAMBLE + CSV_ROW + "\n")

        self.path.unlink()
        self.clock.moment = datetime(2026, 11, 10, 14, 32, 9)
        self.csv.feed(BOARD_LINE + "\n")
        self.assertTrue(self.content().startswith(PREAMBLE))

    def test_a_write_error_only_warns_and_the_next_line_still_works(self):
        broken = fg.GasGuardCsv(Path(self.dir.name) / "missing-dir" / "x.csv", now=self.clock, warn=self.warnings.append)
        broken.feed(BOARD_LINE + "\n")
        self.assertEqual(len(self.warnings), 1)
        self.assertIn("não foi possível gravar", self.warnings[0])

        self.csv.feed(BOARD_LINE + "\n")
        self.assertEqual(self.content(), PREAMBLE + CSV_ROW + "\n")


class MonitorFilterTest(unittest.TestCase):
    def test_rx_passes_all_text_through_to_the_terminal(self):
        with tempfile.TemporaryDirectory() as folder:
            monitor = fg.GasGuard()
            monitor.csv = fg.GasGuardCsv(Path(folder) / "daily-report.csv", now=Clock(2026, 11, 10, 14, 32, 8))
            chunk = "[evento] Chama detectada\n" + BOARD_LINE + "\n"
            self.assertEqual(monitor.rx(chunk), chunk)
            self.assertEqual(monitor.tx("x"), "x")
            self.assertEqual(monitor.NAME, "gasguard")
            self.assertTrue((Path(folder) / "daily-report.csv").exists())


if __name__ == "__main__":
    unittest.main()
