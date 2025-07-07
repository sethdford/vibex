/**
 * Demo Workflow Service - Clean Architecture
 * 
 * Single Responsibility: Demo workflow generation and testing utilities
 * Following Gemini CLI's focused service patterns
 */

import type { 
  WorkflowDefinition, 
  TaskDefinition, 
  TaskExecutionContext 
} from '../task-orchestrator/types.js';
import type { DemoWorkflowType } from './types.js';
import { logger } from '../../../utils/logger.js';

/**
 * Demo Workflow Service
 * Focus: Creating demo workflows for testing and demonstration
 */
export class DemoWorkflowService {
  private baseContext: TaskExecutionContext;

  constructor() {
    this.baseContext = this.createBaseContext();
  }

  /**
   * Create demo workflow
   */
  createDemoWorkflow(type: DemoWorkflowType): WorkflowDefinition {
    logger.debug('Creating demo workflow', { type });

    switch (type) {
      case 'simple':
        return this.createSimpleWorkflow();
      case 'complex':
        return this.createComplexWorkflow();
      case 'parallel':
        return this.createParallelWorkflow();
      default:
        throw new Error(`Unknown demo workflow type: ${type}`);
    }
  }

  /**
   * Get available demo workflow types
   */
  getAvailableTypes(): DemoWorkflowType[] {
    return ['simple', 'complex', 'parallel'];
  }

  /**
   * Get demo workflow description
   */
  getWorkflowDescription(type: DemoWorkflowType): string {
    switch (type) {
      case 'simple':
        return 'A simple 3-task workflow for basic testing';
      case 'complex':
        return 'A complex workflow with multiple dependencies and priorities';
      case 'parallel':
        return 'A workflow optimized for parallel execution';
      default:
        return 'Unknown workflow type';
    }
  }

  // ============================================================================
  // Private Methods - Workflow Creators
  // ============================================================================

  /**
   * Create simple demo workflow
   */
    private createSimpleWorkflow(): WorkflowDefinition {
    return {
      id: `demo-simple-${Date.now()}`,
      name: 'Simple Demo Workflow',
      description: 'A simple workflow for testing real-time integration',
      tasks: [
        {
          id: 'task-1',
          name: 'Initialize Project',
          description: 'Set up project structure and dependencies',
          category: 'file_ops',
          status: 'pending',
          priority: 'high',
          dependencies: [],
          estimatedDuration: 5000,
          progress: 0,
          toolCalls: [],
          cancellable: true,
          retryable: true,
          execute: async (context) => {
            logger.debug('Executing task-1: Initialize Project');
            await this.simulateWork(2000, 'Initializing...');
          },
        },
        {
          id: 'task-2',
          name: 'Run Analysis',
          description: 'Analyze code quality and performance',
          category: 'analysis',
          status: 'pending',
          priority: 'normal',
          dependencies: ['task-1'],
          estimatedDuration: 8000,
          progress: 0,
          toolCalls: [],
          cancellable: true,
          retryable: true,
          execute: async (context) => {
            logger.debug('Executing task-2: Run Analysis');
            await this.simulateProgressiveWork(8000, 'Analyzing...');
          },
        },
        {
          id: 'task-3',
          name: 'Generate Report',
          description: 'Create comprehensive analysis report',
          category: 'code_gen',
          status: 'pending',
          priority: 'normal',
          dependencies: ['task-2'],
          estimatedDuration: 3000,
          progress: 0,
          toolCalls: [],
          cancellable: true,
          retryable: true,
          execute: async (context) => {
            logger.debug('Executing task-3: Generate Report');
            await this.simulateWork(1500, 'Generating report...');
          },
        },
      ],
      context: this.baseContext,
      status: 'idle',
      progress: 0,
    };
  }

