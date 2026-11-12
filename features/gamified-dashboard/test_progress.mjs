// Run: node test_progress.mjs — Heat Points event-log check; fails on any assertion.
import test from 'node:test'
import { strict as assert } from 'node:assert/strict'
import {
  createProgress,
  derive,
  manilaDate,
  progressKey,
  recentDays,
  streakHp,
  STORAGE_KEY,
  HISTORY_DAYS,
} from './src/progressStore.js'

const assert2 = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exit(1)
  }
  console.log('ok:', msg)
}

function fakeStorage(raw = null) {
  const map = new Map()
  if (raw != null) map.set(STORAGE_KEY, raw)
  const state = { failWrites: false }
  return {
    get failWrites() {
      return state.failWrites
    },
    set failWrites(v) {
      state.failWrites = v
    },
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      if (state.failWrites) throw new Error('quota')
      map.set(k, v)
    },
    raw: () => map.get(STORAGE_KEY),
  }
}

// Noon Manila = 04:00Z, so one UTC day equals one Manila day.
const DAY0 = Date.UTC(2026, 0, 1, 4, 0, 0)
const atDay = (n) => new Date(DAY0 + n * 86400000)

function loginHpList(store) {
  return store.read().filter((e) => e.kind === 'login').map((e) => e.hp)
}

test('streak awards on consecutive days 1-10', () => {
  let now = atDay(0)
  const store = createProgress({ storage: fakeStorage(), now: () => now })
  const awarded = []
  for (let i = 0; i < 10; i += 1) {
    now = atDay(i)
    const r = store.checkIn()
    assert2(r.ok, `checkIn day ${i + 1} ok`)
    awarded.push(loginHpList(store).at(-1))
  }
  assert.deepEqual(awarded, [1, 2, 4, 8, 16, 32, 64, 64, 64, 64], 'awards = 1,2,4,8,16,32,64,64,64,64')
  assert.equal(awarded.length, 10, 'one login event per day')
  const d = derive(store.read(), manilaDate(atDay(9)))
  assert.equal(d.currentStreak, 10, 'current streak counts uncapped days')
  assert.equal(d.bestStreak, 10, 'best streak')
  assert.equal(d.totalHP, 1 + 2 + 4 + 8 + 16 + 32 + 64 * 4, 'total HP is the sum')
  assert2(d.loginToday?.day === 10 && d.loginToday.hp === 64, 'today login card: day 10, 64 HP')
  assert2(d.loginToday?.tomorrowHp === 64, 'tomorrow caps at 64')
})

test('missed calendar day resets streak to day 1', () => {
  let now = atDay(0)
  const store = createProgress({ storage: fakeStorage(), now: () => now })
  store.checkIn() // day 1
  now = atDay(1)
  store.checkIn() // day 2
  now = atDay(3) // day 3 missed
  const r = store.checkIn()
  assert2(r.ok, 'checkIn after gap ok')
  assert.equal(loginHpList(store).at(-1), 1, 'gap restarts at 1 HP')
  const d = derive(store.read(), manilaDate(atDay(3)))
  assert.equal(d.currentStreak, 1, 'current streak reset')
  assert.equal(d.bestStreak, 2, 'best streak keeps the old run')
})

test('same Manila day is a no-op; clock backwards is a no-op', () => {
  let now = atDay(0)
  const store = createProgress({ storage: fakeStorage(), now: () => now })
  store.checkIn()
  const after1 = store.read()
  const r2 = store.checkIn()
  assert2(r2.ok && r2.noop, 'second open same day reports noop')
  assert.equal(store.read().length, after1.length, 'no duplicate login on same day')
  now = atDay(-1) // clock moved backwards
  const r3 = store.checkIn()
  assert2(r3.ok && r3.noop, 'clock backwards reports noop')
  assert.equal(store.read().length, after1.length, 'clock backwards appends nothing')
})

