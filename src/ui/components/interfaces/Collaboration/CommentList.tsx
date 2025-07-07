/**
 * CommentList Component
 * 
 * Displays a list of comments in a collaboration session.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { CollaborationComment } from './collaboration-types';

interface CommentListProps {
  comments: CollaborationComment[];
  width: number;
  onResolveComment?: (commentId: string) => void;
  onReactToComment?: (commentId: string, emoji: string) => void;
}

/**
 * Format timestamp to readable format
 */
const formatTimestamp = (date: Date): string => {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

export const CommentList: React.FC<CommentListProps> = ({
  comments,
  width,
  onResolveComment,
  onReactToComment
}) => {
  return (
    <Box flexDirection="column" width={width} borderStyle="single" borderColor="gray">
      <Box paddingX={1} backgroundColor="blue">
        <Text bold>Comments ({comments.length})</Text>
      </Box>
      
      <Box flexDirection="column" paddingX={1}>
        {comments.length === 0 ? (
          <Text dimColor>No comments</Text>
        ) : (
          comments.map(comment => {
            const hasTarget = comment.target !== undefined;
            const isResolved = comment.resolved === true;
            
            return (
              <Box key={comment.id} flexDirection="column" marginY={1}>
                <Box>
                  <Text bold color="yellow">{comment.author}</Text>
                  <Text dimColor> at {formatTimestamp(comment.timestamp)}</Text>
                  {isResolved && (
                    <Text color="green"> (Resolved)</Text>
                  )}
                </Box>
                
                {hasTarget && comment.target?.fileId && (
                  <Text dimColor>
                    On {comment.target.fileId}{comment.target.lineNumber ? `:${comment.target.lineNumber}` : ''}
                  </Text>
                )}
                
                <Box marginY={0}>
                  <Text>{comment.content}</Text>
                </Box>
                
                {comment.reactions && comment.reactions.length > 0 && (
                  <Box marginTop={1}>
                    {comment.reactions.map((reaction, index) => (
                      <Box key={index} marginRight={1}>
                        <Text>{reaction.emoji} {reaction.count}</Text>
                      </Box>
                    ))}
                  </Box>
                )}
                
                {!isResolved && onResolveComment && (
                  <Box marginTop={1}>
                    <Text dimColor>Press R to resolve</Text>
                  </Box>
                )}
                
                <Box height={1}>
                  <Text> </Text>
                </Box>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
};

export default CommentList;