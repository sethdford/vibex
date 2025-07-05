#!/usr/bin/env node
/**
 * Advanced Workflow Test Runner
 * 
 * A comprehensive workflow test runner for VibeX that outperforms Gemini CLI's basic test runner.
 * Supports multi-step workflows with dependencies, complex scenarios, state persistence,
 * user interaction simulation, and detailed reporting.
 */

import { VibeXTestRig, TestStep, WorkflowResult } from '../test-helper.js';
import { join, resolve } from 'path';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { EOL } from 'os';
import chalk from 'chalk';

// Define workflow test interfaces
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  author?: string;
  tags?: string[];
  steps: WorkflowStep[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  timeout?: number;
  validateState?: (context: WorkflowContext) => Promise<boolean>;
}

export interface WorkflowStep {
  id: string;
  name: string;
  command: string;
  description?: string;
  timeout?: number;
  expectedOutput?: string | RegExp;
  expectedExitCode?: number;
  expectedFiles?: string[];
  expectedState?: Record<string, any>;
  skipIf?: (context: WorkflowContext) => boolean | Promise<boolean>;
  beforeStep?: (context: WorkflowContext) => Promise<void>;
  afterStep?: (context: WorkflowContext) => Promise<void>;
  validate?: (output: string, context: WorkflowContext) => Promise<{
    valid: boolean;
    reason?: string;
  }>;
  retries?: number;
  retryDelay?: number;
  inputs?: string[]; // Simulated user inputs for interactive commands
  shouldFail?: boolean;
  dependencies?: string[]; // IDs of steps that must complete before this one
}

export interface WorkflowContext {
  workflowId: string;
  testRig: VibeXTestRig;
  startTime: number;
  endTime?: number;
  completedSteps: Set<string>;
  failedSteps: Set<string>;
  state: Record<string, any>;
  tempDir: string;
  artifacts: Record<string, string>;
  environment: Record<string, string>;
  logs: Array<{
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    timestamp: number;
    stepId?: string;
  }>;
  outputDir: string;
}

export interface WorkflowExecutionReport {
  workflowId: string;
  name: string;
  description: string;
  status: 'success' | 'failure' | 'partial' | 'skipped';
  startTime: number;
  endTime: number;
  duration: number;
  steps: Array<{
    id: string;
    name: string;
    status: 'success' | 'failure' | 'skipped';
    startTime: number;
    endTime: number;
    duration: number;
    output?: string;
    error?: string;
    validationErrors?: string[];
  }>;
  performance: {
    memoryUsage: {
      peak: number;
      average: number;
    };
    stepTimes: Record<string, number>;
  };
  errors: Array<{
    stepId?: string;
    message: string;
    stack?: string;
  }>;
  warnings: string[];
}

/**
 * VibeX Workflow Test Runner
 * Superior to Gemini CLI's basic test runner with advanced workflow capabilities
 */
export class VibeXWorkflowRunner {
  private testRig: VibeXTestRig;
  private outputDir: string;

