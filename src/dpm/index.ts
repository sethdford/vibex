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
  private lifecycleInsights!: LifecycleInsights;
  
  private initialized = false;
  private systemsInitialized = {
    productManager: false,
    analytics: false,
    userResearch: false,
    strategyCanvas: false,
    marketAnalysis: false,
    roadmapManager: false,
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

    // Lifecycle insights and reporting
    this.lifecycleInsights = new LifecycleInsights({
      ...systemOptions,
      analytics: this.analytics,
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
      insightsSummary
    ] = await Promise.all([
      this.productManager.getWorkspaceInsights(),
      this.analytics.getAnalyticsInsights(),
      this.userResearch.getResearchSummary(),
      this.strategyCanvas.getStrategySummary(),
      this.marketAnalysis.getTopOpportunities(10),
      this.roadmapManager.getRoadmapSummary(),
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
        totalPhases: 0,
        totalReports: insightsSummary.totalReports || 0,
        healthScore: 0
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
        this.lifecycleInsights?.cleanup()
      ]);
      
      this.removeAllListeners();
      console.log('✅ DPM Platform cleanup completed');
    } catch (error) {
      console.warn('⚠️ Error during DPM Platform cleanup:', error);
    }
  }
}

export default DPMPlatform;
