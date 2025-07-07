/**
 * Code Search Result Visualizer Example
 * 
 * This file demonstrates how to use the CodeSearchResultVisualizer component
 * with sample search results.
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../../colors.js';
import { 
  CodeSearchResultVisualizer, 
  CodeSearchResult 
} from './CodeSearchResultVisualizer.js';

/**
 * Example code search result
 */
const exampleSearchResult: CodeSearchResult = {
  pattern: 'function.*\\(',
  searchDir: './src',
  totalMatches: 8,
  matchedFiles: 3,
  totalFiles: 42,
  searchTime: 153,
  fileMatches: [
    {
      path: 'src/utils/helpers.js',
      matchCount: 4,
      matches: [
        {
          path: 'src/utils/helpers.js',
          lineNumber: 12,
          columnStart: 0,
          columnEnd: 17,
          line: 'function formatDate(date) {',
          beforeContext: [
            '/**',
            ' * Format a date into a string',
            ' * @param {Date} date - The date to format',
            ' * @returns {string} Formatted date string',
            ' */'
          ],
          afterContext: [
            '  const year = date.getFullYear();',
            '  const month = String(date.getMonth() + 1).padStart(2, \'0\');',
            '  const day = String(date.getDate()).padStart(2, \'0\');',
            '  return `${year}-${month}-${day}`;'
          ]
        },
        {
          path: 'src/utils/helpers.js',
          lineNumber: 25,
          columnStart: 0,
          columnEnd: 28,
          line: 'function calculateDiscount(price, percent) {',
          beforeContext: [
            '/**',
            ' * Calculate a discount amount',
            ' * @param {number} price - The original price',
            ' * @param {number} percent - The discount percentage',
            ' * @returns {number} The discounted price',
            ' */'
          ],
          afterContext: [
            '  if (percent < 0 || percent > 100) {',
            '    throw new Error(\'Discount percentage must be between 0 and 100\');',
            '  }',
            '  return price * (1 - percent / 100);'
          ]
        },
        {
          path: 'src/utils/helpers.js',
          lineNumber: 38,
          columnStart: 0,
          columnEnd: 23,
          line: 'function validateEmail(email) {',
          beforeContext: [
            '/**',
            ' * Validate an email address',
            ' * @param {string} email - The email to validate',
            ' * @returns {boolean} Whether the email is valid',
            ' */'
          ],
          afterContext: [
            '  const re = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;',
            '  return re.test(String(email).toLowerCase());'
          ]
        },
        {
          path: 'src/utils/helpers.js',
          lineNumber: 47,
          columnStart: 0,
          columnEnd: 24,
          line: 'function debounce(func, wait) {',
          beforeContext: [
            '/**',
            ' * Debounce a function call',
            ' * @param {Function} func - The function to debounce',
            ' * @param {number} wait - Milliseconds to wait',
            ' * @returns {Function} Debounced function',
            ' */'
          ],
          afterContext: [
            '  let timeout;',
            '  return function executedFunction(...args) {',
            '    const later = () => {',
            '      clearTimeout(timeout);',
            '      func(...args);',
            '    };',
            '    clearTimeout(timeout);',
            '    timeout = setTimeout(later, wait);',
            '  };'
          ]
        }
      ]
    },
    {
      path: 'src/components/Button.js',
      matchCount: 3,
      matches: [
        {
          path: 'src/components/Button.js',
          lineNumber: 15,
          columnStart: 9,
          columnEnd: 28,
          line: '  const function handleClick(event) {',
          beforeContext: [
            'import React from \'react\';',
            '',
            'const Button = ({ onClick, label, variant = \'primary\' }) => {',
            '  // Handle button click with some preprocessing',
            ''
          ],
          afterContext: [
            '    // Prevent default behavior',
            '    event.preventDefault();',
            '    ',
            '    // Call parent handler',
            '    if (onClick) {',
            '      onClick(event);',
            '    }',
            '  };'
          ]
        },
        {
          path: 'src/components/Button.js',
          lineNumber: 32,
          columnStart: 9,
          columnEnd: 30,
          line: '  const function getButtonStyle(variant) {',
          beforeContext: [
            '  // Generate button style based on variant',
            '  //'
          ],
          afterContext: [
            '    switch (variant) {',
            '      case \'primary\':',
            '        return { background: \'blue\', color: \'white\' };',
            '      case \'secondary\':',
            '        return { background: \'gray\', color: \'white\' };',
            '      case \'danger\':',
            '        return { background: \'red\', color: \'white\' };',
            '      default:',
            '        return { background: \'white\', color: \'black\' };',
            '    }',
            '  };'
          ]
        },
        {
          path: 'src/components/Button.js',
          lineNumber: 53,
          columnStart: 16,
          columnEnd: 35,
          line: 'export function createButton(config) {',
          beforeContext: [
            '};',
            '',
            'export default Button;',
            '',
            '// Helper to create preconfigured buttons'
          ],
          afterContext: [
            '  return (props) => (',
            '    <Button',
            '      {...config}',
            '      {...props}',
            '    />',
            '  );',
            '}'
          ]
        }
      ]
    },
    {
      path: 'src/App.js',
      matchCount: 1,
      matches: [
        {
          path: 'src/App.js',
          lineNumber: 8,
          columnStart: 16,
          columnEnd: 27,
          line: 'const function App() {',
          beforeContext: [
            'import React from \'react\';',
            'import Button from \'./components/Button\';',
            'import { formatDate } from \'./utils/helpers\';',
            '',
            '/**',
            ' * Main application component',
            ' */'
          ],
          afterContext: [
            '  const today = formatDate(new Date());',
            '',
            '  return (',
            '    <div className="App">',
            '      <header className="App-header">',
            '        <h1>Example App</h1>',
            '        <p>Today is {today}</p>',
            '      </header>',
            '      <main>',
            '        <Button onClick={() => alert(\'Clicked!\')} label="Click Me" />',
            '      </main>',
            '    </div>',
            '  );',
            '};'
          ]
        }
      ]
    }
  ]
};

/**
 * Example component demonstrating CodeSearchResultVisualizer usage
 */
export const CodeSearchResultVisualizerExample: React.FC = () => {
  // State for visualizer options
  const [showContext, setShowContext] = useState(true);
  const [expandAll, setExpandAll] = useState(false);
  
  // Handle keyboard input
  useInput((input, key) => {
    if (input === 'c') {
      setShowContext(prev => !prev);
    } else if (input === 'e') {
      setExpandAll(prev => !prev);
    }
  });
  
  return (
    <Box flexDirection="column">
      <Box marginBottom={1} padding={1} borderStyle="round" borderColor={Colors.AccentBlue}>
        <Text bold>Code Search Result Visualizer Example</Text>
      </Box>
      
      <Box marginBottom={1} flexDirection="column">
        <Text bold>Controls:</Text>
        <Text>Press <Text color={Colors.AccentBlue} bold>c</Text> to toggle context lines: {showContext ? 'ON' : 'OFF'}</Text>
        <Text>Press <Text color={Colors.AccentBlue} bold>e</Text> to toggle expand all: {expandAll ? 'ON' : 'OFF'}</Text>
      </Box>
      
      <CodeSearchResultVisualizer
        result={exampleSearchResult}
        showContext={showContext}
        expandAll={expandAll}
        width={100}
      />
      
      <Box marginTop={2} padding={1} borderStyle="round" borderColor={Colors.TextDim}>
        <Text>This example shows search results for pattern: <Text bold>{exampleSearchResult.pattern}</Text></Text>
      </Box>
    </Box>
  );
};

export default CodeSearchResultVisualizerExample;