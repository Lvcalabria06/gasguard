# hooks

Estado no cliente. `useReadings()` abre o EventSource, guarda as leituras, deriva os eventos e o status da conexão (ao vivo / reconectando / sem dados após 5 s). Não importa `lib/report`. Implementação: Etapa 3 do roadmap.
