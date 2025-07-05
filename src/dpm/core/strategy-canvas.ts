// Digital Product Management Strategy Canvas
// Business model canvas, value proposition design, and strategic planning

import { EventEmitter } from 'events';
import { 
  Product,
  ProductStrategy,
  BusinessModel,
  BusinessModelType,
  PricingStrategy,
  TargetMarket,
  UserPersona,
  MarketSegment
} from '../types/product-types';
import { DPMConfigManager } from '../config/dpm-config';
import { HierarchicalMemoryManager } from '../../memory/hierarchical-manager';
import { MemoryType } from '../../memory/interfaces';

export interface StrategyCanvasOptions {
  config: DPMConfigManager;
  memory: HierarchicalMemoryManager;
  workspaceId: string;
  userId: string;
}

export interface BusinessModelCanvas {
  id: string;
  productId: string;
  name: string;
  description: string;
  keyPartners: CanvasItem[];
  keyActivities: CanvasItem[];
  keyResources: CanvasItem[];
  valuePropositions: CanvasItem[];
  customerRelationships: CanvasItem[];
  channels: CanvasItem[];
  customerSegments: CanvasItem[];
  costStructure: CostItem[];
  revenueStreams: RevenueItem[];
  created: Date;
  updated: Date;
  version: string;
  status: CanvasStatus;
  collaborators: string[];
}

export interface CanvasItem {
  id: string;
  title: string;
  description: string;
  priority: ItemPriority;
  confidence: number; // 0-100
  evidence: string[];
  assumptions: string[];
  tags: string[];
}

export interface CostItem extends CanvasItem {
  type: CostType;
  estimatedAmount?: number;
  frequency: CostFrequency;
  category: CostCategory;
}

export interface RevenueItem extends CanvasItem {
  type: RevenueType;
  estimatedAmount?: number;
  frequency: RevenueFrequency;
  margin?: number; // percentage
}

export enum CanvasStatus {
  DRAFT = 'draft',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  ACTIVE = 'active',
  ARCHIVED = 'archived'
}

export enum ItemPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum CostType {
  FIXED = 'fixed',
  VARIABLE = 'variable',
  SEMI_VARIABLE = 'semi_variable'
}

export enum CostFrequency {
  ONE_TIME = 'one_time',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUALLY = 'annually'
}

export enum CostCategory {
  PERSONNEL = 'personnel',
  TECHNOLOGY = 'technology',
  MARKETING = 'marketing',
  OPERATIONS = 'operations',
  FACILITIES = 'facilities',
  LEGAL = 'legal',
  OTHER = 'other'
}

export enum RevenueType {
  SUBSCRIPTION = 'subscription',
  ONE_TIME = 'one_time',
  USAGE_BASED = 'usage_based',
  COMMISSION = 'commission',
  ADVERTISING = 'advertising',
  LICENSING = 'licensing'
}

export enum RevenueFrequency {
  ONE_TIME = 'one_time',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUALLY = 'annually',
  PER_USAGE = 'per_usage'
}

export interface ValuePropositionCanvas {
  id: string;
  productId: string;
  customerSegmentId: string;
  name: string;
  description: string;
  customerJobs: CustomerJob[];
  painPoints: PainPoint[];
  gains: Gain[];
  products: ProductService[];
  painRelievers: PainReliever[];
  gainCreators: GainCreator[];
  created: Date;
  updated: Date;
  fitScore: number; // 0-100
  validated: boolean;
}

export interface CustomerJob {
  id: string;
  job: string;
  importance: number; // 1-10
  satisfaction: number; // 1-10
  frequency: JobFrequency;
  context: string;
  outcome: string;
}

export interface PainPoint {
  id: string;
  pain: string;
  intensity: number; // 1-10
  frequency: PainFrequency;
  category: PainCategory;
  currentSolutions: string[];
}

export interface Gain {
  id: string;
  gain: string;
  importance: number; // 1-10
  expectation: number; // 1-10
  category: GainCategory;
}

export interface ProductService {
  id: string;
  name: string;
  description: string;
  features: string[];
  benefits: string[];
  type: ProductType;
}

