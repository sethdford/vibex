/**
 * ANSI Dark Theme
 */

import { Theme } from './theme';

/**
 * ANSI Dark theme
 */
export const ansiTheme: Theme = {
  name: 'ansi',
  isDark: true,
  ui: {
    primary: '#3B78FF',
    secondary: '#7B56A3',
    success: '#23D18B',
    error: '#F14C4C',
    warning: '#FAC863',
    info: '#29B8DB',
    text: '#E6E6E6',
    textDim: '#8A8A8A',
    background: '#1E1E1E',
  },
  syntax: {
    keyword: '#569CD6',
    string: '#CE9178',
    number: '#B5CEA8',
    comment: '#608B4E',
    operator: '#D4D4D4',
    function: '#DCDCAA',
    class: '#4EC9B0',
    type: '#4EC9B0',
    variable: '#9CDCFE',
    tag: '#569CD6',
    attribute: '#9CDCFE',
    property: '#9CDCFE',
    constant: '#4FC1FF',
    symbol: '#D4D4D4',
    builtin: '#569CD6',
    regex: '#D16969',
  },
};