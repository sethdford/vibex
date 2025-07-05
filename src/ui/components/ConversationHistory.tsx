/**
 * Conversation History Component
 * 
 * Advanced conversation history management with pagination, filtering, searching,
 * keyboard navigation, message preview, and metadata display.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';

export interface HistoryMessage {
  readonly id: string;
  readonly role: 'user' | 'assistant' | 'system';
  readonly content: string;
  readonly timestamp: Date;
  readonly metadata?: {
    readonly model?: string;
    readonly tokensInput?: number;
    readonly tokensOutput?: number;
    readonly totalTokens?: number;
    readonly latency?: number;
    readonly command?: string;
    readonly type?: string;
  };
}

export interface ConversationHistoryProps {
  /**
   * List of messages to display
   */
  readonly messages: readonly HistoryMessage[];
  
  /**
   * Number of messages per page
   */
  readonly pageSize?: number;
  
  /**
   * Whether to use compact view (truncated messages)
   */
  readonly compactView?: boolean;
  
  /**
   * Filter messages by role
   */
  readonly filter?: 'all' | 'user' | 'assistant' | 'system';
  
  /**
   * Whether to show timestamps
   */
  readonly showTimestamps?: boolean;
  
  /**
   * Whether to show message metadata
   */
  readonly showMetadata?: boolean;
  
  /**
   * Text to search for in messages
   */
  readonly searchText?: string;
  
  /**
   * Callback when a message is selected
   */
  readonly onMessageSelect?: (messageId: string) => void;
  
  /**
   * Maximum height for the component
   */
  readonly maxHeight?: number;
  
  /**
   * Whether the component has keyboard focus
   */
  readonly isFocused?: boolean;
  
  /**
   * Callback when search query changes
   */
  readonly onSearchChange?: (query: string) => void;
  
  /**
   * Whether to enable keyboard shortcuts
   */
  readonly enableKeyboardShortcuts?: boolean;
}

/**
 * Formats a timestamp in a readable format
 */
