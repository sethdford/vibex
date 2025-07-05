/**
 * Code Highlighting Utility
 * 
 * Uses highlight.js to apply syntax highlighting to code blocks.
 * This utility converts highlighted code into terminal-friendly
 * ANSI color sequences for display in the CLI.
 */

import hljs from 'highlight.js';
import { Colors } from '../colors.js';

// Define ANSI color mappings for syntax highlighting
const syntaxColors = {
  'keyword':   Colors.SyntaxColors.Keyword,
  'built_in':  Colors.SyntaxColors.Builtin,
  'type':      Colors.SyntaxColors.Class,
  'literal':   Colors.SyntaxColors.Boolean,
  'number':    Colors.SyntaxColors.Number,
  'regexp':    Colors.SyntaxColors.Regex,
  'string':    Colors.SyntaxColors.String,
  'subst':     Colors.SyntaxColors.Variable,
  'symbol':    Colors.SyntaxColors.Attribute,
  'class':     Colors.SyntaxColors.Class,
  'function':  Colors.SyntaxColors.Function,
  'title':     Colors.SyntaxColors.Function,
  'params':    Colors.SyntaxColors.Property,
  'comment':   Colors.SyntaxColors.Comment,
  'doctag':    Colors.SyntaxColors.DocComment,
  'meta':      Colors.SyntaxColors.Attribute,
  'attr':      Colors.SyntaxColors.Attribute,
  'name':      Colors.SyntaxColors.Tag,
  'tag':       Colors.SyntaxColors.Tag,
  'punctuation': Colors.SyntaxColors.Punctuation,
  'operator':  Colors.SyntaxColors.Operator,
  'variable':  Colors.SyntaxColors.Variable,
  'property':  Colors.SyntaxColors.Property,
  'default':   Colors.Text,
};

/**
 * Highlight source code using highlight.js and convert to terminal colors
 * 
 * @param {string} code - The source code to highlight
 * @param {string} language - The programming language (optional)
 * @returns {string[]} - Array of highlighted lines with ANSI color codes
 */
function highlightCode(code, language) {
  try {
    // Normalize line endings and trim trailing whitespace
    const normalizedCode = code.replace(/\r\n/g, '\n').trim();
    
    // Highlight the code
    const highlighted = language
      ? hljs.highlight(normalizedCode, { language })
      : hljs.highlightAuto(normalizedCode);
    
    // Process the highlighted tokens
    const html = highlighted.value;
    
    // Convert HTML spans to terminal ANSI color sequences
    const processedHtml = convertHtmlToAnsi(html);
    
    // Split into lines and return
    return processedHtml.split('\n');
  } catch (error) {
    // If highlighting fails, return plain code
    console.error('Error highlighting code:', error);
    return code.split('\n');
  }
}

/**
 * Convert HTML with highlight.js spans to ANSI color sequences
 * 
 * @param {string} html - The highlighted HTML from highlight.js
 * @returns {string} - Text with ANSI color sequences
 */
function convertHtmlToAnsi(html) {
  // Match all span elements with class hljs-*
  const spanRegex = /<span class="hljs-([^"]+)">([^<]*)<\/span>/g;
  
  // Replace spans with ANSI color sequences
  return html.replace(spanRegex, (match, className, content) => {
    const color = syntaxColors[className] || syntaxColors.default;
    return `\u001b[38;2;${hexToRgb(color)}m${content}\u001b[0m`;
  });
}

/**
 * Convert hex color to RGB format for ANSI 24-bit color
 * 
 * @param {string} hex - Hex color code (e.g. #FF5500)
 * @returns {string} - RGB values as "r;g;b" for ANSI escape code
 */
function hexToRgb(hex) {
  // Handle shorthand hex
  hex = hex.replace('#', '');
  
  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `${r};${g};${b}`;
}

export default highlightCode;