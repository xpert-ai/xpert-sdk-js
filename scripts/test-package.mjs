// A fresh production consumer catches declaration/exports gaps hidden by workspace dependencies and skipLibCheck.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'xpert-sdk-package-'));
try {
  const core = path.join(root, 'packages/core');
  const manifest = JSON.parse(fs.readFileSync(path.join(core, 'package.json')));
  const run = (args, cwd = output) =>
    execFileSync('corepack', ['pnpm', ...args], {
      cwd,
      stdio: 'inherit',
      env: { ...process.env, CI: 'true' },
    });
  run(['pack', '--pack-destination', output], core);
  const tarball = path.join(
    output,
    `${manifest.name.replace('@', '').replace('/', '-')}-${manifest.version}.tgz`
  );
  fs.writeFileSync(
    path.join(output, 'package.json'),
    JSON.stringify({
      name: 'sdk-package-consumer',
      private: true,
      type: 'module',
      packageManager: 'pnpm@10.18.3',
      dependencies: { '@xpert-ai/xpert-sdk': `file:${tarball}` },
      devDependencies: {
        typescript: require('typescript/package.json').version,
        '@types/node': require('@types/node/package.json').version,
      },
    })
  );
  for (const file of ['contract.ts', 'runtime.mjs'])
    fs.copyFileSync(path.join(root, 'scripts/package-consumer', file), path.join(output, file));
  fs.writeFileSync(
    path.join(output, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        strict: true,
        skipLibCheck: false,
        noEmit: true,
      },
      include: ['contract.ts'],
    })
  );
  run(['install', '--lockfile-only', '--ignore-scripts']);
  run(['install', '--frozen-lockfile', '--ignore-scripts']);
  run(['exec', 'tsc']);
  run(['exec', 'node', 'runtime.mjs']);
} finally {
  fs.rmSync(output, { recursive: true, force: true });
}
