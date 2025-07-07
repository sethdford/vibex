/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi } from 'vitest';
import { MCPToolConfirmation } from '../MCPToolConfirmation';
import { ToolConfirmationOutcome } from '../../../../core/domain/tool/tool-interfaces';

describe('MCPToolConfirmation', () => {
  it('renders correctly with basic props', () => {
    const onConfirm = vi.fn();
    const confirmationDetails = {
      type: 'warning',
      title: 'Test MCP Tool',
      description: 'Allow execution of this MCP tool?',
      params: {
        query: 'test query'
      }
    };
    
    const { lastFrame } = render(
      <MCPToolConfirmation
        confirmationDetails={confirmationDetails}
        serverName="test-server"
        onConfirm={onConfirm}
      />
    );
    
    expect(lastFrame()).toContain('Test MCP Tool');
    expect(lastFrame()).toContain('Allow execution of this MCP tool?');
    expect(lastFrame()).toContain('Server: test-server');
    expect(lastFrame()).toContain('query:');
    expect(lastFrame()).toContain('test query');
  });
  
  it('shows tool definition details when provided', () => {
    const onConfirm = vi.fn();
    const confirmationDetails = {
      type: 'warning',
      title: 'Test MCP Tool',
      description: 'Allow execution?'
    };
    
    const toolDefinition = {
      name: 'test-tool',
      description: 'This is a test tool for MCP',
      input_schema: {
        type: 'object',
        properties: {}
      }
    };
    
    const { lastFrame } = render(
      <MCPToolConfirmation
        confirmationDetails={confirmationDetails}
        serverName="test-server"
        toolDefinition={toolDefinition}
        onConfirm={onConfirm}
      />
    );
    
    expect(lastFrame()).toContain('Tool: test-tool');
    expect(lastFrame()).toContain('This is a test tool for MCP');
  });
  
  it('shows all option buttons', () => {
    const onConfirm = vi.fn();
    const confirmationDetails = {
      type: 'warning',
      title: 'Test MCP Tool',
      description: 'Allow execution?'
    };
    
    const { lastFrame } = render(
      <MCPToolConfirmation
        confirmationDetails={confirmationDetails}
        serverName="test-server"
        onConfirm={onConfirm}
      />
    );
    
    expect(lastFrame()).toContain('Yes, allow once');
    expect(lastFrame()).toContain('Yes, always allow this tool');
    expect(lastFrame()).toContain('Yes, always allow all tools');
    expect(lastFrame()).toContain('No, cancel');
  });
  
  it('shows security notice', () => {
    const onConfirm = vi.fn();
    const confirmationDetails = {
      type: 'warning',
      title: 'Test MCP Tool',
      description: 'Allow execution?'
    };
    
    const { lastFrame } = render(
      <MCPToolConfirmation
        confirmationDetails={confirmationDetails}
        serverName="test-server"
        onConfirm={onConfirm}
      />
    );
    
    expect(lastFrame()).toContain('MCP tools execute code on remote servers');
    expect(lastFrame()).toContain('Only approve tools from trusted sources');
  });
});