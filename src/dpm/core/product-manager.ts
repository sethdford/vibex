// Digital Product Management Core
// Central orchestrator for product management lifecycle

import { EventEmitter } from 'events';
import { Product, ProductStatus, ProductLifecycleStage } from '../types/product-types';
import { 
  TeamMember, 
  TeamRole, 
  AvailabilityStatus,
  MemberPermissions,
  Availability,
  Workload,
  MemberPreferences,
  CommunicationStyle,
  WorkingHours,
  NotificationSettings,
  NotificationFrequency,
  RiskLevel
} from '../types/collaboration-types';
import { DPMConfigManager } from '../config/dpm-config';
import { HierarchicalMemoryManager } from '../../memory/hierarchical-manager';
import { MemoryType } from '../../memory/interfaces';

export interface ProductManagerOptions {
  config: DPMConfigManager;
  memory: HierarchicalMemoryManager;
  workspaceId: string;
  userId: string;
}

export interface ProductCreationRequest {
  name: string;
  description: string;
  vision?: string;
  mission?: string;
  targetMarket?: string;
  initialStage?: ProductLifecycleStage;
}

export interface ProductUpdateRequest {
  id: string;
  updates: Partial<Product>;
}

export interface ProductTransitionRequest {
  productId: string;
  newStatus: ProductStatus;
  reason?: string;
  approver?: string;
}

export interface ProductQuery {
  status?: ProductStatus[];
  stage?: ProductLifecycleStage[];
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'created' | 'updated' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface ProductMetricsQuery {
  productId: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  metrics: string[];
}

export class DigitalProductManager extends EventEmitter {
  private config: DPMConfigManager;
  private memory: HierarchicalMemoryManager;
  private workspaceId: string;
  private userId: string;
  private products = new Map<string, Product>();
  private initialized = false;

