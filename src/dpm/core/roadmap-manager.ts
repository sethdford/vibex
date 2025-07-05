// Digital Product Management Roadmap Manager
// Product planning, feature prioritization, timeline management, and dependency tracking

import { EventEmitter } from 'events';
import { DPMConfigManager } from '../config/dpm-config';
import { HierarchicalMemoryManager } from '../../memory/hierarchical-manager';
import { MemoryType } from '../../memory/interfaces';

export interface RoadmapOptions {
  config: DPMConfigManager;
  memory: HierarchicalMemoryManager;
  workspaceId: string;
  userId: string;
}

export interface ProductRoadmap {
  id: string;
  productId: string;
  name: string;
  description: string;
  vision: string;
  timeframe: RoadmapTimeframe;
  themes: RoadmapTheme[];
  features: RoadmapFeature[];
  milestones: RoadmapMilestone[];
  releases: ProductRelease[];
  dependencies: FeatureDependency[];
  metrics: RoadmapMetrics;
  status: RoadmapStatus;
  visibility: RoadmapVisibility;
  stakeholders: RoadmapStakeholder[];
  created: Date;
  updated: Date;
  version: string;
}

export interface RoadmapTheme {
  id: string;
  name: string;
  description: string;
  color: string;
  priority: ThemePriority;
  objectives: string[];
  kpis: ThemeKPI[];
  features: string[]; // feature IDs
  budget?: number;
  owner: string;
}

export interface RoadmapFeature {
  id: string;
  name: string;
  description: string;
  themeId?: string;
  type: FeatureType;
  status: FeatureStatus;
  priority: FeaturePriority;
  effort: EffortEstimate;
  impact: ImpactEstimate;
  confidence: number; // 0-100
  requirements: FeatureRequirement[];
  acceptance: AcceptanceCriteria[];
  dependencies: string[]; // feature IDs
  assignee?: string;
  team?: string;
  startDate?: Date;
  endDate?: Date;
  releaseId?: string;
  tags: string[];
  metrics: FeatureMetrics;
  feedback: FeatureFeedback[];
}

export interface RoadmapMilestone {
  id: string;
  name: string;
  description: string;
  type: MilestoneType;
  targetDate: Date;
  actualDate?: Date;
  status: MilestoneStatus;
  criteria: string[];
  features: string[]; // feature IDs
  stakeholders: string[];
  dependencies: string[];
  risks: MilestoneRisk[];
}

export interface ProductRelease {
  id: string;
  name: string;
  version: string;
  description: string;
  type: ReleaseType;
  status: ReleaseStatus;
  plannedDate: Date;
  actualDate?: Date;
  features: string[]; // feature IDs
  milestones: string[]; // milestone IDs
  notes: ReleaseNote[];
  metrics: ReleaseMetrics;
  rollout: RolloutPlan;
  communications: CommunicationPlan[];
}

export interface FeatureDependency {
  id: string;
  fromFeatureId: string;
  toFeatureId: string;
  type: DependencyType;
  description: string;
  critical: boolean;
  status: DependencyStatus;
}

// Enums and supporting types
export enum RoadmapStatus {
  DRAFT = 'draft',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}

export enum RoadmapVisibility {
  PRIVATE = 'private',
  TEAM = 'team',
  COMPANY = 'company',
  PUBLIC = 'public'
}

export enum ThemePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum FeatureType {
  EPIC = 'epic',
  FEATURE = 'feature',
  ENHANCEMENT = 'enhancement',
  BUG_FIX = 'bug_fix',
  TECHNICAL_DEBT = 'technical_debt',
  RESEARCH = 'research'
}

export enum FeatureStatus {
  BACKLOG = 'backlog',
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW = 'in_review',
  DONE = 'done',
  CANCELLED = 'cancelled'
}

export enum FeaturePriority {
  P0 = 'p0', // Must have
  P1 = 'p1', // Should have
  P2 = 'p2', // Could have
  P3 = 'p3', // Won't have this time
}

export enum MilestoneType {
  FEATURE = 'feature',
  RELEASE = 'release',
  BUSINESS = 'business',
  TECHNICAL = 'technical'
}

export enum MilestoneStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  AT_RISK = 'at_risk',
  ACHIEVED = 'achieved',
  MISSED = 'missed'
}

export enum ReleaseType {
  MAJOR = 'major',
  MINOR = 'minor',
  PATCH = 'patch',
  HOTFIX = 'hotfix'
}

