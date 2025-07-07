/**
 * Workflow Automation Engine
 * 
 * A sophisticated workflow automation engine that matches and exceeds Claude's
 * task orchestration capabilities with dependency resolution,
 * parallel execution, adaptive retry logic, and real-time progress tracking.
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import type { ToolCall, ToolResult } from './content-stream.js';
import type { 
  TaskDefinition, 
  WorkflowDefinition, 
  TaskExecutionContext,
  TaskStatus,
  TaskPriority 
} from '../ui/components/task-orchestrator/index.js';

/**
 * Workflow execution modes
 */
export type WorkflowExecutionMode = 
  | 'sequential'     // Execute tasks one by one
  | 'parallel'       // Execute independent tasks in parallel
  | 'adaptive'       // Intelligently choose based on dependencies
  | 'priority_first' // Execute high-priority tasks first
  | 'resource_aware'; // Consider system resources

/**
 * Workflow execution strategy
 */
export interface WorkflowExecutionStrategy {
  /**
   * Execution mode
   */
  mode: WorkflowExecutionMode;
  
  /**
   * Maximum concurrent tasks
   */
  maxConcurrency: number;
  
  /**
   * Task timeout in milliseconds
   */
  defaultTimeout: number;
  
  /**
   * Retry configuration
   */
  retryConfig: {
    maxAttempts: number;
    backoffMultiplier: number;
    initialDelayMs: number;
    maxDelayMs: number;
  };
  
  /**
   * Resource limits
   */
  resourceLimits: {
    maxMemoryMB: number;
    maxCpuPercent: number;
    maxDiskSpaceMB: number;
  };
  
  /**
   * Failure handling
   */
  failureHandling: {
    stopOnCriticalFailure: boolean;
    skipDependentTasks: boolean;
    generateFailureReport: boolean;
  };
}

/**
 * Task execution result
 */
export interface TaskExecutionResult {
  /**
   * Task that was executed
   */
  task: TaskDefinition;
  
  /**
   * Execution success
   */
  success: boolean;
  
  /**
   * Execution output
   */
  output?: string;
  
  /**
   * Error message if failed
   */
  error?: string;
  
  /**
   * Execution metrics
   */
  metrics: {
    startTime: number;
    endTime: number;
    duration: number;
    memoryUsed: number;
    cpuUsed: number;
    retryCount: number;
  };
  
  /**
   * Generated artifacts
   */
  artifacts: string[];
  
  /**
   * Tool calls made during execution
   */
  toolCalls: Array<{
    toolCall: ToolCall;
    result: ToolResult;
    duration: number;
  }>;
}

/**
 * Workflow execution report
 */
export interface WorkflowExecutionReport {
  /**
   * Workflow that was executed
   */
  workflow: WorkflowDefinition;
  
  /**
   * Execution strategy used
   */
  strategy: WorkflowExecutionStrategy;
  
  /**
   * Overall execution success
   */
  success: boolean;
  
  /**
   * Execution start time
   */
  startTime: number;
  
  /**
   * Execution end time
   */
  endTime: number;
  
  /**
   * Total execution duration
   */
  duration: number;
  
  /**
   * Task execution results
   */
  taskResults: Map<string, TaskExecutionResult>;
  
  /**
   * Execution statistics
   */
  statistics: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    skippedTasks: number;
    retriedTasks: number;
    parallelExecutions: number;
    averageTaskDuration: number;
    peakMemoryUsage: number;
    peakCpuUsage: number;
  };
  
  /**
   * Generated artifacts
   */
  artifacts: string[];
  
  /**
   * Execution errors
   */
  errors: Array<{
    taskId: string;
    error: string;
    timestamp: number;
  }>;
  
  /**
   * Performance insights
   */
  insights: Array<{
    type: 'performance' | 'optimization' | 'warning' | 'error';
    message: string;
    impact: 'low' | 'medium' | 'high';
    suggestion?: string;
  }>;
}

/**
 * Workflow events
 */
