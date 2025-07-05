// Digital Product Management Analytics Types
// Comprehensive analytics and data types

export interface AnalyticsEvent {
  id: string;
  type: EventType;
  name: string;
  properties: Record<string, any>;
  userId?: string;
  sessionId: string;
  timestamp: Date;
  source: EventSource;
  context: EventContext;
}

export enum EventType {
  PAGE_VIEW = 'page_view',
  USER_ACTION = 'user_action',
  FEATURE_USAGE = 'feature_usage',
  CONVERSION = 'conversion',
  ERROR = 'error',
  PERFORMANCE = 'performance',
  BUSINESS = 'business'
}

export enum EventSource {
  WEB = 'web',
  MOBILE = 'mobile',
  API = 'api',
  BACKEND = 'backend',
  EXTERNAL = 'external'
}

export interface EventContext {
  userAgent?: string;
  ip?: string;
  referrer?: string;
  utm?: UTMParameters;
  device?: DeviceInfo;
  location?: LocationInfo;
}

export interface UTMParameters {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

export interface DeviceInfo {
  type: DeviceType;
  os: string;
  browser?: string;
  screenSize?: string;
  viewport?: string;
}

export enum DeviceType {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
  TABLET = 'tablet'
}

export interface LocationInfo {
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
}

export interface AnalyticsQuery {
  id: string;
  name: string;
  description: string;
  query: QueryDefinition;
  visualization: VisualizationType;
  filters: QueryFilter[];
  groupBy: string[];
  timeRange: TimeRange;
  refreshInterval?: number;
}

export interface QueryDefinition {
  events: string[];
  metrics: MetricDefinition[];
  dimensions: string[];
  conditions: QueryCondition[];
}

export interface MetricDefinition {
  name: string;
  type: MetricType;
  field?: string;
  calculation?: string;
  format?: string;
}

export enum MetricType {
  COUNT = 'count',
  UNIQUE_COUNT = 'unique_count',
  SUM = 'sum',
  AVERAGE = 'average',
  MEDIAN = 'median',
  PERCENTILE = 'percentile',
  RATIO = 'ratio',
  GROWTH_RATE = 'growth_rate'
}

export interface QueryCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
  logic?: LogicOperator;
}

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  IN = 'in',
  NOT_IN = 'not_in',
  EXISTS = 'exists',
  NOT_EXISTS = 'not_exists'
}

export enum LogicOperator {
  AND = 'and',
  OR = 'or'
}

export interface QueryFilter {
  field: string;
  operator: ConditionOperator;
  value: any;
}

export interface TimeRange {
  start: Date;
  end: Date;
  period?: TimePeriod;
  relative?: RelativeTime;
}

export enum TimePeriod {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year'
}

export interface RelativeTime {
  value: number;
  unit: TimeUnit;
  offset?: number;
}

export enum TimeUnit {
  MINUTES = 'minutes',
  HOURS = 'hours',
  DAYS = 'days',
  WEEKS = 'weeks',
  MONTHS = 'months',
  YEARS = 'years'
}

export enum VisualizationType {
  LINE_CHART = 'line_chart',
  BAR_CHART = 'bar_chart',
  PIE_CHART = 'pie_chart',
  TABLE = 'table',
  FUNNEL = 'funnel',
  COHORT = 'cohort',
  HEATMAP = 'heatmap',
  SCATTER_PLOT = 'scatter_plot',
  GAUGE = 'gauge',
  KPI_CARD = 'kpi_card'
}

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  layout: DashboardLayout;
  filters: DashboardFilter[];
  permissions: DashboardPermissions;
  refreshInterval?: number;
  created: Date;
  updated: Date;
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  query: AnalyticsQuery;
  position: WidgetPosition;
  size: WidgetSize;
  config: WidgetConfig;
}

export enum WidgetType {
  CHART = 'chart',
  TABLE = 'table',
  KPI = 'kpi',
  TEXT = 'text',
  FILTER = 'filter'
}

export interface WidgetPosition {
  x: number;
  y: number;
}

export interface WidgetSize {
  width: number;
  height: number;
}

export interface WidgetConfig {
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  customOptions?: Record<string, any>;
}

export interface DashboardLayout {
  type: LayoutType;
  columns: number;
  spacing: number;
  responsive: boolean;
}

export enum LayoutType {
  GRID = 'grid',
  FREE_FORM = 'free_form',
  VERTICAL = 'vertical',
  HORIZONTAL = 'horizontal'
}

export interface DashboardFilter {
  field: string;
  type: FilterType;
  values?: any[];
  defaultValue?: any;
  required?: boolean;
}

