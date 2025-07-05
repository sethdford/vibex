// Digital Product Management Constants
// System-wide constants and configuration values

export const DPM_VERSION = '1.0.0';

// Product Lifecycle Constants
export const PRODUCT_LIFECYCLE_STAGES = {
  IDEATION: 'ideation',
  STRATEGY: 'strategy',
  PLANNING: 'planning',
  LAUNCH: 'launch',
  GROWTH: 'growth',
  MATURITY: 'maturity'
} as const;

export const PRODUCT_STATUS_TRANSITIONS = {
  concept: ['development'],
  development: ['beta', 'concept'],
  beta: ['launched', 'development'],
  launched: ['mature', 'sunset'],
  mature: ['sunset'],
  sunset: []
} as const;

// Analytics Constants
export const DEFAULT_ANALYTICS_CONFIG = {
  RETENTION_PERIOD_DAYS: 365,
  SAMPLING_RATE: 1.0,
  BATCH_SIZE: 1000,
  FLUSH_INTERVAL_MS: 5000,
  MAX_QUEUE_SIZE: 10000
} as const;

export const METRIC_THRESHOLDS = {
  ENGAGEMENT: {
    EXCELLENT: 0.8,
    GOOD: 0.6,
    AVERAGE: 0.4,
    POOR: 0.2
  },
  RETENTION: {
    EXCELLENT: 0.9,
    GOOD: 0.7,
    AVERAGE: 0.5,
    POOR: 0.3
  },
  CONVERSION: {
    EXCELLENT: 0.15,
    GOOD: 0.1,
    AVERAGE: 0.05,
    POOR: 0.02
  },
  NPS: {
    EXCELLENT: 70,
    GOOD: 50,
    AVERAGE: 30,
    POOR: 0
  }
} as const;

// Business Model Constants
export const PRICING_MODELS = {
  FLAT_RATE: 'flat_rate',
  TIERED: 'tiered',
  USAGE_BASED: 'usage_based',
  FREEMIUM: 'freemium',
  DYNAMIC: 'dynamic'
} as const;

export const REVENUE_TYPES = {
  SUBSCRIPTION: 'subscription',
  ONE_TIME: 'one_time',
  USAGE_BASED: 'usage_based',
  COMMISSION: 'commission',
  ADVERTISING: 'advertising'
} as const;

// Market Analysis Constants
export const MARKET_RESEARCH_METHODS = {
  SURVEYS: 'surveys',
  INTERVIEWS: 'interviews',
  FOCUS_GROUPS: 'focus_groups',
  OBSERVATION: 'observation',
  ANALYTICS: 'analytics',
  COMPETITIVE_ANALYSIS: 'competitive_analysis'
} as const;

export const PERSONA_VALIDATION_CRITERIA = {
  DEMOGRAPHIC_ACCURACY: 0.8,
  BEHAVIORAL_CONSISTENCY: 0.7,
  NEEDS_ALIGNMENT: 0.9,
  PAIN_POINT_RELEVANCE: 0.8
} as const;

// Feature Prioritization Constants
export const PRIORITIZATION_FRAMEWORKS = {
  RICE: 'rice',
  KANO: 'kano',
  VALUE_VS_EFFORT: 'value_vs_effort',
  MoSCoW: 'moscow',
  STORY_MAPPING: 'story_mapping',
  OKR_ALIGNMENT: 'okr_alignment'
} as const;

export const RICE_SCORING = {
  REACH: {
    HIGH: 5,
    MEDIUM: 3,
    LOW: 1
  },
  IMPACT: {
    MASSIVE: 3,
    HIGH: 2,
    MEDIUM: 1,
    LOW: 0.5,
    MINIMAL: 0.25
  },
  CONFIDENCE: {
    HIGH: 1.0,
    MEDIUM: 0.8,
    LOW: 0.5
  },
  EFFORT: {
    MINIMAL: 0.5,
    LOW: 1,
    MEDIUM: 2,
    HIGH: 5,
    MASSIVE: 8
  }
} as const;

// Experimentation Constants
export const EXPERIMENT_CONFIG = {
  MIN_SAMPLE_SIZE: 1000,
  DEFAULT_CONFIDENCE_LEVEL: 0.95,
  DEFAULT_POWER: 0.8,
  MIN_EFFECT_SIZE: 0.05,
  MAX_EXPERIMENT_DURATION_DAYS: 30,
  MIN_EXPERIMENT_DURATION_DAYS: 7
} as const;

export const STATISTICAL_SIGNIFICANCE = {
  ALPHA: 0.05,
  BETA: 0.2,
  CONFIDENCE_LEVELS: [0.90, 0.95, 0.99]
} as const;

// Team Collaboration Constants
export const TEAM_SIZES = {
  SMALL: 5,
  MEDIUM: 10,
  LARGE: 20,
  ENTERPRISE: 50
} as const;

