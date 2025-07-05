// Digital Product Management Beta Testing Framework
// A/B testing, feature flags, user feedback collection, and PMF measurement

import { EventEmitter } from 'events';
import { DPMConfigManager } from '../config/dpm-config';
import { HierarchicalMemoryManager } from '../../memory/hierarchical-manager';
import { MemoryType } from '../../memory/interfaces';

export interface BetaTestingOptions {
  config: DPMConfigManager;
  memory: HierarchicalMemoryManager;
  workspaceId: string;
  userId: string;
}

export interface BetaProgram {
  id: string;
  productId: string;
  name: string;
  description: string;
  objectives: string[];
  startDate: Date;
  endDate: Date;
  status: BetaProgramStatus;
  participants: BetaParticipant[];
  experiments: ABTest[];
  featureFlags: FeatureFlag[];
  feedback: BetaFeedback[];
  metrics: BetaMetrics;
  criteria: SuccessCriteria[];
  pmfScore: PMFScore;
  created: Date;
  updated: Date;
}

export interface BetaParticipant {
  id: string;
  userId: string;
  email: string;
  name: string;
  segment: ParticipantSegment;
  joinDate: Date;
  status: ParticipantStatus;
  engagement: EngagementMetrics;
  feedback: string[];
  experiments: string[]; // experiment IDs
}

export interface ABTest {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  type: TestType;
  status: TestStatus;
  startDate: Date;
  endDate?: Date;
  variants: TestVariant[];
  allocation: TrafficAllocation;
  metrics: TestMetrics;
  results: TestResults;
  significance: StatisticalSignificance;
  winner?: string; // variant ID
  confidence: number; // 0-100
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  type: FlagType;
  status: FlagStatus;
  defaultValue: boolean;
  rules: FlagRule[];
  rollout: RolloutStrategy;
  targeting: TargetingCriteria;
  metrics: FlagMetrics;
  created: Date;
  updated: Date;
}

export interface BetaFeedback {
  id: string;
  participantId: string;
  type: FeedbackType;
  category: FeedbackCategory;
  title: string;
  description: string;
  rating?: number; // 1-10
  priority: FeedbackPriority;
  status: FeedbackStatus;
  tags: string[];
  attachments: string[];
  responses: FeedbackResponse[];
  created: Date;
  updated: Date;
}

export interface PMFScore {
  score: number; // 0-100
  methodology: PMFMethodology;
  components: PMFComponent[];
  survey: PMFSurvey;
  cohortAnalysis: CohortAnalysis;
  calculated: Date;
  trend: PMFTrend;
}

// Enums
export enum BetaProgramStatus {
  PLANNING = 'planning',
  RECRUITING = 'recruiting',
  ACTIVE = 'active',
  ANALYZING = 'analyzing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum ParticipantStatus {
  INVITED = 'invited',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CHURNED = 'churned',
  GRADUATED = 'graduated'
}

export enum TestType {
  AB = 'ab',
  MULTIVARIATE = 'multivariate',
  SPLIT_URL = 'split_url',
  FEATURE_FLAG = 'feature_flag'
}

export enum TestStatus {
  DRAFT = 'draft',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum FlagType {
  BOOLEAN = 'boolean',
  STRING = 'string',
  NUMBER = 'number',
  JSON = 'json'
}

export enum FlagStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived'
}

export enum FeedbackType {
  BUG = 'bug',
  FEATURE_REQUEST = 'feature_request',
  USABILITY = 'usability',
  PERFORMANCE = 'performance',
  GENERAL = 'general'
}

export enum FeedbackCategory {
  UI_UX = 'ui_ux',
  FUNCTIONALITY = 'functionality',
  PERFORMANCE = 'performance',
  CONTENT = 'content',
  INTEGRATION = 'integration'
}

