/**
 * Comment List Component
 * 
 * Displays a list of comments with filtering, sorting, and interaction capabilities.
 */

import React, { useState, useMemo } from 'react';
import { Box, Text } from 'ink';
import { useInput } from 'ink';
import { Colors } from '../../colors.js';
import { 
  CommentListProps, 
  Comment, 
  Participant, 
  CommentStatus, 
  Reaction 
} from './types.js';

/**
 * Format time ago
 */
const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

/**
 * Get status color
 */
const getStatusColor = (status: CommentStatus): string => {
  switch (status) {
    case CommentStatus.OPEN:
      return Colors.AccentBlue;
    case CommentStatus.RESOLVED:
      return Colors.Success;
    case CommentStatus.WONTFIX:
      return Colors.TextDim;
    default:
      return Colors.TextDim;
  }
};

/**
 * Get status icon
 */
const getStatusIcon = (status: CommentStatus): string => {
  switch (status) {
    case CommentStatus.OPEN:
      return '◯';
    case CommentStatus.RESOLVED:
      return '✓';
    case CommentStatus.WONTFIX:
      return '✗';
    default:
      return '?';
  }
};

/**
 * Comment filter options
 */
type CommentFilter = 'all' | 'open' | 'resolved' | 'mine';

/**
 * Comment sort options
 */
type CommentSort = 'newest' | 'oldest' | 'file';

/**
 * Comment List Component
 */
