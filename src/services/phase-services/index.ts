/**
 * Phase Services Index - Clean Architecture like Gemini CLI
 * 
 * Centralized exports for all phase services
 * Replaces the PhaseManager monolith
 */

// Main orchestrator
export { PhaseOrchestrator } from '../phase-orchestrator.js';
export type { PhaseOrchestratorConfig, OrchestratorResult } from '../phase-orchestrator.js';

// Individual services
export { PhaseLifecycleService } from '../phase-lifecycle-service.js';
export type { 
  PhaseLifecycleConfig, 
  PhaseLifecycleResult,
  ProductPhase,
  PhaseType,
  PhaseStatus,
  PhaseProgress,
  PhaseObjective,
  PhaseDeliverable,
  CompletionCriteria,
  CompletionCheck
} from '../phase-lifecycle-service.js';

export { PhaseProgressService } from '../phase-progress-service.js';
export type { 
  PhaseProgressConfig,
  ProgressResult,
  PhaseHealth,
  HealthStatus,
  HealthIssue,
  HealthTrend,
  ProgressUpdate,
  ProgressChange
} from '../phase-progress-service.js';

// Factory functions
export { createPhaseLifecycleService } from '../phase-lifecycle-service.js';
export { createPhaseProgressService } from '../phase-progress-service.js';
export { createPhaseOrchestrator } from '../phase-orchestrator.js'; 