  constructor(options: ProductManagerOptions) {
    super();
    this.config = options.config;
    this.memory = options.memory;
    this.workspaceId = options.workspaceId;
    this.userId = options.userId;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load existing products from memory
      await this.loadProducts();
      
      // Set up event listeners
      this.setupEventListeners();
      
      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private async loadProducts(): Promise<void> {
    try {
      const productData = await this.memory.recall({
        text: `workspace:${this.workspaceId} products`,
        limit: 1000,
        session_id: this.workspaceId
      });

      for (const memory of productData.entries) {
        if (memory.metadata?.tags?.includes('product')) {
          try {
            const product = JSON.parse(memory.content) as Product;
            this.products.set(product.id, product);
          } catch (error) {
            console.warn('Failed to parse product data:', error);
          }
        }
      }

      console.log(`Loaded ${this.products.size} products for workspace ${this.workspaceId}`);
    } catch (error) {
      console.warn('Failed to load products from memory:', error);
    }
  }

  private setupEventListeners(): void {
    // Note: HierarchicalMemoryManager doesn't expose events
    // We'll handle updates through direct method calls
  }

  async createProduct(request: ProductCreationRequest): Promise<Product> {
    if (!this.initialized) {
      await this.initialize();
    }

    const productId = this.generateProductId();
    const now = new Date();

    // Create a proper TeamMember object
    const defaultProductManager: TeamMember = {
      id: this.userId,
      name: 'Product Manager',
      email: '',
      role: TeamRole.PRODUCT_MANAGER,
      permissions: {
        canView: ['*'],
        canEdit: ['*'],
        canDelete: ['*'],
        canInvite: true,
        canManageTeam: true,
        isAdmin: true
      },
      availability: {
        status: AvailabilityStatus.AVAILABLE,
        capacity: 100,
        schedule: [],
        timeOff: []
      },
      skills: [],
      workload: {
        currentCapacity: 50,
        assignments: [],
        estimatedHours: 40,
        actualHours: 35,
        burnoutRisk: RiskLevel.LOW
      },
      timezone: 'UTC',
      preferences: {
        communicationStyle: CommunicationStyle.COLLABORATIVE,
        workingHours: {
          startTime: '09:00',
          endTime: '17:00',
          timezone: 'UTC',
          flexibleHours: true
        },
        notificationSettings: {
          email: true,
          slack: true,
          inApp: true,
          sms: false,
          frequency: NotificationFrequency.IMMEDIATE
        },
        collaborationTools: ['slack', 'jira', 'figma']
      }
    };

    const product: Product = {
      id: productId,
      name: request.name,
      description: request.description,
      version: '0.1.0',
      status: ProductStatus.CONCEPT,
      stage: request.initialStage || ProductLifecycleStage.IDEATION,
      strategy: {
        vision: request.vision || '',
        mission: request.mission || '',
        objectives: [],
        targetMarket: {
          segments: [],
          personas: [],
          totalAddressableMarket: 0,
          servicableAddressableMarket: 0,
          servicableObtainableMarket: 0
        },
        valueProposition: '',
        competitiveAdvantage: '',
        businessModel: {
          type: 'subscription' as any,
          revenueStreams: [],
          costStructure: { fixedCosts: [], variableCosts: [], totalCost: 0 },
          keyPartners: [],
          keyActivities: [],
          keyResources: [],
          channels: [],
          customerRelationships: []
        },
        pricing: {
          model: 'freemium' as any,
          tiers: [],
          currency: 'USD',
          billingCycle: 'monthly' as any,
          discounts: []
        }
      },
      metrics: {
        business: {
          revenue: 0,
          growth: 0,
          profitability: 0,
          marketShare: 0,
          customerAcquisitionCost: 0,
          customerLifetimeValue: 0
        },
        product: {
          activeUsers: { daily: 0, weekly: 0, monthly: 0 },
          engagement: {
            sessionDuration: 0,
            sessionsPerUser: 0,
            bounceRate: 0,
            retentionRate: 0
          },
          features: [],
          performance: {
            loadTime: 0,
            uptime: 99.9,
            errorRate: 0
          }
        },
        customer: {
          satisfaction: { nps: 0, csat: 0, ces: 0 },
          support: {
            ticketVolume: 0,
            resolutionTime: 0,
            firstContactResolution: 0
          },
          retention: { rate: 0, cohortAnalysis: [] }
        },
        technical: {
          performance: {
            responseTime: 0,
            throughput: 0,
            errorRate: 0,
            uptime: 99.9
          },
          quality: {
            bugCount: 0,
            technicalDebt: 0,
            codeQuality: 0,
            testCoverage: 0
          },
          scalability: {
            concurrentUsers: 0,
            dataVolume: 0,
            requestsPerSecond: 0
          }
        }
      },
      team: {
        productManager: defaultProductManager,
        engineers: [],
        designers: [],
        marketers: [],
        analysts: [],
        stakeholders: []
      },
      created: now,
      updated: now
    };

    // Store in memory
    await this.storeProduct(product);
    
    // Store in local cache
    this.products.set(productId, product);

    // Emit event
    this.emit('productCreated', product);

    return product;
  }

  async updateProduct(request: ProductUpdateRequest): Promise<Product> {
    const product = this.products.get(request.id);
    if (!product) {
      throw new Error(`Product ${request.id} not found`);
    }

    const updatedProduct: Product = {
      ...product,
      ...request.updates,
      id: product.id, // Ensure ID cannot be changed
      updated: new Date()
    };

    // Store updated product
    await this.storeProduct(updatedProduct);
    this.products.set(request.id, updatedProduct);

    // Emit event
    this.emit('productUpdated', updatedProduct);

    return updatedProduct;
  }

  async deleteProduct(productId: string): Promise<boolean> {
    const product = this.products.get(productId);
    if (!product) {
      return false;
    }

    // Remove from memory using forget method
    await this.memory.forget(productId);

    // Remove from cache
    this.products.delete(productId);

    // Emit event
    this.emit('productDeleted', productId);

    return true;
  }

  async getProduct(productId: string): Promise<Product | undefined> {
    return this.products.get(productId);
  }

  async listProducts(query: ProductQuery = {}): Promise<Product[]> {
    let products = Array.from(this.products.values());

    // Apply filters
    if (query.status && query.status.length > 0) {
      products = products.filter(p => query.status!.includes(p.status));
    }

    if (query.stage && query.stage.length > 0) {
      products = products.filter(p => query.stage!.includes(p.stage));
    }

    if (query.search) {
      const searchLower = query.search.toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    const sortBy = query.sortBy || 'updated';
    const sortOrder = query.sortOrder || 'desc';
    
    products.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'created':
          aValue = a.created;
          bValue = b.created;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = a.updated;
          bValue = b.updated;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 50;
    
    return products.slice(offset, offset + limit);
  }

  async getAllProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProductsSummary(): Promise<{
    total: number;
    by_status: Record<string, number>;
    by_stage: Record<string, number>;
    recent: Product[];
  }> {
    const products = Array.from(this.products.values());
    
    return {
      total: products.length,
      by_status: this.groupBy(products, 'status'),
      by_stage: this.groupBy(products, 'stage'),
      recent: products
        .sort((a, b) => b.updated.getTime() - a.updated.getTime())
        .slice(0, 5)
    };
  }

  async transitionProductStatus(request: ProductTransitionRequest): Promise<Product> {
    const product = this.products.get(request.productId);
    if (!product) {
      throw new Error(`Product ${request.productId} not found`);
    }

    // Validate transition
    if (!this.isValidStatusTransition(product.status, request.newStatus)) {
      throw new Error(`Invalid status transition from ${product.status} to ${request.newStatus}`);
    }

    const updatedProduct = await this.updateProduct({
      id: request.productId,
      updates: {
        status: request.newStatus,
        updated: new Date()
      }
    });

    // Log transition
    await this.logStatusTransition(product, request);

    return updatedProduct;
  }

  private isValidStatusTransition(currentStatus: ProductStatus, newStatus: ProductStatus): boolean {
    const transitions: Record<ProductStatus, ProductStatus[]> = {
      [ProductStatus.CONCEPT]: [ProductStatus.DEVELOPMENT],
      [ProductStatus.DEVELOPMENT]: [ProductStatus.BETA, ProductStatus.CONCEPT],
      [ProductStatus.BETA]: [ProductStatus.LAUNCHED, ProductStatus.DEVELOPMENT],
      [ProductStatus.LAUNCHED]: [ProductStatus.MATURE, ProductStatus.SUNSET],
      [ProductStatus.MATURE]: [ProductStatus.SUNSET],
      [ProductStatus.SUNSET]: []
    };

    return transitions[currentStatus]?.includes(newStatus) || false;
  }

  private async logStatusTransition(product: Product, request: ProductTransitionRequest): Promise<void> {
    const logEntry = {
      type: 'status_transition',
      productId: product.id,
      productName: product.name,
      fromStatus: product.status,
      toStatus: request.newStatus,
      reason: request.reason,
      approver: request.approver,
      timestamp: new Date(),
      userId: this.userId
    };

    await this.memory.store(
      `Product ${product.name} status changed from ${product.status} to ${request.newStatus}: ${JSON.stringify(logEntry)}`,
      MemoryType.FACT,
      {
        session_id: this.workspaceId,
        tags: ['product_log', 'status_transition', product.id]
      }
    );
  }

  async getProductMetrics(query: ProductMetricsQuery): Promise<any> {
    const product = this.products.get(query.productId);
    if (!product) {
      throw new Error(`Product ${query.productId} not found`);
    }

    // For now, return current metrics
    // In a real implementation, this would query time-series data
    return {
      productId: query.productId,
      timeRange: query.timeRange,
      metrics: product.metrics
    };
  }

  private async storeProduct(product: Product): Promise<void> {
    await this.memory.store(
      JSON.stringify(product),
      MemoryType.FACT,
      {
        session_id: this.workspaceId,
        tags: ['product', product.id, `workspace:${this.workspaceId}`]
      }
    );
  }

  private generateProductId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `prod_${timestamp}_${random}`;
  }

  // Lifecycle stage management
  async advanceToNextStage(productId: string): Promise<Product> {
    const product = this.products.get(productId);
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    const nextStage = this.getNextLifecycleStage(product.stage);
    if (!nextStage) {
      throw new Error(`Product ${productId} is already in the final stage`);
    }

    return await this.updateProduct({
      id: productId,
      updates: { stage: nextStage }
    });
  }

  private getNextLifecycleStage(currentStage: ProductLifecycleStage): ProductLifecycleStage | null {
    const stages = [
      ProductLifecycleStage.IDEATION,
      ProductLifecycleStage.STRATEGY,
      ProductLifecycleStage.PLANNING,
      ProductLifecycleStage.LAUNCH,
      ProductLifecycleStage.GROWTH,
      ProductLifecycleStage.MATURITY
    ];

    const currentIndex = stages.indexOf(currentStage);
    return currentIndex < stages.length - 1 ? stages[currentIndex + 1] : null;
  }

  // Analytics and insights
  async getWorkspaceInsights(): Promise<any> {
    const products = Array.from(this.products.values());
    
    return {
      totalProducts: products.length,
      activeProducts: products.filter(p => p.status === ProductStatus.LAUNCHED).length,
      productsByStage: this.groupBy(products, 'stage'),
      productsByStatus: this.groupBy(products, 'status'),
      averageAge: this.calculateAverageAge(products),
      recentActivity: await this.getRecentActivity()
    };
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce((acc, item) => {
      const value = String(item[key]);
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateAverageAge(products: Product[]): number {
    if (products.length === 0) return 0;
    
    const now = Date.now();
    const totalAge = products.reduce((sum, product) => {
      return sum + (now - product.created.getTime());
    }, 0);
    
    return Math.round(totalAge / products.length / (1000 * 60 * 60 * 24)); // Days
  }

  private async getRecentActivity(): Promise<any[]> {
    const recentMemories = await this.memory.recall({
      text: `workspace:${this.workspaceId} product`,
      session_id: this.workspaceId,
      limit: 10,
      timeRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        end: new Date()
      }
    });

    return recentMemories.entries.map((memory: any) => ({
      type: memory.type,
      description: memory.content.substring(0, 100),
      timestamp: memory.timestamp,
      importance: memory.importance
    }));
  }

  // Cleanup
  async cleanup(): Promise<void> {
    this.removeAllListeners();
    this.products.clear();
    this.initialized = false;
  }
} 