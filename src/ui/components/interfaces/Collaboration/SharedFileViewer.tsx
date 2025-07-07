/**
 * SharedFileViewer Component
 * 
 * Displays the content of a shared file with collaboration features.
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { SharedFile, CollaborationComment } from './collaboration-types';

interface SharedFileViewerProps {
  file: SharedFile;
  width: number;
  height: number;
  currentUserId?: string;
  canEdit: boolean;
  comments: CollaborationComment[];
  onAddComment: (content: string, target: { fileId: string, lineNumber?: number }) => void;
}

export const SharedFileViewer: React.FC<SharedFileViewerProps> = ({
  file,
  width,
  height,
  currentUserId,
  canEdit,
  comments,
  onAddComment
}) => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [selectedLine, setSelectedLine] = useState<number | undefined>(undefined);
  
  // Calculate visible content
  const lines = file.content.split('\n');
  const visibleLines = lines.slice(scrollPosition, scrollPosition + height - 5);
  
  // Map line numbers to comments
  const lineComments = new Map<number, CollaborationComment[]>();
  comments.forEach(comment => {
    if (comment.target?.fileId === file.id && comment.target.lineNumber !== undefined) {
      const lineNum = comment.target.lineNumber;
      if (!lineComments.has(lineNum)) {
        lineComments.set(lineNum, []);
      }
      lineComments.get(lineNum)?.push(comment);
    }
  });
  
  // Handle keyboard input
  useInput((input, key) => {
    if (isAddingComment) {
      if (key.escape) {
        setIsAddingComment(false);
        setCommentText('');
        return;
      }
      
      if (key.return) {
        if (commentText.trim().length > 0 && selectedLine !== undefined) {
          onAddComment(commentText, { fileId: file.id, lineNumber: selectedLine });
          setIsAddingComment(false);
          setCommentText('');
        }
        return;
      }
      
      if (key.backspace) {
        setCommentText(prev => prev.slice(0, -1));
        return;
      }
      
      if (input && !key.ctrl && !key.meta && input.length === 1) {
        setCommentText(prev => prev + input);
      }
      
      return;
    }
    
    if (key.upArrow) {
      if (scrollPosition > 0) {
        setScrollPosition(prev => prev - 1);
      }
    } else if (key.downArrow) {
      if (scrollPosition + height - 5 < lines.length) {
        setScrollPosition(prev => prev + 1);
      }
    } else if (key.pageUp) {
      setScrollPosition(prev => Math.max(0, prev - (height - 5)));
    } else if (key.pageDown) {
      setScrollPosition(prev => Math.min(lines.length - (height - 5), prev + (height - 5)));
    } else if (key.home) {
      setScrollPosition(0);
    } else if (key.end) {
      setScrollPosition(Math.max(0, lines.length - (height - 5)));
    } else if (input === 'c' && selectedLine !== undefined) {
      setIsAddingComment(true);
    } else if (input >= '0' && input <= '9') {
      // Select line by number for commenting
      const lineNumber = parseInt(input) + scrollPosition;
      if (lineNumber < lines.length) {
        setSelectedLine(lineNumber);
      }
    }
  });
  
  return (
    <Box flexDirection="column" width={width} height={height} borderStyle="single" borderColor="gray">
      <Box paddingX={1} backgroundColor="blue">
        <Text bold>{file.name}</Text>
        <Text dimColor> • {file.viewerCount} viewer{file.viewerCount !== 1 ? 's' : ''}</Text>
        {canEdit && <Text color="green"> (Editable)</Text>}
      </Box>
      
      <Box flexDirection="column" flexGrow={1}>
        {visibleLines.map((line, index) => {
          const actualLineNumber = index + scrollPosition;
          const isSelected = selectedLine === actualLineNumber;
          const hasComments = lineComments.has(actualLineNumber);
          const commentCount = hasComments ? lineComments.get(actualLineNumber)?.length ?? 0 : 0;
          
          return (
            <Box key={index}>
              <Box width={5} paddingX={1} backgroundColor={isSelected ? 'blue' : undefined}>
                <Text color={isSelected ? 'white' : 'gray'}>
                  {actualLineNumber + 1}
                </Text>
              </Box>
              
              <Box flexGrow={1}>
                <Text color={isSelected ? 'yellow' : undefined}>{line}</Text>
              </Box>
              
              {hasComments && (
                <Box paddingX={1}>
                  <Text color="cyan">💬 {commentCount}</Text>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
      
      {isAddingComment && selectedLine !== undefined ? (
        <Box flexDirection="column" borderStyle="single" borderColor="yellow" paddingX={1} paddingY={0}>
          <Text bold>Adding comment to line {selectedLine + 1}</Text>
          <Box>
            <Text>{commentText}</Text>
            <Text>|</Text>
          </Box>
          <Text dimColor>Press Enter to submit, Esc to cancel</Text>
        </Box>
      ) : (
        <Box paddingX={1}>
          <Text dimColor>
            ↑/↓: Scroll • 0-9: Select line • C: Comment
            {selectedLine !== undefined && ` • Line ${selectedLine + 1} selected`}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default SharedFileViewer;