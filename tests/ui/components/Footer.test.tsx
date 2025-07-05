/**
 * Footer Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react';
import { Footer } from './Footer.js';

describe('Footer Component', () => {
  it('renders footer with model and directory information', () => {
    const { getByText } = render(
      <Footer 
        model="claude-3-7-sonnet"
        targetDir="/users/test/project"
        debugMode={false}
        errorCount={0}
        showErrorDetails={false}
      />
    );
    
    // Should display directory path
    expect(getByText(/\/users\/test\/project/)).toBeTruthy();
    
    // Should display model name (without claude- prefix)
    expect(getByText(/3-7-sonnet/)).toBeTruthy();
  });
  
  it('displays error count when errors are present', () => {
    const { getByText } = render(
      <Footer 
        model="claude-3-7-sonnet"
        targetDir="/users/test/project"
        debugMode={false}
        errorCount={2}
        showErrorDetails={false}
      />
    );
    
    // Should display error count
    expect(getByText(/2 errors/)).toBeTruthy();
  });
  
  it('shows debug indicator when debug mode is enabled', () => {
    const { getByText } = render(
      <Footer 
        model="claude-3-7-sonnet"
        targetDir="/users/test/project"
        debugMode={true}
        errorCount={0}
        showErrorDetails={false}
      />
    );
    
    // Should show debug indicator
    expect(getByText(/debug/)).toBeTruthy();
  });
  
  it('displays token counts when provided', () => {
    const { getByText } = render(
      <Footer 
        model="claude-3-7-sonnet"
        targetDir="/users/test/project"
        debugMode={false}
        errorCount={0}
        showErrorDetails={false}
        promptTokenCount={100}
        candidatesTokenCount={50}
        totalTokenCount={150}
      />
    );
    
    // Should display token counts
    expect(getByText(/tokens: 100\+50=150/)).toBeTruthy();
  });
});