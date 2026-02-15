<div align="center">

# openclaw-revisium

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=revisium_openclaw-revisium&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=revisium_openclaw-revisium)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=revisium_openclaw-revisium&metric=coverage)](https://sonarcloud.io/summary/new_code?id=revisium_openclaw-revisium)
[![GitHub License](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/revisium/openclaw-revisium/blob/master/LICENSE)
[![GitHub Release](https://img.shields.io/github/v/release/revisium/openclaw-revisium)](https://github.com/revisium/openclaw-revisium/releases)

[OpenClaw](https://github.com/openclaw/openclaw) memory plugin backed by [Revisium](https://revisium.io) — structured, versioned agent memory.

</div>

## Features

- **Structured memory** — store facts, decisions, and context as typed rows in tables
- **Version control** — commit, rollback, and view history of memory changes
- **Branching** — create branches for A/B testing agent configurations
- **Human review** — inspect and approve memory changes via Revisium Admin UI
- **Search** — filter and query memory entries by field values

## Installation

```bash
npm install openclaw-revisium
```

## Quick Start

```typescript
import { register } from 'openclaw-revisium';

register({
  getConfig: () => ({
    url: 'http://localhost:8080',
    token: 'your-jwt-token',
    organizationId: 'my-org',
    projectName: 'agent-memory',
    branchName: 'master',
  }),
  registerTool: (tool) => {
    // register tool with your agent framework
  },
});
```

## Tools

| Tool | Description |
|------|-------------|
| `memory_store` | Store, update, or delete a memory entry in a table |
| `memory_search` | Search memory entries with field filtering, sorting, and pagination |
| `memory_commit` | Commit all pending changes to create a new immutable revision |
| `memory_rollback` | Discard all uncommitted changes, reverting to last committed state |
| `memory_history` | List revision history for the current branch |
| `memory_branch` | List, create, or switch branches |
| `memory_config` | View current plugin configuration |

### memory_store

```typescript
// Create or update an entry
await memory_store({
  table: 'facts',
  id: 'user-preference-theme',
  data: { topic: 'preferences', content: 'User prefers dark theme', confidence: 0.95 },
});

// Delete an entry
await memory_store({ table: 'facts', id: 'old-fact', operation: 'delete' });
```

### memory_search

```typescript
// Search by field value (string contains)
await memory_search({
  table: 'facts',
  filter: { path: 'topic', value: 'preferences' },
  limit: 20,
});

// Full-text search
await memory_search({ table: 'facts', query: 'dark theme' });
```

### memory_commit / memory_rollback

```typescript
// Commit pending changes
await memory_commit({ message: 'Updated user preferences' });

// Discard uncommitted changes
await memory_rollback({});
```

### memory_branch

```typescript
// List branches
await memory_branch({ operation: 'list' });

// Create a branch from current head
await memory_branch({ operation: 'create', name: 'experiment-v2' });

// Switch to another branch
await memory_branch({ operation: 'switch', name: 'experiment-v2' });
```

## Configuration

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `url` | string | yes | Revisium server URL |
| `token` | string | no | JWT access token |
| `organizationId` | string | yes | Organization ID |
| `projectName` | string | yes | Project name |
| `branchName` | string | no | Branch name (default: `master`) |
| `autoCommit` | boolean | no | Auto-commit after each mutation (default: `false`) |

## Development

```bash
npm install
npm run tsc          # TypeScript check
npm run lint:ci      # ESLint
npm test             # Unit tests
npm run build        # Build CJS + ESM + .d.ts
```

### Integration tests

```bash
npm run test:integration:up    # Start Revisium standalone
npm run test:integration       # Run integration tests
npm run test:integration:down  # Stop Revisium
```

## License

MIT
