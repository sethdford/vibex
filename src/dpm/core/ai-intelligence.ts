// Digital Product Management AI Intelligence System
// Claude 4 integration for predictive analytics, automated insights, and intelligent recommendations

import { EventEmitter } from 'events';
import { DPMConfigManager } from '../config/dpm-config';
import { HierarchicalMemoryManager } from '../../memory/hierarchical-manager';
import { MemoryType } from '../../memory/interfaces';
import { ContentGeneratorOptions } from '../../ai/content-generator';

export interface AIIntelligenceOptions {
  config: DPMConfigManager;
  memory: HierarchicalMemoryManager;
  workspaceId: string;
  userId: string;
  aiClient?: any; // Claude 4 client
}

export interface ProductInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  confidence: number; // 0-100
  impact: ImpactLevel;
  category: InsightCategory;
  recommendations: Recommendation[];
  evidence: Evidence[];
  metrics: InsightMetrics;
  status: InsightStatus;
  created: Date;
  updated: Date;
  productId?: string;
}

export interface PredictiveAnalysis {
  id: string;
  type: PredictionType;
  target: string;
  prediction: PredictionResult;
  confidence: number; // 0-100
  timeframe: TimeFrame;
  methodology: string;
  factors: PredictionFactor[];
  accuracy: AccuracyMetrics;
  created: Date;
  validUntil: Date;
}

export interface IntelligentRecommendation {
  id: string;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  title: string;
  description: string;
  rationale: string;
  expectedImpact: ExpectedImpact;
  effort: EffortEstimate;
  timeline: RecommendationTimeline;
  prerequisites: string[];
  risks: string[];
  alternatives: Alternative[];
  confidence: number; // 0-100
  created: Date;
}

export interface AutomatedAnalysis {
  id: string;
  analysisType: AnalysisType;
  subject: string; // product, feature, market, etc.
  findings: Finding[];
  patterns: Pattern[];
  anomalies: Anomaly[];
  trends: Trend[];
  summary: AnalysisSummary;
  nextSteps: string[];
  generated: Date;
  confidence: number; // 0-100
}

// Enums
export enum InsightType {
  USER_BEHAVIOR = 'user_behavior',
  MARKET_TREND = 'market_trend',
  PRODUCT_PERFORMANCE = 'product_performance',
  COMPETITIVE_ANALYSIS = 'competitive_analysis',
  OPPORTUNITY = 'opportunity',
  RISK = 'risk'
}

export enum ImpactLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum InsightCategory {
  STRATEGY = 'strategy',
  PRODUCT = 'product',
  MARKETING = 'marketing',
  OPERATIONS = 'operations',
  FINANCE = 'finance'
}

export enum InsightStatus {
  NEW = 'new',
  REVIEWED = 'reviewed',
  ACTING = 'acting',
  IMPLEMENTED = 'implemented',
  DISMISSED = 'dismissed'
}

export enum PredictionType {
  CHURN = 'churn',
  REVENUE = 'revenue',
  ADOPTION = 'adoption',
  MARKET_SIZE = 'market_size',
  FEATURE_SUCCESS = 'feature_success'
}

export enum RecommendationCategory {
  FEATURE = 'feature',
  STRATEGY = 'strategy',
  MARKETING = 'marketing',
  OPERATIONS = 'operations',
  PRICING = 'pricing'
}

export enum RecommendationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum AnalysisType {
  COHORT = 'cohort',
  FUNNEL = 'funnel',
  RETENTION = 'retention',
  SEGMENTATION = 'segmentation',
  CORRELATION = 'correlation'
}

export class AIProductIntelligence extends EventEmitter {
  private config: DPMConfigManager;
  private memory: HierarchicalMemoryManager;
  private workspaceId: string;
  private userId: string;
  private aiClient: any;
  private insights = new Map<string, ProductInsight>();
  private predictions = new Map<string, PredictiveAnalysis>();
  private recommendations = new Map<string, IntelligentRecommendation>();
  private analyses = new Map<string, AutomatedAnalysis>();
  private initialized = false;

