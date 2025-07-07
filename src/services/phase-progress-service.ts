/**
 * Phase Progress Service - Clean Architecture like Gemini CLI
 * 
 * Single responsibility: Track and calculate phase progress and health metrics
 * Extracted from PhaseManager monolith
 */

import { EventEmitter } from 'events';
import { createUserError } from '../errors/formatter.js';
import type { 
  ProductPhase, 
  PhaseProgress, 
  PhaseInsight,
  PhaseObjective,
  PhaseDeliverable,
  CompletionCriteria 
} from './phase-lifecycle-service.js';

/**
 * Progress service configuration
 */
export interface PhaseProgressConfig {
  healthCheckInterval: number; // minutes
  progressUpdateThreshold: number; // percentage change to trigger update
  enableAutomaticInsights: boolean;
  healthScoreWeights: HealthScoreWeights;
}

/**
 * Health score calculation weights
 */
export interface HealthScoreWeights {
  objectives: number;
  deliverables: number;
  criteria: number;
  timeline: number;
  team: number;
}

/**
 * Progress service result pattern
 */
export interface ProgressResult<T = any> {
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
 * Phase health assessment
 */
export interface PhaseHealth {
  score: number; // 0-100
  status: HealthStatus;
  issues: HealthIssue[];
  recommendations: string[];
  trends: HealthTrend[];
  lastUpdated: Date;
  lastChecked: Date;
}

/**
 * Health status enum
 */
export enum HealthStatus {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  WARNING = 'warning',
  CRITICAL = 'critical'
}

/**
 * Health issue interface
 */
export interface HealthIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  recommendation: string;
}

/**
 * Health trend interface
 */
export interface HealthTrend {
  metric: string;
  direction: 'improving' | 'stable' | 'declining';
  change: number; // percentage
  period: string;
}

/**
 * Progress update event
 */
export interface ProgressUpdate {
  phaseId: string;
  previousProgress: PhaseProgress;
  currentProgress: PhaseProgress;
  changes: ProgressChange[];
}

/**
 * Progress change detail
 */
export interface ProgressChange {
  type: 'objective' | 'deliverable' | 'criteria' | 'overall';
  id?: string;
  previous: number;
  current: number;
  delta: number;
}

/**
 * Phase progress tracking service
 */
export class PhaseProgressService extends EventEmitter {
  private config: PhaseProgressConfig;
  private progressHistory = new Map<string, PhaseProgress[]>();
  private healthHistory = new Map<string, PhaseHealth[]>();
  private healthCheckTimer?: NodeJS.Timeout;
  private initialized = false;

