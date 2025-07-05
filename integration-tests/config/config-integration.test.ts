/**
 * Config Integration Test
 * 
 * Manual test script to validate the integration between ConfigManager 
 * and LoadedSettings for hierarchical configuration support.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  ConfigManagerWithLoadedSettings,
  createConfigWithLoadedSettings,
  loadConfigWithLoadedSettings,
  saveConfigWithLoadedSettings,
  getConfigWithScopes
} from '../../src/config/config-with-loaded-settings.js';
import { SettingScope } from '../../src/config/loaded-settings.js';

// Simple assertion function
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Test runner
export async function runConfigIntegrationTest(): Promise<void> {
  console.log('🧪 Running Config Integration Test...');
  
  try {
    const testWorkspace = path.join(os.tmpdir(), 'vibex-config-integration-test');
    
    // Clean up any existing test directory
    if (fs.existsSync(testWorkspace)) {
      fs.rmSync(testWorkspace, { recursive: true, force: true });
    }
    
    // Create test workspace
    fs.mkdirSync(testWorkspace, { recursive: true });
    
    console.log('📁 Test workspace created');
    
    // Test 1: Create ConfigManagerWithLoadedSettings
    console.log('\n🔧 Test 1: Creating ConfigManagerWithLoadedSettings...');
    const configManager = await createConfigWithLoadedSettings(testWorkspace);
    
    assert(configManager instanceof ConfigManagerWithLoadedSettings, 'Should be instance of ConfigManagerWithLoadedSettings');
    assert(configManager.hasLoadedSettings(), 'Should have LoadedSettings available');
    
    const config = configManager.get();
    assert(config !== undefined, 'Config should be defined');
    assert(config.version !== undefined, 'Config version should be defined');
    
    console.log('✅ Test 1 passed: ConfigManagerWithLoadedSettings created successfully');
    
    // Test 2: Hierarchical configuration
    console.log('\n🔧 Test 2: Testing hierarchical configuration...');
    
    // Set user-level setting
    configManager.setValue('logger', {
      level: 'debug',
      timestamps: true,
      colors: true
    }, SettingScope.User);
    
    // Set workspace-level setting (should override user where applicable)
    configManager.setValue('logger', {
      level: 'info', // Override user setting
      timestamps: true,
      colors: false // Override user setting
    }, SettingScope.Workspace);
    
    // Get merged configuration
    const mergedConfig = configManager.get();
    
    // Workspace should override user
    assert(mergedConfig.logger?.level === 'info', 'Workspace logger level should override user');
    assert(mergedConfig.logger?.colors === false, 'Workspace colors setting should override user');
    
    // Test scope-specific access
    const userLogger = configManager.getValueForScope('logger', SettingScope.User);
    const workspaceLogger = configManager.getValueForScope('logger', SettingScope.Workspace);
    
    assert(userLogger?.level === 'debug', 'User logger level should be debug');
    assert(workspaceLogger?.level === 'info', 'Workspace logger level should be info');
    
    console.log('✅ Test 2 passed: Hierarchical configuration working correctly');
    
    // Test 3: Enhanced load/save functions
    console.log('\n🔧 Test 3: Testing enhanced load/save functions...');
    
    const loadedConfig = await loadConfigWithLoadedSettings(testWorkspace);
    assert(loadedConfig !== undefined, 'Loaded config should be defined');
    assert(loadedConfig.version !== undefined, 'Loaded config version should be defined');
    
    await saveConfigWithLoadedSettings({
      terminal: {
        theme: 'dark',
        useColors: true,
        showProgressIndicators: true,
        codeHighlighting: true,
        useHighContrast: false,
        fontSizeAdjustment: 'normal',
        reduceMotion: false,
        simplifyInterface: false,
        streamingSpeed: 1.0
      }
    }, SettingScope.User, testWorkspace);
    
    // Verify it was saved
    const reloadedConfig = await loadConfigWithLoadedSettings(testWorkspace);
    assert(reloadedConfig.terminal?.theme === 'dark', 'Terminal theme should be saved');
    
    console.log('✅ Test 3 passed: Enhanced load/save functions working correctly');
    
    // Test 4: Scope information
    console.log('\n🔧 Test 4: Testing scope information...');
    
    const scopeInfo = await getConfigWithScopes(testWorkspace);
    assert(scopeInfo.hasLoadedSettings === true, 'Should have LoadedSettings');
    assert(scopeInfo.merged !== undefined, 'Merged config should be defined');
    assert(scopeInfo.user !== undefined, 'User config should be defined');
    assert(scopeInfo.workspace !== undefined, 'Workspace config should be defined');
    
    console.log('✅ Test 4 passed: Scope information working correctly');
    
    // Test 5: Fallback behavior
    console.log('\n🔧 Test 5: Testing fallback behavior...');
    
    const nonExistentWorkspace = path.join(os.tmpdir(), 'non-existent-workspace');
    const fallbackConfig = await loadConfigWithLoadedSettings(nonExistentWorkspace);
    assert(fallbackConfig !== undefined, 'Fallback config should be defined');
    
    console.log('✅ Test 5 passed: Fallback behavior working correctly');
    
    // Clean up test directory
    if (fs.existsSync(testWorkspace)) {
      fs.rmSync(testWorkspace, { recursive: true, force: true });
    }
    
    console.log('\n🎉 All Config Integration Tests passed successfully!');
    console.log('\n📊 Summary:');
    console.log('  ✅ ConfigManagerWithLoadedSettings creation');
    console.log('  ✅ Hierarchical configuration (User/Workspace scopes)');
    console.log('  ✅ Enhanced load/save functions');
    console.log('  ✅ Scope information access');
    console.log('  ✅ Fallback behavior for missing LoadedSettings');
    
  } catch (error) {
    console.error('\n❌ Config Integration Test failed:', error);
    throw error;
  }
}

// Quick test function for immediate validation
export async function quickConfigIntegrationTest(): Promise<void> {
  console.log('⚡ Quick Config Integration Test...');
  
  try {
    const testDir = path.join(os.tmpdir(), 'vibex-quick-config-test');
    
    // Clean up
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    
    // Test basic functionality
    const configManager = await createConfigWithLoadedSettings(testDir);
    const hasLoadedSettings = configManager.hasLoadedSettings();
    const config = configManager.get();
    
    console.log(`✅ ConfigManager created with LoadedSettings: ${hasLoadedSettings}`);
    console.log(`✅ Config loaded with version: ${config.version}`);
    
    // Test setting a value
    configManager.setValue('logger', {
      level: 'debug',
      timestamps: true,
      colors: true
    }, SettingScope.User);
    
    const updatedConfig = configManager.get();
    console.log(`✅ Setting saved, logger level: ${updatedConfig.logger?.level}`);
    
    // Clean up
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    
    console.log('⚡ Quick test completed successfully!');
  } catch (error) {
    console.error('❌ Quick test failed:', error);
    throw error;
  }
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runConfigIntegrationTest().catch(console.error);
} 