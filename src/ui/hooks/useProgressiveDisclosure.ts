/**
 * Progressive Disclosure Hooks
 * 
 * Comprehensive system for managing progressive disclosure patterns,
 * collapsible sections, and context-aware content display for optimal UI density.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useTerminalSize } from './useTerminalSize.js';

/**
 * Disclosure state for a single section
 */
export interface DisclosureState {
  /** Whether the section is currently expanded */
  isExpanded: boolean;
  
  /** Whether the section is currently animating */
  isAnimating: boolean;
  
  /** Priority level (higher = more important) */
  priority: number;
  
  /** Whether the section should be expanded by default */
  defaultExpanded: boolean;
  
  /** Context-aware visibility based on screen size */
  contextuallyVisible: boolean;
  
  /** Last interaction timestamp */
  lastInteraction: number;
}

/**
 * Configuration for progressive disclosure rules
 */
export interface DisclosureRule {
  /** Unique identifier for the rule */
  id: string;
  
  /** Trigger conditions */
  triggers: {
    /** Screen size triggers */
    screenSize?: {
      minWidth?: number;
      maxWidth?: number;
      minHeight?: number;
      maxHeight?: number;
    };
    
    /** Content-based triggers */
    content?: {
      minLines?: number;
      maxLines?: number;
      hasKeywords?: string[];
      excludeKeywords?: string[];
    };
    
    /** Context-based triggers */
    context?: {
      userActivity?: 'active' | 'idle' | 'focused';
      timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
      sessionDuration?: number;
    };
  };
  
  /** Action to take when rule is triggered */
  action: 'expand' | 'collapse' | 'hide' | 'show' | 'prioritize';
  
  /** Priority level (0-100) */
  priority: number;
  
  /** Whether the rule is enabled */
  enabled: boolean;
}

/**
 * Configuration for progressive disclosure system
 */
export interface ProgressiveDisclosureConfig {
  /** Maximum number of sections to show expanded simultaneously */
  maxExpanded: number;
  
  /** Animation duration in milliseconds */
  animationDuration: number;
  
  /** Whether to remember user preferences */
  rememberPreferences: boolean;
  
  /** Auto-collapse sections after this many milliseconds of inactivity */
  autoCollapseAfter?: number;
  
  /** Rules for automatic disclosure management */
  rules: DisclosureRule[];
  
  /** Adaptive behavior based on screen size */
  adaptive: {
    /** On small screens, limit expanded sections */
    smallScreen: {
      maxExpanded: number;
      autoCollapse: boolean;
    };
    
    /** On large screens, allow more expanded sections */
    largeScreen: {
      maxExpanded: number;
      autoCollapse: boolean;
    };
  };
}

/**
 * Default progressive disclosure configuration
 */
export const DEFAULT_DISCLOSURE_CONFIG: ProgressiveDisclosureConfig = {
  maxExpanded: 3,
  animationDuration: 200,
  rememberPreferences: true,
  autoCollapseAfter: 30000, // 30 seconds
  rules: [
    {
      id: 'small-screen-collapse',
      triggers: {
        screenSize: { maxWidth: 80, maxHeight: 24 }
      },
      action: 'collapse',
      priority: 90,
      enabled: true,
    },
    {
      id: 'large-content-prioritize',
      triggers: {
        content: { minLines: 20 }
      },
      action: 'prioritize',
      priority: 70,
      enabled: true,
    },
    {
      id: 'idle-auto-collapse',
      triggers: {
        context: { userActivity: 'idle' }
      },
      action: 'collapse',
      priority: 50,
      enabled: true,
    },
  ],
  adaptive: {
    smallScreen: {
      maxExpanded: 1,
      autoCollapse: true,
    },
    largeScreen: {
      maxExpanded: 5,
      autoCollapse: false,
    },
  },
};

/**
 * Hook for managing a single collapsible section
 */
export function useCollapsible(
  id: string,
  initialExpanded: boolean = false,
  priority: number = 50
) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [isAnimating, setIsAnimating] = useState(false);
  const lastInteractionRef = useRef(Date.now());
  
  const toggle = useCallback(() => {
    setIsAnimating(true);
    setIsExpanded(prev => !prev);
    lastInteractionRef.current = Date.now();
    
    // Reset animation state after animation completes
    setTimeout(() => setIsAnimating(false), 200);
  }, []);
  
  const expand = useCallback(() => {
    if (!isExpanded) {
      setIsAnimating(true);
      setIsExpanded(true);
      lastInteractionRef.current = Date.now();
      setTimeout(() => setIsAnimating(false), 200);
    }
  }, [isExpanded]);
  
  const collapse = useCallback(() => {
    if (isExpanded) {
      setIsAnimating(true);
      setIsExpanded(false);
      lastInteractionRef.current = Date.now();
      setTimeout(() => setIsAnimating(false), 200);
    }
  }, [isExpanded]);
  
  return {
    id,
    isExpanded,
    isAnimating,
    priority,
    toggle,
    expand,
    collapse,
    lastInteraction: lastInteractionRef.current,
  };
}

