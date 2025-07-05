// Digital Product Management Platform - Main Entry Point
// Comprehensive product management lifecycle implementation with phase management and analytics

import { EventEmitter } from 'events';
import { DPMConfigManager } from './config/dpm-config';
import { HierarchicalMemoryManager } from '../memory/hierarchical-manager';
import { DigitalProductManager } from './core/product-manager';
import { AnalyticsEngine } from './core/analytics-engine';
import { UserResearchSystem } from './core/user-research';
import { StrategyCanvasSystem } from './core/strategy-canvas';
import { MarketAnalysisEngine } from './core/market-analysis';
import { RoadmapManager } from './core/roadmap-manager';
import PhaseManager from './core/phase-manager';
import LifecycleInsights from './core/lifecycle-insights';

export interface DPMPlatformOptions {
  workspaceId: string;
  userId: string;
  memory: HierarchicalMemoryManager;
  configPath?: string;
}

export interface DPMPlatformStatus {
  initialized: boolean;
  systems: {
    productManager: boolean;
    analytics: boolean;
    userResearch: boolean;
    strategyCanvas: boolean;
    marketAnalysis: boolean;
    roadmapManager: boolean;
    phaseManager: boolean;
    lifecycleInsights: boolean;
  };
  metrics: {
    totalProducts: number;
    totalEvents: number;
    totalPersonas: number;
    totalOpportunities: number;
    totalRoadmaps: number;
    totalPhases: number;
    totalReports: number;
    healthScore: number;
  };
}

export class DPMPlatform extends EventEmitter {
  private config: DPMConfigManager;
  private memory: HierarchicalMemoryManager;
  private workspaceId: string;
  private userId: string;
  
  // Core systems
  private productManager!: DigitalProductManager;
  private analytics!: AnalyticsEngine;
  private userResearch!: UserResearchSystem;
  private strategyCanvas!: StrategyCanvasSystem;
  private marketAnalysis!: MarketAnalysisEngine;
  private roadmapManager!: RoadmapManager;
  private phaseManager!: PhaseManager;
  private lifecycleInsights!: LifecycleInsights;
  
  private initialized = false;
  private systemsInitialized = {
    productManager: false,
    analytics: false,
    userResearch: false,
    strategyCanvas: false,
    marketAnalysis: false,
    roadmapManager: false,
    phaseManager: false,
    lifecycleInsights: false
  };

  constructor(options: DPMPlatformOptions) {
    super();
    this.workspaceId = options.workspaceId;
    this.userId = options.userId;
    this.memory = options.memory;
    
    // Initialize configuration - create a basic HierarchicalConfigManager
    const hierarchicalConfig = new (require('../../config/advanced-config').HierarchicalConfigManager)({
      workspaceId: this.workspaceId,
      userId: this.userId
    });
    
    this.config = new DPMConfigManager(hierarchicalConfig);

    // Initialize core systems
    this.initializeSystems();
  }

