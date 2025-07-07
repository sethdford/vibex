/**
 * Phase Lifecycle Service - Clean Architecture like Gemini CLI
 * 
 * Single responsibility: Manage phase creation, transitions, and completion
 * Extracted from PhaseManager monolith
 */

import { EventEmitter } from 'events';
import { createUserError } from '../errors/formatter.js';

/**
 * Phase lifecycle configuration
 */
export interface PhaseLifecycleConfig {
  maxConcurrentPhases: number;
  defaultPhaseDuration: number; // days
  enableAutoTransitions: boolean;
  completionThreshold: number; // percentage
  healthCheckInterval: number; // minutes
}

/**
 * Phase lifecycle result pattern
 */
export interface PhaseLifecycleResult<T = any> {
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
 * Phase lifecycle events
 */
export interface PhaseLifecycleEvents {
  'phase-created': (phase: ProductPhase) => void;
  'phase-started': (phase: ProductPhase) => void;
  'phase-completed': (phase: ProductPhase) => void;
  'phase-blocked': (phase: ProductPhase, reason: string) => void;
  'phase-cancelled': (phase: ProductPhase) => void;
  'transition-ready': (fromPhase: ProductPhase, toPhase: PhaseType) => void;
  'error': (error: Error) => void;
}

/**
 * Phase types and enums
 */
export enum PhaseType {
  PROBLEM_DISCOVERY = 'problem_discovery',
  SOLUTION_DISCOVERY = 'solution_discovery',
  DELIVERY_SUPPORT = 'delivery_support'
}

export enum PhaseStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  COMPLETED = 'completed',
  BLOCKED = 'blocked',
  CANCELLED = 'cancelled'
}

/**
 * Core phase interface
 */
export interface ProductPhase {
  id: string;
  productId: string;
  type: PhaseType;
  name: string;
  description: string;
  status: PhaseStatus;
  startDate: Date;
  endDate?: Date;
  objectives: PhaseObjective[];
  deliverables: PhaseDeliverable[];
  criteria: CompletionCriteria[];
  dependencies: string[];
  team: PhaseTeam[];
  progress: PhaseProgress;
  insights: PhaseInsight[];
  created: Date;
  updated: Date;
}

/**
 * Supporting interfaces
 */
export interface PhaseObjective {
  id: string;
  name: string;
  required: boolean;
  status: ObjectiveStatus;
  progress: number; // 0-100
}

export interface PhaseDeliverable {
  type: string;
  required: boolean;
  status: DeliverableStatus;
  assignee: string;
}

export interface CompletionCriteria {
  name: string;
  description: string;
  weight: number;
  achieved: boolean;
  score: number; // 0-100
}

export interface PhaseTeam {
  userId: string;
  role: string;
  permissions: string[];
}

export interface PhaseProgress {
  overall: number; // 0-100
  objectives: number; // 0-100
  deliverables: number; // 0-100
  criteria: number; // 0-100
}

export interface PhaseHealth {
  score: number; // 0-100
  status: 'healthy' | 'at_risk' | 'critical';
  issues: string[];
  recommendations: string[];
  lastChecked: Date;
}

export interface PhaseInsight {
  id: string;
  type: string;
  description: string;
  impact: string;
  created: Date;
}

export interface CompletionCheck {
  eligible: boolean;
  reasons: string[];
  score: number;
}

export type ObjectiveStatus = 'not_started' | 'in_progress' | 'completed';
export type DeliverableStatus = 'not_started' | 'in_progress' | 'completed';

/**
 * Phase lifecycle service - focused on phase state management only
 */
export class PhaseLifecycleService extends EventEmitter {
  private config: PhaseLifecycleConfig;
  private phases = new Map<string, ProductPhase>();
  private initialized = false;