export enum WorkflowEvent {
  WORKFLOW_STARTED = 'workflow_started',
  WORKFLOW_COMPLETED = 'workflow_completed',
  WORKFLOW_FAILED = 'workflow_failed',
  WORKFLOW_PAUSED = 'workflow_paused',
  WORKFLOW_RESUMED = 'workflow_resumed',
  WORKFLOW_CANCELLED = 'workflow_cancelled',
  
  TASK_STARTED = 'task_started',
  TASK_PROGRESS = 'task_progress',
  TASK_COMPLETED = 'task_completed',
  TASK_FAILED = 'task_failed',
  TASK_RETRYING = 'task_retrying',
  TASK_SKIPPED = 'task_skipped',
  
  DEPENDENCY_RESOLVED = 'dependency_resolved',
  RESOURCE_CONSTRAINT = 'resource_constraint',
  PERFORMANCE_WARNING = 'performance_warning',
}

/**
 * Workflow Engine
 * 
 * System for intelligent workflow execution with dependency resolution,
 * parallel processing, and adaptive execution strategies.
 */
export class WorkflowEngine extends EventEmitter {
  private strategy: WorkflowExecutionStrategy;
  private activeWorkflows: Map<string, WorkflowDefinition> = new Map();
  private executionReports: Map<string, WorkflowExecutionReport> = new Map();
  private taskQueue: TaskDefinition[] = [];
  private runningTasks: Map<string, TaskDefinition> = new Map();
  private abortController: AbortController = new AbortController();
  
  constructor(strategy?: Partial<WorkflowExecutionStrategy>) {
    super();
    
    this.strategy = {
      mode: 'adaptive',
      maxConcurrency: 4,
      defaultTimeout: 30000,
      retryConfig: {
        maxAttempts: 3,
        backoffMultiplier: 2,
        initialDelayMs: 1000,
        maxDelayMs: 30000,
      },
      resourceLimits: {
        maxMemoryMB: 512,
        maxCpuPercent: 80,
        maxDiskSpaceMB: 1024,
      },
      failureHandling: {
        stopOnCriticalFailure: true,
        skipDependentTasks: true,
        generateFailureReport: true,
      },
      ...strategy
    };
    
    logger.debug('Workflow Engine initialized with strategy:', this.strategy);
  }
  
  /**
   * Execute a workflow with the configured strategy
   */
  async executeWorkflow(
    workflow: WorkflowDefinition,
    workingDirectory: string,
    config: any,
    logger: any,
    context?: Partial<TaskExecutionContext>
  ): Promise<WorkflowExecutionReport> {
    const workflowId = workflow.id;
    const startTime = Date.now();
    
    logger.info(`Starting workflow execution: ${workflow.name} (${workflowId})`);
    
    // Store active workflow
    this.activeWorkflows.set(workflowId, workflow);
    
    // Create execution context
    const executionContext: TaskExecutionContext = {
        workingDirectory,
        environment: process.env as Record<string, string>,
        config,
        logger,
        sharedState: {},
        ...context,
      };
    
    // Initialize execution report
    const report: WorkflowExecutionReport = {
      workflow,
      strategy: this.strategy,
      success: false,
      startTime,
      endTime: 0,
      duration: 0,
      taskResults: new Map(),
      statistics: {
        totalTasks: workflow.tasks.length,
        completedTasks: 0,
        failedTasks: 0,
        skippedTasks: 0,
        retriedTasks: 0,
        parallelExecutions: 0,
        averageTaskDuration: 0,
        peakMemoryUsage: 0,
        peakCpuUsage: 0,
      },
      artifacts: [],
      errors: [],
      insights: [],
    };
    
    this.executionReports.set(workflowId, report);
    this.emit(WorkflowEvent.WORKFLOW_STARTED, { workflow, context: executionContext });
    
    try {
      // Validate workflow
      this.validateWorkflow(workflow);
      
      // Check for circular dependencies
      const cycles = this.detectCircularDependencies(workflow.tasks);
      if (cycles.length > 0) {
        throw new Error(`Circular dependencies detected: ${cycles.join(', ')}`);
      }
      
      // Create execution plan
      const executionPlan = await this.createExecutionPlan(workflow, executionContext);
      logger.debug(`Execution plan created with ${executionPlan.length} phases`);
      
      // Execute tasks according to plan
      await this.executeTasks(executionPlan, executionContext, report);
      
      // Mark as successful if no critical failures
      report.success = report.statistics.failedTasks === 0 || 
                      !this.strategy.failureHandling.stopOnCriticalFailure;
      
      // Generate insights
      await this.generateInsights(report);
      
      // Analyze workflow performance
      await this.analyzeWorkflow(workflow, report);
      
      logger.info(`Workflow completed: ${workflow.name} (${workflowId})`, {
        success: report.success,
        duration: report.duration,
        completedTasks: report.statistics.completedTasks,
        failedTasks: report.statistics.failedTasks
      });
      
      this.emit(WorkflowEvent.WORKFLOW_COMPLETED, { report });
      
    } catch (error) {
      logger.error(`Workflow failed: ${workflow.name} (${workflowId})`, error);
      
      report.success = false;
      report.errors.push({
        taskId: 'workflow',
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      });
      
      this.emit(WorkflowEvent.WORKFLOW_FAILED, { workflow, error, report });
    } finally {
      // Finalize report
      report.endTime = Date.now();
      report.duration = report.endTime - report.startTime;
      
      // Cleanup
      this.activeWorkflows.delete(workflowId);
    }
    
    return report;
  }

