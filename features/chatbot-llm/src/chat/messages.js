// Typed message model for the chatbot. JSDoc-only typing — ready for a
// streaming LLM adapter to replace the stub without touching this file.
/**
 * @typedef {object} Message
 * @property {string} id
 * @property {'user' | 'assistant' | 'system'} role
 * @property {string} text
 * @property {'pending' | 'sent' | 'failed'} status
 * @property {number} createdAt
 */

let msgSeq = 0

/**
 * @param {'user' | 'assistant' | 'system'} role
 * @param {string} text
 * @param {{ status?: 'pending' | 'sent' | 'failed' }} opts
 * @returns {Message}
 */
export function makeMessage(role, text, { status = 'sent' } = {}) {
  return {
    id: `msg-${Date.now()}-${msgSeq += 1}`,
    role,
    text,
    status,
    createdAt: Date.now(),
  }
}

/**
 * Immutable append helper.
 * @param {Message[]} messages
 * @param {Message} message
 * @returns {Message[]}
 */
export function appendMessage(messages, message) {
  return [...messages, message]
}

/**
 * Immutable update helper (used for streaming chunks and status flips).
 * @param {Message[]} messages
 * @param {string} id
 * @param {Partial<Message>} patch
 * @returns {Message[]}
 */
export function updateMessage(messages, id, patch) {
  return messages.map((m) => (m.id === id ? { ...m, ...patch } : m))
}
