// Mock for ink-big-text module (CommonJS format)
const React = require('react');

const BigText = ({ text, font, colors }) => {
  return React.createElement('div', { 
    'data-big-text': text,
    'data-font': font,
    'data-colors': colors 
  }, text);
};

module.exports = BigText; 