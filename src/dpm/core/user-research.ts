// Digital Product Management User Research System
// Comprehensive user research and persona management

import { EventEmitter } from 'events';
import { 
  UserPersona, 
  JobToBeDone, 
  MarketSegment,
  Demographics,
  Psychographics
} from '../types/product-types';
import { ActionItem, Priority as ActionPriority, AssignmentStatus as ActionStatus } from '../types/collaboration-types';
import { DPMConfigManager } from '../config/dpm-config';
import { HierarchicalMemoryManager } from '../../memory/hierarchical-manager';
import { MemoryType } from '../../memory/interfaces';

export interface UserResearchOptions {
  config: DPMConfigManager;
  memory: HierarchicalMemoryManager;
  workspaceId: string;
  userId: string;
}

export interface PersonaCreationRequest {
  name: string;
  description: string;
  demographics: Demographics;
  psychographics: Psychographics;
  painPoints: string[];
  goals: string[];
  behaviors: string[];
  preferences: string[];
}

export interface JobToBeDownCreationRequest {
  job: string;
  context: string;
  outcome: string;
  importance: number; // 1-10
  satisfaction: number; // 1-10
}

export interface UserFeedback {
  id: string;
  userId: string;
  personaId?: string;
  type: FeedbackType;
  category: FeedbackCategory;
  content: string;
  rating?: number; // 1-5
  sentiment: SentimentScore;
  tags: string[];
  source: FeedbackSource;
  timestamp: Date;
  processed: boolean;
  actionItems?: ActionItem[];
}

export enum FeedbackType {
  FEATURE_REQUEST = 'feature_request',
  BUG_REPORT = 'bug_report',
  GENERAL_FEEDBACK = 'general_feedback',
  USER_INTERVIEW = 'user_interview',
  SURVEY_RESPONSE = 'survey_response',
  SUPPORT_TICKET = 'support_ticket'
}

export enum FeedbackCategory {
  USABILITY = 'usability',
  PERFORMANCE = 'performance',
  FUNCTIONALITY = 'functionality',
  DESIGN = 'design',
  CONTENT = 'content',
  PRICING = 'pricing',
  SUPPORT = 'support'
}

export enum FeedbackSource {
  APP = 'app',
  EMAIL = 'email',
  SURVEY = 'survey',
  INTERVIEW = 'interview',
  SUPPORT = 'support',
  SOCIAL_MEDIA = 'social_media',
  REVIEW = 'review'
}

export interface SentimentScore {
  score: number; // -1 to 1
  confidence: number; // 0 to 1
  keywords: string[];
}

// ActionItem, ActionPriority, and ActionStatus are imported from collaboration-types.ts

export interface ResearchInsight {
  id: string;
  title: string;
  description: string;
  type: InsightType;
  confidence: number; // 0 to 1
  impact: ImpactLevel;
  evidence: Evidence[];
  recommendations: string[];
  personas: string[]; // persona IDs
  timestamp: Date;
}

export enum InsightType {
  BEHAVIORAL_PATTERN = 'behavioral_pattern',
  PAIN_POINT = 'pain_point',
  OPPORTUNITY = 'opportunity',
  PREFERENCE = 'preference',
  WORKFLOW = 'workflow',
  SATISFACTION = 'satisfaction'
}

export enum ImpactLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface Evidence {
  type: EvidenceType;
  source: string;
  data: any;
  timestamp: Date;
}

export enum EvidenceType {
  SURVEY_DATA = 'survey_data',
  INTERVIEW_QUOTE = 'interview_quote',
  USAGE_ANALYTICS = 'usage_analytics',
  FEEDBACK = 'feedback',
  OBSERVATION = 'observation'
}

export interface UserResearchQuery {
  personaIds?: string[];
  feedbackTypes?: FeedbackType[];
  categories?: FeedbackCategory[];
  sources?: FeedbackSource[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  sentiment?: {
    min: number;
    max: number;
  };
  processed?: boolean;
  limit?: number;
  offset?: number;
}

export class UserResearchSystem extends EventEmitter {
  private config: DPMConfigManager;
  private memory: HierarchicalMemoryManager;
  private workspaceId: string;
  private userId: string;
  private personas = new Map<string, UserPersona>();
  private jobsToBeDone = new Map<string, JobToBeDone>();
  private feedback = new Map<string, UserFeedback>();
  private insights = new Map<string, ResearchInsight>();
  private initialized = false;

