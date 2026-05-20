import assert from 'node:assert/strict'
import test from 'node:test'
import { parseContract, parseEnv, validateEnv } from '../dist/index.js'

test('validates env files against a contract', () => {
  const rules = parseContract(`
    DATABASE_URL type=url
    PORT type=integer default=3000
    NODE_ENV values=development,test,production
    SENTRY_DSN? type=url
  `)
  const env = parseEnv(`
    DATABASE_URL=https://example.com/db
    NODE_ENV=production
  `)

  assert.deepEqual(validateEnv(rules, env), { ok: true, issues: [], checked: 4 })
})

test('reports missing and invalid variables', () => {
  const rules = parseContract('API_URL type=url\nWORKERS type=integer')
  const env = parseEnv('API_URL=not-a-url\nEXTRA=value')
  const result = validateEnv(rules, env)

  assert.equal(result.ok, false)
  assert.equal(result.issues.some((issue) => issue.name === 'API_URL'), true)
  assert.equal(result.issues.some((issue) => issue.name === 'WORKERS'), true)
  assert.equal(result.issues.some((issue) => issue.name === 'EXTRA' && issue.level === 'warning'), true)
})
