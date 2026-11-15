import assert from 'node:assert/strict'
import {
  clearPostAuthRedirect,
  consumePostAuthRedirect,
  markPostAuthRedirect,
} from './src/lib/auth.js'

function createStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}

const storage = createStorage()

markPostAuthRedirect(storage)
assert.equal(consumePostAuthRedirect(storage), true)
assert.equal(consumePostAuthRedirect(storage), false)

markPostAuthRedirect(storage)
clearPostAuthRedirect(storage)
assert.equal(consumePostAuthRedirect(storage), false)

console.log('Auth redirect intent tests passed')
