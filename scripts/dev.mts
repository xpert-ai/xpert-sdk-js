#!/usr/bin/env tsx

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

interface DevCommand {
  name: string;
  command: string;
  args: string[];
  color: string;
}

const commands: DevCommand[] = [
  {
    name: 'packages',
    command: 'pnpm',
    args: ['packages:dev'],
    color: '\x1b[36m', // Cyan
  },
  {
    name: 'tests',
    command: 'pnpm',
    args: ['test:watch'],
    color: '\x1b[33m', // Yellow
  },
];

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
};

function log(message: string, color: string = colors.reset): void {
  console.log(`${color}${message}${colors.reset}`);
}

function startCommand(cmd: DevCommand): void {
  log(`🚀 Starting ${cmd.name}...`, colors.green);
  
  const child = spawn(cmd.command, cmd.args, {
    cwd: rootDir,
    stdio: 'pipe',
    shell: true,
  });

  child.stdout?.on('data', (data: Buffer) => {
    const output = data.toString().trim();
    if (output) {
      log(`[${cmd.name}] ${output}`, cmd.color);
    }
  });

  child.stderr?.on('data', (data: Buffer) => {
    const output = data.toString().trim();
    if (output) {
      log(`[${cmd.name}] ${output}`, colors.red);
    }
  });

  child.on('exit', (code: number | null) => {
    log(`❌ ${cmd.name} exited with code ${code}`, colors.red);
  });
}

async function main(): Promise<void> {
  log('🔧 Starting development environment...', colors.bright);
  log('=====================================', colors.bright);

  // Start all commands
  commands.forEach(startCommand);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    log('\n🛑 Shutting down development environment...', colors.red);
    process.exit(0);
  });

  // Keep the process running
  process.stdin.resume();
}

main().catch(console.error);