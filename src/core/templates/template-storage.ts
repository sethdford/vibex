import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../../utils/logger.js';
import { homedir } from 'os';

const VIBEX_DIR = path.join(homedir(), '.vibex');
const TEMPLATES_FILE = path.join(VIBEX_DIR, 'workflow-templates.json');
const COLLECTIONS_FILE = path.join(VIBEX_DIR, 'template-collections.json');

async function ensureDirExists() {
  try {
    await fs.mkdir(VIBEX_DIR, { recursive: true });
  } catch (error) {
    logger.error('Failed to create .vibex directory', { error });
  }
}

export async function saveTemplates(templates: Map<string, any>): Promise<void> {
  await ensureDirExists();
  const data = JSON.stringify(Array.from(templates.entries()), null, 2);
  await fs.writeFile(TEMPLATES_FILE, data, 'utf-8');
}

export async function loadTemplates(): Promise<Map<string, any>> {
  try {
    await ensureDirExists();
    const data = await fs.readFile(TEMPLATES_FILE, 'utf-8');
    return new Map(JSON.parse(data));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return new Map();
    }
    logger.error('Failed to load templates from file', { error });
    return new Map();
  }
}

export async function saveCollections(collections: Map<string, any>): Promise<void> {
  await ensureDirExists();
  const data = JSON.stringify(Array.from(collections.entries()), null, 2);
  await fs.writeFile(COLLECTIONS_FILE, data, 'utf-8');
}

export async function loadCollections(): Promise<Map<string, any>> {
  try {
    await ensureDirExists();
    const data = await fs.readFile(COLLECTIONS_FILE, 'utf-8');
    return new Map(JSON.parse(data));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return new Map();
    }
    logger.error('Failed to load collections from file', { error });
    return new Map();
  }
}
