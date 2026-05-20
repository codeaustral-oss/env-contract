#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { parseContract, parseEnv, validateEnv } from './index.js'

type Args = {
  contract: string
  env: string
  json: boolean
  help: boolean
}

function parseArgs(argv: string[]): Args {
  const args: Args = { contract: 'env.contract', env: '.env', json: false, help: false }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--help' || arg === '-h') args.help = true
    else if (arg === '--contract') args.contract = argv[++index] ?? args.contract
    else if (arg === '--env') args.env = argv[++index] ?? args.env
    else if (arg === '--json') args.json = true
  }
  return args
}

function help(): void {
  console.log(`env-contract [--contract env.contract] [--env .env] [--json]

Contract syntax:
  DATABASE_URL type=url required=true
  PORT type=integer default=3000
  NODE_ENV values=development,test,production
  SENTRY_DSN? type=url`)
}

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  help()
  process.exit(0)
}

const rules = parseContract(readFileSync(args.contract, 'utf8'))
const env = parseEnv(readFileSync(args.env, 'utf8'))
const result = validateEnv(rules, env)

if (args.json) {
  console.log(JSON.stringify(result, null, 2))
} else if (result.ok) {
  console.log(`OK: checked ${result.checked} env contract rules`)
  for (const issue of result.issues.filter((issue) => issue.level === 'warning')) {
    console.log(`warning ${issue.name}: ${issue.message}`)
  }
} else {
  for (const issue of result.issues) {
    console.log(`${issue.level} ${issue.name}: ${issue.message}`)
  }
}

process.exit(result.ok ? 0 : 1)
