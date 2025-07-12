# Tool System Implementation Plan

This document outlines the detailed implementation plan for refactoring the VibeX tool system to follow clean architecture principles and address the gaps identified in the architecture analysis.

## 1. Core Domain Implementation

### 1.1 Tool Interface Definitions

**Location:** `src/core/tools/interfaces.ts`

```typescript
export interface ToolResult {
  // Content meant for LLM history
  llmContent: string | Array<any>;
  
  // User-friendly display format
  displayContent?: string | FileDiff;
}

export interface FileDiff {
  fileName: string;
  fileDiff: string;
}

export enum ToolConfirmationOutcome {
  ProceedOnce = 'proceed_once',
  ProceedAlways = 'proceed_always',
  ModifyWithEditor = 'modify_with_editor',
  Cancel = 'cancel'
}

export interface ToolConfirmationDetails {
  type: 'edit' | 'exec' | 'info';
  title: string;
  description: string;
  onConfirm: (outcome: ToolConfirmationOutcome) => Promise<void>;
  // Type-specific details...
}

export interface Tool<TParams = unknown> {
  // Basic properties
  name: string;
  displayName: string;
  description: string;
  schema: any;
  isOutputMarkdown: boolean;
  canUpdateOutput: boolean;

  // Methods
  validateParams(params: TParams): string | null;
  getDescription(params: TParams): string;
  shouldConfirmExecute(params: TParams): Promise<ToolConfirmationDetails | false>;
  execute(params: TParams, signal: AbortSignal, 
    updateOutput?: (output: string) => void): Promise<ToolResult>;
}
```

### 1.2 Tool Lifecycle States

**Location:** `src/core/tools/lifecycle.ts`

```typescript
export type ToolCallId = string;

export interface ToolCallRequest {
  callId: ToolCallId;
  name: string;
  params: Record<string, unknown>;
}

export interface ToolCallResponse {
  callId: ToolCallId;
  result?: ToolResult;
  error?: Error;
}

export type ToolCallState = 
  | 'validating'
  | 'scheduled'
  | 'awaiting_approval'
  | 'executing'
  | 'success'
  | 'error'
  | 'cancelled';

export interface ToolCall {
  status: ToolCallState;
  request: ToolCallRequest;
  tool?: Tool;
  response?: ToolCallResponse;
  confirmationDetails?: ToolConfirmationDetails;
  liveOutput?: string;
  startTime?: number;
  durationMs?: number;
  outcome?: ToolConfirmationOutcome;
}
```

### 1.3 Base Tool Implementation

**Location:** `src/core/tools/base-tool.ts`

```typescript
export abstract class BaseTool<TParams = unknown> implements Tool<TParams> {
  constructor(
    readonly name: string,
    readonly displayName: string,
    readonly description: string,
    readonly parameterSchema: Record<string, unknown>,
    readonly isOutputMarkdown: boolean = true,
    readonly canUpdateOutput: boolean = false,
  ) {}

  get schema(): any {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameterSchema
    };
  }

  // Default implementation of validation
  validateParams(params: TParams): string | null {
    // Default validation logic
    return null;
  }

  // Default implementation for description
  getDescription(params: TParams): string {
    return JSON.stringify(params);
  }

  // Default implementation - no confirmation needed
  async shouldConfirmExecute(params: TParams): Promise<ToolConfirmationDetails | false> {
    return false;
  }

  // Abstract method to be implemented by concrete tools
  abstract execute(
    params: TParams,
    signal: AbortSignal,
    updateOutput?: (output: string) => void
  ): Promise<ToolResult>;
}
```

## 2. Application Layer Implementation

### 2.1 Tool Registry Service

**Location:** `src/services/tool-registry-service.ts`

```typescript
export class ToolRegistryService {
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

### 2.2 Tool Scheduler Service

**Location:** `src/services/tool-scheduler-service.ts`

```typescript
export interface ToolSchedulerCallbacks {
  onOutputUpdate?: (callId: string, output: string) => void;
  onToolCallsUpdate?: (toolCalls: ToolCall[]) => void;
  onAllToolCallsComplete?: (completedCalls: ToolCall[]) => void;
}

export class ToolSchedulerService {
  private toolCalls: ToolCall[] = [];
  private callbacks: ToolSchedulerCallbacks;
  private registry: ToolRegistryService;

