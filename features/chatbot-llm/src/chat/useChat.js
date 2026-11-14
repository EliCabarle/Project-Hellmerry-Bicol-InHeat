import { useCallback, useReducer, useRef, useState } from 'react'
import { chatReducer, initialState } from './reducer.js'
import { createChatService } from './chatService.js'

/**
 * Chat state machine. Typed message models + state handling ready for
 * streaming (the `stream` action accepts `{ done }` chunks).
 * @param {{ adapter?: any }} options
 */
export function useChat({ adapter } = {}) {
  const serviceRef = useRef(createChatService({ adapter }))
  const [state, dispatch] = useReducer(chatReducer, initialState)
  const [input, setInput] = useState('')

  const send = useCallback(
    async (text) => {
      const trimmed = text.trim()
      if (!trimmed) return
      dispatch({ type: 'send', text: trimmed })
      try {
        const { text: reply, done, sources } = await serviceRef.current.send(trimmed)
        if (done) dispatch({ type: 'reply', text: reply, sources })
      } catch (err) {
        dispatch({ type: 'fail', message: err.message ?? 'The chatbot could not reply.' })
      }
    },
    [],
  )

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault()
      if (!input.trim() || state.status === 'sending') return
      send(input)
    },
    [input, send, state.status],
  )

  const retry = useCallback(() => {
    if (!state.lastAttempt) return
    dispatch({ type: 'send', text: state.lastAttempt })
    send(state.lastAttempt)
  }, [state.lastAttempt, send])

  const clear = useCallback(() => dispatch({ type: 'reset' }), [])

  return {
    messages: state.messages,
    status: state.status,
    error: state.error,
    input,
    setInput,
    send,
    handleSubmit,
    retry,
    clear,
  }
}

export { chatReducer, initialState }
