/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { ToolConfirmationDetails, ToolConfirmationOutcome } from '../tool-interfaces';
import { ConfirmationService } from '../tool-services';
import { EventBus } from '../tool-events';

/**
 * Configuration for the Confirmation Service
 */
export interface ConfirmationConfig {
  /**
   * Whether to require confirmation for dangerous tools
   */
  requireForDangerous?: boolean;
  
  /**
   * List of tools that are always trusted
   */
  trustedTools?: string[];
  
  /**
   * Storage key for trusted tools
   */
  trustedToolsStorageKey?: string;
}

/**
 * UI Display Provider Interface
 * This would be implemented by the UI layer
 */
export interface ConfirmationUiProvider {
  /**
   * Display a confirmation prompt to the user
   */
  showConfirmation(details: ToolConfirmationDetails): Promise<ToolConfirmationOutcome>;
}

/**
 * Implementation of the ConfirmationService
 */
export class ConfirmationServiceImpl implements ConfirmationService {
  /**
   * Set of trusted tools (no confirmation needed)
   * Format: "namespace__name" or just "name" for default namespace
   */
  private trustedTools = new Set<string>();
  
  /**
   * Configuration
   */
  private config: ConfirmationConfig;
  
  /**
   * UI provider for displaying confirmations
   */
  private uiProvider?: ConfirmationUiProvider;
  
  /**
   * Event bus
   */
  private eventBus?: EventBus;

  /**
   * Constructor
   */
  constructor(
    config: ConfirmationConfig = {},
    uiProvider?: ConfirmationUiProvider,
    eventBus?: EventBus
  ) {
    this.config = config;
    this.uiProvider = uiProvider;
    this.eventBus = eventBus;
    
    // Initialize trusted tools from config
    if (config.trustedTools) {
      config.trustedTools.forEach(tool => this.trustedTools.add(tool));
    }
    
    // Load trusted tools from storage if available
    this.loadTrustedTools();
  }

  /**
   * Request confirmation from the user
   */
  async requestConfirmation(details: ToolConfirmationDetails): Promise<ToolConfirmationOutcome> {
    // Extract tool name from the details
    const toolName = details.params?.['tool'] as string || 'unknown';
    
    // If the tool is trusted, automatically proceed
    if (this.isTrusted(toolName)) {
      return ToolConfirmationOutcome.ProceedOnce;
    }
    
    // If we don't have a UI provider, we can't ask for confirmation
    if (!this.uiProvider) {
      // For safety, if this is a "danger" type, we should decline
      if (details.type === 'danger' && this.config.requireForDangerous !== false) {
        throw new Error('Cannot execute dangerous tool without confirmation');
      }
      
      // Otherwise proceed once
      return ToolConfirmationOutcome.ProceedOnce;
    }
    
    // Show confirmation to the user via the UI provider
    return this.uiProvider.showConfirmation(details);
  }

  /**
   * Check if a tool is trusted
   */
  isTrusted(toolName: string, namespace?: string): boolean {
    const fullName = namespace ? `${namespace}__${toolName}` : toolName;
    return this.trustedTools.has(fullName) || this.trustedTools.has(toolName);
  }

  /**
   * Mark a tool as trusted
   */
  markAsTrusted(toolName: string, namespace?: string): void {
    const fullName = namespace ? `${namespace}__${toolName}` : toolName;
    this.trustedTools.add(fullName);
    
    // Save trusted tools to storage
    this.saveTrustedTools();
  }
  
  /**
   * Remove a tool from the trusted list
   */
  removeTrusted(toolName: string, namespace?: string): void {
    const fullName = namespace ? `${namespace}__${toolName}` : toolName;
    this.trustedTools.delete(fullName);
    this.trustedTools.delete(toolName);
    
    // Save trusted tools to storage
    this.saveTrustedTools();
  }
  
  /**
   * Get all trusted tools
   */
  getTrustedTools(): string[] {
    return Array.from(this.trustedTools);
  }
  
  /**
   * Clear all trusted tools
   */
  clearTrustedTools(): void {
    this.trustedTools.clear();
    this.saveTrustedTools();
  }
  
  /**
   * Save trusted tools to storage
   * @private
   */
  private saveTrustedTools(): void {
    const storageKey = this.config.trustedToolsStorageKey || 'vibex_trusted_tools';
    
    try {
      // Use localStorage if available (for browser environments)
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(storageKey, JSON.stringify(Array.from(this.trustedTools)));
      }
      
      // In Node.js environments, we could write to a config file
      // This would need to be implemented based on the actual storage mechanism
    } catch (error) {
      // Ignore storage errors
      console.warn('Failed to save trusted tools:', error);
    }
  }
  
  /**
   * Load trusted tools from storage
   * @private
   */
  private loadTrustedTools(): void {
    const storageKey = this.config.trustedToolsStorageKey || 'vibex_trusted_tools';
    
    try {
      // Use localStorage if available (for browser environments)
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const tools = JSON.parse(stored);
          if (Array.isArray(tools)) {
            tools.forEach(tool => this.trustedTools.add(tool));
          }
        }
      }
      
      // In Node.js environments, we could read from a config file
      // This would need to be implemented based on the actual storage mechanism
    } catch (error) {
      // Ignore storage errors
      console.warn('Failed to load trusted tools:', error);
    }
  }
}

/**
 * Factory function to create a ConfirmationService
 */
export function createConfirmationService(
  config: ConfirmationConfig = {},
  uiProvider?: ConfirmationUiProvider,
  eventBus?: EventBus
): ConfirmationService {
  return new ConfirmationServiceImpl(config, uiProvider, eventBus);
}