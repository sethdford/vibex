/**
 * Tool Confirmation Dialog Component Tests
 */

import React from 'react';
import { render } from 'ink-testing-library';
import { ToolConfirmationDialog, ConfirmationType, TrustLevel } from './ToolConfirmationDialog';

describe('ToolConfirmationDialog', () => {
  // Test props
  const testProps = {
    toolName: 'test_tool',
    toolNamespace: 'testing',
    toolDescription: 'A tool for testing',
    parameters: { param1: 'value1', param2: 42 },
    confirmationType: ConfirmationType.INFO,
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dialog with tool information correctly', () => {
    const { lastFrame } = render(
      <ToolConfirmationDialog {...testProps} />
    );

    expect(lastFrame()).toContain('Confirm Tool Execution');
    expect(lastFrame()).toContain('testing:test_tool');
    expect(lastFrame()).toContain('A tool for testing');
  });

  it('renders parameters section correctly', () => {
    const { lastFrame } = render(
      <ToolConfirmationDialog {...testProps} />
    );

    expect(lastFrame()).toContain('Parameters:');
    expect(lastFrame()).toContain('param1');
    expect(lastFrame()).toContain('value1');
    expect(lastFrame()).toContain('42');
  });

  it('renders preview content when provided', () => {
    const { lastFrame } = render(
      <ToolConfirmationDialog
        {...testProps}
        previewContent="This is a preview of the operation"
      />
    );

    expect(lastFrame()).toContain('Preview:');
    expect(lastFrame()).toContain('This is a preview of the operation');
  });

  it('renders options section with correct options for INFO type', () => {
    const { lastFrame } = render(
      <ToolConfirmationDialog {...testProps} />
    );

    expect(lastFrame()).toContain('Options:');
    expect(lastFrame()).toContain('[y]');
    expect(lastFrame()).toContain('Yes');
    expect(lastFrame()).toContain('[a]');
    expect(lastFrame()).toContain('Always');
    expect(lastFrame()).toContain('[e]');
    expect(lastFrame()).toContain('Edit');
    expect(lastFrame()).toContain('[n]');
    expect(lastFrame()).toContain('No');
  });

  it('renders different options for EDIT confirmation type', () => {
    const { lastFrame } = render(
      <ToolConfirmationDialog
        {...testProps}
        confirmationType={ConfirmationType.EDIT}
      />
    );

    expect(lastFrame()).toContain('Confirm File Edit');
    expect(lastFrame()).toContain('[p]');
    expect(lastFrame()).toContain('Pattern');
  });

  it('renders different options for SENSITIVE confirmation type', () => {
    const { lastFrame } = render(
      <ToolConfirmationDialog
        {...testProps}
        confirmationType={ConfirmationType.SENSITIVE}
      />
    );

    expect(lastFrame()).toContain('Security Warning');
    // Should not contain the "Always" option
    expect(lastFrame()).not.toContain('[a]');
    expect(lastFrame()).not.toContain('Always');
  });

  it('uses appropriate color based on confirmation type', () => {
    // Different confirmation types use different colors
    // This is harder to test visually, but we can check for title text
    
    const { lastFrame: frameForEdit } = render(
      <ToolConfirmationDialog
        {...testProps}
        confirmationType={ConfirmationType.EDIT}
      />
    );
    expect(frameForEdit()).toContain('Confirm File Edit');
    
    const { lastFrame: frameForExec } = render(
      <ToolConfirmationDialog
        {...testProps}
        confirmationType={ConfirmationType.EXEC}
      />
    );
    expect(frameForExec()).toContain('Confirm Command Execution');
    
    const { lastFrame: frameForSensitive } = render(
      <ToolConfirmationDialog
        {...testProps}
        confirmationType={ConfirmationType.SENSITIVE}
      />
    );
    expect(frameForSensitive()).toContain('Security Warning');
  });
});