export enum FeedbackPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum FeedbackStatus {
  NEW = 'new',
  ACKNOWLEDGED = 'acknowledged',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

export enum PMFMethodology {
  SEAN_ELLIS = 'sean_ellis',
  NPS = 'nps',
  RETENTION_COHORT = 'retention_cohort',
  USAGE_INTENSITY = 'usage_intensity',
  COMPOSITE = 'composite'
}

export class BetaTestingFramework extends EventEmitter {
  private config: DPMConfigManager;
  private memory: HierarchicalMemoryManager;
  private workspaceId: string;
  private userId: string;
  private betaPrograms = new Map<string, BetaProgram>();
  private abTests = new Map<string, ABTest>();
  private featureFlags = new Map<string, FeatureFlag>();
  private initialized = false;

  constructor(options: BetaTestingOptions) {
    super();
    this.config = options.config;
    this.memory = options.memory;
    this.workspaceId = options.workspaceId;
    this.userId = options.userId;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.loadBetaData();
      this.setupBetaAnalysis();
      
      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private async loadBetaData(): Promise<void> {
    try {
      const betaData = await this.memory.recall({
        text: `workspace:${this.workspaceId} beta_programs`,
        session_id: this.workspaceId,
        limit: 50
      });

      for (const memory of betaData.entries) {
        if (memory.metadata?.tags?.includes('beta_program')) {
          try {
            const program = JSON.parse(memory.content) as BetaProgram;
            this.betaPrograms.set(program.id, program);
          } catch (error) {
            console.warn('Failed to parse beta program:', error);
          }
        }
      }

      console.log(`Loaded ${this.betaPrograms.size} beta programs`);
    } catch (error) {
      console.warn('Failed to load beta data:', error);
    }
  }

  private setupBetaAnalysis(): void {
    // Set up periodic beta program analysis
    setInterval(() => {
      this.analyzeBetaPrograms();
    }, 3600000); // Run every hour
  }

  async createBetaProgram(
    productId: string,
    name: string,
    description: string,
    objectives: string[],
    duration: number // days
  ): Promise<BetaProgram> {
    if (!this.initialized) {
      await this.initialize();
    }

    const programId = this.generateProgramId();
    const now = new Date();
    const endDate = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);

    const program: BetaProgram = {
      id: programId,
      productId: productId,
      name: name,
      description: description,
      objectives: objectives,
      startDate: now,
      endDate: endDate,
      status: BetaProgramStatus.PLANNING,
      participants: [],
      experiments: [],
      featureFlags: [],
      feedback: [],
      metrics: this.createDefaultBetaMetrics(),
      criteria: this.createDefaultSuccessCriteria(),
      pmfScore: this.createDefaultPMFScore(),
      created: now,
      updated: now
    };

    await this.storeBetaProgram(program);
    this.betaPrograms.set(programId, program);

    this.emit('betaProgramCreated', program);
    return program;
  }

  async createABTest(
    programId: string,
    name: string,
    description: string,
    hypothesis: string,
    variants: Omit<TestVariant, 'id'>[]
  ): Promise<ABTest> {
    const program = this.betaPrograms.get(programId);
    if (!program) {
      throw new Error(`Beta program ${programId} not found`);
    }

    const testId = this.generateTestId();
    const now = new Date();

    const test: ABTest = {
      id: testId,
      name: name,
      description: description,
      hypothesis: hypothesis,
      type: TestType.AB,
      status: TestStatus.DRAFT,
      startDate: now,
      variants: variants.map((v, index) => ({
        ...v,
        id: `${testId}_variant_${index}`,
        traffic: 100 / variants.length // Equal distribution
      })),
      allocation: {
        strategy: 'random',
        seed: Math.random().toString(),
        rules: []
      },
      metrics: this.createDefaultTestMetrics(),
      results: this.createDefaultTestResults(),
      significance: {
        level: 0.95,
        achieved: false,
        pValue: 1.0
      },
      confidence: 0
    };

    // Add test to program
    const updatedProgram: BetaProgram = {
      ...program,
      experiments: [...program.experiments, test],
      updated: new Date()
    };

    await this.storeBetaProgram(updatedProgram);
    this.betaPrograms.set(programId, updatedProgram);
    this.abTests.set(testId, test);

    this.emit('abTestCreated', { programId, test });
    return test;
  }

