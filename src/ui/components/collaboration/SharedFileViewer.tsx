/**
 * Shared File Viewer Component
 * 
 * Displays a shared file with syntax highlighting, comments,
 * and collaborative editing capabilities.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useInput } from 'ink';
import { Colors } from '../../colors.js';
import { SyntaxColors } from '../../colors.js';
import { 
  SharedFileViewerProps, 
  Comment, 
  CommentStatus 
} from './types.js';

/**
 * Line interface for rendering
 */
interface Line {
  number: number;
  content: string;
  comment?: Comment;
  hasComment: boolean;
  currentUserEditing: boolean;
  otherEditing: boolean;
}

/**
 * Mode for the file viewer
 */
enum ViewerMode {
  VIEW = 'view',
  EDIT = 'edit',
  COMMENT = 'comment'
}

/**
 * Simple syntax highlight for code
 * 
 * Note: This is a simplified version. In a real implementation,
 * we would use a proper syntax highlighter library.
 */
const syntaxHighlight = (code: string, fileType: string): JSX.Element => {
  // Simple highlighting based on file type
  if (['js', 'javascript', 'ts', 'typescript', 'jsx', 'tsx'].includes(fileType.toLowerCase())) {
    // JavaScript/TypeScript syntax highlighting
    const keywords = [
      'const', 'let', 'var', 'function', 'class', 'extends', 'implements',
      'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case',
      'default', 'break', 'continue', 'import', 'export', 'from', 'as',
      'async', 'await', 'try', 'catch', 'finally', 'throw', 'new', 'this',
      'typeof', 'instanceof', 'in', 'of', 'interface', 'type', 'enum'
    ];
    
    // Split into tokens
    const tokens = code.split(/(\s+|[.();{},[\]<>=+-/*&|!:?"'])/);
    
    return (
      <>
        {tokens.map((token, i) => {
          // Keywords
          if (keywords.includes(token)) {
            return <Text key={i} color={SyntaxColors.Keyword}>{token}</Text>;
          }
          
          // Strings
          if ((token.startsWith('"') && token.endsWith('"')) || 
              (token.startsWith("'") && token.endsWith("'"))) {
            return <Text key={i} color={SyntaxColors.String}>{token}</Text>;
          }
          
          // Numbers
          if (/^\d+(\.\d+)?$/.test(token)) {
            return <Text key={i} color={SyntaxColors.Number}>{token}</Text>;
          }
          
          // Comments
          if (token.startsWith('//')) {
            return <Text key={i} color={SyntaxColors.Comment}>{token}</Text>;
          }
          
          // Function/method calls
          if (token.endsWith('(')) {
            return <Text key={i} color={SyntaxColors.Function}>{token}</Text>;
          }
          
          // Default
          return <Text key={i}>{token}</Text>;
        })}
      </>
    );
  }
  
  // For other file types, just return the plain text
  return <Text>{code}</Text>;
};

/**
 * Shared File Viewer Component
 */
export const SharedFileViewer: React.FC<SharedFileViewerProps> = ({
  file,
  comments,
  participants,
  currentUserId,
  allowEditing,
  width,
  height,
  isFocused = true,
  onFileEdit,
  onCommentAdd
}) => {
  // State for mode
  const [mode, setMode] = useState<ViewerMode>(ViewerMode.VIEW);
  // State for cursor position
  const [cursorLine, setCursorLine] = useState(0);
  // State for scroll position
  const [scrollOffset, setScrollOffset] = useState(0);
  // State for editing buffer
  const [editBuffer, setEditBuffer] = useState<string[]>([]);
  // State for comment draft
  const [commentDraft, setCommentDraft] = useState('');
  
  // Prepare lines from content
  const lines = React.useMemo(() => {
    const content = file.content || '';
    const contentLines = content.split('\n');
    
    // Map comments to lines
    const commentsByLine = comments.reduce<Record<number, Comment>>((map, comment) => {
      if (comment.line !== undefined) {
        map[comment.line] = comment;
      }
      return map;
    }, {});
    
    // Create line objects
    return contentLines.map((content, index) => {
      const lineNumber = index + 1;
      const comment = commentsByLine[lineNumber];
      
      // Check if line is being edited by current user or others
      // This would come from real-time collaboration data in a real implementation
      const currentUserEditing = false;
      const otherEditing = false;
      
      return {
        number: lineNumber,
        content,
        comment,
        hasComment: !!comment,
        currentUserEditing,
        otherEditing
      };
    });
  }, [file.content, comments]);
  
  // Initialize edit buffer from content
  useEffect(() => {
    if (file.content) {
      setEditBuffer(file.content.split('\n'));
    }
  }, [file.content]);
  
  // Calculate visible lines range
  const visibleLineCount = height - 4; // Account for header and footer
  const maxScrollOffset = Math.max(0, lines.length - visibleLineCount);
  const visibleLines = lines.slice(scrollOffset, scrollOffset + visibleLineCount);
  
  // Find participants by ID
  const findParticipant = useCallback((userId: string) => {
    return participants.find(p => p.id === userId);
  }, [participants]);
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isFocused) return;
    
    // Navigation
    if (key.upArrow) {
      if (cursorLine > 0) {
        setCursorLine(prev => prev - 1);
        
        // Scroll if necessary
        if (cursorLine - scrollOffset < 2 && scrollOffset > 0) {
          setScrollOffset(prev => prev - 1);
        }
      }
      return;
    }
    
    if (key.downArrow) {
      if (cursorLine < lines.length - 1) {
        setCursorLine(prev => prev + 1);
        
        // Scroll if necessary
        if (cursorLine - scrollOffset > visibleLineCount - 3 && scrollOffset < maxScrollOffset) {
          setScrollOffset(prev => prev + 1);
        }
      }
      return;
    }
    
    // Page up/down
    if (key.pageUp) {
      const newScrollOffset = Math.max(0, scrollOffset - visibleLineCount);
      setScrollOffset(newScrollOffset);
      setCursorLine(newScrollOffset);
      return;
    }
    
    if (key.pageDown) {
      const newScrollOffset = Math.min(maxScrollOffset, scrollOffset + visibleLineCount);
      setScrollOffset(newScrollOffset);
      setCursorLine(newScrollOffset);
      return;
    }
    
    // Home/end
    if (key.home) {
      setScrollOffset(0);
      setCursorLine(0);
      return;
    }
    
    if (key.end) {
      setScrollOffset(maxScrollOffset);
      setCursorLine(lines.length - 1);
      return;
    }
    
    // Mode switching
    if (input === 'v') {
      setMode(ViewerMode.VIEW);
      return;
    }
    
    if (input === 'e' && allowEditing) {
      setMode(ViewerMode.EDIT);
      return;
    }
    
    if (input === 'c') {
      setMode(ViewerMode.COMMENT);
      setCommentDraft('');
      return;
    }
    
    // Editing mode keyboard handling
    if (mode === ViewerMode.EDIT) {
      // Save changes
      if (key.ctrl && input === 's') {
        const newContent = editBuffer.join('\n');
        if (onFileEdit) {
          onFileEdit(file.id, newContent);
        }
        setMode(ViewerMode.VIEW);
        return;
      }
      
      // Cancel edit
      if (key.escape) {
        // Reset edit buffer
        if (file.content) {
          setEditBuffer(file.content.split('\n'));
        }
        setMode(ViewerMode.VIEW);
        return;
      }
      
      // This is a simplified editor - in a real implementation,
      // we would have a more sophisticated editor with cursor
      // positioning, line editing, etc.
    }
    
    // Comment mode keyboard handling
    if (mode === ViewerMode.COMMENT) {
      // Submit comment
      if (key.ctrl && input === 's') {
        if (commentDraft.trim() && onCommentAdd) {
          onCommentAdd({
            content: commentDraft.trim(),
            line: cursorLine + 1
          });
        }
        setMode(ViewerMode.VIEW);
        return;
      }
      
      // Cancel comment
      if (key.escape) {
        setMode(ViewerMode.VIEW);
        return;
      }
      
      // Handle comment input
      if (key.return) {
        setCommentDraft(prev => prev + '\n');
        return;
      }
      
      if (key.backspace || key.delete) {
        setCommentDraft(prev => prev.slice(0, -1));
        return;
      }
      
      // Add character to comment
      if (!key.ctrl && !key.meta && !key.shift && input) {
        setCommentDraft(prev => prev + input);
        return;
      }
    }
  }, { isActive: isFocused });
  
  // Render comment indicator for a line
  const renderCommentIndicator = (line: Line) => {
    if (!line.hasComment) return null;
    
    const status = line.comment?.status || CommentStatus.OPEN;
    const color = status === CommentStatus.OPEN ? Colors.AccentBlue :
                  status === CommentStatus.RESOLVED ? Colors.Success :
                  Colors.TextDim;
    
    return (
      <Text color={color} bold>
        {status === CommentStatus.OPEN ? '◆' : '✓'} {' '}
      </Text>
    );
  };
  
  // Render line with syntax highlighting
  const renderLine = (line: Line, isCurrent: boolean) => {
    return (
      <Box key={line.number}>
        {/* Line number */}
        <Box width={6} backgroundColor={isCurrent ? Colors.DimBackground : undefined}>
          <Text color={Colors.TextDim} dimColor>{line.number.toString().padStart(4, ' ')}</Text>
        </Box>
        
        {/* Comment indicator */}
        <Box width={2}>
          {renderCommentIndicator(line)}
        </Box>
        
        {/* Line content with syntax highlighting */}
        <Box flexGrow={1}>
          {syntaxHighlight(line.content, file.type)}
        </Box>
      </Box>
    );
  };
  
  // Render comments for the current line
  const renderCurrentLineComment = () => {
    const currentLine = lines[cursorLine];
    if (!currentLine || !currentLine.hasComment) return null;
    
    const comment = currentLine.comment!;
    const author = findParticipant(comment.userId);
    
    return (
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={Colors.Border}
        padding={1}
        marginTop={1}
      >
        <Box>
          <Text color={author?.color || Colors.Text} bold>
            {author?.name || 'Unknown'}
          </Text>
          <Text color={Colors.TextDim}> commented on line {comment.line}</Text>
        </Box>
        
        <Box marginTop={1}>
          <Text>{comment.content}</Text>
        </Box>
      </Box>
    );
  };
  
  // Render the comment editor
  const renderCommentEditor = () => {
    return (
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={Colors.Primary}
        padding={1}
        marginTop={1}
      >
        <Box>
          <Text bold color={Colors.Primary}>Add comment to line {cursorLine + 1}</Text>
        </Box>
        
        <Box
          borderStyle="single"
          borderColor={Colors.Border}
          padding={1}
          marginTop={1}
          flexDirection="column"
          height={5}
        >
          <Text>{commentDraft}</Text>
        </Box>
        
        <Box marginTop={1}>
          <Text color={Colors.TextDim}>
            <Text color={Colors.AccentBlue}>Ctrl+S</Text> to save, <Text color={Colors.AccentBlue}>Esc</Text> to cancel
          </Text>
        </Box>
      </Box>
    );
  };
  
  return (
    <Box flexDirection="column" width={width} height={height}>
      {/* Header */}
      <Box
        backgroundColor={Colors.BackgroundAlt}
        paddingX={1}
        paddingY={0}
      >
        <Text bold color={Colors.Primary}>
          {file.name}
        </Text>
        <Text color={Colors.TextDim}> ({file.path})</Text>
        
        <Box flexGrow={1} justifyContent="flex-end">
          <Text 
            backgroundColor={mode === ViewerMode.VIEW ? Colors.Primary : undefined}
            color={mode === ViewerMode.VIEW ? Colors.Background : Colors.TextDim}
            paddingX={1}
            marginRight={1}
            onClick={() => setMode(ViewerMode.VIEW)}
          >
            View (V)
          </Text>
          
          {allowEditing && (
            <Text 
              backgroundColor={mode === ViewerMode.EDIT ? Colors.Primary : undefined}
              color={mode === ViewerMode.EDIT ? Colors.Background : Colors.TextDim}
              paddingX={1}
              marginRight={1}
              onClick={() => setMode(ViewerMode.EDIT)}
            >
              Edit (E)
            </Text>
          )}
          
          <Text 
            backgroundColor={mode === ViewerMode.COMMENT ? Colors.Primary : undefined}
            color={mode === ViewerMode.COMMENT ? Colors.Background : Colors.TextDim}
            paddingX={1}
            onClick={() => setMode(ViewerMode.COMMENT)}
          >
            Comment (C)
          </Text>
        </Box>
      </Box>
      
      {/* File content */}
      <Box 
        flexDirection="column"
        overflow="hidden"
        height={visibleLineCount}
        borderStyle="single"
        borderColor={Colors.Border}
      >
        {visibleLines.map((line, index) => {
          const absoluteLineIndex = index + scrollOffset;
          const isCurrent = absoluteLineIndex === cursorLine;
          return renderLine(line, isCurrent);
        })}
      </Box>
      
      {/* Footer with stats and position */}
      <Box
        backgroundColor={Colors.BackgroundAlt}
        paddingX={1}
        paddingY={0}
      >
        <Text color={Colors.TextDim}>
          Line {cursorLine + 1} of {lines.length}
        </Text>
        
        <Box flexGrow={1} justifyContent="flex-end">
          <Text color={Colors.TextDim}>
            {comments.length} comments | {file.size} bytes
          </Text>
        </Box>
      </Box>
      
      {/* Comment area or editor */}
      {mode === ViewerMode.VIEW && renderCurrentLineComment()}
      {mode === ViewerMode.COMMENT && renderCommentEditor()}
    </Box>
  );
};

export default SharedFileViewer;