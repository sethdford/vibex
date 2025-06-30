/**
 * Default Theme (Dark)
 */

import { Theme } from './theme';

/**
 * Default dark theme
 */
export const defaultTheme: Theme = {
  name: 'default',
  isDark: true,
  ui: {
    primary: '#61afef',
    secondary: '#c678dd',
    success: '#98c379',
    error: '#e06c75',
    warning: '#e5c07b',
    info: '#56b6c2',
    text: '#abb2bf',
    textDim: '#5c6370',
    background: '#282c34',
  },
  syntax: {
    keyword: '#c678dd',
    string: '#98c379',
    number: '#d19a66',
    comment: '#5c6370',
    operator: '#56b6c2',
    function: '#61afef',
    class: '#e5c07b',
    type: '#e5c07b',
    variable: '#e06c75',
    tag: '#e06c75',
    attribute: '#d19a66',
    property: '#e06c75',
    constant: '#d19a66',
    symbol: '#56b6c2',
    builtin: '#c678dd',
    regex: '#98c379',
  },
};