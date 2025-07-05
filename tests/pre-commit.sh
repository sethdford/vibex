#!/bin/bash

# Vibex Pre-Commit Test Script
#
# This script runs tests for modified modules before each commit to ensure
# test coverage and code quality is maintained.

# Set colors for output
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
CYAN="\033[0;36m"
NC="\033[0m" # No Color

# Header
echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}  Vibex Pre-Commit Tests             ${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""

# Check if we're in a git repository
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  echo -e "${RED}Error: Not in a git repository${NC}"
  exit 1
fi

# Get the changed files
changed_files=$(git diff --name-only --cached)

if [ -z "$changed_files" ]; then
  echo -e "${YELLOW}No files changed. Skipping tests.${NC}"
  exit 0
fi

echo -e "${CYAN}Changed files:${NC}"
echo "$changed_files"
echo ""

# Identify which modules have changes
modules=()
if echo "$changed_files" | grep -q "src/ai/"; then
  modules+=("ai")
fi
if echo "$changed_files" | grep -q "src/auth/"; then
  modules+=("auth")
fi
if echo "$changed_files" | grep -q "src/commands/"; then
  modules+=("commands")
fi
if echo "$changed_files" | grep -q "src/config/"; then
  modules+=("config")
fi
if echo "$changed_files" | grep -q "src/errors/"; then
  modules+=("errors")
fi
if echo "$changed_files" | grep -q "src/execution/"; then
  modules+=("execution")
fi
if echo "$changed_files" | grep -q "src/fileops/"; then
  modules+=("fileops")
fi
if echo "$changed_files" | grep -q "src/fs/"; then
  modules+=("fs")
fi
if echo "$changed_files" | grep -q "src/memory/"; then
  modules+=("memory")
fi
if echo "$changed_files" | grep -q "src/security/"; then
  modules+=("security")
fi
if echo "$changed_files" | grep -q "src/services/"; then
  modules+=("services")
fi
if echo "$changed_files" | grep -q "src/settings/"; then
  modules+=("settings")
fi
if echo "$changed_files" | grep -q "src/telemetry/"; then
  modules+=("telemetry")
fi
if echo "$changed_files" | grep -q "src/terminal/"; then
  modules+=("terminal")
fi
if echo "$changed_files" | grep -q "src/themes/"; then
  modules+=("themes")
fi
if echo "$changed_files" | grep -q "src/tools/"; then
  modules+=("tools")
fi
if echo "$changed_files" | grep -q "src/ui/"; then
  modules+=("ui")
fi
if echo "$changed_files" | grep -q "src/utils/"; then
  modules+=("utils")
fi

# If no specific module changes detected, run core tests
if [ ${#modules[@]} -eq 0 ]; then
  echo -e "${YELLOW}No specific module changes detected. Running core tests.${NC}"
  modules+=("utils" "config")
fi

# Run tests for changed modules
echo -e "${BLUE}Running tests for changed modules...${NC}"
failed_modules=()

for module in "${modules[@]}"; do
  echo -e "${CYAN}Testing module: ${module}${NC}"
  
  # If it's the AI module and has a specialized test script, use that
  if [ "$module" == "ai" ] && [ -f "./src/ai/pre-commit-test.sh" ]; then
    echo -e "${YELLOW}Running AI module specialized tests...${NC}"
    bash ./src/ai/pre-commit-test.sh
    test_result=$?
  else
    # Check if there are any tests for this module
    if [ -d "./tests/$module" ]; then
      echo -e "${YELLOW}Running tests for $module module...${NC}"
      npx jest --testPathPattern="tests/$module"
      test_result=$?
    else
      echo -e "${YELLOW}No tests found for $module module. Skipping.${NC}"
      test_result=0
    fi
  fi
  
  # Check test result
  if [ $test_result -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed for $module module!${NC}"
  else
    echo -e "${RED}❌ Tests failed for $module module!${NC}"
    failed_modules+=("$module")
  fi
  
  echo ""
done

# Run TypeScript checks
echo -e "${BLUE}Running TypeScript checks...${NC}"
npx tsc --noEmit
ts_result=$?

if [ $ts_result -eq 0 ]; then
  echo -e "${GREEN}✅ TypeScript checks passed!${NC}"
else
  echo -e "${RED}❌ TypeScript checks failed! Please fix the type issues before committing.${NC}"
  exit 1
fi

# Check if any module tests failed
if [ ${#failed_modules[@]} -gt 0 ]; then
  echo -e "${RED}❌ Tests failed for the following modules: ${failed_modules[*]}${NC}"
  echo -e "${YELLOW}Please fix the failing tests before committing.${NC}"
  exit 1
fi

# Success message
echo -e "${GREEN}✅ All pre-commit checks passed!${NC}"
exit 0