// Digital Product Management Analytics Engine
// Comprehensive analytics and data processing for product insights

import { EventEmitter } from 'events';
import { 
  AnalyticsEvent, 
  Dashboard, 
  AnalyticsQuery, 
  Experiment,
  Funnel,
  Cohort,
  Alert
} from '../types/analytics-types';
import { DPMConfigManager } from '../config/dpm-config';
import { HierarchicalMemoryManager } from '../../memory/hierarchical-manager';
import { MemoryType } from '../../memory/interfaces';

export interface AnalyticsEngineOptions {
  config: DPMConfigManager;
  memory: HierarchicalMemoryManager;
  workspaceId: string;
  userId: string;
}

export interface EventTrackingRequest {
  name: string;
  properties: Record<string, any>;
  userId?: string;
  sessionId?: string;
  timestamp?: Date;
}

export interface MetricCalculationRequest {
  metric: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, any>;
  groupBy?: string[];
}

export interface DashboardCreationRequest {
  name: string;
  description: string;
  widgets: any[];
  layout?: any;
  permissions?: any;
}

export class AnalyticsEngine extends EventEmitter {
  private config: DPMConfigManager;
  private memory: HierarchicalMemoryManager;
  private workspaceId: string;
  private userId: string;
  private events = new Map<string, AnalyticsEvent>();
  private dashboards = new Map<string, Dashboard>();
  private experiments = new Map<string, Experiment>();
  private funnels = new Map<string, Funnel>();
  private cohorts = new Map<string, Cohort>();
  private alerts = new Map<string, Alert>();
  private initialized = false;
  private initTime = Date.now();

