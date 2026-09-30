// Syntax check for the server, the scripts and every browser module.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const files = [
  'server.js',
  ...fs.readdirSync(path.join(root, 'scripts')).filter((name) => name.endsWith('.js')).map((name) => `scripts/${name}`),
  ...fs.readdirSync(path.join(root, 'public', 'js')).filter((name) => name.endsWith('.js')).map((name) => `public/js/${name}`),
  'public/theme.js'
];

for (const file of files) {
  execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'inherit' });
}
console.log(`Sintaxe OK em ${files.length} arquivos.`);
