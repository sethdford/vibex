/**
 * Auth Manager Instance
 * 
 * Provides a singleton instance of the authentication manager
 */

import { AuthManager } from './manager.js';
import config from '../config/index.js';

/**
 * Singleton instance of the AuthManager
 * 
 * This ensures a single consistent auth manager is used throughout the app
 */
export const authManager = new AuthManager(config.get());