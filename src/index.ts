export type EnvType = 'string' | 'number' | 'integer' | 'boolean' | 'url' | 'email' | 'enum'

export type EnvRule = {
  name: string
  type: EnvType
  required: boolean
  values?: string[]
  default?: string
  description?: string
}

export type EnvIssue = {
  name: string
  level: 'error' | 'warning'
  message: string
}

export type EnvValidationResult = {
  ok: boolean
  issues: EnvIssue[]
  checked: number
}

export function parseContract(input: string): EnvRule[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map(parseRuleLine)
}

export function parseEnv(input: string): Record<string, string> {
  const values: Record<string, string> = {}
  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line)
    if (!match) continue
    const key = match[1]
    const rawValue = match[2] ?? ''
    if (!key) continue
    values[key] = unquote(rawValue ?? '')
  }
  return values
}

export function validateEnv(rules: EnvRule[], env: Record<string, string>): EnvValidationResult {
  const issues: EnvIssue[] = []

  for (const rule of rules) {
    const value = env[rule.name] ?? rule.default
    if ((value === undefined || value === '') && rule.required) {
      issues.push({ name: rule.name, level: 'error', message: 'required variable is missing' })
      continue
    }

    if (value === undefined || value === '') {
      continue
    }

    const message = validateValue(rule, value)
    if (message) {
      issues.push({ name: rule.name, level: 'error', message })
    }
  }

  const known = new Set(rules.map((rule) => rule.name))
  for (const key of Object.keys(env)) {
    if (!known.has(key)) {
      issues.push({ name: key, level: 'warning', message: 'variable is not declared in the contract' })
    }
  }

  return {
    ok: issues.every((issue) => issue.level !== 'error'),
    issues,
    checked: rules.length,
  }
}

function parseRuleLine(line: string): EnvRule {
  const [namePart, ...tokens] = line.split(/\s+/)
  if (!namePart) {
    throw new Error('Contract line is missing a variable name')
  }

  const name = namePart.replace(/\?$/, '')
  const optionalByName = namePart.endsWith('?')
  const rule: EnvRule = {
    name,
    type: 'string',
    required: !optionalByName,
  }

  for (const token of tokens) {
    const equalIndex = token.indexOf('=')
    const key = equalIndex === -1 ? token : token.slice(0, equalIndex)
    const rawValue = equalIndex === -1 ? '' : token.slice(equalIndex + 1)
    if (!key) continue
    if (key === 'required') rule.required = rawValue !== 'false'
    else if (key === 'type') rule.type = parseType(rawValue)
    else if (key === 'values') {
      rule.type = 'enum'
      rule.values = rawValue.split(',').map((value) => value.trim()).filter(Boolean)
    } else if (key === 'default') rule.default = rawValue
    else if (key === 'description') rule.description = rawValue.replace(/_/g, ' ')
  }

  return rule
}

function parseType(value: string): EnvType {
  const allowed: EnvType[] = ['string', 'number', 'integer', 'boolean', 'url', 'email', 'enum']
  if (!allowed.includes(value as EnvType)) {
    throw new Error(`Unsupported env type: ${value}`)
  }
  return value as EnvType
}

function validateValue(rule: EnvRule, value: string): string | undefined {
  if (rule.type === 'number' && Number.isNaN(Number(value))) return 'expected a number'
  if (rule.type === 'integer' && !/^-?\d+$/.test(value)) return 'expected an integer'
  if (rule.type === 'boolean' && !/^(true|false|1|0|yes|no)$/i.test(value)) return 'expected a boolean'
  if (rule.type === 'url' && !isUrl(value)) return 'expected a valid URL'
  if (rule.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'expected a valid email'
  if (rule.type === 'enum' && rule.values?.length && !rule.values.includes(value)) {
    return `expected one of: ${rule.values.join(', ')}`
  }
  return undefined
}

function isUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function unquote(value: string): string {
  const trimmed = value.trim()
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}
