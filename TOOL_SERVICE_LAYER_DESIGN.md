# Tool Service Layer Design

This document outlines the design of the service layer for the refactored VibeX tool system, focusing on service responsibilities, relationships, and orchestration.

## 1. Service Layer Architecture

### 1.1 Service Layer Overview

The service layer sits between the domain layer and the infrastructure/UI layers, coordinating the application's core functionality:

```
┌─────────────────────────┐
│        UI Layer         │
└───────────┬─────────────┘
            │
┌───────────▼─────────────┐
│     Service Layer       │
└───────────┬─────────────┘
            │
┌───────────▼─────────────┐
│      Domain Layer       │
└───────────┬─────────────┘
            │
┌───────────▼─────────────┐
│  Infrastructure Layer   │
└─────────────────────────┘
```

### 1.2 Key Services

```
┌──────────────────────┐        ┌───────────────────────┐
│ ToolRegistryService  │◄───────┤ ToolDiscoveryService  │
└──────────┬───────────┘        └───────────────────────┘
           │
           ▼
┌──────────────────────┐        ┌───────────────────────┐
│ ToolSchedulerService │◄───────┤ ValidationService     │
└──────────┬───────────┘        └───────────────────────┘
           │
           ▼
┌──────────────────────┐        ┌───────────────────────┐
│ToolOrchestrationSvc  │───────►│ ConfirmationService   │
└──────────┬───────────┘        └───────────────────────┘
           │
           ▼
┌──────────────────────┐        ┌───────────────────────┐
│ ToolExecutionService │◄───────┤ CheckpointService     │
└──────────────────────┘        └───────────────────────┘
```

## 2. Service Definitions

### 2.1 Tool Registry Service

**Purpose:** Manages the registration and discovery of tools.

**Responsibilities:**
- Register tools with namespaces
- Look up tools by name or namespace
- Maintain tool metadata
- Support tool categorization

**Key Methods:**
```typescript
interface ToolRegistryService {
  registerTool(tool: Tool, namespace?: string): void;
  getTool(name: string, namespace?: string): Tool | undefined;
  getAllTools(): Tool[];
  getToolsByNamespace(namespace: string): Tool[];
  getNamespaces(): string[];
}
```

**Dependencies:**
- ToolDiscoveryService (for dynamic tool discovery)

### 2.2 Tool Discovery Service

**Purpose:** Discovers tools from various sources.

**Responsibilities:**
- Discover MCP tools from configured servers
- Discover project-specific tools
- Validate discovered tools
- Register discovered tools with the registry

**Key Methods:**
```typescript
interface ToolDiscoveryService {
  discoverMcpTools(): Promise<Tool[]>;
  discoverProjectTools(): Promise<Tool[]>;
  validateDiscoveredTool(toolDef: any): boolean;
  refreshAllTools(): Promise<void>;
}
```

**Dependencies:**
- ToolRegistryService (to register discovered tools)
- McpClientService (to communicate with MCP servers)

### 2.3 Validation Service

**Purpose:** Validates tool parameters against schemas.

**Responsibilities:**
- Validate parameters against JSON schemas
- Provide detailed validation error messages
- Support custom validation rules
- Cache validation schemas for performance

**Key Methods:**
```typescript
interface ValidationService {
  validateAgainstSchema(value: unknown, schema: Record<string, unknown>): ValidationResult;
  addCustomValidator(name: string, validatorFn: (value: unknown) => string | null): void;
  clearCache(): void;
}

interface ValidationResult {
  valid: boolean;
  errors?: string[];
}
```

**Dependencies:**
- None (pure service)

### 2.4 Tool Scheduler Service

**Purpose:** Manages the lifecycle of tool executions.

**Responsibilities:**
- Schedule tool executions
- Manage tool call states
- Handle confirmation flows
- Provide execution status updates

**Key Methods:**
```typescript
interface ToolSchedulerService {
  schedule(request: ToolCallRequest | ToolCallRequest[], signal: AbortSignal): Promise<void>;
  handleConfirmation(callId: string, outcome: ToolConfirmationOutcome): Promise<void>;
  cancelToolCall(callId: string): void;
  getActiveToolCalls(): ToolCall[];
}
```