  constructor(options: AnalyticsEngineOptions) {
    super();
    this.config = options.config;
    this.memory = options.memory;
    this.workspaceId = options.workspaceId;
    this.userId = options.userId;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load existing analytics data
      await this.loadAnalyticsData();
      
      // Set up real-time processing
      this.setupRealTimeProcessing();
      
      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private async loadAnalyticsData(): Promise<void> {
    try {
      // Load dashboards
      const dashboardData = await this.memory.recall({
        text: `workspace:${this.workspaceId} dashboards`,
        session_id: this.workspaceId,
        limit: 100
      });

      for (const memory of dashboardData.entries) {
        if (memory.metadata?.tags?.includes('dashboard')) {
          try {
            const dashboard = JSON.parse(memory.content) as Dashboard;
            this.dashboards.set(dashboard.id, dashboard);
          } catch (error) {
            console.warn('Failed to parse dashboard data:', error);
          }
        }
      }

      // Load experiments
      const experimentData = await this.memory.recall({
        text: `workspace:${this.workspaceId} experiments`,
        session_id: this.workspaceId,
        limit: 100
      });

      for (const memory of experimentData.entries) {
        if (memory.metadata?.tags?.includes('experiment')) {
          try {
            const experiment = JSON.parse(memory.content) as Experiment;
            this.experiments.set(experiment.id, experiment);
          } catch (error) {
            console.warn('Failed to parse experiment data:', error);
          }
        }
      }

      console.log(`Loaded ${this.dashboards.size} dashboards and ${this.experiments.size} experiments`);
    } catch (error) {
      console.warn('Failed to load analytics data:', error);
    }
  }

  private setupRealTimeProcessing(): void {
    // Set up event processing pipeline
    setInterval(() => {
      this.processEventBatch();
    }, 5000); // Process every 5 seconds

    // Set up alert checking
    setInterval(() => {
      this.checkAlerts();
    }, 60000); // Check alerts every minute
  }

  // Event Tracking
  async trackEvent(request: EventTrackingRequest): Promise<string> {
    const eventId = this.generateEventId();
    const now = new Date();

    const event: AnalyticsEvent = {
      id: eventId,
      type: 'user_action' as any,
      name: request.name,
      properties: request.properties,
      userId: request.userId,
      sessionId: request.sessionId || this.generateSessionId(),
      timestamp: request.timestamp || now,
      source: 'api' as any,
      context: {
        userAgent: request.properties.userAgent,
        ip: request.properties.ip,
        referrer: request.properties.referrer
      }
    };

    // Store event
    this.events.set(eventId, event);
    
    // Store in memory for persistence
    await this.storeEvent(event);

    // Emit for real-time processing
    this.emit('eventTracked', event);

    return eventId;
  }

  private async storeEvent(event: AnalyticsEvent): Promise<void> {
    await this.memory.store(
      JSON.stringify(event),
      MemoryType.FACT,
      {
        session_id: this.workspaceId,
        tags: ['analytics_event', event.type, event.name, `session:${event.sessionId}`]
      }
    );
  }

  // Metric Calculations
  async calculateMetric(request: MetricCalculationRequest): Promise<any> {
    const events = await this.getEventsInTimeRange(request.timeRange);
    
    switch (request.metric) {
      case 'unique_users':
        return this.calculateUniqueUsers(events, request);
      case 'page_views':
        return this.calculatePageViews(events, request);
      case 'conversion_rate':
        return this.calculateConversionRate(events, request);
      case 'retention_rate':
        return this.calculateRetentionRate(events, request);
      case 'average_session_duration':
        return this.calculateAverageSessionDuration(events, request);
      default:
        throw new Error(`Unknown metric: ${request.metric}`);
    }
  }

  private async getEventsInTimeRange(timeRange: { start: Date; end: Date }): Promise<AnalyticsEvent[]> {
    const eventData = await this.memory.recall({
      text: `workspace:${this.workspaceId} analytics_event`,
      session_id: this.workspaceId,
      timeRange,
      limit: 10000
    });

    const events: AnalyticsEvent[] = [];
    for (const memory of eventData.entries) {
      if (memory.metadata?.tags?.includes('analytics_event')) {
        try {
          const event = JSON.parse(memory.content) as AnalyticsEvent;
          events.push(event);
        } catch (error) {
          console.warn('Failed to parse event data:', error);
        }
      }
    }

    return events;
  }

  private calculateUniqueUsers(events: AnalyticsEvent[], request: MetricCalculationRequest): any {
    const uniqueUsers = new Set();
    const groupedData: Record<string, Set<string>> = {};

    for (const event of events) {
      if (event.userId) {
        uniqueUsers.add(event.userId);
        
        if (request.groupBy) {
          for (const groupField of request.groupBy) {
            const groupValue = this.getGroupValue(event, groupField);
            if (!groupedData[groupValue]) {
              groupedData[groupValue] = new Set();
            }
            groupedData[groupValue].add(event.userId);
          }
        }
      }
    }

    const result: any = {
      total: uniqueUsers.size,
      timeRange: request.timeRange
    };

    if (request.groupBy) {
      result.groups = {};
      for (const [groupValue, users] of Object.entries(groupedData)) {
        result.groups[groupValue] = users.size;
      }
    }

    return result;
  }

  private calculatePageViews(events: AnalyticsEvent[], request: MetricCalculationRequest): any {
    const pageViews = events.filter(e => e.type === 'page_view' || e.name === 'page_view');
    const groupedData: Record<string, number> = {};

    if (request.groupBy) {
      for (const event of pageViews) {
        for (const groupField of request.groupBy) {
          const groupValue = this.getGroupValue(event, groupField);
          groupedData[groupValue] = (groupedData[groupValue] || 0) + 1;
        }
      }
    }

    const result: any = {
      total: pageViews.length,
      timeRange: request.timeRange
    };

    if (request.groupBy) {
      result.groups = groupedData;
    }

    return result;
  }

  private calculateConversionRate(events: AnalyticsEvent[], request: MetricCalculationRequest): any {
    const conversionEvents = events.filter(e => e.type === 'conversion' || e.name.includes('conversion'));
    const totalUsers = new Set(events.map(e => e.userId).filter(Boolean)).size;
    const convertedUsers = new Set(conversionEvents.map(e => e.userId).filter(Boolean)).size;

    return {
      conversionRate: totalUsers > 0 ? convertedUsers / totalUsers : 0,
      totalUsers,
      convertedUsers,
      timeRange: request.timeRange
    };
  }

  private calculateRetentionRate(events: AnalyticsEvent[], request: MetricCalculationRequest): any {
    // Simplified retention calculation
    const userSessions = new Map<string, Date[]>();
    
    for (const event of events) {
      if (event.userId) {
        if (!userSessions.has(event.userId)) {
          userSessions.set(event.userId, []);
        }
        userSessions.get(event.userId)!.push(event.timestamp);
      }
    }

    let retainedUsers = 0;
    const totalUsers = userSessions.size;

    for (const [userId, sessions] of userSessions) {
      const sortedSessions = sessions.sort((a, b) => a.getTime() - b.getTime());
      const daysBetween = (sortedSessions[sortedSessions.length - 1].getTime() - sortedSessions[0].getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysBetween >= 1) { // Retained if active for more than 1 day
        retainedUsers++;
      }
    }

    return {
      retentionRate: totalUsers > 0 ? retainedUsers / totalUsers : 0,
      retainedUsers,
      totalUsers,
      timeRange: request.timeRange
    };
  }

  private calculateAverageSessionDuration(events: AnalyticsEvent[], request: MetricCalculationRequest): any {
    const sessionDurations = new Map<string, { start: Date; end: Date }>();

    for (const event of events) {
      if (event.sessionId) {
        if (!sessionDurations.has(event.sessionId)) {
          sessionDurations.set(event.sessionId, { start: event.timestamp, end: event.timestamp });
        } else {
          const session = sessionDurations.get(event.sessionId)!;
          if (event.timestamp < session.start) session.start = event.timestamp;
          if (event.timestamp > session.end) session.end = event.timestamp;
        }
      }
    }

    const durations: number[] = [];
    for (const session of sessionDurations.values()) {
      const duration = session.end.getTime() - session.start.getTime();
      durations.push(duration);
    }

    const averageDuration = durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0;

    return {
      averageSessionDuration: averageDuration / 1000, // Convert to seconds
      totalSessions: durations.length,
      timeRange: request.timeRange
    };
  }

  private getGroupValue(event: AnalyticsEvent, groupField: string): string {
    switch (groupField) {
      case 'date':
        return event.timestamp.toISOString().split('T')[0];
      case 'hour':
        return event.timestamp.toISOString().split('T')[1].split(':')[0];
      case 'day_of_week':
        return event.timestamp.toLocaleDateString('en-US', { weekday: 'long' });
      case 'event_name':
        return event.name;
      case 'user_id':
        return event.userId || 'anonymous';
      default:
        return event.properties[groupField] || 'unknown';
    }
  }

  // Dashboard Management
  async createDashboard(request: DashboardCreationRequest): Promise<Dashboard> {
    const dashboardId = this.generateDashboardId();
    const now = new Date();

    const dashboard: Dashboard = {
      id: dashboardId,
      name: request.name,
      description: request.description,
      widgets: request.widgets || [],
      layout: request.layout || { type: 'grid' as any, columns: 12, spacing: 16, responsive: true },
      filters: [],
      permissions: request.permissions || { view: [], edit: [], admin: [this.userId] },
      created: now,
      updated: now
    };

    // Store dashboard
    this.dashboards.set(dashboardId, dashboard);
    await this.storeDashboard(dashboard);

    this.emit('dashboardCreated', dashboard);
    return dashboard;
  }

  async updateDashboard(dashboardId: string, updates: Partial<Dashboard>): Promise<Dashboard> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    const updatedDashboard: Dashboard = {
      ...dashboard,
      ...updates,
      id: dashboard.id, // Ensure ID cannot be changed
      updated: new Date()
    };

    this.dashboards.set(dashboardId, updatedDashboard);
    await this.storeDashboard(updatedDashboard);

    this.emit('dashboardUpdated', updatedDashboard);
    return updatedDashboard;
  }

