# TypeScript Monorepo Template

A modern TypeScript monorepo template built with pnpm workspaces, featuring multiple packages, examples, and comprehensive development tooling.

## 🏗️ Project Structure

```ini
├── packages/               # Core packages
│   ├── core/              # Core functionality
│   ├── utils/             # Utility functions // Not used yet
│   └── client/            # Client package that uses core & utils // Not used yet
├── examples/              # Usage examples
│   ├── basic/             # Basic usage example
│   └── advanced/          # Advanced usage example
├── docs/                  # Documentation
└── scripts/               # Development scripts
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18
- pnpm >= 8

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Start development mode
pnpm dev
```

### Running Examples

```bash
# Basic example
pnpm run examples:basic

# Or run directly with pnpm
pnpm -F basic-example start

# Knowledge base example
pnpm -F basic-example start:kb
```

## 📦 Packages

### @xpert-ai/core

Core functionality package providing base services and configuration.

### Assistant model selection

```ts
import { Client, type ChatSendRequest } from '@xpert-ai/xpert-sdk';

const client = new Client({
  apiUrl: 'https://your-xpert-host/api/ai',
  apiKey: process.env.XPERT_API_KEY,
});

const assistantId = 'your-assistant-id';
const catalog = await client.assistants.getModels(assistantId);
const selectedModel = catalog.models.find((model) => !model.disabled)?.id;

// Persist a cross-thread preference when the current principal supports it.
if (catalog.preference_persistable && selectedModel) {
  await client.assistants.setModelPreference(assistantId, selectedModel);
}

// An explicit run model applies to this run only and does not change preference.
const input: ChatSendRequest = {
  action: 'send',
  message: {
    input: {
      input: 'Summarize this document.',
      model: selectedModel,
    },
  },
};
await client.runs.create('thread-id', assistantId, { input });

// Restore the Assistant Primary model as the saved preference.
await client.assistants.setModelPreference(assistantId, null);
```

### Conversation resources and workspace connections

Use `client.assistants.getResources(assistantId, { projectId, search, kind, offset, limit, signal })`
to discover plugins, middleware, and published digital experts. Keep each resource's `bindingId`
and `version` together; the version pins what the conversation will use.

- For a new conversation, pass `{ revision: 0, resources }` as `runtimeResources` in the first
  message's `ChatRequestHuman` input. `assistants.validateResources` validates a selection without
  persisting it.
- For an existing conversation, read `conversations.getRuntimeResources(id)` and pass its current
  revision with the complete replacement set to `conversations.updateRuntimeResources(id, selection)`.
  An empty set clears resources. HTTP 409 requires reading the latest selection and reconciling the
  user's changes; do not blindly repeat a stale write.
- `assistants.authorizeResource(assistantId, { bindingId, version, serverName, projectId })` resolves
  a plugin component's workspace connection. Check the response discriminator: new servers return
  `type: 'connector'`, readiness, and an administrator management link when permitted. The SDK still
  accepts the legacy MCP OAuth response shape for older integrations.
- `connectors.runtimeOptions(assistantId, { projectId, includeWorkspace: true })` includes workspace
  connections alongside the authorized project scope. Entries with `runtimeUsage: 'credential'`
  supply plugin credentials and should not be listed as independent tools.
- `connectors.runtimeStatus(assistantId, bindingId)` reads readiness without starting OAuth or
  returning account credentials. Connection setup belongs to workspace administrators; calling
  users use the Assistant's shared connection rather than authorizing a personal account.

**Deploy the matching Xpert backend before upgrading the SDK.** Connector runtime reads now use
`/api/ai/assistants/:assistantId/connectors` and `/:bindingId/status` below that route. They do not
fall back to administrator APIs on 401, 403, or 404. Existing administrator methods continue to use
`/api/connector`; browser OAuth starts include credentials for callback-session binding.

## 🛠️ Development

### Commands

- `pnpm build` - Build all packages
- `pnpm test` - Run all tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Run tests with coverage
- `pnpm lint` - Lint all packages
- `pnpm lint:fix` - Fix linting issues
- `pnpm format` - Format code with Prettier
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm dev` - Start development mode (watch mode + tests)
- `pnpm clean` - Clean all build outputs

### Package Management

```bash
# Add dependency to a specific package
pnpm -F @xpert-ai/core add lodash

# Add dev dependency to root
pnpm add -D -w prettier

# Add workspace dependency
pnpm -F @xpert-ai/client add @xpert-ai/core
```

### Versioning & Publishing

This project uses [Changesets](https://github.com/changesets/changesets) for version management:

```bash
# Create a changeset
pnpm changeset

# Bump versions
pnpm bump-version

# Publish pending release versions
pnpm changeset publish
```

The GitHub Actions release workflow publishes to npm via trusted publishing (OIDC), so it does not require an `NPM_TOKEN` secret.

## 🧪 Testing

- **Framework**: [Vitest](https://vitest.dev/)
- **Coverage**: v8 provider
- **Config**: `vitest.config.ts`

Run tests:

```bash
pnpm test                    # Run all tests
pnpm test:watch              # Watch mode
pnpm test:coverage           # With coverage
pnpm -F @xpert-ai/core test     # Package-specific tests
```

## 🔧 Tools & Configuration

- **Package Manager**: pnpm with workspaces
- **Build System**: TypeScript with tsc-multi
- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier
- **Testing**: Vitest
- **Version Management**: Changesets
- **Git Hooks**: Husky

## 📁 File Structure Details

### Packages

Each package follows a consistent structure:

```ini
packages/[package-name]/
├── src/               # Source code
├── tests/             # Test files
├── dist/              # Build output (gitignored)
├── package.json       # Package configuration
└── tsconfig.json      # TypeScript configuration
```

### Configuration Files

- `pnpm-workspace.yaml` - Workspace configuration
- `tsconfig.json` - Root TypeScript config
- `tsc-multi.json` - Multi-package build configuration
- `eslint.config.mjs` - ESLint configuration
- `vitest.config.ts` - Test configuration
- `.prettierrc` - Code formatting rules

## 🌟 Features

- ✅ **Modern TypeScript** - Latest TypeScript with strict configuration
- ✅ **Monorepo Structure** - Multiple packages with shared tooling
- ✅ **Workspace Dependencies** - Internal package references with `workspace:^`
- ✅ **Dual Build Output** - Both CommonJS and ESM builds
- ✅ **Comprehensive Testing** - Unit tests with coverage reporting
- ✅ **Code Quality** - ESLint, Prettier, and type checking
- ✅ **Development Tools** - Watch mode, hot reload, and development scripts
- ✅ **Version Management** - Automated versioning and changelog generation
- ✅ **Examples & Documentation** - Real usage examples and comprehensive docs

## 🔄 Workflow

1. **Development**: Use `pnpm dev` for watch mode development
2. **Testing**: Write tests in `[package]/tests/` directories
3. **Building**: Run `pnpm build` to compile all packages
4. **Versioning**: Use `pnpm changeset` to document changes
5. **Publishing**: Merge the release PR and let GitHub Actions publish via npm trusted publishing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run `pnpm lint` and `pnpm test`
6. Create a changeset with `pnpm changeset`
7. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details.
