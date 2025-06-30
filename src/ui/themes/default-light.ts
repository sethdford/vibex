/**
 * Default Light Theme
 */

import { Theme } from './theme';

/**
 * Default light theme
 */
export const defaultLightTheme: Theme = {
  name: 'default-light',
  isDark: false,
  ui: {
    primary: '#0184bc',
    secondary: '#a626a4',
    success: '#50a14f',
    error: '#e45649',
    warning: '#c18401',
    info: '#0184bc',
    text: '#383a42',
    textDim: '#a0a1a7',
    background: '#fafafa',
  },
  syntax: {
    keyword: '#a626a4',
    string: '#50a14f',
    number: '#986801',
    comment: '#a0a1a7',
    operator: '#0184bc',
    function: '#4078f2',
    class: '#c18401',
    type: '#c18401',
    variable: '#e45649',
    tag: '#e45649',
    attribute: '#986801',
    property: '#e45649',
    constant: '#986801',
    symbol: '#0184bc',
    builtin: '#a626a4',
    regex: '#50a14f',
  },
};