**Dependencies:**
- ToolRegistryService (to look up tools)
- ValidationService (to validate parameters)
- ConfirmationService (to handle confirmations)

### 2.5 Tool Orchestration Service

**Purpose:** Coordinates the overall tool system.

**Responsibilities:**
- Initialize and configure the tool system
- Coordinate between different services
- Provide a simplified API for tool execution
- Handle error recovery and retries

**Key Methods:**
```typescript
interface ToolOrchestrationService {
  executeTools(requests: ToolCallRequest | ToolCallRequest[], signal: AbortSignal): Promise<void>;
  registerTools(): void;
  getTool(name: string, namespace?: string): Tool | undefined;
  getAllTools(): Tool[];
  configure(config: ToolSystemConfig): void;
}
```

**Dependencies:**
- ToolRegistryService
- ToolSchedulerService
- ToolDiscoveryService
- ConfirmationService

### 2.6 Confirmation Service

**Purpose:** Handles tool execution confirmations.

**Responsibilities:**
- Display confirmation prompts to users
- Process user responses
- Manage trust levels for tools
- Provide different confirmation UIs

**Key Methods:**
```typescript
interface ConfirmationService {
  requestConfirmation(details: ToolConfirmationDetails): Promise<ToolConfirmationOutcome>;
  isTrusted(toolName: string, namespace?: string): boolean;
  markAsTrusted(toolName: string, namespace?: string): void;
}
```

**Dependencies:**
- UI components for displaying confirmations

### 2.7 Tool Execution Service

**Purpose:** Executes individual tools safely.

**Responsibilities:**
- Execute tool operations
- Provide progress feedback
- Handle execution errors
- Support cancellation
- Maintain execution statistics

**Key Methods:**
```typescript
interface ToolExecutionService {
  execute(tool: Tool, params: unknown, signal: AbortSignal, 
          feedbackCallback?: FeedbackCallback): Promise<ToolResult>;
  getExecutionStats(): ToolExecutionStats;
  clearStats(): void;
}
```

**Dependencies:**
- CheckpointService (for safety checkpoints)
- ValidationService (for parameter validation)

### 2.8 Checkpoint Service

**Purpose:** Creates safety checkpoints before destructive operations.

**Responsibilities:**
- Create checkpoints before risky operations
- Manage checkpoint expiration
- Restore from checkpoints when needed
- Track modified resources

**Key Methods:**
```typescript
interface CheckpointService {
  createCheckpoint(options: CheckpointOptions): Promise<CheckpointMetadata>;
  restoreCheckpoint(id: string): Promise<boolean>;
  shouldCreateCheckpoint(toolName: string, filePaths: string[]): boolean;
  getCheckpoints(): CheckpointInfo[];
}
```

**Dependencies:**
- GitService (for Git-based checkpointing)
- FileSystemService (for file operations)

## 3. Service Orchestration

### 3.1 Tool Execution Flow

```
1. UI/API calls ToolOrchestrationService.executeTools()
2. ToolOrchestrationService delegates to ToolSchedulerService
3. ToolSchedulerService:
   a. Looks up the tool via ToolRegistryService
   b. Validates parameters via ValidationService
   c. Checks if confirmation is needed
   d. If needed, requests confirmation via ConfirmationService
   e. Schedules execution
4. ToolExecutionService:
   a. Creates checkpoint if needed via CheckpointService
   b. Executes the tool
   c. Provides progress feedback to UI
   d. Returns result
5. ToolSchedulerService updates tool call state and notifies listeners
6. ToolOrchestrationService processes results
```

### 3.2 Tool Discovery Flow

```
1. Application startup triggers ToolOrchestrationService initialization
2. ToolOrchestrationService calls ToolRegistryService to register built-in tools
3. ToolDiscoveryService:
   a. Discovers MCP tools
   b. Discovers project tools
   c. Validates discovered tools
   d. Registers valid tools with ToolRegistryService
4. ToolOrchestrationService completes initialization
```

### 3.3 Confirmation Flow