  constructor(options: AIIntelligenceOptions) {
    super();
    this.config = options.config;
    this.memory = options.memory;
    this.workspaceId = options.workspaceId;
    this.userId = options.userId;
    this.aiClient = options.aiClient;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.loadIntelligenceData();
      this.setupIntelligenceEngine();
      
      this.initialized = true;
      this.emit('initialized');
      console.log('✅ AI Product Intelligence system initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private async loadIntelligenceData(): Promise<void> {
    try {
      const intelligenceData = await this.memory.recall({
        text: `workspace:${this.workspaceId} ai_insights`,
        session_id: this.workspaceId,
        limit: 100
      });

      for (const memory of intelligenceData.entries) {
        if (memory.metadata?.tags?.includes('ai_insight')) {
          try {
            const insight = JSON.parse(memory.content) as ProductInsight;
            this.insights.set(insight.id, insight);
          } catch (error) {
            console.warn('Failed to parse AI insight:', error);
          }
        }
      }

      console.log(`Loaded ${this.insights.size} AI insights`);
    } catch (error) {
      console.warn('Failed to load intelligence data:', error);
    }
  }

  private setupIntelligenceEngine(): void {
    // Set up periodic analysis
    setInterval(() => {
      this.runPeriodicAnalysis();
    }, 3600000); // Run every hour

    // Set up real-time insight generation
    this.setupRealtimeInsights();
  }

  private setupRealtimeInsights(): void {
    // Listen for memory events to generate real-time insights
    // Note: HierarchicalMemoryManager doesn't extend EventEmitter, so we'll use periodic analysis instead
    setInterval(() => {
      this.runPeriodicAnalysis().catch(error => {
        console.warn('Periodic analysis failed:', error);
      });
    }, 300000); // Every 5 minutes
  }

  async generateProductInsights(productId: string): Promise<ProductInsight[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Gather product data
      const productData = await this.gatherProductData(productId);
      
      // Use Claude 4 to analyze and generate insights
      const aiAnalysis = await this.performAIAnalysis(productData, 'product_insights');
      
      // Process AI response into structured insights
      const insights = await this.processAIInsights(aiAnalysis, productId);
      
      // Store insights
      for (const insight of insights) {
        await this.storeInsight(insight);
        this.insights.set(insight.id, insight);
      }

      this.emit('insightsGenerated', { productId, insights });
      return insights;
    } catch (error) {
      console.error('Failed to generate product insights:', error);
      throw error;
    }
  }

  async generatePredictiveAnalysis(
    type: PredictionType, 
    target: string, 
    timeframe: TimeFrame
  ): Promise<PredictiveAnalysis> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Gather historical data
      const historicalData = await this.gatherHistoricalData(type, target);
      
      // Use Claude 4 for predictive modeling
      const aiPrediction = await this.performAIPrediction(historicalData, type, timeframe);
      
      // Process prediction results
      const prediction = await this.processPredictionResults(aiPrediction, type, target, timeframe);
      
      // Store prediction
      await this.storePrediction(prediction);
      this.predictions.set(prediction.id, prediction);

