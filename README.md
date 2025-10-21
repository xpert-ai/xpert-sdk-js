# TypeScript Monorepo Template

A modern TypeScript monorepo template built with pnpm workspaces, featuring multiple packages, examples, and comprehensive development tooling.

## 🏗️ Project Structure

```
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
```

## 📦 Packages

### @xpert-ai/core
Core functionality package providing base services and configuration.

### @xpert-ai/utils  
Collection of utility functions for common operations like type checking, formatting, and async operations.

### @xpert-ai/client
Client package that demonstrates how to compose functionality from multiple packages within the monorepo.

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

# Publish to npm
pnpm ci:publish
```

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
```
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
5. **Publishing**: Run `pnpm ci:publish` to publish packages

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