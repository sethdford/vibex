# Vibex Installation & Distribution Guide

This guide covers how to package, install, and distribute the Vibex CLI application.

## 📦 Package Structure

The Vibex CLI is packaged as a standard npm module with the following structure:

```
vibex/
├── dist/                    # Built application files
│   ├── cli.js              # Main executable (with shebang)
│   ├── *.js                # Compiled modules
│   └── *.d.ts              # TypeScript declarations
├── scripts/
│   └── postinstall.js      # Post-installation setup
├── package.json            # Package configuration
├── README.md               # Documentation
├── LICENSE                 # MIT License
└── INSTALLATION.md         # This file
```

## 🚀 Installation Methods

### Method 1: Global Installation (Recommended)

Install Vibex globally to use it from anywhere:

```bash
npm install -g vibex
```

After installation, you can use:
```bash
vibex --help
vibex chat
vibex version
```

### Method 2: Local Installation

Install in a specific project:

```bash
npm install vibex
npx vibex --help
```

### Method 3: From Source (Development)

For developers or contributors:

```bash
# Clone the repository
git clone https://github.com/vibex-team/vibex.git
cd vibex

# Install dependencies
npm install

# Build the project
npm run build

# Link globally for testing
npm link

# Test the installation
vibex --help
```

## 🔧 Post-Installation Setup

After installation, Vibex automatically:

1. **Creates directories**:
   - `~/.vibex/config/` - Configuration files
   - `~/.vibex/history/` - Conversation history
   - `~/.vibex/screenshots/` - Screenshot captures
   - `~/.vibex/logs/` - Application logs

2. **Creates default configuration**:
   - `~/.vibex/config/config.json` - Default settings

3. **Displays welcome message** with getting started instructions

## 🎯 First Run

After installation, start with:

```bash
# Show help and available commands
vibex --help

# Start interactive chat session
vibex chat

# In chat mode, authenticate with Claude
/login

# Start using AI features
/ask "Hello, can you help me with coding?"
```

## 🔐 Authentication Setup

Vibex requires a Claude API key for AI features:

### Option 1: Environment Variable
```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

### Option 2: Interactive Login
```bash
vibex chat
/login
# Follow the OAuth flow in your browser
```

### Option 3: Configuration File
Edit `~/.vibex/config/config.json`:
```json
{
  "api": {
    "key": "your-api-key-here"
  }
}
```

## 📋 System Requirements

- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0
- **Operating System**: macOS, Linux, Windows
- **Terminal**: Any terminal with UTF-8 support
- **Internet**: Required for AI features

## 🛠️ Development Installation

For developers working on Vibex:

### Prerequisites
```bash
node --version  # Should be >= 18.0.0
npm --version   # Should be >= 8.0.0
```

### Setup
```bash
# Clone and setup
git clone https://github.com/vibex-team/vibex.git
cd vibex
npm install

# Development build (with watch)
npm run dev

# Production build
npm run build

# Run tests
npm test

# Link for global testing
npm link
```

### Development Scripts
- `npm run build` - Build for production
- `npm run dev` - Build with watch mode
- `npm run test` - Run test suite
- `npm run lint` - Lint code
- `npm run clean` - Clean build artifacts

## 📦 Building for Distribution

### Local Package Build
```bash
# Clean and build
npm run clean
npm run build

# Create package
npm pack
# This creates vibex-1.0.0.tgz
```

### Publishing to npm
```bash
# Login to npm (one time)
npm login

# Publish the package
npm publish

# Or publish with tag
npm publish --tag beta
```

### GitHub Releases
```bash
# Tag the release
git tag v1.0.0
git push origin v1.0.0

# Create GitHub release with assets
gh release create v1.0.0 \
  --title "Vibex v1.0.0" \
  --notes "Initial release of Vibex CLI" \
  vibex-1.0.0.tgz
```

## 🔄 Updates and Upgrades

### For Users
```bash
# Update to latest version
npm update -g vibex

# Or reinstall
npm uninstall -g vibex
npm install -g vibex
```

### For Developers
```bash
# Update dependencies
npm update

# Rebuild
npm run build

# Relink if testing globally
npm unlink
npm link
```

## 🗑️ Uninstallation

### Remove Global Installation
```bash
npm uninstall -g vibex
```

### Clean User Data (Optional)
```bash
# Remove all Vibex data
rm -rf ~/.vibex

# Or selectively remove:
rm -rf ~/.vibex/history     # Remove conversation history
rm -rf ~/.vibex/screenshots # Remove screenshots
rm -rf ~/.vibex/logs        # Remove logs
# Keep ~/.vibex/config for future installations
```

## 🐛 Troubleshooting

### Common Issues

#### Permission Errors
```bash
# Fix npm permissions (macOS/Linux)
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}

# Or use a Node version manager like nvm
```

#### Command Not Found
```bash
# Check if npm global bin is in PATH
npm config get prefix
echo $PATH

# Add to PATH if needed (add to ~/.bashrc or ~/.zshrc)
export PATH="$(npm config get prefix)/bin:$PATH"
```

#### Build Failures
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### API Key Issues
```bash
# Verify API key is set
echo $ANTHROPIC_API_KEY

# Test API connectivity
vibex chat
/ask "test"
```

### Getting Help

- **Documentation**: [GitHub Wiki](https://github.com/vibex-team/vibex/wiki)
- **Issues**: [GitHub Issues](https://github.com/vibex-team/vibex/issues)
- **Discussions**: [GitHub Discussions](https://github.com/vibex-team/vibex/discussions)

## 📊 Installation Verification

After installation, verify everything works:

```bash
# Check version
vibex --version

# Test basic functionality
vibex test

# Start interactive session
vibex chat

# In chat, test commands:
/help
/commands
/config
```

## 🌐 Distribution Platforms

Vibex is available on:

- **npm Registry**: `npm install -g vibex`
- **GitHub Releases**: Download pre-built packages
- **Source Code**: Build from GitHub repository

## 📈 Analytics and Telemetry

Vibex includes optional telemetry to improve the product:

- **Default**: Disabled (opt-in)
- **Data**: Anonymous usage statistics only
- **Control**: Can be disabled via config or environment variable

```bash
# Disable telemetry
export VIBEX_TELEMETRY=false

# Or in config file
{
  "telemetry": {
    "enabled": false
  }
}
```

---

**Happy coding with Vibex! 🚀** 