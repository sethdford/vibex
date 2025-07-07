/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import RipgrepTool from '../ripgrep-adapter';
import CodeAnalyzerTool from '../code-analyzer-adapter';
import ScreenshotTool from '../screenshot-adapter';

// Mock the legacy tools
vi.mock('../../../../tools/ripgrep', () => ({
  createRipgrepTool: () => ({
    name: 'search_code',
    description: 'Search for text patterns in files using ripgrep',
    input_schema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'The text pattern to search for' },
        path: { type: 'string', description: 'Directory to search in', default: '.' }
      },
      required: ['pattern']
    },
    handler: vi.fn().mockImplementation(async (input) => {
      if (!input.pattern) {
        throw new Error('Pattern is required');
      }
      return `Search Results:\n\nfile1.ts:10: match for ${input.pattern}\nfile2.ts:25: another match for ${input.pattern}`;
    })
  })
}));

vi.mock('../../../../tools/code-analyzer', () => ({
  createCodeAnalyzerTool: () => ({
    name: 'analyze_code',
    description: 'Perform comprehensive code analysis',
    input_schema: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Path to the code file' },
        analysis_type: { type: 'string', description: 'Analysis type' }
      },
      required: ['file_path']
    }
  }),
  executeCodeAnalysis: vi.fn().mockImplementation(async (input) => {
    if (!input.file_path) {
      return { success: false, error: 'File path is required' };
    }
    
    if (input.file_path.includes('error')) {
      return { success: false, error: 'Failed to analyze file' };
    }
    
    return {
      success: true,
      result: `# Code Analysis Report\n\n**File:** ${input.file_path}\n**Score:** 85/100\n\n## Quality Metrics\n- Good structure\n- Well documented`
    };
  })
}));

vi.mock('../../../../tools/screenshot', () => ({
  createScreenshotTool: () => ({
    name: 'take_screenshot',
    description: 'Take a screenshot',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Type of screenshot' },
        outputPath: { type: 'string', description: 'Output path' }
      },
      required: ['type']
    }
  }),
  executeScreenshot: vi.fn().mockImplementation(async (input) => {
    if (!input.type) {
      return { success: false, error: 'Type is required' };
    }
    
    if (input.type === 'error') {
      return { success: false, error: 'Failed to take screenshot' };
    }
    
    const outputPath = input.outputPath || '/tmp/screenshot.png';
    
    return {
      success: true,
      result: {
        message: `Screenshot saved to ${outputPath}`,
        filePath: outputPath,
        fileSize: 12345,
        dimensions: { width: 1920, height: 1080 }
      }
    };
  })
}));

