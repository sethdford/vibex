import * as esbuild from 'esbuild';
import { writeFileSync, mkdirSync } from 'fs';
import { exec } from 'child_process';

async function build() {
  try {
    // Ensure dist directory exists
    mkdirSync('./dist', { recursive: true });
    
    console.log('Building with esbuild...');
    
    const result = await esbuild.build({
      entryPoints: ['src/cli.ts'],
      bundle: true,
      platform: 'node',
      target: ['node18'],
      format: 'cjs',  // Change to CommonJS format
      outfile: 'dist/cli.js',
      sourcemap: true,
      minify: false,
      banner: {
        js: '#!/usr/bin/env node\n',
      },
      external: [
        // External packages
        'commander',
        'inquirer',
        'ora',
        'chalk',
        'table',
        'open',
        'terminal-link',
        'react-devtools-core',
        'punycode',
        
        // Node built-ins that should remain external
        'fs',
        'path',
        'os',
        'child_process',
        'http',
        'https',
        'crypto',
      ],
      write: true,
    });
    
    // Set the executable permissions
    console.log('Setting executable permissions...');
    exec('chmod +x dist/cli.js', (err) => {
      if (err) {
        console.error('Error setting permissions:', err);
      } else {
        console.log('Build completed successfully!');
      }
    });
    
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();