/**
 * Multimodal Content Handler Component
 * 
 * This component handles Claude/Gemini-style multimodal content processing
 * including images, audio, video, documents, and real-time content analysis.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../colors.js';
import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger.js';

/**
 * Content type enum for different media types
 */
export enum ContentType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  DOCUMENT = 'document',
  CODE = 'code',
  SPREADSHEET = 'spreadsheet',
  PRESENTATION = 'presentation'
}

/**
 * Processing status enum
 */
export enum ProcessingStatus {
  PENDING = 'pending',
  ANALYZING = 'analyzing',
  EXTRACTING = 'extracting',
  TRANSCRIBING = 'transcribing',
  COMPLETE = 'complete',
  ERROR = 'error'
}

/**
 * Content analysis result interface
 */
export interface ContentAnalysis {
  summary: string;
  keyPoints: string[];
  entities?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  confidence: number;
  processingTime: number;
  metadata?: Record<string, unknown>;
}

/**
 * Multimodal content item interface
 */
export interface MultimodalContentItem {
  id: string;
  type: ContentType;
  name: string;
  size: number;
  mimeType: string;
  content?: string | ArrayBuffer;
  thumbnailUrl?: string;
  status: ProcessingStatus;
  progress?: number;
  analysis?: ContentAnalysis;
  error?: string;
  uploadedAt: number;
  metadata?: {
    dimensions?: { width: number; height: number };
    duration?: number;
    pages?: number;
    language?: string;
    encoding?: string;
  };
}

/**
 * Content processing capabilities interface
 */
export interface ProcessingCapabilities {
  imageAnalysis: boolean;
  audioTranscription: boolean;
  videoAnalysis: boolean;
  documentExtraction: boolean;
  codeAnalysis: boolean;
  realTimeProcessing: boolean;
  batchProcessing: boolean;
  cloudProcessing: boolean;
}

/**
 * Multimodal content handler props
 */
interface MultimodalContentHandlerProps {
  /**
   * Current content items
   */
  contentItems: MultimodalContentItem[];
  
  /**
   * Processing capabilities
   */
  capabilities: ProcessingCapabilities;
  
  /**
   * Terminal dimensions
   */
  terminalWidth: number;
  terminalHeight: number;
  
  /**
   * Whether drag & drop is enabled
   */
  dragDropEnabled?: boolean;
  
  /**
   * Maximum file size (in bytes)
   */
  maxFileSize?: number;
  
  /**
   * Supported file types
   */
  supportedTypes?: ContentType[];
  
  /**
   * Theme colors
   */
  theme?: {
    primary: string;
    secondary: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
    muted: string;
  };
  
  /**
   * Callback for content upload
   */
  onContentUpload?: (files: File[]) => void;
  
  /**
   * Callback for content analysis
   */
  onContentAnalyze?: (contentId: string) => void;
  
  /**
   * Callback for content removal
   */
  onContentRemove?: (contentId: string) => void;
  
  /**
   * Callback for batch processing
   */
  onBatchProcess?: (contentIds: string[]) => void;
  
  /**
   * Callback for content interaction
   */
  onContentInteraction?: (contentId: string, action: 'view' | 'edit' | 'share' | 'export') => void;
}

// File path detection utility
const isFilePath = (text: string): boolean => {
  // Check for common file path patterns
  const patterns = [
    /^\/[^\/\s]+/,                    // Unix absolute path
    /^~\/[^\/\s]+/,                   // Unix home path
    /^[A-Z]:\\[^\\\/\s]+/,            // Windows absolute path
    /^\.\/[^\/\s]+/,                  // Relative path starting with ./
    /^\.\.\/[^\/\s]+/,                // Relative path starting with ../
    /^[^\/\s]+\.[a-zA-Z0-9]{1,10}$/,  // Filename with extension
  ];
  
  return patterns.some(pattern => pattern.test(text.trim()));
};

