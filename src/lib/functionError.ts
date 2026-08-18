// Extracts a real error message from a failed supabase.functions.invoke()
// call. Duck-typed rather than `instanceof FunctionsHttpError && instanceof
// Response` — that instanceof-gated version was observed to silently fail
// on-device (falling through to the generic "Edge Function returned a
// non-2xx status code") even though it worked in a Node-based test against
// the same live endpoint. See docs/reports/05-farmer-signup.md's
// "Post-review fixes, round 3/4" for the full investigation.
export async function extractFunctionErrorMessage(error: unknown): Promise<string> {
  const context = (error as { context?: unknown } | undefined)?.context as
    | { text?: () => Promise<string>; status?: number }
    | undefined;

  if (context && typeof context.text === 'function') {
    try {
      const text = await context.text();
      try {
        const body = JSON.parse(text) as { error?: string };
        if (body.error) return body.error;
      } catch {
        if (text.trim()) return text.trim().slice(0, 200);
      }
    } catch (readErr) {
      console.error('extractFunctionErrorMessage: could not read response body', readErr);
    }
    if (typeof context.status === 'number') {
      return `Request failed (status ${context.status}). Try again.`;
    }
  }

  return error instanceof Error ? error.message : 'Something went wrong. Try again.';
}