export interface PainReliever {
  id: string;
  reliever: string;
  painPointId: string;
  effectiveness: number; // 1-10
  feasibility: number; // 1-10
  description: string;
}

export interface GainCreator {
  id: string;
  creator: string;
  gainId: string;
  impact: number; // 1-10
  feasibility: number; // 1-10
  description: string;
}

export enum JobFrequency {
  RARE = 'rare',
  OCCASIONAL = 'occasional',
  REGULAR = 'regular',
  FREQUENT = 'frequent',
  CONSTANT = 'constant'
}

export enum PainFrequency {
  RARE = 'rare',
  OCCASIONAL = 'occasional',
  REGULAR = 'regular',
  FREQUENT = 'frequent',
  CONSTANT = 'constant'
}

export enum PainCategory {
  FUNCTIONAL = 'functional',
  EMOTIONAL = 'emotional',
  SOCIAL = 'social',
  FINANCIAL = 'financial',
  TIME = 'time'
}

export enum GainCategory {
  FUNCTIONAL = 'functional',
  EMOTIONAL = 'emotional',
  SOCIAL = 'social',
  FINANCIAL = 'financial',
  TIME = 'time'
}

export enum ProductType {
  CORE = 'core',
  SUPPORTING = 'supporting',
  COMPLEMENTARY = 'complementary'
}

export interface StrategicPlan {
  id: string;
  productId: string;
  name: string;
  description: string;
  vision: string;
  mission: string;
  objectives: StrategicObjective[];
  initiatives: StrategicInitiative[];
  kpis: KPI[];
  timeframe: Timeframe;
  budget: number;
  resources: ResourceRequirement[];
  risks: Risk[];
  dependencies: Dependency[];
  created: Date;
  updated: Date;
  status: PlanStatus;
  progress: number; // 0-100
}

export interface StrategicObjective {
  id: string;
  title: string;
  description: string;
  category: ObjectiveCategory;
  priority: ItemPriority;
  owner: string;
  dueDate: Date;
  progress: number; // 0-100
  kpis: string[]; // KPI IDs
  milestones: Milestone[];
}

export interface StrategicInitiative {
  id: string;
  title: string;
  description: string;
  objectiveId: string;
  type: InitiativeType;
  priority: ItemPriority;
  owner: string;
  team: string[];
  budget: number;
  startDate: Date;
  endDate: Date;
  status: InitiativeStatus;
  progress: number; // 0-100
  deliverables: Deliverable[];
}

export interface KPI {
  id: string;
  name: string;
  description: string;
  category: KPICategory;
  target: number;
  current: number;
  unit: string;
  frequency: MeasurementFrequency;
  trend: Trend;
  owner: string;
  dataSource: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  completed: boolean;
  completedDate?: Date;
  deliverables: string[];
}

export interface Deliverable {
  id: string;
  title: string;
  description: string;
  type: DeliverableType;
  owner: string;
  dueDate: Date;
  status: DeliverableStatus;
  dependencies: string[];
}

export interface ResourceRequirement {
  id: string;
  type: ResourceType;
  description: string;
  quantity: number;
  unit: string;
  cost: number;
  startDate: Date;
  endDate: Date;
  critical: boolean;
}

export interface Risk {
  id: string;
  title: string;
  description: string;
  category: RiskCategory;
  probability: number; // 1-10
  impact: number; // 1-10
  severity: number; // probability * impact
  mitigation: string;
  contingency: string;
  owner: string;
  status: RiskStatus;
}

export interface Dependency {
  id: string;
  title: string;
  description: string;
  type: DependencyType;
  dependsOn: string;
  blockedBy: string[];
  critical: boolean;
  status: DependencyStatus;
}

export enum ObjectiveCategory {
  GROWTH = 'growth',
  EFFICIENCY = 'efficiency',
  INNOVATION = 'innovation',
  QUALITY = 'quality',
  CUSTOMER = 'customer',
  FINANCIAL = 'financial'
}

export enum InitiativeType {
  PRODUCT = 'product',
  MARKETING = 'marketing',
  OPERATIONS = 'operations',
  TECHNOLOGY = 'technology',
  PARTNERSHIP = 'partnership',
  RESEARCH = 'research'
}

