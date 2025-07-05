/**
 * Advanced Message Splitting System
 * 
 * Implements Gemini CLI's intelligent message splitting for performance optimization.
 * Large messages are split at safe points to maximize Static rendering efficiency.
 */

/**
 * Maximum safe message length before splitting
 * Based on Gemini CLI's performance thresholds
 */
const MAX_MESSAGE_LENGTH = 8000;

/**
 * Minimum chunk size to avoid creating tiny fragments
 */
const MIN_CHUNK_SIZE = 1000;

/**
 * Safe split points in order of preference
 * Based on Gemini CLI's splitting logic
 */
const SPLIT_PATTERNS = [
  /\n\n/g,           // Double newlines (paragraph breaks)
  /\n```\n/g,        // Code block boundaries
  /\n#{1,6}\s/g,     // Markdown headers
  /\n\*/g,           // List items
  /\n-\s/g,          // Dash list items
  /\n\d+\.\s/g,      // Numbered list items
  /\.\s+/g,          // Sentence endings
  /,\s+/g,           // Comma breaks
  /\s+/g,            // Any whitespace
];

/**
 * Find the last safe split point in a message
 * Replicates Gemini CLI's findLastSafeSplitPoint function
 */
export function findLastSafeSplitPoint(text: string): number {
  // If text is under threshold, don't split
  if (text.length <= MAX_MESSAGE_LENGTH) {
    return text.length;
  }

  // Find the best split point within the safe range
  const maxSplitPoint = text.length - MIN_CHUNK_SIZE;
  let bestSplitPoint = MIN_CHUNK_SIZE;

  // Try each pattern in order of preference
  for (const pattern of SPLIT_PATTERNS) {
    pattern.lastIndex = 0; // Reset regex state
    let match;
    
    while ((match = pattern.exec(text)) !== null) {
      const splitPoint = match.index + match[0].length;
      
      // Must be in safe range
      if (splitPoint >= MIN_CHUNK_SIZE && splitPoint <= maxSplitPoint) {
        bestSplitPoint = Math.max(bestSplitPoint, splitPoint);
      }
      
      // Prevent infinite loop on zero-length matches
      if (match.index === pattern.lastIndex) {
        pattern.lastIndex++;
      }
    }
  }

  return bestSplitPoint;
}

/**
 * Split a large message into optimized chunks
 * Returns array of message parts for Static/Dynamic rendering
 */
export function splitMessageForRendering(text: string): string[] {
  if (text.length <= MAX_MESSAGE_LENGTH) {
    return [text];
  }

  const chunks: string[] = [];
  let remainingText = text;

  while (remainingText.length > MAX_MESSAGE_LENGTH) {
    const splitPoint = findLastSafeSplitPoint(remainingText);
    
    if (splitPoint <= MIN_CHUNK_SIZE) {
      // Force split if no good point found
      chunks.push(remainingText.substring(0, MAX_MESSAGE_LENGTH));
      remainingText = remainingText.substring(MAX_MESSAGE_LENGTH);
    } else {
      chunks.push(remainingText.substring(0, splitPoint));
      remainingText = remainingText.substring(splitPoint);
    }
  }

  // Add remaining text
  if (remainingText.length > 0) {
    chunks.push(remainingText);
  }

  return chunks;
}

/**
 * Message split result for rendering optimization
 */
export interface MessageSplitResult {
  /**
   * Parts that should be rendered statically (all but last)
   */
  staticParts: string[];
  
  /**
   * Part that should be rendered dynamically (last part)
   */
  dynamicPart: string;
  
  /**
   * Whether the message was split
   */
  wasSplit: boolean;
}

/**
 * Split message for Static/Dynamic rendering optimization
 * Follows Gemini CLI's pattern of Static for history, Dynamic for current
 */
export function splitForStaticRendering(text: string): MessageSplitResult {
  const chunks = splitMessageForRendering(text);
  
  if (chunks.length === 1) {
    return {
      staticParts: [],
      dynamicPart: chunks[0],
      wasSplit: false,
    };
  }

  return {
    staticParts: chunks.slice(0, -1),
    dynamicPart: chunks[chunks.length - 1],
    wasSplit: true,
  };
}

/**
 * Performance metrics for message splitting
 */
export interface SplitMetrics {
  originalLength: number;
  chunksCreated: number;
  largestChunk: number;
  smallestChunk: number;
  averageChunk: number;
}

/**
 * Analyze message splitting performance
 */
export function analyzeSplitPerformance(text: string): SplitMetrics {
  const chunks = splitMessageForRendering(text);
  const chunkLengths = chunks.map(chunk => chunk.length);
  
  return {
    originalLength: text.length,
    chunksCreated: chunks.length,
    largestChunk: Math.max(...chunkLengths),
    smallestChunk: Math.min(...chunkLengths),
    averageChunk: chunkLengths.reduce((a, b) => a + b, 0) / chunkLengths.length,
  };
} 