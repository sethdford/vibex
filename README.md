# Vibex - AI-Powered Development CLI

<div align="center">

![Vibex Logo](https://via.placeholder.com/200x100/4A90E2/FFFFFF?text=VIBEX)

**A powerful AI-powered CLI for code assistance, analysis, and development workflows**

[![npm version](https://badge.fury.io/js/vibex.svg)](https://badge.fury.io/js/vibex)
[![Node.js Version](https://img.shields.io/node/v/vibex.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Installation](#installation) • [Features](#features) • [Usage](#usage) • [Commands](#commands) • [Configuration](#configuration)

</div>

## 🚀 Installation

### Global Installation (Recommended)

```bash
npm install -g vibex
```

### Local Installation

```bash
npm install vibex
npx vibex --help
```

### System Requirements

- **Node.js**: >= 18.0.0
- **Operating System**: macOS, Linux, Windows
- **Claude API Key**: Required for AI features

## ✨ Features

### 🤖 AI-Powered Code Assistance
- **Code Explanation**: Get detailed explanations of complex code
- **Smart Refactoring**: Improve code quality with AI suggestions
- **Bug Detection & Fixing**: Automatically identify and fix issues
- **Code Generation**: Generate code from natural language descriptions

### 💬 Interactive Chat Interface
- **Persistent Sessions**: Maintain conversation context
- **History Search**: Find previous conversations and solutions
- **Real-time Responses**: Fast, streaming AI responses
- **Rich Formatting**: Syntax highlighting and structured output

### 🛠️ Developer Tools
- **File Operations**: Read, write, and manipulate files safely
- **Project Analysis**: Understand codebase structure and dependencies
- **Screenshot Capture**: Visual feedback for bug reports
- **Command History**: Track and replay previous commands

### 🔒 Security & Privacy
- **Secure Authentication**: OAuth 2.0 with Claude API
- **Local Storage**: Conversations stored locally by default
- **Privacy Controls**: Configurable telemetry and data collection
- **Safe File Access**: Protected file system operations

## 🎯 Quick Start

### 1. Install Vibex
```bash
npm install -g vibex
```

### 2. Start Interactive Session
```bash
vibex chat
```

### 3. Authenticate with Claude
```bash
/login
```

### 4. Start Coding!
```bash
/ask "How do I implement a binary search in Python?"
/explain src/utils/helper.js
/refactor --focus=performance src/slow-function.js
```

## 📖 Usage

### Command Line Interface

```bash
# Show help
vibex --help

# Start interactive chat
vibex chat

# Run specific command
vibex version

# Test functionality
vibex test
```

### Interactive Commands

Once in chat mode, use these slash commands:

| Command | Description | Example |
|---------|-------------|---------|
| `/help` | Show command help | `/help explain` |
| `/ask` | Ask AI a question | `/ask "What is React?"` |
| `/explain` | Explain code file | `/explain src/app.js` |
| `/refactor` | Refactor code | `/refactor --focus=readability src/messy.js` |
| `/fix` | Fix bugs in code | `/fix src/buggy-function.js` |
| `/generate` | Generate code | `/generate "API client for REST service"` |
| `/history` | View conversation history | `/history --search "React hooks"` |
| `/config` | Manage configuration | `/config api.maxTokens 8192` |
| `/login` | Authenticate with Claude | `/login` |
| `/logout` | Clear authentication | `/logout` |

## 🔧 Commands Reference

### AI Commands

#### `/ask <question>`
Ask the AI assistant any question.
```bash
/ask "How do I optimize this React component?"
/ask "What's the difference between let and const?"
```

#### `/explain <file>`
Get detailed explanation of code in a file.
```bash
/explain src/components/Header.jsx
/explain --detail=advanced utils/algorithms.py
```

#### `/refactor <file> [options]`
Refactor code for better quality.
```bash
/refactor src/legacy-code.js
/refactor --focus=performance src/slow-function.js
/refactor --focus=readability --output=src/clean-code.js src/messy.js
```

#### `/fix <file> [options]`
Identify and fix bugs in code.
```bash
/fix src/buggy-component.jsx
/fix --issue="memory leak" src/event-handler.js
```

#### `/generate <description> [options]`
Generate code from description.
```bash
/generate "React hook for API calls"
/generate --language=python "Binary search algorithm"
/generate --output=src/api-client.js "REST API client with error handling"
```

### Utility Commands

#### `/history [options]`
Manage conversation history.
```bash
/history                           # Show recent sessions
/history --search "React"          # Search conversations
/history --session <session-id>    # View specific session
/history --export=backup.json --session <id>  # Export session
```

#### `/config [key] [value]`
View or modify configuration.
```bash
/config                           # Show all settings
/config api.maxTokens            # Show specific setting
/config api.maxTokens 8192       # Set value
/config theme dark               # Change theme
```

#### `/feedback [message] [options]`
Send feedback to developers.
```bash
/feedback "Great tool, love the code explanation feature!"
/feedback --screenshot "Bug in refactor command"
```

## ⚙️ Configuration

Vibex stores configuration in `~/.vibex/config/config.json`.

### Default Configuration

```json
{
  "api": {
    "baseUrl": "https://api.anthropic.com",
    "version": "2023-06-01",
    "maxTokens": 4096,
    "timeout": 30000
  },
  "ui": {
    "theme": "auto",
    "animations": true,
    "colors": true
  },
  "logger": {
    "level": "info",
    "file": true
  },
  "telemetry": {
    "enabled": false,
    "anonymous": true
  },
  "history": {
    "enabled": true,
    "maxSessions": 100,
    "maxAgeInDays": 30
  }
}
```

### Environment Variables

```bash
# Claude API Key
export ANTHROPIC_API_KEY="your-api-key-here"

# Disable telemetry
export VIBEX_TELEMETRY=false

# Set log level
export VIBEX_LOG_LEVEL=debug

# Custom config path
export VIBEX_CONFIG_PATH="/path/to/config.json"
```

## 🗂️ File Structure

After installation, Vibex creates these directories:

```
~/.vibex/
├── config/
│   └── config.json          # Configuration file
├── history/
│   └── session_*.json       # Conversation history
├── screenshots/
│   └── screenshot-*.png     # Captured screenshots
└── logs/
    └── vibex.log           # Application logs
```

## 🔐 Authentication

Vibex uses Claude's API for AI features. You need an Anthropic API key:

1. **Get API Key**: Visit [Anthropic Console](https://console.anthropic.com/)
2. **Set Environment Variable**: `export ANTHROPIC_API_KEY="your-key"`
3. **Or Login Interactively**: Use `/login` command in chat

### OAuth Authentication

For enhanced security, Vibex supports OAuth authentication:

```bash
# Start interactive session
vibex chat

# Initiate OAuth flow
/login

# Follow browser prompts to authenticate
# Your credentials are stored securely
```

## 🛠️ Development

### Building from Source

```bash
# Clone repository
git clone https://github.com/vibex-team/vibex.git
cd vibex

# Install dependencies
npm install

# Build the project
npm run build

# Test locally
npm link
vibex --help
```

### Project Structure

```
src/
├── ai/              # AI client and integration
├── auth/            # Authentication management
├── commands/        # Command definitions and handlers
├── config/          # Configuration management
├── errors/          # Error handling and formatting
├── fs/              # File system operations
├── telemetry/       # Usage analytics and monitoring
├── terminal/        # Terminal UI and interaction
├── tools/           # Utility tools and integrations
├── utils/           # Shared utilities
└── cli.ts          # Main CLI entry point
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Commit: `git commit -m 'Add amazing feature'`
5. Push: `git push origin feature/amazing-feature`
6. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [GitHub Wiki](https://github.com/vibex-team/vibex/wiki)
- **Issues**: [GitHub Issues](https://github.com/vibex-team/vibex/issues)
- **Discussions**: [GitHub Discussions](https://github.com/vibex-team/vibex/discussions)
- **Email**: support@vibex.dev

## 🙏 Acknowledgments

- **Anthropic**: For the amazing Claude AI models
- **Open Source Community**: For the incredible tools and libraries
- **Contributors**: Thank you to all who have contributed to this project

---

<div align="center">
  <p>Made with ❤️ by the Vibex Team</p>
  <p>
    <a href="https://github.com/vibex-team/vibex">GitHub</a> •
    <a href="https://twitter.com/vibex_dev">Twitter</a> •
    <a href="https://vibex.dev">Website</a>
  </p>
</div> 