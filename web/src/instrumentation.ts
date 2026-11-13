export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { shouldStartAlertWatcher, startAlertWatcher } = await import(
    "./services/alerts/alert-watcher"
  );
  if (!shouldStartAlertWatcher()) return;
  startAlertWatcher();
}