const formatTimestamp = (date: Date): string => {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Advanced conversation history component with search, filtering and navigation
 */
export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  messages,
  pageSize = 10,
  compactView = false,
  filter = 'all',
  showTimestamps = true,
  showMetadata = false,
  searchText = '',
  onMessageSelect,
  maxHeight,
  isFocused = false,
  onSearchChange,
  enableKeyboardShortcuts = true
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [filteredMessages, setFilteredMessages] = useState<readonly HistoryMessage[]>(messages);
  
  // Apply filtering and searching
  useEffect(() => {
    let filtered = [...messages];
    
    // Apply role filter
    if (filter !== 'all') {
      filtered = filtered.filter(msg => msg.role === filter);
    }
    
    // Apply search filter if search text exists
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(msg => 
        msg.content.toLowerCase().includes(searchLower) ||
        (msg.metadata?.command?.toLowerCase().includes(searchLower))
      );
    }
    
    setFilteredMessages(filtered);
    
    // Reset to first page when filters change
    setCurrentPage(0);
  }, [messages, filter, searchText]);
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredMessages.length / pageSize);
  const startIndex = currentPage * pageSize;
  const visibleMessages = filteredMessages.slice(startIndex, startIndex + pageSize);
  
  // Handle pagination controls
  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  // Selected message state
  const [selectedMessageIndex, setSelectedMessageIndex] = useState<number>(-1);
  const [isSearchMode, setIsSearchMode] = useState<boolean>(false);
  const [localSearchText, setLocalSearchText] = useState<string>(searchText);
  
  // Handle keyboard navigation if focused and enabled
  useEffect(() => {
    if (!isFocused || !enableKeyboardShortcuts) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSearchMode) {
        // Search mode handling
        if (e.key === 'Escape') {
          setIsSearchMode(false);
        } else if (e.key === 'Enter') {
          setIsSearchMode(false);
          if (onSearchChange) {
            onSearchChange(localSearchText);
          }
        } else if (e.key === 'Backspace') {
          setLocalSearchText(prev => prev.slice(0, -1));
          if (onSearchChange) {
            onSearchChange(localSearchText.slice(0, -1));
          }
        } else if (e.key.length === 1) {
          setLocalSearchText(prev => prev + e.key);
          if (onSearchChange) {
            onSearchChange(localSearchText + e.key);
          }
        }
        return;
      }
      
      // Regular navigation mode
      switch (e.key) {
        case 'ArrowUp':
          setSelectedMessageIndex(prev => 
            prev <= 0 ? 0 : prev - 1
          );
          break;
        case 'ArrowDown':
          setSelectedMessageIndex(prev => 
            prev >= visibleMessages.length - 1 ? 
              visibleMessages.length - 1 : 
              prev + 1
          );
          break;
        case 'ArrowLeft':
          goToPreviousPage();
          setSelectedMessageIndex(0);
          break;
        case 'ArrowRight':
          goToNextPage();
          setSelectedMessageIndex(0);
          break;
        case 'Enter':
          if (selectedMessageIndex >= 0 && 
              selectedMessageIndex < visibleMessages.length &&
              onMessageSelect) {
            onMessageSelect(visibleMessages[selectedMessageIndex].id);
          }
          break;
        case '/':
          setIsSearchMode(true);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isFocused, 
    enableKeyboardShortcuts, 
    isSearchMode, 
    selectedMessageIndex,
    visibleMessages,
    localSearchText,
    onSearchChange,
    onMessageSelect,
    goToNextPage,
    goToPreviousPage
  ]);
  
  // No messages to display
  if (filteredMessages.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color={Colors.TextDim}>No conversation history to display.</Text>
        {searchText && <Text color={Colors.TextDim}>No results for search: "{searchText}"</Text>}
      </Box>
    );
  }
  
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'assistant': return Colors.Secondary;
      case 'user': return Colors.Primary;
      case 'system': return Colors.Info;
      default: return Colors.Text;
    }
  };
  
  return (
    <Box flexDirection="column">
      {/* Messages List */}
      <Box 
        flexDirection="column"
        height={maxHeight}
        overflow={maxHeight ? 'hidden' : undefined}
      >
        {visibleMessages.map(message => (
          <Box 
            key={message.id} 
            flexDirection="column" 
            marginBottom={1}
            paddingX={1}
            paddingY={1}
            borderStyle="single"
            borderColor={Colors.Gray700}
          >
            {/* Message Header */}
            <Box>
              <Box flexGrow={1}>
                <Text 
                  color={getRoleColor(message.role)} 
                  bold
                >
                  {message.role === 'user' ? 'You' : 
                   message.role === 'assistant' ? 'Claude' : 'System'}
                </Text>
                {showTimestamps && (
                  <Text color={Colors.TextDim}> - {formatTimestamp(message.timestamp)}</Text>
                )}
              </Box>
              {message.metadata?.command && (
                <Text color={Colors.Info}>/{message.metadata.command}</Text>
              )}
            </Box>
            
            {/* Message Content */}
            {!compactView ? (
              <Box marginLeft={1} marginTop={1}>
                <Text>{message.content}</Text>
              </Box>
            ) : (
              <Box marginLeft={1}>
                <Text color={Colors.TextDim}>
                  {message.content.length > 50 ? 
                    `${message.content.substring(0, 50)}...` : 
                    message.content}
                </Text>
              </Box>
            )}
            
            {/* Message Metadata */}
            {showMetadata && message.metadata && (
              <Box marginTop={1} justifyContent="flex-end">
                <Text color={Colors.TextDim} dimColor>
                  {message.metadata.model && `${message.metadata.model} • `}
                  {message.metadata.totalTokens && `${message.metadata.totalTokens} tokens • `}
                  {message.metadata.latency && `${message.metadata.latency}ms`}
                </Text>
              </Box>
            )}
          </Box>
        ))}
      </Box>
      
      {/* Search Bar (when in search mode) */}
      {isSearchMode && (
        <Box marginY={1} borderStyle="round" borderColor={Colors.Primary} padding={1}>
          <Text color={Colors.Primary}>Search: </Text>
          <Text>{localSearchText}</Text>
          <Text color={Colors.TextDim}>_</Text>
          <Box flexGrow={1} />
          <Text color={Colors.TextDim}>(Press Enter to search, Esc to cancel)</Text>
        </Box>
      )}
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <Box justifyContent="space-between" marginTop={1}>
          <Box>
            <Text 
              color={currentPage > 0 ? Colors.Primary : Colors.TextDim}
              backgroundColor={isFocused && currentPage > 0 ? Colors.Gray700 : undefined}
            >
              {currentPage > 0 ? '« Previous' : '  '}
            </Text>
          </Box>
          
          <Box>
            <Text color={Colors.TextDim}>
              Page {currentPage + 1} of {totalPages}
              {` (${filteredMessages.length} messages)`}
            </Text>
          </Box>
          
          <Box>
            <Text 
              color={currentPage < totalPages - 1 ? Colors.Primary : Colors.TextDim}
              backgroundColor={isFocused && currentPage < totalPages - 1 ? Colors.Gray700 : undefined}
            >
              {currentPage < totalPages - 1 ? 'Next »' : '  '}
            </Text>
          </Box>
        </Box>
      )}
      
      {/* Keyboard Shortcuts */}
      {isFocused && enableKeyboardShortcuts && (
        <Box marginTop={1} justifyContent="flex-end">
          <Text color={Colors.TextDim} dimColor>
            ↑/↓: Navigate | ←/→: Pages | /: Search | Enter: Select
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default ConversationHistory;