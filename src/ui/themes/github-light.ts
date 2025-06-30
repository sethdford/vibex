/**
 * GitHub Light Theme
 */

import { Theme } from './theme';

/**
 * GitHub light theme
 */
export const githubLightTheme: Theme = {
  name: 'github-light',
  isDark: false,
  ui: {
    primary: '#0969da',
    secondary: '#8250df',
    success: '#1a7f37',
    error: '#cf222e',
    warning: '#9a6700',
    info: '#0969da',
    text: '#24292f',
    textDim: '#57606a',
    background: '#ffffff',
  },
  syntax: {
    keyword: '#cf222e',
    string: '#0a3069',
    number: '#0550ae',
    comment: '#6e7781',
    operator: '#cf222e',
    function: '#8250df',
    class: '#953800',
    type: '#953800',
    variable: '#24292f',
    tag: '#116329',
    attribute: '#0550ae',
    property: '#0550ae',
    constant: '#0550ae',
    symbol: '#cf222e',
    builtin: '#cf222e',
    regex: '#0a3069',
  },
};