/**
 * Hook for managing multiple collapsible sections with progressive disclosure
 */
export function useProgressiveDisclosure(
  sections: Array<{ id: string; priority: number; defaultExpanded?: boolean }>,
  config: ProgressiveDisclosureConfig = DEFAULT_DISCLOSURE_CONFIG
) {
  const { columns: width, rows: height } = useTerminalSize();
  const [sectionStates, setSectionStates] = useState<Map<string, DisclosureState>>(
    new Map(sections.map(section => [
      section.id,
      {
        isExpanded: section.defaultExpanded || false,
        isAnimating: false,
        priority: section.priority,
        defaultExpanded: section.defaultExpanded || false,
        contextuallyVisible: true,
        lastInteraction: Date.now(),
      }
    ]))
  );
  
  const [userActivity, setUserActivity] = useState<'active' | 'idle' | 'focused'>('active');
  const activityTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  
  // Determine screen size category
  const screenSize = useMemo(() => {
    const isSmall = width < 80 || height < 24;
    const isLarge = width > 120 || height > 40;
    return { isSmall, isLarge, width, height };
  }, [width, height]);
  
  // Apply adaptive configuration based on screen size
  const adaptiveConfig = useMemo(() => {
    if (screenSize.isSmall) {
      return {
        ...config,
        maxExpanded: config.adaptive.smallScreen.maxExpanded,
        autoCollapseAfter: config.adaptive.smallScreen.autoCollapse ? config.autoCollapseAfter : undefined,
      };
    }
    
    if (screenSize.isLarge) {
      return {
        ...config,
        maxExpanded: config.adaptive.largeScreen.maxExpanded,
        autoCollapseAfter: config.adaptive.largeScreen.autoCollapse ? config.autoCollapseAfter : undefined,
      };
    }
    
    return config;
  }, [config, screenSize]);
  
  // Evaluate disclosure rules
  const evaluateRules = useCallback((sectionId: string, content?: string[]) => {
    const applicableRules = adaptiveConfig.rules
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority);
    
    for (const rule of applicableRules) {
      let shouldApply = false;
      
      // Check screen size triggers
      if (rule.triggers.screenSize) {
        const { minWidth, maxWidth, minHeight, maxHeight } = rule.triggers.screenSize;
        shouldApply = (
          (!minWidth || width >= minWidth) &&
          (!maxWidth || width <= maxWidth) &&
          (!minHeight || height >= minHeight) &&
          (!maxHeight || height <= maxHeight)
        );
      }
      
      // Check content triggers
      if (rule.triggers.content && content) {
        const { minLines, maxLines, hasKeywords, excludeKeywords } = rule.triggers.content;
        const contentText = content.join(' ').toLowerCase();
        
        shouldApply = shouldApply && (
          (!minLines || content.length >= minLines) &&
          (!maxLines || content.length <= maxLines) &&
          (!hasKeywords || hasKeywords.some(keyword => contentText.includes(keyword.toLowerCase()))) &&
          (!excludeKeywords || !excludeKeywords.some(keyword => contentText.includes(keyword.toLowerCase())))
        );
      }
      
      // Check context triggers
      if (rule.triggers.context) {
        const { userActivity: activityTrigger } = rule.triggers.context;
        shouldApply = shouldApply && (!activityTrigger || userActivity === activityTrigger);
      }
      
      if (shouldApply) {
        return rule.action;
      }
    }
    
    return null;
  }, [adaptiveConfig.rules, width, height, userActivity]);
  
  // Toggle a specific section
  const toggleSection = useCallback((sectionId: string) => {
    setSectionStates(prev => {
      const newStates = new Map(prev);
      const currentState = newStates.get(sectionId);
      
      if (currentState) {
        const newState = {
          ...currentState,
          isExpanded: !currentState.isExpanded,
          isAnimating: true,
          lastInteraction: Date.now(),
        };
        
        newStates.set(sectionId, newState);
        
        // Reset animation state after animation completes
        setTimeout(() => {
          setSectionStates(states => {
            const updatedStates = new Map(states);
            const state = updatedStates.get(sectionId);
            if (state) {
              updatedStates.set(sectionId, { ...state, isAnimating: false });
            }
            return updatedStates;
          });
        }, adaptiveConfig.animationDuration);
      }
      
      return newStates;
    });
    
    // Reset user activity
    setUserActivity('active');
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }
    activityTimeoutRef.current = setTimeout(() => {
      setUserActivity('idle');
    }, 5000);
  }, [adaptiveConfig.animationDuration]);
  
  // Expand a specific section
  const expandSection = useCallback((sectionId: string) => {
    setSectionStates(prev => {
      const newStates = new Map(prev);
      const currentState = newStates.get(sectionId);
      
      if (currentState && !currentState.isExpanded) {
        newStates.set(sectionId, {
          ...currentState,
          isExpanded: true,
          isAnimating: true,
          lastInteraction: Date.now(),
        });
        
        // Reset animation state
        setTimeout(() => {
          setSectionStates(states => {
            const updatedStates = new Map(states);
            const state = updatedStates.get(sectionId);
            if (state) {
              updatedStates.set(sectionId, { ...state, isAnimating: false });
            }
            return updatedStates;
          });
        }, adaptiveConfig.animationDuration);
      }
      
      return newStates;
    });
  }, [adaptiveConfig.animationDuration]);
  
  // Collapse a specific section
  const collapseSection = useCallback((sectionId: string) => {
    setSectionStates(prev => {
      const newStates = new Map(prev);
      const currentState = newStates.get(sectionId);
      
      if (currentState && currentState.isExpanded) {
        newStates.set(sectionId, {
          ...currentState,
          isExpanded: false,
          isAnimating: true,
          lastInteraction: Date.now(),
        });
        
        // Reset animation state
        setTimeout(() => {
          setSectionStates(states => {
            const updatedStates = new Map(states);
            const state = updatedStates.get(sectionId);
            if (state) {
              updatedStates.set(sectionId, { ...state, isAnimating: false });
            }
            return updatedStates;
          });
        }, adaptiveConfig.animationDuration);
      }
      
      return newStates;
    });
  }, [adaptiveConfig.animationDuration]);
  
  // Collapse all sections
  const collapseAll = useCallback(() => {
    setSectionStates(prev => {
      const newStates = new Map(prev);
      for (const [sectionId, state] of newStates) {
        if (state.isExpanded) {
          newStates.set(sectionId, {
            ...state,
            isExpanded: false,
            isAnimating: true,
            lastInteraction: Date.now(),
          });
        }
      }
      return newStates;
    });
    
    // Reset all animation states
    setTimeout(() => {
      setSectionStates(prev => {
        const newStates = new Map(prev);
        for (const [sectionId, state] of newStates) {
          newStates.set(sectionId, { ...state, isAnimating: false });
        }
        return newStates;
      });
    }, adaptiveConfig.animationDuration);
  }, [adaptiveConfig.animationDuration]);
  
  // Apply progressive disclosure rules
  const applyRules = useCallback((sectionId: string, content?: string[]) => {
    const action = evaluateRules(sectionId, content);
    
    switch (action) {
      case 'expand':
        expandSection(sectionId);
        break;
      case 'collapse':
        collapseSection(sectionId);
        break;
      case 'prioritize':
        setSectionStates(prev => {
          const newStates = new Map(prev);
          const currentState = newStates.get(sectionId);
          if (currentState) {
            newStates.set(sectionId, {
              ...currentState,
              priority: Math.min(100, currentState.priority + 10),
            });
          }
          return newStates;
        });
        break;
    }
  }, [evaluateRules, expandSection, collapseSection]);
  
  // Enforce maximum expanded sections
  useEffect(() => {
    const expandedSections = Array.from(sectionStates.entries())
      .filter(([, state]) => state.isExpanded)
      .sort((a, b) => b[1].priority - a[1].priority || b[1].lastInteraction - a[1].lastInteraction);
    
    if (expandedSections.length > adaptiveConfig.maxExpanded) {
      const sectionsToCollapse = expandedSections.slice(adaptiveConfig.maxExpanded);
      
      setSectionStates(prev => {
        const newStates = new Map(prev);
        for (const [sectionId] of sectionsToCollapse) {
          const state = newStates.get(sectionId);
          if (state) {
            newStates.set(sectionId, { ...state, isExpanded: false });
          }
        }
        return newStates;
      });
    }
  }, [sectionStates, adaptiveConfig.maxExpanded]);
  
  // Auto-collapse after inactivity
  useEffect(() => {
    if (adaptiveConfig.autoCollapseAfter && userActivity === 'idle') {
      const timer = setTimeout(() => {
        collapseAll();
      }, adaptiveConfig.autoCollapseAfter);
      
      return () => clearTimeout(timer);
    }
  }, [userActivity, adaptiveConfig.autoCollapseAfter, collapseAll]);
  
  // Get state for a specific section
  const getSectionState = useCallback((sectionId: string) => {
    return sectionStates.get(sectionId) || {
      isExpanded: false,
      isAnimating: false,
      priority: 50,
      defaultExpanded: false,
      contextuallyVisible: true,
      lastInteraction: 0,
    };
  }, [sectionStates]);
  
  // Get all expanded sections
  const getExpandedSections = useCallback(() => {
    return Array.from(sectionStates.entries())
      .filter(([, state]) => state.isExpanded)
      .map(([sectionId]) => sectionId);
  }, [sectionStates]);
  
  // Get sections sorted by priority
  const getSectionsByPriority = useCallback(() => {
    return Array.from(sectionStates.entries())
      .sort((a, b) => b[1].priority - a[1].priority)
      .map(([sectionId, state]) => ({ sectionId, ...state }));
  }, [sectionStates]);
  
  return {
    // State access
    getSectionState,
    getExpandedSections,
    getSectionsByPriority,
    
    // Actions
    toggleSection,
    expandSection,
    collapseSection,
    collapseAll,
    applyRules,
    
    // Configuration
    config: adaptiveConfig,
    screenSize,
    userActivity,
    
    // Statistics
    stats: {
      totalSections: sectionStates.size,
      expandedCount: Array.from(sectionStates.values()).filter(s => s.isExpanded).length,
      animatingCount: Array.from(sectionStates.values()).filter(s => s.isAnimating).length,
    },
  };
}

