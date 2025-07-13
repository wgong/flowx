const { resolve } = require('path');
const { existsSync } = require('fs');

module.exports = (path, options) => {
  // Handle TypeScript file extensions
  if (path.endsWith('.ts') || path.endsWith('.tsx')) {
    return options.defaultResolver(path, options);
  }
  
  // Handle .js imports that should resolve to .ts files
  if (path.endsWith('.js')) {
    const tsPath = path.replace(/\.js$/, '.ts');
    const resolvedTsPath = resolve(options.basedir, tsPath);
    
    if (existsSync(resolvedTsPath)) {
      return resolvedTsPath;
    }
  }
  
  // Handle source directory imports
  if (path.startsWith('../../../src/') || path.startsWith('../../src/') || path.startsWith('../src/')) {
    const srcPath = path.replace(/^(\.\.\/)+src\//, resolve(__dirname, '../src/') + '/');
    const tsPath = srcPath.replace(/\.js$/, '.ts');
    
    if (existsSync(tsPath)) {
      return tsPath;
    }
    if (existsSync(srcPath)) {
      return srcPath;
    }
  }
  
  // Default resolution
  return options.defaultResolver(path, options);
}; 