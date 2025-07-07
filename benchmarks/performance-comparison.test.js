/**
 * Performance comparison benchmarks between VibeX and Gemini CLI
 * 
 * Tests startup time, memory usage, response time, and other metrics
 * to validate VibeX's 6x performance improvement claims over Gemini CLI.
 */

const { performance } = require('perf_hooks');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { test } = require('node:test');
const assert = require('node:assert').strict;

// Path to binaries
const VIBEX_PATH = path.join(__dirname, '../bundle/vibex.js');
const GEMINI_PATH = path.join(__dirname, 'gemini-cli/bundle/gemini.js');

// Test environment setup
const TEST_DIR = path.join(os.tmpdir(), `vibex-perf-${Date.now()}`);
fs.mkdirSync(TEST_DIR, { recursive: true });

/**
 * Get memory usage metrics from a command
 */
function getMemoryUsage(command) {
  // Use /usr/bin/time -l on macOS or /usr/bin/time -v on Linux
  const timeCommand = process.platform === 'darwin' 
    ? '/usr/bin/time -l'
    : '/usr/bin/time -v';
  
  try {
    // Redirect stderr to stdout to capture the time output
    execSync(`${timeCommand} ${command} 2>&1`, { 
      cwd: TEST_DIR,
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (error) {
    // We expect this to fail with a non-zero exit code, but we still want the output
    const output = error.stdout.toString();
    
    // Extract memory usage
    if (process.platform === 'darwin') {
      // macOS format
      const match = output.match(/(\d+)\s+maximum resident set size/);
      return match ? parseInt(match[1]) / 1024 : null; // Convert to KB
    } else {
      // Linux format
      const match = output.match(/Maximum resident set size \(kbytes\): (\d+)/);
      return match ? parseInt(match[1]) : null;
    }
  }
  
  return null;
}

/**
 * Measure startup time for a command
 */
function measureStartupTime(command) {
  const start = performance.now();
  execSync(command, { 
    cwd: TEST_DIR,
    stdio: 'ignore'
  });
  const end = performance.now();
  return end - start;
}

/**
 * Run a benchmark comparing VibeX vs Gemini CLI
 */
function runBenchmark(name, vibexCommand, geminiCommand, iterations = 5) {
  console.log(`\n🔍 Running benchmark: ${name}`);
  
  // Arrays to store results
  const vibexResults = [];
  const geminiResults = [];
  
  // Run iterations
  for (let i = 0; i < iterations; i++) {
    console.log(`  ▶️ Iteration ${i + 1}/${iterations}`);
    
    // Run VibeX
    console.log('    📊 Running VibeX...');
    const vibexStart = performance.now();
    execSync(vibexCommand, { 
      cwd: TEST_DIR,
      stdio: 'ignore'
    });
    const vibexEnd = performance.now();
    const vibexTime = vibexEnd - vibexStart;
    vibexResults.push(vibexTime);
    
    // Run Gemini
    console.log('    📊 Running Gemini CLI...');
    const geminiStart = performance.now();
    execSync(geminiCommand, { 
      cwd: TEST_DIR,
      stdio: 'ignore'
    });
    const geminiEnd = performance.now();
    const geminiTime = geminiEnd - geminiStart;
    geminiResults.push(geminiTime);
  }
  
  // Calculate averages
  const vibexAvg = vibexResults.reduce((a, b) => a + b, 0) / vibexResults.length;
  const geminiAvg = geminiResults.reduce((a, b) => a + b, 0) / geminiResults.length;
  
  // Calculate improvement
  const improvement = geminiAvg / vibexAvg;
  
  console.log(`\n📈 Results for ${name}:`);
  console.log(`  ⏱️  VibeX average time: ${vibexAvg.toFixed(2)}ms`);
  console.log(`  ⏱️  Gemini average time: ${geminiAvg.toFixed(2)}ms`);
  console.log(`  🚀 Performance improvement: ${improvement.toFixed(2)}x faster`);
  
  return {
    name,
    vibexAvg,
    geminiAvg,
    improvement,
    vibexResults,
    geminiResults
  };
}

/**
 * Measure memory usage
 */
function runMemoryBenchmark(name, vibexCommand, geminiCommand, iterations = 3) {
  console.log(`\n🔍 Running memory benchmark: ${name}`);
  
  // Arrays to store results
  const vibexResults = [];
  const geminiResults = [];
  
  // Run iterations
  for (let i = 0; i < iterations; i++) {
    console.log(`  ▶️ Iteration ${i + 1}/${iterations}`);
    
    // Measure VibeX memory
    console.log('    📊 Measuring VibeX memory...');
    const vibexMemory = getMemoryUsage(`node ${VIBEX_PATH} ${vibexCommand}`);
    if (vibexMemory) {
      vibexResults.push(vibexMemory);
    }
    
    // Measure Gemini memory
    console.log('    📊 Measuring Gemini CLI memory...');
    const geminiMemory = getMemoryUsage(`node ${GEMINI_PATH} ${geminiCommand}`);
    if (geminiMemory) {
      geminiResults.push(geminiMemory);
    }
  }
  
  // Calculate averages
  const vibexAvg = vibexResults.reduce((a, b) => a + b, 0) / vibexResults.length;
  const geminiAvg = geminiResults.reduce((a, b) => a + b, 0) / geminiResults.length;
  
  // Calculate improvement (lower is better for memory)
  const improvement = geminiAvg / vibexAvg;
  
  console.log(`\n📈 Memory usage results for ${name}:`);
  console.log(`  📊 VibeX average memory: ${vibexAvg.toFixed(2)}KB`);
  console.log(`  📊 Gemini average memory: ${geminiAvg.toFixed(2)}KB`);
  console.log(`  🚀 Memory efficiency: ${improvement.toFixed(2)}x better`);
  
  return {
    name,
    vibexAvg,
    geminiAvg,
    improvement,
    vibexResults,
    geminiResults
  };
}

// Create test files
fs.writeFileSync(path.join(TEST_DIR, 'test-file.txt'), 'This is a test file for benchmarking.');
fs.writeFileSync(path.join(TEST_DIR, 'large-file.txt'), 'X'.repeat(1000000)); // 1MB file

// Create a test JS file
fs.writeFileSync(path.join(TEST_DIR, 'test.js'), `
function calculateFibonacci(n) {
  if (n <= 1) return n;
  return calculateFibonacci(n - 1) + calculateFibonacci(n - 2);
}

console.log(calculateFibonacci(10));
`);

// Benchmark tests
test('Startup time comparison', async () => {
  const vibexResult = measureStartupTime(`node ${VIBEX_PATH} --version`);
  const geminiResult = measureStartupTime(`node ${GEMINI_PATH} --version`);
  
  console.log(`VibeX startup time: ${vibexResult.toFixed(2)}ms`);
  console.log(`Gemini startup time: ${geminiResult.toFixed(2)}ms`);
  
  const improvement = geminiResult / vibexResult;
  console.log(`Startup time improvement: ${improvement.toFixed(2)}x`);
  
  // Assert that VibeX is at least 4x faster for startup
  assert.ok(improvement >= 4, `Expected at least 4x improvement, got ${improvement.toFixed(2)}x`);
});

test('Memory usage comparison', async () => {
  const result = runMemoryBenchmark(
    'Memory Usage',
    '--version',
    '--version'
  );
  
  // Assert that VibeX uses at least 4x less memory
  assert.ok(result.improvement >= 4, `Expected at least 4x memory improvement, got ${result.improvement.toFixed(2)}x`);
});

test('File operation performance', async () => {
  // Create 10 test files
  for (let i = 0; i < 10; i++) {
    fs.writeFileSync(path.join(TEST_DIR, `file-${i}.txt`), `Content for file ${i}`);
  }
  
  const result = runBenchmark(
    'File Operations',
    `--yolo --prompt "List all files in the current directory"`,
    `--yolo --prompt "List all files in the current directory"`
  );
  
  // Assert that VibeX is at least 3x faster
  assert.ok(result.improvement >= 3, `Expected at least 3x improvement, got ${result.improvement.toFixed(2)}x`);
});

test('Context loading performance', async () => {
  // Create a simulated project structure
  fs.mkdirSync(path.join(TEST_DIR, 'src'), { recursive: true });
  fs.mkdirSync(path.join(TEST_DIR, 'src/utils'), { recursive: true });
  fs.mkdirSync(path.join(TEST_DIR, 'src/components'), { recursive: true });
  
  // Create some JS files
  fs.writeFileSync(path.join(TEST_DIR, 'src/index.js'), 'console.log("Hello world");');
  fs.writeFileSync(path.join(TEST_DIR, 'src/utils/helpers.js'), 'export const add = (a, b) => a + b;');
  fs.writeFileSync(path.join(TEST_DIR, 'src/components/Button.js'), 'export const Button = () => "<button>Click me</button>";');
  
  // Create a package.json
  fs.writeFileSync(path.join(TEST_DIR, 'package.json'), JSON.stringify({
    name: 'test-project',
    version: '1.0.0',
    main: 'src/index.js'
  }, null, 2));
  
  const result = runBenchmark(
    'Context Loading',
    `--full-context --yolo --prompt "Explain what this project does"`,
    `--full-context --yolo --prompt "Explain what this project does"`
  );
  
  // Assert that VibeX is at least 3x faster
  assert.ok(result.improvement >= 3, `Expected at least 3x improvement, got ${result.improvement.toFixed(2)}x`);
});

test('Code analysis performance', async () => {
  const result = runBenchmark(
    'Code Analysis',
    `analyze ${path.join(TEST_DIR, 'test.js')} --yolo`,
    `analyze ${path.join(TEST_DIR, 'test.js')} --yolo`
  );
  
  // Assert that VibeX is at least 3x faster
  assert.ok(result.improvement >= 3, `Expected at least 3x improvement, got ${result.improvement.toFixed(2)}x`);
});

// Clean up
test.after(() => {
  // Remove the test directory
  try {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
    console.log(`\n🧹 Cleaned up test directory: ${TEST_DIR}`);
  } catch (error) {
    console.error('Error cleaning up:', error);
  }
});