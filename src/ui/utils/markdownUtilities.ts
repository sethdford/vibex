/**
 * Markdown Utilities
 * 
 * This module provides utilities for parsing and rendering Markdown content
 * in the terminal UI. It handles code blocks, formatting, links, and other
 * Markdown elements.
 */

import { SyntaxColors } from '../colors.js';
import type { MarkdownImage } from './markdownImageParser.js';
import { extractImages, replaceImagesWithPlaceholders } from './markdownImageParser.js';
import { colorizeCode } from './CodeColorizer.js';
import type React from 'react';
import { isLanguageSupported } from './highlighter.js';

/**
 * Interface for a parsed markdown document
 */
export interface ParsedMarkdownDocument {
  /**
   * Parsed nodes
   */
  nodes: MarkdownNode[];
  
  /**
   * Extracted images
   */
  images: MarkdownImage[];
}

/**
 * Interface for a parsed markdown node
 */
interface MarkdownNode {
  /**
   * Type of the markdown node
   */
  type: 'text' | 'code' | 'heading' | 'list' | 'link' | 'quote' | 'hr' | 'paragraph' | 'image';
  
  /**
   * Content of the node (might be raw text or processed content)
   */
  content: string | MarkdownNode[];
  
  /**
   * Additional metadata for the node
   */
  meta?: {
    /**
     * Language for code blocks
     */
    language?: string;
    
    /**
     * Level for headings
     */
    level?: number;
    
    /**
     * URL for links
     */
    url?: string;
    
    /**
     * Title for links
     */
    title?: string;
    
    /**
     * Ordered vs. unordered list
     */
    ordered?: boolean;
  };
}

/**
 * Interface for theme configuration
 */
interface ThemeConfig {
  /**
   * Color mappings for syntax highlighting
   */
  colors: Record<string, string>;
  
  /**
   * Theme name
   */
  name?: string;
}

/**
 * Interface for syntax highlighting options
 */
interface SyntaxHighlightOptions {
  /**
   * Whether to use colors
   */
  useColors?: boolean;
  
  /**
   * Color theme to use
   */
  theme?: ThemeConfig;
}

/**
 * Parse markdown text into structured nodes
 * 
 * @param markdown - Raw markdown text
 * @returns Array of parsed markdown nodes
 */
export function parseMarkdown(markdown: string): ParsedMarkdownDocument {
  // Extract and process images first
  const { markdown: textWithoutImages, images } = replaceImagesWithPlaceholders(markdown);
  
  // Simple parsing - this could be expanded with a proper parser library
  const nodes: MarkdownNode[] = [];
  const lines = textWithoutImages.split('\n');
  
  let inCodeBlock = false;
  let codeLanguage = '';
  let codeContent = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Code block handling
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        nodes.push({
          type: 'code',
          content: codeContent,
          meta: { language: codeLanguage }
        });
        inCodeBlock = false;
        codeContent = '';
        codeLanguage = '';
      } else {
        // Start of code block
        inCodeBlock = true;
        codeLanguage = line.slice(3).trim();
      }
      continue;
    }
    
    if (inCodeBlock) {
      codeContent += `${line}\n`;
      continue;
    }
    
    // Heading detection
    if (line.startsWith('#')) {
      let level = 1;
      while (line[level] === '#' && level < 6) {level++;}
      const content = line.slice(level).trim();
      nodes.push({
        type: 'heading',
        content,
        meta: { level }
      });
      continue;
    }
    
    // Horizontal rule
    if (line.match(/^-{3,}$/) || line.match(/^={3,}$/) || line.match(/^\*{3,}$/)) {
      nodes.push({ type: 'hr', content: '' });
      continue;
    }
    
    // Quote blocks
    if (line.startsWith('>')) {
      nodes.push({
        type: 'quote',
        content: line.slice(1).trim()
      });
      continue;
    }
    
    // Lists (very basic detection)
    if (line.match(/^\s*[*\-+]\s/)) {
      nodes.push({
        type: 'list',
        content: line.replace(/^\s*[*\-+]\s/, ''),
        meta: { ordered: false }
      });
      continue;
    }
    
    if (line.match(/^\s*\d+\.\s/)) {
      nodes.push({
        type: 'list',
        content: line.replace(/^\s*\d+\.\s/, ''),
        meta: { ordered: true }
      });
      continue;
    }
    
    // Regular paragraph text
    if (line.trim()) {
      nodes.push({
        type: 'paragraph',
        content: parseParagraphMarkdown(line)
      });
    } else {
      // Empty line
      nodes.push({
        type: 'paragraph',
        content: ''
      });
    }
  }
  
  // Handle any remaining code block
  if (inCodeBlock) {
    nodes.push({
      type: 'code',
      content: codeContent,
      meta: { language: codeLanguage }
    });
  }
  
  return {
    nodes,
    images
  };
}

/**
 * Parse inline markdown in paragraphs (bold, italic, links, etc.)
 * 
 * @param text - The paragraph text to parse
 * @returns Parsed markdown nodes for the paragraph
 */
