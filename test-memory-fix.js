/**
 * Test script for memory persistence fix
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Our sanitization function from the fix
function sanitizeForSerialization(data) {
  // Handle simple cases
  if (data === undefined) {
    return null;
  }
  if (data === null || typeof data !== 'object') {
    return data;
  }
  
  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForSerialization(item));
  }
  
  // Handle Date objects
  if (data instanceof Date) {
    return data;
  }
  
  // Handle objects by recursively sanitizing all properties
  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    sanitized[key] = sanitizeForSerialization(value);
  }
  
  return sanitized;
}

async function testMemoryFix() {
  try {
    // Read the test file
    console.log('Reading test memory file...');
    const filePath = path.join(__dirname, 'test-memory-dir', 'memory.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    console.log('File content:', fileContent);
    
    // Try to parse it (will fail because of undefined)
    console.log('\nTrying to parse file (will fail)...');
    try {
      const parsed = JSON.parse(fileContent);
      console.log('Parsed content:', parsed);
    } catch (error) {
      console.log('Parse error:', error.message);
    }
    
    // Fix the content
    console.log('\nFixing the content...');
    const fixedContent = fileContent.replace(/undefined_test":\s*undefined/, 'undefined_test": null');
    console.log('Fixed content:', fixedContent);
    
    // Try parsing the fixed content
    try {
      const parsed = JSON.parse(fixedContent);
      console.log('Successfully parsed fixed content');
      
      // Apply our sanitization
      const sanitized = sanitizeForSerialization(parsed);
      console.log('Sanitized data:', sanitized);
      
      // Write the sanitized data back
      await fs.writeFile(filePath + '.fixed', JSON.stringify(sanitized, null, 2));
      console.log('\nWrote sanitized data to ' + filePath + '.fixed');
    } catch (error) {
      console.log('Error after fixing:', error.message);
    }
  } catch (error) {
    console.error('Test error:', error);
  }
}

testMemoryFix();