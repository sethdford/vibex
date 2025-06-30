/**
 * Xcode Light Theme
 */

import { Theme } from './theme';

/**
 * Xcode Light theme
 */
export const xcodeLightTheme: Theme = {
  name: 'xcode-light',
  isDark: false,
  ui: {
    primary: '#0E68A0',
    secondary: '#9B2393',
    success: '#1E8449',
    error: '#C41A16',
    warning: '#824B00',
    info: '#0E68A0',
    text: '#000000',
    textDim: '#6C7986',
    background: '#FFFFFF',
  },
  syntax: {
    keyword: '#9B2393',
    string: '#C41A16',
    number: '#1C00CF',
    comment: '#536579',
    operator: '#000000',
    function: '#326D74',
    class: '#0E68A0',
    type: '#0E68A0',
    variable: '#326D74',
    tag: '#0E68A0',
    attribute: '#6C7986',
    property: '#326D74',
    constant: '#1C00CF',
    symbol: '#0E68A0',
    builtin: '#9B2393',
    regex: '#C41A16',
  },
};