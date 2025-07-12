# Configuration Migration Plan

## Current State Analysis

We have multiple overlapping configuration systems that need to be consolidated into the new infrastructure configuration system:

### Existing Configuration Systems

1. **Legacy ConfigManager** (`src/config/index.ts`)
   - Used by: 20+ files including main index.ts, AI services, commands, UI
   - Features: Basic file/env loading, Zod validation, LoadedSettings integration
   - Status: Most widely used, needs migration

2. **Advanced HierarchicalConfigManager** (`src/config/advanced-config.ts`)
   - Used by: DPM system
   - Features: Scope hierarchy, external store, real-time updates
   - Status: Specialized use case, needs evaluation

3. **New Infrastructure ConfigManager** (`src/infrastructure/config/config-manager.ts`)
   - Features: Modern architecture, event-driven, multi-source support
   - Status: Ready for use, needs adoption

4. **Simple Config** (`src/config/simple-config.ts`)
   - Used by: Simple startup
   - Features: Basic configuration loading
   - Status: Can be replaced

5. **DPM Config** (`src/dpm/config/dpm-config.ts`)
   - Used by: All DPM modules
   - Features: Domain-specific configuration
   - Status: Needs integration with new system

## Migration Strategy

### Phase 1: Infrastructure Setup (Immediate)

1. **Create Configuration Schema**
   - Define comprehensive Zod schema for all configuration
   - Include all existing config options
   - Add type safety for all config values

2. **Create Migration Utilities**
   - Build config migration helper functions
   - Create backward compatibility layer
   - Add configuration validation tools

3. **Setup Default Configuration Sources**
   - File-based configuration (JSON/YAML)
   - Environment variables with VIBEX_ prefix
   - Command-line arguments
   - LoadedSettings integration

### Phase 2: Core System Migration (High Priority)

1. **Migrate Main Application** (`src/index.ts`)
   - Replace legacy loadConfig with new ConfigManager
   - Update all config access patterns
   - Ensure backward compatibility

2. **Migrate AI Services** 
   - Update Claude client configuration
   - Migrate AI orchestration settings
   - Update content generator config

3. **Migrate Commands System**
   - Update command processor configuration
   - Migrate basic commands config
   - Update command types

### Phase 3: Service Layer Migration (Medium Priority)

1. **Migrate App Orchestration**
   - Update service configuration
   - Migrate context service config
   - Update orchestration settings

2. **Migrate UI System**
   - Update App.tsx configuration
   - Migrate main.tsx config loading
   - Update UI component configs

3. **Migrate File Operations**
   - Update file service configuration
   - Migrate cache service config
   - Update security sandbox config

### Phase 4: Specialized Systems (Lower Priority)

1. **Migrate DPM System**
   - Integrate DPM config with new system
   - Maintain domain-specific features
   - Update all DPM modules

2. **Migrate Terminal System**
   - Update terminal configuration
   - Migrate execution environment config
   - Update security settings

### Phase 5: Cleanup (Final)

1. **Remove Legacy Systems**
   - Delete old config files
   - Remove unused imports
   - Clean up type definitions

2. **Update Documentation**
   - Document new configuration system
   - Create migration guide
   - Update developer documentation

## Implementation Plan

### Step 1: Create Comprehensive Schema

```typescript
// src/infrastructure/config/vibex-config-schema.ts
import { z } from 'zod';

export const VibexConfigSchema = z.object({
  // AI Configuration
  ai: z.object({
    anthropic: z.object({
      apiKey: z.string().optional(),
      model: z.string().default('claude-3-sonnet-20240229'),
      maxTokens: z.number().default(4096),
      temperature: z.number().min(0).max(1).default(0.7)
    }),
    // ... other AI providers
  }),
  
  // UI Configuration
  ui: z.object({
    theme: z.enum(['light', 'dark', 'auto']).default('auto'),
    showLineNumbers: z.boolean().default(true),
    fontSize: z.number().min(8).max(24).default(14)
  }),
  
  // Tool Configuration
  tools: z.object({
    enabledTools: z.array(z.string()).default([]),
    toolTimeout: z.number().default(30000),
    maxConcurrentTools: z.number().default(5)
  }),
  
  // Security Configuration
  security: z.object({
    enableSandbox: z.boolean().default(true),
    allowedCommands: z.array(z.string()).default([]),
    trustedDomains: z.array(z.string()).default([])
  }),
  
  // DPM Configuration
  dpm: z.object({
    enabled: z.boolean().default(false),
    apiEndpoint: z.string().optional(),
    syncInterval: z.number().default(300000)
  }),
  
  // Performance Configuration
  performance: z.object({
    cacheEnabled: z.boolean().default(true),
    maxCacheSize: z.number().default(100),
    cleanupInterval: z.number().default(300000)
  })
});

export type VibexConfig = z.infer<typeof VibexConfigSchema>;
```