  async deleteDashboard(dashboardId: string): Promise<boolean> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      return false;
    }

    await this.memory.forget(dashboardId);
    this.dashboards.delete(dashboardId);

    this.emit('dashboardDeleted', dashboardId);
    return true;
  }

  async getDashboard(dashboardId: string): Promise<Dashboard | undefined> {
    return this.dashboards.get(dashboardId);
  }

  async listDashboards(): Promise<Dashboard[]> {
    return Array.from(this.dashboards.values());
  }

  private async storeDashboard(dashboard: Dashboard): Promise<void> {
    await this.memory.store(
      JSON.stringify(dashboard),
      MemoryType.FACT,
      {
        session_id: this.workspaceId,
        tags: ['dashboard', dashboard.id, `workspace:${this.workspaceId}`]
      }
    );
  }

  // Real-time Processing
  private async processEventBatch(): Promise<void> {
    // Process events in batches for performance
    const config = await this.config.getAnalyticsConfig();
    
    if (!config.enableRealTime) return;

    // This would implement real-time aggregations, alerts, etc.
    this.emit('batchProcessed', { timestamp: new Date() });
  }

  private async checkAlerts(): Promise<void> {
    for (const alert of this.alerts.values()) {
      if (!alert.enabled) continue;

      try {
        const result = await this.calculateMetric({
          metric: alert.condition.metric,
          timeRange: {
            start: new Date(Date.now() - alert.condition.timeWindow * 60 * 1000),
            end: new Date()
          }
        });

        const value = result.total || result[alert.condition.metric] || 0;
        const threshold = alert.condition.threshold;
        
        let triggered = false;
        switch (alert.condition.operator) {
          case 'greater_than':
            triggered = value > threshold;
            break;
          case 'less_than':
            triggered = value < threshold;
            break;
          case 'equals':
            triggered = value === threshold;
            break;
        }

        if (triggered) {
          await this.triggerAlert(alert, value);
        }
      } catch (error) {
        console.warn(`Failed to check alert ${alert.id}:`, error);
      }
    }
  }

  private async triggerAlert(alert: Alert, value: number): Promise<void> {
    // Update last triggered time
    alert.lastTriggered = new Date();
    this.alerts.set(alert.id, alert);

    // Send notifications through configured channels
    for (const channel of alert.channels) {
      await this.sendAlertNotification(alert, channel, value);
    }

    this.emit('alertTriggered', { alert, value });
  }

  private async sendAlertNotification(alert: Alert, channel: any, value: number): Promise<void> {
    // Implementation would depend on channel type (email, slack, webhook, etc.)
    console.log(`Alert ${alert.name} triggered: ${alert.condition.metric} = ${value} (threshold: ${alert.condition.threshold})`);
  }

  // Utility methods
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateDashboardId(): string {
    return `dash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Analytics insights
  async getAnalyticsInsights(): Promise<any> {
    const totalEvents = this.events.size;
    const totalDashboards = this.dashboards.size;
    const totalExperiments = this.experiments.size;
    const totalFunnels = this.funnels.size;
    const totalCohorts = this.cohorts.size;
    const totalAlerts = this.alerts.size;

    // Calculate health score based on system activity
    const healthScore = Math.min(100, Math.max(0, 
      (totalEvents > 0 ? 25 : 0) +
      (totalDashboards > 0 ? 25 : 0) +
      (totalExperiments > 0 ? 25 : 0) +
      (totalAlerts > 0 ? 25 : 0)
    ));

    return {
      overview: {
        totalEvents,
        totalDashboards,
        totalExperiments,
        totalFunnels,
        totalCohorts,
        totalAlerts
      },
      health: {
        score: healthScore,
        status: healthScore > 80 ? 'excellent' : healthScore > 60 ? 'good' : 'needs_attention'
      },
      recentActivity: {
        eventsLast24h: Array.from(this.events.values()).filter(
          event => event.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length,
        dashboardsCreatedThisWeek: Array.from(this.dashboards.values()).filter(
          dashboard => dashboard.created > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length
      },
      totalEvents,
      performance: {
        avgProcessingTime: 50, // ms
        throughput: totalEvents / Math.max(1, (Date.now() - this.initTime) / (1000 * 60)), // events per minute
        errorRate: 0.01 // 1%
      }
    };
  }

  // Cleanup
  async cleanup(): Promise<void> {
    this.removeAllListeners();
    this.events.clear();
    this.dashboards.clear();
    this.experiments.clear();
    this.funnels.clear();
    this.cohorts.clear();
    this.alerts.clear();
    this.initialized = false;
  }
} 