```
1. ToolSchedulerService determines confirmation is needed
2. ToolSchedulerService updates tool call state to "awaiting_approval"
3. ToolSchedulerService calls ConfirmationService.requestConfirmation()
4. ConfirmationService:
   a. Checks if tool is trusted
   b. If trusted, returns ProceedOnce outcome
   c. If not trusted, displays confirmation UI
   d. Waits for user response
   e. Returns outcome based on user response
5. ToolSchedulerService processes confirmation outcome:
   a. ProceedOnce/ProceedAlways: Continue execution
   b. ModifyWithEditor: Display editor, then repeat confirmation
   c. Cancel: Cancel execution
```

## 4. Service Implementation Details

### 4.1 Tool Registry Service Implementation

```typescript
export class ToolRegistryServiceImpl implements ToolRegistryService {
  private tools = new Map<string, Tool>();
  private namespaces = new Map<string, Set<string>>();

  registerTool(tool: Tool, namespace = 'default'): void {
    const fullName = this.getFullToolName(namespace, tool.name);
    this.tools.set(fullName, tool);
    
    // Track namespace membership
    if (!this.namespaces.has(namespace)) {
      this.namespaces.set(namespace, new Set());
    }
    this.namespaces.get(namespace)!.add(fullName);
  }

  getTool(name: string, namespace = 'default'): Tool | undefined {
    const fullName = this.getFullToolName(namespace, name);
    return this.tools.get(fullName);
  }

  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  getToolsByNamespace(namespace: string): Tool[] {
    const toolNames = this.namespaces.get(namespace);
    if (!toolNames) return [];
    return Array.from(toolNames).map(name => this.tools.get(name)!);
  }

  getNamespaces(): string[] {
    return Array.from(this.namespaces.keys());
  }

  private getFullToolName(namespace: string, name: string): string {
    return namespace === 'default' ? name : `${namespace}__${name}`;
  }
}
```

### 4.2 Tool Scheduler Service Implementation

```typescript
export class ToolSchedulerServiceImpl implements ToolSchedulerService {
  private toolCalls: ToolCall[] = [];
  private registry: ToolRegistryService;
  private validationService: ValidationService;
  private confirmationService: ConfirmationService;
  private executionService: ToolExecutionService;
  private callbacks: ToolSchedulerCallbacks;

  constructor(
    registry: ToolRegistryService,
    validationService: ValidationService,
    confirmationService: ConfirmationService,
    executionService: ToolExecutionService,
    callbacks: ToolSchedulerCallbacks = {}
  ) {
    this.registry = registry;
    this.validationService = validationService;
    this.confirmationService = confirmationService;
    this.executionService = executionService;
    this.callbacks = callbacks;
  }

  async schedule(request: ToolCallRequest | ToolCallRequest[], signal: AbortSignal): Promise<void> {
    const requests = Array.isArray(request) ? request : [request];
    
    // Initialize tool calls
    const newToolCalls = requests.map(req => {
      const tool = this.registry.getTool(req.name);
      if (!tool) {
        return {
          status: 'error' as const,
          request: req,
          response: {
            callId: req.callId,
            error: new Error(`Tool "${req.name}" not found`)
          },
          startTime: Date.now()
        };
      }
      return {
        status: 'validating' as const,
        request: req,
        tool,
        startTime: Date.now()
      };
    });

    this.toolCalls = [...this.toolCalls, ...newToolCalls];
    this.notifyToolCallsUpdate();

    // Process each tool call
    for (const toolCall of newToolCalls) {
      if (toolCall.status !== 'validating' || !toolCall.tool) continue;

      const { request, tool } = toolCall;
      
      try {
        // Validate parameters
        const validationError = tool.validateParams(request.params);
        if (validationError) {
          this.updateToolCallStatus(request.callId, 'error', {
            response: {
              callId: request.callId,
              error: new Error(`Invalid parameters: ${validationError}`)
            }
          });
          continue;
        }
        
        // Check if execution needs confirmation
        const confirmationDetails = await tool.shouldConfirmExecute(request.params);
        
        if (confirmationDetails) {
          const originalOnConfirm = confirmationDetails.onConfirm;
          
          // Wrap the confirmation handler
          const wrappedDetails = {
            ...confirmationDetails,
            onConfirm: (outcome: ToolConfirmationOutcome) => 
              this.handleConfirmation(request.callId, originalOnConfirm, outcome, signal)
          };
          
          this.updateToolCallStatus(request.callId, 'awaiting_approval', { 
            confirmationDetails: wrappedDetails 
          });
        } else {
          this.updateToolCallStatus(request.callId, 'scheduled');
        }
      } catch (error) {
        this.updateToolCallStatus(request.callId, 'error', { 
          response: {
            callId: request.callId,
            error: error instanceof Error ? error : new Error(String(error))
          }
        });
      }
    }

    // Execute any scheduled calls
    this.executeScheduledCalls(signal);
  }

  // More implementation methods...
}
```

