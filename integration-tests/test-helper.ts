/**
 * VibeX CLI Integration Test Helper
 * 
 * Superior testing infrastructure that exceeds Gemini CLI's basic TestRig
 * with comprehensive isolation, performance monitoring, and workflow support.
 */

import { execSync, spawn, ChildProcess } from 'child_process';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, statSync, readdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Performance metrics for test operations
 */
export interface PerformanceMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsage: {
    before: NodeJS.MemoryUsage;
    after: NodeJS.MemoryUsage;
    peak: NodeJS.MemoryUsage;
  };
  cpuUsage: {
    before: NodeJS.CpuUsage;
    after: NodeJS.CpuUsage;
  };
}

/**
 * Test environment configuration
 */
export interface TestEnvironment {
  testId: string;
  testDir: string;
  tempDir: string;
  configFile: string;
  logFile: string;
  cleanup: () => void;
}

/**
 * Error log entry
 */
export interface ErrorLogEntry {
  timestamp: number;
  level: 'error' | 'warn' | 'info';
  message: string;
  stack?: string;
  context?: Record<string, any>;
}

/**
 * Test step for workflow testing
 */
export interface TestStep {
  name: string;
  command: string;
  expectedOutput?: string | RegExp;
  expectedFiles?: string[];
  timeout?: number;
  shouldFail?: boolean;
  setup?: () => void;
  cleanup?: () => void;
}

/**
 * Workflow execution result
 */
export interface WorkflowResult {
  success: boolean;
  steps: Array<{
    step: TestStep;
    success: boolean;
    output?: string;
    error?: string;
    duration: number;
  }>;
  totalDuration: number;
  errors: ErrorLogEntry[];
}

/**
 * Mock API response
 */
export interface MockResponse {
  url: string | RegExp;
  method?: string;
  status: number;
  response: any;
  delay?: number;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  issues: string[];
  warnings: string[];
}

/**
 * Enhanced test rig that surpasses Gemini CLI's basic TestRig
 */
export class VibeXTestRig {
  private testId: string;
  private testDir: string;
  private tempDir: string;
  private configFile: string;
  private logFile: string;
  private errorLog: ErrorLogEntry[] = [];
  private processes: ChildProcess[] = [];
  private mockResponses: MockResponse[] = [];
  private performanceData: PerformanceMetrics[] = [];

  constructor() {
    this.testId = `vibex-test-${Date.now()}-${randomUUID().slice(0, 8)}`;
    this.tempDir = join(tmpdir(), 'vibex-integration-tests', this.testId);
    this.testDir = join(this.tempDir, 'workspace');
    this.configFile = join(this.tempDir, 'config.json');
    this.logFile = join(this.tempDir, 'test.log');
  }

  /**
   * Set up isolated test environment with proper cleanup
   */
  setupIsolatedEnvironment(testName: string): TestEnvironment {
    const sanitizedName = testName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');

    // Create isolated directories
    mkdirSync(this.tempDir, { recursive: true });
    mkdirSync(this.testDir, { recursive: true });

    // Create default configuration
    this.setTestConfig({
      api: { key: 'test-api-key' },
      ai: { model: 'claude-sonnet-4-20250514' },
      logger: { level: 'debug' },
      telemetry: { enabled: false }
    });

    // Set up environment variables
    process.env.VIBEX_CONFIG_FILE = this.configFile;
    process.env.VIBEX_TEST_MODE = 'true';
    process.env.VIBEX_LOG_FILE = this.logFile;

    this.log('info', `Test environment setup: ${sanitizedName}`, {
      testId: this.testId,
      testDir: this.testDir,
      tempDir: this.tempDir
    });

    return {
      testId: this.testId,
      testDir: this.testDir,
      tempDir: this.tempDir,
      configFile: this.configFile,
      logFile: this.logFile,
      cleanup: () => this.cleanup()
    };
  }