  async createFeatureFlag(
    programId: string,
    name: string,
    description: string,
    defaultValue: boolean,
    rolloutPercentage: number = 0
  ): Promise<FeatureFlag> {
    const program = this.betaPrograms.get(programId);
    if (!program) {
      throw new Error(`Beta program ${programId} not found`);
    }

    const flagId = this.generateFlagId();
    const now = new Date();

    const flag: FeatureFlag = {
      id: flagId,
      name: name,
      description: description,
      type: FlagType.BOOLEAN,
      status: FlagStatus.ACTIVE,
      defaultValue: defaultValue,
      rules: [],
      rollout: {
        strategy: 'percentage',
        percentage: rolloutPercentage,
        segments: []
      },
      targeting: {
        rules: [],
        defaultRule: { enabled: defaultValue }
      },
      metrics: this.createDefaultFlagMetrics(),
      created: now,
      updated: now
    };

    // Add flag to program
    const updatedProgram: BetaProgram = {
      ...program,
      featureFlags: [...program.featureFlags, flag],
      updated: new Date()
    };

    await this.storeBetaProgram(updatedProgram);
    this.betaPrograms.set(programId, updatedProgram);
    this.featureFlags.set(flagId, flag);

    this.emit('featureFlagCreated', { programId, flag });
    return flag;
  }

  async addParticipant(
    programId: string,
    userId: string,
    email: string,
    name: string,
    segment: ParticipantSegment
  ): Promise<BetaParticipant> {
    const program = this.betaPrograms.get(programId);
    if (!program) {
      throw new Error(`Beta program ${programId} not found`);
    }

    const participantId = this.generateParticipantId();
    const participant: BetaParticipant = {
      id: participantId,
      userId: userId,
      email: email,
      name: name,
      segment: segment,
      joinDate: new Date(),
      status: ParticipantStatus.INVITED,
      engagement: this.createDefaultEngagementMetrics(),
      feedback: [],
      experiments: []
    };

    const updatedProgram: BetaProgram = {
      ...program,
      participants: [...program.participants, participant],
      updated: new Date()
    };

    await this.storeBetaProgram(updatedProgram);
    this.betaPrograms.set(programId, updatedProgram);

    this.emit('participantAdded', { programId, participant });
    return participant;
  }

  async submitFeedback(
    programId: string,
    participantId: string,
    feedback: Omit<BetaFeedback, 'id' | 'participantId' | 'responses' | 'created' | 'updated'>
  ): Promise<BetaFeedback> {
    const program = this.betaPrograms.get(programId);
    if (!program) {
      throw new Error(`Beta program ${programId} not found`);
    }

    const feedbackId = this.generateFeedbackId();
    const now = new Date();

    const betaFeedback: BetaFeedback = {
      ...feedback,
      id: feedbackId,
      participantId: participantId,
      responses: [],
      created: now,
      updated: now
    };

    const updatedProgram: BetaProgram = {
      ...program,
      feedback: [...program.feedback, betaFeedback],
      updated: new Date()
    };

    await this.storeBetaProgram(updatedProgram);
    this.betaPrograms.set(programId, updatedProgram);

    this.emit('feedbackSubmitted', { programId, feedback: betaFeedback });
    return betaFeedback;
  }

  async calculatePMFScore(programId: string): Promise<PMFScore> {
    const program = this.betaPrograms.get(programId);
    if (!program) {
      throw new Error(`Beta program ${programId} not found`);
    }

    // Sean Ellis test: "How would you feel if you could no longer use this product?"
    const seanEllisScore = this.calculateSeanEllisScore(program);
    
    // NPS calculation
    const npsScore = this.calculateNPSScore(program);
    
    // Retention analysis
    const retentionScore = this.calculateRetentionScore(program);
    
    // Usage intensity
    const usageScore = this.calculateUsageIntensityScore(program);

    // Composite PMF score (weighted average)
    const compositeScore = Math.round(
      (seanEllisScore * 0.4) + 
      (npsScore * 0.2) + 
      (retentionScore * 0.2) + 
      (usageScore * 0.2)
    );

    const pmfScore: PMFScore = {
      score: compositeScore,
      methodology: PMFMethodology.COMPOSITE,
      components: [
        { name: 'Sean Ellis', score: seanEllisScore, weight: 0.4 },
        { name: 'NPS', score: npsScore, weight: 0.2 },
        { name: 'Retention', score: retentionScore, weight: 0.2 },
        { name: 'Usage Intensity', score: usageScore, weight: 0.2 }
      ],
      survey: this.createPMFSurvey(),
      cohortAnalysis: this.createCohortAnalysis(program),
      calculated: new Date(),
      trend: this.calculatePMFTrend(program)
    };

    // Update program with new PMF score
    const updatedProgram: BetaProgram = {
      ...program,
      pmfScore: pmfScore,
      updated: new Date()
    };

    await this.storeBetaProgram(updatedProgram);
    this.betaPrograms.set(programId, updatedProgram);

    this.emit('pmfScoreCalculated', { programId, pmfScore });
    return pmfScore;
  }

