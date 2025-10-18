#!/bin/bash

set -e

echo "🚀 Initializing TypeScript Monorepo Template..."
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ pnpm is not installed. Please install it first:${NC}"
    echo "npm install -g pnpm"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version 18+ required. Current version: $(node --version)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
pnpm install

# Build packages
echo -e "${BLUE}🔨 Building packages...${NC}"
pnpm build

# Run tests
echo -e "${BLUE}🧪 Running tests...${NC}"
pnpm test

# Initialize git repository if not exists
if [ ! -d ".git" ]; then
    echo -e "${BLUE}🔧 Initializing git repository...${NC}"
    git init
    git add .
    git commit -m "feat: initial commit - typescript monorepo template"
fi

# Initialize changesets
echo -e "${BLUE}📝 Initializing changesets...${NC}"
pnpm changeset init

echo -e "${GREEN}✅ Setup completed successfully!${NC}"
echo ""
echo -e "${YELLOW}📋 Available commands:${NC}"
echo "  pnpm dev              - Start development mode"
echo "  pnpm build            - Build all packages"
echo "  pnpm test             - Run tests"
echo "  pnpm lint             - Lint code"
echo "  pnpm examples:basic   - Run basic example"
echo ""
echo -e "${GREEN}🎉 Your TypeScript monorepo is ready to use!${NC}"