/**
 * GitHub Dark Theme
 */

import { Theme } from './theme';

/**
 * GitHub dark theme
 */
export const githubDarkTheme: Theme = {
  name: 'github-dark',
  isDark: true,
  ui: {
    primary: '#58a6ff',
    secondary: '#db61a2',
    success: '#56d364',
    error: '#f85149',
    warning: '#e3b341',
    info: '#79c0ff',
    text: '#c9d1d9',
    textDim: '#8b949e',
    background: '#0d1117',
  },
  syntax: {
    keyword: '#ff7b72',
    string: '#a5d6ff',
    number: '#79c0ff',
    comment: '#8b949e',
    operator: '#ff7b72',
    function: '#d2a8ff',
    class: '#79c0ff',
    type: '#79c0ff',
    variable: '#c9d1d9',
    tag: '#7ee787',
    attribute: '#79c0ff',
    property: '#79c0ff',
    constant: '#79c0ff',
    symbol: '#ff7b72',
    builtin: '#ff7b72',
    regex: '#a5d6ff',
  },
};