// File type detection
const getFileType = (filePath: string): ContentType => {
  const ext = path.extname(filePath).toLowerCase();
  
  // Image files
  if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'].includes(ext)) {
    return ContentType.IMAGE;
  }
  
  // Audio files
  if (['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac'].includes(ext)) {
    return ContentType.AUDIO;
  }
  
  // Video files
  if (['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'].includes(ext)) {
    return ContentType.VIDEO;
  }
  
  // Document files
  if (['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'].includes(ext)) {
    return ContentType.DOCUMENT;
  }
  
  // Code files
  if (['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.css', '.html', '.xml', '.json', '.yaml', '.yml'].includes(ext)) {
    return ContentType.CODE;
  }
  
  // Spreadsheet files
  if (['.xls', '.xlsx', '.csv', '.ods'].includes(ext)) {
    return ContentType.SPREADSHEET;
  }
  
  // Presentation files
  if (['.ppt', '.pptx', '.odp'].includes(ext)) {
    return ContentType.PRESENTATION;
  }
  
  return ContentType.TEXT;
};

// File processing utility
const processFile = async (filePath: string): Promise<MultimodalContentItem> => {
  const stats = fs.statSync(filePath);
  const fileName = path.basename(filePath);
  const fileType = getFileType(filePath);
  
  const item: MultimodalContentItem = {
    id: `file-${Date.now()}-${Math.random()}`,
    type: fileType,
    name: fileName,
    size: stats.size,
    mimeType: getMimeType(fileType),
    status: ProcessingStatus.PENDING,
    uploadedAt: Date.now(),
    metadata: {
      encoding: 'utf-8'
    }
  };
  
  // For text/code files, read content
  if (fileType === ContentType.TEXT || fileType === ContentType.CODE) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      item.content = content;
      item.status = ProcessingStatus.COMPLETE;
    } catch (error) {
      item.error = `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`;
      item.status = ProcessingStatus.ERROR;
    }
  }
  
  // For images, set up for display
  if (fileType === ContentType.IMAGE) {
    try {
      const buffer = fs.readFileSync(filePath);
      item.content = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      item.status = ProcessingStatus.COMPLETE;
      
      // Try to get image dimensions (simplified)
      item.metadata = {
        ...item.metadata,
        dimensions: { width: 0, height: 0 } // Placeholder
      };
    } catch (error) {
      item.error = `Failed to load image: ${error instanceof Error ? error.message : 'Unknown error'}`;
      item.status = ProcessingStatus.ERROR;
    }
  }
  
  return item;
};

// MIME type mapping
const getMimeType = (type: ContentType): string => {
  switch (type) {
    case ContentType.IMAGE: return 'image/*';
    case ContentType.AUDIO: return 'audio/*';
    case ContentType.VIDEO: return 'video/*';
    case ContentType.DOCUMENT: return 'application/pdf';
    case ContentType.CODE: return 'text/plain';
    case ContentType.SPREADSHEET: return 'application/vnd.ms-excel';
    case ContentType.PRESENTATION: return 'application/vnd.ms-powerpoint';
    default: return 'text/plain';
  }
};

/**
 * Multimodal content handler component
 */
