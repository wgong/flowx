const { build } = require('esbuild');
const fs = require('fs');
const path = require('path');

// Plugin to fix import extensions from .ts to .js
const fixImportExtensionsPlugin = {
  name: 'fix-import-extensions',
  setup(build) {
    build.onLoad({ filter: /\.ts$/ }, async (args) => {
      const contents = await fs.promises.readFile(args.path, 'utf8');
      
      // Replace .ts imports with .js imports
      const fixedContents = contents.replace(
        /from\s+['"]([^'"]+)\.ts['"]/g,
        'from "$1.js"'
      ).replace(
        /import\s+['"]([^'"]+)\.ts['"]/g,
        'import "$1.js"'
      );
      
      return {
        contents: fixedContents,
        loader: 'ts',
      };
    });
  },
};

// Plugin to make all packages external
const makeAllPackagesExternalPlugin = {
  name: 'make-all-packages-external',
  setup(build) {
    build.onResolve({ filter: /^[^./]/ }, (args) => {
      return { path: args.path, external: true };
    });
  },
};

// Function to recursively find all TypeScript files
function findTsFiles(dir, exclude = []) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip excluded directories
      if (exclude.some(ex => fullPath.includes(ex))) {
        continue;
      }
      files.push(...findTsFiles(fullPath, exclude));
    } else if (item.endsWith('.ts') && !item.endsWith('.test.ts') && !item.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Function to get output directory for a source file
function getOutputDir(srcFile) {
  const relativePath = path.relative('src', srcFile);
  const dir = path.dirname(relativePath);
  return path.join('dist', dir);
}

// Main build function
async function buildAll() {
  try {
    console.log('Finding all TypeScript files...');
    
    // Find all TypeScript files, excluding test files and node_modules
    const tsFiles = findTsFiles('src', ['__tests__', '.test.', 'node_modules']);
    
    console.log(`Found ${tsFiles.length} TypeScript files to build`);
    
    // Group files by their output directory
    const fileGroups = {};
    for (const file of tsFiles) {
      const outDir = getOutputDir(file);
      if (!fileGroups[outDir]) {
        fileGroups[outDir] = [];
      }
      fileGroups[outDir].push(file);
    }
    
    console.log(`Building ${Object.keys(fileGroups).length} groups...`);
    
    // Build each group
    for (const [outDir, files] of Object.entries(fileGroups)) {
      console.log(`Building ${files.length} files to ${outDir}...`);
      
      // Ensure output directory exists
      await fs.promises.mkdir(outDir, { recursive: true });
      
      await build({
        entryPoints: files,
        bundle: false,
        platform: 'node',
        outdir: outDir,
        format: 'esm',
        plugins: [fixImportExtensionsPlugin, makeAllPackagesExternalPlugin],
        banner: {
          js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);'
        }
      });
    }
    
    // Copy static files
    console.log('Copying static files...');
    const schemaPath = 'src/hive-mind/database/schema.sql';
    if (fs.existsSync(schemaPath)) {
      await fs.promises.copyFile(schemaPath, 'dist/schema.sql');
      console.log('Copied src/hive-mind/database/schema.sql to dist/schema.sql');
    }
    
    console.log('Build completed successfully!');
    
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

// Run the build
buildAll(); 