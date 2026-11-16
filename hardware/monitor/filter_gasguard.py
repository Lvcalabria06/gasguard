"""Filtro do Monitor Serial do PlatformIO: grava o daily-report.csv a partir da placa.

O firmware imprime, a cada 1 s, uma linha "CSV,<15 campos>" no meio dos logs legíveis.
Este filtro acompanha o texto que chega pela Serial, pega essas linhas, acrescenta a hora
(do computador) e a origem ("placa") e grava no CSV da raiz do repositório.
Todo o texto continua indo para o terminal: o Monitor funciona como antes.

Formato e regras: docs/csv-contract.md. Ativação: monitor_filters = default, gasguard
"""

import re
from datetime import datetime
from pathlib import Path

try:
    from platformio.public import DeviceMonitorFilterBase
except ImportError:  # fora do PlatformIO (testes): uma base mínima
    class DeviceMonitorFilterBase:  # type: ignore[no-redef]
        def __init__(self, *args, **kwargs):
            pass


CSV_PATH = Path(__file__).resolve().parents[2] / "daily-report.csv"
HEADER = (
    "hora,origem,nivel,cenario,mq6,mq6_base,mq6_nivel,mq2,mq2_base,mq2_nivel,"
    "chama,temp,temp_limite,temp_alta,movimento,fogao,seg_sem_movimento"
)
FIELDS_FROM_BOARD = 15
# Só o que a linha CSV pode conter; qualquer outro caractere é ruído na USB.
VALID_LINE = re.compile(r"^[0-9A-Z.,_-]*$")
LEVELS = {"NORMAL", "ATENCAO", "ALERTA", "ALTO", "CRITICO", "FALHA"}


def parse_board_line(line):
    """Devolve os 15 campos de uma linha "CSV,..." válida, ou None."""
    line = line.rstrip("\r")
    if not line.startswith("CSV,") or not VALID_LINE.match(line):
        return None
    fields = line.split(",")[1:]
    if len(fields) != FIELDS_FROM_BOARD or fields[0] not in LEVELS:
        return None
    return fields


def ensure_daily_file(path, date):
    """Recria o arquivo (linha da data + cabeçalho) se ele não for de `date`. True se recriou."""
    date_line = f"data,{date}"
    try:
        # errors="replace": um arquivo corrompido é recriado em vez de travar o filtro.
        with open(path, "r", encoding="utf-8", errors="replace", newline="") as file:
            if file.readline().rstrip("\r\n") == date_line:
                return False
    except FileNotFoundError:
        pass
    with open(path, "w", encoding="utf-8", newline="") as file:
        file.write(f"{date_line}\n{HEADER}\n")
    return True


class GasGuardCsv:
    """Monta as linhas do CSV a partir do texto da Serial. Sem PlatformIO: testável."""

    def __init__(self, path=CSV_PATH, now=datetime.now, warn=print):
        self.path = Path(path)
        self.now = now
        self.warn = warn
        self.buffer = ""
        self.last_hora = None

    def feed(self, text):
        """Recebe um pedaço de texto da Serial e grava cada linha CSV completa."""
        self.buffer += text
        *complete, self.buffer = self.buffer.split("\n")
        for line in complete:
            fields = parse_board_line(line)
            if fields is not None:
                self.write(fields)

    def write(self, fields):
        moment = self.now()
        hora = moment.strftime("%H:%M:%S")
        # No máximo 1 linha por segundo (docs/decisions.md D18): a hora identifica a linha.
        # Duas linhas da placa no mesmo segundo do PC (atraso na USB): fica a primeira.
        if hora == self.last_hora:
            return
        try:
            ensure_daily_file(self.path, moment.strftime("%Y-%m-%d"))
            # Uma única escrita por linha, sempre com LF (newline="" evita \r\n no Windows).
            with open(self.path, "a", encoding="utf-8", newline="") as file:
                file.write(",".join([hora, "placa", *fields]) + "\n")
            self.last_hora = hora
        except OSError as error:
            self.warn(f"\n[gasguard] não foi possível gravar {self.path}: {error}\n")


class GasGuard(DeviceMonitorFilterBase):
    NAME = "gasguard"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.csv = GasGuardCsv()
        print(f"[gasguard] gravando as leituras em {self.csv.path}")

    def rx(self, text):
        try:
            self.csv.feed(text)
        except Exception as error:  # o Monitor nunca pode cair por causa do filtro
            print(f"\n[gasguard] erro no filtro: {error}\n")
        return text

    def tx(self, text):
        return text