      this.emit('predictionGenerated', prediction);
      return prediction;
    } catch (error) {
      console.error('Failed to generate predictive analysis:', error);
      throw error;
    }
  }

  async generateIntelligentRecommendations(context: RecommendationContext): Promise<IntelligentRecommendation[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Gather contextual data
      const contextData = await this.gatherContextualData(context);
      
      // Use Claude 4 to generate recommendations
      const aiRecommendations = await this.performAIRecommendations(contextData, context);
      
      // Process recommendations
      const recommendations = await this.processAIRecommendations(aiRecommendations, context);
      
      // Store recommendations
      for (const recommendation of recommendations) {
        await this.storeRecommendation(recommendation);
        this.recommendations.set(recommendation.id, recommendation);
      }

      this.emit('recommendationsGenerated', { context, recommendations });
      return recommendations;
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      throw error;
    }
  }

  async performAutomatedAnalysis(
    analysisType: AnalysisType, 
    subject: string, 
    parameters: AnalysisParameters
  ): Promise<AutomatedAnalysis> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Gather analysis data
      const analysisData = await this.gatherAnalysisData(analysisType, subject, parameters);
      
      // Use Claude 4 for analysis
      const aiAnalysis = await this.performAIAnalysis(analysisData, analysisType);
      
      // Process analysis results
      const analysis = await this.processAnalysisResults(aiAnalysis, analysisType, subject);
      
      // Store analysis
      await this.storeAnalysis(analysis);
      this.analyses.set(analysis.id, analysis);

      this.emit('analysisCompleted', analysis);
      return analysis;
    } catch (error) {
      console.error('Failed to perform automated analysis:', error);
      throw error;
    }
  }

  private async gatherProductData(productId: string): Promise<any> {
    // Gather comprehensive product data from memory
    const productMemories = await this.memory.recall({
      text: `product:${productId}`,
      session_id: this.workspaceId,
      limit: 50
    });

    return {
      productId,
      memories: productMemories.entries,
      timestamp: new Date()
    };
  }

  private async performAIAnalysis(data: any, analysisType: string): Promise<string> {
    if (!this.aiClient) {
      throw new Error('AI client not configured');
    }

    const prompt = this.buildAnalysisPrompt(data, analysisType);
    
    try {
      const response = await this.aiClient.generateContent({
        messages: [{ role: 'user', content: prompt }],
        model: 'claude-sonnet-4-20250514', // Use Claude 4
        maxTokens: 4000,
        temperature: 0.3 // Lower temperature for more focused analysis
      } as ContentGeneratorOptions);

      return response.content;
    } catch (error) {
      console.error('AI analysis failed:', error);
      throw error;
    }
  }

  private buildAnalysisPrompt(data: any, analysisType: string): string {
    const basePrompt = `
You are an expert product management AI assistant. Analyze the following product data and provide comprehensive insights.

Analysis Type: ${analysisType}
Data: ${JSON.stringify(data, null, 2)}

Please provide:
1. Key insights and patterns
2. Opportunities and risks
3. Actionable recommendations
4. Confidence levels for each insight
5. Supporting evidence

Format your response as structured JSON with the following schema:
{
  "insights": [
    {
      "type": "insight_type",
      "title": "Insight title",
      "description": "Detailed description",
      "confidence": 85,
      "impact": "high",
      "category": "product",
      "recommendations": ["recommendation1", "recommendation2"],
      "evidence": ["evidence1", "evidence2"]
    }
  ],
  "summary": "Overall summary",
  "nextSteps": ["step1", "step2"]
}
`;

    return basePrompt;
  }

  private async processAIInsights(aiResponse: string, productId?: string): Promise<ProductInsight[]> {
    try {
      const parsed = JSON.parse(aiResponse);
      const insights: ProductInsight[] = [];

      for (const insightData of parsed.insights || []) {
        const insight: ProductInsight = {
          id: this.generateInsightId(),
          type: this.mapInsightType(insightData.type),
          title: insightData.title,
          description: insightData.description,
          confidence: insightData.confidence || 50,
          impact: this.mapImpactLevel(insightData.impact),
          category: this.mapInsightCategory(insightData.category),
          recommendations: insightData.recommendations?.map((r: string) => ({
            id: this.generateRecommendationId(),
            text: r,
            priority: 'medium' as RecommendationPriority
          })) || [],
          evidence: insightData.evidence?.map((e: string) => ({
            type: 'ai_analysis',
            description: e,
            source: 'claude-4'
          })) || [],
          metrics: this.createDefaultInsightMetrics(),
          status: InsightStatus.NEW,
          created: new Date(),
          updated: new Date(),
          productId: productId
        };

        insights.push(insight);
      }

      return insights;
    } catch (error) {
      console.error('Failed to process AI insights:', error);
      return [];
    }
  }

  private async performAIPrediction(data: any, type: PredictionType, timeframe: TimeFrame): Promise<string> {
    const prompt = `
You are an expert data scientist and product analyst. Perform predictive analysis on the following data.

Prediction Type: ${type}
Timeframe: ${JSON.stringify(timeframe)}
Historical Data: ${JSON.stringify(data, null, 2)}

Please provide a comprehensive prediction with:
1. Predicted outcome with confidence intervals
2. Key factors influencing the prediction
3. Methodology used
4. Assumptions made
5. Risk factors and limitations

Format as JSON:
{
  "prediction": {
    "value": predicted_value,
    "confidence": confidence_percentage,
    "range": {"min": min_value, "max": max_value}
  },
  "factors": [{"name": "factor", "impact": "high", "description": "desc"}],
  "methodology": "description",
  "assumptions": ["assumption1", "assumption2"],
  "risks": ["risk1", "risk2"]
}
`;

    return await this.performAIAnalysis(data, prompt);
  }

  private async runPeriodicAnalysis(): Promise<void> {
    try {
      // Run automated insights generation
      const recentData = await this.memory.recall({
        text: `workspace:${this.workspaceId}`,
        session_id: this.workspaceId,
        limit: 20
      });

      if (recentData.entries.length > 0) {
        const insights = await this.generateProductInsights('workspace');
        console.log(`Generated ${insights.length} periodic insights`);
      }
    } catch (error) {
      console.warn('Periodic analysis failed:', error);
    }
  }

  private async generateRealtimeInsights(event: any): Promise<void> {
    try {
      // Generate insights based on real-time data changes
      const contextualInsights = await this.performAIAnalysis(event, 'realtime_analysis');
      const insights = await this.processAIInsights(contextualInsights);
      
      for (const insight of insights) {
        this.insights.set(insight.id, insight);
        this.emit('realtimeInsight', insight);
      }
    } catch (error) {
      console.warn('Realtime insight generation failed:', error);
    }
  }

  // Helper methods
  private mapInsightType(type: string): InsightType {
    const mapping: Record<string, InsightType> = {
      'user_behavior': InsightType.USER_BEHAVIOR,
      'market_trend': InsightType.MARKET_TREND,
      'product_performance': InsightType.PRODUCT_PERFORMANCE,
      'competitive_analysis': InsightType.COMPETITIVE_ANALYSIS,
      'opportunity': InsightType.OPPORTUNITY,
      'risk': InsightType.RISK
    };
    return mapping[type] || InsightType.PRODUCT_PERFORMANCE;
  }

  private mapImpactLevel(impact: string): ImpactLevel {
    const mapping: Record<string, ImpactLevel> = {
      'low': ImpactLevel.LOW,
      'medium': ImpactLevel.MEDIUM,
      'high': ImpactLevel.HIGH,
      'critical': ImpactLevel.CRITICAL
    };
    return mapping[impact] || ImpactLevel.MEDIUM;
  }

  private mapInsightCategory(category: string): InsightCategory {
    const mapping: Record<string, InsightCategory> = {
      'strategy': InsightCategory.STRATEGY,
      'product': InsightCategory.PRODUCT,
      'marketing': InsightCategory.MARKETING,
      'operations': InsightCategory.OPERATIONS,
      'finance': InsightCategory.FINANCE
    };
    return mapping[category] || InsightCategory.PRODUCT;
  }

  private createDefaultInsightMetrics(): InsightMetrics {
    return {
      views: 0,
      actions: 0,
      effectiveness: 0
    };
  }

  private async storeInsight(insight: ProductInsight): Promise<void> {
    await this.memory.store(
      JSON.stringify(insight),
      MemoryType.FACT,
      {
        session_id: this.workspaceId,
        tags: ['ai_insight', insight.id, insight.type, insight.category, `confidence_${insight.confidence}`]
      }
    );
  }

  private generateInsightId(): string {
    return `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRecommendationId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getIntelligenceSummary(): Promise<any> {
    const totalInsights = this.insights.size;
    const highImpactInsights = Array.from(this.insights.values())
      .filter(i => i.impact === ImpactLevel.HIGH || i.impact === ImpactLevel.CRITICAL);

    const avgConfidence = this.insights.size > 0
      ? Array.from(this.insights.values()).reduce((sum, i) => sum + i.confidence, 0) / this.insights.size
      : 0;

    return {
      overview: {
        totalInsights,
        highImpactInsights: highImpactInsights.length,
        avgConfidence: Math.round(avgConfidence),
        totalPredictions: this.predictions.size,
        totalRecommendations: this.recommendations.size
      },
      recentInsights: Array.from(this.insights.values())
        .sort((a, b) => b.created.getTime() - a.created.getTime())
        .slice(0, 5)
    };
  }

  async cleanup(): Promise<void> {
    this.insights.clear();
    this.predictions.clear();
    this.recommendations.clear();
    this.analyses.clear();
    this.removeAllListeners();
  }

  // Add missing methods
  private async gatherHistoricalData(type: PredictionType, target: string): Promise<any> {
    const memories = await this.memory.recall({
      text: `prediction:${type}:${target}`,
      session_id: this.workspaceId,
      limit: 100
    });

    return {
      type,
      target,
      historicalData: memories.entries,
      timeframe: { start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), end: new Date() },
      timestamp: new Date()
    };
  }

  private async processPredictionResults(aiPrediction: string, type: PredictionType, target: string, timeframe: TimeFrame): Promise<PredictiveAnalysis> {
    try {
      const parsed = JSON.parse(aiPrediction);
      
      return {
        id: this.generatePredictionId(),
        type,
        target,
        prediction: {
          value: parsed.prediction?.value || 0,
          confidence: parsed.prediction?.confidence || 50,
          range: parsed.prediction?.range || { min: 0, max: 100 }
        },
        confidence: parsed.confidence || 50,
        timeframe,
        methodology: 'claude-4-analysis',
        factors: parsed.factors || [],
        accuracy: {
          historical: parsed.accuracy?.historical || 70,
          confidence: parsed.accuracy?.confidence || 50,
          methodology: 'ai-based'
        },
        created: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      };
    } catch (error) {
      console.error('Failed to process prediction results:', error);
      throw error;
    }
  }

  private async storePrediction(prediction: PredictiveAnalysis): Promise<void> {
    await this.memory.store(
      JSON.stringify(prediction),
      MemoryType.FACT,
      {
        session_id: this.workspaceId,
        tags: ['prediction', prediction.type, prediction.target, `confidence:${prediction.confidence}`]
      }
    );
  }

  private async gatherContextualData(context: RecommendationContext): Promise<any> {
    const contextMemories = await this.memory.recall({
      text: `context:${context.type}:${context.subject}`,
      session_id: this.workspaceId,
      limit: 50
    });

    return {
      context,
      memories: contextMemories.entries,
      timestamp: new Date()
    };
  }

  private async performAIRecommendations(contextData: any, context: RecommendationContext): Promise<string> {
    if (!this.aiClient) {
      throw new Error('AI client not configured');
    }

    const prompt = this.buildRecommendationPrompt(contextData, context);
    
    try {
      const response = await this.aiClient.generateContent({
        messages: [{ role: 'user', content: prompt }],
        model: 'claude-sonnet-4-20250514',
        maxTokens: 3000,
        temperature: 0.4
      } as ContentGeneratorOptions);

      return response.content;
    } catch (error) {
      console.error('AI recommendation generation failed:', error);
      throw error;
    }
  }

  private buildRecommendationPrompt(contextData: any, context: RecommendationContext): string {
    return `
You are an expert product management AI assistant. Generate intelligent recommendations based on the following context.

Context: ${JSON.stringify(context, null, 2)}
Data: ${JSON.stringify(contextData, null, 2)}

Please provide actionable recommendations with:
1. Clear priority levels
2. Expected impact metrics
3. Implementation effort estimates
4. Timeline suggestions
5. Risk assessments

Format as JSON:
{
  "recommendations": [
    {
      "category": "feature|strategy|marketing|operations|pricing",
      "priority": "low|medium|high|urgent",
      "title": "Recommendation title",
      "description": "Detailed description",
      "rationale": "Why this recommendation",
      "expectedImpact": {
        "metric": "revenue|users|retention",
        "value": 15,
        "timeframe": "3 months"
      },
      "effort": {
        "level": "low|medium|high",
        "hours": 40,
        "resources": ["developer", "designer"]
      },
      "timeline": {
        "duration": 30,
        "milestones": ["milestone1", "milestone2"]
      },
      "prerequisites": ["requirement1"],
      "risks": ["risk1"],
      "alternatives": []
    }
  ]
}
`;
  }

  private async processAIRecommendations(aiRecommendations: string, context: RecommendationContext): Promise<IntelligentRecommendation[]> {
    try {
      const parsed = JSON.parse(aiRecommendations);
      const recommendations: IntelligentRecommendation[] = [];

      for (const recData of parsed.recommendations || []) {
        const recommendation: IntelligentRecommendation = {
          id: this.generateRecommendationId(),
          category: this.mapRecommendationCategory(recData.category),
          priority: this.mapRecommendationPriority(recData.priority),
          title: recData.title,
          description: recData.description,
          rationale: recData.rationale || '',
          expectedImpact: recData.expectedImpact || { metric: 'unknown', value: 0, timeframe: '1 month' },
          effort: recData.effort || { level: 'medium' },
          timeline: {
            start: new Date(),
            duration: recData.timeline?.duration || 30,
            milestones: recData.timeline?.milestones || []
          },
          prerequisites: recData.prerequisites || [],
          risks: recData.risks || [],
          alternatives: recData.alternatives || [],
          confidence: recData.confidence || 70,
          created: new Date()
        };

        recommendations.push(recommendation);
      }

      return recommendations;
    } catch (error) {
      console.error('Failed to process AI recommendations:', error);
      return [];
    }
  }

  private async storeRecommendation(recommendation: IntelligentRecommendation): Promise<void> {
    await this.memory.store(
      JSON.stringify(recommendation),
      MemoryType.FACT,
      {
        session_id: this.workspaceId,
        tags: ['recommendation', recommendation.category, recommendation.priority, `confidence:${recommendation.confidence}`]
      }
    );
  }

  private async gatherAnalysisData(analysisType: AnalysisType, subject: string, parameters: AnalysisParameters): Promise<any> {
    const analysisMemories = await this.memory.recall({
      text: `analysis:${analysisType}:${subject}`,
      session_id: this.workspaceId,
      limit: 75
    });

    return {
      analysisType,
      subject,
      parameters,
      memories: analysisMemories.entries,
      timestamp: new Date()
    };
  }

  private async processAnalysisResults(aiAnalysis: string, analysisType: AnalysisType, subject: string): Promise<AutomatedAnalysis> {
    try {
      const parsed = JSON.parse(aiAnalysis);
      
      return {
        id: this.generateAnalysisId(),
        analysisType,
        subject,
        findings: parsed.findings || [],
        patterns: parsed.patterns || [],
        anomalies: parsed.anomalies || [],
        trends: parsed.trends || [],
        summary: parsed.summary || { keyFindings: [], recommendations: [], confidence: 50 },
        nextSteps: parsed.nextSteps || [],
        generated: new Date(),
        confidence: parsed.confidence || 60
      };
    } catch (error) {
      console.error('Failed to process analysis results:', error);
      throw error;
    }
  }

  private async storeAnalysis(analysis: AutomatedAnalysis): Promise<void> {
    await this.memory.store(
      JSON.stringify(analysis),
      MemoryType.FACT,
      {
        session_id: this.workspaceId,
        tags: ['analysis', analysis.analysisType, analysis.subject, `confidence:${analysis.confidence}`]
      }
    );
  }

  private mapRecommendationCategory(category: string): RecommendationCategory {
    const categoryMap: Record<string, RecommendationCategory> = {
      'feature': RecommendationCategory.FEATURE,
      'strategy': RecommendationCategory.STRATEGY,
      'marketing': RecommendationCategory.MARKETING,
      'operations': RecommendationCategory.OPERATIONS,
      'pricing': RecommendationCategory.PRICING
    };
    return categoryMap[category] || RecommendationCategory.FEATURE;
  }

  private mapRecommendationPriority(priority: string): RecommendationPriority {
    const priorityMap: Record<string, RecommendationPriority> = {
      'low': RecommendationPriority.LOW,
      'medium': RecommendationPriority.MEDIUM,
      'high': RecommendationPriority.HIGH,
      'urgent': RecommendationPriority.URGENT
    };
    return priorityMap[priority] || RecommendationPriority.MEDIUM;
  }

  private generatePredictionId(): string {
    return `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAnalysisId(): string {
    return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Supporting interfaces
interface Recommendation {
  id: string;
  text: string;
  priority: RecommendationPriority;
}

interface Evidence {
  type: string;
  description: string;
  source: string;
}

interface InsightMetrics {
  views: number;
  actions: number;
  effectiveness: number;
}

interface PredictionResult {
  value: number;
  confidence: number;
  range: { min: number; max: number };
}

interface TimeFrame {
  start: Date;
  end: Date;
  unit: 'days' | 'weeks' | 'months' | 'quarters';
}

interface PredictionFactor {
  name: string;
  impact: 'low' | 'medium' | 'high';
  description: string;
}

interface AccuracyMetrics {
  historical: number;
  confidence: number;
  methodology: string;
}

interface ExpectedImpact {
  metric: string;
  value: number;
  timeframe: string;
}

interface EffortEstimate {
  level: 'low' | 'medium' | 'high';
  hours?: number;
  resources?: string[];
}

interface RecommendationTimeline {
  start: Date;
  duration: number;
  milestones: string[];
}

interface Alternative {
  title: string;
  description: string;
  effort: EffortEstimate;
  impact: ExpectedImpact;
}

interface Finding {
  type: string;
  description: string;
  significance: 'low' | 'medium' | 'high';
}

interface Pattern {
  name: string;
  description: string;
  frequency: number;
  confidence: number;
}

interface Anomaly {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
}

interface Trend {
  name: string;
  direction: 'up' | 'down' | 'stable';
  strength: number;
  timeframe: string;
}

interface AnalysisSummary {
  keyFindings: string[];
  recommendations: string[];
  confidence: number;
}

interface RecommendationContext {
  type: string;
  subject: string;
  goals: string[];
  constraints: string[];
}

interface AnalysisParameters {
  timeframe: TimeFrame;
  metrics: string[];
  segments?: string[];
  filters?: Record<string, any>;
}

export default AIProductIntelligence; 