### Step 2: Create Migration Service

```typescript
// src/infrastructure/config/config-migration.ts
export class ConfigMigrationService {
  async migrateFromLegacy(legacyConfigPath: string): Promise<VibexConfig> {
    // Load legacy configuration
    // Transform to new schema
    // Validate with Zod
    // Return migrated config
  }
  
  async createBackwardCompatibilityLayer(): Promise<ConfigAdapter> {
    // Create adapter that provides legacy interface
    // Delegate to new configuration system
    // Maintain existing API surface
  }
}
```

### Step 3: Update Import Statements

All files currently importing from `../config/index.js` or `../config/schema.js` need to be updated to use the new infrastructure config system.

**Files to Update (20+ files):**
- `src/index.ts`
- `src/ai/index.ts`
- `src/ai/claude-client.ts`
- `src/ai/claude-content-generator.ts`
- `src/commands/index.ts`
- `src/commands/basic-commands.ts`
- `src/commands/at-command-processor.ts`
- `src/execution/index.ts`
- `src/fileops/index.ts`
- `src/security/sandbox.ts`
- `src/services/app-orchestration.ts`
- `src/services/contextService.ts`
- `src/terminal/index.ts`
- `src/ui/App.tsx`
- `src/ui/main.tsx`

### Step 4: Create Unified Configuration Factory

```typescript
// src/infrastructure/config/vibex-config-factory.ts
export class VibexConfigFactory {
  static async createProductionConfig(): Promise<ConfigManager> {
    const manager = new ConfigManager(VibexConfigSchema);
    
    // Add configuration sources in priority order
    manager.addSource(new FileConfigSource('vibex.config.json', 0));
    manager.addSource(new EnvironmentConfigSource('VIBEX_', 100));
    manager.addSource(new ArgumentsConfigSource(undefined, 200));
    
    await manager.reload();
    return manager;
  }
  
  static async createDevelopmentConfig(): Promise<ConfigManager> {
    // Development-specific configuration
  }
  
  static async createTestConfig(): Promise<ConfigManager> {
    // Test-specific configuration
  }
}
```

## Benefits of Migration

1. **Unified Configuration**: Single source of truth for all configuration
2. **Type Safety**: Full TypeScript support with Zod validation
3. **Hot Reload**: Real-time configuration updates
4. **Multi-Source**: Support for files, environment, CLI args
5. **Hierarchical**: Scope-based configuration inheritance
6. **Event-Driven**: React to configuration changes
7. **Validation**: Comprehensive schema validation
8. **Performance**: Efficient caching and loading

## Risk Mitigation

1. **Backward Compatibility**: Maintain existing APIs during transition
2. **Gradual Migration**: Migrate one system at a time
3. **Extensive Testing**: Test each migration step thoroughly
4. **Rollback Plan**: Keep legacy systems until migration is complete
5. **Documentation**: Document all changes and migration steps

## Success Criteria

- [ ] All configuration loading uses new infrastructure system
- [ ] Zero breaking changes to existing functionality
- [ ] Improved configuration validation and error handling
- [ ] Hot reload functionality working
- [ ] Performance improvements in config loading
- [ ] Comprehensive test coverage for new system
- [ ] Legacy configuration systems removed
- [ ] Documentation updated

## Timeline

- **Week 1**: Infrastructure setup and schema creation
- **Week 2**: Core system migration (main app, AI services)
- **Week 3**: Service layer migration (orchestration, UI)
- **Week 4**: Specialized systems (DPM, terminal)
- **Week 5**: Cleanup and documentation

This migration will consolidate our configuration management into a modern, type-safe, and performant system that supports all our current features while providing a foundation for future enhancements. 