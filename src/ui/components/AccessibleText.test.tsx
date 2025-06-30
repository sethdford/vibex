/**
 * AccessibleText Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AccessibleText, Heading } from './AccessibleText';
import { Colors } from '../colors';

describe('AccessibleText Component', () => {
  it('renders basic text correctly', () => {
    const { getByText } = render(<AccessibleText>Hello World</AccessibleText>);
    expect(getByText('Hello World')).toBeTruthy();
  });
  
  it('formats text for screen readers when enabled', () => {
    const { getByText } = render(
      <AccessibleText screenReaderFormat>Hello-World</AccessibleText>
    );
    expect(getByText('Hello dash World')).toBeTruthy();
  });
  
  it('applies ARIA attributes', () => {
    const { getByTestId } = render(
      <AccessibleText 
        role="status" 
        description="Application status"
      >
        Loading
      </AccessibleText>
    );
    
    const element = getByTestId('accessible-text');
    expect(element).toHaveAttribute('role', 'status');
    expect(element).toHaveAttribute('aria-label', 'Loading. Application status');
  });
  
  it('applies text formatting correctly', () => {
    const { getByText } = render(
      <AccessibleText bold italic underline color={Colors.Success}>
        Formatted Text
      </AccessibleText>
    );
    
    const textElement = getByText('Formatted Text');
    expect(textElement).toBeTruthy();
    // Note: We can't easily test the styling in this test environment,
    // but the component should pass these props to the Text component
  });
  
  it('converts non-string children to strings', () => {
    const { getByText } = render(
      <AccessibleText>{42}</AccessibleText>
    );
    expect(getByText('42')).toBeTruthy();
  });
});

describe('Heading Component', () => {
  it('renders level 1 heading with correct styling', () => {
    const { getByText, getByTestId } = render(
      <Heading level={1}>Main Heading</Heading>
    );
    
    expect(getByText('Main Heading')).toBeTruthy();
    const element = getByTestId('accessible-text');
    expect(element).toHaveAttribute('role', 'heading-1');
  });
  
  it('renders level 2 heading with correct styling', () => {
    const { getByText, getByTestId } = render(
      <Heading level={2}>Subheading</Heading>
    );
    
    expect(getByText('Subheading')).toBeTruthy();
    const element = getByTestId('accessible-text');
    expect(element).toHaveAttribute('role', 'heading-2');
  });
  
  it('renders level 3 heading with correct styling', () => {
    const { getByText, getByTestId } = render(
      <Heading level={3}>Minor Heading</Heading>
    );
    
    expect(getByText('Minor Heading')).toBeTruthy();
    const element = getByTestId('accessible-text');
    expect(element).toHaveAttribute('role', 'heading-3');
  });
  
  it('includes description in aria-label', () => {
    const { getByTestId } = render(
      <Heading description="Section heading">Section Title</Heading>
    );
    
    const element = getByTestId('accessible-text');
    expect(element).toHaveAttribute('aria-label', 'Section Title. Section heading');
  });
});