### 4.3 Tool Orchestration Service Implementation

```typescript
export class ToolOrchestrationServiceImpl implements ToolOrchestrationService {
  private registry: ToolRegistryService;
  private scheduler: ToolSchedulerService;
  private discovery: ToolDiscoveryService;
  private validation: ValidationService;
  private confirmation: ConfirmationService;
  private execution: ToolExecutionService;
  private checkpoint: CheckpointService;
  private config: ToolSystemConfig;

  constructor(config: ToolSystemConfig) {
    this.config = config;
    
    // Create services
    this.validation = new ValidationServiceImpl();
    this.registry = new ToolRegistryServiceImpl();
    this.confirmation = new ConfirmationServiceImpl();
    this.checkpoint = new CheckpointServiceImpl(config.git || {});
    this.execution = new ToolExecutionServiceImpl(this.validation, this.checkpoint);
    this.discovery = new ToolDiscoveryServiceImpl(this.registry, config.mcp || {});
    
    this.scheduler = new ToolSchedulerServiceImpl(
      this.registry,
      this.validation,
      this.confirmation,
      this.execution,
      {
        onToolCallsUpdate: calls => this.handleToolCallsUpdate(calls),
        onAllToolCallsComplete: calls => this.handleToolCallsComplete(calls)
      }
    );
    
    // Initialize
    this.registerTools();
  }

  registerTools(): void {
    // Register built-in tools
    const toolFactory = new ToolFactory();
    const builtInTools = toolFactory.createBuiltInTools();
    
    for (const [namespace, tools] of Object.entries(builtInTools)) {
      for (const tool of tools) {
        this.registry.registerTool(tool, namespace);
      }
    }
    
    // Discover external tools
    this.discovery.refreshAllTools().catch(error => {
      console.error('Error discovering tools:', error);
    });
  }

  async executeTools(
    requests: ToolCallRequest | ToolCallRequest[], 
    signal: AbortSignal
  ): Promise<void> {
    return this.scheduler.schedule(requests, signal);
  }

  getTool(name: string, namespace = 'default'): Tool | undefined {
    return this.registry.getTool(name, namespace);
  }

  getAllTools(): Tool[] {
    return this.registry.getAllTools();
  }

  configure(config: ToolSystemConfig): void {
    this.config = { ...this.config, ...config };
    // Update dependent services
  }

  private handleToolCallsUpdate(calls: ToolCall[]): void {
    // Emit events or update UI
  }
  
  private handleToolCallsComplete(calls: ToolCall[]): void {
    // Process completed calls
  }
}
```

## 5. Service Dependencies and Injection

### 5.1 Dependency Injection Pattern

The service layer will use a dependency injection approach to manage service dependencies:

```typescript
// Service factory
export class ServiceFactory {
  static createToolSystem(config: ToolSystemConfig): ToolOrchestrationService {
    const validation = new ValidationServiceImpl();
    const registry = new ToolRegistryServiceImpl();
    const confirmation = new ConfirmationServiceImpl();
    const checkpoint = new CheckpointServiceImpl(config.git || {});
    const execution = new ToolExecutionServiceImpl(validation, checkpoint);
    const discovery = new ToolDiscoveryServiceImpl(registry, config.mcp || {});
    
    const scheduler = new ToolSchedulerServiceImpl(
      registry,
      validation,
      confirmation,
      execution
    );
    
    return new ToolOrchestrationServiceImpl(
      registry,
      scheduler,
      discovery,
      validation,
      confirmation,
      execution,
      checkpoint,
      config
    );
  }
  
  // Factory methods for individual services
  static createValidationService(): ValidationService {
    return new ValidationServiceImpl();
  }
  
  static createToolRegistryService(): ToolRegistryService {
    return new ToolRegistryServiceImpl();
  }
  
  // More factory methods...
}
```