export enum ReleaseStatus {
  PLANNED = 'planned',
  IN_DEVELOPMENT = 'in_development',
  TESTING = 'testing',
  READY = 'ready',
  RELEASED = 'released',
  CANCELLED = 'cancelled'
}

export enum DependencyType {
  BLOCKS = 'blocks',
  ENABLES = 'enables',
  RELATES_TO = 'relates_to',
  DUPLICATES = 'duplicates'
}

export enum DependencyStatus {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
  BROKEN = 'broken'
}

export class RoadmapManager extends EventEmitter {
  private config: DPMConfigManager;
  private memory: HierarchicalMemoryManager;
  private workspaceId: string;
  private userId: string;
  private roadmaps = new Map<string, ProductRoadmap>();
  private initialized = false;

  constructor(options: RoadmapOptions) {
    super();
    this.config = options.config;
    this.memory = options.memory;
    this.workspaceId = options.workspaceId;
    this.userId = options.userId;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.loadRoadmapData();
      this.setupRoadmapAnalysis();
      
      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private async loadRoadmapData(): Promise<void> {
    try {
      const roadmapData = await this.memory.recall({
        text: `workspace:${this.workspaceId} product_roadmaps`,
        session_id: this.workspaceId,
        limit: 50
      });

      for (const memory of roadmapData.entries) {
        if (memory.metadata?.tags?.includes('product_roadmap')) {
          try {
            const roadmap = JSON.parse(memory.content) as ProductRoadmap;
            this.roadmaps.set(roadmap.id, roadmap);
          } catch (error) {
            console.warn('Failed to parse roadmap:', error);
          }
        }
      }

      console.log(`Loaded ${this.roadmaps.size} product roadmaps`);
    } catch (error) {
      console.warn('Failed to load roadmap data:', error);
    }
  }

  private setupRoadmapAnalysis(): void {
    // Set up periodic roadmap health checks
    setInterval(() => {
      this.analyzeRoadmapHealth();
    }, 86400000); // Run daily
  }

  async createRoadmap(
    productId: string, 
    name: string, 
    description: string, 
    vision: string,
    timeframe: RoadmapTimeframe
  ): Promise<ProductRoadmap> {
    if (!this.initialized) {
      await this.initialize();
    }

    const roadmapId = this.generateRoadmapId();
    const now = new Date();

    const roadmap: ProductRoadmap = {
      id: roadmapId,
      productId: productId,
      name: name,
      description: description,
      vision: vision,
      timeframe: timeframe,
      themes: [],
      features: [],
      milestones: [],
      releases: [],
      dependencies: [],
      metrics: this.createDefaultMetrics(),
      status: RoadmapStatus.DRAFT,
      visibility: RoadmapVisibility.TEAM,
      stakeholders: [{
        userId: this.userId,
        role: 'owner',
        permissions: ['read', 'write', 'admin']
      }],
      created: now,
      updated: now,
      version: '1.0'
    };

    await this.storeRoadmap(roadmap);
    this.roadmaps.set(roadmapId, roadmap);

    this.emit('roadmapCreated', roadmap);
    return roadmap;
  }

  async addFeature(
    roadmapId: string, 
    feature: Omit<RoadmapFeature, 'id' | 'metrics' | 'feedback'>
  ): Promise<RoadmapFeature> {
    const roadmap = this.roadmaps.get(roadmapId);
    if (!roadmap) {
      throw new Error(`Roadmap ${roadmapId} not found`);
    }

    const featureWithId: RoadmapFeature = {
      ...feature,
      id: this.generateFeatureId(),
      metrics: this.createDefaultFeatureMetrics(),
      feedback: []
    };

    // Calculate priority score using RICE framework
    const riceScore = this.calculateRICEScore(featureWithId);
    
    const updatedRoadmap: ProductRoadmap = {
      ...roadmap,
      features: [...roadmap.features, featureWithId],
      updated: new Date()
    };

    await this.storeRoadmap(updatedRoadmap);
    this.roadmaps.set(roadmapId, updatedRoadmap);

    this.emit('featureAdded', { roadmapId, feature: featureWithId, riceScore });
    return featureWithId;
  }

  private calculateRICEScore(feature: RoadmapFeature): number {
    // RICE = (Reach × Impact × Confidence) / Effort
    const reach = feature.impact.reach || 100;
    const impact = feature.impact.businessValue || 3;
    const confidence = feature.confidence / 100;
    const effort = feature.effort.storyPoints || 1;

    return Math.round((reach * impact * confidence) / effort);
  }

  async prioritizeFeatures(roadmapId: string): Promise<RoadmapFeature[]> {
    const roadmap = this.roadmaps.get(roadmapId);
    if (!roadmap) {
      throw new Error(`Roadmap ${roadmapId} not found`);
    }

    // Sort features by RICE score and other factors
    const prioritizedFeatures = roadmap.features.sort((a, b) => {
      const scoreA = this.calculateRICEScore(a);
      const scoreB = this.calculateRICEScore(b);
      
      if (scoreA !== scoreB) {
        return scoreB - scoreA; // Higher score first
      }
      
      // Secondary sort by priority enum
      const priorityOrder = { p0: 4, p1: 3, p2: 2, p3: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    // Update roadmap with new order
    const updatedRoadmap: ProductRoadmap = {
      ...roadmap,
      features: prioritizedFeatures,
      updated: new Date()
    };

    await this.storeRoadmap(updatedRoadmap);
    this.roadmaps.set(roadmapId, updatedRoadmap);

    this.emit('featuresPrioritized', { roadmapId, features: prioritizedFeatures });
    return prioritizedFeatures;
  }

  async createReleasePlan(
    roadmapId: string, 
    releaseName: string, 
    version: string, 
    plannedDate: Date,
    featureIds: string[]
  ): Promise<ProductRelease> {
    const roadmap = this.roadmaps.get(roadmapId);
    if (!roadmap) {
      throw new Error(`Roadmap ${roadmapId} not found`);
    }

    const releaseId = this.generateReleaseId();
    const release: ProductRelease = {
      id: releaseId,
      name: releaseName,
      version: version,
      description: `Release ${version} containing ${featureIds.length} features`,
      type: this.determineReleaseType(version),
      status: ReleaseStatus.PLANNED,
      plannedDate: plannedDate,
      features: featureIds,
      milestones: [],
      notes: [],
      metrics: this.createDefaultReleaseMetrics(),
      rollout: this.createDefaultRolloutPlan(),
      communications: []
    };

    const updatedRoadmap: ProductRoadmap = {
      ...roadmap,
      releases: [...roadmap.releases, release],
      updated: new Date()
    };

    await this.storeRoadmap(updatedRoadmap);
    this.roadmaps.set(roadmapId, updatedRoadmap);

    this.emit('releaseCreated', { roadmapId, release });
    return release;
  }

  private determineReleaseType(version: string): ReleaseType {
    const parts = version.split('.');
    if (parts[0] && parseInt(parts[0]) > 0) return ReleaseType.MAJOR;
    if (parts[1] && parseInt(parts[1]) > 0) return ReleaseType.MINOR;
    return ReleaseType.PATCH;
  }

  async analyzeDependencies(roadmapId: string): Promise<DependencyAnalysis> {
    const roadmap = this.roadmaps.get(roadmapId);
    if (!roadmap) {
      throw new Error(`Roadmap ${roadmapId} not found`);
    }

    const analysis: DependencyAnalysis = {
      totalDependencies: roadmap.dependencies.length,
      criticalPath: this.findCriticalPath(roadmap),
      blockers: this.findBlockers(roadmap),
      risks: this.identifyDependencyRisks(roadmap),
      recommendations: this.generateDependencyRecommendations(roadmap)
    };

    this.emit('dependencyAnalysisCompleted', { roadmapId, analysis });
    return analysis;
  }

  private findCriticalPath(roadmap: ProductRoadmap): string[] {
    // Simplified critical path analysis
    const criticalFeatures: string[] = [];
    
    // Find features with the most dependencies
    for (const feature of roadmap.features) {
      if (feature.dependencies.length > 0 || feature.priority === FeaturePriority.P0) {
        criticalFeatures.push(feature.id);
      }
    }

    return criticalFeatures;
  }

  private findBlockers(roadmap: ProductRoadmap): FeatureDependency[] {
    return roadmap.dependencies.filter(dep => 
      dep.type === DependencyType.BLOCKS && dep.status === DependencyStatus.ACTIVE
    );
  }

  private identifyDependencyRisks(roadmap: ProductRoadmap): DependencyRisk[] {
    const risks: DependencyRisk[] = [];
    
    for (const dependency of roadmap.dependencies) {
      if (dependency.critical && dependency.status === DependencyStatus.ACTIVE) {
        risks.push({
          dependencyId: dependency.id,
          type: 'blocking',
          severity: 'high',
          description: `Critical dependency blocking feature development`,
          mitigation: 'Prioritize dependency resolution or find alternative approach'
        });
      }
    }

    return risks;
  }

  private generateDependencyRecommendations(roadmap: ProductRoadmap): string[] {
    const recommendations: string[] = [];
    
    const blockers = this.findBlockers(roadmap);
    if (blockers.length > 0) {
      recommendations.push(`Resolve ${blockers.length} blocking dependencies to unblock feature development`);
    }

    const criticalPath = this.findCriticalPath(roadmap);
    if (criticalPath.length > 5) {
      recommendations.push('Consider breaking down complex features to reduce dependency chains');
    }

    return recommendations;
  }

  private async analyzeRoadmapHealth(): Promise<void> {
    try {
      for (const [id, roadmap] of this.roadmaps) {
        if (roadmap.status === RoadmapStatus.ACTIVE) {
          const health = this.calculateRoadmapHealth(roadmap);
          
          if (health.score < 70) {
            this.emit('roadmapHealthAlert', { roadmapId: id, health });
          }
        }
      }
    } catch (error) {
      console.warn('Failed to analyze roadmap health:', error);
    }
  }

  private calculateRoadmapHealth(roadmap: ProductRoadmap): RoadmapHealth {
    let score = 100;
    const issues: string[] = [];

    // Check for overdue milestones
    const overdueMilestones = roadmap.milestones.filter(m => 
      m.targetDate < new Date() && m.status !== MilestoneStatus.ACHIEVED
    );
    
    if (overdueMilestones.length > 0) {
      score -= overdueMilestones.length * 10;
      issues.push(`${overdueMilestones.length} overdue milestones`);
    }

    // Check for blocked features
    const blockedFeatures = roadmap.features.filter(f => 
      f.dependencies.some(depId => 
        roadmap.dependencies.find(d => d.id === depId && d.type === DependencyType.BLOCKS)
      )
    );

    if (blockedFeatures.length > 0) {
      score -= blockedFeatures.length * 5;
      issues.push(`${blockedFeatures.length} blocked features`);
    }

    return {
      score: Math.max(0, score),
      issues: issues,
      recommendations: this.generateHealthRecommendations(issues)
    };
  }

  private generateHealthRecommendations(issues: string[]): string[] {
    const recommendations: string[] = [];
    
    if (issues.some(i => i.includes('overdue'))) {
      recommendations.push('Review and update milestone dates or scope');
    }
    
    if (issues.some(i => i.includes('blocked'))) {
      recommendations.push('Prioritize dependency resolution to unblock features');
    }

    return recommendations;
  }

  // Helper methods
  private createDefaultMetrics(): RoadmapMetrics {
    return {
      totalFeatures: 0,
      completedFeatures: 0,
      inProgressFeatures: 0,
      plannedFeatures: 0,
      averageLeadTime: 0,
      velocityTrend: 'stable'
    };
  }

  private createDefaultFeatureMetrics(): FeatureMetrics {
    return {
      leadTime: 0,
      cycleTime: 0,
      deploymentFrequency: 0,
      changeFailureRate: 0
    };
  }

  private createDefaultReleaseMetrics(): ReleaseMetrics {
    return {
      featuresDelivered: 0,
      bugsFound: 0,
      customerSatisfaction: 0,
      adoptionRate: 0
    };
  }

  private createDefaultRolloutPlan(): RolloutPlan {
    return {
      strategy: 'blue-green',
      phases: [
        {
          name: 'Canary',
          percentage: 5,
          duration: 24,
          criteria: ['No critical errors', 'Performance within SLA']
        },
        {
          name: 'Full Rollout',
          percentage: 100,
          duration: 0,
          criteria: ['Canary phase successful']
        }
      ],
      rollbackPlan: 'Automated rollback on critical errors'
    };
  }

  private async storeRoadmap(roadmap: ProductRoadmap): Promise<void> {
    await this.memory.store(
      JSON.stringify(roadmap),
      MemoryType.FACT,
      {
        session_id: this.workspaceId,
        tags: ['product_roadmap', roadmap.id, roadmap.productId, roadmap.status]
      }
    );
  }

  private generateRoadmapId(): string {
    return `roadmap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFeatureId(): string {
    return `feature_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateReleaseId(): string {
    return `release_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getRoadmapSummary(): Promise<any> {
    const totalRoadmaps = this.roadmaps.size;
    const activeRoadmaps = Array.from(this.roadmaps.values())
      .filter(r => r.status === RoadmapStatus.ACTIVE);

    const totalFeatures = activeRoadmaps.reduce((sum, r) => sum + r.features.length, 0);
    const completedFeatures = activeRoadmaps.reduce((sum, r) => 
      sum + r.features.filter(f => f.status === FeatureStatus.DONE).length, 0
    );

    return {
      overview: {
        totalRoadmaps,
        activeRoadmaps: activeRoadmaps.length,
        totalFeatures,
        completedFeatures,
        completionRate: totalFeatures > 0 ? Math.round((completedFeatures / totalFeatures) * 100) : 0
      },
      health: {
        averageScore: this.calculateAverageHealthScore(activeRoadmaps)
      }
    };
  }

  private calculateAverageHealthScore(roadmaps: ProductRoadmap[]): number {
    if (roadmaps.length === 0) return 100;
    
    const totalScore = roadmaps.reduce((sum, roadmap) => 
      sum + this.calculateRoadmapHealth(roadmap).score, 0
    );
    
    return Math.round(totalScore / roadmaps.length);
  }

  async cleanup(): Promise<void> {
    this.roadmaps.clear();
    this.removeAllListeners();
  }
}

// Supporting interfaces
interface RoadmapTimeframe {
  start: Date;
  end: Date;
  quarters: RoadmapQuarter[];
}

interface RoadmapQuarter {
  id: string;
  name: string;
  start: Date;
  end: Date;
  themes: string[];
}

interface ThemeKPI {
  name: string;
  target: number;
  current: number;
  unit: string;
}

interface EffortEstimate {
  storyPoints?: number;
  hours?: number;
  complexity: 'low' | 'medium' | 'high';
  confidence: number; // 0-100
}

interface ImpactEstimate {
  businessValue: number; // 1-10
  userValue: number; // 1-10
  reach: number; // number of users affected
  confidence: number; // 0-100
}

interface FeatureRequirement {
  id: string;
  description: string;
  type: 'functional' | 'non-functional';
  priority: 'must' | 'should' | 'could' | 'wont';
}

interface AcceptanceCriteria {
  id: string;
  description: string;
  testable: boolean;
  completed: boolean;
}

interface FeatureMetrics {
  leadTime: number; // days
  cycleTime: number; // days
  deploymentFrequency: number;
  changeFailureRate: number; // percentage
}

interface FeatureFeedback {
  id: string;
  userId: string;
  content: string;
  type: 'positive' | 'negative' | 'neutral';
  timestamp: Date;
}

interface MilestoneRisk {
  id: string;
  description: string;
  probability: number; // 0-100
  impact: number; // 0-100
  mitigation: string;
}

interface ReleaseNote {
  id: string;
  type: 'feature' | 'improvement' | 'fix';
  description: string;
  userFacing: boolean;
}

interface ReleaseMetrics {
  featuresDelivered: number;
  bugsFound: number;
  customerSatisfaction: number; // 1-10
  adoptionRate: number; // percentage
}

interface RolloutPlan {
  strategy: 'blue-green' | 'canary' | 'rolling';
  phases: RolloutPhase[];
  rollbackPlan: string;
}

interface RolloutPhase {
  name: string;
  percentage: number;
  duration: number; // hours
  criteria: string[];
}

interface CommunicationPlan {
  audience: string;
  channel: string;
  message: string;
  timing: Date;
  sent: boolean;
}

interface RoadmapStakeholder {
  userId: string;
  role: 'owner' | 'contributor' | 'viewer';
  permissions: string[];
}

interface RoadmapMetrics {
  totalFeatures: number;
  completedFeatures: number;
  inProgressFeatures: number;
  plannedFeatures: number;
  averageLeadTime: number;
  velocityTrend: 'increasing' | 'stable' | 'decreasing';
}

interface DependencyAnalysis {
  totalDependencies: number;
  criticalPath: string[];
  blockers: FeatureDependency[];
  risks: DependencyRisk[];
  recommendations: string[];
}

interface DependencyRisk {
  dependencyId: string;
  type: 'blocking' | 'delay' | 'scope';
  severity: 'low' | 'medium' | 'high';
  description: string;
  mitigation: string;
}

interface RoadmapHealth {
  score: number; // 0-100
  issues: string[];
  recommendations: string[];
} 