export const CommentList: React.FC<CommentListProps> = ({
  comments,
  file,
  participants,
  currentUserId,
  width,
  height,
  isFocused = true,
  onCommentAdd,
  onCommentResolve,
  onReactionAdd,
  onCommentSelect
}) => {
  // State for selected comment index
  const [selectedIndex, setSelectedIndex] = useState(0);
  // State for filter
  const [filter, setFilter] = useState<CommentFilter>('all');
  // State for sort
  const [sort, setSort] = useState<CommentSort>('newest');
  
  // Map of participants by ID for quick lookup
  const participantsMap = useMemo(() => {
    return participants.reduce<Record<string, Participant>>((map, participant) => {
      map[participant.id] = participant;
      return map;
    }, {});
  }, [participants]);
  
  // Filter and sort comments
  const filteredAndSortedComments = useMemo(() => {
    // Apply filter
    let filtered = comments;
    
    if (filter === 'open') {
      filtered = comments.filter(comment => comment.status === CommentStatus.OPEN);
    } else if (filter === 'resolved') {
      filtered = comments.filter(comment => comment.status === CommentStatus.RESOLVED);
    } else if (filter === 'mine') {
      filtered = comments.filter(comment => comment.userId === currentUserId);
    }
    
    // Filter by file if specified
    if (file) {
      filtered = filtered.filter(comment => comment.fileId === file.id);
    }
    
    // Apply sort
    let sorted = [...filtered];
    
    if (sort === 'newest') {
      sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } else if (sort === 'oldest') {
      sorted.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    } else if (sort === 'file') {
      sorted.sort((a, b) => {
        if (a.fileId !== b.fileId) {
          return (a.fileId || '').localeCompare(b.fileId || '');
        }
        if (a.line !== b.line) {
          return (a.line || 0) - (b.line || 0);
        }
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
    }
    
    return sorted;
  }, [comments, filter, sort, file, currentUserId]);
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isFocused) return;
    
    // Navigate comments
    if (key.upArrow) {
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
      return;
    }
    
    if (key.downArrow) {
      setSelectedIndex(prev => 
        (prev < filteredAndSortedComments.length - 1 ? prev + 1 : prev)
      );
      return;
    }
    
    // Change filter
    if (input === 'f') {
      // Cycle through filters
      setFilter(prev => {
        const filters: CommentFilter[] = ['all', 'open', 'resolved', 'mine'];
        const currentIndex = filters.indexOf(prev);
        const nextIndex = (currentIndex + 1) % filters.length;
        return filters[nextIndex];
      });
      setSelectedIndex(0); // Reset selection
      return;
    }
    
    // Change sort
    if (input === 's') {
      // Cycle through sorts
      setSort(prev => {
        const sorts: CommentSort[] = ['newest', 'oldest', 'file'];
        const currentIndex = sorts.indexOf(prev);
        const nextIndex = (currentIndex + 1) % sorts.length;
        return sorts[nextIndex];
      });
      setSelectedIndex(0); // Reset selection
      return;
    }
    
    // Resolve comment
    if (input === 'r' && onCommentResolve && filteredAndSortedComments.length > 0) {
      const selectedComment = filteredAndSortedComments[selectedIndex];
      onCommentResolve(selectedComment.id);
      return;
    }
    
    // Add reaction (like)
    if (input === 'l' && onReactionAdd && filteredAndSortedComments.length > 0) {
      const selectedComment = filteredAndSortedComments[selectedIndex];
      onReactionAdd(selectedComment.id, '👍');
      return;
    }
    
    // Select comment
    if (key.return && onCommentSelect && filteredAndSortedComments.length > 0) {
      const selectedComment = filteredAndSortedComments[selectedIndex];
      onCommentSelect(selectedComment);
      return;
    }
  }, { isActive: isFocused });
  
  /**
   * Render reactions for a comment
   */
  const renderReactions = (reactions?: Reaction[]) => {
    if (!reactions || reactions.length === 0) {
      return null;
    }
    
    return (
      <Box marginTop={1}>
        {reactions.map((reaction) => (
          <Box 
            key={reaction.emoji}
            marginRight={1}
            paddingX={1}
            borderStyle="single"
            borderColor={reaction.users.includes(currentUserId) ? Colors.Primary : Colors.Border}
          >
            <Text>{reaction.emoji} {reaction.count}</Text>
          </Box>
        ))}
      </Box>
    );
  };
  
  return (
    <Box flexDirection="column" width={width} padding={1}>
      <Box>
        <Text bold color={Colors.Primary}>
          Comments ({filteredAndSortedComments.length})
        </Text>
        
        <Box flexGrow={1} justifyContent="flex-end">
          <Text color={Colors.TextDim}>
            Filter: <Text color={Colors.AccentBlue}>{filter}</Text> (F)
          </Text>
          <Text color={Colors.TextDim}> | </Text>
          <Text color={Colors.TextDim}>
            Sort: <Text color={Colors.AccentBlue}>{sort}</Text> (S)
          </Text>
        </Box>
      </Box>
      
      <Box flexDirection="column" marginTop={1}>
        {filteredAndSortedComments.length > 0 ? (
          filteredAndSortedComments.map((comment, index) => {
            const isSelected = index === selectedIndex;
            const author = participantsMap[comment.userId];
            const resolver = comment.resolvedBy ? participantsMap[comment.resolvedBy] : undefined;
            
            return (
              <Box
                key={comment.id}
                flexDirection="column"
                paddingX={1}
                paddingY={1}
                backgroundColor={isSelected ? Colors.DimBackground : undefined}
                borderStyle="single"
                borderColor={isSelected ? Colors.Primary : Colors.Border}
                marginBottom={1}
              >
                {/* Header */}
                <Box>
                  <Text color={getStatusColor(comment.status)}>
                    {getStatusIcon(comment.status)}
                  </Text>
                  
                  <Text 
                    color={author?.color || Colors.Text} 
                    bold
                    marginLeft={1}
                  >
                    {author?.name || 'Unknown'}
                  </Text>
                  
                  <Box flexGrow={1} justifyContent="flex-end">
                    <Text color={Colors.TextDim}>
                      {comment.fileId && !file && `${comment.fileId.split('/').pop()} `}
                      {comment.line ? `L${comment.line}` : ''}
                      {comment.column ? `:${comment.column}` : ''}
                      {comment.line ? ' · ' : ''}
                      {formatTimeAgo(comment.createdAt)}
                    </Text>
                  </Box>
                </Box>
                
                {/* Content */}
                <Box flexDirection="column" marginTop={1} marginLeft={2}>
                  <Text>{comment.content}</Text>
                  
                  {renderReactions(comment.reactions)}
                  
                  {comment.status === CommentStatus.RESOLVED && resolver && (
                    <Box marginTop={1}>
                      <Text color={Colors.TextDim}>
                        Resolved by {resolver.name} {comment.resolvedAt ? formatTimeAgo(comment.resolvedAt) : ''}
                      </Text>
                    </Box>
                  )}
                </Box>
                
                {/* Footer for selected comment */}
                {isSelected && (
                  <Box marginTop={1}>
                    {comment.status === CommentStatus.OPEN && onCommentResolve && (
                      <Text
                        color={Colors.Background}
                        backgroundColor={Colors.Success}
                        paddingX={1}
                        marginRight={1}
                      >
                        Resolve (R)
                      </Text>
                    )}
                    
                    {onReactionAdd && (
                      <Text
                        color={Colors.Background}
                        backgroundColor={Colors.AccentBlue}
                        paddingX={1}
                        marginRight={1}
                      >
                        Like (L)
                      </Text>
                    )}
                  </Box>
                )}
              </Box>
            );
          })
        ) : (
          <Box
            borderStyle="single"
            borderColor={Colors.Border}
            padding={1}
            justifyContent="center"
          >
            <Text color={Colors.TextDim}>No comments found</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default CommentList;