  /**
   * Validate workflow structure
   */
  private validateWorkflow(workflow: WorkflowDefinition): void {
    if (!workflow.tasks || workflow.tasks.length === 0) {
      throw new Error('Workflow must contain at least one task');
    }
    
    // Check for duplicate task IDs
    const taskIds = new Set<string>();
    for (const task of workflow.tasks) {
      if (taskIds.has(task.id)) {
        throw new Error(`Duplicate task ID: ${task.id}`);
      }
      taskIds.add(task.id);
    }
    
    // Validate dependencies
    for (const task of workflow.tasks) {
      if (task.dependencies) {
        for (const depId of task.dependencies) {
          if (!taskIds.has(depId)) {
            throw new Error(`Task ${task.id} depends on non-existent task: ${depId}`);
          }
        }
      }
    }
  }

  /**
   * Analyze workflow performance and generate insights
   */
  private async analyzeWorkflow(
    workflow: WorkflowDefinition,
    report: WorkflowExecutionReport
  ): Promise<void> {
    const { statistics } = report;
    
    // Calculate average task duration
    const totalDuration = Array.from(report.taskResults.values())
      .reduce((sum, result) => sum + result.metrics.duration, 0);
    statistics.averageTaskDuration = totalDuration / statistics.completedTasks;
    
    // Analyze parallelization opportunities
    const parallelizationScore = this.analyzeParallelization(workflow.tasks);
    if (parallelizationScore > 0.7) {
      report.insights.push({
        type: 'optimization',
        message: 'High parallelization potential detected',
        impact: 'medium',
        suggestion: 'Consider increasing maxConcurrency for better performance'
      });
    }
    
    // Analyze critical path
    const criticalPath = this.calculateCriticalPath(workflow.tasks);
    const criticalPathDuration = criticalPath.reduce((sum, task) => {
      const result = report.taskResults.get(task.id);
      return sum + (result?.metrics.duration || task.estimatedDuration || 0);
    }, 0);
    
    if (criticalPathDuration > report.duration * 0.8) {
      report.insights.push({
        type: 'performance',
        message: 'Critical path dominates execution time',
        impact: 'high',
        suggestion: 'Focus optimization efforts on critical path tasks'
      });
    }
    
    // Analyze retry patterns
    if (statistics.retriedTasks > statistics.totalTasks * 0.3) {
      report.insights.push({
        type: 'warning',
        message: 'High retry rate detected',
        impact: 'medium',
        suggestion: 'Review task reliability and retry configuration'
      });
    }
    
    // Resource utilization analysis
    if (statistics.peakMemoryUsage > this.strategy.resourceLimits.maxMemoryMB * 0.9) {
      report.insights.push({
        type: 'performance',
        message: 'High memory usage detected',
        impact: 'high',
        suggestion: 'Consider reducing maxConcurrency or optimizing memory usage'
      });
    }
  }