test('Manila midnight boundary: 15:59Z is the old day, 16:00Z the new day', () => {
  assert.equal(manilaDate(new Date(Date.UTC(2026, 2, 9, 15, 59))), '2026-03-09', '15:59Z = 23:59 Manila')
  assert.equal(manilaDate(new Date(Date.UTC(2026, 2, 9, 16, 0))), '2026-03-10', '16:00Z = 00:00 Manila')
  let now = new Date(Date.UTC(2026, 2, 9, 15, 59))
  const store = createProgress({ storage: fakeStorage(), now: () => now })
  store.checkIn()
  assert.equal(store.read()[0].date, '2026-03-09', 'first check-in lands on 03-09')
  now = new Date(Date.UTC(2026, 2, 9, 16, 0))
  const r = store.checkIn()
  assert2(r.ok && !r.noop, '16:00Z opens a new Manila day')
  assert.equal(store.read().at(-1).date, '2026-03-10', 'second check-in lands on 03-10')
  assert.equal(store.read().at(-1).hp, 2, 'streak day 2 across the boundary')
})

test('once-per-day quest toggles to exactly one effective award', () => {
  let now = atDay(0)
  const store = createProgress({ storage: fakeStorage(), now: () => now })
  let r = store.toggleDaily('vegan')
  assert2(r.ok, 'first toggle awards')
  assert.equal(derive(store.read(), '2026-01-01').todayCounts.vegan, 1, 'active = 1')
  assert.equal(derive(store.read(), '2026-01-01').todayTotal, 16, '+16 HP')
  r = store.toggleDaily('vegan')
  assert2(r.ok, 'second toggle compensates')
  assert.equal(derive(store.read(), '2026-01-01').todayCounts.vegan, 0, 'active back to 0')
  assert.equal(derive(store.read(), '2026-01-01').todayTotal, 0, 'HP reversed, not negative')
  r = store.toggleDaily('vegan')
  assert.equal(derive(store.read(), '2026-01-01').todayCounts.vegan, 1, 'third toggle awards again')
  assert.equal(derive(store.read(), '2026-01-01').todayTotal, 16, 'never exceeds one effective award')
  const logins = store.read().filter((e) => e.kind === 'login').length
  assert2(logins === 0, 'store untouched by quest-only test')
})

test('unlimited quest counts up; undo reverses the latest active entry', () => {
  let now = atDay(0)
  const store = createProgress({ storage: fakeStorage(), now: () => now })
  store.addQuest('bottle')
  store.addQuest('bottle')
  store.addQuest('bottle')
  assert.equal(derive(store.read(), '2026-01-01').todayCounts.bottle, 3, 'count = 3')
  assert.equal(derive(store.read(), '2026-01-01').todayTotal, 15, '3 x 5 HP')
  let r = store.undoQuest('bottle')
  assert2(r.ok, 'undo ok')
  assert.equal(derive(store.read(), '2026-01-01').todayCounts.bottle, 2, 'count = 2 after undo')
  assert.equal(derive(store.read(), '2026-01-01').todayTotal, 10, 'HP reversed by 5')
  store.undoQuest('bottle')
  store.undoQuest('bottle')
  const total = derive(store.read(), '2026-01-01').todayTotal
  r = store.undoQuest('bottle')
  assert2(r.ok && r.noop, 'undo with nothing active is a noop')
  assert.equal(derive(store.read(), '2026-01-01').todayTotal, total, 'never goes negative')
  assert.equal(total, 0, 'back to zero')
  const comps = store.read().filter((e) => e.kind === 'quest' && e.hp < 0).length
  assert.equal(comps, 3, 'append-only: 3 awards + 3 compensations, nothing deleted')
})

test('undo is allowed only for today — past days stay immutable', () => {
  let now = atDay(0)
  const store = createProgress({ storage: fakeStorage(), now: () => now })
  store.addQuest('bottle') // awarded "yesterday" relative to the next step
  const frozen = store.read()
  now = atDay(1)
  const r = store.undoQuest('bottle')
  assert2(r.ok && r.noop, 'undo across days is a noop')
  assert.deepEqual(store.read(), frozen, 'log unchanged — yesterday not editable')
  assert.equal(derive(store.read(), '2026-01-02').todayTotal, 0, 'no accidental HP today')
  assert.equal(derive(store.read(), '2026-01-02').questStats.bottle.net, 1, 'yesterday award still active')
})

