#!/usr/bin/env node
/**
 * Pre-build script for Vibex
 * 
 * This script performs pre-build tasks to ensure proper bundling:
 * 1. Verifies the punycode wrapper is complete
 * 2. Creates temporary patches for dynamic require issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function log(message) {
  console.log(`[pre-build] ${message}`);
}

function error(message) {
  console.error(`[pre-build] ERROR: ${message}`);
  process.exit(1);
}

// Check for punycode wrapper completeness
function verifyPunycodeWrapper() {
  log('Verifying punycode wrapper...');
  
  const wrapperPath = path.join(rootDir, 'src', 'utils', 'punycode-wrapper.ts');
  
  if (!fs.existsSync(wrapperPath)) {
    error('Punycode wrapper not found! Cannot continue build process.');
  }
  
  const wrapperContent = fs.readFileSync(wrapperPath, 'utf-8');
  
  // Check for essential exports
  const requiredExports = ['decode', 'encode', 'toUnicode', 'toASCII', 'ucs2'];
  
  for (const exp of requiredExports) {
    if (!wrapperContent.includes(`export const ${exp}`)) {
      error(`Punycode wrapper is missing export for '${exp}'!`);
    }
  }
  
  log('✅ Punycode wrapper verified');
}

// Create alias directory if it doesn't exist
function ensureAliasDirectory() {
  const aliasDir = path.join(rootDir, 'src', 'alias');
  
  if (!fs.existsSync(aliasDir)) {
    log('Creating alias directory...');
    fs.mkdirSync(aliasDir, { recursive: true });
  }
  
  const punycodeAliasPath = path.join(aliasDir, 'punycode.js');
  
  if (!fs.existsSync(punycodeAliasPath)) {
    log('Creating punycode alias module...');
    fs.writeFileSync(
      punycodeAliasPath,
      `/**
 * Punycode alias module
 * 
 * This module serves as an alias entry point for punycode.
 * It directly exports our wrapper implementation.
 */

export * from '../utils/punycode-wrapper.js';
export { default } from '../utils/punycode-wrapper.js';`
    );
  }
  
  log('✅ Alias directory ready');
}

try {
  log('Running pre-build checks and preparations...');
  
  verifyPunycodeWrapper();
  ensureAliasDirectory();
  
  log('Pre-build completed successfully!');
} catch (err) {
  error(`Unexpected error: ${err.message}`);
}