  constructor(options: UserResearchOptions) {
    super();
    this.config = options.config;
    this.memory = options.memory;
    this.workspaceId = options.workspaceId;
    this.userId = options.userId;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load existing research data
      await this.loadResearchData();
      
      // Set up analysis pipeline
      this.setupAnalysisPipeline();
      
      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private async loadResearchData(): Promise<void> {
    try {
      // Load personas
      const personaData = await this.memory.recall({
        text: `workspace:${this.workspaceId} user_personas`,
        session_id: this.workspaceId,
        limit: 100
      });

      for (const memory of personaData.entries) {
        if (memory.metadata?.tags?.includes('user_persona')) {
          try {
            const persona = JSON.parse(memory.content) as UserPersona;
            this.personas.set(persona.id, persona);
          } catch (error) {
            console.warn('Failed to parse persona data:', error);
          }
        }
      }

      console.log(`Loaded ${this.personas.size} personas`);
    } catch (error) {
      console.warn('Failed to load research data:', error);
    }
  }

  private setupAnalysisPipeline(): void {
    // Set up automated insight generation
    setInterval(() => {
      this.generateInsights();
    }, 3600000); // Run every hour
  }

  // Persona Management
  async createPersona(request: PersonaCreationRequest): Promise<UserPersona> {
    if (!this.initialized) {
      await this.initialize();
    }

    const personaId = this.generatePersonaId();
    const jobsToBeDown = await this.generateJobsForPersona(request);

    const persona: UserPersona = {
      id: personaId,
      name: request.name,
      description: request.description,
      demographics: request.demographics,
      psychographics: request.psychographics,
      jobsToBeDown: jobsToBeDown,
      painPoints: request.painPoints,
      goals: request.goals,
      behaviors: request.behaviors,
      preferences: request.preferences
    };

    // Store persona
    await this.storePersona(persona);
    this.personas.set(personaId, persona);

    // Emit event
    this.emit('personaCreated', persona);

    return persona;
  }

  private async generateJobsForPersona(request: PersonaCreationRequest): Promise<JobToBeDone[]> {
    // Generate jobs to be done based on persona characteristics
    const jobs: JobToBeDone[] = [];
    
    // Create jobs based on goals and pain points
    for (let i = 0; i < Math.min(3, request.goals.length); i++) {
      const job: JobToBeDone = {
        id: this.generateJobId(),
        job: `Achieve: ${request.goals[i]}`,
        context: `As ${request.name}`,
        outcome: request.goals[i],
        importance: 7,
        satisfaction: 5,
        opportunity: 2 // importance - satisfaction
      };
      jobs.push(job);
    }

    return jobs;
  }

  async listPersonas(): Promise<UserPersona[]> {
    return Array.from(this.personas.values());
  }

  // Jobs to be Done Management
  async createJobToBeDone(request: JobToBeDownCreationRequest): Promise<JobToBeDone> {
    const jobId = this.generateJobId();
    const opportunity = request.importance - request.satisfaction;

    const job: JobToBeDone = {
      id: jobId,
      job: request.job,
      context: request.context,
      outcome: request.outcome,
      importance: request.importance,
      satisfaction: request.satisfaction,
      opportunity: opportunity
    };

    await this.storeJobToBeDone(job);
    this.jobsToBeDone.set(jobId, job);

    this.emit('jobCreated', job);
    return job;
  }

  async listJobsToBeDone(): Promise<JobToBeDone[]> {
    return Array.from(this.jobsToBeDone.values())
      .sort((a, b) => b.opportunity - a.opportunity); // Sort by opportunity score
  }

  // Feedback Management
  async submitFeedback(feedback: Omit<UserFeedback, 'id' | 'timestamp' | 'processed' | 'sentiment'>): Promise<UserFeedback> {
    const feedbackId = this.generateFeedbackId();
    const sentiment = await this.analyzeSentiment(feedback.content);

    const userFeedback: UserFeedback = {
      ...feedback,
      id: feedbackId,
      timestamp: new Date(),
      processed: false,
      sentiment: sentiment
    };

    await this.storeFeedback(userFeedback);
    this.feedback.set(feedbackId, userFeedback);

    this.emit('feedbackSubmitted', userFeedback);
    return userFeedback;
  }

  private async analyzeSentiment(text: string): Promise<SentimentScore> {
    // Simple sentiment analysis - in production, use a proper NLP service
    const positiveWords = ['good', 'great', 'excellent', 'love', 'amazing', 'perfect', 'awesome'];
    const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'worst', 'horrible', 'broken'];
    
    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;
    const keywords: string[] = [];

    for (const word of words) {
      if (positiveWords.includes(word)) {
        positiveCount++;
        keywords.push(word);
      } else if (negativeWords.includes(word)) {
        negativeCount++;
        keywords.push(word);
      }
    }

    const totalSentimentWords = positiveCount + negativeCount;
    let score = 0;
    let confidence = 0;

    if (totalSentimentWords > 0) {
      score = (positiveCount - negativeCount) / totalSentimentWords;
      confidence = Math.min(totalSentimentWords / words.length * 2, 1);
    }

    return {
      score: Math.max(-1, Math.min(1, score)),
      confidence: confidence,
      keywords: keywords
    };
  }

