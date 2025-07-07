/**
 * Phase Orchestrator - Clean Architecture like Gemini CLI
 * 
 * Single responsibility: Coordinate phase services without business logic
 * Replaces the PhaseManager monolith
 */

import { EventEmitter } from 'events';
import { createUserError } from '../errors/formatter.js';

// Service imports
import { PhaseLifecycleService, type PhaseLifecycleConfig } from './phase-lifecycle-service.js';
import { PhaseProgressService, type PhaseProgressConfig } from './phase-progress-service.js';

// Types
import { 
  ProductPhase, 
  PhaseType, 
  PhaseStatus,
  PhaseProgress,
  PhaseHealth 
} from './phase-lifecycle-service.js';

/**
 * Phase orchestrator configuration
 */
export interface PhaseOrchestratorConfig {
  lifecycle: Partial<PhaseLifecycleConfig>;
  progress: Partial<PhaseProgressConfig>;
  enableEventForwarding: boolean;
  enableHealthMonitoring: boolean;
}

/**
 * Orchestrator result pattern
 */
export interface OrchestratorResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
  timing?: {
    startTime: number;
    endTime: number;
    duration: number;
  };
}

/**
 * Phase orchestrator events
 */
export interface PhaseOrchestratorEvents {
  'phase-lifecycle-event': (event: string, data: any) => void;
  'phase-progress-event': (event: string, data: any) => void;
  'orchestrator-ready': () => void;
  'error': (error: Error) => void;
}

/**
 * Phase orchestrator - coordinates all phase services
 */
export class PhaseOrchestrator extends EventEmitter {
  private config: PhaseOrchestratorConfig;
  private lifecycleService: PhaseLifecycleService;
  private progressService: PhaseProgressService;
  private initialized = false;

  constructor(config: PhaseOrchestratorConfig) {
    super();
    this.config = config;
    
    // Initialize services
    this.lifecycleService = new PhaseLifecycleService({
      maxConcurrentPhases: 3,
      defaultPhaseDuration: 30,
      enableAutoTransitions: true,
      completionThreshold: 80,
      healthCheckInterval: 60,
      ...config.lifecycle
    });
    
    this.progressService = new PhaseProgressService({
      healthCheckInterval: 60,
      progressUpdateThreshold: 5,
      enableAutomaticInsights: true,
      healthScoreWeights: {
        objectives: 0.3,
        deliverables: 0.3,
        criteria: 0.2,
        timeline: 0.1,
        team: 0.1
      },
      ...config.progress
    });
  }

