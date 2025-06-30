/**
 * Google Light Theme
 */

import { Theme } from './theme';

/**
 * Google Light theme (similar to Google Code)
 */
export const googleLightTheme: Theme = {
  name: 'google-light',
  isDark: false,
  ui: {
    primary: '#1A73E8',
    secondary: '#9334E6',
    success: '#188038',
    error: '#D93025',
    warning: '#E37400',
    info: '#1A73E8',
    text: '#202124',
    textDim: '#5F6368',
    background: '#FFFFFF',
  },
  syntax: {
    keyword: '#9334E6',
    string: '#188038',
    number: '#C53929',
    comment: '#5F6368',
    operator: '#5F6368',
    function: '#1967D2',
    class: '#E37400',
    type: '#E37400',
    variable: '#202124',
    tag: '#1967D2',
    attribute: '#1967D2',
    property: '#C53929',
    constant: '#C53929',
    symbol: '#1A73E8',
    builtin: '#9334E6',
    regex: '#188038',
  },
};