  private initializeSystems(): void {
    const systemOptions = {
      config: this.config,
      memory: this.memory,
      workspaceId: this.workspaceId,
      userId: this.userId
    };

    // Core product management
    this.productManager = new DigitalProductManager(systemOptions);
    this.productManager.on('initialized', () => {
      this.systemsInitialized.productManager = true;
      this.checkAllSystemsInitialized();
    });
    this.productManager.on('error', (error) => this.emit('systemError', { system: 'productManager', error }));

    // Analytics and metrics
    this.analytics = new AnalyticsEngine(systemOptions);
    this.analytics.on('initialized', () => {
      this.systemsInitialized.analytics = true;
      this.checkAllSystemsInitialized();
    });
    this.analytics.on('error', (error) => this.emit('systemError', { system: 'analytics', error }));

    // User research and personas
    this.userResearch = new UserResearchSystem(systemOptions);
    this.userResearch.on('initialized', () => {
      this.systemsInitialized.userResearch = true;
      this.checkAllSystemsInitialized();
    });
    this.userResearch.on('error', (error) => this.emit('systemError', { system: 'userResearch', error }));

    // Strategy and business modeling
    this.strategyCanvas = new StrategyCanvasSystem(systemOptions);
    this.strategyCanvas.on('initialized', () => {
      this.systemsInitialized.strategyCanvas = true;
      this.checkAllSystemsInitialized();
    });
    this.strategyCanvas.on('error', (error) => this.emit('systemError', { system: 'strategyCanvas', error }));

    // Market analysis and opportunities
    this.marketAnalysis = new MarketAnalysisEngine(systemOptions);
    this.marketAnalysis.on('initialized', () => {
      this.systemsInitialized.marketAnalysis = true;
      this.checkAllSystemsInitialized();
    });
    this.marketAnalysis.on('error', (error) => this.emit('systemError', { system: 'marketAnalysis', error }));

    // Roadmap and planning
    this.roadmapManager = new RoadmapManager(systemOptions);
    this.roadmapManager.on('initialized', () => {
      this.systemsInitialized.roadmapManager = true;
      this.checkAllSystemsInitialized();
    });
    this.roadmapManager.on('error', (error) => this.emit('systemError', { system: 'roadmapManager', error }));

    // Phase management system
    this.phaseManager = new PhaseManager({
      ...systemOptions,
      productManager: this.productManager,
      userResearch: this.userResearch,
      marketAnalysis: this.marketAnalysis,
      analytics: this.analytics
    });
    this.phaseManager.on('initialized', () => {
      this.systemsInitialized.phaseManager = true;
      this.checkAllSystemsInitialized();
    });
    this.phaseManager.on('error', (error) => this.emit('systemError', { system: 'phaseManager', error }));

    // Lifecycle insights and reporting
    this.lifecycleInsights = new LifecycleInsights({
      ...systemOptions,
      analytics: this.analytics,
      phaseManager: this.phaseManager,
      productManager: this.productManager
    });
    this.lifecycleInsights.on('initialized', () => {
      this.systemsInitialized.lifecycleInsights = true;
      this.checkAllSystemsInitialized();
    });
    this.lifecycleInsights.on('error', (error) => this.emit('systemError', { system: 'lifecycleInsights', error }));
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.emit('initializationStarted');

      // Initialize all systems in parallel for better performance
      const initPromises = [
        this.productManager.initialize(),
        this.analytics.initialize(),
        this.userResearch.initialize(),
        this.strategyCanvas.initialize(),
        this.marketAnalysis.initialize(),
        this.roadmapManager.initialize(),
        this.phaseManager.initialize(),
        this.lifecycleInsights.initialize()
      ];

      await Promise.all(initPromises);

      // Set up cross-system integrations
      this.setupIntegrations();

      // Set up platform-level analytics
      this.setupPlatformAnalytics();

      this.initialized = true;
      this.emit('initialized');
      
      console.log('✅ VibeX Digital Product Management Platform initialized successfully');
      console.log('🚀 Phase Management and Lifecycle Insights systems active');
    } catch (error) {
      this.emit('initializationError', error);
      throw error;
    }
  }

  private checkAllSystemsInitialized(): void {
    const allInitialized = Object.values(this.systemsInitialized).every(status => status);
    if (allInitialized && !this.initialized) {
      this.emit('allSystemsReady');
    }
  }

  private setupIntegrations(): void {
    // Product Manager -> Analytics integration
    this.productManager.on('productCreated', (product) => {
      this.analytics.trackEvent({
        name: 'product_created',
        properties: {
          productId: product.id,
          productName: product.name,
          status: product.status
        },
        userId: this.userId
      });
    });

    this.productManager.on('statusChanged', (event) => {
      this.analytics.trackEvent({
        name: 'product_status_changed',
        properties: {
          productId: event.productId,
          fromStatus: event.fromStatus,
          toStatus: event.toStatus,
          timestamp: event.timestamp
        },
        userId: this.userId
      });
    });

    // User Research -> Analytics integration
    this.userResearch.on('personaCreated', (persona) => {
      this.analytics.trackEvent({
        name: 'persona_created',
        properties: {
          personaId: persona.id,
          personaName: persona.name,
          segment: persona.segment
        },
        userId: this.userId
      });
    });

    this.userResearch.on('feedbackCollected', (feedback) => {
      this.analytics.trackEvent({
        name: 'feedback_collected',
        properties: {
          feedbackId: feedback.id,
          source: feedback.source,
          sentiment: feedback.sentiment
        },
        userId: this.userId
      });
    });

    // Market Analysis -> Analytics integration
    this.marketAnalysis.on('opportunityCreated', (opportunity) => {
      this.analytics.trackEvent({
        name: 'opportunity_created',
        properties: {
          opportunityId: opportunity.id,
          marketSize: opportunity.marketSegment.size,
          priority: opportunity.priority
        },
        userId: this.userId
      });
    });

    // Phase Manager -> Analytics integration
    this.phaseManager.on('phaseStarted', (event) => {
      this.analytics.trackEvent({
        name: 'phase_started',
        properties: {
          phaseId: event.phase.id,
          phaseType: event.phase.type,
          productId: event.phase.productId
        },
        userId: this.userId
      });
    });

    this.phaseManager.on('phaseCompleted', (event) => {
      this.analytics.trackEvent({
        name: 'phase_completed',
        properties: {
          phaseId: event.phase.id,
          phaseType: event.phase.type,
          productId: event.phase.productId,
          duration: event.phase.endDate!.getTime() - event.phase.startDate.getTime(),
          progress: event.phase.progress.overall
        },
        userId: this.userId
      });
    });

    this.phaseManager.on('phaseHealthAlert', (event) => {
      this.analytics.trackEvent({
        name: 'phase_health_alert',
        properties: {
          phaseId: event.phaseId,
          healthScore: event.health.score,
          issues: event.health.issues.length
        },
        userId: this.userId
      });
    });

    // Lifecycle Insights -> Analytics integration
    this.lifecycleInsights.on('dashboardGenerated', (event) => {
      this.analytics.trackEvent({
        name: 'dashboard_generated',
        properties: {
          dashboardType: event.type,
          generatedAt: new Date().toISOString()
        },
        userId: this.userId
      });
    });

    this.lifecycleInsights.on('reportGenerated', (event) => {
      this.analytics.trackEvent({
        name: 'report_generated',
        properties: {
          reportId: event.report.id,
          reportType: event.report.type,
          timeframe: event.report.timeframe
        },
        userId: this.userId
      });
    });

    this.lifecycleInsights.on('healthAlert', (event) => {
      this.analytics.trackEvent({
        name: 'lifecycle_health_alert',
        properties: {
          alertType: event.type,
          severity: event.severity,
          message: event.message
        },
        userId: this.userId
      });
    });
  }

  private setupPlatformAnalytics(): void {
    // Track platform usage patterns
    setInterval(async () => {
      try {
        const status = await this.getStatus();
        this.analytics.trackEvent({
          name: 'platform_health_check',
          properties: {
            healthScore: status.metrics.healthScore,
            totalProducts: status.metrics.totalProducts,
            totalPhases: status.metrics.totalPhases,
            systemsOnline: Object.values(status.systems).filter(s => s).length
          },
          userId: this.userId
        });
      } catch (error) {
        console.warn('Failed to track platform health:', error);
      }
    }, 3600000); // Every hour

    // Track system performance
    setInterval(async () => {
      try {
        const memoryUsage = process.memoryUsage();
        this.analytics.trackEvent({
          name: 'platform_performance',
          properties: {
            memoryUsage: memoryUsage.heapUsed,
            memoryTotal: memoryUsage.heapTotal,
            uptime: process.uptime()
          },
          userId: this.userId
        });
      } catch (error) {
        console.warn('Failed to track platform performance:', error);
      }
    }, 300000); // Every 5 minutes
  }

  async getStatus(): Promise<DPMPlatformStatus> {
    const [
      productsSummary,
      analyticsSummary,
      researchSummary,
      strategySummary,
      marketOpportunities,
      roadmapSummary,
      phasesSummary,
      insightsSummary
    ] = await Promise.all([
      this.productManager.getWorkspaceInsights(),
      this.analytics.getAnalyticsInsights(),
      this.userResearch.getResearchSummary(),
      this.strategyCanvas.getStrategySummary(),
      this.marketAnalysis.getTopOpportunities(10),
      this.roadmapManager.getRoadmapSummary(),
      this.phaseManager.getPhasesSummary(),
      this.getInsightsSummary()
    ]);

    return {
      initialized: this.initialized,
      systems: { ...this.systemsInitialized },
      metrics: {
        totalProducts: productsSummary.totalProducts || 0,
        totalEvents: analyticsSummary.totalEvents || 0,
        totalPersonas: researchSummary.overview.totalPersonas || 0,
        totalOpportunities: Array.isArray(marketOpportunities) ? marketOpportunities.length : 0,
        totalRoadmaps: roadmapSummary.overview.totalRoadmaps || 0,
        totalPhases: phasesSummary.overview.totalPhases || 0,
        totalReports: insightsSummary.totalReports || 0,
        healthScore: this.calculatePlatformHealthScore({
          productsSummary,
          analyticsSummary,
          researchSummary,
          strategySummary,
          marketSummary: { overview: { totalOpportunities: marketOpportunities.length } },
          roadmapSummary,
          phasesSummary,
          insightsSummary
        })
      }
    };
  }

  private async getInsightsSummary(): Promise<any> {
    // Get lifecycle insights summary
    return {
      totalReports: 0, // Would be implemented with actual report count
      totalDashboards: 0,
      totalInsights: 0,
      healthScore: 85
    };
  }

  private calculatePlatformHealthScore(summaries: any): number {
    // Enhanced health calculation including phase management
    const scores = [
      summaries.productsSummary?.health?.score || 0,
      summaries.analyticsSummary?.health?.score || 0,
      summaries.researchSummary?.health?.score || 0,
      summaries.strategySummary?.health?.score || 0,
      summaries.marketSummary?.health?.score || 0,
      summaries.roadmapSummary?.health?.score || 0,
      summaries.phasesSummary?.health?.averageScore || 0,
      summaries.insightsSummary?.healthScore || 0
    ];

    const validScores = scores.filter(score => score > 0);
    return validScores.length > 0 
      ? Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length)
      : 75; // Default healthy score
  }

  // PHASE MANAGEMENT METHODS
  async startProblemDiscoveryPhase(productId: string): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    return await this.phaseManager.startProblemDiscoveryPhase(productId);
  }

  async startSolutionDiscoveryPhase(productId: string, problemPhaseId: string): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    return await this.phaseManager.startSolutionDiscoveryPhase(productId, problemPhaseId);
  }

  async startDeliverySupportPhase(productId: string, solutionPhaseId: string): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    return await this.phaseManager.startDeliverySupportPhase(productId, solutionPhaseId);
  }

  async completePhase(phaseId: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    return await this.phaseManager.completePhase(phaseId);
  }

  // LIFECYCLE INSIGHTS METHODS
  async generateExecutiveDashboard(): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    return await this.lifecycleInsights.generateExecutiveDashboard();
  }

  async generateOperationalDashboard(): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    return await this.lifecycleInsights.generateOperationalDashboard();
  }

  async generateStrategicInsights(): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    return await this.lifecycleInsights.generateStrategicInsights();
  }

  async generateLifecycleReport(type: string, timeframe: string): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    return await this.lifecycleInsights.generateReport(type as any, timeframe as any);
  }

  // EXISTING METHODS (Enhanced)
  async createProduct(name: string, description: string, strategy?: any): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Create product through product manager
      const product = await this.productManager.createProduct({
        name,
        description,
        vision: strategy?.vision,
        mission: strategy?.mission,
        targetMarket: strategy?.targetMarket
      });

      // Automatically start problem discovery phase
      const problemPhase = await this.phaseManager.startProblemDiscoveryPhase(product.id);

      // Track comprehensive analytics
      this.analytics.trackEvent({
        name: 'product_lifecycle_started',
        properties: {
          productId: product.id,
          productName: name,
          phaseId: problemPhase.id,
          timestamp: new Date().toISOString()
        },
        userId: this.userId
      });

      return {
        product,
        initialPhase: problemPhase,
        nextSteps: [
          'Define product vision and goals',
          'Create user personas',
          'Conduct market analysis',
          'Identify problem statements'
        ]
      };
    } catch (error) {
      this.emit('error', { context: 'createProduct', error });
      throw error;
    }
  }

  async analyzeMarketOpportunity(productId: string, marketSegment: any): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Create market opportunity
      const opportunity = await this.marketAnalysis.createMarketOpportunity(
        `Market Opportunity for Product ${productId}`,
        'Comprehensive market analysis and opportunity assessment',
        marketSegment
      );

      // Generate insights using lifecycle analytics
      const insights = await this.lifecycleInsights.generateStrategicInsights();

      return {
        opportunity,
        insights: insights.market_position,
        recommendations: insights.investment_recommendations
      };
    } catch (error) {
      this.emit('error', { context: 'analyzeMarketOpportunity', error });
      throw error;
    }
  }

  async generateComprehensiveReport(): Promise<DPMComprehensiveReport> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const status = await this.getStatus();
      
      // Get comprehensive data from all systems
      const [
        products,
        analytics,
        research,
        strategy,
        roadmaps,
        phases,
        executiveDashboard,
        operationalDashboard,
        strategicInsights
      ] = await Promise.all([
        this.productManager.listProducts(),
        this.analytics.getAnalyticsInsights(),
        this.userResearch.getResearchSummary(),
        this.strategyCanvas.getStrategySummary(),
        this.roadmapManager.getRoadmapSummary(),
        this.phaseManager.getPhasesSummary(),
        this.lifecycleInsights.generateExecutiveDashboard(),
        this.lifecycleInsights.generateOperationalDashboard(),
        this.lifecycleInsights.generateStrategicInsights()
      ]);

      const opportunities = await this.marketAnalysis.getTopOpportunities(50);

      return {
        summary: {
          platformHealth: status.metrics.healthScore,
          totalProducts: status.metrics.totalProducts,
          activeProducts: products.filter((p: any) => p.status === 'active').length,
          completedProducts: products.filter((p: any) => p.status === 'completed').length,
          totalPhases: status.metrics.totalPhases,
          activePhases: phases.overview.activePhases,
          completedPhases: phases.overview.completedPhases
        },
        products,
        analytics,
        research,
        strategy,
        roadmaps,
        phases,
        opportunities,
        dashboards: {
          executive: executiveDashboard,
          operational: operationalDashboard
        },
        insights: strategicInsights,
        recommendations: this.generatePlatformRecommendations(status, {
          products,
          phases,
          insights: strategicInsights
        }),
        generatedAt: new Date()
      };
    } catch (error) {
      this.emit('error', { context: 'generateComprehensiveReport', error });
      throw error;
    }
  }

  private generatePlatformRecommendations(status: DPMPlatformStatus, data: any): string[] {
    const recommendations: string[] = [];

    // Health-based recommendations
    if (status.metrics.healthScore < 70) {
      recommendations.push('Platform health is below optimal - review system performance and resolve issues');
    }

    // Phase-based recommendations
    if (data.phases?.overview?.activePhases > data.phases?.overview?.completedPhases * 2) {
      recommendations.push('High ratio of active to completed phases - consider focusing on phase completion');
    }

    // Product lifecycle recommendations
    if (data.products?.length > 0) {
      const stuckProducts = data.products.filter((p: any) => p.status === 'active' && !p.recentActivity);
      if (stuckProducts.length > 0) {
        recommendations.push(`${stuckProducts.length} products appear stuck - review and update product roadmaps`);
      }
    }

    // Strategic recommendations from insights
    if (data.insights?.investment_recommendations?.length > 0) {
      recommendations.push(...data.insights.investment_recommendations.map((rec: any) => rec.title));
    }

    // Default recommendations if none generated
    if (recommendations.length === 0) {
      recommendations.push(
        'Continue monitoring product lifecycle phases',
        'Maintain regular executive dashboard reviews',
        'Focus on completing active phases before starting new ones'
      );
    }

    return recommendations.slice(0, 10); // Limit to top 10 recommendations
  }

  // System accessors (Enhanced)
  getProductManager(): DigitalProductManager {
    return this.productManager;
  }

  getAnalytics(): AnalyticsEngine {
    return this.analytics;
  }

  getUserResearch(): UserResearchSystem {
    return this.userResearch;
  }

  getStrategyCanvas(): StrategyCanvasSystem {
    return this.strategyCanvas;
  }

  getMarketAnalysis(): MarketAnalysisEngine {
    return this.marketAnalysis;
  }

  getRoadmapManager(): RoadmapManager {
    return this.roadmapManager;
  }

  getPhaseManager(): PhaseManager {
    return this.phaseManager;
  }

  getLifecycleInsights(): LifecycleInsights {
    return this.lifecycleInsights;
  }

  getConfig(): DPMConfigManager {
    return this.config;
  }

  async cleanup(): Promise<void> {
    try {
      await Promise.all([
        this.productManager?.cleanup(),
        this.analytics?.cleanup(),
        this.userResearch?.cleanup(),
        this.strategyCanvas?.cleanup(),
        this.marketAnalysis?.cleanup(),
        this.roadmapManager?.cleanup(),
        this.phaseManager?.cleanup(),
        this.lifecycleInsights?.cleanup()
      ]);
      
      this.removeAllListeners();
      console.log('✅ DPM Platform cleanup completed');
    } catch (error) {
      console.warn('⚠️ Error during DPM Platform cleanup:', error);
    }
  }
}

export interface DPMComprehensiveReport {
  summary: {
    platformHealth: number;
    totalProducts: number;
    activeProducts: number;
    completedProducts: number;
    totalPhases: number;
    activePhases: number;
    completedPhases: number;
  };
  products: any;
  analytics: any;
  research: any;
  strategy: any;
  roadmaps: any;
  phases: any;
  opportunities: any[];
  dashboards: {
    executive: any;
    operational: any;
  };
  insights: any;
  recommendations: string[];
  generatedAt: Date;
}

export default DPMPlatform; 