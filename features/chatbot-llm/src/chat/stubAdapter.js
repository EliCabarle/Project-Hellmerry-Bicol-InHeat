// Stub chat adapter — the only "backend" the boilerplate chatbot talks to.
// Intentionally contains NO network primitives: no fetch, no XHR, no
// WebSocket, no URL config, no key. Swap this file (or the adapter passed to
// createChatService) for a real LLM integration when the backend is ready.
const PLACEHOLDER =
  "The chatbot isn't connected yet — narration ships as pre-written text. Ask again once the LLM adapter is wired."

export const stubAdapter = {
  /**
   * Simulates a short round-trip so the UI can exercise loading / typing
   * states. Always resolves the same placeholder reply.
   * @param {string} text
   * @returns {Promise<{ text: string, done: boolean }>}
   */
  send: async (_text) => {
    await new Promise((resolve) => setTimeout(resolve, 700))
    return { text: PLACEHOLDER, done: true }
  },
}

export default stubAdapter
