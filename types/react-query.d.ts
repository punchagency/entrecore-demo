import "@tanstack/react-query";

/** Per-query/mutation error handling switches, read by the caches in app/providers.tsx (EP-1004). */
interface ErrorHandlingMeta extends Record<string, unknown> {
  /** Never toast this failure globally, e.g. because the screen already shows a field error. */
  skipErrorToast?: boolean;
  /** Queries only: toast a load failure. For screens with no error slot; others show QueryErrorState. */
  toastOnError?: boolean;
  /** Toast text when the API gives no message, e.g. "Failed to delete rule". */
  errorMessage?: string;
}

declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: ErrorHandlingMeta;
    mutationMeta: ErrorHandlingMeta;
  }
}
