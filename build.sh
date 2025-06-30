#!/bin/bash

# Claude Code Build Script
# This script builds the application and runs tests

set -e  # Exit immediately if a command exits with a non-zero status

echo "📦 Building Claude Code UI..."
echo "=============================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed. Please install Node.js to continue."
  exit 1
fi

# Check if required Node.js packages are installed
echo "🔍 Checking dependencies..."
if [ ! -d "node_modules" ]; then
  echo "📥 Installing dependencies..."
  npm install
fi

# Clean build directory
echo "🧹 Cleaning build directory..."
rm -rf dist/
mkdir -p dist/

# Run linting
echo "🔬 Running linter..."
if ! npm run lint; then
  echo "❌ Linting failed. Please fix the errors and try again."
  exit 1
fi

# Run type checking
echo "✓ Running TypeScript type checking..."
if ! npm run typecheck; then
  echo "❌ Type checking failed. Please fix the errors and try again."
  exit 1
fi

# Run tests
echo "🧪 Running tests..."
if ! npm run test; then
  echo "❌ Tests failed. Please fix the errors and try again."
  exit 1
fi

# Build the application
echo "🔨 Building application..."
npm run build

# Check if the build was successful
if [ $? -ne 0 ]; then
  echo "❌ Build failed."
  exit 1
fi

# Run E2E tests if they exist
if [ -d "src/ui/tests/e2e" ]; then
  echo "🧪 Running E2E tests..."
  npm run test:e2e || {
    echo "❌ E2E tests failed. Please fix the errors and try again."
    exit 1
  }
fi

echo "📊 Running performance tests..."
# This is optional - we'll continue if it fails
npm run test:performance || echo "⚠️  Performance tests failed, but continuing with build."

# Copy necessary files to dist
echo "📝 Copying files..."
cp package.json dist/
cp README.md dist/

# Create a version file
echo "📝 Creating version file..."
VERSION=$(node -e "console.log(require('./package.json').version);")
echo "{\"version\": \"$VERSION\", \"build\": \"$(date +%s)\", \"buildDate\": \"$(date)\"}" > dist/version.json

# Create archives
echo "📦 Creating distribution packages..."
cd dist
zip -r claude-code-ui-$VERSION.zip ./*

echo "✅ Build completed successfully!"
echo "📁 Distribution packages are available in the dist/ directory."
echo "📦 Main package: dist/claude-code-ui-$VERSION.zip"

exit 0