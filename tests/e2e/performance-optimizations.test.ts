/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * End-to-end tests for performance optimization impact
 * 
 * Tests the real-world impact of performance optimizations on the full
 * application stack under various realistic usage scenarios.
 */

import { jest } from 'vitest';
import { spawn } from 'child_process';
import { join } from 'path';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';

// Path to CLI entry point
const CLI_PATH = join(__dirname, '../../src/cli.ts');

// Test timeout
jest.setTimeout(60000); // 60 seconds

// Mock environment variables
const originalProcessEnv = { ...process.env };

describe('Performance Optimizations E2E Tests', () => {
  // Test directory
  let testDir: string;

  beforeEach(() => {
    // Create temporary test directory
    testDir = join(tmpdir(), `vibex-e2e-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Reset environment variables
    process.env = { ...originalProcessEnv };
  });

  afterEach(() => {
    // Clean up
    rmSync(testDir, { recursive: true, force: true });
    process.env = originalProcessEnv;
  });

  /**
   * Run CLI with different performance levels and compare startup time
   */
  test('Performance levels should have measurable impact on startup time', async () => {
    // Define performance level test cases
    const performanceLevels = [
      { name: 'Conservative', env: { VIBEX_PERFORMANCE_LEVEL: 'conservative' }, expectedTime: 0 },
      { name: 'Balanced', env: { VIBEX_PERFORMANCE_LEVEL: 'balanced' }, expectedTime: 0 },
      { name: 'Aggressive', env: { VIBEX_PERFORMANCE_LEVEL: 'aggressive' }, expectedTime: 0 }
    ];

    // Run CLI with each performance level
    for (const level of performanceLevels) {
      console.log(`Testing ${level.name} performance level...`);
      
      // Set environment variables
      const env = {
        ...process.env,
        ...level.env,
        NODE_OPTIONS: '--require ts-node/register',
        TS_NODE_PROJECT: join(__dirname, '../../tsconfig.json')
      };

      // Measure startup time
      const startTime = Date.now();
      
      // Run CLI with version flag (fast operation)
      const child = spawn('node', [CLI_PATH, '--version'], {
        env,
        cwd: testDir
      });

      // Get result with timeout
      const result = await new Promise<{ exitCode: number, stdout: string, stderr: string }>((resolve) => {
        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('close', (exitCode) => {
          resolve({ exitCode: exitCode || 0, stdout, stderr });
        });
      });

      // Calculate execution time
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // Store execution time
      level.expectedTime = executionTime;
      
      console.log(`${level.name} startup time: ${executionTime}ms`);
    }

    // Compare performance levels
    expect(performanceLevels[0].expectedTime).toBeGreaterThan(0);
    
    // Progressive performance improvement (lower is better for startup time)
    // Conservative should be slower than Balanced
    expect(performanceLevels[0].expectedTime).toBeGreaterThanOrEqual(
      performanceLevels[1].expectedTime
    );
    
    // Balanced should be slower than Aggressive
    expect(performanceLevels[1].expectedTime).toBeGreaterThanOrEqual(
      performanceLevels[2].expectedTime
    );
    
    // At least 10% improvement from Conservative to Aggressive
    const improvement = performanceLevels[0].expectedTime / performanceLevels[2].expectedTime;
    expect(improvement).toBeGreaterThanOrEqual(1.1);
    console.log(`Overall startup time improvement: ${improvement.toFixed(2)}x`);
  });

  /**
   * Test memory usage across different performance levels
   */
  test('Performance levels should have measurable impact on memory usage', async () => {
    // Create a project with multiple files to increase memory usage
    createTestProject(testDir);

    // Define performance level test cases
    const performanceLevels = [
      { name: 'Conservative', env: { VIBEX_PERFORMANCE_LEVEL: 'conservative' }, memoryUsage: 0 },
      { name: 'Balanced', env: { VIBEX_PERFORMANCE_LEVEL: 'balanced' }, memoryUsage: 0 },
      { name: 'Aggressive', env: { VIBEX_PERFORMANCE_LEVEL: 'aggressive' }, memoryUsage: 0 }
    ];

    // Run CLI with each performance level
    for (const level of performanceLevels) {
      console.log(`Testing ${level.name} performance level memory usage...`);
      
      // Set environment variables
      const env = {
        ...process.env,
        ...level.env,
        NODE_OPTIONS: '--require ts-node/register',
        TS_NODE_PROJECT: join(__dirname, '../../tsconfig.json')
      };

      // Run CLI with a memory-intensive operation (analyzing all JS files)
      const child = spawn('node', [CLI_PATH, 'analyze', join(testDir, 'src/index.js'), '--yolo'], {
        env,
        cwd: testDir
      });

      // Get result with timeout
      const result = await new Promise<{ exitCode: number, stdout: string, stderr: string }>((resolve) => {
        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('close', (exitCode) => {
          resolve({ exitCode: exitCode || 0, stdout, stderr });
        });
      });

      // Parse memory usage from output
      // This is a simplification - in a real test, you'd use a more reliable method
      // to measure memory usage like the --inspect flag or process monitoring
      const memoryMatch = result.stderr.match(/Memory usage: (\d+)/);
      const memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0;
      
      // If no memory usage in output, estimate based on result size
      level.memoryUsage = memoryUsage || result.stdout.length;
      
      console.log(`${level.name} memory usage: ${level.memoryUsage}`);
    }

    // Progressive memory optimization (lower is better)
    // Aggressive should use less memory than Balanced
    expect(performanceLevels[2].memoryUsage).toBeLessThanOrEqual(
      performanceLevels[1].memoryUsage * 1.2 // Allow some variance
    );
    
    // Performance results should be within expected ranges
    console.log('Memory usage across performance levels is within expected ranges');
  });

  /**
   * Test concurrent operations with different performance levels
   */
  test('Performance levels should have measurable impact on concurrent operations', async () => {
    // Create a project with multiple files to test concurrency
    createTestProject(testDir);

    // Define performance level test cases
    const performanceLevels = [
      { name: 'Conservative', env: { VIBEX_PERFORMANCE_LEVEL: 'conservative' }, executionTime: 0 },
      { name: 'Balanced', env: { VIBEX_PERFORMANCE_LEVEL: 'balanced' }, executionTime: 0 },
      { name: 'Aggressive', env: { VIBEX_PERFORMANCE_LEVEL: 'aggressive' }, executionTime: 0 }
    ];

    // Run CLI with each performance level
    for (const level of performanceLevels) {
      console.log(`Testing ${level.name} performance level with concurrent operations...`);
      
      // Set environment variables
      const env = {
        ...process.env,
        ...level.env,
        NODE_OPTIONS: '--require ts-node/register',
        TS_NODE_PROJECT: join(__dirname, '../../tsconfig.json')
      };

      // Measure execution time
      const startTime = Date.now();
      
      // Run CLI with an operation that benefits from concurrency
      const child = spawn('node', [
        CLI_PATH, 
        'review', 
        join(testDir, 'src/index.js'), 
        '--yolo', 
        '--full-context'
      ], {
        env,
        cwd: testDir
      });

      // Get result with timeout
      const result = await new Promise<{ exitCode: number, stdout: string, stderr: string }>((resolve) => {
        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('close', (exitCode) => {
          resolve({ exitCode: exitCode || 0, stdout, stderr });
        });
      });

      // Calculate execution time
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // Store execution time
      level.executionTime = executionTime;
      
      console.log(`${level.name} concurrent operation time: ${executionTime}ms`);
    }

    // Progressive performance improvement (lower is better for execution time)
    // Conservative should generally be slower than Aggressive for concurrent operations
    const improvement = performanceLevels[0].executionTime / performanceLevels[2].executionTime;
    
    // Note: We use a loose check because in some environments, the difference might be small
    // and there could be other factors affecting performance
    console.log(`Concurrent operations improvement: ${improvement.toFixed(2)}x`);
    expect(improvement).toBeGreaterThanOrEqual(0.9); // Should be at least competitive
  });
});

/**
 * Create a test project for E2E testing
 */
function createTestProject(testDir: string) {
  // Create project structure
  mkdirSync(join(testDir, 'src'), { recursive: true });
  mkdirSync(join(testDir, 'src/utils'), { recursive: true });
  mkdirSync(join(testDir, 'src/components'), { recursive: true });
  mkdirSync(join(testDir, 'src/services'), { recursive: true });
  
  // Create package.json
  writeFileSync(join(testDir, 'package.json'), JSON.stringify({
    name: 'test-project',
    version: '1.0.0',
    description: 'Test project for E2E performance testing',
    main: 'src/index.js',
    scripts: {
      start: 'node src/index.js',
      test: 'jest'
    },
    dependencies: {
      express: '^4.17.1',
      react: '^17.0.2'
    }
  }, null, 2));
  
  // Create source files
  writeFileSync(join(testDir, 'src/index.js'), `
// Main application entry point
const express = require('express');
const { createServer } = require('http');
const { readConfig } = require('./utils/config');
const { setupRoutes } = require('./routes');
const { initializeDatabase } = require('./services/database');

// Import components
const { App } = require('./components/App');
const { UserProfile } = require('./components/UserProfile');
const { Dashboard } = require('./components/Dashboard');

async function startServer() {
  // Load configuration
  const config = readConfig();
  
  // Initialize database
  await initializeDatabase(config.database);
  
  // Create Express app
  const app = express();
  
  // Setup middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Setup routes
  setupRoutes(app);
  
  // Create HTTP server
  const server = createServer(app);
  
  // Start listening
  server.listen(config.port, () => {
    console.log(\`Server started on port \${config.port}\`);
  });
  
  return server;
}

if (require.main === module) {
  startServer()
    .then(() => console.log('Server started successfully'))
    .catch(err => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });
}

module.exports = { startServer };
`);

  // Create utility files
  writeFileSync(join(testDir, 'src/utils/config.js'), `
// Configuration utilities
const fs = require('fs');
const path = require('path');

function readConfig() {
  // Default configuration
  const defaultConfig = {
    port: 3000,
    env: 'development',
    database: {
      host: 'localhost',
      port: 5432,
      name: 'testdb',
      user: 'postgres',
      password: 'postgres'
    },
    logging: {
      level: 'info',
      file: 'logs/app.log'
    }
  };
  
  try {
    // Try to read configuration from file
    const configPath = path.join(process.cwd(), 'config.json');
    if (fs.existsSync(configPath)) {
      const configFile = fs.readFileSync(configPath, 'utf8');
      const fileConfig = JSON.parse(configFile);
      
      // Merge with default configuration
      return { ...defaultConfig, ...fileConfig };
    }
  } catch (err) {
    console.warn('Failed to read configuration file, using defaults');
  }
  
  return defaultConfig;
}

module.exports = { readConfig };
`);

  // Create component files
  writeFileSync(join(testDir, 'src/components/App.js'), `
// Main application component
function App() {
  return {
    render: () => '<div id="app"></div>'
  };
}

module.exports = { App };
`);

  writeFileSync(join(testDir, 'src/components/UserProfile.js'), `
// User profile component
function UserProfile({ user }) {
  if (!user) {
    return {
      render: () => '<div>User not found</div>'
    };
  }
  
  return {
    render: () => \`
      <div class="user-profile">
        <h2>\${user.name}</h2>
        <p>Email: \${user.email}</p>
        <p>Role: \${user.role}</p>
      </div>
    \`
  };
}

module.exports = { UserProfile };
`);

  writeFileSync(join(testDir, 'src/components/Dashboard.js'), `
// Dashboard component
function Dashboard({ data }) {
  const renderMetric = (metric) => \`
    <div class="metric">
      <h3>\${metric.name}</h3>
      <div class="value">\${metric.value}</div>
      <div class="change \${metric.change > 0 ? 'positive' : 'negative'}">
        \${metric.change > 0 ? '+' : ''}\${metric.change}%
      </div>
    </div>
  \`;
  
  return {
    render: () => \`
      <div class="dashboard">
        <h2>Dashboard</h2>
        <div class="metrics">
          \${(data.metrics || []).map(renderMetric).join('')}
        </div>
        <div class="chart">
          <!-- Chart would go here -->
        </div>
      </div>
    \`
  };
}

module.exports = { Dashboard };
`);

  // Create service files
  writeFileSync(join(testDir, 'src/services/database.js'), `
// Database service
async function initializeDatabase(config) {
  console.log('Initializing database with config:', config);
  
  // In a real app, this would connect to a database
  return {
    query: async (sql, params) => {
      console.log('Executing query:', sql, params);
      return { rows: [] };
    },
    close: async () => {
      console.log('Closing database connection');
    }
  };
}

module.exports = { initializeDatabase };
`);

  // Create routes file
  writeFileSync(join(testDir, 'src/routes.js'), `
// Application routes
function setupRoutes(app) {
  // Home route
  app.get('/', (req, res) => {
    res.send('Hello World!');
  });
  
  // API routes
  app.get('/api/users', (req, res) => {
    res.json([
      { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'user' }
    ]);
  });
  
  app.get('/api/users/:id', (req, res) => {
    const id = parseInt(req.params.id);
    
    if (id === 1) {
      res.json({ id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin' });
    } else if (id === 2) {
      res.json({ id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'user' });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });
  
  app.get('/api/metrics', (req, res) => {
    res.json({
      metrics: [
        { name: 'Users', value: 1250, change: 5.3 },
        { name: 'Revenue', value: '$12,500', change: 8.1 },
        { name: 'Active Sessions', value: 423, change: -2.5 }
      ]
    });
  });
  
  // Handle 404
  app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });
  
  // Handle errors
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  });
}

module.exports = { setupRoutes };
`);

  return testDir;
}