export enum FilterType {
  SELECT = 'select',
  MULTI_SELECT = 'multi_select',
  DATE_RANGE = 'date_range',
  TEXT = 'text',
  NUMBER = 'number',
  BOOLEAN = 'boolean'
}

export interface DashboardPermissions {
  view: string[];
  edit: string[];
  admin: string[];
  public?: boolean;
}

export interface Experiment {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  type: ExperimentType;
  status: ExperimentStatus;
  variants: ExperimentVariant[];
  targetAudience: AudienceDefinition;
  metrics: ExperimentMetric[];
  results?: ExperimentResults;
  startDate: Date;
  endDate?: Date;
  duration?: number;
  confidence: number;
  power: number;
}

export enum ExperimentType {
  AB_TEST = 'ab_test',
  MULTIVARIATE = 'multivariate',
  SPLIT_URL = 'split_url',
  FEATURE_FLAG = 'feature_flag'
}

export enum ExperimentStatus {
  DRAFT = 'draft',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface ExperimentVariant {
  id: string;
  name: string;
  description: string;
  allocation: number;
  changes: VariantChange[];
  isControl: boolean;
}

export interface VariantChange {
  type: ChangeType;
  selector?: string;
  content?: string;
  attributes?: Record<string, string>;
  code?: string;
}

export enum ChangeType {
  TEXT = 'text',
  HTML = 'html',
  CSS = 'css',
  JAVASCRIPT = 'javascript',
  REDIRECT = 'redirect',
  FEATURE_FLAG = 'feature_flag'
}

export interface AudienceDefinition {
  include: AudienceRule[];
  exclude?: AudienceRule[];
  percentage?: number;
}

export interface AudienceRule {
  field: string;
  operator: ConditionOperator;
  value: any;
}

export interface ExperimentMetric {
  name: string;
  type: MetricType;
  isPrimary: boolean;
  goal: MetricGoal;
  significance: number;
}

export enum MetricGoal {
  INCREASE = 'increase',
  DECREASE = 'decrease',
  NO_CHANGE = 'no_change'
}

export interface ExperimentResults {
  status: ResultStatus;
  winner?: string;
  confidence: number;
  lift: number;
  pValue: number;
  variants: VariantResults[];
  recommendations: string[];
}

export enum ResultStatus {
  INCONCLUSIVE = 'inconclusive',
  SIGNIFICANT = 'significant',
  NOT_SIGNIFICANT = 'not_significant'
}

export interface VariantResults {
  variantId: string;
  participants: number;
  conversions: number;
  conversionRate: number;
  improvement: number;
  confidence: number;
}

export interface Funnel {
  id: string;
  name: string;
  description: string;
  steps: FunnelStep[];
  timeWindow: number;
  filters: QueryFilter[];
  segments: string[];
}

export interface FunnelStep {
  id: string;
  name: string;
  event: string;
  conditions?: QueryCondition[];
  order: number;
}

export interface FunnelAnalysis {
  funnelId: string;
  timeRange: TimeRange;
  totalUsers: number;
  steps: FunnelStepAnalysis[];
  dropoffPoints: DropoffAnalysis[];
}

export interface FunnelStepAnalysis {
  stepId: string;
  users: number;
  conversionRate: number;
  dropoffRate: number;
  averageTime: number;
}

export interface DropoffAnalysis {
  fromStep: string;
  toStep: string;
  dropoffRate: number;
  users: number;
  reasons?: string[];
}

export interface Cohort {
  id: string;
  name: string;
  definition: CohortDefinition;
  size: number;
  created: Date;
}

export interface CohortDefinition {
  event: string;
  conditions: QueryCondition[];
  timeRange: TimeRange;
  returnEvent?: string;
  returnConditions?: QueryCondition[];
}

export interface CohortAnalysis {
  cohortId: string;
  periods: CohortPeriod[];
  retentionMatrix: number[][];
  averageRetention: number[];
}

export interface CohortPeriod {
  period: number;
  label: string;
  users: number;
}

export interface Alert {
  id: string;
  name: string;
  description: string;
  query: AnalyticsQuery;
  condition: AlertCondition;
  channels: AlertChannel[];
  frequency: AlertFrequency;
  enabled: boolean;
  lastTriggered?: Date;
}

export interface AlertCondition {
  metric: string;
  operator: ConditionOperator;
  threshold: number;
  timeWindow: number;
}

export interface AlertChannel {
  type: ChannelType;
  config: Record<string, any>;
}

export enum ChannelType {
  EMAIL = 'email',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
  SMS = 'sms'
}

export enum AlertFrequency {
  IMMEDIATE = 'immediate',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly'
} 