  /**
   * Initialize the orchestrator and all services
   */
  async initialize(): Promise<OrchestratorResult<void>> {
    const startTime = Date.now();
    
    try {
      if (this.initialized) {
        return {
          success: true,
          warnings: ['Orchestrator already initialized']
        };
      }

      // Initialize services in parallel
      const [lifecycleResult, progressResult] = await Promise.all([
        this.lifecycleService.initialize(),
        this.progressService.initialize()
      ]);

      // Check for initialization errors
      if (!lifecycleResult.success) {
        throw new Error(`Lifecycle service initialization failed: ${lifecycleResult.error}`);
      }
      
      if (!progressResult.success) {
        throw new Error(`Progress service initialization failed: ${progressResult.error}`);
      }

      // Setup event forwarding
      if (this.config.enableEventForwarding) {
        this.setupEventForwarding();
      }
      
      // Setup service integration
      this.setupServiceIntegration();
      
      this.initialized = true;
      this.emit('orchestrator-ready');
      
      return {
        success: true,
        timing: {
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
      this.emit('error', createUserError(errorMessage));
      
      return {
        success: false,
        error: errorMessage,
        timing: {
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Create a new phase (delegates to lifecycle service)
   */
  async createPhase(
    productId: string,
    type: PhaseType,
    options: Partial<ProductPhase> = {}
  ): Promise<OrchestratorResult<ProductPhase>> {
    const startTime = Date.now();
    
    try {
      if (!this.initialized) {
        throw new Error('Orchestrator not initialized');
      }

      const result = await this.lifecycleService.createPhase(productId, type, options);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error,
          timing: {
            startTime,
            endTime: Date.now(),
            duration: Date.now() - startTime
          }
        };
      }

      // Calculate initial progress
      if (result.data) {
        await this.progressService.calculatePhaseProgress(result.data);
      }

      return {
        success: true,
        data: result.data,
        timing: {
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown phase creation error';
      this.emit('error', createUserError(errorMessage));
      
      return {
        success: false,
        error: errorMessage,
        timing: {
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Start a phase (delegates to lifecycle service)
   */
  async startPhase(phaseId: string): Promise<OrchestratorResult<ProductPhase>> {
    const startTime = Date.now();
    
    try {
      const result = await this.lifecycleService.startPhase(phaseId);
      
      if (result.success && result.data) {
        // Update progress and health when phase starts
        await Promise.all([
          this.progressService.calculatePhaseProgress(result.data),
          this.progressService.assessPhaseHealth(result.data)
        ]);
      }

      return {
        ...result,
        timing: {
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown phase start error';
      this.emit('error', createUserError(errorMessage));
      
      return {
        success: false,
        error: errorMessage,
        timing: {
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Complete a phase (delegates to lifecycle service)
   */
  async completePhase(phaseId: string): Promise<OrchestratorResult<ProductPhase>> {
    const startTime = Date.now();
    
    try {
      const result = await this.lifecycleService.completePhase(phaseId);
      
      if (result.success && result.data) {
        // Final progress and health assessment
        await Promise.all([
          this.progressService.calculatePhaseProgress(result.data),
          this.progressService.assessPhaseHealth(result.data)
        ]);
      }

      return {
        ...result,
        timing: {
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown phase completion error';
      this.emit('error', createUserError(errorMessage));
      
      return {
        success: false,
        error: errorMessage,
        timing: {
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Get phase with progress and health data
   */
  async getPhaseWithMetrics(phaseId: string): Promise<OrchestratorResult<{
    phase: ProductPhase;
    progress: PhaseProgress;
    health: PhaseHealth;
  }>> {
    const startTime = Date.now();
    
    try {
      const phase = this.lifecycleService.getPhase(phaseId);
      if (!phase) {
        throw new Error(`Phase ${phaseId} not found`);
      }

      // Get progress and health in parallel
      const [progressResult, healthResult] = await Promise.all([
        this.progressService.calculatePhaseProgress(phase),
        this.progressService.assessPhaseHealth(phase)
      ]);

      if (!progressResult.success || !healthResult.success) {
        throw new Error('Failed to calculate metrics');
      }

      return {
        success: true,
        data: {
          phase,
          progress: progressResult.data!,
          health: healthResult.data!
        },
        timing: {
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown metrics retrieval error';
      this.emit('error', createUserError(errorMessage));
      
      return {
        success: false,
        error: errorMessage,
        timing: {
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Get phases by product with metrics
   */
  async getPhasesByProductWithMetrics(productId: string): Promise<OrchestratorResult<Array<{
    phase: ProductPhase;
    progress: PhaseProgress;
    health: PhaseHealth;
  }>>> {
    const startTime = Date.now();
    
    try {
      const phases = this.lifecycleService.getPhasesByProduct(productId);
      
      // Get metrics for all phases in parallel
      const phasesWithMetrics = await Promise.all(
        phases.map(async (phase) => {
          const [progressResult, healthResult] = await Promise.all([
            this.progressService.calculatePhaseProgress(phase),
            this.progressService.assessPhaseHealth(phase)
          ]);
          
          return {
            phase,
            progress: progressResult.data!,
            health: healthResult.data!
          };
        })
      );

      return {
        success: true,
        data: phasesWithMetrics,
        timing: {
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown phases retrieval error';
      this.emit('error', createUserError(errorMessage));
      
      return {
        success: false,
        error: errorMessage,
        timing: {
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Update objective progress (delegates to progress service)
   */
  async updateObjectiveProgress(
    phaseId: string,
    objectiveId: string,
    progress: number
  ): Promise<OrchestratorResult<void>> {
    const result = await this.progressService.updateObjectiveProgress(phaseId, objectiveId, progress);
    
    // Trigger phase progress recalculation
    if (result.success) {
      const phase = this.lifecycleService.getPhase(phaseId);
      if (phase) {
        await this.progressService.calculatePhaseProgress(phase);
      }
    }
    
    return result;
  }

  /**
   * Get comprehensive phase summary
   */
  async getPhasesSummary(): Promise<OrchestratorResult<{
    totalPhases: number;
    phasesByStatus: Record<PhaseStatus, number>;
    averageHealth: number;
    criticalPhases: string[];
    recentlyCompleted: ProductPhase[];
  }>> {
    const startTime = Date.now();
    
    try {
      const allPhases = [
        ...this.lifecycleService.getPhasesByStatus(PhaseStatus.NOT_STARTED),
        ...this.lifecycleService.getPhasesByStatus(PhaseStatus.IN_PROGRESS),
        ...this.lifecycleService.getPhasesByStatus(PhaseStatus.REVIEW),
        ...this.lifecycleService.getPhasesByStatus(PhaseStatus.COMPLETED),
        ...this.lifecycleService.getPhasesByStatus(PhaseStatus.BLOCKED),
        ...this.lifecycleService.getPhasesByStatus(PhaseStatus.CANCELLED)
      ];

      // Calculate phase counts by status
      const phasesByStatus: Record<PhaseStatus, number> = {
        [PhaseStatus.NOT_STARTED]: this.lifecycleService.getPhasesByStatus(PhaseStatus.NOT_STARTED).length,
        [PhaseStatus.IN_PROGRESS]: this.lifecycleService.getPhasesByStatus(PhaseStatus.IN_PROGRESS).length,
        [PhaseStatus.REVIEW]: this.lifecycleService.getPhasesByStatus(PhaseStatus.REVIEW).length,
        [PhaseStatus.COMPLETED]: this.lifecycleService.getPhasesByStatus(PhaseStatus.COMPLETED).length,
        [PhaseStatus.BLOCKED]: this.lifecycleService.getPhasesByStatus(PhaseStatus.BLOCKED).length,
        [PhaseStatus.CANCELLED]: this.lifecycleService.getPhasesByStatus(PhaseStatus.CANCELLED).length
      };

      // Calculate average health score
      let totalHealth = 0;
      let healthCount = 0;
      const criticalPhases: string[] = [];

      for (const phase of allPhases) {
        const healthResult = await this.progressService.assessPhaseHealth(phase);
        if (healthResult.success && healthResult.data) {
          totalHealth += healthResult.data.score;
          healthCount++;
          
          if (healthResult.data.status === 'critical') {
            criticalPhases.push(phase.id);
          }
        }
      }

      const averageHealth = healthCount > 0 ? totalHealth / healthCount : 0;

      // Get recently completed phases (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentlyCompleted = this.lifecycleService.getPhasesByStatus(PhaseStatus.COMPLETED)
        .filter(phase => phase.endDate && phase.endDate >= sevenDaysAgo);

      return {
        success: true,
        data: {
          totalPhases: allPhases.length,
          phasesByStatus,
          averageHealth: Math.round(averageHealth),
          criticalPhases,
          recentlyCompleted
        },
        timing: {
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown summary generation error';
      this.emit('error', createUserError(errorMessage));
      
      return {
        success: false,
        error: errorMessage,
        timing: {
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Private setup methods
   */
  private setupEventForwarding(): void {
    // Forward lifecycle service events
    this.lifecycleService.on('phase-created', (phase) => {
      this.emit('phase-lifecycle-event', 'phase-created', phase);
    });
    
    this.lifecycleService.on('phase-started', (phase) => {
      this.emit('phase-lifecycle-event', 'phase-started', phase);
    });
    
    this.lifecycleService.on('phase-completed', (phase) => {
      this.emit('phase-lifecycle-event', 'phase-completed', phase);
    });
    
    this.lifecycleService.on('transition-ready', (fromPhase, toPhase) => {
      this.emit('phase-lifecycle-event', 'transition-ready', { fromPhase, toPhase });
    });

    // Forward progress service events
    this.progressService.on('progress-changed', (update) => {
      this.emit('phase-progress-event', 'progress-changed', update);
    });
    
    this.progressService.on('health-alert', (alert) => {
      this.emit('phase-progress-event', 'health-alert', alert);
    });
    
    this.progressService.on('objective-progress-updated', (update) => {
      this.emit('phase-progress-event', 'objective-progress-updated', update);
    });
  }

  private setupServiceIntegration(): void {
    // Integrate lifecycle and progress services
    this.lifecycleService.on('phase-created', async (phase) => {
      await this.progressService.calculatePhaseProgress(phase);
      if (this.config.enableHealthMonitoring) {
        await this.progressService.assessPhaseHealth(phase);
      }
    });
    
    this.lifecycleService.on('phase-started', async (phase) => {
      await this.progressService.calculatePhaseProgress(phase);
      if (this.config.enableHealthMonitoring) {
        await this.progressService.assessPhaseHealth(phase);
      }
    });
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await Promise.all([
      this.lifecycleService.cleanup(),
      this.progressService.cleanup()
    ]);
    
    this.removeAllListeners();
    this.initialized = false;
  }
}

/**
 * Factory function for creating PhaseOrchestrator
 */
export function createPhaseOrchestrator(
  config: Partial<PhaseOrchestratorConfig> = {}
): PhaseOrchestrator {
  const defaultConfig: PhaseOrchestratorConfig = {
    lifecycle: {},
    progress: {},
    enableEventForwarding: true,
    enableHealthMonitoring: true
  };

  return new PhaseOrchestrator({ ...defaultConfig, ...config });
}