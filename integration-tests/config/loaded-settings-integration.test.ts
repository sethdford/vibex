/**
 * LoadedSettings Integration Test
 * 
 * Manual test script to validate LoadedSettings system functionality
 * with file persistence and hierarchical settings management.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  LoadedSettings,
  SettingScope,
  loadSettings,
  createLoadedSettings,
  ensureUserSettingsFile,
  ensureWorkspaceSettingsFile,
  SETTINGS_DIRECTORY_NAME,
} from '../../src/config/loaded-settings.js';

const TEST_WORKSPACE = path.join(os.tmpdir(), 'vibex-test-workspace');
const TEST_USER_DIR = path.join(os.tmpdir(), 'vibex-test-user');

// Simple assertion function
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Test cleanup function
function cleanup(): void {
  // Clean up test directories
  if (fs.existsSync(TEST_WORKSPACE)) {
    fs.rmSync(TEST_WORKSPACE, { recursive: true, force: true });
  }
  if (fs.existsSync(TEST_USER_DIR)) {
    fs.rmSync(TEST_USER_DIR, { recursive: true, force: true });
  }
}

// Setup function
function setup(): void {
  cleanup();
  
  // Create test directories
  fs.mkdirSync(TEST_WORKSPACE, { recursive: true });
  fs.mkdirSync(TEST_USER_DIR, { recursive: true });
}

// Test 1: Basic file creation and loading
async function testBasicFileCreation(): Promise<void> {
  console.log('📝 Test 1: Basic file creation and loading...');
  
  // Mock os.homedir
  const originalHomedir = os.homedir;
  (os as any).homedir = () => TEST_USER_DIR;

  try {
    // Create settings files
    await ensureUserSettingsFile();
    await ensureWorkspaceSettingsFile(TEST_WORKSPACE);

    // Verify files were created
    const userSettingsPath = path.join(TEST_USER_DIR, SETTINGS_DIRECTORY_NAME, 'settings.json');
    const workspaceSettingsPath = path.join(TEST_WORKSPACE, SETTINGS_DIRECTORY_NAME, 'settings.json');

    assert(fs.existsSync(userSettingsPath), 'User settings file should exist');
    assert(fs.existsSync(workspaceSettingsPath), 'Workspace settings file should exist');

    // Load settings
    const loadedSettings = loadSettings(TEST_WORKSPACE);

    assert(loadedSettings instanceof LoadedSettings, 'Should create LoadedSettings instance');
    assert(loadedSettings.errors.length === 0, 'Should have no errors');
    assert(loadedSettings.user.path === userSettingsPath, 'User path should match');
    assert(loadedSettings.workspace.path === workspaceSettingsPath, 'Workspace path should match');
    
    console.log('✅ Test 1 passed');
  } finally {
    // Restore original homedir
    (os as any).homedir = originalHomedir;
  }
}

// Test 2: Hierarchical settings
async function testHierarchicalSettings(): Promise<void> {
  console.log('📝 Test 2: Hierarchical settings...');
  
  // Mock os.homedir
  const originalHomedir = os.homedir;
  (os as any).homedir = () => TEST_USER_DIR;

  try {
    // Create settings with test data
    const userSettingsPath = path.join(TEST_USER_DIR, SETTINGS_DIRECTORY_NAME, 'settings.json');
    const workspaceSettingsPath = path.join(TEST_WORKSPACE, SETTINGS_DIRECTORY_NAME, 'settings.json');

    // Create directories
    fs.mkdirSync(path.dirname(userSettingsPath), { recursive: true });
    fs.mkdirSync(path.dirname(workspaceSettingsPath), { recursive: true });

    // Write user settings
    const userSettings = {
      ai: {
        model: 'claude-sonnet-4-20250514',
        temperature: 0.5,
        maxTokens: 4000,
        maxHistoryLength: 20,
        enableCaching: true,
        enableTools: true,
        enableTelemetry: true,
        enableBetaFeatures: true,
        autoModelSelection: true,
        costBudget: 10,
        performanceMode: 'balanced',
        systemPrompt: 'User prompt'
      },
      logger: {
        level: 'info',
        timestamps: true,
        colors: true
      }
    };

    // Write workspace settings (overrides user)
    const workspaceSettings = {
      ai: {
        model: 'claude-opus-4-20250514', // Override user setting
        temperature: 0.7,
        maxTokens: 4000,
        maxHistoryLength: 20,
        enableCaching: true,
        enableTools: true,
        enableTelemetry: true,
        enableBetaFeatures: true,
        autoModelSelection: true,
        costBudget: 10,
        performanceMode: 'quality',
        systemPrompt: 'Workspace prompt'
      }
    };

    fs.writeFileSync(userSettingsPath, JSON.stringify(userSettings, null, 2));
    fs.writeFileSync(workspaceSettingsPath, JSON.stringify(workspaceSettings, null, 2));

    // Load settings
    const loadedSettings = loadSettings(TEST_WORKSPACE);

    // Test hierarchical merging
    const merged = loadedSettings.merged;
    
    // Workspace should override user
    assert(merged.ai?.model === 'claude-opus-4-20250514', 'Model should be from workspace');
    assert(merged.ai?.performanceMode === 'quality', 'Performance mode should be from workspace');
    assert(merged.logger?.level === 'info', 'Logger level should be from user');

    // Test scope-specific access
    assert(loadedSettings.getValueForScope(SettingScope.User, 'ai')?.model === 'claude-sonnet-4-20250514', 'User model should match');
    assert(loadedSettings.getValueForScope(SettingScope.Workspace, 'ai')?.model === 'claude-opus-4-20250514', 'Workspace model should match');

    console.log('✅ Test 2 passed');
  } finally {
    // Restore original homedir
    (os as any).homedir = originalHomedir;
  }
}

// Test 3: Settings persistence
async function testSettingsPersistence(): Promise<void> {
  console.log('📝 Test 3: Settings persistence...');
  
  // Mock os.homedir
  const originalHomedir = os.homedir;
  (os as any).homedir = () => TEST_USER_DIR;

  try {
    // Create initial settings
    await ensureUserSettingsFile();
    await ensureWorkspaceSettingsFile(TEST_WORKSPACE);

    // Load settings
    const loadedSettings = loadSettings(TEST_WORKSPACE);

    // Modify user settings
    loadedSettings.setValue(SettingScope.User, 'ai', {
      model: 'claude-haiku-4-20250514',
      temperature: 0.3,
      maxTokens: 2000,
      maxHistoryLength: 15,
      enableCaching: false,
      enableTools: true,
      enableTelemetry: false,
      enableBetaFeatures: false,
      autoModelSelection: false,
      costBudget: 5,
      performanceMode: 'speed',
      systemPrompt: 'Modified prompt'
    });

    // Verify changes were persisted
    const userSettingsPath = path.join(TEST_USER_DIR, SETTINGS_DIRECTORY_NAME, 'settings.json');
    const savedContent = fs.readFileSync(userSettingsPath, 'utf-8');
    const savedSettings = JSON.parse(savedContent);

    assert(savedSettings.ai.model === 'claude-haiku-4-20250514', 'Model should be persisted');
    assert(savedSettings.ai.performanceMode === 'speed', 'Performance mode should be persisted');

    console.log('✅ Test 3 passed');
  } finally {
    // Restore original homedir
    (os as any).homedir = originalHomedir;
  }
}

// Main test runner
export async function runLoadedSettingsIntegrationTest(): Promise<void> {
  console.log('🧪 Running LoadedSettings Integration Test...');
  
  try {
    setup();
    
    await testBasicFileCreation();
    await testHierarchicalSettings();
    await testSettingsPersistence();
    
    console.log('🎉 All LoadedSettings integration tests passed!');
  } catch (error) {
    console.error('❌ LoadedSettings Integration Test failed:', error);
    throw error;
  } finally {
    cleanup();
  }
}

// Quick functionality test
export async function quickLoadedSettingsTest(): Promise<void> {
  console.log('🧪 Running Quick LoadedSettings Test...');
  
  try {
    // Test basic functionality
    const testWorkspace = path.join(os.tmpdir(), 'vibex-quick-test');
    
    // Clean up
    if (fs.existsSync(testWorkspace)) {
      fs.rmSync(testWorkspace, { recursive: true, force: true });
    }
    
    // Create LoadedSettings
    const loadedSettings = await createLoadedSettings(testWorkspace);
    
    console.log('✅ LoadedSettings created successfully');
    console.log(`📁 User settings: ${loadedSettings.user.path}`);
    console.log(`📁 Workspace settings: ${loadedSettings.workspace.path}`);
    console.log(`❌ Errors: ${loadedSettings.errors.length}`);
    
    // Test setting values
    loadedSettings.setValue(SettingScope.User, 'logger', {
      level: 'debug',
      timestamps: true,
      colors: true
    });
    
    console.log('✅ Setting value test passed');
    
    // Test getting values
    const loggerConfig = loadedSettings.getValue('logger');
    console.log(`📊 Logger config: ${JSON.stringify(loggerConfig, null, 2)}`);
    
    // Clean up
    if (fs.existsSync(testWorkspace)) {
      fs.rmSync(testWorkspace, { recursive: true, force: true });
    }
    
    console.log('🎉 Quick LoadedSettings Test completed successfully!');
  } catch (error) {
    console.error('❌ Quick LoadedSettings Test failed:', error);
    throw error;
  }
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runLoadedSettingsIntegrationTest().catch(console.error);
} 