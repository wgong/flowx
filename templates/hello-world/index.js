#!/usr/bin/env node

/**
 * Hello World Application Template
 * Created by Claude Flow Swarm System
 */

const fs = require('fs');
const path = require('path');

class HelloWorldApp {
  constructor(config = {}) {
    this.config = {
      name: config.name || 'Hello World',
      version: config.version || '1.0.0',
      author: config.author || 'Claude Flow Swarm',
      ...config
    };
  }

  run() {
    console.log('🌟 Hello, World! 🌟');
    console.log(`Application: ${this.config.name}`);
    console.log(`Version: ${this.config.version}`);
    console.log(`Author: ${this.config.author}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    
    // Create output file
    const output = {
      message: 'Hello, World!',
      config: this.config,
      timestamp: new Date().toISOString(),
      runtime: process.version
    };
    
    const outputPath = path.join(__dirname, 'output.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    
    console.log(`✅ Output saved to: ${outputPath}`);
    
    return output;
  }

  async runAsync() {
    return new Promise((resolve) => {
      setTimeout(() => {
        const result = this.run();
        resolve(result);
      }, 100);
    });
  }
}

// CLI execution
if (require.main === module) {
  const app = new HelloWorldApp();
  app.run();
}

module.exports = HelloWorldApp; 