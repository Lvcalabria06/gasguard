export interface ScenarioCopy {
  id: number;
  title: string;
  guidance: string;
}

const UNKNOWN_TITLE = "Cenário desconhecido";
const UNKNOWN_GUIDANCE = "—";

const SCENARIOS: readonly ScenarioCopy[] = [
  { id: 0, title: "Ambiente normal", guidance: "—" },
  {
    id: 1,
    title: "Alto risco de incêndio pela chama e pelo vazamento de gás",
    guidance:
      "Não acione interruptores, feche o registro de gás se for seguro, ventile e saia do local.",
  },
  {
    id: 2,
    title: "Alto risco de incêndio: chama com gases ou fumaça no ambiente",
    guidance:
      "Verifique a origem da chama e da fumaça, ventile e afaste materiais inflamáveis.",
  },
  {
    id: 3,
    title: "Alto risco: vazamento de gás com aumento de temperatura",
    guidance: "Feche o registro de gás, ventile e afaste fontes de calor.",
  },
  {
    id: 4,
    title: "Alto risco: vazamento confirmado pelos dois sensores (MQ-6 e MQ-2)",
    guidance: "Feche o registro de gás, abra portas e janelas e não acenda chamas.",
  },
  {
    id: 5,
    title: "Alto risco: vazamento de gás com fogão ligado e sem supervisão",
    guidance: "Feche o registro de gás e verifique a cozinha imediatamente.",
  },
  {
    id: 6,
    title: "Alto risco: chama com o fogão desligado e temperatura subindo",
    guidance: "Verifique imediatamente a origem da chama.",
  },
  {
    id: 7,
    title: "Vazamento de gás detectado (MQ-6)",
    guidance: "Feche o registro de gás, ventile o ambiente e não acenda chamas.",
  },
  {
    id: 8,
    title: "Concentração alta de gases ou fumaça (MQ-2)",
    guidance: "Ventile o ambiente e verifique a origem dos gases ou da fumaça.",
  },
  {
    id: 9,
    title: "Fogão ligado sem supervisão: nenhum movimento há muito tempo",
    guidance: "Verifique se há alguém na cozinha ou desligue o fogão.",
  },
  {
    id: 10,
    title: "Possível vazamento de gás: MQ-6 acima do normal",
    guidance: "Verifique o ambiente.",
  },
  {
    id: 11,
    title: "Gases ou fumaça acima do normal (MQ-2)",
    guidance: "Verifique o ambiente.",
  },
  {
    id: 12,
    title: "Fogão ligado sem chama: possível boca apagada",
    guidance: "Verifique o fogão.",
  },
  {
    id: 13,
    title: "Fogão ligado e sem movimento recente: possível ausência",
    guidance: "Confirme se há alguém na cozinha.",
  },
  {
    id: 14,
    title: "Chama detectada com o fogão desligado",
    guidance: "Verifique a origem da chama.",
  },
  {
    id: 15,
    title: "Temperatura acima do normal",
    guidance: "Verifique o ambiente.",
  },
  {
    id: 16,
    title: "Falha no sensor de temperatura: monitoramento comprometido",
    guidance: "Confira a ligação do sensor.",
  },
  { id: 17, title: "Fogão em uso com supervisão", guidance: "—" },
];

export function getScenario(id: number): ScenarioCopy {
  return SCENARIOS[id] ?? { id, title: UNKNOWN_TITLE, guidance: UNKNOWN_GUIDANCE };
}