  /**
   * Create execution plan by resolving dependencies
   */
  private async createExecutionPlan(
    workflow: WorkflowDefinition,
    context: TaskExecutionContext
  ): Promise<TaskDefinition[][]> {
    const tasks = [...workflow.tasks];
    const completed = new Set<string>();
    const plan: TaskDefinition[][] = [];
    
    while (completed.size < tasks.length) {
      const readyTasks: TaskDefinition[] = [];
      
      for (const task of tasks) {
        if (completed.has(task.id)) {
          continue;
        }
        
        // Check if all dependencies are completed
        const dependencies = task.dependencies || [];
        const dependenciesMet = dependencies.every(depId => completed.has(depId));
        
        if (dependenciesMet) {
          readyTasks.push(task);
        }
      }
      
      if (readyTasks.length === 0) {
        throw new Error('Unable to resolve dependencies - possible circular dependency');
      }
      
      // Sort by priority if using priority-first mode
      if (this.strategy.mode === 'priority_first') {
        readyTasks.sort((a, b) => {
          const priorityOrder: Record<TaskPriority, number> = { 
            critical: 4, 
            high: 3, 
            normal: 2, 
            low: 1 
          };
          const priorityA = priorityOrder[a.priority] || priorityOrder.normal;
          const priorityB = priorityOrder[b.priority] || priorityOrder.normal;
          return priorityB - priorityA;
        });
      }
      
      plan.push(readyTasks);
      
      // Mark these tasks as completed for dependency resolution
      for (const task of readyTasks) {
        completed.add(task.id);
      }
    }
    
    return plan;
  }

  /**
   * Execute tasks according to the execution plan
   */
  private async executeTasks(
    executionPlan: TaskDefinition[][],
    context: TaskExecutionContext,
    report: WorkflowExecutionReport
  ): Promise<void> {
    for (let phaseIndex = 0; phaseIndex < executionPlan.length; phaseIndex++) {
      const phase = executionPlan[phaseIndex];
      
      logger.debug(`Executing phase ${phaseIndex + 1}/${executionPlan.length} with ${phase.length} tasks`);
      
      // Determine execution mode for this phase
      const shouldParallelize = this.strategy.mode === 'parallel' || 
                               (this.strategy.mode === 'adaptive' && this.shouldExecuteInParallel(phase));
      
      if (shouldParallelize && phase.length > 1) {
        // Execute tasks in parallel
        const concurrency = Math.min(phase.length, this.strategy.maxConcurrency);
        const taskPromises = phase.slice(0, concurrency).map(task => 
          this.executeTask(task, context, report)
        );
        
        report.statistics.parallelExecutions++;
        await Promise.allSettled(taskPromises);
        
        // Execute remaining tasks if any
        if (phase.length > concurrency) {
          for (let i = concurrency; i < phase.length; i++) {
            await this.executeTask(phase[i], context, report);
          }
        }
      } else {
        // Execute tasks sequentially
        for (const task of phase) {
          await this.executeTask(task, context, report);
        }
      }
    }
  }