  private calculateSeanEllisScore(program: BetaProgram): number {
    // Simplified calculation - would use actual survey data in production
    const activeParticipants = program.participants.filter(p => p.status === ParticipantStatus.ACTIVE);
    const highEngagement = activeParticipants.filter(p => p.engagement.sessionsPerWeek >= 3);
    
    return activeParticipants.length > 0 
      ? Math.round((highEngagement.length / activeParticipants.length) * 100)
      : 0;
  }

  private calculateNPSScore(program: BetaProgram): number {
    // Simplified NPS calculation based on feedback ratings
    const ratingsFromFeedback = program.feedback
      .filter(f => f.rating !== undefined)
      .map(f => f.rating!);
    
    if (ratingsFromFeedback.length === 0) return 50; // Default neutral score
    
    const promoters = ratingsFromFeedback.filter(r => r >= 9).length;
    const detractors = ratingsFromFeedback.filter(r => r <= 6).length;
    const total = ratingsFromFeedback.length;
    
    const nps = ((promoters - detractors) / total) * 100;
    return Math.round(50 + (nps / 2)); // Convert to 0-100 scale
  }

  private calculateRetentionScore(program: BetaProgram): number {
    const totalParticipants = program.participants.length;
    const activeParticipants = program.participants.filter(p => 
      p.status === ParticipantStatus.ACTIVE || p.status === ParticipantStatus.GRADUATED
    ).length;
    
    return totalParticipants > 0 
      ? Math.round((activeParticipants / totalParticipants) * 100)
      : 0;
  }

  private calculateUsageIntensityScore(program: BetaProgram): number {
    const participants = program.participants.filter(p => p.status === ParticipantStatus.ACTIVE);
    if (participants.length === 0) return 0;
    
    const avgSessions = participants.reduce((sum, p) => sum + p.engagement.sessionsPerWeek, 0) / participants.length;
    const avgDuration = participants.reduce((sum, p) => sum + p.engagement.avgSessionDuration, 0) / participants.length;
    
    // Normalize to 0-100 scale
    const sessionScore = Math.min(100, (avgSessions / 7) * 100); // Max 7 sessions per week
    const durationScore = Math.min(100, (avgDuration / 30) * 100); // Max 30 minutes per session
    
    return Math.round((sessionScore + durationScore) / 2);
  }

