#!/bin/bash

# Vibex Full Test Suite Runner
#
# This script runs all tests for the Vibex codebase and generates coverage reports.

# Set colors for output
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
CYAN="\033[0;36m"
NC="\033[0m" # No Color

# Header
echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}  Vibex Full Test Suite Runner       ${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""

# Create output directory for reports
REPORT_DIR="test-reports"
mkdir -p "$REPORT_DIR"

# Function to run tests for a specific module
run_module_tests() {
  local module=$1
  local with_coverage=$2
  
  echo -e "${CYAN}Testing module: ${module}${NC}"
  
  if [ "$with_coverage" = true ]; then
    # Run with coverage
    npx jest --testPathPattern="tests/$module" --coverage --coverageReporters="json-summary" --coverageDirectory="$REPORT_DIR/$module"
  else
    # Run without coverage
    npx jest --testPathPattern="tests/$module"
  fi
  
  return $?
}

# Parse arguments
WITH_COVERAGE=false
MODULES=()

while [[ $# -gt 0 ]]; do
  case $1 in
    --coverage)
      WITH_COVERAGE=true
      shift
      ;;
    --module=*)
      MODULES+=(${1#*=})
      shift
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --coverage        Generate coverage reports"
      echo "  --module=NAME     Run tests only for the specified module"
      echo "  --help            Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# If no specific modules are provided, test all modules
if [ ${#MODULES[@]} -eq 0 ]; then
  # Get all module directories
  for dir in ./tests/*/; do
    if [ -d "$dir" ]; then
      module=$(basename "$dir")
      MODULES+=("$module")
    fi
  done
fi

# Run tests for each module
FAILED_MODULES=()
PASSED_MODULES=()

for module in "${MODULES[@]}"; do
  run_module_tests "$module" $WITH_COVERAGE
  
  if [ $? -eq 0 ]; then
    PASSED_MODULES+=("$module")
  else
    FAILED_MODULES+=("$module")
  fi
  
  echo ""
done

# Run TypeScript checks
echo -e "${BLUE}Running TypeScript checks...${NC}"
npx tsc --noEmit
TS_RESULT=$?

if [ $TS_RESULT -eq 0 ]; then
  echo -e "${GREEN}✅ TypeScript checks passed!${NC}"
else
  echo -e "${RED}❌ TypeScript checks failed!${NC}"
fi

# Print summary
echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}  Test Summary                       ${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""

echo -e "${GREEN}Passed modules: ${#PASSED_MODULES[@]}${NC}"
for module in "${PASSED_MODULES[@]}"; do
  echo -e "${GREEN}✅ $module${NC}"
done

echo ""

if [ ${#FAILED_MODULES[@]} -gt 0 ]; then
  echo -e "${RED}Failed modules: ${#FAILED_MODULES[@]}${NC}"
  for module in "${FAILED_MODULES[@]}"; do
    echo -e "${RED}❌ $module${NC}"
  done
  
  echo ""
  echo -e "${RED}❌ Some tests failed!${NC}"
  exit 1
else
  if [ $TS_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
  else
    echo -e "${RED}❌ TypeScript checks failed!${NC}"
    exit 1
  fi
fi