test('level boundaries 99/100/999/1000', () => {
  const ev = (hp) => [{ id: 'a', date: '2026-01-01', kind: 'login', hp, at: 0 }]
  assert.equal(derive(ev(99)).level, 1, '99 HP = level 1')
  assert.equal(derive(ev(100)).level, 2, '100 HP = level 2')
  assert.equal(derive(ev(999)).level, 10, '999 HP = level 10')
  assert.equal(derive(ev(1000)).level, 11, '1000 HP = level 11')
  assert.equal(derive(ev(99)).inLevel, 99, 'level 1 shows 99/100')
  assert.equal(derive(ev(100)).inLevel, 0, 'level 2 starts at 0/100')
  assert2(derive(ev(100)).bar === 0 && derive(ev(150)).bar === 0.5, 'bar = inLevel / 100')
})

test('title boundaries at levels 10/11, 20/21, 32/33, 64/65, 66/67, 67, 68, 69, 70, 100, 150', () => {
  const titleAt = (level) => derive([{ id: 'a', date: '2026-01-01', kind: 'login', hp: (level - 1) * 100, at: 0 }]).title
  const cases = [
    [10, 'novice eXplorer'],
    [11, 'Intermediate eXplorer'],
    [20, 'Intermediate eXplorer'],
    [21, 'Xperienced'],
    [32, 'Xperienced'],
    [33, "Rocky's Friend"],
    [64, "Rocky's Friend"],
    [65, 'Oragon!'],
    [66, 'Oragon!'],
    [67, 'Nice'],
    [68, "Mayon's confidant"],
    [69, 'Labuyo3000'],
    [70, 'Project HM-Certified!'],
    [100, 'Project HM-Certified!'],
    [150, 'Project HM-Certified!'],
  ]
  for (const [level, title] of cases) {
    assert.equal(titleAt(level), title, `level ${level} = "${title}"`)
  }
})

test('corrupt, missing and malformed storage reads as empty and recovers', () => {
  for (const raw of ['{not json', '{"v":2,"events":[]}', '{"v":1,"events":"nope"}', '[]', 'null']) {
    const store = createProgress({ storage: fakeStorage(raw), now: () => atDay(0) })
    assert.deepEqual(store.read(), [], `raw ${raw.slice(0, 12)} reads as empty`)
    const r = store.checkIn()
    assert2(r.ok, 'checkIn works on corrupt storage')
  }
  const partial = JSON.stringify({
    v: 1,
    events: [
      { id: 'ok', date: '2026-01-01', kind: 'login', hp: 5, at: 1 },
      { id: 'bad', date: 'junk', kind: 'login', hp: 'x', at: 1 },
      { kind: 'quest', date: '2026-01-01', hp: 3, at: 1 },
      42,
    ],
  })
  const store = createProgress({ storage: fakeStorage(partial), now: () => atDay(0) })
  assert.equal(store.read().length, 1, 'malformed entries filtered, valid ones kept')
  assert.equal(derive(store.read()).totalHP, 5, 'filtered log still derives')
})

test('derive does not mutate its input; failed writes are not presented as success', () => {
  const list = Object.freeze([
    Object.freeze({ id: 'a', date: '2026-01-01', kind: 'login', hp: 5, at: 1 }),
    Object.freeze({ id: 'b', date: '2026-01-01', kind: 'quest', questId: 'bottle', hp: 5, at: 2 }),
  ])
  const before = JSON.stringify(list)
  const d = derive(list, '2026-01-01')
  assert.equal(JSON.stringify(list), before, 'input log untouched')
  assert.equal(d.totalHP, 10, 'derived from frozen input')

  const storage = fakeStorage()
  storage.setItem = () => {
    throw new Error('quota exceeded')
  }
  const store = createProgress({ storage, now: () => atDay(0) })
  const r = store.toggleDaily('vegan')
  assert2(r.ok === false, 'failed write reports ok:false')
  assert2(typeof r.error === 'string' && r.error.length > 0, 'failed write carries an error message')
  assert.equal(store.read().length, 0, 'unpersisted event is not kept as if saved')
  const c = store.checkIn()
  assert2(c.ok === false, 'failed check-in also reports failure')
  assert.equal(store.read().length, 0, 'no phantom login after failed write')
})

