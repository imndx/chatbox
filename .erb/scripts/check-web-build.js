import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

const webDistPath = path.join(process.cwd(), 'dist/web');
const indexPath = path.join(webDistPath, 'index.html');

if (!fs.existsSync(webDistPath)) {
  console.error(chalk.red('Web build directory not found.'));
  console.log(chalk.yellow('Please run "npm run build:web" first.'));
  process.exit(1);
}

if (!fs.existsSync(indexPath)) {
  console.error(chalk.red('index.html not found in the web build directory.'));
  console.log(chalk.yellow('The web build might have failed. Please check for errors.'));
  process.exit(1);
}

console.log(chalk.green('Web build looks good! Starting the server...'));
process.exit(0);
