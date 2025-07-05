// Digital Product Management Types
// Comprehensive type definitions for product management lifecycle

import { TeamMember } from './collaboration-types';

export interface Product {
  id: string;
  name: string;
  description: string;
  version: string;
  status: ProductStatus;
  stage: ProductLifecycleStage;
  strategy: ProductStrategy;
  metrics: ProductMetrics;
  team: ProductTeam;
  created: Date;
  updated: Date;
}

export enum ProductStatus {
  CONCEPT = 'concept',
  DEVELOPMENT = 'development', 
  BETA = 'beta',
  LAUNCHED = 'launched',
  MATURE = 'mature',
  SUNSET = 'sunset'
}

export enum ProductLifecycleStage {
  IDEATION = 'ideation',
  STRATEGY = 'strategy', 
  PLANNING = 'planning',
  LAUNCH = 'launch',
  GROWTH = 'growth',
  MATURITY = 'maturity'
}

export interface ProductStrategy {
  vision: string;
  mission: string;
  objectives: string[];
  targetMarket: TargetMarket;
  valueProposition: string;
  competitiveAdvantage: string;
  businessModel: BusinessModel;
  pricing: PricingStrategy;
}

export interface TargetMarket {
  segments: MarketSegment[];
  personas: UserPersona[];
  totalAddressableMarket: number;
  servicableAddressableMarket: number;
  servicableObtainableMarket: number;
}

export interface MarketSegment {
  id: string;
  name: string;
  description: string;
  size: number;
  growthRate: number;
  characteristics: string[];
  painPoints: string[];
  needs: string[];
}

export interface UserPersona {
  id: string;
  name: string;
  description: string;
  demographics: Demographics;
  psychographics: Psychographics;
  jobsToBeDown: JobToBeDone[];
  painPoints: string[];
  goals: string[];
  behaviors: string[];
  preferences: string[];
}

export interface Demographics {
  ageRange: string;
  gender: string;
  income: string;
  education: string;
  location: string;
  occupation: string;
}

export interface Psychographics {
  values: string[];
  interests: string[];
  lifestyle: string[];
  personality: string[];
  attitudes: string[];
}

export interface JobToBeDone {
  id: string;
  job: string;
  context: string;
  outcome: string;
  importance: number;
  satisfaction: number;
  opportunity: number;
}

export interface BusinessModel {
  type: BusinessModelType;
  revenueStreams: RevenueStream[];
  costStructure: CostStructure;
  keyPartners: string[];
  keyActivities: string[];
  keyResources: string[];
  channels: string[];
  customerRelationships: string[];
}

export enum BusinessModelType {
  SUBSCRIPTION = 'subscription',
  FREEMIUM = 'freemium',
  MARKETPLACE = 'marketplace',
  ADVERTISING = 'advertising',
  TRANSACTION = 'transaction',
  LICENSING = 'licensing',
  HYBRID = 'hybrid'
}

export interface RevenueStream {
  name: string;
  type: RevenueType;
  amount: number;
  recurring: boolean;
  description: string;
}

export enum RevenueType {
  SUBSCRIPTION = 'subscription',
  ONE_TIME = 'one_time',
  USAGE_BASED = 'usage_based',
  COMMISSION = 'commission',
  ADVERTISING = 'advertising'
}

export interface CostStructure {
  fixedCosts: Cost[];
  variableCosts: Cost[];
  totalCost: number;
}

export interface Cost {
  name: string;
  amount: number;
  category: string;
  description: string;
}

export interface PricingStrategy {
  model: PricingModel;
  tiers: PricingTier[];
  currency: string;
  billingCycle: BillingCycle;
  trialPeriod?: number;
  discounts: Discount[];
}

export enum PricingModel {
  FLAT_RATE = 'flat_rate',
  TIERED = 'tiered',
  USAGE_BASED = 'usage_based',
  FREEMIUM = 'freemium',
  DYNAMIC = 'dynamic'
}

export interface PricingTier {
  name: string;
  price: number;
  features: string[];
  limits: Record<string, number>;
  popular?: boolean;
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUALLY = 'annually',
  USAGE = 'usage'
}

export interface Discount {
  name: string;
  type: DiscountType;
  value: number;
  conditions: string[];
  validUntil?: Date;
}

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  FREE_TRIAL = 'free_trial'
}

export interface ProductMetrics {
  business: BusinessMetrics;
  product: ProductUsageMetrics;
  customer: CustomerMetrics;
  technical: TechnicalMetrics;
}

export interface BusinessMetrics {
  revenue: number;
  growth: number;
  profitability: number;
  marketShare: number;
  customerAcquisitionCost: number;
  customerLifetimeValue: number;
  monthlyRecurringRevenue?: number;
  annualRecurringRevenue?: number;
  churnRate?: number;
}

export interface ProductUsageMetrics {
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  engagement: {
    sessionDuration: number;
    sessionsPerUser: number;
    bounceRate: number;
    retentionRate: number;
  };
  features: FeatureMetrics[];
  performance: {
    loadTime: number;
    uptime: number;
    errorRate: number;
  };
}

export interface FeatureMetrics {
  featureId: string;
  name: string;
  adoptionRate: number;
  usageFrequency: number;
  satisfaction: number;
  timeToValue: number;
}

export interface CustomerMetrics {
  satisfaction: {
    nps: number;
    csat: number;
    ces: number;
  };
  support: {
    ticketVolume: number;
    resolutionTime: number;
    firstContactResolution: number;
  };
  retention: {
    rate: number;
    cohortAnalysis: CohortData[];
  };
}

export interface CohortData {
  cohort: string;
  period: number;
  users: number;
  retention: number;
}

export interface TechnicalMetrics {
  performance: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    uptime: number;
  };
  quality: {
    bugCount: number;
    technicalDebt: number;
    codeQuality: number;
    testCoverage: number;
  };
  scalability: {
    concurrentUsers: number;
    dataVolume: number;
    requestsPerSecond: number;
  };
}

export interface ProductTeam {
  productManager: TeamMember;
  engineers: TeamMember[];
  designers: TeamMember[];
  marketers: TeamMember[];
  analysts: TeamMember[];
  stakeholders: Stakeholder[];
}

// TeamMember interface is defined in collaboration-types.ts
// Import it when needed: import { TeamMember } from './collaboration-types';

export interface Stakeholder {
  id: string;
  name: string;
  role: string;
  influence: InfluenceLevel;
  interest: InterestLevel;
  communication: CommunicationPreference;
}

export enum InfluenceLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum InterestLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export interface CommunicationPreference {
  frequency: CommunicationFrequency;
  channels: CommunicationChannel[];
  format: CommunicationFormat;
}

export enum CommunicationFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  AD_HOC = 'ad_hoc'
}

export enum CommunicationChannel {
  EMAIL = 'email',
  SLACK = 'slack',
  TEAMS = 'teams',
  MEETING = 'meeting',
  DASHBOARD = 'dashboard'
}

export enum CommunicationFormat {
  SUMMARY = 'summary',
  DETAILED = 'detailed',
  VISUAL = 'visual',
  INTERACTIVE = 'interactive'
} 