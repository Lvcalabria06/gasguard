export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-between px-4 py-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">GasGuard</h1>
        <p className="text-muted-foreground">Painel em construção.</p>
      </div>
      <footer className="text-xs text-muted-foreground">
        Protótipo acadêmico — Sistemas Embarcados, CESAR School 2026. Não é um detector certificado.
      </footer>
    </main>
  );
}
