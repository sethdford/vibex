#!/bin/bash

echo "🔍 VibeX Quality Gates - Architectural Enforcement"
echo "=================================================="

# Initialize error counter
ERROR_COUNT=0

# Function to report errors
report_error() {
    echo "❌ $1"
    ERROR_COUNT=$((ERROR_COUNT + 1))
}

# Function to report warnings
report_warning() {
    echo "⚠️  $1"
}

# Function to report success
report_success() {
    echo "✅ $1"
}

echo ""
echo "🚫 Checking for vitest imports (CRITICAL architectural violation)..."
if grep -r "from 'vitest'" tests/ src/ 2>/dev/null; then
    report_error "vitest imports detected! VibeX uses Jest exclusively."
    echo "   Fix: Replace with: import { describe, test, expect, jest } from '@jest/globals'"
elif grep -r "import.*vitest" tests/ src/ 2>/dev/null; then
    report_error "vitest imports detected! VibeX uses Jest exclusively."
    echo "   Fix: Replace with: import { describe, test, expect, jest } from '@jest/globals'"
else
    report_success "No vitest imports found"
fi

echo ""
echo "🔗 Checking for incorrect .js imports in TypeScript files..."
JS_IMPORTS=$(find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "from '\\..*\\.js'" 2>/dev/null | wc -l)
if [ $JS_IMPORTS -gt 0 ]; then
    report_error "Found $JS_IMPORTS TypeScript files importing from .js files"
    find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "from '\\..*\\.js'" 2>/dev/null | head -5
    echo "   Fix: Import from .ts/.tsx files instead"
else
    report_success "No incorrect .js imports found"
fi

echo ""
echo "📏 Checking file sizes (max 300 lines)..."
LARGE_FILES=$(find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | awk '$1 > 300 {print $2}' | wc -l)
if [ $LARGE_FILES -gt 0 ]; then
    report_warning "Found $LARGE_FILES files over 300 lines"
    find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | awk '$1 > 300 {print "   " $2 " (" $1 " lines)"}'
    echo "   Recommendation: Split large files into smaller modules"
else
    report_success "All files under 300 lines"
fi

echo ""
echo "🚫 Checking for console pollution..."
CONSOLE_COUNT=$(grep -r "console\." src/ | grep -v ".test." | grep -v "cli.ts" | wc -l)
if [ $CONSOLE_COUNT -gt 0 ]; then
    report_error "Found $CONSOLE_COUNT console statements outside CLI/tests"
    echo "   Fix: Replace with proper logging (import { logger } from '../utils/logger.js')"
    grep -rn "console\." src/ | grep -v ".test." | grep -v "cli.ts" | head -5
else
    report_success "No console pollution found"
fi

echo ""
echo "🔧 Running TypeScript compilation check..."
if npm run typecheck > /dev/null 2>&1; then
    report_success "TypeScript compilation passed"
else
    report_error "TypeScript compilation failed"
    echo "   Run 'npm run typecheck' to see detailed errors"
fi

echo ""
echo "🏗️ Running build check..."
BUILD_START=$(date +%s%3N)
if npm run build > /dev/null 2>&1; then
    BUILD_END=$(date +%s%3N)
    BUILD_TIME=$((BUILD_END - BUILD_START))
    if [ $BUILD_TIME -lt 50 ]; then
        report_success "Build passed in ${BUILD_TIME}ms (under 50ms target)"
    else
        report_warning "Build passed in ${BUILD_TIME}ms (over 50ms target)"
    fi
else
    report_error "Build failed"
    echo "   Run 'npm run build' to see detailed errors"
fi

echo ""
echo "🧪 Checking Jest configuration..."
if [ -f "jest.config.js" ]; then
    report_success "Jest configuration found"
else
    report_error "Jest configuration missing"
fi

echo ""
echo "📊 Checking bundle size..."
if [ -f "dist/cli.js" ]; then
    BUNDLE_SIZE=$(du -k dist/cli.js | cut -f1)
    BUNDLE_SIZE_MB=$((BUNDLE_SIZE / 1024))
    if [ $BUNDLE_SIZE_MB -lt 5 ]; then
        report_success "Bundle size: ${BUNDLE_SIZE_MB}MB (under 5MB target)"
    else
        report_warning "Bundle size: ${BUNDLE_SIZE_MB}MB (over 5MB target)"
    fi
else
    report_warning "Built CLI not found (run 'npm run build')"
fi

echo ""
echo "🎯 Testing CLI functionality..."
if [ -f "dist/cli.js" ]; then
    if timeout 5s node dist/cli.js --version > /dev/null 2>&1; then
        report_success "CLI --version command works"
    else
        report_error "CLI --version command failed or timed out"
    fi
    
    if timeout 5s node dist/cli.js --help > /dev/null 2>&1; then
        report_success "CLI --help command works"
    else
        report_error "CLI --help command failed or timed out"
    fi
else
    report_warning "CLI not built - skipping functionality tests"
fi

echo ""
echo "=================================================="
echo "🏁 Quality Check Summary"
echo "=================================================="

if [ $ERROR_COUNT -eq 0 ]; then
    echo "🎉 ALL QUALITY GATES PASSED!"
    echo "✨ VibeX maintains architectural excellence"
    echo "🚀 Ready for development and deployment"
    exit 0
else
    echo "💥 $ERROR_COUNT CRITICAL ISSUES FOUND"
    echo "🔧 Fix these issues before committing"
    echo "📚 See .cursorrules for detailed guidance"
    exit 1
fi 