  constructor(
    registry: ToolRegistryService,
    callbacks: ToolSchedulerCallbacks = {}
  ) {
    this.registry = registry;
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
          
          this.updateToolCallStatus(request.callId, 'awaiting_approval', { confirmationDetails: wrappedDetails });
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

  async handleConfirmation(
    callId: string,
    originalOnConfirm: (outcome: ToolConfirmationOutcome) => Promise<void>,
    outcome: ToolConfirmationOutcome,
    signal: AbortSignal
  ): Promise<void> {
    await originalOnConfirm(outcome);
    
    this.updateToolCall(callId, { outcome });
    
    if (outcome === ToolConfirmationOutcome.Cancel) {
      this.updateToolCallStatus(callId, 'cancelled', {
        response: {
          callId,
          error: new Error('User cancelled execution')
        }
      });
    } else {
      this.updateToolCallStatus(callId, 'scheduled');
    }
    
    this.executeScheduledCalls(signal);
  }

  private executeScheduledCalls(signal: AbortSignal): void {
    const scheduledCalls = this.toolCalls.filter(call => call.status === 'scheduled');
    
    for (const call of scheduledCalls) {
      if (!call.tool) continue;
      
      const { request, tool } = call;
      this.updateToolCallStatus(request.callId, 'executing');
      
      const updateCallback = tool.canUpdateOutput && this.callbacks.onOutputUpdate 
        ? (output: string) => {
            this.callbacks.onOutputUpdate?.(request.callId, output);
            this.updateToolCall(request.callId, { liveOutput: output });
          }
        : undefined;
      
      // Execute the tool
      tool.execute(request.params, signal, updateCallback)
        .then(result => {
          if (signal.aborted) {
            this.updateToolCallStatus(request.callId, 'cancelled', {
              response: { callId: request.callId, error: new Error('Execution cancelled') }
            });
            return;
          }
          
          this.updateToolCallStatus(request.callId, 'success', {
            response: { callId: request.callId, result }
          });
        })
        .catch(error => {
          this.updateToolCallStatus(request.callId, 'error', {
            response: { 
              callId: request.callId, 
              error: error instanceof Error ? error : new Error(String(error)) 
            }
          });
        });
    }
  }

  private updateToolCallStatus(
    callId: string, 
    status: ToolCallState,
    additionalProps: Partial<ToolCall> = {}
  ): void {
    this.updateToolCall(callId, { status, ...additionalProps });
  }

  private updateToolCall(callId: string, updates: Partial<ToolCall>): void {
    this.toolCalls = this.toolCalls.map(call => {
      if (call.request.callId !== callId) return call;
      
      const updatedCall = { ...call, ...updates };
      
      if (updates.status && ['success', 'error', 'cancelled'].includes(updates.status)) {
        updatedCall.durationMs = call.startTime ? Date.now() - call.startTime : undefined;
      }
      
      return updatedCall;
    });
    
    this.notifyToolCallsUpdate();
    this.checkCompletion();
  }

  private notifyToolCallsUpdate(): void {
    if (this.callbacks.onToolCallsUpdate) {
      this.callbacks.onToolCallsUpdate([...this.toolCalls]);
    }
  }

  private checkCompletion(): void {
    const allComplete = this.toolCalls.every(call => 
      ['success', 'error', 'cancelled'].includes(call.status)
    );
    
    if (this.toolCalls.length > 0 && allComplete) {
      const completedCalls = [...this.toolCalls];
      this.toolCalls = [];
      
      if (this.callbacks.onAllToolCallsComplete) {
        this.callbacks.onAllToolCallsComplete(completedCalls);
      }
      
      this.notifyToolCallsUpdate();
    }
  }
}
```

### 2.3 Parameter Validation Service

**Location:** `src/services/validation-service.ts`

```typescript
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export class ValidationService {
  private validator: any; // Will use Ajv or similar

  constructor() {
    // Initialize validator
    this.validator = new AjvValidatorAdapter();
  }

  validateAgainstSchema(
    value: unknown,
    schema: Record<string, unknown>
  ): ValidationResult {
    try {
      const result = this.validator.validate(schema, value);
      if (result.valid) {
        return { valid: true };
      } else {
        return {
          valid: false,
          errors: result.errors
        };
      }
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }
}
```

## 3. Tool Implementation Examples

### 3.1 Read File Tool

**Location:** `src/core/tools/file/read-file-tool.ts`

```typescript
export interface ReadFileParams {
  file_path: string;
  offset?: number;
  limit?: number;
}

export class ReadFileTool extends BaseTool<ReadFileParams> {
  constructor() {
    super(
      'read_file',
      'Read File',
      'Reads the content of a file from the filesystem',
      {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'The path to the file to read'
          },
          offset: {
            type: 'number',
            description: 'Line number to start reading from (optional)'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of lines to read (optional)'
          }
        },
        required: ['file_path']
      },
      true, // isOutputMarkdown
      false // canUpdateOutput
    );
  }