export const COMMUNICATION_CHANNELS = {
  EMAIL: 'email',
  SLACK: 'slack',
  TEAMS: 'teams',
  MEETING: 'meeting',
  DASHBOARD: 'dashboard'
} as const;

export const MEETING_TYPES = {
  STANDUP: 'standup',
  PLANNING: 'planning',
  REVIEW: 'review',
  RETROSPECTIVE: 'retrospective',
  ONE_ON_ONE: 'one_on_one',
  ALL_HANDS: 'all_hands'
} as const;

// Performance Constants
export const PERFORMANCE_TARGETS = {
  API_RESPONSE_TIME_MS: 200,
  UI_LOAD_TIME_MS: 1000,
  DATABASE_QUERY_TIME_MS: 100,
  CACHE_HIT_RATIO: 0.95,
  UPTIME_PERCENTAGE: 99.9
} as const;

export const SCALABILITY_LIMITS = {
  MAX_CONCURRENT_USERS: 10000,
  MAX_PRODUCTS_PER_WORKSPACE: 1000,
  MAX_TEAM_MEMBERS: 500,
  MAX_DASHBOARD_WIDGETS: 50,
  MAX_EXPERIMENT_VARIANTS: 10
} as const;

// Security Constants
export const SECURITY_CONFIG = {
  SESSION_TIMEOUT_MINUTES: 60,
  PASSWORD_MIN_LENGTH: 12,
  MFA_REQUIRED_ROLES: ['admin', 'product_manager'],
  API_RATE_LIMIT_PER_MINUTE: 1000,
  MAX_FILE_UPLOAD_SIZE_MB: 100
} as const;

// Integration Constants
export const SUPPORTED_INTEGRATIONS = {
  ANALYTICS: ['google_analytics', 'mixpanel', 'amplitude', 'segment'],
  PROJECT_MANAGEMENT: ['jira', 'linear', 'asana', 'trello'],
  DESIGN: ['figma', 'sketch', 'adobe_xd', 'invision'],
  COMMUNICATION: ['slack', 'teams', 'discord', 'zoom'],
  DEVELOPMENT: ['github', 'gitlab', 'bitbucket', 'jenkins'],
  CRM: ['salesforce', 'hubspot', 'pipedrive', 'intercom']
} as const;

// Localization Constants
export const SUPPORTED_LANGUAGES = [
  'en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh', 'ru'
] as const;

export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'CAD', 'AUD', 'CHF', 'SEK', 'NOK'
] as const;

export const DATE_FORMATS = {
  US: 'MM/DD/YYYY',
  EU: 'DD/MM/YYYY',
  ISO: 'YYYY-MM-DD'
} as const;

// AI/ML Constants
export const AI_CONFIG = {
  CLAUDE_MODEL: 'claude-3-sonnet-20240229',
  MAX_TOKENS: 4096,
  TEMPERATURE: 0.7,
  EMBEDDING_DIMENSIONS: 1536,
  SIMILARITY_THRESHOLD: 0.8
} as const;

export const ML_MODELS = {
  CHURN_PREDICTION: 'churn_predictor_v1',
  DEMAND_FORECASTING: 'demand_forecaster_v1',
  SENTIMENT_ANALYSIS: 'sentiment_analyzer_v1',
  FEATURE_ADOPTION: 'adoption_predictor_v1'
} as const;

// Notification Constants
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  URGENT: 'urgent'
} as const;

export const NOTIFICATION_CHANNELS = {
  IN_APP: 'in_app',
  EMAIL: 'email',
  SLACK: 'slack',
  SMS: 'sms',
  WEBHOOK: 'webhook'
} as const;

// Dashboard Constants
export const WIDGET_TYPES = {
  CHART: 'chart',
  TABLE: 'table',
  KPI: 'kpi',
  TEXT: 'text',
  FILTER: 'filter'
} as const;

export const CHART_TYPES = {
  LINE: 'line',
  BAR: 'bar',
  PIE: 'pie',
  AREA: 'area',
  SCATTER: 'scatter',
  FUNNEL: 'funnel',
  COHORT: 'cohort'
} as const;

// Data Export Constants
export const EXPORT_FORMATS = {
  CSV: 'csv',
  JSON: 'json',
  XLSX: 'xlsx',
  PDF: 'pdf'
} as const;

export const EXPORT_LIMITS = {
  MAX_ROWS: 100000,
  MAX_FILE_SIZE_MB: 50,
  MAX_CONCURRENT_EXPORTS: 5
} as const;

// Error Codes
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  INTEGRATION_ERROR: 'INTEGRATION_ERROR',
  DATA_PROCESSING_ERROR: 'DATA_PROCESSING_ERROR'
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  PRODUCT_CREATED: 'Product created successfully',
  EXPERIMENT_LAUNCHED: 'Experiment launched successfully',
  DASHBOARD_UPDATED: 'Dashboard updated successfully',
  TEAM_INVITED: 'Team member invited successfully',
  DATA_EXPORTED: 'Data exported successfully'
} as const; 