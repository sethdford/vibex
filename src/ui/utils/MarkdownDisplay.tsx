/**
 * Markdown Display Component
 * 
 * React-based renderer for Markdown content in the terminal
 */

import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors';
import { parseMarkdown, ParsedMarkdownDocument } from './markdownUtilities';
import { colorizeCode } from './CodeColorizer';
import { ImageDisplay } from '../components/image/ImageDisplay';

/**
 * Markdown display props
 */
interface MarkdownDisplayProps {
  /**
   * Markdown content to render
   */
  markdown: string;
  
  /**
   * Maximum width for rendering
   */
  maxWidth?: number;
  
  /**
   * Maximum height for rendering
   */
  maxHeight?: number;
  
  /**
   * Whether to render images
   */
  renderImages?: boolean;
}

/**
 * Markdown display component
 */
export const MarkdownDisplay: React.FC<MarkdownDisplayProps> = ({
  markdown,
  maxWidth = 80,
  maxHeight,
  renderImages = true,
}) => {
  // Parse markdown
  const parsedMarkdown = useMemo(() => parseMarkdown(markdown), [markdown]);
  
  // Render node based on type
  const renderNode = (node: any): React.ReactNode => {
    if (!node) return null;
    
    // Handle different node types
    switch (node.type) {
      case 'heading':
        return renderHeading(node);
      
      case 'code':
        return renderCodeBlock(node);
      
      case 'paragraph':
        return renderParagraph(node);
      
      case 'list':
        return renderListItem(node);
      
      case 'quote':
        return renderQuote(node);
      
      case 'hr':
        return renderHorizontalRule();
      
      default:
        return typeof node.content === 'string' 
          ? <Text>{node.content}</Text> 
          : null;
    }
  };
  
  /**
   * Render heading node
   */
  const renderHeading = (node: any) => {
    const content = typeof node.content === 'string' ? node.content : '';
    const level = node.meta?.level || 1;
    
    // Determine color and style based on heading level
    let color;
    switch (level) {
      case 1:
        color = Colors.Primary;
        return (
          <Box marginBottom={1}>
            <Text bold color={color}>{content}</Text>
          </Box>
        );
      case 2:
        color = Colors.Secondary;
        return (
          <Box marginBottom={1}>
            <Text bold color={color}>{content}</Text>
          </Box>
        );
      default:
        return (
          <Box marginBottom={1}>
            <Text bold>{content}</Text>
          </Box>
        );
    }
  };
  
  /**
   * Render code block
   */
  const renderCodeBlock = (node: any) => {
    const content = typeof node.content === 'string' ? node.content : '';
    const language = node.meta?.language || '';
    
    return (
      <Box flexDirection="column" marginY={1}>
        <Box>
          <Text color={Colors.TextDim}>
            {`┌─ ${language || 'code'} ───────`}
          </Text>
        </Box>
        <Box paddingLeft={2}>
          {colorizeCode(
            content,
            language,
            20, // Max height
            Math.max(20, maxWidth - 4), // Max width accounting for padding
            true, // Show line numbers
            true  // Enable line wrapping
          )}
        </Box>
        <Box>
          <Text color={Colors.TextDim}>
            └─────────────────
          </Text>
        </Box>
      </Box>
    );
  };
  
  /**
   * Render paragraph
   */
  const renderParagraph = (node: any) => {
    const content = typeof node.content === 'string' ? node.content : '';
    
    return (
      <Box marginBottom={1}>
        <Text wrap="wrap">{content}</Text>
      </Box>
    );
  };
  
  /**
   * Render list item
   */
  const renderListItem = (node: any) => {
    const content = typeof node.content === 'string' ? node.content : '';
    const ordered = node.meta?.ordered || false;
    
    const bullet = ordered ? '1. ' : '• ';
    
    return (
      <Box marginBottom={1}>
        <Box width={2}>
          <Text color={Colors.TextDim}>{bullet}</Text>
        </Box>
        <Text wrap="wrap">{content}</Text>
      </Box>
    );
  };
  
  /**
   * Render blockquote
   */
  const renderQuote = (node: any) => {
    const content = typeof node.content === 'string' ? node.content : '';
    
    return (
      <Box marginBottom={1} flexDirection="row">
        <Box width={2}>
          <Text color={Colors.Info}>│</Text>
        </Box>
        <Box flexGrow={1}>
          <Text color={Colors.Info} wrap="wrap">
            {content}
          </Text>
        </Box>
      </Box>
    );
  };
  
  /**
   * Render horizontal rule
   */
  const renderHorizontalRule = () => {
    return (
      <Box marginY={1}>
        <Text color={Colors.TextDim}>
          ───────────────────────────────
        </Text>
      </Box>
    );
  };
  
  /**
   * Render images
   */
  const renderMarkdownImages = () => {
    if (!renderImages || parsedMarkdown.images.length === 0) {
      return null;
    }
    
    return (
      <Box flexDirection="column" marginTop={1}>
        {parsedMarkdown.images.map((image, index) => (
          <Box key={`img-${index}`} marginY={1}>
            <ImageDisplay
              source={
                image.isUrl
                  ? { type: 'url', url: image.src }
                  : { type: 'file', path: image.src }
              }
              maxWidth={Math.max(40, maxWidth - 4)}
              maxHeight={15}
              altText={image.alt}
              caption={image.alt}
            />
          </Box>
        ))}
      </Box>
    );
  };
  
  return (
    <Box flexDirection="column">
      {/* Render text nodes */}
      {parsedMarkdown.nodes.map((node, index) => (
        <React.Fragment key={index}>
          {renderNode(node)}
        </React.Fragment>
      ))}
      
      {/* Render images */}
      {renderMarkdownImages()}
    </Box>
  );
};