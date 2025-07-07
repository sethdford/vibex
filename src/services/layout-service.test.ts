/**
 * Layout Service Tests
 * 
 * Comprehensive test coverage following Gemini CLI standards
 * Tests responsive calculations, edge cases, and terminal dimensions
 */

import { LayoutService, layoutService } from './layout-service.js';
import type { LayoutDimensions, LayoutOptions } from './layout-service.js';

describe('LayoutService', () => {
  let service: LayoutService;
  let originalColumns: number | undefined;
  let originalRows: number | undefined;

  beforeEach(() => {
    service = new LayoutService();
    originalColumns = process.stdout.columns;
    originalRows = process.stdout.rows;
  });

  afterEach(() => {
    // Restore original values
    if (originalColumns !== undefined) {
      process.stdout.columns = originalColumns;
    }
    if (originalRows !== undefined) {
      process.stdout.rows = originalRows;
    }
  });

  describe('Basic Dimension Calculations', () => {
    it('should calculate dimensions with default terminal size', () => {
      process.stdout.columns = 80;
      process.stdout.rows = 24;

      const dimensions = service.calculateDimensions();

      expect(dimensions.terminalWidth).toBe(80);
      expect(dimensions.terminalHeight).toBe(24);
      expect(dimensions.inputWidth).toBe(69); // 80 * 0.9 - 3 = 69
      expect(dimensions.mainAreaWidth).toBe(72); // 80 * 0.9 = 72
      expect(dimensions.debugConsoleMaxHeight).toBe(5); // max(24 * 0.2, 5) = 5
      expect(dimensions.staticExtraHeight).toBe(3);
    });

    it('should use fallback dimensions when terminal size unavailable', () => {
      delete (process.stdout as any).columns;
      delete (process.stdout as any).rows;

      const dimensions = service.calculateDimensions();

      expect(dimensions.terminalWidth).toBe(80);
      expect(dimensions.terminalHeight).toBe(24);
      expect(dimensions.inputWidth).toBeGreaterThan(0);
      expect(dimensions.mainAreaWidth).toBeGreaterThan(0);
    });

    it('should handle large terminal sizes', () => {
      process.stdout.columns = 200;
      process.stdout.rows = 50;

      const dimensions = service.calculateDimensions();

      expect(dimensions.terminalWidth).toBe(200);
      expect(dimensions.terminalHeight).toBe(50);
      expect(dimensions.inputWidth).toBe(177); // 200 * 0.9 - 3
      expect(dimensions.mainAreaWidth).toBe(180); // 200 * 0.9
      expect(dimensions.debugConsoleMaxHeight).toBe(10); // 50 * 0.2
    });

    it('should handle small terminal sizes', () => {
      process.stdout.columns = 40;
      process.stdout.rows = 10;

      const dimensions = service.calculateDimensions();

      expect(dimensions.terminalWidth).toBe(40);
      expect(dimensions.terminalHeight).toBe(10);
      expect(dimensions.inputWidth).toBe(20); // max(40 * 0.9 - 3, 20) = 20
      expect(dimensions.mainAreaWidth).toBe(36); // 40 * 0.9
      expect(dimensions.debugConsoleMaxHeight).toBe(5); // max(10 * 0.2, 5) = 5
    });
  });

  describe('Layout Options', () => {
    beforeEach(() => {
      process.stdout.columns = 100;
      process.stdout.rows = 30;
    });

    it('should apply footer height option', () => {
      const options: LayoutOptions = { footerHeight: 5 };
      const dimensions = service.calculateDimensions(options);

      expect(dimensions.availableTerminalHeight).toBe(22); // 30 - 5 - 3
    });

    it('should apply constrain height option', () => {
      const options: LayoutOptions = { constrainHeight: true, footerHeight: 4 };
      const dimensions = service.calculateDimensions(options);

      expect(dimensions.availableTerminalHeight).toBe(23); // 30 - 4 - 3
    });

    it('should ensure minimum available height', () => {
      const options: LayoutOptions = { footerHeight: 25 }; // Very large footer
      const dimensions = service.calculateDimensions(options);

      expect(dimensions.availableTerminalHeight).toBe(10); // Minimum enforced
    });
  });

  describe('Terminal Size Detection', () => {
    it('should detect small terminals correctly', () => {
      process.stdout.columns = 50;
      process.stdout.rows = 15;

      const dimensions = service.calculateDimensions();
      const isSmall = service.isTerminalTooSmall(dimensions);

      expect(isSmall).toBe(true);
    });

    it('should detect adequate terminals correctly', () => {
      process.stdout.columns = 100;
      process.stdout.rows = 30;

      const dimensions = service.calculateDimensions();
      const isSmall = service.isTerminalTooSmall(dimensions);

      expect(isSmall).toBe(false);
    });

    it('should detect small width but adequate height', () => {
      process.stdout.columns = 50;
      process.stdout.rows = 30;

      const dimensions = service.calculateDimensions();
      const isSmall = service.isTerminalTooSmall(dimensions);

      expect(isSmall).toBe(true); // Width below 60
    });

    it('should detect adequate width but small height', () => {
      process.stdout.columns = 100;
      process.stdout.rows = 15;

      const dimensions = service.calculateDimensions();
      const isSmall = service.isTerminalTooSmall(dimensions);

      expect(isSmall).toBe(true); // Height below 20
    });
  });

  describe('Layout Warnings', () => {
    it('should warn about narrow width', () => {
      process.stdout.columns = 70;
      process.stdout.rows = 30;

      const warnings = service.getLayoutWarnings();

      expect(warnings).toContain('Terminal width (70) is below recommended 80 columns');
    });

    it('should warn about short height', () => {
      process.stdout.columns = 100;
      process.stdout.rows = 20;

      const warnings = service.getLayoutWarnings();

      expect(warnings).toContain('Terminal height (20) is below recommended 24 rows');
    });

    it('should warn about narrow input area', () => {
      process.stdout.columns = 30;
      process.stdout.rows = 30;

      const warnings = service.getLayoutWarnings();

      expect(warnings.some(w => w.includes('Input area may be too narrow'))).toBe(true);
    });

    it('should return no warnings for adequate terminal', () => {
      process.stdout.columns = 120;
      process.stdout.rows = 40;

      const warnings = service.getLayoutWarnings();

      expect(warnings).toHaveLength(0);
    });

    it('should return multiple warnings for very small terminal', () => {
      process.stdout.columns = 40;
      process.stdout.rows = 15;

      const warnings = service.getLayoutWarnings();

      expect(warnings.length).toBeGreaterThan(1);
    });
  });

  describe('Component Height Calculations', () => {
    beforeEach(() => {
      process.stdout.columns = 100;
      process.stdout.rows = 30;
    });

    it('should calculate history component height', () => {
      const height = service.getOptimalContentHeight('history');
      const dimensions = service.calculateDimensions();
      
      expect(height).toBe(Math.floor(dimensions.availableTerminalHeight * 0.7));
    });

    it('should calculate input component height', () => {
      const height = service.getOptimalContentHeight('input');
      
      expect(height).toBe(3); // Fixed height
    });

    it('should calculate dialog component height', () => {
      const height = service.getOptimalContentHeight('dialog');
      const dimensions = service.calculateDimensions();
      
      expect(height).toBe(Math.floor(dimensions.availableTerminalHeight * 0.8));
    });

    it('should calculate debug component height', () => {
      const height = service.getOptimalContentHeight('debug');
      const dimensions = service.calculateDimensions();
      
      expect(height).toBe(dimensions.debugConsoleMaxHeight);
    });

    it('should use default height for unknown component', () => {
      const height = service.getOptimalContentHeight('unknown' as any);
      const dimensions = service.calculateDimensions();
      
      expect(height).toBe(Math.floor(dimensions.availableTerminalHeight * 0.5));
    });
  });

  describe('Font Size Calculations', () => {
    it('should calculate appropriate font sizes for normal terminal', () => {
      process.stdout.columns = 100;
      process.stdout.rows = 30;

      const fontSizes = service.calculateFontSizes();

      expect(fontSizes.normal).toBeGreaterThanOrEqual(12);
      expect(fontSizes.normal).toBeLessThanOrEqual(16);
      expect(fontSizes.small).toBeLessThan(fontSizes.normal);
      expect(fontSizes.large).toBeGreaterThan(fontSizes.normal);
    });

    it('should handle very wide terminals', () => {
      process.stdout.columns = 300;
      process.stdout.rows = 50;

      const fontSizes = service.calculateFontSizes();

      expect(fontSizes.normal).toBeLessThanOrEqual(16); // Capped at 16
      expect(fontSizes.large).toBeLessThanOrEqual(20); // Capped at 20
    });

    it('should handle very narrow terminals', () => {
      process.stdout.columns = 40;
      process.stdout.rows = 20;

      const fontSizes = service.calculateFontSizes();

      expect(fontSizes.normal).toBeGreaterThanOrEqual(12); // Minimum 12
      expect(fontSizes.small).toBeGreaterThanOrEqual(10); // Minimum 10
    });
  });

  describe('Spacing Calculations', () => {
    it('should calculate spacing for large terminals', () => {
      process.stdout.columns = 120;
      process.stdout.rows = 40;

      const spacing = service.getSpacing();

      expect(spacing.marginX).toBe(2);
      expect(spacing.paddingX).toBe(2);
      expect(spacing.marginY).toBe(1);
      expect(spacing.paddingY).toBe(1);
    });

    it('should calculate spacing for normal terminals', () => {
      process.stdout.columns = 80;
      process.stdout.rows = 24;

      const spacing = service.getSpacing();

      expect(spacing.marginX).toBe(1);
      expect(spacing.paddingX).toBe(1);
      expect(spacing.marginY).toBe(1);
      expect(spacing.paddingY).toBe(1);
    });

    it('should ensure minimum spacing values', () => {
      process.stdout.columns = 40;
      process.stdout.rows = 15;

      const spacing = service.getSpacing();

      expect(spacing.marginY).toBeGreaterThanOrEqual(1);
      expect(spacing.paddingY).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle calculation errors gracefully', () => {
      // Mock a calculation error
      const originalGetTerminalWidth = (service as any).getTerminalWidth;
      (service as any).getTerminalWidth = () => {
        throw new Error('Test error');
      };

      const dimensions = service.calculateDimensions();

      // Should return default dimensions
      expect(dimensions.terminalWidth).toBe(80);
      expect(dimensions.terminalHeight).toBe(24);

      // Restore original method
      (service as any).getTerminalWidth = originalGetTerminalWidth;
    });
  });

  describe('Singleton Instance', () => {
    it('should provide singleton instance', () => {
      expect(layoutService).toBeInstanceOf(LayoutService);
    });

    it('should return same instance on multiple accesses', () => {
      const instance1 = layoutService;
      const instance2 = layoutService;
      
      expect(instance1).toBe(instance2);
    });
  });
});