  constructor(config: PhaseProgressConfig) {
    super();
    this.config = this.validateConfig(config);
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<ProgressResult<void>> {
    const startTime = Date.now();
    
    try {
      if (this.initialized) {
        return {
          success: true,
          warnings: ['Service already initialized']
        };
      }

      this.setupHealthMonitoring();
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
   * Calculate comprehensive phase progress
   */
  async calculatePhaseProgress(phase: ProductPhase): Promise<ProgressResult<PhaseProgress>> {
    const startTime = Date.now();
    
    try {
      if (!this.initialized) {
        throw new Error('Service not initialized');
      }

      const objectivesProgress = this.calculateObjectivesProgress(phase.objectives);
      const deliverablesProgress = this.calculateDeliverablesProgress(phase.deliverables);
      const criteriaProgress = this.calculateCriteriaProgress(phase.criteria);
      
      // Calculate overall progress with weighted average
      const weights = { objectives: 0.4, deliverables: 0.4, criteria: 0.2 };
      const overall = Math.round(
        (objectivesProgress * weights.objectives) +
        (deliverablesProgress * weights.deliverables) +
        (criteriaProgress * weights.criteria)
      );

      const progress: PhaseProgress = {
        overall,
        objectives: objectivesProgress,
        deliverables: deliverablesProgress,
        criteria: criteriaProgress
      };

      // Store progress history
      this.storeProgressHistory(phase.id, progress);
      
      // Check for significant changes
      await this.checkProgressChanges(phase.id, progress);
      
      return {
        success: true,
        data: progress,
        timing: {
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown progress calculation error';
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
   * Assess phase health
   */
    async assessPhaseHealth(phase: ProductPhase): Promise<ProgressResult<PhaseHealth>> {
    const startTime = Date.now();
    
    try {
      const issues: HealthIssue[] = [];
      const recommendations: string[] = [];
      
      // Check objectives health
      const objectiveIssues = this.checkObjectivesHealth(phase);
      issues.push(...objectiveIssues);
      
      // Check deliverables health
      const deliverableIssues = this.checkDeliverablesHealth(phase);
      issues.push(...deliverableIssues);
      
      // Check timeline health
      const timelineIssues = this.checkTimelineHealth(phase);
      issues.push(...timelineIssues);
      
      // Check team health
      const teamIssues = this.checkTeamHealth(phase);
      issues.push(...teamIssues);
      
      // Calculate overall health score
      const score = this.calculateHealthScore(phase, issues);
      const status = this.determineHealthStatus(score);
      
      // Generate recommendations
      const healthRecommendations = this.generateHealthRecommendations(issues);
      recommendations.push(...healthRecommendations);
      
      // Calculate trends
      const trends = this.calculateHealthTrends(phase.id);
      
      const health: PhaseHealth = {
        score,
        status,
        issues,
        recommendations,
        trends,
        lastUpdated: new Date(),
        lastChecked: new Date()
      };

      // Store health history
      this.storeHealthHistory(phase.id, health);
      
      // Emit health events
      if (status === HealthStatus.CRITICAL || status === HealthStatus.WARNING) {
        this.emit('health-alert', { phaseId: phase.id, health });
      }
      
      return {
        success: true,
        data: health,
        timing: {
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown health assessment error';
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
   * Update objective progress
   */
  async updateObjectiveProgress(
    phaseId: string, 
    objectiveId: string, 
    progress: number
  ): Promise<ProgressResult<void>> {
    const startTime = Date.now();
    
    try {
      if (progress < 0 || progress > 100) {
        throw new Error('Progress must be between 0 and 100');
      }

      this.emit('objective-progress-updated', {
        phaseId,
        objectiveId,
        progress,
        timestamp: new Date()
      });
      
      // Generate insight if significant milestone reached
      if (this.config.enableAutomaticInsights) {
        if (progress === 100) {
          this.emit('insight-generated', {
            phaseId,
            type: 'objective_completed',
            description: `Objective ${objectiveId} completed`,
            impact: 'positive'
          });
        } else if (progress >= 50 && progress < 60) {
          this.emit('insight-generated', {
            phaseId,
            type: 'objective_milestone',
            description: `Objective ${objectiveId} reached 50% completion`,
            impact: 'neutral'
          });
        }
      }
      
      return {
        success: true,
        timing: {
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown objective update error';
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
   * Get progress history for a phase
   */
  getProgressHistory(phaseId: string): PhaseProgress[] {
    return this.progressHistory.get(phaseId) || [];
  }

  /**
   * Get health history for a phase
   */
  getHealthHistory(phaseId: string): PhaseHealth[] {
    return this.healthHistory.get(phaseId) || [];
  }

  /**
   * Private calculation methods
   */
  private calculateObjectivesProgress(objectives: PhaseObjective[]): number {
    if (objectives.length === 0) return 100;
    
    const totalProgress = objectives.reduce((sum, obj) => sum + obj.progress, 0);
    return Math.round(totalProgress / objectives.length);
  }

  private calculateDeliverablesProgress(deliverables: PhaseDeliverable[]): number {
    if (deliverables.length === 0) return 100;
    
    const completed = deliverables.filter(d => d.status === 'completed').length;
    return Math.round((completed / deliverables.length) * 100);
  }

  private calculateCriteriaProgress(criteria: CompletionCriteria[]): number {
    if (criteria.length === 0) return 100;
    
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const criterion of criteria) {
      totalScore += criterion.score * criterion.weight;
      totalWeight += criterion.weight;
    }
    
    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  /**
   * Health check methods
   */
  private checkObjectivesHealth(phase: ProductPhase): HealthIssue[] {
    const issues: HealthIssue[] = [];
    
    const blockedObjectives = phase.objectives.filter(obj => 
      obj.required && obj.status === 'not_started' && obj.progress === 0
    );
    
    if (blockedObjectives.length > 0) {
      issues.push({
        type: 'objectives_blocked',
        severity: 'high',
        description: `${blockedObjectives.length} required objectives not started`,
        impact: 'Phase completion at risk',
        recommendation: 'Review objective assignments and remove blockers'
      });
    }
    
    return issues;
  }

  private checkDeliverablesHealth(phase: ProductPhase): HealthIssue[] {
    const issues: HealthIssue[] = [];
    
    const overdueDeliverables = phase.deliverables.filter(d => 
      d.required && d.status !== 'completed'
    );
    
    if (overdueDeliverables.length > 0) {
      issues.push({
        type: 'deliverables_overdue',
        severity: 'medium',
        description: `${overdueDeliverables.length} required deliverables incomplete`,
        impact: 'Timeline delays possible',
        recommendation: 'Prioritize deliverable completion'
      });
    }
    
    return issues;
  }

  private checkTimelineHealth(phase: ProductPhase): HealthIssue[] {
    const issues: HealthIssue[] = [];
    
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - phase.startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceStart > 30 && phase.progress.overall < 50) {
      issues.push({
        type: 'timeline_risk',
        severity: 'high',
        description: `Phase running ${daysSinceStart} days with only ${phase.progress.overall}% progress`,
        impact: 'Significant timeline risk',
        recommendation: 'Review scope and resource allocation'
      });
    }
    
    return issues;
  }

  private checkTeamHealth(phase: ProductPhase): HealthIssue[] {
    const issues: HealthIssue[] = [];
    
    if (phase.team.length === 0) {
      issues.push({
        type: 'no_team_assigned',
        severity: 'critical',
        description: 'No team members assigned to phase',
        impact: 'Phase cannot progress',
        recommendation: 'Assign team members immediately'
      });
    }
    
    return issues;
  }

  private calculateHealthScore(phase: ProductPhase, issues: HealthIssue[]): number {
    let baseScore = 100;
    
    // Deduct points for issues
    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
          baseScore -= 30;
          break;
        case 'high':
          baseScore -= 20;
          break;
        case 'medium':
          baseScore -= 10;
          break;
        case 'low':
          baseScore -= 5;
          break;
      }
    }
    
    // Factor in progress
    const progressBonus = phase.progress.overall * 0.2;
    
    return Math.max(0, Math.min(100, baseScore + progressBonus));
  }

    private determineHealthStatus(score: number): HealthStatus {
    if (score >= 80) return HealthStatus.EXCELLENT;
    if (score >= 60) return HealthStatus.GOOD;
    if (score >= 40) return HealthStatus.WARNING;
    return HealthStatus.CRITICAL;
  }

  private generateHealthRecommendations(issues: HealthIssue[]): string[] {
    return issues.map(issue => issue.recommendation);
  }

    private calculateHealthTrends(phaseId: string): HealthTrend[] {
    const history = this.healthHistory.get(phaseId) || [];
    if (history.length < 2) return [];
    
    const latest = history[history.length - 1];
    const previous = history[history.length - 2];
    
    const scoreDelta = latest.score - previous.score;
    
    return [{
      metric: 'health_score',
      direction: scoreDelta > 0 ? 'improving' : scoreDelta < 0 ? 'declining' : 'stable',
      change: Math.abs(scoreDelta),
      period: '1 check'
    }];
  }

  /**
   * Storage and monitoring methods
   */
  private storeProgressHistory(phaseId: string, progress: PhaseProgress): void {
    const history = this.progressHistory.get(phaseId) || [];
    history.push(progress);
    
    // Keep last 100 entries
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    this.progressHistory.set(phaseId, history);
  }

  private storeHealthHistory(phaseId: string, health: PhaseHealth): void {
    const history = this.healthHistory.get(phaseId) || [];
    history.push(health);
    
    // Keep last 50 entries
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
    
    this.healthHistory.set(phaseId, history);
  }

  private async checkProgressChanges(phaseId: string, currentProgress: PhaseProgress): Promise<void> {
    const history = this.progressHistory.get(phaseId) || [];
    if (history.length === 0) return;
    
    const previousProgress = history[history.length - 1];
    const changes: ProgressChange[] = [];
    
    // Check for significant changes
    if (Math.abs(currentProgress.overall - previousProgress.overall) >= this.config.progressUpdateThreshold) {
      changes.push({
        type: 'overall',
        previous: previousProgress.overall,
        current: currentProgress.overall,
        delta: currentProgress.overall - previousProgress.overall
      });
    }
    
    if (changes.length > 0) {
      this.emit('progress-changed', {
        phaseId,
        previousProgress,
        currentProgress,
        changes
      });
    }
  }

  private setupHealthMonitoring(): void {
    if (this.config.healthCheckInterval > 0) {
      this.healthCheckTimer = setInterval(() => {
        this.emit('health-check-scheduled');
      }, this.config.healthCheckInterval * 60 * 1000);
    }
  }

  private setupEventHandlers(): void {
    this.on('health-alert', (alert) => {
      console.log(`⚠️ Health alert for phase ${alert.phaseId}: ${alert.health.status}`);
    });
  }

  private validateConfig(config: PhaseProgressConfig): PhaseProgressConfig {
    if (config.healthCheckInterval < 0) {
      throw new Error('healthCheckInterval must be non-negative');
    }
    
    if (config.progressUpdateThreshold < 0 || config.progressUpdateThreshold > 100) {
      throw new Error('progressUpdateThreshold must be between 0 and 100');
    }
    
    return config;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    this.progressHistory.clear();
    this.healthHistory.clear();
    this.removeAllListeners();
    this.initialized = false;
  }
}

/**
 * Factory function for creating PhaseProgressService
 */
export function createPhaseProgressService(
  config: Partial<PhaseProgressConfig> = {}
): PhaseProgressService {
  const defaultConfig: PhaseProgressConfig = {
    healthCheckInterval: 60,
    progressUpdateThreshold: 5,
    enableAutomaticInsights: true,
    healthScoreWeights: {
      objectives: 0.3,
      deliverables: 0.3,
      criteria: 0.2,
      timeline: 0.1,
      team: 0.1
    }
  };

  return new PhaseProgressService({ ...defaultConfig, ...config });
}