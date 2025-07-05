/**
 * Version information for the application
 */

/**
 * Current version of the application
 */
export const version = '1.0.0';

/**
 * Build information
 */
export const buildInfo = {
  timestamp: new Date().toISOString(),
  nodeVersion: process.version,
  platform: process.platform,
  arch: process.arch
};

/**
 * Version information object
 */
export const versionInfo = {
  version,
  codename: 'Velocity',
  releaseDate: '2025-06-30',
  buildInfo,
  channel: 'stable'
};

export default version;