export enum InitiativeStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum KPICategory {
  BUSINESS = 'business',
  PRODUCT = 'product',
  CUSTOMER = 'customer',
  OPERATIONAL = 'operational',
  FINANCIAL = 'financial'
}

export enum MeasurementFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUALLY = 'annually'
}

export enum Trend {
  UP = 'up',
  DOWN = 'down',
  STABLE = 'stable',
  VOLATILE = 'volatile'
}

export enum DeliverableType {
  DOCUMENT = 'document',
  PROTOTYPE = 'prototype',
  FEATURE = 'feature',
  ANALYSIS = 'analysis',
  PRESENTATION = 'presentation',
  TRAINING = 'training'
}

export enum DeliverableStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum ResourceType {
  HUMAN = 'human',
  FINANCIAL = 'financial',
  TECHNOLOGY = 'technology',
  EQUIPMENT = 'equipment',
  FACILITY = 'facility'
}

export enum RiskCategory {
  TECHNICAL = 'technical',
  MARKET = 'market',
  FINANCIAL = 'financial',
  OPERATIONAL = 'operational',
  REGULATORY = 'regulatory',
  COMPETITIVE = 'competitive'
}

export enum RiskStatus {
  IDENTIFIED = 'identified',
  ASSESSED = 'assessed',
  MITIGATED = 'mitigated',
  REALIZED = 'realized',
  CLOSED = 'closed'
}

export enum DependencyType {
  INTERNAL = 'internal',
  EXTERNAL = 'external',
  TECHNICAL = 'technical',
  RESOURCE = 'resource'
}

export enum DependencyStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  BLOCKED = 'blocked'
}

export enum PlanStatus {
  DRAFT = 'draft',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface Timeframe {
  startDate: Date;
  endDate: Date;
  quarters: Quarter[];
}

export interface Quarter {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  objectives: string[]; // objective IDs
  budget: number;
}

export class StrategyCanvasSystem extends EventEmitter {
  private config: DPMConfigManager;
  private memory: HierarchicalMemoryManager;
  private workspaceId: string;
  private userId: string;
  private businessModels = new Map<string, BusinessModelCanvas>();
  private valuePropositions = new Map<string, ValuePropositionCanvas>();
  private strategicPlans = new Map<string, StrategicPlan>();
  private initialized = false;