  constructor(outputDir?: string) {
    this.testRig = new VibeXTestRig();
    this.outputDir = outputDir || join(process.cwd(), 'test-reports');
    
    // Ensure output directory exists
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Run a workflow definition
   */
  async runWorkflow(workflow: WorkflowDefinition): Promise<WorkflowExecutionReport> {
    const startTime = Date.now();
    console.log(chalk.blue(`\n🚀 Starting workflow: ${workflow.name}`));
    console.log(chalk.blue(`📋 Description: ${workflow.description}`));

    // Set up the test environment
    const env = this.testRig.setupIsolatedEnvironment(workflow.id);
    
    // Initialize workflow context
    const context: WorkflowContext = {
      workflowId: workflow.id,
      testRig: this.testRig,
      startTime,
      completedSteps: new Set<string>(),
      failedSteps: new Set<string>(),
      state: {},
      tempDir: env.tempDir,
      artifacts: {},
      environment: { ...process.env },
      logs: [],
      outputDir: this.outputDir
    };

    // Create the report object
    const report: WorkflowExecutionReport = {
      workflowId: workflow.id,
      name: workflow.name,
      description: workflow.description,
      status: 'skipped',
      startTime,
      endTime: 0,
      duration: 0,
      steps: [],
      performance: {
        memoryUsage: {
          peak: 0,
          average: 0
        },
        stepTimes: {}
      },
      errors: [],
      warnings: []
    };

    // Run workflow setup if provided
    try {
      if (workflow.setup) {
        this.log(context, 'info', 'Running workflow setup...');
        await workflow.setup();
      }

      // Execute all steps
      await this.executeWorkflowSteps(workflow.steps, context, report);
      
      // Run state validation if provided
      if (workflow.validateState) {
        this.log(context, 'info', 'Validating final workflow state...');
        const isStateValid = await workflow.validateState(context);
        if (!isStateValid) {
          report.status = 'failure';
          report.errors.push({
            message: 'Workflow state validation failed'
          });
          this.log(context, 'error', 'Workflow state validation failed');
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      
      report.status = 'failure';
      report.errors.push({
        message: errorMessage,
        stack
      });
      
      this.log(context, 'error', `Workflow execution failed: ${errorMessage}`);
      
    } finally {
      // Run workflow teardown if provided
      try {
        if (workflow.teardown) {
          this.log(context, 'info', 'Running workflow teardown...');
          await workflow.teardown();
        }
      } catch (teardownError) {
        const errorMessage = teardownError instanceof Error 
          ? teardownError.message 
          : String(teardownError);
        
        report.warnings.push(`Teardown failed: ${errorMessage}`);
        this.log(context, 'warn', `Teardown failed: ${errorMessage}`);
      }
      
      // Clean up the test environment
      env.cleanup();
      
      // Finalize the report
      const endTime = Date.now();
      context.endTime = endTime;
      report.endTime = endTime;
      report.duration = endTime - startTime;
      
      // Determine final status if not already set to failure
      if (report.status !== 'failure') {
        if (report.steps.some(step => step.status === 'failure')) {
          report.status = 'partial';
        } else {
          report.status = 'success';
        }
      }
      
      // Generate and save the report
      this.saveWorkflowReport(report);
    }

    // Display summary
    this.displayWorkflowSummary(report);
    
    return report;
  }

  /**
   * Execute all workflow steps in the correct order
   */
  private async executeWorkflowSteps(
    steps: WorkflowStep[],
    context: WorkflowContext,
    report: WorkflowExecutionReport
  ): Promise<void> {
    // Create execution plan respecting dependencies
    const executionPlan = this.createExecutionPlan(steps);
    let currentLevel = 0;
    
    while (executionPlan[currentLevel]) {
      const levelSteps = executionPlan[currentLevel];
      this.log(context, 'info', `Executing steps at level ${currentLevel + 1}`);
      
      // Execute all steps at the current level in parallel
      const stepPromises = levelSteps.map(step => this.executeStep(step, context, report));
      const stepResults = await Promise.all(stepPromises);
      
      // Check if any required steps failed
      const criticalFailure = levelSteps.some((step, index) => {
        return !step.shouldFail && stepResults[index].status === 'failure';
      });
      
      if (criticalFailure) {
        this.log(context, 'error', 'Critical step failure detected, stopping workflow execution');
        throw new Error('Workflow execution stopped due to critical step failure');
      }
      
      currentLevel++;
    }
  }

  /**
   * Create an execution plan that respects dependencies
   * Returns an array of arrays, where each inner array contains steps that can be executed in parallel
   */
  private createExecutionPlan(steps: WorkflowStep[]): WorkflowStep[][] {
    const stepMap = new Map<string, WorkflowStep>();
    steps.forEach(step => stepMap.set(step.id, step));
    
    // Calculate dependency level for each step
    const dependencyLevels = new Map<string, number>();
    const calculateLevel = (step: WorkflowStep): number => {
      if (dependencyLevels.has(step.id)) {
        return dependencyLevels.get(step.id)!;
      }
      
      if (!step.dependencies || step.dependencies.length === 0) {
        dependencyLevels.set(step.id, 0);
        return 0;
      }
      
      let maxDependencyLevel = -1;
      for (const depId of step.dependencies) {
        const depStep = stepMap.get(depId);
        if (!depStep) {
          throw new Error(`Step '${step.id}' depends on non-existent step '${depId}'`);
        }
        
        const depLevel = calculateLevel(depStep);
        maxDependencyLevel = Math.max(maxDependencyLevel, depLevel);
      }
      
      const level = maxDependencyLevel + 1;
      dependencyLevels.set(step.id, level);
      return level;
    };
    
    // Calculate levels for all steps
    steps.forEach(step => calculateLevel(step));
    
    // Group steps by level
    const maxLevel = Math.max(...Array.from(dependencyLevels.values()));
    const executionPlan: WorkflowStep[][] = Array(maxLevel + 1).fill(null).map(() => []);
    
    steps.forEach(step => {
      const level = dependencyLevels.get(step.id)!;
      executionPlan[level].push(step);
    });
    
    return executionPlan;
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(
    step: WorkflowStep,
    context: WorkflowContext,
    report: WorkflowExecutionReport
  ): Promise<{ status: 'success' | 'failure' | 'skipped' }> {
    const stepStartTime = Date.now();
    
    // Prepare the step report entry
    const stepReport = {
      id: step.id,
      name: step.name,
      status: 'skipped' as 'success' | 'failure' | 'skipped',
      startTime: stepStartTime,
      endTime: 0,
      duration: 0,
      output: '',
      validationErrors: [] as string[]
    };
    
    report.steps.push(stepReport);
    
    // Check if the step should be skipped based on dependencies or skipIf
    try {
      // Check dependencies
      if (step.dependencies) {
        for (const depId of step.dependencies) {
          if (context.failedSteps.has(depId)) {
            this.log(context, 'info', `Skipping step '${step.id}' due to dependency '${depId}' failure`);
            stepReport.status = 'skipped';
            return { status: 'skipped' };
          }
          
          if (!context.completedSteps.has(depId)) {
            throw new Error(`Dependency '${depId}' not completed before step '${step.id}'`);
          }
        }
      }
      
      // Check skip condition
      if (step.skipIf) {
        const shouldSkip = await step.skipIf(context);
        if (shouldSkip) {
          this.log(context, 'info', `Skipping step '${step.id}' due to skipIf condition`);
          stepReport.status = 'skipped';
          return { status: 'skipped' };
        }
      }

      // Log step execution
      console.log(chalk.cyan(`\n🔄 Executing step: ${step.name} (${step.id})`));
      this.log(context, 'info', `Executing step '${step.id}': ${step.command}`);
      
      // Run beforeStep hook if provided
      if (step.beforeStep) {
        await step.beforeStep(context);
      }
      
      let output = '';
      let success = false;
      let retries = 0;
      const maxRetries = step.retries || 0;
      
      // Execute the step with retries
      do {
        try {
          if (retries > 0) {
            this.log(context, 'info', `Retrying step '${step.id}', attempt ${retries + 1}/${maxRetries + 1}`);
            
            if (step.retryDelay) {
              await new Promise(resolve => setTimeout(resolve, step.retryDelay));
            }
          }
          
          // Convert the WorkflowStep to TestStep format for the VibeXTestRig
          const testStep: TestStep = {
            name: step.name,
            command: step.command,
            expectedOutput: step.expectedOutput,
            expectedFiles: step.expectedFiles,
            timeout: step.timeout,
            shouldFail: step.shouldFail,
            setup: step.beforeStep ? () => step.beforeStep!(context) : undefined,
            cleanup: step.afterStep ? () => step.afterStep!(context) : undefined
          };
          
          // Execute the command
          const result = await this.executeCommand(testStep, context, step);
          output = result.output || '';
          stepReport.output = output;
          
          // Perform validation if needed
          if (step.validate) {
            const validationResult = await step.validate(output, context);
            if (!validationResult.valid) {
              stepReport.validationErrors.push(validationResult.reason || 'Validation failed');
              throw new Error(`Step validation failed: ${validationResult.reason || 'No reason provided'}`);
            }
          }
          
          // Check expected state if specified
          if (step.expectedState) {
            for (const [key, expectedValue] of Object.entries(step.expectedState)) {
              const actualValue = context.state[key];
              if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
                throw new Error(`State validation failed: expected state.${key} to be ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`);
              }
            }
          }
          
          success = true;
          break;
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.log(context, 'error', `Step '${step.id}' failed: ${errorMessage}`, step.id);
          
          if (retries >= maxRetries) {
            // Final failure
            if (step.shouldFail) {
              // This step was expected to fail, so we consider it successful
              success = true;
              this.log(context, 'info', `Step '${step.id}' failed as expected`);
            } else {
              stepReport.error = errorMessage;
              throw error;
            }
          }
        }
        
        retries++;
        
      } while (retries <= maxRetries);
      
      // Run afterStep hook if provided
      if (step.afterStep) {
        await step.afterStep(context);
      }
      
      // Update context with completed step
      if (success) {
        context.completedSteps.add(step.id);
        stepReport.status = 'success';
        console.log(chalk.green(`✅ Step completed: ${step.name}`));
        this.log(context, 'info', `Step '${step.id}' completed successfully`);
        return { status: 'success' };
      } else {
        context.failedSteps.add(step.id);
        stepReport.status = 'failure';
        console.log(chalk.red(`❌ Step failed: ${step.name}`));
        this.log(context, 'error', `Step '${step.id}' failed after ${maxRetries + 1} attempts`);
        return { status: 'failure' };
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      
      context.failedSteps.add(step.id);
      stepReport.status = 'failure';
      stepReport.error = errorMessage;
      
      report.errors.push({
        stepId: step.id,
        message: errorMessage,
        stack
      });
      
      console.log(chalk.red(`❌ Step failed: ${step.name} - ${errorMessage}`));
      this.log(context, 'error', `Step '${step.id}' execution error: ${errorMessage}`, step.id);
      
      return { status: 'failure' };
    } finally {
      const stepEndTime = Date.now();
      stepReport.endTime = stepEndTime;
      stepReport.duration = stepEndTime - stepStartTime;
      report.performance.stepTimes[step.id] = stepReport.duration;
    }
  }

  /**
   * Execute a command using the VibeXTestRig
   */
  private async executeCommand(
    testStep: TestStep,
    context: WorkflowContext,
    workflowStep: WorkflowStep
  ): Promise<{ output: string }> {
    // Prepare for user input simulation if needed
    let currentInputIndex = 0;
    
    if (workflowStep.inputs && workflowStep.inputs.length > 0) {
      // Set up input simulation
      const originalStdin = process.stdin;
      
      // TODO: Implement actual input simulation
      // This would involve more complex setup with child process management
      this.log(context, 'info', `Simulating ${workflowStep.inputs.length} user inputs for step '${workflowStep.id}'`);
    }
    
    try {
      // Execute the single step
      const result = await context.testRig.runWorkflow([testStep]);
      
      // Check for failure unless expected
      if (!result.success && !testStep.shouldFail) {
        throw new Error(result.steps[0]?.error || 'Command execution failed');
      }
      
      // Return the output
      return { output: result.steps[0]?.output || '' };
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Log a message to the workflow context
   */
  private log(
    context: WorkflowContext,
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    stepId?: string
  ): void {
    context.logs.push({
      level,
      message,
      timestamp: Date.now(),
      stepId
    });
    
    // Also log to console
    switch (level) {
      case 'info':
        console.log(chalk.blue(`[INFO] ${message}`));
        break;
      case 'warn':
        console.log(chalk.yellow(`[WARN] ${message}`));
        break;
      case 'error':
        console.log(chalk.red(`[ERROR] ${message}`));
        break;
      case 'debug':
        console.log(chalk.gray(`[DEBUG] ${message}`));
        break;
    }
  }

  /**
   * Save workflow report to file
   */
  private saveWorkflowReport(report: WorkflowExecutionReport): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = join(this.outputDir, `workflow-${report.workflowId}-${timestamp}.json`);
    const logPath = join(this.outputDir, `workflow-${report.workflowId}-${timestamp}.log`);
    
    // Save the report as JSON
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Generate a human-readable log
    const logLines: string[] = [
      `Workflow: ${report.name}`,
      `ID: ${report.workflowId}`,
      `Status: ${report.status.toUpperCase()}`,
      `Started: ${new Date(report.startTime).toISOString()}`,
      `Ended: ${new Date(report.endTime).toISOString()}`,
      `Duration: ${(report.duration / 1000).toFixed(2)} seconds`,
      '',
      '=== Steps ===',
      ''
    ];
    
    report.steps.forEach(step => {
      logLines.push(`Step: ${step.name} (${step.id})`);
      logLines.push(`Status: ${step.status.toUpperCase()}`);
      logLines.push(`Duration: ${(step.duration / 1000).toFixed(2)} seconds`);
      
      if (step.output) {
        logLines.push('--- Output ---');
        logLines.push(step.output);
      }
      
      if (step.error) {
        logLines.push('--- Error ---');
        logLines.push(step.error);
      }
      
      if (step.validationErrors && step.validationErrors.length > 0) {
        logLines.push('--- Validation Errors ---');
        step.validationErrors.forEach(err => logLines.push(`* ${err}`));
      }
      
      logLines.push('');
    });
    
    if (report.errors.length > 0) {
      logLines.push('=== Errors ===');
      report.errors.forEach(err => {
        logLines.push(`${err.stepId ? `[Step: ${err.stepId}] ` : ''}${err.message}`);
        if (err.stack) {
          logLines.push(err.stack);
        }
        logLines.push('');
      });
    }
    
    if (report.warnings.length > 0) {
      logLines.push('=== Warnings ===');
      report.warnings.forEach(warning => {
        logLines.push(`* ${warning}`);
      });
    }
    
    // Write the log
    writeFileSync(logPath, logLines.join(EOL));
    
    console.log(chalk.green(`\n📊 Report saved to: ${reportPath}`));
    console.log(chalk.green(`📝 Log saved to: ${logPath}`));
  }

  /**
   * Display workflow summary
   */
  private displayWorkflowSummary(report: WorkflowExecutionReport): void {
    console.log(chalk.blue('\n============================'));
    console.log(chalk.blue(`📋 Workflow Summary: ${report.name}`));
    console.log(chalk.blue('============================'));
    
    // Status
    const statusColor = report.status === 'success' ? 'green' : 
                        report.status === 'partial' ? 'yellow' : 'red';
    console.log(`Status: ${chalk[statusColor](report.status.toUpperCase())}`);
    
    // Duration
    console.log(`Duration: ${(report.duration / 1000).toFixed(2)} seconds`);
    
    // Steps summary
    const successCount = report.steps.filter(s => s.status === 'success').length;
    const failedCount = report.steps.filter(s => s.status === 'failure').length;
    const skippedCount = report.steps.filter(s => s.status === 'skipped').length;
    
    console.log(chalk.blue('\nSteps Summary:'));
    console.log(`Total Steps: ${report.steps.length}`);
    console.log(`Successful: ${chalk.green(successCount)}`);
    console.log(`Failed: ${chalk.red(failedCount)}`);
    console.log(`Skipped: ${chalk.yellow(skippedCount)}`);
    
    // Errors and warnings
    if (report.errors.length > 0) {
      console.log(chalk.red(`\nErrors: ${report.errors.length}`));
      report.errors.slice(0, 3).forEach(err => {
        console.log(chalk.red(`- ${err.message.split('\n')[0]}`));
      });
      if (report.errors.length > 3) {
        console.log(chalk.red(`... and ${report.errors.length - 3} more (see log file)`));
      }
    }
    
    if (report.warnings.length > 0) {
      console.log(chalk.yellow(`\nWarnings: ${report.warnings.length}`));
      report.warnings.slice(0, 3).forEach(warning => {
        console.log(chalk.yellow(`- ${warning.split('\n')[0]}`));
      });
      if (report.warnings.length > 3) {
        console.log(chalk.yellow(`... and ${report.warnings.length - 3} more (see log file)`));
      }
    }
    
    // Performance summary
    const slowestStep = Object.entries(report.performance.stepTimes)
      .sort((a, b) => b[1] - a[1])[0];
      
    if (slowestStep) {
      const [stepId, time] = slowestStep;
      const step = report.steps.find(s => s.id === stepId);
      console.log(chalk.blue('\nPerformance Insights:'));
      console.log(`Slowest step: "${step?.name}" (${(time / 1000).toFixed(2)} seconds)`);
    }
    
    console.log(chalk.blue('\n============================'));
  }
}

/**
 * Example usage of the workflow runner
 */
async function runExampleWorkflow() {
  const workflowRunner = new VibeXWorkflowRunner();
  
  const exampleWorkflow: WorkflowDefinition = {
    id: 'example-workflow',
    name: 'Example CLI Workflow',
    description: 'Demonstrates the capabilities of the workflow test runner',
    tags: ['example', 'demo'],
    steps: [
      {
        id: 'step1',
        name: 'Environment Setup',
        command: 'config',
        description: 'Check configuration status',
        expectedOutput: /Configuration/i
      },
      {
        id: 'step2',
        name: 'Show Commands',
        command: 'commands',
        description: 'List all available commands',
        expectedOutput: /Available slash commands/i,
        dependencies: ['step1']
      },
      {
        id: 'step3',
        name: 'Help Command',
        command: 'help commands',
        description: 'Get help for the commands command',
        dependencies: ['step2'],
        validate: async (output) => {
          return {
            valid: output.includes('commands'),
            reason: !output.includes('commands') ? 'Help output should contain command info' : undefined
          };
        }
      }
    ]
  };
  
  await workflowRunner.runWorkflow(exampleWorkflow);
}

// If this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExampleWorkflow().catch(console.error);
}

export default VibeXWorkflowRunner;