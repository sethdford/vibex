// Digital Product Management Phase Manager
// Orchestrates Problem Discovery, Solution Discovery, Delivery & Support phases

import { EventEmitter } from 'events';
import { DPMConfigManager } from '../config/dpm-config';
import { HierarchicalMemoryManager } from '../../memory/hierarchical-manager';
import { MemoryType } from '../../memory/interfaces';
import { DigitalProductManager } from './product-manager';
import { UserResearchSystem } from './user-research';
import { MarketAnalysisEngine } from './market-analysis';
import { AnalyticsEngine } from './analytics-engine';

export interface PhaseManagerOptions {
  config: DPMConfigManager;
  memory: HierarchicalMemoryManager;
  workspaceId: string;
  userId: string;
  productManager: DigitalProductManager;
  userResearch: UserResearchSystem;
  marketAnalysis: MarketAnalysisEngine;
  analytics: AnalyticsEngine;
}

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
  dependencies: string[]; // phase IDs
  team: PhaseTeam[];
  progress: PhaseProgress;
  insights: PhaseInsight[];
  created: Date;
  updated: Date;
}

export interface ProblemDiscoveryPhase extends ProductPhase {
  vision: ProductVision;
  goals: ProductGoal[];
  personas: string[]; // persona IDs
  marketAnalysis: string; // market analysis ID
  problemStatements: ProblemStatement[];
  opportunityAssessment: OpportunityAssessment;
}

export interface SolutionDiscoveryPhase extends ProductPhase {
  keyResults: KeyResult[];
  userStories: UserStory[];
  architecture: SolutionArchitecture;
  prototypes: Prototype[];
  validationResults: ValidationResult[];
  feasibilityAnalysis: FeasibilityAnalysis;
}

export interface DeliverySupportPhase extends ProductPhase {
  outcomes: DeliveryOutcome[];
  launchPlan: LaunchPlan;
  supportPlan: SupportPlan;
  metrics: DeliveryMetrics;
  postLaunchAnalysis: PostLaunchAnalysis;
  iterationPlan: IterationPlan;
}

// Enums
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

export enum DeliverableType {
  VISION_STATEMENT = 'vision_statement',
  PERSONA_PROFILE = 'persona_profile',
  MARKET_ANALYSIS = 'market_analysis',
  PROBLEM_STATEMENT = 'problem_statement',
  KEY_RESULT = 'key_result',
  USER_STORY = 'user_story',
  ARCHITECTURE_DESIGN = 'architecture_design',
  PROTOTYPE = 'prototype',
  LAUNCH_PLAN = 'launch_plan',
  SUCCESS_METRICS = 'success_metrics'
}

export enum GoalCategory {
  BUSINESS = 'business',
  USER = 'user',
  TECHNICAL = 'technical',
  STRATEGIC = 'strategic'
}

export class PhaseManager extends EventEmitter {
  private config: DPMConfigManager;
  private memory: HierarchicalMemoryManager;
  private workspaceId: string;
  private userId: string;
  private productManager: DigitalProductManager;
  private userResearch: UserResearchSystem;
  private marketAnalysis: MarketAnalysisEngine;
  private analytics: AnalyticsEngine;
  
  private phases = new Map<string, ProductPhase>();
  private phaseTemplates = new Map<PhaseType, PhaseTemplate>();
  private initialized = false;

