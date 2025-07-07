/**
 * Phase Lifecycle Service Tests - Professional Testing like Gemini CLI
 * 
 * Comprehensive test coverage for phase lifecycle management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PhaseLifecycleService, PhaseType, PhaseStatus, type PhaseLifecycleConfig } from './phase-lifecycle-service.js';

describe('PhaseLifecycleService', () => {
  let service: PhaseLifecycleService;
  let config: PhaseLifecycleConfig;

  beforeEach(() => {
    config = {
      maxConcurrentPhases: 3,
      defaultPhaseDuration: 30,
      enableAutoTransitions: true,
      completionThreshold: 80,
      healthCheckInterval: 60
    };
    service = new PhaseLifecycleService(config);
  });

  afterEach(async () => {
    await service.cleanup();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const result = await service.initialize();
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.timing).toBeDefined();
      expect(result.timing!.duration).toBeGreaterThan(0);
    });

    it('should handle double initialization gracefully', async () => {
      await service.initialize();
      const result = await service.initialize();
      
      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Service already initialized');
    });

    it('should validate configuration on creation', () => {
      expect(() => new PhaseLifecycleService({
        ...config,
        maxConcurrentPhases: 0
      })).toThrow('maxConcurrentPhases must be at least 1');
    });
  });

  describe('Phase Creation', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should create a problem discovery phase successfully', async () => {
      const result = await service.createPhase('product-1', PhaseType.PROBLEM_DISCOVERY);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.type).toBe(PhaseType.PROBLEM_DISCOVERY);
      expect(result.data!.status).toBe(PhaseStatus.NOT_STARTED);
      expect(result.data!.productId).toBe('product-1');
      expect(result.data!.name).toBe('Problem Discovery');
    });

    it('should create a solution discovery phase successfully', async () => {
      const result = await service.createPhase('product-1', PhaseType.SOLUTION_DISCOVERY);
      
      expect(result.success).toBe(true);
      expect(result.data!.type).toBe(PhaseType.SOLUTION_DISCOVERY);
      expect(result.data!.name).toBe('Solution Discovery');
    });

    it('should create a delivery support phase successfully', async () => {
      const result = await service.createPhase('product-1', PhaseType.DELIVERY_SUPPORT);
      
      expect(result.success).toBe(true);
      expect(result.data!.type).toBe(PhaseType.DELIVERY_SUPPORT);
      expect(result.data!.name).toBe('Delivery & Support');
    });

    it('should respect concurrent phase limits', async () => {
      // Create maximum allowed concurrent phases
      for (let i = 0; i < config.maxConcurrentPhases; i++) {
        const createResult = await service.createPhase('product-1', PhaseType.PROBLEM_DISCOVERY);
        expect(createResult.success).toBe(true);
        
        const startResult = await service.startPhase(createResult.data!.id);
        expect(startResult.success).toBe(true);
      }

      // Try to create one more - should fail
      const result = await service.createPhase('product-1', PhaseType.PROBLEM_DISCOVERY);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum concurrent phases');
    });

    it('should accept custom phase options', async () => {
      const customOptions = {
        name: 'Custom Phase Name',
        description: 'Custom phase description',
        objectives: [{
          id: 'obj-1',
          name: 'Custom Objective',
          required: true,
          status: 'not_started' as const,
          progress: 0
        }]
      };

      const result = await service.createPhase('product-1', PhaseType.PROBLEM_DISCOVERY, customOptions);
      
      expect(result.success).toBe(true);
      expect(result.data!.name).toBe('Custom Phase Name');
      expect(result.data!.description).toBe('Custom phase description');
      expect(result.data!.objectives).toHaveLength(1);
      expect(result.data!.objectives[0].name).toBe('Custom Objective');
    });

    it('should fail when service not initialized', async () => {
      const uninitializedService = new PhaseLifecycleService(config);
      const result = await uninitializedService.createPhase('product-1', PhaseType.PROBLEM_DISCOVERY);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Service not initialized');
    });
  });

  describe('Phase Lifecycle', () => {
    let phaseId: string;

    beforeEach(async () => {
      await service.initialize();
      const result = await service.createPhase('product-1', PhaseType.PROBLEM_DISCOVERY);
      phaseId = result.data!.id;
    });

    it('should start a phase successfully', async () => {
      const result = await service.startPhase(phaseId);
      
      expect(result.success).toBe(true);
      expect(result.data!.status).toBe(PhaseStatus.IN_PROGRESS);
      expect(result.data!.startDate).toBeInstanceOf(Date);
    });

    it('should prevent starting already started phase', async () => {
      await service.startPhase(phaseId);
      const result = await service.startPhase(phaseId);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot be started from status');
    });

    it('should complete a phase when criteria are met', async () => {
      await service.startPhase(phaseId);
      
      // Mock completion criteria being met
      const phase = service.getPhase(phaseId)!;
      phase.criteria = [{
        name: 'Test Criteria',
        description: 'Test completion criteria',
        weight: 1.0,
        achieved: true,
        score: 85
      }];
      
      const result = await service.completePhase(phaseId);
      
      expect(result.success).toBe(true);
      expect(result.data!.status).toBe(PhaseStatus.COMPLETED);
      expect(result.data!.endDate).toBeInstanceOf(Date);
    });

    it('should prevent completion when criteria not met', async () => {
      await service.startPhase(phaseId);
      
      // Set low completion criteria
      const phase = service.getPhase(phaseId)!;
      phase.criteria = [{
        name: 'Test Criteria',
        description: 'Test completion criteria',
        weight: 1.0,
        achieved: false,
        score: 50 // Below threshold
      }];
      
      const result = await service.completePhase(phaseId);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Completion criteria not met');
    });

    it('should cancel a phase with reason', async () => {
      const reason = 'Business priorities changed';
      const result = await service.cancelPhase(phaseId, reason);
      
      expect(result.success).toBe(true);
      expect(result.data!.status).toBe(PhaseStatus.CANCELLED);
      expect(result.data!.endDate).toBeInstanceOf(Date);
      expect(result.data!.insights).toHaveLength(1);
      expect(result.data!.insights[0].description).toContain(reason);
    });

    it('should prevent cancelling completed phase', async () => {
      await service.startPhase(phaseId);
      
      // Force completion
      const phase = service.getPhase(phaseId)!;
      phase.status = PhaseStatus.COMPLETED;
      
      const result = await service.cancelPhase(phaseId, 'Test reason');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot cancel completed phase');
    });
  });

  describe('Phase Dependencies', () => {
    let phase1Id: string;
    let phase2Id: string;

    beforeEach(async () => {
      await service.initialize();
      
      const result1 = await service.createPhase('product-1', PhaseType.PROBLEM_DISCOVERY);
      phase1Id = result1.data!.id;
      
      const result2 = await service.createPhase('product-1', PhaseType.SOLUTION_DISCOVERY, {
        dependencies: [phase1Id]
      });
      phase2Id = result2.data!.id;
    });

    it('should prevent starting phase with unmet dependencies', async () => {
      const result = await service.startPhase(phase2Id);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Dependencies not met');
    });

    it('should allow starting phase when dependencies are completed', async () => {
      // Complete dependency first
      await service.startPhase(phase1Id);
      const phase1 = service.getPhase(phase1Id)!;
      phase1.status = PhaseStatus.COMPLETED;
      
      const result = await service.startPhase(phase2Id);
      
      expect(result.success).toBe(true);
      expect(result.data!.status).toBe(PhaseStatus.IN_PROGRESS);
    });
  });

  describe('Phase Queries', () => {
    beforeEach(async () => {
      await service.initialize();
      
      // Create phases for different products and statuses
      await service.createPhase('product-1', PhaseType.PROBLEM_DISCOVERY);
      await service.createPhase('product-1', PhaseType.SOLUTION_DISCOVERY);
      await service.createPhase('product-2', PhaseType.PROBLEM_DISCOVERY);
    });

    it('should get phase by ID', () => {
      const phases = service.getPhasesByProduct('product-1');
      const phase = service.getPhase(phases[0].id);
      
      expect(phase).toBeDefined();
      expect(phase!.id).toBe(phases[0].id);
    });

    it('should return undefined for non-existent phase', () => {
      const phase = service.getPhase('non-existent-id');
      expect(phase).toBeUndefined();
    });

    it('should get phases by product ID', () => {
      const product1Phases = service.getPhasesByProduct('product-1');
      const product2Phases = service.getPhasesByProduct('product-2');
      
      expect(product1Phases).toHaveLength(2);
      expect(product2Phases).toHaveLength(1);
      expect(product1Phases.every(p => p.productId === 'product-1')).toBe(true);
      expect(product2Phases.every(p => p.productId === 'product-2')).toBe(true);
    });

    it('should get phases by status', () => {
      const notStartedPhases = service.getPhasesByStatus(PhaseStatus.NOT_STARTED);
      const inProgressPhases = service.getPhasesByStatus(PhaseStatus.IN_PROGRESS);
      
      expect(notStartedPhases).toHaveLength(3);
      expect(inProgressPhases).toHaveLength(0);
      expect(notStartedPhases.every(p => p.status === PhaseStatus.NOT_STARTED)).toBe(true);
    });
  });

  describe('Event Emission', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should emit phase-created event', async () => {
      const eventSpy = vi.fn();
      service.on('phase-created', eventSpy);
      
      await service.createPhase('product-1', PhaseType.PROBLEM_DISCOVERY);
      
      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: PhaseType.PROBLEM_DISCOVERY,
        status: PhaseStatus.NOT_STARTED
      }));
    });

    it('should emit phase-started event', async () => {
      const eventSpy = vi.fn();
      service.on('phase-started', eventSpy);
      
      const createResult = await service.createPhase('product-1', PhaseType.PROBLEM_DISCOVERY);
      await service.startPhase(createResult.data!.id);
      
      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        status: PhaseStatus.IN_PROGRESS
      }));
    });

    it('should emit phase-completed event', async () => {
      const eventSpy = vi.fn();
      service.on('phase-completed', eventSpy);
      
      const createResult = await service.createPhase('product-1', PhaseType.PROBLEM_DISCOVERY);
      await service.startPhase(createResult.data!.id);
      
      // Set up completion criteria
      const phase = service.getPhase(createResult.data!.id)!;
      phase.criteria = [{
        name: 'Test Criteria',
        description: 'Test',
        weight: 1.0,
        achieved: true,
        score: 85
      }];
      
      await service.completePhase(createResult.data!.id);
      
      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        status: PhaseStatus.COMPLETED
      }));
    });

    it('should emit transition-ready event for auto-transitions', async () => {
      const eventSpy = vi.fn();
      service.on('transition-ready', eventSpy);
      
      const createResult = await service.createPhase('product-1', PhaseType.PROBLEM_DISCOVERY);
      await service.startPhase(createResult.data!.id);
      
      // Set up completion criteria
      const phase = service.getPhase(createResult.data!.id)!;
      phase.criteria = [{
        name: 'Test Criteria',
        description: 'Test',
        weight: 1.0,
        achieved: true,
        score: 85
      }];
      
      await service.completePhase(createResult.data!.id);
      
      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: PhaseType.PROBLEM_DISCOVERY }),
        PhaseType.SOLUTION_DISCOVERY
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should handle errors gracefully and emit error events', async () => {
      const errorSpy = vi.fn();
      service.on('error', errorSpy);
      
      // Try to start non-existent phase
      const result = await service.startPhase('non-existent-id');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });

    it('should include timing information in error results', async () => {
      const result = await service.startPhase('non-existent-id');
      
      expect(result.timing).toBeDefined();
      expect(result.timing!.startTime).toBeTypeOf('number');
      expect(result.timing!.endTime).toBeTypeOf('number');
      expect(result.timing!.duration).toBeGreaterThan(0);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources properly', async () => {
      await service.initialize();
      
      const createResult = await service.createPhase('product-1', PhaseType.PROBLEM_DISCOVERY);
      expect(service.getPhase(createResult.data!.id)).toBeDefined();
      
      await service.cleanup();
      
      expect(service.getPhase(createResult.data!.id)).toBeUndefined();
    });

    it('should remove all event listeners on cleanup', async () => {
      await service.initialize();
      
      const eventSpy = vi.fn();
      service.on('phase-created', eventSpy);
      
      await service.cleanup();
      
      // Try to create phase after cleanup - should not emit events
      try {
        await service.createPhase('product-1', PhaseType.PROBLEM_DISCOVERY);
      } catch {
        // Expected to fail since service is cleaned up
      }
      
      expect(eventSpy).not.toHaveBeenCalled();
    });
  });
}); 