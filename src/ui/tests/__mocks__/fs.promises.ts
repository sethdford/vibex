/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { vi } from 'vitest';

// Mock implementations for fs/promises
export const readFile = vi.fn();
export const writeFile = vi.fn();
export const access = vi.fn();
export const stat = vi.fn();
export const readdir = vi.fn();
export const mkdir = vi.fn();
export const rm = vi.fn();

// Add any additional methods used in tests
export const unlink = vi.fn();
export const rename = vi.fn();
export const copyFile = vi.fn();
export const chmod = vi.fn();
export const open = vi.fn();
export const appendFile = vi.fn();
export const readlink = vi.fn();
export const symlink = vi.fn();

// Helper to reset all mocks at once
export function resetMocks() {
  readFile.mockReset();
  writeFile.mockReset();
  access.mockReset();
  stat.mockReset();
  readdir.mockReset();
  mkdir.mockReset();
  rm.mockReset();
  unlink.mockReset();
  rename.mockReset();
  copyFile.mockReset();
  chmod.mockReset();
  open.mockReset();
  appendFile.mockReset();
  readlink.mockReset();
  symlink.mockReset();
}