test('HP snapshot survives a config change', () => {
  const storage = fakeStorage()
  const questsA = [{ id: 'vegan', label: 'Went Vegan', hp: 16, limit: 'daily' }]
  const storeA = createProgress({ storage, now: () => atDay(0), quests: questsA })
  storeA.toggleDaily('vegan')
  assert.equal(derive(storeA.read()).totalHP, 16, 'awarded 16 under config A')

  const questsB = [{ id: 'vegan', label: 'Went Vegan', hp: 99, limit: 'daily' }]
  const storeB = createProgress({ storage, now: () => atDay(0), quests: questsB })
  assert.equal(derive(storeB.read()).totalHP, 16, 'config change does not rewrite history')
  assert.equal(derive(storeB.read()).level, 1, 'level still derived from 16 HP')
  storeB.toggleDaily('vegan')
  assert.equal(derive(storeB.read()).totalHP, 0, 'compensation uses the snapshot (−16), not −99')
})

test('recentDays includes every day, zeros included', () => {
  const days = recentDays('2026-01-10', HISTORY_DAYS)
  assert.equal(days.length, 30, '30 days')
  assert.equal(days[0], '2025-12-12', 'oldest first, 29 days before today')
  assert.equal(days.at(-1), '2026-01-10', 'ends today')
  const d = derive([], '2026-01-10')
  for (const day of days) assert.equal(d.dayTotals[day] ?? 0, 0, `${day} reads as zero`)
})

test('streakHp helper caps at day 7', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9].map(streakHp), [1, 2, 4, 8, 16, 32, 64, 64, 64], 'cap 64')
})

test('progress keys are per account — two users never share HP', () => {
  const storage = fakeStorage()
  const now = () => atDay(0)

  // Guests keep the original key: whatever is already on a device stays readable.
  assert2(createProgress({ storage }).key === STORAGE_KEY, 'guest uses the legacy key')
  assert2(createProgress({ storage, userId: 'u1' }).key === `${STORAGE_KEY}.u1`, 'account key is namespaced')
  assert2(progressKey('u1') !== progressKey('u2'), 'two accounts never collide')

  // Same storage, two accounts: each reads only its own log, so a leaderboard push
  // can never carry one account's HP into the other's score.
  const a = createProgress({ storage, userId: 'u1', now })
  const b = createProgress({ storage, userId: 'u2', now })
  a.toggleDaily('vegan')
  assert.equal(derive(a.read()).totalHP, 16, 'account A keeps its own 16 HP')
  assert.equal(derive(b.read()).totalHP, 0, 'account B does not inherit A')
  b.toggleDaily('vegan')
  assert.equal(derive(a.read()).totalHP, 16, 'B writing does not disturb A')
})

test('restoreTo adopts a stored score exactly once and never lowers HP', () => {
  const store = createProgress({ storage: fakeStorage(), userId: 'u1', now: () => atDay(0) })

  // Fresh browser, existing account: the score read on sign-in becomes local HP.
  const first = store.restoreTo(250)
  assert.equal(first.ok, true, 'restore saved')
  assert.equal(derive(store.read()).totalHP, 250, 'local HP equals the stored score')

  // Sign-in runs again (remount, token refresh): must not stack a second copy.
  assert.equal(store.restoreTo(250).noop, true, 'same score is a no-op')
  assert.equal(derive(store.read()).totalHP, 250, 'still 250, not 500')

  // A device that is already ahead is left alone — restore never subtracts.
  assert.equal(store.restoreTo(100).noop, true, 'lower target is a no-op')
  assert.equal(derive(store.read()).totalHP, 250, 'HP never lowered')
})

test('restored HP counts toward level but not toward "earned today"', () => {
  const store = createProgress({ storage: fakeStorage(), userId: 'u1', now: () => atDay(0) })
  store.restoreTo(400)
  const d = derive(store.read(), manilaDate(atDay(0)))
  assert.equal(d.totalHP, 400, 'total includes the restored HP')
  assert.equal(d.level, 5, 'level follows the total')
  assert.equal(d.todayTotal, 0, 'nothing was earned today')
  assert.equal(d.activeDays, 0, 'no fake bar in History')
  assert.equal(d.currentStreak, 0, 'restore is not a login')
  assert.deepEqual(d.todayCounts, {}, 'restore is not a quest count')
})

test('restoreTo refuses a negative or missing target instead of writing junk', () => {
  const store = createProgress({ storage: fakeStorage(), userId: 'u1', now: () => atDay(0) })
  assert.equal(store.restoreTo(-10).noop, true, 'negative target is ignored')
  assert.equal(store.restoreTo(null).noop, true, 'null target is ignored')
  assert.equal(store.read().length, 0, 'no event written')
})
