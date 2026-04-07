const fs = require('fs');
const path = require('path');

const replacements = [
  ['--color-boss-red', '--color-boss-accent'],
  ['--color-boss-dark-red', '--color-boss-dark-accent'],
  ['#ef4444', '#f59e0b'], // amber-500
  ['#991b1b', '#b45309'], // amber-700
  ['#0a0a0a', '#17110e'], // very dark brown
  ['#111', '#241b17'],    // slightly lighter brown
  ['#1a1a1a', '#30241e'], // lighter brown
  ['#222', '#3d2e26'],    // border brown
  ['#333', '#4f3c32'],    // border brown light
  ['#444', '#664e42'],    // border brown lighter
  ['red-500', 'amber-500'],
  ['red-400', 'amber-400'],
  ['red-600', 'amber-600'],
  ['red-800', 'amber-800'],
  ['red-900', 'amber-900'],
  ['red-950', 'amber-950'],
  ['text-red-500', 'text-amber-500'], // just to be safe
];

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.css') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      for (const [from, to] of replacements) {
        content = content.split(from).join(to);
      }
      fs.writeFileSync(fullPath, content, 'utf8');
    }
  }
}

walk(path.join(__dirname, 'src'));
console.log('Recoloring done.');