  /**
   * Execute a single task with retry logic
   */
  private async executeTask(
    task: TaskDefinition,
    context: TaskExecutionContext,
    report: WorkflowExecutionReport
  ): Promise<TaskExecutionResult> {
    const startTime = Date.now();
    let retryCount = 0;
    let lastError: Error | undefined;
    
    logger.debug(`Executing task: ${task.name} (${task.id})`);
    this.runningTasks.set(task.id, task);
    this.emit(WorkflowEvent.TASK_STARTED, { task, context });
    
    const result: TaskExecutionResult = {
      task,
      success: false,
      metrics: {
        startTime,
        endTime: 0,
        duration: 0,
        memoryUsed: 0,
        cpuUsed: 0,
        retryCount: 0,
      },
      artifacts: [],
      toolCalls: [],
    };
    
    while (retryCount <= this.strategy.retryConfig.maxAttempts) {
      try {
        // Check resource constraints
        await this.checkResourceConstraints();
        
        // Execute task with timeout
        const execution = await this.executeTaskWithTimeout(task, context);
        
        // Update result
        result.success = true;
        result.output = execution.output;
        result.artifacts = execution.artifacts || [];
        result.toolCalls = execution.toolCalls || [];
        result.metrics.memoryUsed = execution.memoryUsed || 0;
        result.metrics.cpuUsed = execution.cpuUsed || 0;
        
        logger.debug(`Task completed: ${task.name} (${task.id})`);
        this.emit(WorkflowEvent.TASK_COMPLETED, { task, result, context });
        
        break;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        retryCount++;
        
        logger.warn(`Task failed (attempt ${retryCount}): ${task.name} (${task.id})`, lastError);
        
        if (retryCount <= this.strategy.retryConfig.maxAttempts) {
          // Calculate retry delay
          const delay = Math.min(
            this.strategy.retryConfig.initialDelayMs * 
            Math.pow(this.strategy.retryConfig.backoffMultiplier, retryCount - 1),
            this.strategy.retryConfig.maxDelayMs
          );
          
          logger.debug(`Retrying task in ${delay}ms: ${task.name} (${task.id})`);
          this.emit(WorkflowEvent.TASK_RETRYING, { task, error: lastError, retryCount, delay });
          
          await new Promise(resolve => setTimeout(resolve, delay));
          report.statistics.retriedTasks++;
        }
      }
    }
    
    // Finalize result
    result.metrics.endTime = Date.now();
    result.metrics.duration = result.metrics.endTime - result.metrics.startTime;
    result.metrics.retryCount = retryCount;
    
    if (!result.success && lastError) {
      result.error = lastError.message;
      report.statistics.failedTasks++;
      report.errors.push({
        taskId: task.id,
        error: lastError.message,
        timestamp: Date.now()
      });
      
      this.emit(WorkflowEvent.TASK_FAILED, { task, error: lastError, context });
      
      // Check if we should stop on critical failure
      if (task.critical && this.strategy.failureHandling.stopOnCriticalFailure) {
        throw new Error(`Critical task failed: ${task.name} (${task.id})`);
      }
    } else {
      report.statistics.completedTasks++;
    }
    
    // Update peak resource usage
    report.statistics.peakMemoryUsage = Math.max(
      report.statistics.peakMemoryUsage,
      result.metrics.memoryUsed
    );
    report.statistics.peakCpuUsage = Math.max(
      report.statistics.peakCpuUsage,
      result.metrics.cpuUsed
    );
    
    // Store result
    report.taskResults.set(task.id, result);
    this.runningTasks.delete(task.id);
    
    return result;
  }