### 5.2 Service Lifecycle Management

```typescript
export class ToolSystemLifecycleManager {
  private services: Map<string, any> = new Map();
  
  async initialize(config: ToolSystemConfig): Promise<void> {
    // Create core services
    const registry = ServiceFactory.createToolRegistryService();
    const validation = ServiceFactory.createValidationService();
    
    this.services.set('registry', registry);
    this.services.set('validation', validation);
    
    // Initialize services that have async initialization
    const discovery = ServiceFactory.createToolDiscoveryService(registry, config);
    await discovery.initialize();
    this.services.set('discovery', discovery);
    
    // More service initialization
    
    // Final orchestrator
    const orchestrator = ServiceFactory.createToolOrchestrationService(
      registry,
      this.services.get('scheduler'),
      discovery,
      validation,
      this.services.get('confirmation'),
      this.services.get('execution'),
      this.services.get('checkpoint'),
      config
    );
    this.services.set('orchestrator', orchestrator);
  }
  
  getService<T>(name: string): T {
    if (!this.services.has(name)) {
      throw new Error(`Service ${name} not found`);
    }
    return this.services.get(name) as T;
  }
  
  async shutdown(): Promise<void> {
    // Shutdown services in reverse dependency order
    const services = Array.from(this.services.entries());
    for (let i = services.length - 1; i >= 0; i--) {
      const [name, service] = services[i];
      if (service.shutdown && typeof service.shutdown === 'function') {
        await service.shutdown();
      }
    }
    this.services.clear();
  }
}
```

## 6. Service Integration with UI Layer

### 6.1 React Hooks for Tool Execution

```typescript
export function useToolExecution() {
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const orchestrationService = useToolOrchestrationService();
  
  const executeTools = useCallback(async (
    requests: ToolCallRequest | ToolCallRequest[]
  ) => {
    const controller = new AbortController();
    
    // Setup event listener for tool call updates
    const updateListener = (calls: ToolCall[]) => {
      setToolCalls(calls);
    };
    
    // Start execution
    await orchestrationService.executeTools(requests, controller.signal, updateListener);
    
    return controller;
  }, [orchestrationService]);
  
  return {
    toolCalls,
    executeTools
  };
}
```

### 6.2 Tool Confirmation Component

```typescript
export function ToolConfirmationDialog({ 
  confirmationDetails, 
  onConfirm 
}: { 
  confirmationDetails: ToolConfirmationDetails;
  onConfirm: (outcome: ToolConfirmationOutcome) => void;
}) {
  // Different UI based on confirmation type
  switch (confirmationDetails.type) {
    case 'edit':
      return <EditConfirmationDialog details={confirmationDetails} onConfirm={onConfirm} />;
    case 'exec':
      return <ExecConfirmationDialog details={confirmationDetails} onConfirm={onConfirm} />;
    case 'info':
      return <InfoConfirmationDialog details={confirmationDetails} onConfirm={onConfirm} />;
    default:
      return <GenericConfirmationDialog details={confirmationDetails} onConfirm={onConfirm} />;
  }
}
```

### 6.3 Tool Context Provider

