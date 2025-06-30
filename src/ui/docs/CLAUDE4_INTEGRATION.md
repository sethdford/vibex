# Claude 4 Integration

This document explains the integration between Claude Code UI and Claude 4 AI models.

## Overview

The Claude Code UI has been enhanced to work seamlessly with Anthropic's Claude 4 models, providing the best possible experience for users. This integration includes:

- Support for all Claude 4 models (Sonnet, Haiku, and Opus)
- Enhanced streaming capabilities
- Better tool integration
- Improved error handling and fallback mechanisms
- Support for Claude 4's multimodal capabilities
- Optimized performance and reliability

## Supported Models

The following Claude 4 models are supported:

- `claude-4-sonnet-20240229`: The default model with a good balance of capabilities and performance
- `claude-4-haiku-20240307`: A faster, more compact model for simpler queries
- `claude-4-opus-20240229`: The most powerful model for complex tasks

## Configuration

Claude 4 specific configuration is available in the `claude4` section of the config:

```json
{
  "claude4": {
    "vision": true,
    "visionEnhancements": {
      "detail": "high"
    },
    "preferredModel": "claude-4-sonnet-20240229",
    "fallbackModel": "claude-4-haiku-20240307"
  }
}
```

### Configuration Options

- `vision`: Enable or disable image processing capabilities
- `visionEnhancements.detail`: Set the level of detail for image analysis (`low` or `high`)
- `preferredModel`: The default Claude 4 model to use
- `fallbackModel`: Model to use if the preferred model fails or is unavailable

## Client Architecture

The Claude 4 integration follows a clean architecture:

1. **Claude4Client**: A specialized client for Claude 4 models
2. **useClaude4Stream**: React hook for handling streaming responses
3. **Integration with UI components**: All UI components are updated to work with Claude 4

## Key Features

### Enhanced Streaming

Claude 4 streaming provides a better experience with:

- Faster initial response time
- Token-by-token streaming for immediate feedback
- Better handling of tool use during streaming
- Thought process visibility for complex tasks

### Advanced Tool Integration

Claude 4 has improved tool handling capabilities:

- More accurate tool selection
- Better input validation
- Tool choice control (auto, any, none, or specific)
- Improved error handling for tools

### Multimodal Support

Claude 4 can process images along with text:

- Image upload and display in the terminal
- Image analysis and description
- Text extraction from images
- Visual content understanding

## Testing

The Claude 4 integration is thoroughly tested:

- Unit tests for Claude4Client functionality
- Integration tests for the UI components with Claude 4
- End-to-end tests for complete user workflows
- Performance testing to ensure optimal response times

## Troubleshooting

Common issues and their solutions:

1. **Model not available**: Check your API key permissions or try a fallback model
2. **Slow responses**: Consider using claude-4-haiku for faster results
3. **Tool execution failures**: Ensure tools are properly registered and have valid schemas
4. **Streaming issues**: Check network connectivity and timeout settings

## Future Improvements

Planned enhancements to the Claude 4 integration:

1. Support for upcoming Claude 4 model versions
2. Improved context management for larger context windows
3. Better model selection based on query complexity
4. Enhanced multimodal capabilities
5. More sophisticated tool interactions

## Migration from Previous Models

If you're upgrading from Claude 3 models:

1. Update your configuration to use Claude 4 models
2. Review system prompts for compatibility
3. Test tool usage patterns to ensure they work with Claude 4
4. Adjust temperature and other parameters for optimal results