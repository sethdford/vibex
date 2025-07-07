/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { toolAPI } from '../../domain/tool/tool-api';
import { ListDirectoryTool } from './list-directory-adapter';
import { ReadManyFilesTool } from './read-many-files-adapter';
import { EditTool } from './edit-adapter';
import { GlobTool } from './glob-adapter';

/**
 * Register advanced file tools with the new tool system
 */
export function registerAdvancedFileTools() {
  // Create tool instances
  const listDirectoryTool = new ListDirectoryTool();
  const readManyFilesTool = new ReadManyFilesTool();
  const editTool = new EditTool();
  const globTool = new GlobTool();

  // Register tools
  toolAPI.registerTool(listDirectoryTool);
  toolAPI.registerTool(readManyFilesTool);
  toolAPI.registerTool(editTool);
  toolAPI.registerTool(globTool);
  
  return {
    listDirectoryTool,
    readManyFilesTool,
    editTool,
    globTool
  };
}