```typescript
const ToolContext = createContext<{
  orchestrationService: ToolOrchestrationService;
  confirmationService: ConfirmationService;
  toolCalls: ToolCall[];
} | null>(null);

export function ToolProvider({ children }: { children: React.ReactNode }) {
  const [toolSystem, setToolSystem] = useState<{
    orchestrationService: ToolOrchestrationService;
    confirmationService: ConfirmationService;
  } | null>(null);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  
  useEffect(() => {
    // Initialize tool system
    const config = getToolSystemConfig();
    const lifecycleManager = new ToolSystemLifecycleManager();
    
    lifecycleManager.initialize(config).then(() => {
      const orchestrationService = lifecycleManager.getService<ToolOrchestrationService>('orchestrator');
      const confirmationService = lifecycleManager.getService<ConfirmationService>('confirmation');
      
      setToolSystem({
        orchestrationService,
        confirmationService
      });
      
      // Setup tool call update listener
      const updateListener = (calls: ToolCall[]) => {
        setToolCalls(calls);
      };
      orchestrationService.addEventListener('toolCallsUpdate', updateListener);
      
      return () => {
        orchestrationService.removeEventListener('toolCallsUpdate', updateListener);
        lifecycleManager.shutdown();
      };
    });
  }, []);
  
  if (!toolSystem) {
    return <div>Loading tool system...</div>;
  }
  
  return (
    <ToolContext.Provider value={{
      orchestrationService: toolSystem.orchestrationService,
      confirmationService: toolSystem.confirmationService,
      toolCalls
    }}>
      {children}
    </ToolContext.Provider>
  );
}
```

## 7. Service Error Handling and Recovery

### 7.1 Error Propagation Strategy

```typescript
interface ServiceError extends Error {
  code: string;
  recoverable: boolean;
  details?: unknown;
}

class ToolServiceError extends Error implements ServiceError {
  code: string;
  recoverable: boolean;
  details?: unknown;
  
  constructor(message: string, options: {
    code: string;
    recoverable: boolean;
    details?: unknown;
    cause?: Error;
  }) {
    super(message, { cause: options.cause });
    this.code = options.code;
    this.recoverable = options.recoverable;
    this.details = options.details;
    this.name = 'ToolServiceError';
  }
}
```

### 7.2 Recovery Strategies

```typescript
export class ServiceRecoveryManager {
  private retryStrategies = new Map<string, RetryStrategy>();
  
  registerRetryStrategy(errorCode: string, strategy: RetryStrategy): void {
    this.retryStrategies.set(errorCode, strategy);
  }
  
  async attemptRecovery(error: ServiceError, context: any): Promise<boolean> {
    if (!error.recoverable) {
      return false;
    }
    
    const strategy = this.retryStrategies.get(error.code);
    if (!strategy) {
      return false;
    }
    
    return strategy.recover(error, context);
  }
}

interface RetryStrategy {
  recover(error: ServiceError, context: any): Promise<boolean>;
}

// Example strategy for tool not found errors
class ToolNotFoundRecoveryStrategy implements RetryStrategy {
  private discoveryService: ToolDiscoveryService;
  
  constructor(discoveryService: ToolDiscoveryService) {
    this.discoveryService = discoveryService;
  }
  
  async recover(error: ServiceError, context: any): Promise<boolean> {
    if (error.code !== 'TOOL_NOT_FOUND') {
      return false;
    }
    
    try {
      // Attempt to discover missing tools
      await this.discoveryService.refreshAllTools();
      return true;
    } catch (e) {
      return false;
    }
  }
}
```

## 8. Service Performance Considerations

### 8.1 Caching Strategies

```typescript
export class CachedToolRegistryService implements ToolRegistryService {
  private registry: ToolRegistryService;
  private toolCache = new Map<string, Tool>();
  private namespaceCache = new Map<string, Tool[]>();
  
  constructor(registry: ToolRegistryService) {
    this.registry = registry;
  }
  
  registerTool(tool: Tool, namespace = 'default'): void {
    this.registry.registerTool(tool, namespace);
    this.clearCache();
  }
  
  getTool(name: string, namespace = 'default'): Tool | undefined {
    const cacheKey = `${namespace}:${name}`;
    if (this.toolCache.has(cacheKey)) {
      return this.toolCache.get(cacheKey);
    }
    
    const tool = this.registry.getTool(name, namespace);
    if (tool) {
      this.toolCache.set(cacheKey, tool);
    }
    return tool;
  }
  
  getAllTools(): Tool[] {
    if (this.toolCache.size === 0) {
      const tools = this.registry.getAllTools();
      for (const tool of tools) {
        this.toolCache.set(tool.name, tool);
      }
      return tools;
    }
    return Array.from(this.toolCache.values());
  }
  
  getToolsByNamespace(namespace: string): Tool[] {
    if (this.namespaceCache.has(namespace)) {
      return this.namespaceCache.get(namespace)!;
    }
    
    const tools = this.registry.getToolsByNamespace(namespace);
    this.namespaceCache.set(namespace, tools);
    return tools;
  }
  
  getNamespaces(): string[] {
    return this.registry.getNamespaces();
  }
  
  clearCache(): void {
    this.toolCache.clear();
    this.namespaceCache.clear();
  }
}
```

