# Hello World Application

A simple Hello World application created by the Claude Flow Swarm system.

## Features

- ✨ Simple Hello World output
- 🔧 Configurable name, version, and author
- 📝 JSON output generation
- 🧪 Comprehensive test suite
- ⚡ Both synchronous and asynchronous execution

## Installation

```bash
npm install
```

## Usage

### Basic Usage

```bash
npm start
```

### Development Mode

```bash
npm run dev
```

### Run Tests

```bash
npm test
```

### Programmatic Usage

```javascript
const HelloWorldApp = require('./index.js');

// Basic usage
const app = new HelloWorldApp();
const result = app.run();

// Custom configuration
const customApp = new HelloWorldApp({
  name: 'My Custom App',
  version: '2.0.0',
  author: 'Your Name'
});

// Async execution
customApp.runAsync().then(result => {
  console.log('Async result:', result);
});
```

## Configuration

The application accepts a configuration object with the following options:

- `name` (string): Application name (default: 'Hello World')
- `version` (string): Application version (default: '1.0.0')
- `author` (string): Application author (default: 'Claude Flow Swarm')

## Output

The application generates:
1. Console output with greeting and configuration details
2. `output.json` file with structured data

## Template Information

This is a template created by the Claude Flow Swarm system for generating Hello World applications. It demonstrates:

- Basic Node.js application structure
- Configuration management
- File output generation
- Test coverage
- Documentation

## License

MIT License - Created by Claude Flow Swarm 