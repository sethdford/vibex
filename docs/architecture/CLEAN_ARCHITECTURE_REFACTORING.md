# Clean Architecture Refactoring Plan

## Current Analysis of Gemini CLI vs. VibeX Structure

After analyzing both codebases, we've identified that the Gemini CLI project follows a clean architecture approach that VibeX should adopt. This document outlines the key architectural patterns to implement and the refactoring steps needed.

## 1. Key Clean Architecture Principles in Gemini CLI

### Package Structure
Gemini CLI separates code into distinct packages with clear responsibilities:
- `core`: Core business logic and domain models
- `cli`: UI and presentation layer

### Source File Organization
Inside each package, files are organized by feature:
- Source files in `src/feature/component.ts`
- Test files alongside source: `src/feature/component.test.ts`
- Integration tests in `tests/integration/feature.test.ts`
- E2E tests in `tests/e2e/feature.test.ts`

### Dependency Direction
- Dependencies point inward: UI → Application Logic → Domain Models
- Lower layers never depend on higher layers

### Testing Structure
- Unit tests live alongside source code
- Integration tests verify interactions between components
- Clear naming conventions: `<Component>.test.ts`

## 2. VibeX Refactoring Needs

### Architecture Reorganization

#### Current Issues:
- Inconsistent file organization (some feature-based, some layer-based)
- Mixed test organization (some in `tests/`, some in feature directories)
- Unclear dependency boundaries between modules

#### Target Structure:
1. **Core Domain Layer**:
   - Move core business logic to `src/core/`
   - Include domain models and interfaces

2. **Application Layer**:
   - Move application services to `src/services/`
   - Implement use cases that orchestrate domain logic

3. **Infrastructure Layer**:
   - External integrations (Claude API, filesystem, etc.)
   - Move to `src/infrastructure/`

4. **UI Layer**:
   - Keep React components in `src/ui/`
   - Ensure UI only depends on application services, not core domain directly

### Testing Reorganization

1. **Unit Tests**:
   - Move unit tests alongside source files
   - Example: `src/core/turn-manager.ts` → `src/core/turn-manager.test.ts`

2. **Integration Tests**:
   - Place in `tests/integration/` directory
   - Focus on testing component interactions

3. **E2E Tests**:
   - Consolidate in `tests/e2e/` directory
   - Test complete workflows from user perspective

4. **Property Tests**:
   - Place in `tests/property/` directory
   - Test invariants and properties of the system

## 3. Module Mocking Improvements

Current mocking issues need to be addressed:
- Update `fs/promises` mocks to use `importOriginal`
- Fix chalk mocking to provide default export
- Add proper typing for all mocks

## 4. Implementation Plan

### Phase 1: Test Reorganization
1. Run the test reorganization script to move tests alongside source files
2. Fix module mocking issues
3. Update import paths in test files

### Phase 2: Core Architecture Refactoring
1. Identify core domain models and move to `src/core/`
2. Establish clear boundaries between layers
3. Implement interfaces for cross-layer communication

### Phase 3: Service Layer Refactoring
1. Move application services to `src/services/`
2. Ensure services only depend on core domain, not UI

### Phase 4: UI Layer Refactoring
1. Update UI components to consume services
2. Remove direct dependencies on core domain

## 5. Detailed Mapping Examples

### Example: AI Module Refactoring

| Current Location | Target Location | Notes |
|------------------|----------------|-------|
| `src/ai/turn-manager.ts` | `src/core/turn/turn-manager.ts` | Core domain logic |
| `src/ai/claude-content-generator.ts` | `src/infrastructure/claude/content-generator.ts` | External integration |
| `tests/ai/unit/turn-manager.test.ts` | `src/core/turn/turn-manager.test.ts` | Unit test alongside source |
| `tests/ai/integration/turn-manager-content-generator.test.ts` | `tests/integration/turn-content-generator.test.ts` | Integration test |

### Example: UI Module Refactoring

| Current Location | Target Location | Notes |
|------------------|----------------|-------|
| `src/ui/components/LoadingIndicator.tsx` | Same location | UI components stay in ui/ |
| `tests/ui/components/LoadingIndicator.test.tsx` | `src/ui/components/LoadingIndicator.test.tsx` | Test alongside source |

## Next Steps

1. Execute the test reorganization script to align with Gemini standards
2. Fix module mocking issues in tests
3. Begin incremental architecture refactoring, starting with the AI module
4. Update documentation to reflect new architecture

This refactoring will improve code maintainability, testability, and alignment with clean architecture principles as seen in the Gemini CLI reference project.