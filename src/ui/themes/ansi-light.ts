/**
 * ANSI Light Theme
 */

import { Theme } from './theme';

/**
 * ANSI Light theme
 */
export const ansiLightTheme: Theme = {
  name: 'ansi-light',
  isDark: false,
  ui: {
    primary: '#0B4F79',
    secondary: '#6F42C1',
    success: '#22863A',
    error: '#CB2431',
    warning: '#E36209',
    info: '#0366D6',
    text: '#24292E',
    textDim: '#6A737D',
    background: '#FFFFFF',
  },
  syntax: {
    keyword: '#0000FF',
    string: '#A31515',
    number: '#098658',
    comment: '#008000',
    operator: '#000000',
    function: '#795E26',
    class: '#267F99',
    type: '#267F99',
    variable: '#001080',
    tag: '#800000',
    attribute: '#FF0000',
    property: '#001080',
    constant: '#0070C1',
    symbol: '#000000',
    builtin: '#0000FF',
    regex: '#811F3F',
  },
};