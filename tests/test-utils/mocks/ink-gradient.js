// Mock for ink-gradient module (CommonJS format)
const React = require('react');

const Gradient = ({ children, name }) => {
  return React.createElement('div', { 'data-gradient': name }, children);
};

module.exports = Gradient; 