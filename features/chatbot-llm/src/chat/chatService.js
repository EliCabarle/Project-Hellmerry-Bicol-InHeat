// Chat service seam. `send(text) -> Promise<{ text, done }>`. A future LLM
// adapter implements the same contract; streaming adapters yield
// `{ text, done: false }` chunks and finish with `{ text, done: true }`.
// @param {{ adapter?: { send: (text: string) => Promise<{ text: string, done: boolean }> } }} options
export function createChatService({ adapter } = {}) {
  const impl = adapter
  return {
    send: async (text) => {
      const result = await impl.send(text)
      return { text: String(result.text ?? ''), done: Boolean(result.done) }
    },
  }
}