function parseParagraphMarkdown(text: string): string {
  // Replace links with formatted text for now
  let result = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');
  
  // Replace image placeholders with [Image: alt text]
  result = result.replace(/!\[([^\]]+)\]\(([^)]+)\)/g, '[Image: $1]');
  
  return result;
}

/**
 * Highlight code with syntax highlighting
 * 
 * @param code - Code to highlight
 * @param language - Programming language
 * @param options - Highlighting options
 * @returns Syntax highlighted code
 */
export function highlightCode(
  code: string,
  language = '',
  options: SyntaxHighlightOptions = {}
): string {
  try {
    // Skip highlighting if colors are disabled
    if (options.useColors === false) {
      return code;
    }
    
    const detectedLanguage = language || detectLanguage(code);
    
    if (isLanguageSupported(detectedLanguage)) {
      // Use simple syntax highlighting
      return code; // Return plain code for now
    } else {
      return code;
    }
  } catch (error) {
    return code; // Fallback to plain text on error
  }
}

/**
 * Detect the programming language from code
 * 
 * @param code - Code to analyze
 * @returns Detected language or empty string
 */
export function detectLanguage(code: string): string {
  try {
    return isLanguageSupported(code) ? code : '';
  } catch (error) {
    return '';
  }
}

/**
 * Render markdown nodes to ANSI-colored terminal output
 * 
 * @param nodes - Parsed markdown nodes
 * @param options - Rendering options
 * @returns ANSI-colored terminal text
 */
export function renderMarkdown(
  doc: ParsedMarkdownDocument | MarkdownNode[],
  options: {
    useColors?: boolean;
    maxWidth?: number;
  } = {}
): string {
  // Handle backward compatibility with older code that passes nodes directly
  const nodes = Array.isArray(doc) ? doc : doc.nodes;
  const useColors = options.useColors !== false;
  
  return nodes.map(async node => {
    switch (node.type) {
      case 'heading':
        return renderHeading(node, useColors);
      case 'code':
        return renderCodeBlock(node, useColors);
      case 'paragraph':
        return renderParagraph(node);
      case 'list':
        return renderListItem(node, useColors);
      case 'quote':
        return renderQuote(node, useColors);
      case 'hr':
        return renderHorizontalRule(useColors);
      default:
        return typeof node.content === 'string' ? node.content : '';
    }
  }).join('\n');
}

/**
 * Render a heading node to terminal text
 */
function renderHeading(node: MarkdownNode, useColors: boolean): string {
  const content = typeof node.content === 'string' ? node.content : '';
  const level = node.meta?.level || 1;
  
  if (useColors) {
    // Use different styling based on heading level
    switch (level) {
      case 1:
        return `\u001b[1m\u001b[34m${content}\u001b[0m`;
      case 2:
        return `\u001b[1m\u001b[36m${content}\u001b[0m`;
      default:
        return `\u001b[1m${content}\u001b[0m`;
    }
  }
  
  // Plain text headings
  return content;
}

/**
 * Render a code block to terminal text
 */
function renderCodeBlock(node: MarkdownNode, useColors: boolean): string | React.ReactNode {
  const content = typeof node.content === 'string' ? node.content : '';
  const language = node.meta?.language || '';
  
  // Use enhanced code colorizer if colors are enabled
  if (useColors) {
    // Return React component for improved highlighting
    return colorizeCode(
      content,
      language,
      20, // Max height
      80, // Max width
      true, // Show line numbers
      true  // Enable line wrapping
    );
  }
  
  // Fallback to plain text for no colors
  const lines = content.split('\n');
  const codeLines = lines
    .map(line => `  ${line}`)
    .join('\n');
  
  return `--- ${language || 'code'} ---\n${codeLines}\n-----------------`;
}

/**
 * Render a paragraph node to terminal text
 */
function renderParagraph(node: MarkdownNode): string {
  return typeof node.content === 'string' ? node.content : '';
}

/**
 * Render a list item to terminal text
 */
function renderListItem(node: MarkdownNode, useColors: boolean): string {
  const content = typeof node.content === 'string' ? node.content : '';
  const ordered = node.meta?.ordered || false;
  
  const bullet = ordered ? '1. ' : '• ';
  
  if (useColors) {
    return `\u001b[90m${bullet}\u001b[0m${content}`;
  }
  
  return `${bullet}${content}`;
}

/**
 * Render a quote block to terminal text
 */
function renderQuote(node: MarkdownNode, useColors: boolean): string {
  const content = typeof node.content === 'string' ? node.content : '';
  
  if (useColors) {
    return `\u001b[90m│ \u001b[36m${content}\u001b[0m`;
  }
  
  return `| ${content}`;
}

/**
 * Render a horizontal rule to terminal text
 */
function renderHorizontalRule(useColors: boolean): string {
  if (useColors) {
    return '\u001b[90m───────────────────────────────\u001b[0m';
  }
  
  return '--------------------------------';
}