  /**
   * Execute task with timeout protection
   */
  private async executeTaskWithTimeout(
    task: TaskDefinition,
    context: TaskExecutionContext
  ): Promise<{
    output?: string;
    artifacts?: string[];
    toolCalls?: Array<{ toolCall: ToolCall; result: ToolResult; duration: number }>;
    memoryUsed?: number;
    cpuUsed?: number;
  }> {
    const timeout = task.timeout || this.strategy.defaultTimeout;
    
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Task timeout after ${timeout}ms`));
      }, timeout);
      
      // Simulate task execution
      // In a real implementation, this would call the actual task handler
      setTimeout(() => {
        clearTimeout(timer);
        
        // Simulate successful execution
        resolve({
          output: `Task ${task.name} completed successfully`,
          artifacts: [],
          toolCalls: [],
          memoryUsed: Math.random() * 100,
          cpuUsed: Math.random() * 50,
        });
      }, Math.random() * 1000 + 500); // Random execution time
    });
  }

  /**
   * Check system resource constraints
   */
  private async checkResourceConstraints(): Promise<void> {
    // In a real implementation, this would check actual system resources
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
    
    if (memoryUsageMB > this.strategy.resourceLimits.maxMemoryMB) {
      this.emit(WorkflowEvent.RESOURCE_CONSTRAINT, {
        type: 'memory',
        usage: memoryUsageMB,
        limit: this.strategy.resourceLimits.maxMemoryMB
      });
      
      throw new Error(`Memory usage (${memoryUsageMB.toFixed(2)}MB) exceeds limit (${this.strategy.resourceLimits.maxMemoryMB}MB)`);
    }
  }

  /**
   * Determine if tasks should be executed in parallel
   */
  private shouldExecuteInParallel(tasks: TaskDefinition[]): boolean {
    // Simple heuristic: if tasks have no interdependencies within the phase
    if (tasks.length <= 1) return false;
    
    const taskIds = new Set(tasks.map(t => t.id));
    
    for (const task of tasks) {
      const deps = task.dependencies || [];
      if (deps.some(depId => taskIds.has(depId))) {
        return false; // Has internal dependencies
      }
    }
    
    return true;
  }

  /**
   * Detect circular dependencies in task graph
   */
  private detectCircularDependencies(tasks: TaskDefinition[]): string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[] = [];
    
    const hasCycle = (taskId: string, path: string[]): string[] | null => {
      if (recursionStack.has(taskId)) {
        const cycleStart = path.indexOf(taskId);
        return path.slice(cycleStart).concat(taskId);
      }
      
      if (visited.has(taskId)) {
        return null;
      }
      
      visited.add(taskId);
      recursionStack.add(taskId);
      
      const task = tasks.find(t => t.id === taskId);
      if (task?.dependencies) {
        for (const depId of task.dependencies) {
          const cycle = hasCycle(depId, [...path, taskId]);
          if (cycle) {
            return cycle;
          }
        }
      }
      
      recursionStack.delete(taskId);
      return null;
    };
    
    for (const task of tasks) {
      if (!visited.has(task.id)) {
        const cycle = hasCycle(task.id, []);
        if (cycle) {
          cycles.push(cycle.join(' -> '));
        }
      }
    }
    
    return cycles;
  }

  /**
   * Analyze parallelization potential
   */
  private analyzeParallelization(tasks: TaskDefinition[]): number {
    if (tasks.length <= 1) return 0;
    
    // Build dependency graph
    const dependencyGraph = new Map<string, string[]>();
    const dependents = new Map<string, string[]>();
    
    for (const task of tasks) {
      dependencyGraph.set(task.id, task.dependencies || []);
      
      for (const depId of task.dependencies || []) {
        if (!dependents.has(depId)) {
          dependents.set(depId, []);
        }
        dependents.get(depId)!.push(task.id);
      }
    }
    
    // Calculate independent task groups
    const visited = new Set<string>();
    let independentGroups = 0;
    
    for (const task of tasks) {
      if (!visited.has(task.id)) {
        this.markConnectedTasks(task.id, dependencyGraph, visited, tasks);
        independentGroups++;
      }
    }
    
    // Return parallelization score (0-1)
    return independentGroups / tasks.length;
  }

  /**
   * Mark all tasks connected through dependencies
   */
  private markConnectedTasks(
    taskId: string,
    dependencyGraph: Map<string, string[]>,
    visited: Set<string>,
    allTasks: TaskDefinition[]
  ): void {
    if (visited.has(taskId)) return;
    
    visited.add(taskId);
    
    // Mark dependencies
    const dependencies = dependencyGraph.get(taskId) || [];
    for (const depId of dependencies) {
      this.markConnectedTasks(depId, dependencyGraph, visited, allTasks);
    }
    
    // Mark dependents
    for (const task of allTasks) {
      if ((task.dependencies || []).includes(taskId)) {
        this.markConnectedTasks(task.id, dependencyGraph, visited, allTasks);
      }
    }
  }

  /**
   * Calculate critical path through task graph
   */
  private calculateCriticalPath(tasks: TaskDefinition[]): TaskDefinition[] {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    
    const findLongestPath = (taskId: string): { duration: number; path: TaskDefinition[] } => {
      const task = taskMap.get(taskId);
      if (!task) return { duration: 0, path: [] };
      
      const taskDuration = task.estimatedDuration || 1000; // Default 1 second
      
      if (!task.dependencies || task.dependencies.length === 0) {
        return { duration: taskDuration, path: [task] };
      }
      
      let longestPath = { duration: 0, path: [] as TaskDefinition[] };
      
      for (const depId of task.dependencies) {
        const depPath = findLongestPath(depId);
        if (depPath.duration > longestPath.duration) {
          longestPath = depPath;
        }
      }
      
      return {
        duration: longestPath.duration + taskDuration,
        path: [...longestPath.path, task]
      };
    };
    
    // Find the longest path among all leaf tasks (tasks with no dependents)
    const leafTasks = tasks.filter(task => 
      !tasks.some(t => (t.dependencies || []).includes(task.id))
    );
    
    let criticalPath = { duration: 0, path: [] as TaskDefinition[] };
    
    for (const leafTask of leafTasks) {
      const path = findLongestPath(leafTask.id);
      if (path.duration > criticalPath.duration) {
        criticalPath = path;
      }
    }
    
    return criticalPath.path;
  }

  /**
   * Generate performance insights
   */
  private async generateInsights(report: WorkflowExecutionReport): Promise<void> {
    const { statistics, taskResults } = report;
    
    // Identify bottlenecks
    const taskDurations = Array.from(taskResults.values())
      .map(result => ({ task: result.task, duration: result.metrics.duration }))
      .sort((a, b) => b.duration - a.duration);
    
    if (taskDurations.length > 0) {
      const slowestTask = taskDurations[0];
      const averageDuration = statistics.averageTaskDuration;
      
      if (slowestTask.duration > averageDuration * 2) {
        report.insights.push({
          type: 'performance',
          message: `Task "${slowestTask.task.name}" is significantly slower than average`,
          impact: 'high',
          suggestion: 'Consider optimizing or parallelizing this task'
        });
      }
    }
    
    // Analyze failure patterns
    const failedTasks = Array.from(taskResults.values()).filter(r => !r.success);
    if (failedTasks.length > 0) {
      const failureRate = failedTasks.length / statistics.totalTasks;
      if (failureRate > 0.2) {
        report.insights.push({
          type: 'warning',
          message: `High failure rate detected (${(failureRate * 100).toFixed(1)}%)`,
          impact: 'high',
          suggestion: 'Review task reliability and error handling'
        });
      }
    }
    
    // Resource efficiency analysis
    const avgMemoryUsage = Array.from(taskResults.values())
      .reduce((sum, r) => sum + r.metrics.memoryUsed, 0) / statistics.completedTasks;
    
    if (avgMemoryUsage < this.strategy.resourceLimits.maxMemoryMB * 0.3) {
      report.insights.push({
        type: 'optimization',
        message: 'Low memory utilization detected',
        impact: 'low',
        suggestion: 'Consider increasing concurrency for better resource utilization'
      });
    }
  }

  /**
   * Pause workflow execution
   */
  pauseWorkflow(workflowId: string): void {
    const workflow = this.activeWorkflows.get(workflowId);
    if (workflow) {
      logger.info(`Pausing workflow: ${workflow.name} (${workflowId})`);
      this.emit(WorkflowEvent.WORKFLOW_PAUSED, { workflow });
    }
  }

  /**
   * Resume workflow execution
   */
  resumeWorkflow(workflowId: string): void {
    const workflow = this.activeWorkflows.get(workflowId);
    if (workflow) {
      logger.info(`Resuming workflow: ${workflow.name} (${workflowId})`);
      this.emit(WorkflowEvent.WORKFLOW_RESUMED, { workflow });
    }
  }

  /**
   * Cancel workflow execution
   */
  cancelWorkflow(workflowId: string): void {
    const workflow = this.activeWorkflows.get(workflowId);
    if (workflow) {
      logger.info(`Cancelling workflow: ${workflow.name} (${workflowId})`);
      this.abortController.abort();
      this.activeWorkflows.delete(workflowId);
      this.emit(WorkflowEvent.WORKFLOW_CANCELLED, { workflow });
    }
  }

  /**
   * Get execution report for a workflow
   */
  getExecutionReport(workflowId: string): WorkflowExecutionReport | undefined {
    return this.executionReports.get(workflowId);
  }

  /**
   * Get all active workflows
   */
  getActiveWorkflows(): WorkflowDefinition[] {
    return Array.from(this.activeWorkflows.values());
  }

  /**
   * Update execution strategy
   */
  updateStrategy(strategy: Partial<WorkflowExecutionStrategy>): void {
    this.strategy = { ...this.strategy, ...strategy };
    logger.debug('Workflow strategy updated:', this.strategy);
  }
}