/**
 * Hook for context-aware content display
 */
export function useContextualDisplay(
  content: string[],
  maxLines: number = 10,
  priority: number = 50
) {
  const { columns: width, rows: height } = useTerminalSize();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Calculate how much content to show based on context
  const displayLines = useMemo(() => {
    if (isExpanded) {
      return content;
    }
    
    // Adaptive truncation based on screen size
    let adaptiveMaxLines = maxLines;
    
    if (width < 80 || height < 24) {
      adaptiveMaxLines = Math.max(3, Math.floor(maxLines * 0.6));
    } else if (width > 120 || height > 40) {
      adaptiveMaxLines = Math.floor(maxLines * 1.4);
    }
    
    return content.slice(0, adaptiveMaxLines);
  }, [content, isExpanded, maxLines, width, height]);
  
  const hasMore = content.length > displayLines.length;
  
  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);
  
  return {
    displayLines,
    hasMore,
    isExpanded,
    toggleExpanded,
    totalLines: content.length,
    visibleLines: displayLines.length,
    hiddenLines: content.length - displayLines.length,
  };
}

/**
 * Hook for smart truncation with progressive disclosure
 */
export function useSmartTruncation(
  text: string,
  maxLength: number = 100,
  strategy: 'middle' | 'end' | 'smart' = 'smart'
) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const truncatedText = useMemo(() => {
    if (isExpanded || text.length <= maxLength) {
      return text;
    }
    
    switch (strategy) {
      case 'middle':
        const start = Math.floor((maxLength - 3) / 2);
        const end = Math.ceil((maxLength - 3) / 2);
        return text.slice(0, start) + '...' + text.slice(-end);
      
      case 'end':
        return text.slice(0, maxLength - 3) + '...';
      
      case 'smart':
        // Try to break at word boundaries
        if (text.length <= maxLength) return text;
        
        const truncated = text.slice(0, maxLength - 3);
        const lastSpace = truncated.lastIndexOf(' ');
        
        if (lastSpace > maxLength * 0.7) {
          return truncated.slice(0, lastSpace) + '...';
        }
        
        return truncated + '...';
      
      default:
        return text;
    }
  }, [text, maxLength, strategy, isExpanded]);
  
  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);
  
  return {
    text: truncatedText,
    isExpanded,
    isTruncated: text.length > maxLength,
    toggleExpanded,
    originalLength: text.length,
    displayLength: truncatedText.length,
  };
} 