describe('Specialized Tool Adapters', () => {
  describe('RipgrepTool', () => {
    let ripgrepTool: RipgrepTool;
    
    beforeEach(() => {
      ripgrepTool = new RipgrepTool();
    });
    
    it('should initialize with correct name and parameters', () => {
      expect(ripgrepTool.name).toBe('search_code');
      expect(ripgrepTool.parameters).toBeDefined();
      expect(ripgrepTool.parameters.properties).toHaveProperty('pattern');
      expect(ripgrepTool.parameters.required).toContain('pattern');
    });
    
    it('should validate parameters correctly', () => {
      // Valid parameters
      expect(ripgrepTool.validateParams({ pattern: 'searchTerm' })).toBeNull();
      
      // Missing pattern
      expect(ripgrepTool.validateParams({})).not.toBeNull();
      
      // Invalid type for pattern
      expect(ripgrepTool.validateParams({ pattern: 123 })).not.toBeNull();
      
      // Invalid max_results
      expect(ripgrepTool.validateParams({ pattern: 'test', max_results: -1 })).not.toBeNull();
    });
    
    it('should execute search successfully', async () => {
      const result = await ripgrepTool.execute({ pattern: 'function' });
      
      expect(result.success).toBe(true);
      expect(typeof result.data).toBe('string');
      expect(result.data).toContain('function');
    });
    
    it('should handle execution errors', async () => {
      // Force error by not providing pattern
      const spy = vi.spyOn(ripgrepTool as any, 'ripgrepHandler').mockImplementation(() => {
        throw new Error('Search failed');
      });
      
      const result = await ripgrepTool.execute({});
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      
      spy.mockRestore();
    });
    
    it('should report progress during execution', async () => {
      const onProgress = vi.fn();
      
      await ripgrepTool.execute({ pattern: 'function' }, { onProgress });
      
      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Starting code search...'
      }));
      expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Search completed',
        percentage: 100
      }));
    });
  });
  
  describe('CodeAnalyzerTool', () => {
    let codeAnalyzerTool: CodeAnalyzerTool;
    
    beforeEach(() => {
      codeAnalyzerTool = new CodeAnalyzerTool();
    });
    
    it('should initialize with correct name and parameters', () => {
      expect(codeAnalyzerTool.name).toBe('analyze_code');
      expect(codeAnalyzerTool.parameters).toBeDefined();
      expect(codeAnalyzerTool.parameters.properties).toHaveProperty('file_path');
      expect(codeAnalyzerTool.parameters.properties).toHaveProperty('analysis_type');
      expect(codeAnalyzerTool.parameters.required).toContain('file_path');
    });
    
    it('should validate parameters correctly', () => {
      // Valid parameters
      expect(codeAnalyzerTool.validateParams({ file_path: '/path/to/file.ts' })).toBeNull();
      
      // With analysis type
      expect(codeAnalyzerTool.validateParams({ 
        file_path: '/path/to/file.ts',
        analysis_type: 'quality'
      })).toBeNull();
      
      // Missing file path
      expect(codeAnalyzerTool.validateParams({})).not.toBeNull();
      
      // Invalid analysis type
      expect(codeAnalyzerTool.validateParams({
        file_path: '/path/to/file.ts',
        analysis_type: 'invalid'
      })).not.toBeNull();
    });
    
    it('should execute analysis successfully', async () => {
      const result = await codeAnalyzerTool.execute({ file_path: '/path/to/file.ts' });
      
      expect(result.success).toBe(true);
      expect(typeof result.data).toBe('string');
      expect(result.data).toContain('Code Analysis Report');
      expect(result.data).toContain('/path/to/file.ts');
    });
    
    it('should handle analysis errors', async () => {
      const result = await codeAnalyzerTool.execute({ file_path: '/path/to/error.ts' });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
    
    it('should report progress during execution', async () => {
      const onProgress = vi.fn();
      
      await codeAnalyzerTool.execute({ file_path: '/path/to/file.ts' }, { onProgress });
      
      expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Starting code analysis...'
      }));
      expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Analyzing file:'),
        percentage: 25
      }));
      expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Analysis completed',
        percentage: 100
      }));
    });
  });
  
  describe('ScreenshotTool', () => {
    let screenshotTool: ScreenshotTool;
    
    beforeEach(() => {
      screenshotTool = new ScreenshotTool();
    });
    
    it('should initialize with correct name and parameters', () => {
      expect(screenshotTool.name).toBe('take_screenshot');
      expect(screenshotTool.parameters).toBeDefined();
      expect(screenshotTool.parameters.properties).toHaveProperty('type');
      expect(screenshotTool.parameters.properties).toHaveProperty('delay');
      expect(screenshotTool.parameters.required).toContain('type');
    });
    
    it('should validate parameters correctly', () => {
      // Valid parameters
      expect(screenshotTool.validateParams({ type: 'screen' })).toBeNull();
      
      // With options
      expect(screenshotTool.validateParams({ 
        type: 'window',
        delay: 1000,
        quality: 90
      })).toBeNull();
      
      // Missing type
      expect(screenshotTool.validateParams({})).not.toBeNull();
      
      // Invalid type
      expect(screenshotTool.validateParams({ type: 'invalid' })).not.toBeNull();
      
      // Invalid delay
      expect(screenshotTool.validateParams({ type: 'screen', delay: -100 })).not.toBeNull();
    });
    
    it('should execute screenshot capture successfully', async () => {
      const result = await screenshotTool.execute({ type: 'screen' });
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.message).toContain('Screenshot saved');
      expect(result.data.filePath).toBeDefined();
      expect(result.data.fileSize).toBeDefined();
      expect(result.data.dimensions).toBeDefined();
    });
    
    it('should handle screenshot errors', async () => {
      const result = await screenshotTool.execute({ type: 'error' });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
    
    it('should report progress during execution', async () => {
      const onProgress = vi.fn();
      
      await screenshotTool.execute({ type: 'screen', delay: 1000 }, { onProgress });
      
      expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Preparing to take screenshot...'
      }));
      expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Waiting'),
        percentage: 25
      }));
      expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Taking'),
        percentage: 50
      }));
      expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Screenshot captured',
        percentage: 100
      }));
    });
    
    it('should require confirmation for execution', async () => {
      const confirmation = await screenshotTool.shouldConfirmExecute({ type: 'screen' });
      
      expect(confirmation).not.toBeNull();
      expect(confirmation?.type).toBe('warning');
      expect(confirmation?.title).toContain('Screenshot Permission');
      expect(confirmation?.description).toContain('screen screenshot');
    });
  });
});