#!/usr/bin/env node

/**
 * Vibex Post-Install Script
 * 
 * This script runs after npm install to set up the Vibex CLI properly.
 * It creates necessary directories and displays installation success message.
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const VIBEX_DIR = path.join(os.homedir(), '.vibex');
const CONFIG_DIR = path.join(VIBEX_DIR, 'config');
const HISTORY_DIR = path.join(VIBEX_DIR, 'history');
const SCREENSHOTS_DIR = path.join(VIBEX_DIR, 'screenshots');
const LOGS_DIR = path.join(VIBEX_DIR, 'logs');

async function createDirectories() {
  try {
    await fs.mkdir(VIBEX_DIR, { recursive: true });
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    await fs.mkdir(HISTORY_DIR, { recursive: true });
    await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
    await fs.mkdir(LOGS_DIR, { recursive: true });
    
    console.log('✅ Vibex directories created successfully');
  } catch (error) {
    console.warn('⚠️  Could not create Vibex directories:', error.message);
  }
}

async function createDefaultConfig() {
  const configPath = path.join(CONFIG_DIR, 'config.json');
  
  try {
    // Check if config already exists
    await fs.access(configPath);
    return; // Config exists, don't overwrite
  } catch {
    // Config doesn't exist, create default
  }
  
  const defaultConfig = {
    "api": {
      "baseUrl": "https://api.anthropic.com",
      "version": "2023-06-01",
      "maxTokens": 4096,
      "timeout": 30000
    },
    "ui": {
      "theme": "auto",
      "animations": true,
      "colors": true
    },
    "logger": {
      "level": "info",
      "file": true
    },
    "telemetry": {
      "enabled": false,
      "anonymous": true
    },
    "history": {
      "enabled": true,
      "maxSessions": 100,
      "maxAgeInDays": 30
    }
  };
  
  try {
    await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
    console.log('✅ Default configuration created');
  } catch (error) {
    console.warn('⚠️  Could not create default configuration:', error.message);
  }
}

async function displayWelcomeMessage() {
  console.log('\n🚀 Vibex CLI installed successfully!\n');
  console.log('Getting started:');
  console.log('  1. Run: vibex --help');
  console.log('  2. Authenticate: vibex chat, then use /login');
  console.log('  3. Start coding: vibex chat\n');
  console.log('Features:');
  console.log('  • AI-powered code assistance');
  console.log('  • Code explanation and refactoring');
  console.log('  • Bug fixing and generation');
  console.log('  • Conversation history');
  console.log('  • Screenshot feedback\n');
  console.log('Documentation: https://github.com/vibex-team/vibex#readme');
  console.log('Support: https://github.com/vibex-team/vibex/issues\n');
}

async function main() {
  try {
    await createDirectories();
    await createDefaultConfig();
    await displayWelcomeMessage();
  } catch (error) {
    console.error('Post-install script failed:', error.message);
    process.exit(0); // Don't fail the installation
  }
}

main(); 