  private async analyzeBetaPrograms(): Promise<void> {
    try {
      for (const [id, program] of this.betaPrograms) {
        if (program.status === BetaProgramStatus.ACTIVE) {
          // Update PMF score
          await this.calculatePMFScore(id);
          
          // Analyze A/B tests
          for (const test of program.experiments) {
            if (test.status === TestStatus.RUNNING) {
              await this.analyzeABTest(test.id);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to analyze beta programs:', error);
    }
  }

  private async analyzeABTest(testId: string): Promise<void> {
    const test = this.abTests.get(testId);
    if (!test) return;

    // Statistical significance calculation would go here
    // For now, we'll use a simplified approach
    const significance = this.calculateStatisticalSignificance(test);
    
    if (significance.achieved && !test.winner) {
      const winner = this.determineWinningVariant(test);
      
      const updatedTest: ABTest = {
        ...test,
        significance: significance,
        winner: winner,
        confidence: significance.confidence || 0,
        status: TestStatus.COMPLETED
      };

      this.abTests.set(testId, updatedTest);
      this.emit('abTestCompleted', { testId, winner, significance });
    }
  }

  private calculateStatisticalSignificance(test: ABTest): StatisticalSignificance {
    // Simplified statistical significance calculation
    // In production, this would use proper statistical methods
    const totalSamples = test.variants.reduce((sum, v) => sum + (v.samples || 0), 0);
    const minSampleSize = 1000; // Minimum sample size for significance
    
    return {
      level: 0.95,
      achieved: totalSamples >= minSampleSize,
      pValue: totalSamples >= minSampleSize ? 0.03 : 1.0,
      confidence: totalSamples >= minSampleSize ? 95 : Math.min(95, (totalSamples / minSampleSize) * 95)
    };
  }

  private determineWinningVariant(test: ABTest): string {
    // Simple winner determination based on conversion rate
    let bestVariant = test.variants[0];
    let bestConversion = 0;
    
    for (const variant of test.variants) {
      const conversion = variant.conversions && variant.samples 
        ? (variant.conversions / variant.samples) * 100 
        : 0;
      
      if (conversion > bestConversion) {
        bestConversion = conversion;
        bestVariant = variant;
      }
    }
    
    return bestVariant.id;
  }

  // Helper methods
  private createDefaultBetaMetrics(): BetaMetrics {
    return {
      totalParticipants: 0,
      activeParticipants: 0,
      churnRate: 0,
      avgEngagement: 0,
      feedbackCount: 0,
      experimentsRunning: 0
    };
  }

  private createDefaultSuccessCriteria(): SuccessCriteria[] {
    return [
      {
        metric: 'PMF Score',
        target: 40,
        current: 0,
        achieved: false
      },
      {
        metric: 'Retention Rate',
        target: 70,
        current: 0,
        achieved: false
      }
    ];
  }

  private createDefaultPMFScore(): PMFScore {
    return {
      score: 0,
      methodology: PMFMethodology.COMPOSITE,
      components: [],
      survey: this.createPMFSurvey(),
      cohortAnalysis: {
        cohorts: [],
        retentionCurve: []
      },
      calculated: new Date(),
      trend: { direction: 'stable', change: 0 }
    };
  }

  private createPMFSurvey(): PMFSurvey {
    return {
      questions: [
        {
          id: 'sean_ellis',
          text: 'How would you feel if you could no longer use this product?',
          type: 'multiple_choice',
          options: ['Very disappointed', 'Somewhat disappointed', 'Not disappointed']
        },
        {
          id: 'nps',
          text: 'How likely are you to recommend this product to others?',
          type: 'scale',
          scale: { min: 0, max: 10 }
        }
      ],
      responses: []
    };
  }

  private createCohortAnalysis(program: BetaProgram): CohortAnalysis {
    return {
      cohorts: [],
      retentionCurve: []
    };
  }

  private calculatePMFTrend(program: BetaProgram): PMFTrend {
    return {
      direction: 'stable',
      change: 0
    };
  }

  private createDefaultTestMetrics(): TestMetrics {
    return {
      impressions: 0,
      conversions: 0,
      conversionRate: 0,
      significance: 0
    };
  }

  private createDefaultTestResults(): TestResults {
    return {
      winner: null,
      lift: 0,
      confidence: 0,
      summary: 'Test in progress'
    };
  }

  private createDefaultEngagementMetrics(): EngagementMetrics {
    return {
      sessionsPerWeek: 0,
      avgSessionDuration: 0,
      featuresUsed: 0,
      lastActive: new Date()
    };
  }

  private createDefaultFlagMetrics(): FlagMetrics {
    return {
      impressions: 0,
      conversions: 0,
      conversionRate: 0
    };
  }

  private async storeBetaProgram(program: BetaProgram): Promise<void> {
    await this.memory.store(
      JSON.stringify(program),
      MemoryType.FACT,
      {
        session_id: this.workspaceId,
        tags: ['beta_program', program.id, program.productId, program.status]
      }
    );
  }

  private generateProgramId(): string {
    return `beta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTestId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFlagId(): string {
    return `flag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateParticipantId(): string {
    return `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFeedbackId(): string {
    return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getBetaSummary(): Promise<any> {
    const totalPrograms = this.betaPrograms.size;
    const activePrograms = Array.from(this.betaPrograms.values())
      .filter(p => p.status === BetaProgramStatus.ACTIVE);

    const totalParticipants = activePrograms.reduce((sum, p) => sum + p.participants.length, 0);
    const avgPMFScore = activePrograms.length > 0
      ? activePrograms.reduce((sum, p) => sum + p.pmfScore.score, 0) / activePrograms.length
      : 0;

    return {
      overview: {
        totalPrograms,
        activePrograms: activePrograms.length,
        totalParticipants,
        avgPMFScore: Math.round(avgPMFScore)
      },
      programs: activePrograms.map(p => ({
        id: p.id,
        name: p.name,
        participants: p.participants.length,
        pmfScore: p.pmfScore.score,
        status: p.status
      }))
    };
  }

  async cleanup(): Promise<void> {
    this.betaPrograms.clear();
    this.abTests.clear();
    this.featureFlags.clear();
    this.removeAllListeners();
  }
}

// Supporting interfaces
interface ParticipantSegment {
  name: string;
  criteria: string[];
}

interface EngagementMetrics {
  sessionsPerWeek: number;
  avgSessionDuration: number; // minutes
  featuresUsed: number;
  lastActive: Date;
}

interface TestVariant {
  id: string;
  name: string;
  description: string;
  traffic: number; // percentage
  samples?: number;
  conversions?: number;
}

interface TrafficAllocation {
  strategy: 'random' | 'deterministic';
  seed: string;
  rules: AllocationRule[];
}

interface AllocationRule {
  condition: string;
  allocation: Record<string, number>;
}

interface TestMetrics {
  impressions: number;
  conversions: number;
  conversionRate: number;
  significance: number;
}

interface TestResults {
  winner: string | null;
  lift: number; // percentage
  confidence: number; // percentage
  summary: string;
}

interface StatisticalSignificance {
  level: number; // e.g., 0.95 for 95%
  achieved: boolean;
  pValue: number;
  confidence?: number;
}

interface FlagRule {
  condition: string;
  value: any;
}

interface RolloutStrategy {
  strategy: 'percentage' | 'whitelist' | 'segment';
  percentage?: number;
  segments?: string[];
}

interface TargetingCriteria {
  rules: TargetingRule[];
  defaultRule: { enabled: boolean };
}

interface TargetingRule {
  condition: string;
  enabled: boolean;
}

interface FlagMetrics {
  impressions: number;
  conversions: number;
  conversionRate: number;
}

interface FeedbackResponse {
  id: string;
  responderId: string;
  content: string;
  timestamp: Date;
}

interface BetaMetrics {
  totalParticipants: number;
  activeParticipants: number;
  churnRate: number;
  avgEngagement: number;
  feedbackCount: number;
  experimentsRunning: number;
}

interface SuccessCriteria {
  metric: string;
  target: number;
  current: number;
  achieved: boolean;
}

interface PMFComponent {
  name: string;
  score: number;
  weight: number;
}

interface PMFSurvey {
  questions: PMFQuestion[];
  responses: PMFResponse[];
}

interface PMFQuestion {
  id: string;
  text: string;
  type: 'multiple_choice' | 'scale' | 'text';
  options?: string[];
  scale?: { min: number; max: number };
}

interface PMFResponse {
  questionId: string;
  participantId: string;
  answer: any;
  timestamp: Date;
}

interface CohortAnalysis {
  cohorts: Cohort[];
  retentionCurve: RetentionPoint[];
}

interface Cohort {
  id: string;
  startDate: Date;
  size: number;
  retention: number[];
}

interface RetentionPoint {
  period: number;
  retention: number;
}

interface PMFTrend {
  direction: 'up' | 'down' | 'stable';
  change: number; // percentage change
} 