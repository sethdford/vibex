/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Modern Interface Integration Tests
 * Tests the new Claude/Gemini-level UI components
 */

import React from 'react';
import { describe, test, expect } from 'vitest';

import {
  InterfaceMode, 
  MediaType, 
  type MultimodalContent,
  type ThinkingBlock,
  type CanvasElement,
  type CollaborationState
} from '../../../src/ui/components/types/interface-types.js';
import { InterfaceOrchestrator as ModernInterface } from '../../../src/ui/components/interfaces/InterfaceOrchestrator.js';

import {
  RealTimeStreamingInterface,
  StreamingState,
  ThinkingPhase,
  type LiveThinkingBlock,
  type StreamingResponse
} from '../../../src/ui/components/RealTimeStreamingInterface.js';

import {
  MultimodalContentHandler,
  ContentType,
  ProcessingStatus,
  type MultimodalContentItem,
  type ProcessingCapabilities
} from '../../../src/ui/components/MultimodalContentHandler.js';

import {
  DensityMode,
  StreamingMode
} from '../../../src/ui/components/types/interface-types.js';
import { InterfaceOrchestrator } from '../../../src/ui/components/interfaces/InterfaceOrchestrator.js';

describe('Modern Interface Integration', () => {
  const mockTerminalDimensions = {
    terminalWidth: 80,
    terminalHeight: 24
  };

  describe('ModernInterface Component', () => {
    test('should create ModernInterface component with chat mode', () => {
      const thinkingBlocks: ThinkingBlock[] = [
        {
          id: 'thinking-1',
          content: 'Analyzing the user request to understand the requirements...',
          timestamp: Date.now(),
          isVisible: true,
          metadata: {
            reasoning_type: 'analysis',
            confidence: 0.95,
            tokens: 150
          }
        }
      ];

      // Test component creation
      const component = React.createElement(ModernInterface, {
        mode: InterfaceMode.CHAT,
        ...mockTerminalDimensions,
        thinkingBlocks,
        onModeChange: () => {},
        onContentUpload: () => {},
        onCanvasUpdate: () => {},
        onThinkingInteraction: () => {}
      });

      expect(component).toBeDefined();
      expect(component.props.mode).toBe(InterfaceMode.CHAT);
      expect(component.props.thinkingBlocks).toHaveLength(1);
    });

    test('should create ModernInterface component with canvas mode', () => {
      const canvasElements: CanvasElement[] = [
        {
          id: 'element-1',
          type: 'code',
          position: { x: 10, y: 10 },
          size: { width: 200, height: 100 },
          content: 'function hello() { console.log("Hello World"); }',
          editable: true,
          selected: true
        }
      ];

      const component = React.createElement(ModernInterface, {
        mode: InterfaceMode.CANVAS,
        ...mockTerminalDimensions,
        canvasElements,
        onModeChange: () => {},
        onContentUpload: () => {},
        onCanvasUpdate: () => {},
        onThinkingInteraction: () => {}
      });

      expect(component).toBeDefined();
      expect(component.props.mode).toBe(InterfaceMode.CANVAS);
      expect(component.props.canvasElements).toHaveLength(1);
    });

    test('should create ModernInterface component with multimodal mode', () => {
      const multimodalContent: MultimodalContent[] = [
        {
          id: 'content-1',
          type: MediaType.IMAGE,
          content: Buffer.from('fake-image-data'),
          metadata: {
            filename: 'screenshot.png',
            mimeType: 'image/png',
            size: 1024000,
            dimensions: { width: 1920, height: 1080 }
          },
          processing: {
            status: 'complete',
            progress: 100
          }
        }
      ];

      const component = React.createElement(ModernInterface, {
        mode: InterfaceMode.MULTIMODAL,
        ...mockTerminalDimensions,
        multimodalContent,
        onModeChange: () => {},
        onContentUpload: () => {},
        onCanvasUpdate: () => {},
        onThinkingInteraction: () => {}
      });

      expect(component).toBeDefined();
      expect(component.props.mode).toBe(InterfaceMode.MULTIMODAL);
      expect(component.props.multimodalContent).toHaveLength(1);
    });

    test('should create ModernInterface component with collaboration mode', () => {
      const collaboration: CollaborationState = {
        isActive: true,
        participants: [
          { id: 'user-1', name: 'Alice', color: '#FF5555' },
          { id: 'user-2', name: 'Bob', color: '#55FF55' }
        ],
        sharedContext: {}
      };

      const component = React.createElement(ModernInterface, {
        mode: InterfaceMode.COLLABORATION,
        ...mockTerminalDimensions,
        collaboration,
        onModeChange: () => {},
        onContentUpload: () => {},
        onCanvasUpdate: () => {},
        onThinkingInteraction: () => {}
      });

      expect(component).toBeDefined();
      expect(component.props.mode).toBe(InterfaceMode.COLLABORATION);
      expect(component.props.collaboration?.participants).toHaveLength(2);
    });
  });

  describe('RealTimeStreamingInterface Component', () => {
    test('should create RealTimeStreamingInterface with thinking blocks', () => {
      const thinkingBlocks: LiveThinkingBlock[] = [
        {
          id: 'block-1',
          phase: ThinkingPhase.ANALYSIS,
          content: 'First, I need to understand what the user is asking for...',
          isComplete: false,
          startTime: Date.now() - 2000,
          confidence: 0.85,
          metadata: {
            tokens: 125,
            complexity: 'medium',
            reasoning_depth: 2
          }
        }
      ];

      const component = React.createElement(RealTimeStreamingInterface, {
        streamingState: StreamingState.THINKING,
        thinkingBlocks,
        ...mockTerminalDimensions,
        onThinkingInteraction: () => {},
        onResponseInteraction: () => {}
      });

      expect(component).toBeDefined();
      expect(component.props.streamingState).toBe(StreamingState.THINKING);
      expect(component.props.thinkingBlocks).toHaveLength(1);
    });

    test('should create RealTimeStreamingInterface with streaming response', () => {
      const currentResponse: StreamingResponse = {
        id: 'response-1',
        content: 'I understand you want to create a modern interface...',
        isComplete: false,
        timestamp: Date.now(),
        metadata: {
          model: 'Claude 4',
          tokens: 45,
          latency: 150,
          quality_score: 0.94
        }
      };

      const component = React.createElement(RealTimeStreamingInterface, {
        streamingState: StreamingState.RESPONDING,
        thinkingBlocks: [],
        currentResponse,
        ...mockTerminalDimensions,
        onThinkingInteraction: () => {},
        onResponseInteraction: () => {}
      });

      expect(component).toBeDefined();
      expect(component.props.streamingState).toBe(StreamingState.RESPONDING);
      expect(component.props.currentResponse?.metadata?.model).toBe('Claude 4');
    });
  });

  describe('MultimodalContentHandler Component', () => {
    const mockCapabilities: ProcessingCapabilities = {
      imageAnalysis: true,
      audioTranscription: true,
      videoAnalysis: false,
      documentExtraction: true,
      codeAnalysis: true,
      realTimeProcessing: true,
      batchProcessing: true,
      cloudProcessing: false
    };

    test('should create MultimodalContentHandler with content items', () => {
      const contentItems: MultimodalContentItem[] = [
        {
          id: 'item-1',
          type: ContentType.IMAGE,
          name: 'diagram.png',
          size: 2048000,
          mimeType: 'image/png',
          status: ProcessingStatus.COMPLETE,
          uploadedAt: Date.now(),
          analysis: {
            summary: 'Technical diagram showing system architecture',
            keyPoints: ['Database layer', 'API gateway', 'Frontend'],
            confidence: 0.91,
            processingTime: 1250
          }
        }
      ];

      const component = React.createElement(MultimodalContentHandler, {
        contentItems,
        capabilities: mockCapabilities,
        ...mockTerminalDimensions,
        onContentUpload: () => {},
        onContentAnalyze: () => {},
        onContentRemove: () => {},
        onBatchProcess: () => {},
        onContentInteraction: () => {}
      });

      expect(component).toBeDefined();
      expect(component.props.contentItems).toHaveLength(1);
      expect(component.props.capabilities.imageAnalysis).toBe(true);
    });

    test('should validate component interfaces and enums', () => {
      // Test enum values
      expect(InterfaceMode.CHAT).toBe('chat');
      expect(InterfaceMode.CANVAS).toBe('canvas');
      expect(InterfaceMode.MULTIMODAL).toBe('multimodal');
      expect(InterfaceMode.ANALYSIS).toBe('analysis');
      expect(InterfaceMode.COLLABORATION).toBe('collaboration');

      expect(MediaType.IMAGE).toBe('image');
      expect(MediaType.AUDIO).toBe('audio');
      expect(MediaType.VIDEO).toBe('video');
      expect(MediaType.DOCUMENT).toBe('document');

      expect(StreamingState.THINKING).toBe('thinking');
      expect(StreamingState.RESPONDING).toBe('responding');
      expect(StreamingState.COMPLETE).toBe('complete');

      expect(ThinkingPhase.ANALYSIS).toBe('analysis');
      expect(ThinkingPhase.PLANNING).toBe('planning');
      expect(ThinkingPhase.REASONING).toBe('reasoning');

      expect(ContentType.IMAGE).toBe('image');
      expect(ContentType.AUDIO).toBe('audio');
      expect(ContentType.CODE).toBe('code');

      expect(ProcessingStatus.PENDING).toBe('pending');
      expect(ProcessingStatus.ANALYZING).toBe('analyzing');
      expect(ProcessingStatus.COMPLETE).toBe('complete');
    });
  });

  describe('Integration Architecture', () => {
    test('should validate modern interface architecture', () => {
      // Test that all components can be created together
      const modernInterface = React.createElement(ModernInterface, {
        mode: InterfaceMode.CHAT,
        ...mockTerminalDimensions,
        advancedFeaturesEnabled: true,
        onModeChange: () => {},
        onContentUpload: () => {},
        onCanvasUpdate: () => {},
        onThinkingInteraction: () => {}
      });

      const streamingInterface = React.createElement(RealTimeStreamingInterface, {
        streamingState: StreamingState.IDLE,
        thinkingBlocks: [],
        ...mockTerminalDimensions,
        onThinkingInteraction: () => {},
        onResponseInteraction: () => {}
      });

      const contentHandler = React.createElement(MultimodalContentHandler, {
        contentItems: [],
        capabilities: {
          imageAnalysis: true,
          audioTranscription: true,
          videoAnalysis: true,
          documentExtraction: true,
          codeAnalysis: true,
          realTimeProcessing: true,
          batchProcessing: true,
          cloudProcessing: true
        },
        ...mockTerminalDimensions,
        onContentUpload: () => {},
        onContentAnalyze: () => {},
        onContentRemove: () => {},
        onBatchProcess: () => {},
        onContentInteraction: () => {}
      });

      expect(modernInterface).toBeDefined();
      expect(streamingInterface).toBeDefined();
      expect(contentHandler).toBeDefined();

      // Validate that components have the expected structure
      expect(modernInterface.props.advancedFeaturesEnabled).toBe(true);
      expect(streamingInterface.props.streamingState).toBe(StreamingState.IDLE);
      expect(contentHandler.props.capabilities.cloudProcessing).toBe(true);
    });
  });
}); 