  /**
   * Measure performance of an operation
   */
  async measurePerformance(operation: () => Promise<void>): Promise<PerformanceMetrics> {
    const startTime = Date.now();
    const memoryBefore = process.memoryUsage();
    const cpuBefore = process.cpuUsage();

    let peakMemory = memoryBefore;
    const memoryMonitor = setInterval(() => {
      const current = process.memoryUsage();
      if (current.heapUsed > peakMemory.heapUsed) {
        peakMemory = current;
      }
    }, 10);

    try {
      await operation();
    } finally {
      clearInterval(memoryMonitor);
    }

    const endTime = Date.now();
    const memoryAfter = process.memoryUsage();
    const cpuAfter = process.cpuUsage(cpuBefore);

    const metrics: PerformanceMetrics = {
      startTime,
      endTime,
      duration: endTime - startTime,
      memoryUsage: {
        before: memoryBefore,
        after: memoryAfter,
        peak: peakMemory
      },
      cpuUsage: {
        before: cpuBefore,
        after: cpuAfter
      }
    };

    this.performanceData.push(metrics);
    this.log('info', 'Performance measurement completed', {
      duration: metrics.duration,
      memoryDelta: metrics.memoryUsage.after.heapUsed - metrics.memoryUsage.before.heapUsed,
      cpuUser: metrics.cpuUsage.after.user,
      cpuSystem: metrics.cpuUsage.after.system
    });

    return metrics;
  }

  /**
   * Capture and analyze errors
   */
  captureErrors(): ErrorLogEntry[] {
    return [...this.errorLog];
  }

  /**
   * Run a multi-step workflow
   */
  async runWorkflow(steps: TestStep[]): Promise<WorkflowResult> {
    const startTime = Date.now();
    const result: WorkflowResult = {
      success: true,
      steps: [],
      totalDuration: 0,
      errors: []
    };

    this.log('info', `Starting workflow with ${steps.length} steps`);

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepStartTime = Date.now();

      this.log('info', `Executing step ${i + 1}: ${step.name}`);

      try {
        // Run setup if provided
        if (step.setup) {
          step.setup();
        }

        // Execute the command
        const output = await this.runCommand(step.command, {
          timeout: step.timeout || 30000,
          shouldFail: step.shouldFail || false
        });

        // Validate expected output
        if (step.expectedOutput) {
          const matches = typeof step.expectedOutput === 'string' 
            ? output.includes(step.expectedOutput)
            : step.expectedOutput.test(output);

          if (!matches) {
            throw new Error(`Expected output not found. Expected: ${step.expectedOutput}, Got: ${output.slice(0, 200)}...`);
          }
        }

        // Validate expected files
        if (step.expectedFiles) {
          for (const file of step.expectedFiles) {
            const filePath = join(this.testDir, file);
            if (!existsSync(filePath)) {
              throw new Error(`Expected file not found: ${file}`);
            }
          }
        }

        const stepDuration = Date.now() - stepStartTime;
        result.steps.push({
          step,
          success: true,
          output,
          duration: stepDuration
        });

        this.log('info', `Step ${i + 1} completed successfully`, {
          duration: stepDuration,
          outputLength: output.length
        });

      } catch (error) {
        const stepDuration = Date.now() - stepStartTime;
        const errorMessage = error instanceof Error ? error.message : String(error);

        result.success = false;
        result.steps.push({
          step,
          success: false,
          error: errorMessage,
          duration: stepDuration
        });

        this.log('error', `Step ${i + 1} failed: ${errorMessage}`, {
          step: step.name,
          duration: stepDuration
        });

        // Stop on first failure unless step is expected to fail
        if (!step.shouldFail) {
          break;
        }
      } finally {
        // Run cleanup if provided
        if (step.cleanup) {
          step.cleanup();
        }
      }
    }

    result.totalDuration = Date.now() - startTime;
    result.errors = this.captureErrors();

    this.log('info', 'Workflow completed', {
      success: result.success,
      totalSteps: steps.length,
      successfulSteps: result.steps.filter(s => s.success).length,
      totalDuration: result.totalDuration
    });

