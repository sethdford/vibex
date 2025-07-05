/**
 * Simple Commands Module Validation
 * 
 * Basic validation to check if commands module can be imported and basic
 * functionality works before running comprehensive tests.
 */

console.log('🔍 Simple Commands Module Validation...\n');

async function validateBasicImports() {
  console.log('1️⃣ Testing basic imports...');
  
  try {
    // Test basic type imports
    const typesModule = await import('../../src/commands/types.js');
    console.log('✅ Commands types imported successfully');
    
    // Test command registry import
    const registryModule = await import('../../src/commands/index.js');
    console.log('✅ Command registry imported successfully');
    
    // Check if registry has basic methods
    if (registryModule.commandRegistry) {
      const registry = registryModule.commandRegistry;
      
      // Test basic registry methods exist
      const methods = ['register', 'get', 'list', 'size'] as const;
      for (const method of methods) {
        if (method in registry && typeof (registry as any)[method] === 'function') {
          console.log(`✅ Registry method '${method}' exists`);
        } else {
          console.log(`❌ Registry method '${method}' missing`);
          return false;
        }
      }
      
      // Test basic registry functionality
      const initialCount = registry.size();
      console.log(`📊 Initial command count: ${initialCount}`);
      
      return true;
    } else {
      console.log('❌ Command registry not exported');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Import failed:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function validateTypeDefinitions() {
  console.log('\n2️⃣ Testing type definitions...');
  
  try {
    const { CommandCategory } = await import('../../src/commands/types.js');
    
    // Check if CommandCategory enum exists and has expected values
    const expectedCategories = ['SYSTEM', 'AI', 'FILE', 'GIT', 'MEMORY', 'UTILITY'] as const;
    for (const category of expectedCategories) {
      if (category in CommandCategory) {
        console.log(`✅ CommandCategory.${category} exists`);
      } else {
        console.log(`❌ CommandCategory.${category} missing`);
        return false;
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Type validation failed:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function main() {
  let success = true;
  
  // Test 1: Basic imports
  const importsValid = await validateBasicImports();
  if (!importsValid) {
    success = false;
  }
  
  // Test 2: Type definitions
  const typesValid = await validateTypeDefinitions();
  if (!typesValid) {
    success = false;
  }
  
  // Summary
  console.log('\n📋 Validation Summary:');
  console.log(`Imports: ${importsValid ? '✅' : '❌'}`);
  console.log(`Types: ${typesValid ? '✅' : '❌'}`);
  console.log(`Overall: ${success ? '✅ PASS' : '❌ FAIL'}`);
  
  if (success) {
    console.log('\n🎉 Basic commands module structure is valid!');
    console.log('Ready to proceed with comprehensive testing.');
  } else {
    console.log('\n💥 Commands module has structural issues!');
    console.log('Must fix basic structure before comprehensive testing.');
  }
  
  process.exit(success ? 0 : 1);
}

main().catch(error => {
  console.error('\n💥 Validation script failed:', error);
  process.exit(1);
}); 