  private async generateInsights(): Promise<void> {
    try {
      // Analyze feedback patterns
      const recentFeedback = Array.from(this.feedback.values())
        .filter(f => f.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)); // Last 7 days

      if (recentFeedback.length < 5) return; // Need minimum feedback for insights

      console.log(`Analyzing ${recentFeedback.length} recent feedback items for insights`);
    } catch (error) {
      console.warn('Failed to generate insights:', error);
    }
  }

  // Storage methods
  private async storePersona(persona: UserPersona): Promise<void> {
    await this.memory.store(
      JSON.stringify(persona),
      MemoryType.FACT,
      {
        session_id: this.workspaceId,
        tags: ['user_persona', persona.id, persona.name.toLowerCase().replace(/\s+/g, '_')]
      }
    );
  }

  private async storeJobToBeDone(job: JobToBeDone): Promise<void> {
    await this.memory.store(
      JSON.stringify(job),
      MemoryType.FACT,
      {
        session_id: this.workspaceId,
        tags: ['job_to_be_done', job.id, `opportunity_${job.opportunity}`]
      }
    );
  }

  private async storeFeedback(feedback: UserFeedback): Promise<void> {
    await this.memory.store(
      JSON.stringify(feedback),
      MemoryType.FACT,
      {
        session_id: this.workspaceId,
        tags: [
          'user_feedback', 
          feedback.id, 
          feedback.type, 
          feedback.category, 
          feedback.source,
          `sentiment_${Math.round(feedback.sentiment.score * 10)}`
        ]
      }
    );
  }

  // ID generators
  private generatePersonaId(): string {
    return `persona_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFeedbackId(): string {
    return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Analytics and Reporting
  async getResearchSummary(): Promise<any> {
    const totalPersonas = this.personas.size;
    const totalJobs = this.jobsToBeDone.size;
    const totalFeedback = this.feedback.size;

    const topOpportunities = Array.from(this.jobsToBeDone.values())
      .sort((a, b) => b.opportunity - a.opportunity)
      .slice(0, 5);

    return {
      overview: {
        totalPersonas,
        totalJobs,
        totalFeedback
      },
      topOpportunities: topOpportunities.map(job => ({
        job: job.job,
        opportunity: job.opportunity,
        importance: job.importance,
        satisfaction: job.satisfaction
      }))
    };
  }

  async cleanup(): Promise<void> {
    this.personas.clear();
    this.jobsToBeDone.clear();
    this.feedback.clear();
    this.insights.clear();
    this.removeAllListeners();
  }
} 