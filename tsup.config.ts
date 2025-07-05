import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  dts: false,
  splitting: true,
  sourcemap: true,
  clean: true,
  target: 'node18',
  external: [
    'agentkeepalive',
    'punycode', // Treat the punycode package as external
    'axios' // External dependency for web search
  ],
  banner: {
    js: `
// Vibex CLI - AI-Powered Development Assistant
// Built with tsup - High performance TypeScript bundler
`
  },
  onSuccess: async () => {
    // Make the CLI executable
    const { exec } = await import('child_process');
    exec('chmod +x dist/cli.js');
    console.log('✅ Build completed successfully');
  }
});