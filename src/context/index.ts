/**
 * Context Module Exports
 * 
 * This file exports the context system functionality.
 */

// Primary Context System
export {
  ContextSystem,
  createContextSystem,
  loadHierarchicalContext,
  type ContextConfig,
  type ContextMergeResult,
  type ContextEntry,
  ContextFileType,
  ContextInheritanceStrategy,
  ContextEvent
} from './context-system-refactored.js';

// Context Inheritance Engine
export {
  ContextInheritanceEngine,
  createContextInheritanceEngine,
  type ContextInheritanceConfig,
  type ContextInheritanceResult,
  type ContextInheritanceRule,
  type ContextInheritanceCondition,
  type ContextTransform,
  type ContextInheritanceContext,
  ContextInheritanceScope,
  ContextInheritanceStrategy as InheritanceStrategy,
  ContextInheritanceEvent,
  DEFAULT_INHERITANCE_RULES,
  DEFAULT_GLOBAL_TRANSFORMS
} from './context-inheritance-engine.js'; 