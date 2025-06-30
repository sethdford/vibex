/**
 * Dracula Theme
 */

import { Theme } from './theme';

/**
 * Dracula theme
 */
export const draculaTheme: Theme = {
  name: 'dracula',
  isDark: true,
  ui: {
    primary: '#8be9fd',
    secondary: '#bd93f9',
    success: '#50fa7b',
    error: '#ff5555',
    warning: '#ffb86c',
    info: '#8be9fd',
    text: '#f8f8f2',
    textDim: '#6272a4',
    background: '#282a36',
  },
  syntax: {
    keyword: '#ff79c6',
    string: '#f1fa8c',
    number: '#bd93f9',
    comment: '#6272a4',
    operator: '#ff79c6',
    function: '#50fa7b',
    class: '#8be9fd',
    type: '#8be9fd',
    variable: '#f8f8f2',
    tag: '#ff79c6',
    attribute: '#50fa7b',
    property: '#8be9fd',
    constant: '#bd93f9',
    symbol: '#ff79c6',
    builtin: '#ff79c6',
    regex: '#f1fa8c',
  },
};