  constructor(config: PhaseLifecycleConfig) {
    super();
    this.config = this.validateConfig(config);
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<PhaseLifecycleResult<void>> {
    const startTime = Date.now();
    
    try {
      if (this.initialized) {
        return {
          success: true,
          warnings: ['Service already initialized']
        };
      }

      this.setupEventHandlers();
      this.initialized = true;
      
      this.emit('service-initialized');
      
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
   * Create a new phase
   */
    async createPhase(
    productId: string,
    type: PhaseType,
    options: Partial<ProductPhase> = {}
  ): Promise<PhaseLifecycleResult<ProductPhase>> {
    const startTime = Date.now();
    
    try {
      if (!this.initialized) {
        throw new Error('Service not initialized');
      }

      // Check concurrent phase limits
      const activePhases = Array.from(this.phases.values())
        .filter(p => p.productId === productId && p.status === PhaseStatus.IN_PROGRESS);
      
      if (activePhases.length >= this.config.maxConcurrentPhases) {
        throw new Error(`Maximum concurrent phases (${this.config.maxConcurrentPhases}) reached for product ${productId}`);
      }

      const phase: ProductPhase = {
        id: this.generatePhaseId(),
        productId,
        type,
        name: options.name || this.getDefaultPhaseName(type),
        description: options.description || this.getDefaultPhaseDescription(type),
        status: PhaseStatus.NOT_STARTED,
        startDate: new Date(),
        endDate: undefined,
        objectives: options.objectives || [],
        deliverables: options.deliverables || [],
        criteria: options.criteria || [],
        dependencies: options.dependencies || [],
        team: options.team || [],
        progress: {
          overall: 0,
          objectives: 0,
          deliverables: 0,
          criteria: 0
        },
        insights: [],
        created: new Date(),
        updated: new Date(),
      };

      this.phases.set(phase.id, phase);
      this.emit('phase-created', phase);
      
      return {
        success: true,
        data: phase,
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
   * Start a phase
   */
  async startPhase(phaseId: string): Promise<PhaseLifecycleResult<ProductPhase>> {
    const startTime = Date.now();
    
    try {
      const phase = this.phases.get(phaseId);
      if (!phase) {
        throw new Error(`Phase ${phaseId} not found`);
      }

      if (phase.status !== PhaseStatus.NOT_STARTED) {
        throw new Error(`Phase ${phaseId} cannot be started from status ${phase.status}`);
      }

      // Check dependencies
      const dependencyCheck = await this.checkDependencies(phase);
      if (!dependencyCheck.success) {
        throw new Error(`Dependencies not met: ${dependencyCheck.error}`);
      }

      phase.status = PhaseStatus.IN_PROGRESS;
      phase.startDate = new Date();
      phase.updated = new Date();
      
      this.phases.set(phaseId, phase);
      this.emit('phase-started', phase);
      
      return {
        success: true,
        data: phase,
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
   * Complete a phase
   */
  async completePhase(phaseId: string): Promise<PhaseLifecycleResult<ProductPhase>> {
    const startTime = Date.now();
    
    try {
      const phase = this.phases.get(phaseId);
      if (!phase) {
        throw new Error(`Phase ${phaseId} not found`);
      }

      if (phase.status !== PhaseStatus.IN_PROGRESS && phase.status !== PhaseStatus.REVIEW) {
        throw new Error(`Phase ${phaseId} cannot be completed from status ${phase.status}`);
      }

      // Check completion criteria
      const completionCheck = await this.checkCompletionCriteria(phase);
      if (!completionCheck.eligible) {
        return {
          success: false,
          error: `Completion criteria not met: ${completionCheck.reasons.join(', ')}`,
          timing: {
            startTime,
            endTime: Date.now(),
            duration: Date.now() - startTime
          }
        };
      }

      phase.status = PhaseStatus.COMPLETED;
      phase.endDate = new Date();
      phase.updated = new Date();
      
      this.phases.set(phaseId, phase);
      this.emit('phase-completed', phase);
      
      // Check for transition opportunities
      await this.checkTransitionOpportunities(phase);
      
      return {
        success: true,
        data: phase,
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
   * Cancel a phase
   */
  async cancelPhase(phaseId: string, reason: string): Promise<PhaseLifecycleResult<ProductPhase>> {
    const startTime = Date.now();
    
    try {
      const phase = this.phases.get(phaseId);
      if (!phase) {
        throw new Error(`Phase ${phaseId} not found`);
      }

      if (phase.status === PhaseStatus.COMPLETED) {
        throw new Error(`Cannot cancel completed phase ${phaseId}`);
      }

      phase.status = PhaseStatus.CANCELLED;
      phase.endDate = new Date();
      phase.updated = new Date();
      phase.insights.push({
        id: this.generateInsightId(),
        type: 'cancellation',
        description: `Phase cancelled: ${reason}`,
        impact: 'high',
        created: new Date()
      });
      
      this.phases.set(phaseId, phase);
      this.emit('phase-cancelled', phase);
      
      return {
        success: true,
        data: phase,
        timing: {
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown phase cancellation error';
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
   * Get phase by ID
   */
  getPhase(phaseId: string): ProductPhase | undefined {
    return this.phases.get(phaseId);
  }

  /**
   * Get phases by product ID
   */
  getPhasesByProduct(productId: string): ProductPhase[] {
    return Array.from(this.phases.values())
      .filter(phase => phase.productId === productId);
  }

  /**
   * Get phases by status
   */
  getPhasesByStatus(status: PhaseStatus): ProductPhase[] {
    return Array.from(this.phases.values())
      .filter(phase => phase.status === status);
  }

  /**
   * Private helper methods
   */
  private validateConfig(config: PhaseLifecycleConfig): PhaseLifecycleConfig {
    if (config.maxConcurrentPhases < 1) {
      throw new Error('maxConcurrentPhases must be at least 1');
    }
    
    if (config.defaultPhaseDuration < 1) {
      throw new Error('defaultPhaseDuration must be at least 1 day');
    }
    
    if (config.completionThreshold < 0 || config.completionThreshold > 100) {
      throw new Error('completionThreshold must be between 0 and 100');
    }
    
    return config;
  }

  private setupEventHandlers(): void {
    // Setup internal event handling
    this.on('phase-created', (phase) => {
      console.log(`✅ Phase created: ${phase.name} (${phase.id})`);
    });
    
    this.on('phase-completed', (phase) => {
      console.log(`🎉 Phase completed: ${phase.name} (${phase.id})`);
    });
  }

  private async checkDependencies(phase: ProductPhase): Promise<PhaseLifecycleResult<void>> {
    const unmetDependencies = [];
    
    for (const depId of phase.dependencies) {
      const dependency = this.phases.get(depId);
      if (!dependency || dependency.status !== PhaseStatus.COMPLETED) {
        unmetDependencies.push(depId);
      }
    }
    
    if (unmetDependencies.length > 0) {
      return {
        success: false,
        error: `Unmet dependencies: ${unmetDependencies.join(', ')}`
      };
    }
    
    return { success: true };
  }

    private async checkCompletionCriteria(phase: ProductPhase): Promise<CompletionCheck> {
    const reasons: string[] = [];
    let totalScore = 0;
    let totalWeight = 0;
    
    // Check objectives
    const incompleteObjectives = phase.objectives.filter(obj => 
      obj.required && obj.status !== 'completed'
    );
    
    if (incompleteObjectives.length > 0) {
      reasons.push(`Incomplete required objectives: ${incompleteObjectives.map(o => o.name).join(', ')}`);
    }
    
    // Check deliverables
    const incompleteDeliverables = phase.deliverables.filter(del => 
      del.required && del.status !== 'completed'
    );
    
    if (incompleteDeliverables.length > 0) {
      reasons.push(`Incomplete required deliverables: ${incompleteDeliverables.map(d => d.type).join(', ')}`);
    }
    
    // Check criteria scores
    for (const criteria of phase.criteria) {
      totalScore += criteria.score * criteria.weight;
      totalWeight += criteria.weight;
    }
    
    const averageScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    
    if (averageScore < this.config.completionThreshold) {
      reasons.push(`Completion score ${averageScore.toFixed(1)}% below threshold ${this.config.completionThreshold}%`);
    }
    
    return {
      eligible: reasons.length === 0,
      reasons,
      score: averageScore
    };
  }

  private async checkTransitionOpportunities(completedPhase: ProductPhase): Promise<void> {
    // Determine next phase type
    let nextPhaseType: PhaseType | null = null;
    
    switch (completedPhase.type) {
      case PhaseType.PROBLEM_DISCOVERY:
        nextPhaseType = PhaseType.SOLUTION_DISCOVERY;
        break;
      case PhaseType.SOLUTION_DISCOVERY:
        nextPhaseType = PhaseType.DELIVERY_SUPPORT;
        break;
      default:
        return; // No automatic transition
    }
    
    if (nextPhaseType && this.config.enableAutoTransitions) {
      this.emit('transition-ready', completedPhase, nextPhaseType);
    }
  }

  private getDefaultPhaseName(type: PhaseType): string {
    const names = {
      [PhaseType.PROBLEM_DISCOVERY]: 'Problem Discovery',
      [PhaseType.SOLUTION_DISCOVERY]: 'Solution Discovery',
      [PhaseType.DELIVERY_SUPPORT]: 'Delivery & Support'
    };
    return names[type];
  }

  private getDefaultPhaseDescription(type: PhaseType): string {
    const descriptions = {
      [PhaseType.PROBLEM_DISCOVERY]: 'Define vision, goals, personas, and market analysis',
      [PhaseType.SOLUTION_DISCOVERY]: 'Design solutions, create prototypes, and validate approaches',
      [PhaseType.DELIVERY_SUPPORT]: 'Launch product and provide ongoing support'
    };
    return descriptions[type];
  }

  private generatePhaseId(): string {
    return `phase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateInsightId(): string {
    return `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.phases.clear();
    this.removeAllListeners();
    this.initialized = false;
  }
}

/**
 * Factory function for creating PhaseLifecycleService
 */
export function createPhaseLifecycleService(
  config: Partial<PhaseLifecycleConfig> = {}
): PhaseLifecycleService {
  const defaultConfig: PhaseLifecycleConfig = {
    maxConcurrentPhases: 3,
    defaultPhaseDuration: 30,
    enableAutoTransitions: true,
    completionThreshold: 80,
    healthCheckInterval: 60
  };

  return new PhaseLifecycleService({ ...defaultConfig, ...config });
} 