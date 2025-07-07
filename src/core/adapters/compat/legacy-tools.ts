/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Backward compatibility layer for legacy tools
 * 
 * This module provides functions that match the API of the legacy tool system
 * but internally use the new architecture. This allows existing code to
 * continue working without modification while benefiting from the new
 * architecture's features.
 */

import { toolAPI } from '../../domain/tool/tool-api';

/**
 * Legacy compatible read file function
 */
export async function readFile(params: any) {
  const result = await toolAPI.executeTool('read_file', {
    file_path: params.path,
    encoding: params.encoding
  });
  
  if (!result.success) {
    return {
      content: '',
      size: 0,
      path: params.path,
      success: false,
      error: result.error?.message || 'Unknown error'
    };
  }
  
  return {
    content: result.data as string,
    size: (result.metadata?.size as number) || 0,
    path: (result.metadata?.path as string) || params.path,
    success: true
  };
}

/**
 * Legacy compatible write file function
 */
export async function writeFile(params: any) {
  const result = await toolAPI.executeTool('write_file', {
    file_path: params.path,
    content: params.content,
    encoding: params.encoding,
    create_backup: params.createBackup
  });
  
  if (!result.success) {
    return {
      path: params.path,
      bytesWritten: 0,
      success: false,
      created: false,
      error: result.error?.message || 'Unknown error'
    };
  }
  
  const data = result.data as {
    path: string;
    bytesWritten: number;
    created: boolean;
    backupPath?: string;
  };
  
  return {
    path: data.path,
    bytesWritten: data.bytesWritten,
    success: true,
    created: data.created,
    backupPath: data.backupPath
  };
}

/**
 * Legacy compatible shell function
 */
export async function executeShell(params: any) {
  const result = await toolAPI.executeTool('shell', {
    command: params.command,
    cwd: params.cwd,
    timeout: params.timeout,
    capture_stderr: params.captureStderr
  });
  
  if (!result.success) {
    return {
      command: params.command,
      exitCode: null,
      stdout: '',
      stderr: '',
      success: false,
      signal: null,
      executionTime: 0,
      cwd: params.cwd || process.cwd(),
      error: result.error?.message || 'Unknown error'
    };
  }
  
  const data = result.data as {
    stdout: string;
    stderr: string;
    exitCode: number | null;
    executionTime: number;
  };
  
  return {
    command: params.command,
    exitCode: data.exitCode,
    stdout: data.stdout,
    stderr: data.stderr,
    success: data.exitCode === 0,
    signal: null,
    executionTime: data.executionTime,
    cwd: params.cwd || process.cwd()
  };
}