### 8.2 Parallel Tool Execution

```typescript
export class ParallelToolExecutionService implements ToolExecutionService {
  private executionService: ToolExecutionService;
  private maxConcurrent: number;
  private activeExecutions = 0;
  private queue: {
    tool: Tool;
    params: unknown;
    signal: AbortSignal;
    resolve: (result: ToolResult) => void;
    reject: (error: Error) => void;
  }[] = [];
  
  constructor(executionService: ToolExecutionService, maxConcurrent = 5) {
    this.executionService = executionService;
    this.maxConcurrent = maxConcurrent;
  }
  
  async execute(
    tool: Tool,
    params: unknown,
    signal: AbortSignal,
    feedbackCallback?: FeedbackCallback
  ): Promise<ToolResult> {
    // If we can run immediately, do so
    if (this.activeExecutions < this.maxConcurrent) {
      this.activeExecutions++;
      try {
        return await this.executionService.execute(tool, params, signal, feedbackCallback);
      } finally {
        this.activeExecutions--;
        this.processQueue();
      }
    }
    
    // Otherwise queue the execution
    return new Promise<ToolResult>((resolve, reject) => {
      this.queue.push({
        tool,
        params,
        signal,
        resolve,
        reject
      });
      
      // Handle cancellation
      signal.addEventListener('abort', () => {
        this.removeFromQueue(signal);
        reject(new Error('Tool execution cancelled'));
      });
    });
  }
  
  private processQueue(): void {
    if (this.queue.length === 0 || this.activeExecutions >= this.maxConcurrent) {
      return;
    }
    
    const next = this.queue.shift()!;
    if (next.signal.aborted) {
      next.reject(new Error('Tool execution cancelled'));
      this.processQueue();
      return;
    }
    
    this.activeExecutions++;
    this.executionService.execute(next.tool, next.params, next.signal)
      .then(result => {
        next.resolve(result);
      })
      .catch(error => {
        next.reject(error);
      })
      .finally(() => {
        this.activeExecutions--;
        this.processQueue();
      });
  }
  
  private removeFromQueue(signal: AbortSignal): void {
    const index = this.queue.findIndex(item => item.signal === signal);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
  }
  
  getExecutionStats(): ToolExecutionStats {
    return this.executionService.getExecutionStats();
  }
  
  clearStats(): void {
    this.executionService.clearStats();
  }
}
```

## 9. Service Monitoring and Observability

### 9.1 Service Metrics

