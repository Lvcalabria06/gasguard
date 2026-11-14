const DUPLICATE_CODES = new Set([
  "USER_ALREADY_EXISTS",
  "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
]);

export function signupErrorMessage(error: unknown): string {
  const code =
    error &&
    typeof error === "object" &&
    "body" in error &&
    error.body &&
    typeof error.body === "object" &&
    "code" in error.body &&
    typeof (error.body as { code: unknown }).code === "string"
      ? (error.body as { code: string }).code
      : null;

  if (code && DUPLICATE_CODES.has(code)) {
    return "E-mail já cadastrado.";
  }
  return "Não foi possível criar a conta.";
}