  validateParams(params: ReadFileParams): string | null {
    if (!params.file_path) {
      return 'File path is required';
    }
    
    // Additional validation logic
    return null;
  }

  getDescription(params: ReadFileParams): string {
    return `Read file: ${params.file_path}`;
  }

  async shouldConfirmExecute(params: ReadFileParams): Promise<ToolConfirmationDetails | false> {
    // No confirmation needed for read operations
    return false;
  }

  async execute(
    params: ReadFileParams,
    signal: AbortSignal
  ): Promise<ToolResult> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const resolvedPath = path.resolve(params.file_path);
      
      // Check if file exists
      try {
        const stats = await fs.stat(resolvedPath);
        if (!stats.isFile()) {
          throw new Error(`Path ${params.file_path} is not a file`);
        }
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new Error(`File ${params.file_path} does not exist`);
        }
        throw error;
      }
      
      // Read file content
      const content = await fs.readFile(resolvedPath, 'utf-8');
      
      // Apply offset and limit if provided
      let lines = content.split('\n');
      if (params.offset !== undefined && params.offset > 0) {
        lines = lines.slice(params.offset);
      }
      if (params.limit !== undefined && params.limit > 0) {
        lines = lines.slice(0, params.limit);
      }
      
      const formattedContent = lines
        .map((line, idx) => {
          const lineNum = (params.offset || 0) + idx + 1;
          return `${lineNum.toString().padStart(5)}→${line}`;
        })
        .join('\n');
      
      return {
        llmContent: formattedContent,
        displayContent: formattedContent
      };
    } catch (error) {
      throw new Error(`Failed to read file ${params.file_path}: ${error.message}`);
    }
  }
}
```

### 3.2 Write File Tool

**Location:** `src/core/tools/file/write-file-tool.ts`

```typescript
export interface WriteFileParams {
  file_path: string;
  content: string;
}

export class WriteFileTool extends BaseTool<WriteFileParams> {
  constructor() {
    super(
      'write_file',
      'Write File',
      'Writes content to a file, creating the file if it does not exist',
      {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'The path to the file to write'
          },
          content: {
            type: 'string',
            description: 'The content to write to the file'
          }
        },
        required: ['file_path', 'content']
      },
      true, // isOutputMarkdown
      false // canUpdateOutput
    );
  }

  validateParams(params: WriteFileParams): string | null {
    if (!params.file_path) {
      return 'File path is required';
    }
    if (params.content === undefined) {
      return 'Content is required';
    }
    return null;
  }

  getDescription(params: WriteFileParams): string {
    return `Write to file: ${params.file_path}`;
  }

  async shouldConfirmExecute(params: WriteFileParams): Promise<ToolConfirmationDetails | false> {
    const fs = await import('fs/promises');
    const path = await import('path');
    const resolvedPath = path.resolve(params.file_path);
    
    let existingContent = '';
    let fileDiff = '';
    let fileExists = false;
    
    try {
      existingContent = await fs.readFile(resolvedPath, 'utf-8');
      fileExists = true;
      
      // Generate diff
      const diff = await import('diff');
      fileDiff = diff.createPatch(
        params.file_path,
        existingContent,
        params.content,
        'Existing',
        'New'
      );
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist, so we'll create it
      fileDiff = `File will be created: ${params.file_path}\n\n` + 
                 params.content.split('\n').map((line, i) => `+${line}`).join('\n');
    }
    
    return {
      type: 'edit',
      title: fileExists ? `Modify ${params.file_path}` : `Create ${params.file_path}`,
      description: fileExists ? 'This operation will modify an existing file' : 'This operation will create a new file',
      onConfirm: async () => {/* Will be replaced by the scheduler */},
      fileName: params.file_path,
      fileDiff
    };
  }

  async execute(
    params: WriteFileParams,
    signal: AbortSignal
  ): Promise<ToolResult> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const resolvedPath = path.resolve(params.file_path);
      
      // Ensure directory exists
      const dirPath = path.dirname(resolvedPath);
      await fs.mkdir(dirPath, { recursive: true });
      
      // Write the file
      await fs.writeFile(resolvedPath, params.content, 'utf-8');
      
      return {
        llmContent: `File ${params.file_path} written successfully.`,
        displayContent: `Successfully wrote ${params.content.length} characters to ${params.file_path}`
      };
    } catch (error) {
      throw new Error(`Failed to write file ${params.file_path}: ${error.message}`);
    }
  }
}
```

## 4. Integration

### 4.1 Tool Factory

**Location:** `src/services/tool-factory-service.ts`

```typescript
export class ToolFactoryService {
  private registry: ToolRegistryService;
  
  constructor(registry: ToolRegistryService) {
    this.registry = registry;
  }