export const MultimodalContentHandler: React.FC<MultimodalContentHandlerProps> = ({
  contentItems,
  capabilities,
  terminalWidth,
  terminalHeight,
  dragDropEnabled = true,
  maxFileSize = 50 * 1024 * 1024, // 50MB default
  supportedTypes = Object.values(ContentType),
  theme = {
    primary: Colors.Primary,
    secondary: Colors.Secondary,
    accent: Colors.AccentBlue,
    success: Colors.Success,
    warning: Colors.Warning,
    error: Colors.Error,
    muted: Colors.TextMuted
  },
  onContentUpload,
  onContentAnalyze,
  onContentRemove,
  onBatchProcess,
  onContentInteraction
}) => {
  // State management
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'details'>('list');
  const [filterType, setFilterType] = useState<ContentType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'type'>('date');
  const [showAnalysis, setShowAnalysis] = useState<boolean>(false);
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set());
  const [filePathInput, setFilePathInput] = useState<string>('');
  const [showFileInput, setShowFileInput] = useState<boolean>(false);
  
  // File path monitoring
  const [watchedPaths, setWatchedPaths] = useState<string[]>([]);
  
  // Process file path input
  const handleFilePathInput = useCallback(async (input: string) => {
    const paths = input.split(',').map(p => p.trim()).filter(p => p.length > 0);
    
    for (const pathInput of paths) {
      let resolvedPath = pathInput;
      
      // Resolve relative paths
      if (pathInput.startsWith('./') || pathInput.startsWith('../')) {
        resolvedPath = path.resolve(process.cwd(), pathInput);
      } else if (pathInput.startsWith('~/')) {
        resolvedPath = path.resolve(process.env.HOME || process.env.USERPROFILE || '', pathInput.slice(2));
      }
      
      // Check if file exists
      if (!fs.existsSync(resolvedPath)) {
        logger.warn(`File not found: ${resolvedPath}`);
        continue;
      }
      
      // Check if it's a file (not directory)
      const stats = fs.statSync(resolvedPath);
      if (!stats.isFile()) {
        logger.warn(`Path is not a file: ${resolvedPath}`);
        continue;
      }
      
      // Check if file is already loaded
      if (contentItems.some(item => item.name === path.basename(resolvedPath))) {
        logger.info(`File already loaded: ${path.basename(resolvedPath)}`);
        continue;
      }
      
      // Process the file
      setProcessingFiles(prev => new Set(prev).add(resolvedPath));
      
      try {
        const item = await processFile(resolvedPath);
        
        // Create a File object for the callback
        const file = new File([item.content || ''], item.name, { type: item.mimeType });
        onContentUpload?.([file]);
        
        logger.info(`Successfully loaded: ${item.name} (${item.type})`);
      } catch (error) {
        logger.error(`Failed to process file ${resolvedPath}:`, error);
      } finally {
        setProcessingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(resolvedPath);
          return newSet;
        });
      }
    }
    
    setFilePathInput('');
    setShowFileInput(false);
  }, [contentItems, onContentUpload]);
  
  // Keyboard shortcuts for file operations
  useInput((input, key) => {
    if (key.ctrl && input === 'u') {
      // Ctrl+U to show file input
      setShowFileInput(true);
      return;
    }
    
    if (key.ctrl && input === 'o') {
      // Ctrl+O to open current directory
      const cwd = process.cwd();
      logger.info(`Current directory: ${cwd}`);
      return;
    }
    
    if (showFileInput) {
      if (key.return) {
        // Enter to process file path
        if (filePathInput.trim()) {
          handleFilePathInput(filePathInput);
        } else {
          setShowFileInput(false);
        }
      } else if (key.escape) {
        // Escape to cancel
        setShowFileInput(false);
        setFilePathInput('');
      } else if (key.backspace) {
        // Backspace to remove character
        setFilePathInput(prev => prev.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        // Add character to input
        setFilePathInput(prev => prev + input);
      }
    }
  }, { isActive: dragDropEnabled });
  
  // Auto-detect file paths in clipboard or input
  useEffect(() => {
    const checkClipboard = async () => {
      // This is a placeholder - in a real implementation, you might want to
      // check clipboard content or monitor for file path patterns
    };
    
    const interval = setInterval(checkClipboard, 2000);
    return () => clearInterval(interval);
  }, []);
  
  // File path validation
  const validateFilePath = useCallback((pathInput: string): boolean => {
    if (!pathInput.trim()) return false;
    
    try {
      const resolvedPath = path.resolve(pathInput);
      return fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile();
    } catch {
      return false;
    }
  }, []);
  
  // Keyboard shortcuts
  useInput((input, key) => {
    if (key.ctrl) {
      switch (input) {
        case 'a':
          // Select all
          setSelectedItems(new Set(contentItems.map(item => item.id)));
          break;
        case 'd':
          // Deselect all
          setSelectedItems(new Set());
          break;
        case 'r':
          // Remove selected items
          selectedItems.forEach(id => onContentRemove?.(id));
          setSelectedItems(new Set());
          break;
        case 'p':
          // Batch process selected items
          if (selectedItems.size > 0) {
            onBatchProcess?.(Array.from(selectedItems));
          }
          break;
        case 'v':
          // Toggle view mode
          setViewMode(prev => {
            switch (prev) {
              case 'list': return 'grid';
              case 'grid': return 'details';
              case 'details': return 'list';
              default: return 'list';
            }
          });
          break;
        case 'f':
          // Toggle filter
          setFilterType(prev => {
            const types = ['all', ...Object.values(ContentType)];
            const currentIndex = types.indexOf(prev);
            return types[(currentIndex + 1) % types.length] as ContentType | 'all';
          });
          break;
        case 's':
          // Toggle sort
          setSortBy(prev => {
            const sorts = ['name', 'date', 'size', 'type'];
            const currentIndex = sorts.indexOf(prev);
            return sorts[(currentIndex + 1) % sorts.length] as typeof sortBy;
          });
          break;
        case 'i':
          // Toggle analysis view
          setShowAnalysis(prev => !prev);
          break;
      }
    }
    
    // Item selection with arrow keys
    if (key.upArrow || key.downArrow) {
      const filteredItems = getFilteredAndSortedItems();
      if (filteredItems.length > 0) {
        const selectedArray = Array.from(selectedItems);
        const currentItem = selectedArray[0];
        const currentIndex = currentItem ? filteredItems.findIndex(item => item.id === currentItem) : -1;
        
        let newIndex = currentIndex;
        if (key.upArrow) {
          newIndex = currentIndex > 0 ? currentIndex - 1 : filteredItems.length - 1;
        } else {
          newIndex = currentIndex < filteredItems.length - 1 ? currentIndex + 1 : 0;
        }
        
        setSelectedItems(new Set([filteredItems[newIndex].id]));
      }
    }
    
    // Space to toggle selection
    if (input === ' ') {
      const selectedArray = Array.from(selectedItems);
      if (selectedArray.length === 1) {
        const itemId = selectedArray[0];
        setSelectedItems(prev => {
          const newSet = new Set(prev);
          if (newSet.has(itemId)) {
            newSet.delete(itemId);
          } else {
            newSet.add(itemId);
          }
          return newSet;
        });
      }
    }
    
    // Enter to analyze selected item
    if (key.return) {
      const selectedArray = Array.from(selectedItems);
      if (selectedArray.length === 1) {
        onContentAnalyze?.(selectedArray[0]);
      }
    }
  });
  
  // Filter and sort content items
  const getFilteredAndSortedItems = useCallback(() => {
    let filtered = contentItems;
    
    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.type === filterType);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return b.uploadedAt - a.uploadedAt;
        case 'size':
          return b.size - a.size;
        case 'type':
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [contentItems, filterType, sortBy]);
  
  // Get content type icon
  const getContentIcon = (type: ContentType): string => {
    switch (type) {
      case ContentType.IMAGE: return '🖼️';
      case ContentType.AUDIO: return '🎵';
      case ContentType.VIDEO: return '🎬';
      case ContentType.DOCUMENT: return '📄';
      case ContentType.CODE: return '💻';
      case ContentType.SPREADSHEET: return '📊';
      case ContentType.PRESENTATION: return '📽️';
      default: return '📝';
    }
  };
  
  // Get processing status icon
  const getStatusIcon = (status: ProcessingStatus): string => {
    switch (status) {
      case ProcessingStatus.PENDING: return '⏳';
      case ProcessingStatus.ANALYZING: return '🔍';
      case ProcessingStatus.EXTRACTING: return '📤';
      case ProcessingStatus.TRANSCRIBING: return '🎤';
      case ProcessingStatus.COMPLETE: return '✅';
      case ProcessingStatus.ERROR: return '❌';
      default: return '❓';
    }
  };
  
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  };
  
  // Render header with controls
  const renderHeader = () => (
    <Box borderStyle="single" borderColor={theme.primary} paddingX={1}>
      <Box justifyContent="space-between" width="100%">
        <Box>
          <Text color={theme.accent}>🎭 Multimodal Content</Text>
          <Text color={theme.muted}>
            {' '}• {contentItems.length} items • {selectedItems.size} selected
          </Text>
        </Box>
        <Box>
          <Text color={theme.muted}>
            View: {viewMode} • Filter: {filterType} • Sort: {sortBy}
          </Text>
        </Box>
      </Box>
    </Box>
  );
  
  // Render capabilities panel
  const renderCapabilities = () => (
    <Box borderStyle="round" borderColor={theme.secondary} paddingX={1} marginY={1}>
      <Box flexDirection="column">
        <Text color={theme.secondary} bold>🚀 Processing Capabilities:</Text>
        <Box marginTop={1}>
          <Text color={capabilities.imageAnalysis ? theme.success : theme.muted}>
            {capabilities.imageAnalysis ? '✅' : '❌'} Image Analysis
          </Text>
          <Text color={capabilities.audioTranscription ? theme.success : theme.muted}>
            {' '}• {capabilities.audioTranscription ? '✅' : '❌'} Audio Transcription
          </Text>
          <Text color={capabilities.videoAnalysis ? theme.success : theme.muted}>
            {' '}• {capabilities.videoAnalysis ? '✅' : '❌'} Video Analysis
          </Text>
        </Box>
        <Box>
          <Text color={capabilities.documentExtraction ? theme.success : theme.muted}>
            {capabilities.documentExtraction ? '✅' : '❌'} Document Extraction
          </Text>
          <Text color={capabilities.codeAnalysis ? theme.success : theme.muted}>
            {' '}• {capabilities.codeAnalysis ? '✅' : '❌'} Code Analysis
          </Text>
          <Text color={capabilities.realTimeProcessing ? theme.success : theme.muted}>
            {' '}• {capabilities.realTimeProcessing ? '✅' : '❌'} Real-time
          </Text>
        </Box>
      </Box>
    </Box>
  );
  
  // Render content items
  const renderContentItems = () => {
    const filteredItems = getFilteredAndSortedItems();
    
    if (filteredItems.length === 0) {
      return (
        <Box justifyContent="center" alignItems="center" height={Math.max(5, terminalHeight - 10)}>
          <Box flexDirection="column" alignItems="center">
            <Text color={theme.muted}>No content items found</Text>
            {dragDropEnabled && (
              <Box flexDirection="column" alignItems="center" marginTop={1}>
                <Text color={theme.accent} bold>📁 File Operations:</Text>
                <Text color={theme.muted}>• Press Ctrl+U to add file paths</Text>
                <Text color={theme.muted}>• Press Ctrl+O to see current directory</Text>
                <Text color={theme.muted}>• Type file paths separated by commas</Text>
                <Text color={theme.muted}>• Supports: ./file.txt, ~/docs/file.pdf, /absolute/path</Text>
              </Box>
            )}
          </Box>
        </Box>
      );
    }
    
    return (
      <Box flexDirection="column">
        {filteredItems.map(item => {
          const isSelected = selectedItems.has(item.id);
          const statusColor = item.status === ProcessingStatus.ERROR ? theme.error :
                             item.status === ProcessingStatus.COMPLETE ? theme.success :
                             theme.warning;
          
          return (
            <Box 
              key={item.id}
              borderStyle={isSelected ? "double" : "single"}
              borderColor={isSelected ? theme.accent : theme.muted}
              paddingX={1}
              marginY={0}
            >
              <Box flexDirection="column">
                {/* Item header */}
                <Box justifyContent="space-between">
                  <Box>
                    <Text color={theme.primary}>
                      {getContentIcon(item.type)} {item.name}
                    </Text>
                    <Text color={statusColor}>
                      {' '}{getStatusIcon(item.status)} {item.status}
                    </Text>
                  </Box>
                  <Box>
                    <Text color={theme.muted}>
                      {formatFileSize(item.size)}
                    </Text>
                    {item.metadata?.duration && (
                      <Text color={theme.muted}>
                        {' '}• {Math.round(item.metadata.duration)}s
                      </Text>
                    )}
                  </Box>
                </Box>
                
                {/* Progress bar for processing items */}
                {item.progress !== undefined && item.progress < 100 && (
                  <Box marginTop={1}>
                    <Text color={theme.accent}>
                      Progress: {item.progress}%
                    </Text>
                  </Box>
                )}
                
                {/* Analysis results */}
                {showAnalysis && item.analysis && (
                  <Box marginTop={1} borderStyle="round" borderColor={theme.secondary} paddingX={1}>
                    <Box flexDirection="column">
                      <Text color={theme.secondary} bold>Analysis Results:</Text>
                      <Text color={theme.muted}>
                        Summary: {item.analysis.summary.slice(0, 100)}...
                      </Text>
                      <Text color={theme.muted}>
                        Confidence: {Math.round(item.analysis.confidence * 100)}% 
                        • Processing: {item.analysis.processingTime}ms
                      </Text>
                    </Box>
                  </Box>
                )}
                
                {/* Error display */}
                {item.error && (
                  <Box marginTop={1}>
                    <Text color={theme.error}>Error: {item.error}</Text>
                  </Box>
                )}
              </Box>
            </Box>
          );
        })}
        
        {/* Show processing files */}
        {processingFiles.size > 0 && (
          <Box borderStyle="round" borderColor={theme.warning} paddingX={1} marginTop={1}>
            <Box flexDirection="column">
              <Text color={theme.warning} bold>⏳ Processing Files:</Text>
              {Array.from(processingFiles).map(filePath => (
                <Text key={filePath} color={theme.muted}>
                  • {path.basename(filePath)}
                </Text>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    );
  };
  
  // Render file input interface
  const renderFileInput = () => {
    if (!showFileInput) return null;
    
    return (
      <Box 
        borderStyle="double" 
        borderColor={theme.accent} 
        paddingX={1} 
        marginY={1}
        flexDirection="column"
      >
        <Box marginBottom={1}>
          <Text color={theme.accent} bold>📁 Add Files:</Text>
        </Box>
        
        <Box marginBottom={1}>
          <Text color={theme.primary}>Enter file path(s) separated by commas:</Text>
        </Box>
        
        <Box borderStyle="single" borderColor={theme.muted} paddingX={1}>
          <Text color={theme.primary}>
            {filePathInput}
            <Text color={theme.accent}>|</Text>
          </Text>
        </Box>
        
        <Box marginTop={1}>
          <Text color={theme.muted}>
            Examples: ./file.txt, ~/Documents/doc.pdf, /absolute/path/image.jpg
          </Text>
        </Box>
        
        <Box marginTop={1}>
          <Text color={theme.muted}>
            Press Enter to add • Escape to cancel • Ctrl+O for current directory
          </Text>
        </Box>
      </Box>
    );
  };
  
  // Render controls help
  const renderControls = () => (
    <Box borderStyle="single" borderColor={theme.muted} paddingX={1}>
      <Box flexDirection="column">
        <Text color={theme.muted} dimColor>
          Navigation: ↑↓ select • Space toggle • Enter analyze • Ctrl+A select all
        </Text>
        <Text color={theme.muted} dimColor>
          Actions: Ctrl+R remove • Ctrl+P batch process • Ctrl+V view mode • Ctrl+F filter • Ctrl+I analysis
        </Text>
      </Box>
    </Box>
  );
  
  return (
    <Box flexDirection="column" width={terminalWidth} height={terminalHeight}>
      {renderHeader()}
      {renderCapabilities()}
      
      <Box flexDirection="column" flexGrow={1}>
        {renderContentItems()}
      </Box>
      
      {renderFileInput()}
      
      {renderControls()}
    </Box>
  );
};

export default MultimodalContentHandler; 