/**
 * Auto Accept Indicator Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AutoAcceptIndicator, ApprovalMode } from '../../../src/ui/components/AutoAcceptIndicator';
import { ThemeProvider } from '../../../src/ui/contexts/ThemeContext';

describe('AutoAcceptIndicator Component', () => {
  it('does not render anything in DEFAULT mode', () => {
    const { container } = render(
      <ThemeProvider>
        <AutoAcceptIndicator approvalMode={ApprovalMode.DEFAULT} />
      </ThemeProvider>
    );
    
    // Component should not render anything in DEFAULT mode
    expect(container.firstChild).toBeNull();
  });
  
  it('renders AUTO-ACCEPT text in AUTO_ACCEPT mode', () => {
    const { getByText } = render(
      <ThemeProvider>
        <AutoAcceptIndicator approvalMode={ApprovalMode.AUTO_ACCEPT} />
      </ThemeProvider>
    );
    
    // Should display AUTO-ACCEPT text
    expect(getByText(/AUTO-ACCEPT/)).toBeTruthy();
  });
  
  it('renders AUTO-REJECT text in AUTO_REJECT mode', () => {
    const { getByText } = render(
      <ThemeProvider>
        <AutoAcceptIndicator approvalMode={ApprovalMode.AUTO_REJECT} />
      </ThemeProvider>
    );
    
    // Should display AUTO-REJECT text
    expect(getByText(/AUTO-REJECT/)).toBeTruthy();
  });
  
  it('uses different styles for different modes', () => {
    const { container: acceptContainer } = render(
      <ThemeProvider>
        <AutoAcceptIndicator approvalMode={ApprovalMode.AUTO_ACCEPT} />
      </ThemeProvider>
    );
    
    const { container: rejectContainer } = render(
      <ThemeProvider>
        <AutoAcceptIndicator approvalMode={ApprovalMode.AUTO_REJECT} />
      </ThemeProvider>
    );
    
    // Containers should have different HTML due to different styles
    expect(acceptContainer.innerHTML).not.toEqual(rejectContainer.innerHTML);
  });
});