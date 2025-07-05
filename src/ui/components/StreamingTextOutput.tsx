/**
 * StreamingTextOutput Component
 * 
 * A component that displays text with a streaming/typewriter effect,
 * used to display AI responses in a natural, engaging way.
 * 
 * Features:
 * - Typewriter/streaming effect for text
 * - Syntax highlighting for code blocks
 * - Markdown formatting support
 * - Configurable speed and effects
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { Colors } from '../colors.js';
import { highlightCode } from '../utils/highlighter.js';

interface StreamingTextOutputProps {
  /**
   * Text content to display, can include markdown
   */
  content: string;
  
  /**
   * Whether the content is still streaming in
   */
  isStreaming?: boolean;
  
  /**
   * Speed of the streaming effect in characters per render
   */
  speed?: number;
  
  /**
   * Whether to use the typewriter effect
   */
  typewriterEffect?: boolean;
  
  /**
   * Highlight code blocks with syntax highlighting
   */
  highlightCode?: boolean;
  
  /**
   * Show loading indicator when streaming
   */
  showLoadingIndicator?: boolean;
  
  /**
   * Callback when streaming is complete
   */
  onComplete?: () => void;
}

/**
 * Render text with a streaming effect, supporting markdown and code highlighting
 */
export const StreamingTextOutput: React.FC<StreamingTextOutputProps> = ({
  content,
  isStreaming = false,
  speed = 3,
  typewriterEffect = true,
  highlightCode: shouldHighlight = true,
  showLoadingIndicator = true,
  onComplete
}) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const [displayedLength, setDisplayedLength] = useState(0);
  const contentRef = useRef(content);
  const isCompleteRef = useRef(false);

  // Update content reference when prop changes
  useEffect(() => {
    contentRef.current = content;
    
    // If not using typewriter effect, show full content immediately
    if (!typewriterEffect) {
      setDisplayedContent(content);
      setDisplayedLength(content.length);
      if (onComplete) {onComplete();}
      isCompleteRef.current = true;
      return;
    }
    
    // If content changed and already completed, restart streaming
    if (isCompleteRef.current && content !== displayedContent) {
      setDisplayedLength(0);
      setDisplayedContent('');
      isCompleteRef.current = false;
    }
  }, [content, typewriterEffect, onComplete, displayedContent]);

  // Streaming effect logic
  useEffect(() => {
    if (!typewriterEffect || isCompleteRef.current || !isStreaming) {
      return;
    }

    const intervalId = setInterval(() => {
      setDisplayedLength(prev => {
        const newLength = prev + speed;
        
        if (newLength >= contentRef.current.length) {
          // Full content is displayed
          clearInterval(intervalId);
          setDisplayedContent(contentRef.current);
          if (onComplete) {onComplete();}
          isCompleteRef.current = true;
          return contentRef.current.length;
        }
        
        // Update displayed content
        setDisplayedContent(contentRef.current.substring(0, newLength));
        return newLength;
      });
    }, 16); // ~60fps update rate

    return () => clearInterval(intervalId);
  }, [isStreaming, speed, typewriterEffect, onComplete]);

  // Parse and render content with markdown and code highlighting
  const renderContent = () => {
    if (!displayedContent) {return null;}

    // Split content into regular text and code blocks
    const parts = displayedContent.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      // Check if this part is a code block
      if (part.startsWith('```') && part.endsWith('```')) {
        // Extract language and code
        const match = part.match(/```(\w*)\n([\s\S]*?)```/);
        if (!match) {
          return <Text key={index}>{part}</Text>;
        }

        const [, language, code] = match;
        
        // Apply syntax highlighting if enabled
        if (shouldHighlight) {
          return (
            <Box key={index} flexDirection="column" marginY={1}>
              {/* Language indicator */}
              <Box paddingX={1}>
                <Text color={Colors.TextDim}>{language || 'code'}</Text>
              </Box>
              
              {/* Code content with syntax highlighting */}
              <Box
                paddingX={1}
                paddingY={1}
                flexDirection="column"
              >
                {highlightCode(code, language).map((line: string, lineIndex: number) => (
                  <Text key={lineIndex} color={Colors.Text}>
                    {line}
                  </Text>
                ))}
              </Box>
            </Box>
          );
        } else {
          // Simple code block without highlighting
          return (
            <Box key={index} flexDirection="column" marginY={1}>
              <Box paddingX={1}>
                <Text color={Colors.Gray300}>
                  {code}
                </Text>
              </Box>
            </Box>
          );
        }
      } else {
        // Regular text with basic markdown styling
        // Process **bold**, *italic*, and `inline code`
        const formattedParts = [];
        let lastIndex = 0;
        
        // Process bold
        const boldRegex = /\*\*(.*?)\*\*/g;
        let boldMatch;
        while ((boldMatch = boldRegex.exec(part)) !== null) {
          // Add text before match
          if (boldMatch.index > lastIndex) {
            formattedParts.push(
              <Text key={`text-${formattedParts.length}`}>
                {part.substring(lastIndex, boldMatch.index)}
              </Text>
            );
          }
          
          // Add bold text
          formattedParts.push(
            <Text key={`bold-${formattedParts.length}`} bold>
              {boldMatch[1]}
            </Text>
          );
          
          lastIndex = boldMatch.index + boldMatch[0].length;
        }
        
        // Add remaining text
        if (lastIndex < part.length) {
          formattedParts.push(
            <Text key={`text-${formattedParts.length}`}>
              {part.substring(lastIndex)}
            </Text>
          );
        }
        
        return <Box key={index}>{formattedParts.length > 0 ? formattedParts : <Text>{part}</Text>}</Box>;
      }
    });
  };

  return (
    <Box flexDirection="column">
      {renderContent()}
      
      {/* Loading indicator */}
      {isStreaming && showLoadingIndicator && !isCompleteRef.current && (
        <Text color={Colors.Primary}>
          <Spinner type="dots" />
          <Text> Generating response...</Text>
        </Text>
      )}
    </Box>
  );
};

export default StreamingTextOutput;