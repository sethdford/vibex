/**
 * Module Patch System
 * 
 * This module provides runtime patching for dynamic requires of certain modules
 * that don't work well in ESM environments, particularly 'punycode'.
 * 
 * It sets up global hooks to intercept and handle these requires.
 */

import * as punycodeWrapper from './punycode-wrapper.js';

/**
 * Initialize the module patching system
 */
export function initModulePatching() {
  // Save a reference to our punycode wrapper in the global scope
  if (typeof global !== 'undefined') {
    global.__vibex_punycode = punycodeWrapper;
    
    // If we're in a CommonJS environment, add our wrapper to require.cache
    if (typeof require !== 'undefined' && require.cache) {
      const modulePath = require.resolve('punycode');
      if (!require.cache[modulePath]) {
        require.cache[modulePath] = {
          id: modulePath,
          filename: modulePath,
          loaded: true,
          exports: punycodeWrapper
        };
      }
    }
    
    console.debug('Module patching system initialized');
  } else {
    console.warn('Module patching failed: global object not available');
  }
}

/**
 * Get the patched version of a module
 * Currently only supports 'punycode'
 */
export function getPatchedModule(moduleName) {
  if (moduleName === 'punycode') {
    return punycodeWrapper;
  }
  return null;
}

// Automatically initialize when imported
initModulePatching();