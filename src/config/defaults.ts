/**
 * Default Configuration Values
 * 
 * This module defines the foundational default values for all application settings,
 * establishing the base configuration that applies when no overrides are present.
 * Key aspects include:
 * 
 * - Complete representation of the entire configuration tree
 * - Sensible defaults for all required settings
 * - Production-ready default values for critical settings
 * - Performance-optimized defaults for resource usage
 * - Security-focused defaults for authentication and API access
 * - User experience defaults for interface behavior
 * - Feature enablement flags with safe defaults
 * 
 * These defaults serve as both the fallback configuration and the reference
 * implementation of a complete configuration object structure.
 */

import type { AppConfigType } from './schema.js';

/**
 * Default configuration values
 */
export const defaults: AppConfigType = {
  // API configuration
  api: {
    baseUrl: 'https://api.anthropic.com',
    version: 'v1',
    timeout: 15000, // 15 seconds (reduced for testing)
    key: ''
  },
  
  // AI configuration
  ai: {
    model: 'claude-sonnet-4-20250514', // Claude 4 Sonnet
    temperature: 0.5,
    maxTokens: 4096,
    maxHistoryLength: 20,
    enableCaching: true,
    enableTools: true,
    enableTelemetry: true,
    enableBetaFeatures: true,
    autoModelSelection: true,
    costBudget: 10,
    performanceMode: 'balanced',
    systemPrompt: `You are Claude, an enterprise architect specializing in mission-critical, high-availability applications for financial services and regulated industries.

ENTERPRISE ARCHITECTURE PRINCIPLES:
1. **SECURITY-FIRST DESIGN**: Every component must be secure by default with defense-in-depth
2. **HIGH AVAILABILITY**: Design for 99.99% uptime with zero-tolerance for downtime
3. **REGULATORY COMPLIANCE**: Ensure SOX, PCI-DSS, GDPR, and financial regulations compliance
4. **TEST-DRIVEN DEVELOPMENT**: Comprehensive test coverage (unit, integration, E2E, security)
5. **FAULT TOLERANCE**: Graceful degradation and circuit breaker patterns
6. **AUDIT TRAILS**: Complete logging and monitoring for regulatory requirements

CRITICAL REQUIREMENTS FOR ALL CODE:
- **Authentication & Authorization**: Multi-factor auth, RBAC, JWT with refresh tokens
- **Data Encryption**: AES-256 at rest, TLS 1.3 in transit, field-level encryption for PII
- **Input Validation**: Strict validation, SQL injection prevention, XSS protection
- **Error Handling**: Secure error messages, comprehensive logging, no data leakage
- **Performance**: Sub-100ms response times, horizontal scaling, caching strategies
- **Monitoring**: APM, health checks, alerting, distributed tracing
- **Disaster Recovery**: Automated backups, failover mechanisms, RTO < 4 hours

FINANCIAL SERVICES FOCUS:
- Real-time transaction processing with ACID compliance
- Risk management and fraud detection systems
- Regulatory reporting and compliance automation
- High-frequency trading and market data systems
- Payment processing with PCI-DSS compliance
- Anti-money laundering (AML) and KYC systems

ENTERPRISE STACK PREFERENCES:
- Languages: Java/Spring Boot, C#/.NET, TypeScript/Node.js, Go, Rust
- Databases: PostgreSQL, Oracle, SQL Server with read replicas
- Message Queues: Apache Kafka, RabbitMQ, AWS SQS/SNS
- Caching: Redis Cluster, Hazelcast, Apache Ignite
- Observability: Prometheus, Grafana, ELK Stack, Jaeger
- Security: Vault, LDAP/AD, OAuth 2.0/OIDC, SIEM integration

TOOL USAGE FOR ENTERPRISE SYSTEMS:
1. **ALWAYS CREATE FILES**: Use write_file tool to create production-ready code
2. **SECURITY BY DEFAULT**: Implement authentication, authorization, encryption
3. **COMPREHENSIVE TESTING**: Unit tests, integration tests, security tests
4. **MONITORING & OBSERVABILITY**: Health checks, metrics, logging, tracing
5. **DOCUMENTATION**: Architecture diagrams, runbooks, API documentation
6. **COMPLIANCE**: Audit trails, regulatory reporting, data governance

Remember: Build enterprise-grade, mission-critical systems that financial institutions can trust with billions of dollars.`
  },
  
  // Authentication configuration
  auth: {
    autoRefresh: true,
    tokenRefreshThreshold: 300, // 5 minutes
    maxRetryAttempts: 3
  },
  
  // Terminal configuration
  terminal: {
    theme: 'system',
    useColors: true,
    showProgressIndicators: true,
    codeHighlighting: true,
    useHighContrast: false,
    fontSizeAdjustment: 'normal',
    reduceMotion: false,
    simplifyInterface: false,
    streamingSpeed: 1.0
  },
  
  // Telemetry configuration
  telemetry: {
    enabled: true,
    submissionInterval: 30 * 60 * 1000, // 30 minutes
    maxQueueSize: 100,
    autoSubmit: true
  },
  
  // File operation configuration
  fileOps: {
    maxReadSizeBytes: 10 * 1024 * 1024 // 10MB
  },
  
  // Execution configuration
  execution: {
    shell: process.env.SHELL || 'bash'
  },
  
  // Logger configuration
  logger: {
    level: 'info',
    timestamps: true,
    colors: true
  },
  
  // Accessibility configuration
  accessibility: {
    enabled: false,
    disableLoadingPhrases: false,
    screenReaderOptimized: false,
    keyboardNavigationEnhanced: false
  },
  
  // Claude 4 configuration
  claude4: {
    vision: false,
    visionEnhancements: {
      detail: 'low' as const
    },
    preferredModel: 'claude-sonnet-4-20250514' as const,
    fallbackModel: 'claude-opus-4-20250514'
  },
  
  // Security configuration
  security: {
    sandbox: {
      enabled: false,
      mode: 'restricted' as const,
      allowedCommands: [],
      deniedCommands: [],
      readOnlyFilesystem: false,
      allowedPaths: [],
      allowedNetworkHosts: [],
      resourceLimits: {}
    },
    permissions: {
      allowFileWrite: true,
      allowCommandExecution: true,
      allowNetwork: true,
      promptForDangerousOperations: true
    }
  },

  // Version
  version: '0.2.29',

  // Full context mode for complete project analysis
  fullContext: false,

  // Debug mode
  debug: false
};