  /**
   * Create complex demo workflow
   */
    private createComplexWorkflow(): WorkflowDefinition {
    return {
      id: `demo-complex-${Date.now()}`,
      name: 'Complex Demo Workflow',
      description: 'A complex workflow with multiple dependencies and priorities',
      tasks: [
        {
          id: 'task-1',
          name: 'Critical Setup',
          description: 'Critical system initialization',
          category: 'deployment',
          status: 'pending',
          priority: 'critical',
          dependencies: [],
          estimatedDuration: 10000,
          progress: 0,
          toolCalls: [],
          cancellable: false,
          retryable: true,
          maxRetries: 5,
          execute: async (context) => {
            logger.debug('Executing task-1: Critical Setup');
            await this.simulateProgressiveWork(10000, 'Setting up system...');
          },
        },
        {
          id: 'task-2',
          name: 'Data Processing',
          description: 'Process large dataset',
          category: 'analysis',
          status: 'pending',
          priority: 'high',
          dependencies: ['task-1'],
          estimatedDuration: 15000,
          progress: 0,
          toolCalls: [],
          cancellable: true,
          retryable: true,
          execute: async (context) => {
            logger.debug('Executing task-2: Data Processing');
            await this.simulateProgressiveWork(15000, 'Processing data...');
          },
        },
        {
          id: 'task-3',
          name: 'Validation Tests',
          description: 'Run comprehensive validation suite',
          category: 'testing',
          status: 'pending',
          priority: 'high',
          dependencies: ['task-1'],
          estimatedDuration: 12000,
          progress: 0,
          toolCalls: [],
          cancellable: true,
          retryable: true,
          execute: async (context) => {
            logger.debug('Executing task-3: Validation Tests');
            await this.simulateProgressiveWork(12000, 'Running tests...');
          },
        },
        {
          id: 'task-4',
          name: 'Performance Optimization',
          description: 'Optimize system performance',
          category: 'analysis',
          status: 'pending',
          priority: 'normal',
          dependencies: ['task-2', 'task-3'],
          estimatedDuration: 8000,
          progress: 0,
          toolCalls: [],
          cancellable: true,
          retryable: true,
          execute: async (context) => {
            logger.debug('Executing task-4: Performance Optimization');
            await this.simulateProgressiveWork(8000, 'Optimizing...');
          },
        },
        {
          id: 'task-5',
          name: 'Documentation',
          description: 'Generate technical documentation',
          category: 'code_gen',
          status: 'pending',
          priority: 'low',
          dependencies: ['task-4'],
          estimatedDuration: 5000,
          progress: 0,
          toolCalls: [],
          cancellable: true,
          retryable: false,
          execute: async (context) => {
            logger.debug('Executing task-5: Documentation');
            await this.simulateWork(5000, 'Generating docs...');
          },
        },
      ],
      context: this.baseContext,
      status: 'idle',
      progress: 0,
    };
  }

  /**
   * Create parallel demo workflow
   */
    private createParallelWorkflow(): WorkflowDefinition {
    return {
      id: `demo-parallel-${Date.now()}`,
      name: 'Parallel Demo Workflow',
      description: 'A workflow optimized for parallel execution',
      tasks: [
        {
          id: 'task-1',
          name: 'Frontend Build',
          description: 'Build frontend application',
          category: 'code_gen',
          status: 'pending',
          priority: 'high',
          dependencies: [],
          estimatedDuration: 8000,
          progress: 0,
          toolCalls: [],
          cancellable: true,
          retryable: true,
          execute: async (context) => {
            logger.debug('Executing task-1: Frontend Build');
            await this.simulateProgressiveWork(8000, 'Building frontend...');
          },
        },
        {
          id: 'task-2',
          name: 'Backend Build',
          description: 'Build backend services',
          category: 'code_gen',
          status: 'pending',
          priority: 'high',
          dependencies: [],
          estimatedDuration: 10000,
          progress: 0,
          toolCalls: [],
          cancellable: true,
          retryable: true,
          execute: async (context) => {
            logger.debug('Executing task-2: Backend Build');
            await this.simulateProgressiveWork(10000, 'Building backend...');
          },
        },
        {
          id: 'task-3',
          name: 'Database Migration',
          description: 'Run database migrations',
          category: 'deployment',
          status: 'pending',
          priority: 'high',
          dependencies: [],
          estimatedDuration: 6000,
          progress: 0,
          toolCalls: [],
          cancellable: true,
          retryable: true,
          execute: async (context) => {
            logger.debug('Executing task-3: Database Migration');
            await this.simulateProgressiveWork(6000, 'Migrating database...');
          },
        },
        {
          id: 'task-4',
          name: 'Integration Tests',
          description: 'Run integration test suite',
          category: 'testing',
          status: 'pending',
          priority: 'normal',
          dependencies: ['task-1', 'task-2', 'task-3'],
          estimatedDuration: 12000,
          progress: 0,
          toolCalls: [],
          cancellable: true,
          retryable: true,
          execute: async (context) => {
            logger.debug('Executing task-4: Integration Tests');
            await this.simulateProgressiveWork(12000, 'Running integration tests...');
          },
        },
      ],
      context: this.baseContext,
      status: 'idle',
      progress: 0,
    };
  }

  // ============================================================================
  // Private Methods - Utilities
  // ============================================================================

  /**
   * Create base execution context
   */
    private createBaseContext(): TaskExecutionContext {
    return {
      workingDirectory: process.cwd(),
      environment: Object.fromEntries(
        Object.entries(process.env).filter(([_, value]) => value !== undefined)
      ) as Record<string, string>,
      sharedState: {},
    };
  }

  /**
   * Simulate work with fixed duration
   */
  private async simulateWork(duration: number, message?: string): Promise<void> {
    if (message) {
      logger.debug(`Simulating work: ${message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, duration));
  }

  /**
   * Simulate work with progressive updates
   */
  private async simulateProgressiveWork(duration: number, message?: string): Promise<void> {
    if (message) {
      logger.debug(`Simulating progressive work: ${message}`);
    }
    
    const steps = 10;
    const stepDuration = duration / steps;
    
    for (let i = 0; i < steps; i++) {
      await new Promise(resolve => setTimeout(resolve, stepDuration));
      // Progress would be updated by the task execution framework
    }
  }
}

/**
 * Factory function for creating demo workflow service
 */
export function createDemoWorkflowService(): DemoWorkflowService {
  return new DemoWorkflowService();
}