export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { auth } = await import("./services/auth/auth");
  const ctx = await auth.$context;
  await ctx.runMigrations();

  const { shouldStartAlertWatcher, startAlertWatcher } = await import(
    "./services/alerts/alert-watcher"
  );
  if (!shouldStartAlertWatcher()) return;
  startAlertWatcher();
}