  registerBuiltInTools(): void {
    // Register file tools
    this.registry.registerTool(new ReadFileTool(), 'file');
    this.registry.registerTool(new WriteFileTool(), 'file');
    
    // Register other tool categories
    // ...
  }
}
```

### 4.2 Tool Service Orchestrator

**Location:** `src/services/tool-orchestration-service.ts`

```typescript
export class ToolOrchestrationService {
  private registry: ToolRegistryService;
  private scheduler: ToolSchedulerService;
  private factory: ToolFactoryService;
  
  constructor(config: any) {
    this.registry = new ToolRegistryService();
    this.scheduler = new ToolSchedulerService(this.registry, {
      onToolCallsUpdate: (calls) => this.handleToolCallsUpdate(calls),
      onAllToolCallsComplete: (calls) => this.handleToolCallsComplete(calls)
    });
    this.factory = new ToolFactoryService(this.registry);
    
    // Initialize tools
    this.factory.registerBuiltInTools();
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
  
  private handleToolCallsUpdate(calls: ToolCall[]): void {
    // Emit events or update UI
  }
  
  private handleToolCallsComplete(calls: ToolCall[]): void {
    // Process completed calls
  }
}
```

### 4.3 Legacy Adapter

**Location:** `src/services/legacy-tool-adapter.ts`

```typescript
export class LegacyToolAdapter {
  private orchestrator: ToolOrchestrationService;
  
  constructor(orchestrator: ToolOrchestrationService) {
    this.orchestrator = orchestrator;
  }
  
  // Adapter method for old tool registry execute
  async executeTool(toolUse: any, feedbackCallbacks?: any): Promise<any> {
    // Create an AbortController for cancellation support
    const controller = new AbortController();
    
    // Convert old format to new format
    const request: ToolCallRequest = {
      callId: toolUse.id,
      name: toolUse.name,
      params: toolUse.input
    };
    
    // Track the tool call for result extraction
    let resultPromise = new Promise<any>((resolve, reject) => {
      // Listen for completion event
      const handleComplete = (calls: ToolCall[]) => {
        const call = calls.find(c => c.request.callId === toolUse.id);
        if (!call) return;
        
        if (call.status === 'success' && call.response?.result) {
          resolve({
            tool_use_id: toolUse.id,
            content: call.response.result.llmContent,
            is_error: false
          });
        } else if (call.status === 'error' || call.status === 'cancelled') {
          resolve({
            tool_use_id: toolUse.id,
            content: call.response?.error?.message || 'Unknown error',
            is_error: true
          });
        }
      };
      
      // Setup temporary event listener
      // This would be implemented with an event emitter in the real service
    });
    
    // Execute the tool
    await this.orchestrator.executeTools(request, controller.signal);
    
    // Return the result
    return resultPromise;
  }
}
```

## 5. Migration Steps

1. **Setup Core Domain**
   - Implement tool interfaces
   - Create lifecycle model
   - Define base tool class

2. **Setup Application Services**
   - Implement Tool Registry Service
   - Create Tool Scheduler Service
   - Develop Validation Service

3. **Implement Core Tools**
   - Convert existing tools to new format
   - Add proper validation and confirmation

4. **Create Integration Layer**
   - Implement Tool Factory Service
   - Build Tool Orchestration Service
   - Create Legacy Adapter

5. **UI Integration**
   - Update UI components to use new services
   - Implement confirmation dialogs
   - Add progress indicators

6. **Testing**
   - Unit tests for core domain
   - Integration tests for services
   - End-to-end tests for tool execution

7. **Documentation**
   - Create tool development guide
   - Document migration process
   - Update user documentation

## 6. Timeline and Resources

### Phase 1: Core Domain (Week 1)
- Implement interfaces and base classes
- Define tool lifecycle model
- Create validation framework

### Phase 2: Application Layer (Week 2)
- Implement Registry and Scheduler services
- Create validation service
- Add checkpoint support

### Phase 3: Tool Migration (Weeks 3-4)
- Convert file tools
- Convert shell tools
- Convert web tools
- Add confirmation dialogs

### Phase 4: Integration and Testing (Week 5)
- Create orchestration service
- Implement legacy adapter
- Write unit and integration tests

### Phase 5: UI Integration and Finalization (Week 6)
- Update UI components
- Implement progress indicators
- Documentation
- Final testing and bug fixing

## 7. Conclusion

This implementation plan provides a comprehensive roadmap for refactoring the VibeX tool system to follow clean architecture principles and address the gaps identified in the architecture analysis. By following this plan, VibeX will achieve a more maintainable, extensible, and user-friendly tool system that aligns with the best practices exemplified in the Gemini CLI architecture.