# Env Contract

Validate `.env` files against a tiny, readable environment contract.

## Why

Environment variables tend to fail late: in CI, staging, or production boot. Env Contract gives teams a small contract file that can be checked locally and in CI without bringing in a framework.

## Contract format

```text
DATABASE_URL type=url required=true
PORT type=integer default=3000
NODE_ENV values=development,test,production
SENTRY_DSN? type=url
```

Use `?` after the variable name for optional values.

## CLI

```bash
npx env-contract --contract env.contract --env .env
```

JSON output:

```bash
npx env-contract --json
```

## Library

```ts
import { parseContract, parseEnv, validateEnv } from 'env-contract'

const result = validateEnv(parseContract(contractText), parseEnv(envText))
```

## Supported types

- `string`
- `number`
- `integer`
- `boolean`
- `url`
- `email`
- `enum` through `values=a,b,c`

## Development

```bash
npm install
npm test
```
