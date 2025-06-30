import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  sourcemap: true,
  clean: true,
  dts: true,
  bundle: true,
  external: [
    // CLI dependencies
    'commander',
    'inquirer',
    'ora',
    'chalk',
    'table',
    'terminal-link',
    
    // React/UI dependencies - only external react-devtools-core
    'react-devtools-core',
    
    // Node.js built-ins
    'punycode',
    'supports-color',
    'supports-hyperlinks',
    'os',
    'fs',
    'path',
    'url',
    'util',
    'crypto',
    'events',
    'stream',
    'buffer',
    'child_process',
    'perf_hooks',
    'readline',
    'process',
    'http',
    'https',
    'net',
    'tls',
    'zlib',
    'querystring',
    'string_decoder',
    'assert',
    'timers',
    'worker_threads',
    'cluster',
    'dgram',
    'dns',
    'domain',
    'module',
    'repl',
    'tty',
    'vm',
    'v8'
  ],
  noExternal: [
    '@anthropic-ai/sdk',
    'uuid',
    'node-fetch'
  ],
  onSuccess: 'chmod +x dist/cli.js'
}); 