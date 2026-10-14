const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const sourceDir = path.resolve(__dirname, '..');
const targetDir = path.resolve(__dirname, '../../Loop-Repo/Loop-App-2-codebase');

if (!fs.existsSync(targetDir)) {
  console.error(`Target directory not found: ${targetDir}`);
  process.exit(1);
}

console.log(`Syncing from ${sourceDir} to ${targetDir}...`);

// Use robocopy on Windows with exclude rules
const excludeDirs = ['.git', 'node_modules', '.next', 'graphify-out', '.agents', '.orchids', 'scratch', '.claude'];
const excludeFiles = ['.env', '.env*.local', '*.tsbuildinfo'];

const cmd = `robocopy "${sourceDir}" "${targetDir}" /MIR /XD ${excludeDirs.join(' ')} /XF ${excludeFiles.join(' ')} /NDL /NJH /NJS /NC /NS /NP`;

try {
  execSync(cmd, { stdio: 'inherit' });
} catch (err) {
  // Robocopy returns exit codes 0-7 for successful copy variations (e.g. 1 = files copied)
  if (err.status && err.status < 8) {
    console.log(`Sync completed successfully (robocopy exit code ${err.status}).`);
  } else {
    console.error('Robocopy failed:', err);
    process.exit(1);
  }
}