    return result;
  }

  /**
   * Mock API responses for testing
   * Sets up HTTP mocking for API calls during test execution
   * 
   * @param responses Array of mock response configurations
   */
  mockApiResponses(responses: MockResponse[]): void {
    this.mockResponses = responses;
    this.setupHttpMocking();
    this.log('info', `Configured ${responses.length} API response mocks`);
  }

  /**
   * Set test configuration
   */
  setTestConfig(config: Partial<any>): void {
    const fullConfig = {
      // Default test configuration
      api: {
        baseUrl: 'https://api.anthropic.com',
        version: 'v1',
        timeout: 60000,
        key: config.api?.key || 'test-api-key'
      },
      ai: {
        model: 'claude-sonnet-4-20250514',
        temperature: 0.5,
        maxTokens: 4096,
        ...config.ai
      },
      logger: {
        level: 'info',
        timestamps: true,
        colors: false,
        ...config.logger
      },
      telemetry: {
        enabled: false,
        ...config.telemetry
      },
      ...config
    };

    writeFileSync(this.configFile, JSON.stringify(fullConfig, null, 2));
    this.log('info', 'Test configuration updated', { configFile: this.configFile });
  }

  /**
   * Validate cleanup and environment state
   */
  validateCleanup(): ValidationResult {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check for running processes
    if (this.processes.length > 0) {
      issues.push(`${this.processes.length} processes still running`);
    }

    // Check for memory leaks
    const currentMemory = process.memoryUsage();
    if (this.performanceData.length > 0) {
      const initialMemory = this.performanceData[0].memoryUsage.before.heapUsed;
      const memoryGrowth = currentMemory.heapUsed - initialMemory;
      if (memoryGrowth > 50 * 1024 * 1024) { // 50MB threshold
        warnings.push(`Significant memory growth detected: ${Math.round(memoryGrowth / 1024 / 1024)}MB`);
      }
    }

    // Check for leftover files
    if (existsSync(this.testDir)) {
      const files = this.getDirectorySize(this.testDir);
      if (files.count > 100) {
        warnings.push(`Many files left in test directory: ${files.count} files`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings
    };
  }

  /**
   * Create a file in the test directory
   */
  createFile(fileName: string, content: string): string {
    const filePath = join(this.testDir, fileName);
    const dir = dirname(filePath);
    
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    
    writeFileSync(filePath, content);
    this.log('info', `Created file: ${fileName}`, { size: content.length });
    return filePath;
  }

  /**
   * Read a file from the test directory
   */
  readFile(fileName: string): string {
    const filePath = join(this.testDir, fileName);
    const content = readFileSync(filePath, 'utf-8');
    this.log('info', `Read file: ${fileName}`, { size: content.length });
    return content;
  }

  /**
   * Create a directory in the test directory
   */
  mkdir(dirName: string): string {
    const dirPath = join(this.testDir, dirName);
    mkdirSync(dirPath, { recursive: true });
    this.log('info', `Created directory: ${dirName}`);
    return dirPath;
  }

  /**
   * Run a VibeX CLI command
   */
  async runCommand(command: string, options: {
    timeout?: number;
    shouldFail?: boolean;
    env?: Record<string, string>;
  } = {}): Promise<string> {
    const cliPath = join(__dirname, '..', 'dist', 'cli.js');
    const fullCommand = `node ${cliPath} ${command}`;
    
    this.log('info', `Running command: ${fullCommand}`);

    return new Promise((resolve, reject) => {
      const child = spawn('node', [cliPath, ...command.split(' ')], {
        cwd: this.testDir,
        env: {
          ...process.env,
          ...options.env,
          VIBEX_CONFIG_FILE: this.configFile,
          VIBEX_TEST_MODE: 'true'
        },
        stdio: 'pipe'
      });

      this.processes.push(child);

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timeout after ${options.timeout}ms`));
      }, options.timeout || 30000);

      child.on('close', (code) => {
        clearTimeout(timeout);
        this.processes = this.processes.filter(p => p !== child);

        const output = stdout + stderr;
        
        if (code === 0 || options.shouldFail) {
          this.log('info', `Command completed`, { 
            exitCode: code, 
            outputLength: output.length 
          });
          resolve(output);
        } else {
          this.log('error', `Command failed`, { 
            exitCode: code, 
            stderr: stderr.slice(0, 500) 
          });
          reject(new Error(`Command failed with exit code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        this.processes = this.processes.filter(p => p !== child);
        this.log('error', `Command error: ${error.message}`);
        reject(error);
      });
    });
  }

  /**
   * Clean up test environment
   */
  cleanup(): void {
    this.log('info', 'Starting cleanup');

    // Kill any running processes
    for (const process of this.processes) {
      try {
        process.kill('SIGTERM');
      } catch (error) {
        // Process might already be dead
      }
    }
    this.processes = [];

    // Remove test directories
    try {
      if (existsSync(this.tempDir)) {
        rmSync(this.tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      this.log('warn', `Cleanup error: ${error instanceof Error ? error.message : error}`);
    }

    // Clean up environment variables
    delete process.env.VIBEX_CONFIG_FILE;
    delete process.env.VIBEX_TEST_MODE;
    delete process.env.VIBEX_LOG_FILE;

    this.log('info', 'Cleanup completed');
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalOperations: number;
    averageDuration: number;
    maxDuration: number;
    averageMemoryUsage: number;
    maxMemoryUsage: number;
  } {
    if (this.performanceData.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        maxDuration: 0,
        averageMemoryUsage: 0,
        maxMemoryUsage: 0
      };
    }

    const durations = this.performanceData.map(p => p.duration);
    const memoryUsages = this.performanceData.map(p => p.memoryUsage.peak.heapUsed);

    return {
      totalOperations: this.performanceData.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      maxDuration: Math.max(...durations),
      averageMemoryUsage: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
      maxMemoryUsage: Math.max(...memoryUsages)
    };
  }

  /**
   * Log test events
   */
  private log(level: 'info' | 'warn' | 'error', message: string, context?: Record<string, any>): void {
    const entry: ErrorLogEntry = {
      timestamp: Date.now(),
      level,
      message,
      context
    };

    this.errorLog.push(entry);

    // Also write to log file
    const logLine = `[${new Date().toISOString()}] ${level.toUpperCase()}: ${message}${
      context ? ` | ${JSON.stringify(context)}` : ''
    }\n`;

    try {
      writeFileSync(this.logFile, logLine, { flag: 'a' });
    } catch (error) {
      // Ignore file write errors during testing
    }

    // Output to console in verbose mode
    if (process.env.VIBEX_TEST_VERBOSE === 'true') {
      console.log(logLine.trim());
    }
  }

  /**
   * Set up HTTP mocking for API responses
   */
  private setupHttpMocking(): void {
    if (this.mockResponses.length === 0) return;
    
    // Set environment variable to enable mock mode
    process.env.VIBEX_MOCK_API = 'true';
    process.env.VIBEX_MOCK_RESPONSES = JSON.stringify(this.mockResponses);
    
    this.log('info', 'HTTP mocking configured for API responses');
  }

  /**
   * Get directory size and file count recursively
   * 
   * @param dirPath Path to directory to analyze
   * @returns Object containing total size in bytes and file count
   */
  private getDirectorySize(dirPath: string): { size: number; count: number } {
    let totalSize = 0;
    let fileCount = 0;

    try {
      const stat = statSync(dirPath);
      if (stat.isFile()) {
        return { size: stat.size, count: 1 };
      }
      
      if (stat.isDirectory()) {
        const items = readdirSync(dirPath, { withFileTypes: true });
        for (const item of items) {
          const itemPath = join(dirPath, item.name);
          const itemStats = this.getDirectorySize(itemPath);
          totalSize += itemStats.size;
          fileCount += itemStats.count;
        }
      }
      
      return { size: totalSize, count: fileCount };
    } catch (error) {
      return { size: 0, count: 0 };
    }
  }
}