```typescript
export interface ServiceMetrics {
  recordExecutionTime(service: string, method: string, timeMs: number): void;
  recordSuccess(service: string, method: string): void;
  recordError(service: string, method: string, error: Error): void;
  getServiceMetrics(service: string): ServiceStats;
  getAllMetrics(): Record<string, ServiceStats>;
}

export interface ServiceStats {
  calls: number;
  errors: number;
  totalTimeMs: number;
  avgTimeMs: number;
  methods: Record<string, MethodStats>;
}

export interface MethodStats {
  calls: number;
  errors: number;
  totalTimeMs: number;
  avgTimeMs: number;
}

export class ServiceMetricsImpl implements ServiceMetrics {
  private metrics = new Map<string, {
    calls: number;
    errors: number;
    totalTimeMs: number;
    methods: Map<string, {
      calls: number;
      errors: number;
      totalTimeMs: number;
    }>;
  }>();
  
  recordExecutionTime(service: string, method: string, timeMs: number): void {
    this.ensureService(service);
    this.ensureMethod(service, method);
    
    const serviceMetrics = this.metrics.get(service)!;
    const methodMetrics = serviceMetrics.methods.get(method)!;
    
    serviceMetrics.calls++;
    serviceMetrics.totalTimeMs += timeMs;
    
    methodMetrics.calls++;
    methodMetrics.totalTimeMs += timeMs;
  }
  
  recordSuccess(service: string, method: string): void {
    this.ensureService(service);
    this.ensureMethod(service, method);
  }
  
  recordError(service: string, method: string, error: Error): void {
    this.ensureService(service);
    this.ensureMethod(service, method);
    
    const serviceMetrics = this.metrics.get(service)!;
    const methodMetrics = serviceMetrics.methods.get(method)!;
    
    serviceMetrics.errors++;
    methodMetrics.errors++;
  }
  
  getServiceMetrics(service: string): ServiceStats {
    if (!this.metrics.has(service)) {
      return {
        calls: 0,
        errors: 0,
        totalTimeMs: 0,
        avgTimeMs: 0,
        methods: {}
      };
    }
    
    const metrics = this.metrics.get(service)!;
    return {
      calls: metrics.calls,
      errors: metrics.errors,
      totalTimeMs: metrics.totalTimeMs,
      avgTimeMs: metrics.calls > 0 ? metrics.totalTimeMs / metrics.calls : 0,
      methods: Object.fromEntries(
        Array.from(metrics.methods.entries()).map(([name, stats]) => [
          name,
          {
            calls: stats.calls,
            errors: stats.errors,
            totalTimeMs: stats.totalTimeMs,
            avgTimeMs: stats.calls > 0 ? stats.totalTimeMs / stats.calls : 0
          }
        ])
      )
    };
  }
  
  getAllMetrics(): Record<string, ServiceStats> {
    const result: Record<string, ServiceStats> = {};
    for (const service of this.metrics.keys()) {
      result[service] = this.getServiceMetrics(service);
    }
    return result;
  }
  
  private ensureService(service: string): void {
    if (!this.metrics.has(service)) {
      this.metrics.set(service, {
        calls: 0,
        errors: 0,
        totalTimeMs: 0,
        methods: new Map()
      });
    }
  }
  
  private ensureMethod(service: string, method: string): void {
    const serviceMetrics = this.metrics.get(service)!;
    if (!serviceMetrics.methods.has(method)) {
      serviceMetrics.methods.set(method, {
        calls: 0,
        errors: 0,
        totalTimeMs: 0
      });
    }
  }
}
```

### 9.2 Service Logging

```typescript
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export interface ServiceLogger {
  debug(service: string, message: string, data?: unknown): void;
  info(service: string, message: string, data?: unknown): void;
  warn(service: string, message: string, data?: unknown): void;
  error(service: string, message: string, error?: Error, data?: unknown): void;
  setLevel(level: LogLevel): void;
}

export class ServiceLoggerImpl implements ServiceLogger {
  private level: LogLevel;
  
  constructor(level = LogLevel.INFO) {
    this.level = level;
  }
  
  debug(service: string, message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(`[${service}] ${message}`, data);
    }
  }
  
  info(service: string, message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(`[${service}] ${message}`, data);
    }
  }
  
  warn(service: string, message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(`[${service}] ${message}`, data);
    }
  }
  
  error(service: string, message: string, error?: Error, data?: unknown): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(`[${service}] ${message}`, error, data);
    }
  }
  
  setLevel(level: LogLevel): void {
    this.level = level;
  }
  
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.level);
    const targetLevelIndex = levels.indexOf(level);
    return targetLevelIndex >= currentLevelIndex;
  }
}
```

## 10. Conclusion

This service layer design provides a comprehensive approach to tool orchestration in the refactored VibeX architecture. By clearly defining service responsibilities, relationships, and interfaces, the design enables a clean separation of concerns, improved maintainability, and enhanced extensibility. 

The key benefits of this design include:

1. **Separation of Concerns:** Each service has a clear, focused responsibility
2. **Flexibility:** Services can be easily replaced or extended
3. **Testability:** Clean interfaces facilitate unit and integration testing
4. **Error Handling:** Comprehensive error handling and recovery strategies
5. **Performance:** Caching and parallel execution support
6. **Observability:** Built-in metrics and logging
7. **Extensibility:** Easy to add new tools and capabilities

The implementation of this service layer will form the foundation of the refactored VibeX tool system, providing a robust architecture that follows clean architecture principles and addresses the gaps identified in the architecture analysis.