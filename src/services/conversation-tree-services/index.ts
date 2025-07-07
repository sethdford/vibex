/**
 * Conversation Tree Services - Clean Architecture Index
 * 
 * Centralized exports for all conversation tree services
 * Following Gemini CLI's clean service organization patterns
 */

// Core Services
export {
  ConversationTreeLifecycleService,
  createConversationTreeLifecycleService,
  type TreeLifecycleConfig,
  type TreeLifecycleResult
} from '../conversation-tree-lifecycle.js';

export {
  ConversationTreeNavigationService,
  createConversationTreeNavigationService,
  type NavigationConfig,
  type NavigationResult,
  type NavigationState
} from '../conversation-tree-navigation.js';

export {
  ConversationTreeOrchestrator,
  createConversationTreeOrchestrator,
  type ConversationTreeOrchestratorConfig,
  type OrchestratorResult,
  type TreeSummary
} from '../conversation-tree-orchestrator.js';

import { ConversationTreeLifecycleService, createConversationTreeLifecycleService, type TreeLifecycleConfig, type TreeLifecycleResult } from '../conversation-tree-lifecycle.js';
import { ConversationTreeNavigationService, createConversationTreeNavigationService, type NavigationConfig, type NavigationResult, type NavigationState } from '../conversation-tree-navigation.js';
import { ConversationTreeOrchestrator, createConversationTreeOrchestrator, type ConversationTreeOrchestratorConfig, type OrchestratorResult, type TreeSummary } from '../conversation-tree-orchestrator.js';

// Factory function for complete service setup
export function createConversationTreeServices(config: {
  lifecycle?: Partial<TreeLifecycleConfig>;
  navigation?: Partial<NavigationConfig>;
  orchestrator?: Partial<ConversationTreeOrchestratorConfig>;
} = {}) {
  // Create individual services
  const lifecycleService = createConversationTreeLifecycleService(config.lifecycle);
  const navigationService = createConversationTreeNavigationService(config.navigation);
  
  // Create orchestrator with services
  const orchestrator = createConversationTreeOrchestrator(
    lifecycleService,
    navigationService,
    config.orchestrator
  );

  return {
    lifecycleService,
    navigationService,
    orchestrator
  };
} 