  constructor(options: StrategyCanvasOptions) {
    super();
    this.config = options.config;
    this.memory = options.memory;
    this.workspaceId = options.workspaceId;
    this.userId = options.userId;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load existing strategy data
      await this.loadStrategyData();
      
      // Set up strategy analysis
      this.setupStrategyAnalysis();
      
      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private async loadStrategyData(): Promise<void> {
    try {
      // Load business model canvases
      const businessModelData = await this.memory.recall({
        text: `workspace:${this.workspaceId} business_model_canvas`,
        session_id: this.workspaceId,
        limit: 100
      });

      for (const memory of businessModelData.entries) {
        if (memory.metadata?.tags?.includes('business_model_canvas')) {
          try {
            const canvas = JSON.parse(memory.content) as BusinessModelCanvas;
            this.businessModels.set(canvas.id, canvas);
          } catch (error) {
            console.warn('Failed to parse business model canvas:', error);
          }
        }
      }

      // Load value proposition canvases
      const valuePropositionData = await this.memory.recall({
        text: `workspace:${this.workspaceId} value_proposition_canvas`,
        session_id: this.workspaceId,
        limit: 100
      });

      for (const memory of valuePropositionData.entries) {
        if (memory.metadata?.tags?.includes('value_proposition_canvas')) {
          try {
            const canvas = JSON.parse(memory.content) as ValuePropositionCanvas;
            this.valuePropositions.set(canvas.id, canvas);
          } catch (error) {
            console.warn('Failed to parse value proposition canvas:', error);
          }
        }
      }

      // Load strategic plans
      const strategicPlanData = await this.memory.recall({
        text: `workspace:${this.workspaceId} strategic_plan`,
        session_id: this.workspaceId,
        limit: 50
      });

      for (const memory of strategicPlanData.entries) {
        if (memory.metadata?.tags?.includes('strategic_plan')) {
          try {
            const plan = JSON.parse(memory.content) as StrategicPlan;
            this.strategicPlans.set(plan.id, plan);
          } catch (error) {
            console.warn('Failed to parse strategic plan:', error);
          }
        }
      }

      console.log(`Loaded ${this.businessModels.size} business models, ${this.valuePropositions.size} value propositions, ${this.strategicPlans.size} strategic plans`);
    } catch (error) {
      console.warn('Failed to load strategy data:', error);
    }
  }

  private setupStrategyAnalysis(): void {
    // Set up periodic strategy analysis
    setInterval(() => {
      this.analyzeStrategyAlignment();
    }, 86400000); // Run daily
  }

  // Business Model Canvas Management
  async createBusinessModelCanvas(productId: string, name: string, description: string): Promise<BusinessModelCanvas> {
    if (!this.initialized) {
      await this.initialize();
    }

    const canvasId = this.generateCanvasId();
    const now = new Date();

    const canvas: BusinessModelCanvas = {
      id: canvasId,
      productId: productId,
      name: name,
      description: description,
      keyPartners: [],
      keyActivities: [],
      keyResources: [],
      valuePropositions: [],
      customerRelationships: [],
      channels: [],
      customerSegments: [],
      costStructure: [],
      revenueStreams: [],
      created: now,
      updated: now,
      version: '1.0',
      status: CanvasStatus.DRAFT,
      collaborators: [this.userId]
    };

    await this.storeBusinessModelCanvas(canvas);
    this.businessModels.set(canvasId, canvas);

    this.emit('businessModelCanvasCreated', canvas);
    return canvas;
  }

  async updateBusinessModelCanvas(canvasId: string, updates: Partial<BusinessModelCanvas>): Promise<BusinessModelCanvas> {
    const canvas = this.businessModels.get(canvasId);
    if (!canvas) {
      throw new Error(`Business model canvas ${canvasId} not found`);
    }

    const updatedCanvas: BusinessModelCanvas = {
      ...canvas,
      ...updates,
      id: canvas.id, // Ensure ID cannot be changed
      updated: new Date()
    };

    await this.storeBusinessModelCanvas(updatedCanvas);
    this.businessModels.set(canvasId, updatedCanvas);

    this.emit('businessModelCanvasUpdated', updatedCanvas);
    return updatedCanvas;
  }

  async getBusinessModelCanvas(canvasId: string): Promise<BusinessModelCanvas | undefined> {
    return this.businessModels.get(canvasId);
  }

  async listBusinessModelCanvases(productId?: string): Promise<BusinessModelCanvas[]> {
    let canvases = Array.from(this.businessModels.values());
    
    if (productId) {
      canvases = canvases.filter(c => c.productId === productId);
    }

    return canvases.sort((a, b) => b.updated.getTime() - a.updated.getTime());
  }

  // Value Proposition Canvas Management
  async createValuePropositionCanvas(productId: string, customerSegmentId: string, name: string): Promise<ValuePropositionCanvas> {
    const canvasId = this.generateCanvasId();
    const now = new Date();

    const canvas: ValuePropositionCanvas = {
      id: canvasId,
      productId: productId,
      customerSegmentId: customerSegmentId,
      name: name,
      description: '',
      customerJobs: [],
      painPoints: [],
      gains: [],
      products: [],
      painRelievers: [],
      gainCreators: [],
      created: now,
      updated: now,
      fitScore: 0,
      validated: false
    };

    await this.storeValuePropositionCanvas(canvas);
    this.valuePropositions.set(canvasId, canvas);

    this.emit('valuePropositionCanvasCreated', canvas);
    return canvas;
  }

  async calculateValuePropositionFit(canvasId: string): Promise<number> {
    const canvas = this.valuePropositions.get(canvasId);
    if (!canvas) {
      throw new Error(`Value proposition canvas ${canvasId} not found`);
    }

    // Calculate fit score based on how well pain relievers address pain points
    // and how well gain creators address gains
    let totalFit = 0;
    let totalItems = 0;

    // Pain reliever fit
    for (const painPoint of canvas.painPoints) {
      const relievers = canvas.painRelievers.filter(r => r.painPointId === painPoint.id);
      if (relievers.length > 0) {
        const avgEffectiveness = relievers.reduce((sum, r) => sum + r.effectiveness, 0) / relievers.length;
        totalFit += (avgEffectiveness / 10) * painPoint.intensity;
        totalItems += painPoint.intensity;
      }
    }

    // Gain creator fit
    for (const gain of canvas.gains) {
      const creators = canvas.gainCreators.filter(c => c.gainId === gain.id);
      if (creators.length > 0) {
        const avgImpact = creators.reduce((sum, c) => sum + c.impact, 0) / creators.length;
        totalFit += (avgImpact / 10) * gain.importance;
        totalItems += gain.importance;
      }
    }

    const fitScore = totalItems > 0 ? Math.round((totalFit / totalItems) * 100) : 0;

    // Update canvas with new fit score
    await this.updateValuePropositionCanvas(canvasId, { fitScore: fitScore });

    return fitScore;
  }

  async updateValuePropositionCanvas(canvasId: string, updates: Partial<ValuePropositionCanvas>): Promise<ValuePropositionCanvas> {
    const canvas = this.valuePropositions.get(canvasId);
    if (!canvas) {
      throw new Error(`Value proposition canvas ${canvasId} not found`);
    }

    const updatedCanvas: ValuePropositionCanvas = {
      ...canvas,
      ...updates,
      id: canvas.id, // Ensure ID cannot be changed
      updated: new Date()
    };

    await this.storeValuePropositionCanvas(updatedCanvas);
    this.valuePropositions.set(canvasId, updatedCanvas);

    this.emit('valuePropositionCanvasUpdated', updatedCanvas);
    return updatedCanvas;
  }

  // Strategic Plan Management
  async createStrategicPlan(productId: string, name: string, vision: string, mission: string, timeframe: Timeframe): Promise<StrategicPlan> {
    const planId = this.generatePlanId();
    const now = new Date();

    const plan: StrategicPlan = {
      id: planId,
      productId: productId,
      name: name,
      description: '',
      vision: vision,
      mission: mission,
      objectives: [],
      initiatives: [],
      kpis: [],
      timeframe: timeframe,
      budget: 0,
      resources: [],
      risks: [],
      dependencies: [],
      created: now,
      updated: now,
      status: PlanStatus.DRAFT,
      progress: 0
    };

    await this.storeStrategicPlan(plan);
    this.strategicPlans.set(planId, plan);

    this.emit('strategicPlanCreated', plan);
    return plan;
  }

  async addObjective(planId: string, objective: Omit<StrategicObjective, 'id'>): Promise<StrategicObjective> {
    const plan = this.strategicPlans.get(planId);
    if (!plan) {
      throw new Error(`Strategic plan ${planId} not found`);
    }

    const objectiveWithId: StrategicObjective = {
      ...objective,
      id: this.generateObjectiveId()
    };

    const updatedPlan: StrategicPlan = {
      ...plan,
      objectives: [...plan.objectives, objectiveWithId],
      updated: new Date()
    };

    await this.storeStrategicPlan(updatedPlan);
    this.strategicPlans.set(planId, updatedPlan);

    this.emit('objectiveAdded', { planId, objective: objectiveWithId });
    return objectiveWithId;
  }

  async updateObjectiveProgress(planId: string, objectiveId: string, progress: number): Promise<void> {
    const plan = this.strategicPlans.get(planId);
    if (!plan) {
      throw new Error(`Strategic plan ${planId} not found`);
    }

    const objectiveIndex = plan.objectives.findIndex(o => o.id === objectiveId);
    if (objectiveIndex === -1) {
      throw new Error(`Objective ${objectiveId} not found in plan ${planId}`);
    }

    const updatedObjectives = [...plan.objectives];
    updatedObjectives[objectiveIndex] = {
      ...updatedObjectives[objectiveIndex],
      progress: Math.max(0, Math.min(100, progress))
    };

    // Calculate overall plan progress
    const totalProgress = updatedObjectives.reduce((sum, obj) => sum + obj.progress, 0);
    const avgProgress = updatedObjectives.length > 0 ? totalProgress / updatedObjectives.length : 0;

    const updatedPlan: StrategicPlan = {
      ...plan,
      objectives: updatedObjectives,
      progress: Math.round(avgProgress),
      updated: new Date()
    };

    await this.storeStrategicPlan(updatedPlan);
    this.strategicPlans.set(planId, updatedPlan);

    this.emit('objectiveProgressUpdated', { planId, objectiveId, progress, planProgress: updatedPlan.progress });
  }

  private async analyzeStrategyAlignment(): Promise<void> {
    try {
      // Analyze alignment between business models, value propositions, and strategic plans
      const alignmentIssues: string[] = [];

      for (const [planId, plan] of this.strategicPlans) {
        // Check if there are corresponding business models and value propositions
        const businessModels = Array.from(this.businessModels.values())
          .filter(bm => bm.productId === plan.productId);
        
        const valuePropositions = Array.from(this.valuePropositions.values())
          .filter(vp => vp.productId === plan.productId);

        if (businessModels.length === 0) {
          alignmentIssues.push(`Strategic plan "${plan.name}" lacks corresponding business model canvas`);
        }

        if (valuePropositions.length === 0) {
          alignmentIssues.push(`Strategic plan "${plan.name}" lacks corresponding value proposition canvas`);
        }

        // Check for low-fit value propositions
        for (const vp of valuePropositions) {
          if (vp.fitScore < 60) {
            alignmentIssues.push(`Value proposition "${vp.name}" has low fit score (${vp.fitScore}%)`);
          }
        }
      }

      if (alignmentIssues.length > 0) {
        this.emit('alignmentIssuesDetected', alignmentIssues);
      }
    } catch (error) {
      console.warn('Failed to analyze strategy alignment:', error);
    }
  }

  // Storage methods
  private async storeBusinessModelCanvas(canvas: BusinessModelCanvas): Promise<void> {
    await this.memory.store(
      JSON.stringify(canvas),
      MemoryType.FACT,
      {
        session_id: this.workspaceId,
        tags: ['business_model_canvas', canvas.id, canvas.productId, canvas.status]
      }
    );
  }

  private async storeValuePropositionCanvas(canvas: ValuePropositionCanvas): Promise<void> {
    await this.memory.store(
      JSON.stringify(canvas),
      MemoryType.FACT,
      {
        session_id: this.workspaceId,
        tags: ['value_proposition_canvas', canvas.id, canvas.productId, `fit_${canvas.fitScore}`]
      }
    );
  }

  private async storeStrategicPlan(plan: StrategicPlan): Promise<void> {
    await this.memory.store(
      JSON.stringify(plan),
      MemoryType.FACT,
      {
        session_id: this.workspaceId,
        tags: ['strategic_plan', plan.id, plan.productId, plan.status, `progress_${plan.progress}`]
      }
    );
  }

  // ID generators
  private generateCanvasId(): string {
    return `canvas_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePlanId(): string {
    return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateObjectiveId(): string {
    return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Analytics and Reporting
  async getStrategySummary(): Promise<any> {
    const totalBusinessModels = this.businessModels.size;
    const totalValuePropositions = this.valuePropositions.size;
    const totalStrategicPlans = this.strategicPlans.size;

    const avgFitScore = this.valuePropositions.size > 0
      ? Array.from(this.valuePropositions.values()).reduce((sum, vp) => sum + vp.fitScore, 0) / this.valuePropositions.size
      : 0;

    const activePlans = Array.from(this.strategicPlans.values())
      .filter(p => p.status === PlanStatus.ACTIVE);

    const avgPlanProgress = activePlans.length > 0
      ? activePlans.reduce((sum, p) => sum + p.progress, 0) / activePlans.length
      : 0;

    return {
      overview: {
        totalBusinessModels,
        totalValuePropositions,
        totalStrategicPlans,
        avgFitScore: Math.round(avgFitScore),
        avgPlanProgress: Math.round(avgPlanProgress)
      },
      activePlans: activePlans.length,
      highFitValuePropositions: Array.from(this.valuePropositions.values())
        .filter(vp => vp.fitScore >= 80).length
    };
  }

  async cleanup(): Promise<void> {
    this.businessModels.clear();
    this.valuePropositions.clear();
    this.strategicPlans.clear();
    this.removeAllListeners();
  }
} 