  constructor(options: PhaseManagerOptions) {
    super();
    this.config = options.config;
    this.memory = options.memory;
    this.workspaceId = options.workspaceId;
    this.userId = options.userId;
    this.productManager = options.productManager;
    this.userResearch = options.userResearch;
    this.marketAnalysis = options.marketAnalysis;
    this.analytics = options.analytics;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.loadPhaseData();
      this.setupPhaseTemplates();
      this.setupPhaseOrchestration();
      
      this.initialized = true;
      this.emit('initialized');
      console.log('✅ Phase Manager initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private async loadPhaseData(): Promise<void> {
    try {
      const phaseData = await this.memory.recall({
        text: `workspace:${this.workspaceId} product_phases`,
        session_id: this.workspaceId,
        limit: 100
      });

      for (const memory of phaseData.entries) {
        if (memory.metadata?.tags?.includes('product_phase')) {
          try {
            const phase = JSON.parse(memory.content) as ProductPhase;
            this.phases.set(phase.id, phase);
          } catch (error) {
            console.warn('Failed to parse phase:', error);
          }
        }
      }

      console.log(`Loaded ${this.phases.size} product phases`);
    } catch (error) {
      console.warn('Failed to load phase data:', error);
    }
  }

  private setupPhaseTemplates(): void {
    // Problem Discovery Phase Template
    this.phaseTemplates.set(PhaseType.PROBLEM_DISCOVERY, {
      name: 'Problem Discovery',
      description: 'Define vision, goals, personas, and market analysis',
      estimatedDuration: 30, // days
      objectives: [
        { id: 'vision', name: 'Define Product Vision', required: true },
        { id: 'goals', name: 'Set Product Goals', required: true },
        { id: 'personas', name: 'Create User Personas', required: true },
        { id: 'market', name: 'Conduct Market Analysis', required: true },
        { id: 'problems', name: 'Define Problem Statements', required: true }
      ],
      deliverables: [
        { type: DeliverableType.VISION_STATEMENT, required: true },
        { type: DeliverableType.PERSONA_PROFILE, required: true },
        { type: DeliverableType.MARKET_ANALYSIS, required: true },
        { type: DeliverableType.PROBLEM_STATEMENT, required: true }
      ],
      criteria: [
        { name: 'Vision Clarity', description: 'Clear, inspiring product vision', weight: 0.25 },
        { name: 'Goal Alignment', description: 'Goals aligned with business strategy', weight: 0.25 },
        { name: 'Persona Validation', description: 'Validated user personas with research', weight: 0.25 },
        { name: 'Market Understanding', description: 'Comprehensive market analysis', weight: 0.25 }
      ]
    });

    // Solution Discovery Phase Template
    this.phaseTemplates.set(PhaseType.SOLUTION_DISCOVERY, {
      name: 'Solution Discovery',
      description: 'Define key results, user stories, and solution architecture',
      estimatedDuration: 45, // days
      objectives: [
        { id: 'key_results', name: 'Define Key Results', required: true },
        { id: 'user_stories', name: 'Create User Stories', required: true },
        { id: 'architecture', name: 'Design Solution Architecture', required: true },
        { id: 'prototypes', name: 'Build Prototypes', required: false },
        { id: 'validation', name: 'Validate Solutions', required: true }
      ],
      deliverables: [
        { type: DeliverableType.KEY_RESULT, required: true },
        { type: DeliverableType.USER_STORY, required: true },
        { type: DeliverableType.ARCHITECTURE_DESIGN, required: true },
        { type: DeliverableType.PROTOTYPE, required: false }
      ],
      criteria: [
        { name: 'Solution Feasibility', description: 'Technically feasible solution', weight: 0.3 },
        { name: 'User Story Quality', description: 'Clear, testable user stories', weight: 0.25 },
        { name: 'Architecture Soundness', description: 'Scalable, maintainable architecture', weight: 0.25 },
        { name: 'Validation Success', description: 'Positive validation results', weight: 0.2 }
      ]
    });

    // Delivery & Support Phase Template
    this.phaseTemplates.set(PhaseType.DELIVERY_SUPPORT, {
      name: 'Delivery & Support',
      description: 'Execute launch plan and measure outcomes',
      estimatedDuration: 60, // days
      objectives: [
        { id: 'delivery', name: 'Execute Delivery Plan', required: true },
        { id: 'launch', name: 'Execute Launch Plan', required: true },
        { id: 'support', name: 'Provide User Support', required: true },
        { id: 'measure', name: 'Measure Outcomes', required: true },
        { id: 'iterate', name: 'Plan Iterations', required: true }
      ],
      deliverables: [
        { type: DeliverableType.LAUNCH_PLAN, required: true },
        { type: DeliverableType.SUCCESS_METRICS, required: true }
      ],
      criteria: [
        { name: 'Launch Success', description: 'Successful product launch', weight: 0.3 },
        { name: 'User Adoption', description: 'Target user adoption achieved', weight: 0.25 },
        { name: 'Outcome Achievement', description: 'Key outcomes achieved', weight: 0.25 },
        { name: 'Support Quality', description: 'High-quality user support', weight: 0.2 }
      ]
    });
  }

  private setupPhaseOrchestration(): void {
    // Set up phase transition monitoring
    setInterval(() => {
      this.checkPhaseTransitions();
    }, 3600000); // Check every hour

    // Set up phase health monitoring
    setInterval(() => {
      this.monitorPhaseHealth();
    }, 86400000); // Check daily
  }

  // PROBLEM DISCOVERY PHASE
  async startProblemDiscoveryPhase(productId: string): Promise<ProblemDiscoveryPhase> {
    if (!this.initialized) {
      await this.initialize();
    }

    const phaseId = this.generatePhaseId();
    const template = this.phaseTemplates.get(PhaseType.PROBLEM_DISCOVERY)!;
    const now = new Date();

    const phase: ProblemDiscoveryPhase = {
      id: phaseId,
      productId: productId,
      type: PhaseType.PROBLEM_DISCOVERY,
      name: template.name,
      description: template.description,
      status: PhaseStatus.IN_PROGRESS,
      startDate: now,
      endDate: new Date(now.getTime() + template.estimatedDuration * 24 * 60 * 60 * 1000),
      objectives: template.objectives.map(obj => ({
        ...obj,
        status: 'not_started' as ObjectiveStatus,
        progress: 0
      })),
      deliverables: template.deliverables.map(del => ({
        ...del,
        status: 'not_started' as DeliverableStatus,
        assignee: this.userId
      })),
      criteria: template.criteria.map(crit => ({
        ...crit,
        achieved: false,
        score: 0
      })),
      dependencies: [],
      team: [{ userId: this.userId, role: 'product_manager', permissions: ['read', 'write', 'admin'] }],
      progress: { overall: 0, objectives: 0, deliverables: 0, criteria: 0 },
      insights: [],
      created: now,
      updated: now,
      
      // Problem Discovery specific fields
      vision: this.createDefaultVision(),
      goals: [],
      personas: [],
      marketAnalysis: '',
      problemStatements: [],
      opportunityAssessment: this.createDefaultOpportunityAssessment()
    };

    await this.storePhase(phase);
    this.phases.set(phaseId, phase);

    // Trigger automated setup
    await this.setupProblemDiscoveryAutomation(phase);

    this.emit('phaseStarted', { phase, type: 'problem_discovery' });
    return phase;
  }

  private async setupProblemDiscoveryAutomation(phase: ProblemDiscoveryPhase): Promise<void> {
    try {
      // Auto-create market analysis
      const marketOpportunity = await this.marketAnalysis.createMarketOpportunity(
        `Market Analysis for ${phase.productId}`,
        'Comprehensive market analysis for problem discovery phase',
        {
          id: `segment_${Date.now()}`,
          name: 'Target Market Segment',
          description: 'Primary target market for the product',
          demographics: { ageRange: "25-45", income: "50k-100k", location: "Urban", occupation: "Professional", interests: ["technology", "innovation"] },
          size: 1000000, // Default size
          growth: 10, // 10% growth
          characteristics: [],
          needs: [],
          behaviors: []
        }
      );

      // Update phase with market analysis ID
      const updatedPhase: ProblemDiscoveryPhase = {
        ...phase,
        marketAnalysis: marketOpportunity.id,
        updated: new Date()
      };

      await this.storePhase(updatedPhase);
      this.phases.set(phase.id, updatedPhase);

      this.emit('automationCompleted', { phaseId: phase.id, action: 'market_analysis_created' });
    } catch (error) {
      console.warn('Failed to setup problem discovery automation:', error);
    }
  }

  async addProductVision(phaseId: string, vision: ProductVision): Promise<void> {
    const phase = this.phases.get(phaseId) as ProblemDiscoveryPhase;
    if (!phase || phase.type !== PhaseType.PROBLEM_DISCOVERY) {
      throw new Error(`Problem discovery phase ${phaseId} not found`);
    }

    const updatedPhase: ProblemDiscoveryPhase = {
      ...phase,
      vision: vision,
      updated: new Date()
    };

    await this.updateObjectiveProgress(phaseId, 'vision', 100);
    await this.storePhase(updatedPhase);
    this.phases.set(phaseId, updatedPhase);

    this.emit('visionAdded', { phaseId, vision });
  }

  async addProductGoal(phaseId: string, goal: ProductGoal): Promise<void> {
    const phase = this.phases.get(phaseId) as ProblemDiscoveryPhase;
    if (!phase || phase.type !== PhaseType.PROBLEM_DISCOVERY) {
      throw new Error(`Problem discovery phase ${phaseId} not found`);
    }

    const updatedPhase: ProblemDiscoveryPhase = {
      ...phase,
      goals: [...phase.goals, { ...goal, id: this.generateGoalId() }],
      updated: new Date()
    };

    await this.storePhase(updatedPhase);
    this.phases.set(phaseId, updatedPhase);

    this.emit('goalAdded', { phaseId, goal });
  }

  async addProblemStatement(phaseId: string, problem: ProblemStatement): Promise<void> {
    const phase = this.phases.get(phaseId) as ProblemDiscoveryPhase;
    if (!phase || phase.type !== PhaseType.PROBLEM_DISCOVERY) {
      throw new Error(`Problem discovery phase ${phaseId} not found`);
    }

    const updatedPhase: ProblemDiscoveryPhase = {
      ...phase,
      problemStatements: [...phase.problemStatements, { ...problem, id: this.generateProblemId() }],
      updated: new Date()
    };

    await this.storePhase(updatedPhase);
    this.phases.set(phaseId, updatedPhase);

    this.emit('problemStatementAdded', { phaseId, problem });
  }

  // SOLUTION DISCOVERY PHASE
  async startSolutionDiscoveryPhase(productId: string, problemPhaseId: string): Promise<SolutionDiscoveryPhase> {
    const problemPhase = this.phases.get(problemPhaseId);
    if (!problemPhase || problemPhase.status !== PhaseStatus.COMPLETED) {
      throw new Error('Problem discovery phase must be completed first');
    }

    const phaseId = this.generatePhaseId();
    const template = this.phaseTemplates.get(PhaseType.SOLUTION_DISCOVERY)!;
    const now = new Date();

    const phase: SolutionDiscoveryPhase = {
      id: phaseId,
      productId: productId,
      type: PhaseType.SOLUTION_DISCOVERY,
      name: template.name,
      description: template.description,
      status: PhaseStatus.IN_PROGRESS,
      startDate: now,
      endDate: new Date(now.getTime() + template.estimatedDuration * 24 * 60 * 60 * 1000),
      objectives: template.objectives.map(obj => ({
        ...obj,
        status: 'not_started' as ObjectiveStatus,
        progress: 0
      })),
      deliverables: template.deliverables.map(del => ({
        ...del,
        status: 'not_started' as DeliverableStatus,
        assignee: this.userId
      })),
      criteria: template.criteria.map(crit => ({
        ...crit,
        achieved: false,
        score: 0
      })),
      dependencies: [problemPhaseId],
      team: [{ userId: this.userId, role: 'product_manager', permissions: ['read', 'write', 'admin'] }],
      progress: { overall: 0, objectives: 0, deliverables: 0, criteria: 0 },
      insights: [],
      created: now,
      updated: now,
      
      // Solution Discovery specific fields
      keyResults: [],
      userStories: [],
      architecture: this.createDefaultArchitecture(),
      prototypes: [],
      validationResults: [],
      feasibilityAnalysis: this.createDefaultFeasibilityAnalysis()
    };

    await this.storePhase(phase);
    this.phases.set(phaseId, phase);

    this.emit('phaseStarted', { phase, type: 'solution_discovery' });
    return phase;
  }

  async addKeyResult(phaseId: string, keyResult: KeyResult): Promise<void> {
    const phase = this.phases.get(phaseId) as SolutionDiscoveryPhase;
    if (!phase || phase.type !== PhaseType.SOLUTION_DISCOVERY) {
      throw new Error(`Solution discovery phase ${phaseId} not found`);
    }

    const updatedPhase: SolutionDiscoveryPhase = {
      ...phase,
      keyResults: [...phase.keyResults, { ...keyResult, id: this.generateKeyResultId() }],
      updated: new Date()
    };

    await this.storePhase(updatedPhase);
    this.phases.set(phaseId, updatedPhase);

    this.emit('keyResultAdded', { phaseId, keyResult });
  }

  async addUserStory(phaseId: string, userStory: UserStory): Promise<void> {
    const phase = this.phases.get(phaseId) as SolutionDiscoveryPhase;
    if (!phase || phase.type !== PhaseType.SOLUTION_DISCOVERY) {
      throw new Error(`Solution discovery phase ${phaseId} not found`);
    }

    const updatedPhase: SolutionDiscoveryPhase = {
      ...phase,
      userStories: [...phase.userStories, { ...userStory, id: this.generateUserStoryId() }],
      updated: new Date()
    };

    await this.storePhase(updatedPhase);
    this.phases.set(phaseId, updatedPhase);

    this.emit('userStoryAdded', { phaseId, userStory });
  }

  // DELIVERY & SUPPORT PHASE
  async startDeliverySupportPhase(productId: string, solutionPhaseId: string): Promise<DeliverySupportPhase> {
    const solutionPhase = this.phases.get(solutionPhaseId);
    if (!solutionPhase || solutionPhase.status !== PhaseStatus.COMPLETED) {
      throw new Error('Solution discovery phase must be completed first');
    }

    const phaseId = this.generatePhaseId();
    const template = this.phaseTemplates.get(PhaseType.DELIVERY_SUPPORT)!;
    const now = new Date();

    const phase: DeliverySupportPhase = {
      id: phaseId,
      productId: productId,
      type: PhaseType.DELIVERY_SUPPORT,
      name: template.name,
      description: template.description,
      status: PhaseStatus.IN_PROGRESS,
      startDate: now,
      endDate: new Date(now.getTime() + template.estimatedDuration * 24 * 60 * 60 * 1000),
      objectives: template.objectives.map(obj => ({
        ...obj,
        status: 'not_started' as ObjectiveStatus,
        progress: 0
      })),
      deliverables: template.deliverables.map(del => ({
        ...del,
        status: 'not_started' as DeliverableStatus,
        assignee: this.userId
      })),
      criteria: template.criteria.map(crit => ({
        ...crit,
        achieved: false,
        score: 0
      })),
      dependencies: [solutionPhaseId],
      team: [{ userId: this.userId, role: 'product_manager', permissions: ['read', 'write', 'admin'] }],
      progress: { overall: 0, objectives: 0, deliverables: 0, criteria: 0 },
      insights: [],
      created: now,
      updated: now,
      
      // Delivery & Support specific fields
      outcomes: [],
      launchPlan: this.createDefaultLaunchPlan(),
      supportPlan: this.createDefaultSupportPlan(),
      metrics: this.createDefaultDeliveryMetrics(),
      postLaunchAnalysis: this.createDefaultPostLaunchAnalysis(),
      iterationPlan: this.createDefaultIterationPlan()
    };

    await this.storePhase(phase);
    this.phases.set(phaseId, phase);

    this.emit('phaseStarted', { phase, type: 'delivery_support' });
    return phase;
  }

  async addDeliveryOutcome(phaseId: string, outcome: DeliveryOutcome): Promise<void> {
    const phase = this.phases.get(phaseId) as DeliverySupportPhase;
    if (!phase || phase.type !== PhaseType.DELIVERY_SUPPORT) {
      throw new Error(`Delivery support phase ${phaseId} not found`);
    }

    const updatedPhase: DeliverySupportPhase = {
      ...phase,
      outcomes: [...phase.outcomes, { ...outcome, id: this.generateOutcomeId() }],
      updated: new Date()
    };

    await this.storePhase(updatedPhase);
    this.phases.set(phaseId, updatedPhase);

    this.emit('outcomeAdded', { phaseId, outcome });
  }

  // PHASE MANAGEMENT
  async completePhase(phaseId: string): Promise<void> {
    const phase = this.phases.get(phaseId);
    if (!phase) {
      throw new Error(`Phase ${phaseId} not found`);
    }

    // Check completion criteria
    const canComplete = await this.checkPhaseCompletionCriteria(phase);
    if (!canComplete.eligible) {
      throw new Error(`Phase cannot be completed: ${canComplete.reasons.join(', ')}`);
    }

    const updatedPhase: ProductPhase = {
      ...phase,
      status: PhaseStatus.COMPLETED,
      endDate: new Date(),
      updated: new Date()
    };

    await this.storePhase(updatedPhase);
    this.phases.set(phaseId, updatedPhase);

    // Track completion analytics
    this.analytics.trackEvent({
      name: 'phase_completed',
      properties: {
        phaseId: phaseId,
        phaseType: phase.type,
        productId: phase.productId,
        duration: updatedPhase.endDate!.getTime() - phase.startDate.getTime(),
        objectivesCompleted: phase.objectives.filter(obj => obj.progress === 100).length,
        deliverablesCompleted: phase.deliverables.filter(del => del.status === 'completed').length
      }
    });

    this.emit('phaseCompleted', { phase: updatedPhase });
  }

  private async checkPhaseCompletionCriteria(phase: ProductPhase): Promise<CompletionCheck> {
    const reasons: string[] = [];
    let eligible = true;

    // Check required objectives
    const incompleteObjectives = phase.objectives.filter(obj => obj.required && obj.progress < 100);
    if (incompleteObjectives.length > 0) {
      eligible = false;
      reasons.push(`${incompleteObjectives.length} required objectives incomplete`);
    }

    // Check required deliverables
    const incompleteDeliverables = phase.deliverables.filter(del => del.required && del.status !== 'completed');
    if (incompleteDeliverables.length > 0) {
      eligible = false;
      reasons.push(`${incompleteDeliverables.length} required deliverables incomplete`);
    }

    // Check minimum criteria score
    const avgCriteriaScore = phase.criteria.reduce((sum, crit) => sum + crit.score, 0) / phase.criteria.length;
    if (avgCriteriaScore < 70) {
      eligible = false;
      reasons.push(`Criteria score too low: ${Math.round(avgCriteriaScore)}% (minimum 70%)`);
    }

    return { eligible, reasons };
  }

  private async updateObjectiveProgress(phaseId: string, objectiveId: string, progress: number): Promise<void> {
    const phase = this.phases.get(phaseId);
    if (!phase) return;

    const objective = phase.objectives.find(obj => obj.id === objectiveId);
    if (!objective) return;

    objective.progress = progress;
    objective.status = progress === 100 ? 'completed' : progress > 0 ? 'in_progress' : 'not_started';

    // Recalculate overall progress
    phase.progress = this.calculatePhaseProgress(phase);
    phase.updated = new Date();

    await this.storePhase(phase);
    this.phases.set(phaseId, phase);

    this.emit('objectiveProgressUpdated', { phaseId, objectiveId, progress });
  }

  private calculatePhaseProgress(phase: ProductPhase): PhaseProgress {
    const objectiveProgress = phase.objectives.reduce((sum, obj) => sum + obj.progress, 0) / phase.objectives.length;
    const deliverableProgress = phase.deliverables.reduce((sum, del) => {
      const score = del.status === 'completed' ? 100 : del.status === 'in_progress' ? 50 : 0;
      return sum + score;
    }, 0) / phase.deliverables.length;
    const criteriaProgress = phase.criteria.reduce((sum, crit) => sum + crit.score, 0) / phase.criteria.length;

    const overall = (objectiveProgress + deliverableProgress + criteriaProgress) / 3;

    return {
      overall: Math.round(overall),
      objectives: Math.round(objectiveProgress),
      deliverables: Math.round(deliverableProgress),
      criteria: Math.round(criteriaProgress)
    };
  }

  private async checkPhaseTransitions(): Promise<void> {
    try {
      for (const [id, phase] of this.phases) {
        if (phase.status === PhaseStatus.IN_PROGRESS) {
          // Check if phase should auto-transition
          const progress = this.calculatePhaseProgress(phase);
          
          if (progress.overall >= 90) {
            this.emit('phaseNearCompletion', { phaseId: id, progress });
          }

          // Check for blockers
          if (phase.endDate && phase.endDate < new Date() && progress.overall < 100) {
            this.emit('phaseOverdue', { phaseId: id, daysOverdue: Math.ceil((Date.now() - phase.endDate.getTime()) / (24 * 60 * 60 * 1000)) });
          }
        }
      }
    } catch (error) {
      console.warn('Failed to check phase transitions:', error);
    }
  }

  private async monitorPhaseHealth(): Promise<void> {
    try {
      for (const [id, phase] of this.phases) {
        if (phase.status === PhaseStatus.IN_PROGRESS) {
          const health = this.calculatePhaseHealth(phase);
          
          if (health.score < 70) {
            this.emit('phaseHealthAlert', { phaseId: id, health });
          }
        }
      }
    } catch (error) {
      console.warn('Failed to monitor phase health:', error);
    }
  }

  private calculatePhaseHealth(phase: ProductPhase): PhaseHealth {
    let score = 100;
    const issues: string[] = [];

    // Check timeline
    const daysSinceStart = Math.ceil((Date.now() - phase.startDate.getTime()) / (24 * 60 * 60 * 1000));
    const expectedDuration = phase.endDate ? Math.ceil((phase.endDate.getTime() - phase.startDate.getTime()) / (24 * 60 * 60 * 1000)) : 30;
    const timelineProgress = Math.min(100, (daysSinceStart / expectedDuration) * 100);
    const workProgress = phase.progress.overall;

    if (timelineProgress > workProgress + 20) {
      score -= 20;
      issues.push('Behind schedule');
    }

    // Check team engagement
    const activeTeamMembers = phase.team.filter(member => member.permissions.includes('write')).length;
    if (activeTeamMembers < 2) {
      score -= 15;
      issues.push('Insufficient team engagement');
    }

    // Check deliverable quality
    const completedDeliverables = phase.deliverables.filter(del => del.status === 'completed').length;
    const totalDeliverables = phase.deliverables.length;
    const deliverableRate = totalDeliverables > 0 ? (completedDeliverables / totalDeliverables) * 100 : 100;

    if (deliverableRate < 50 && timelineProgress > 50) {
      score -= 25;
      issues.push('Low deliverable completion rate');
    }

    return {
      score: Math.max(0, score),
      issues: issues,
      recommendations: this.generateHealthRecommendations(issues)
    };
  }

  private generateHealthRecommendations(issues: string[]): string[] {
    const recommendations: string[] = [];
    
    if (issues.includes('Behind schedule')) {
      recommendations.push('Review scope and consider descoping non-critical items');
      recommendations.push('Increase team capacity or extend timeline');
    }
    
    if (issues.includes('Insufficient team engagement')) {
      recommendations.push('Add more team members with write permissions');
      recommendations.push('Conduct team alignment session');
    }
    
    if (issues.includes('Low deliverable completion rate')) {
      recommendations.push('Focus on completing existing deliverables before starting new ones');
      recommendations.push('Review deliverable complexity and break down if needed');
    }

    return recommendations;
  }

  // Helper methods for creating default objects
  private createDefaultVision(): ProductVision {
    return {
      statement: '',
      description: '',
      timeframe: '2-3 years',
      stakeholders: [],
      success_criteria: [],
      created: new Date()
    };
  }

  private createDefaultOpportunityAssessment(): OpportunityAssessment {
    return {
      marketSize: 0,
      competitiveAdvantage: '',
      riskFactors: [],
      successProbability: 0,
      investmentRequired: 0,
      expectedReturn: 0
    };
  }

  private createDefaultArchitecture(): SolutionArchitecture {
    return {
      overview: '',
      components: [],
      integrations: [],
      scalability: '',
      security: '',
      performance: '',
      maintainability: ''
    };
  }

  private createDefaultFeasibilityAnalysis(): FeasibilityAnalysis {
    return {
      technical: { feasible: true, challenges: [], score: 80 },
      business: { feasible: true, challenges: [], score: 80 },
      operational: { feasible: true, challenges: [], score: 80 },
      timeline: { feasible: true, challenges: [], score: 80 },
      overall: { feasible: true, score: 80, recommendations: [] }
    };
  }

  private createDefaultLaunchPlan(): LaunchPlan {
    return {
      strategy: 'phased_rollout',
      timeline: [],
      channels: [],
      messaging: '',
      success_metrics: [],
      rollback_plan: ''
    };
  }

  private createDefaultSupportPlan(): SupportPlan {
    return {
      channels: ['email', 'chat'],
      sla: { response_time: 24, resolution_time: 72 },
      documentation: [],
      training: [],
      escalation: []
    };
  }

  private createDefaultDeliveryMetrics(): DeliveryMetrics {
    return {
      adoption: { target: 0, current: 0 },
      satisfaction: { target: 8.0, current: 0 },
      performance: { target: 0, current: 0 },
      business: { target: 0, current: 0 }
    };
  }

  private createDefaultPostLaunchAnalysis(): PostLaunchAnalysis {
    return {
      outcomes_achieved: [],
      lessons_learned: [],
      user_feedback: [],
      performance_data: {},
      recommendations: []
    };
  }

  private createDefaultIterationPlan(): IterationPlan {
    return {
      cycle_length: 14, // days
      priorities: [],
      improvements: [],
      experiments: []
    };
  }

  private async storePhase(phase: ProductPhase): Promise<void> {
    await this.memory.store(
      JSON.stringify(phase),
      MemoryType.FACT,
      {
        session_id: this.workspaceId,
        tags: ['product_phase', phase.id, phase.type, phase.status, phase.productId]
      }
    );
  }

  // ID generators
  private generatePhaseId(): string {
    return `phase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateGoalId(): string {
    return `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateProblemId(): string {
    return `problem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateKeyResultId(): string {
    return `kr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateUserStoryId(): string {
    return `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateOutcomeId(): string {
    return `outcome_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getPhasesSummary(): Promise<any> {
    const totalPhases = this.phases.size;
    const activePhases = Array.from(this.phases.values()).filter(p => p.status === PhaseStatus.IN_PROGRESS);
    const completedPhases = Array.from(this.phases.values()).filter(p => p.status === PhaseStatus.COMPLETED);

    const avgProgress = activePhases.length > 0
      ? activePhases.reduce((sum, p) => sum + p.progress.overall, 0) / activePhases.length
      : 0;

    return {
      overview: {
        totalPhases,
        activePhases: activePhases.length,
        completedPhases: completedPhases.length,
        avgProgress: Math.round(avgProgress)
      },
      byType: {
        problemDiscovery: Array.from(this.phases.values()).filter(p => p.type === PhaseType.PROBLEM_DISCOVERY).length,
        solutionDiscovery: Array.from(this.phases.values()).filter(p => p.type === PhaseType.SOLUTION_DISCOVERY).length,
        deliverySupport: Array.from(this.phases.values()).filter(p => p.type === PhaseType.DELIVERY_SUPPORT).length
      },
      health: {
        averageScore: this.calculateAveragePhaseHealth()
      }
    };
  }

  private calculateAveragePhaseHealth(): number {
    const activePhases = Array.from(this.phases.values()).filter(p => p.status === PhaseStatus.IN_PROGRESS);
    if (activePhases.length === 0) return 100;
    
    const totalScore = activePhases.reduce((sum, phase) => sum + this.calculatePhaseHealth(phase).score, 0);
    return Math.round(totalScore / activePhases.length);
  }

  async cleanup(): Promise<void> {
    this.phases.clear();
    this.phaseTemplates.clear();
    this.removeAllListeners();
  }
}

// Supporting interfaces
interface PhaseTemplate {
  name: string;
  description: string;
  estimatedDuration: number; // days
  objectives: PhaseObjectiveTemplate[];
  deliverables: PhaseDeliverableTemplate[];
  criteria: CompletionCriteriaTemplate[];
}

interface PhaseObjectiveTemplate {
  id: string;
  name: string;
  required: boolean;
}

interface PhaseDeliverableTemplate {
  type: DeliverableType;
  required: boolean;
}

interface CompletionCriteriaTemplate {
  name: string;
  description: string;
  weight: number;
}

interface PhaseObjective {
  id: string;
  name: string;
  required: boolean;
  status: ObjectiveStatus;
  progress: number; // 0-100
}

interface PhaseDeliverable {
  type: DeliverableType;
  required: boolean;
  status: DeliverableStatus;
  assignee: string;
}

interface CompletionCriteria {
  name: string;
  description: string;
  weight: number;
  achieved: boolean;
  score: number; // 0-100
}

interface PhaseTeam {
  userId: string;
  role: string;
  permissions: string[];
}

interface PhaseProgress {
  overall: number; // 0-100
  objectives: number; // 0-100
  deliverables: number; // 0-100
  criteria: number; // 0-100
}

interface PhaseInsight {
  id: string;
  type: string;
  description: string;
  impact: string;
  created: Date;
}

interface ProductVision {
  statement: string;
  description: string;
  timeframe: string;
  stakeholders: string[];
  success_criteria: string[];
  created: Date;
}

interface ProductGoal {
  id?: string;
  category: GoalCategory;
  title: string;
  description: string;
  metrics: GoalMetric[];
  target_date: Date;
  priority: 'low' | 'medium' | 'high';
  owner: string;
}

interface GoalMetric {
  name: string;
  target: number;
  current: number;
  unit: string;
}

interface ProblemStatement {
  id?: string;
  title: string;
  description: string;
  affected_users: string[];
  impact: 'low' | 'medium' | 'high';
  frequency: 'rare' | 'occasional' | 'frequent';
  current_solutions: string[];
  evidence: string[];
}

interface OpportunityAssessment {
  marketSize: number;
  competitiveAdvantage: string;
  riskFactors: string[];
  successProbability: number; // 0-100
  investmentRequired: number;
  expectedReturn: number;
}

interface KeyResult {
  id?: string;
  title: string;
  description: string;
  metric: string;
  target: number;
  current: number;
  deadline: Date;
  owner: string;
  status: 'not_started' | 'in_progress' | 'completed';
}

interface UserStory {
  id?: string;
  title: string;
  description: string;
  persona: string;
  acceptance_criteria: string[];
  priority: 'low' | 'medium' | 'high';
  story_points: number;
  status: 'backlog' | 'in_progress' | 'done';
}

interface SolutionArchitecture {
  overview: string;
  components: ArchitectureComponent[];
  integrations: Integration[];
  scalability: string;
  security: string;
  performance: string;
  maintainability: string;
}

interface ArchitectureComponent {
  name: string;
  description: string;
  type: string;
  dependencies: string[];
}

interface Integration {
  name: string;
  type: string;
  description: string;
  requirements: string[];
}

interface Prototype {
  id: string;
  name: string;
  type: 'wireframe' | 'mockup' | 'interactive' | 'mvp';
  description: string;
  url?: string;
  feedback: PrototypeFeedback[];
}

interface PrototypeFeedback {
  user: string;
  feedback: string;
  rating: number;
  timestamp: Date;
}

interface ValidationResult {
  test_type: string;
  hypothesis: string;
  result: 'validated' | 'invalidated' | 'inconclusive';
  confidence: number;
  evidence: string[];
}

interface FeasibilityAnalysis {
  technical: FeasibilityAssessment;
  business: FeasibilityAssessment;
  operational: FeasibilityAssessment;
  timeline: FeasibilityAssessment;
  overall: OverallFeasibility;
}

interface FeasibilityAssessment {
  feasible: boolean;
  challenges: string[];
  score: number; // 0-100
}

interface OverallFeasibility {
  feasible: boolean;
  score: number; // 0-100
  recommendations: string[];
}

interface DeliveryOutcome {
  id?: string;
  type: 'business' | 'user' | 'technical';
  title: string;
  description: string;
  target: number;
  actual?: number;
  achieved: boolean;
  measurement_date?: Date;
}

interface LaunchPlan {
  strategy: string;
  timeline: LaunchMilestone[];
  channels: string[];
  messaging: string;
  success_metrics: string[];
  rollback_plan: string;
}

interface LaunchMilestone {
  name: string;
  date: Date;
  description: string;
  completed: boolean;
}

interface SupportPlan {
  channels: string[];
  sla: ServiceLevelAgreement;
  documentation: string[];
  training: string[];
  escalation: string[];
}

interface ServiceLevelAgreement {
  response_time: number; // hours
  resolution_time: number; // hours
}

interface DeliveryMetrics {
  adoption: MetricTarget;
  satisfaction: MetricTarget;
  performance: MetricTarget;
  business: MetricTarget;
}

interface MetricTarget {
  target: number;
  current: number;
}

interface PostLaunchAnalysis {
  outcomes_achieved: string[];
  lessons_learned: string[];
  user_feedback: string[];
  performance_data: Record<string, any>;
  recommendations: string[];
}

interface IterationPlan {
  cycle_length: number; // days
  priorities: string[];
  improvements: string[];
  experiments: string[];
}

interface CompletionCheck {
  eligible: boolean;
  reasons: string[];
}

interface PhaseHealth {
  score: number; // 0-100
  issues: string[];
  recommendations: string[];
}

type ObjectiveStatus = 'not_started' | 'in_progress' | 'completed';
type DeliverableStatus = 'not_started' | 'in_progress' | 'completed';

export default PhaseManager; 