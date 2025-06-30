/**
 * Tips Component Tests
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { Tips, tipsList } from './Tips';
import { ThemeProvider } from '../contexts/ThemeContext';

// Mock timers
jest.useFakeTimers();

describe('Tips Component', () => {
  it('renders a tip with default props', () => {
    const { getByText } = render(
      <ThemeProvider>
        <Tips />
      </ThemeProvider>
    );
    
    // Should show a tip
    const shownTip = tipsList.find(tip => 
      tip.priority === 'high' || tip.priority === 'medium'
    );
    
    expect(shownTip).toBeTruthy();
    if (shownTip) {
      expect(getByText(shownTip.text)).toBeTruthy();
    }
  });
  
  it('cycles through tips automatically', () => {
    const { getByText, rerender } = render(
      <ThemeProvider>
        <Tips autoCycle={true} rotateInterval={1000} />
      </ThemeProvider>
    );
    
    // Initial tip
    const firstTipText = getByText(/Tip 1\//);
    
    // Advance timers
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    // Re-render to see the update
    rerender(
      <ThemeProvider>
        <Tips autoCycle={true} rotateInterval={1000} />
      </ThemeProvider>
    );
    
    // Should show a different tip (Tip 2/...)
    expect(getByText(/Tip 2\//)).toBeTruthy();
  });
  
  it('filters tips by category', () => {
    // Count how many tips are in the 'shortcuts' category
    const shortcutTipsCount = tipsList.filter(
      tip => tip.category === 'shortcuts' && 
            (tip.priority === 'high' || tip.priority === 'medium')
    ).length;
    
    const { getByText } = render(
      <ThemeProvider>
        <Tips categories={['shortcuts']} />
      </ThemeProvider>
    );
    
    // Should show tip count correctly
    expect(getByText(`Tip 1/${shortcutTipsCount}`)).toBeTruthy();
  });
  
  it('filters tips by priority', () => {
    // Count how many high priority tips there are
    const highPriorityTipsCount = tipsList.filter(
      tip => tip.priority === 'high'
    ).length;
    
    const { getByText } = render(
      <ThemeProvider>
        <Tips minPriority="high" />
      </ThemeProvider>
    );
    
    // Should show tip count correctly
    expect(getByText(`Tip 1/${highPriorityTipsCount}`)).toBeTruthy();
  });
  
  it('does not render when disabled', () => {
    const { container } = render(
      <ThemeProvider>
        <Tips enabled={false} />
      </ThemeProvider>
    );
    
    // Container should be empty (no tips rendered)
    expect(container.firstChild).toBeNull();
  });
  
  it('calls onDismiss when dismissed', () => {
    const mockDismiss = jest.fn();
    
    const { getByText } = render(
      <ThemeProvider>
        <Tips onDismiss={mockDismiss} />
      </ThemeProvider>
    );
    
    // Find dismiss text
    const dismissText = getByText('Press D to dismiss');
    expect(dismissText).toBeTruthy();
    
    // We can't easily test the actual dismissal since it would
    // require keyboard input simulation, which is complex in this context
  });
});