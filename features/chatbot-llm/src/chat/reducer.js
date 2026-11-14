import { appendMessage, makeMessage, updateMessage } from './messages.js'

export const initialState = {
  messages: [],
  status: 'idle', // 'idle' | 'sending' | 'error'
  error: null,
  lastAttempt: null, // text of the last in-flight user message, for retry
}

export function chatReducer(state, action) {
  switch (action.type) {
    case 'send': {
      const userMsg = makeMessage('user', action.text, { status: 'sent' })
      return {
        ...state,
        messages: appendMessage(state.messages, userMsg),
        status: 'sending',
        error: null,
        lastAttempt: action.text,
      }
    }
    case 'reply': {
      const assistantMsg = makeMessage('assistant', action.text, {
        status: 'sent',
        sources: action.sources,
      })
      return { ...state, messages: appendMessage(state.messages, assistantMsg), status: 'idle' }
    }
    case 'stream': {
      if (action.done) {
        const last = state.messages[state.messages.length - 1]
        if (last && last.role === 'assistant' && last.status === 'pending') {
          return {
            ...state,
            messages: updateMessage(state.messages, last.id, { text: action.text, status: 'sent' }),
            status: 'idle',
          }
        }
        return {
          ...state,
          messages: appendMessage(state.messages, makeMessage('assistant', action.text, { status: 'sent' })),
          status: 'idle',
        }
      }
      const last = state.messages[state.messages.length - 1]
      if (last && last.role === 'assistant' && last.status === 'pending') {
        return { ...state, messages: updateMessage(state.messages, last.id, { text: action.text }) }
      }
      return {
        ...state,
        messages: appendMessage(state.messages, makeMessage('assistant', action.text, { status: 'pending' })),
      }
    }
    case 'fail': {
      return { ...state, status: 'error', error: action.message }
    }
    case 'reset': {
      return initialState
    }
    default:
      return state
  }
}
