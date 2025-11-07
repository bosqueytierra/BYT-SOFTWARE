// Minimal script to inject the placeholder into each .html under BYT_SOFTWARE/src/pages
// Excludes login/login.html. Creates a .bak backup for safety.
// Usage: node scripts/inject-header.js  (run from repo root)

const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(process.cwd(), 'BYT_SOFTWARE', 'src', 'pages');
const SNIPPET = '\n<!-- SITE HEADER (auto-inserted) -->\n<div id="siteHeader"></div>\n<script type="module" src="/BYT_SOFTWARE/src/lib/userWidgetLoader.js"></script>\n';
const EXCLUDE = new Set(['login/login.html']);

function walk(dir){
  const res = [];
  const items = fs.readdirSync(dir);
  for(const it of items){
    const full = path.join(dir, it);
    const stat = fs.statSync(full);
    if(stat.isDirectory()) res.push(...walk(full));
    else if(full.toLowerCase().endsWith('.html')) res.push(full);
  }
  return res;
}

if(!fs.existsSync(PAGES_DIR)){
  console.error('Pages dir not found:', PAGES_DIR);
  process.exit(1);
}

const files = walk(PAGES_DIR);
for(const file of files){
  const rel = path.relative(PAGES_DIR, file).replace(/\\/g, '/');
  if(EXCLUDE.has(rel)) { console.log('skip', rel); continue; }
  let s = fs.readFileSync(file, 'utf8');
  if(s.includes('id="siteHeader"') || s.includes('userWidgetLoader.js')){
    console.log('already has snippet, skip:', rel);
    continue;
  }
  const m = s.match(/<body[^>]*>/i);
  if(!m){ console.warn('no <body> tag found, skipping:', rel); continue; }
  const idx = s.indexOf(m[0]) + m[0].length;
  const before = s.slice(0, idx);
  const after = s.slice(idx);
  // write backup then updated file
  fs.writeFileSync(file + '.bak', s, 'utf8');
  s = before + SNIPPET + after;
  fs.writeFileSync(file, s, 'utf8');
  console.log('inserted snippet into:', rel);
}

console.log('done. Review changes and remove .bak files when happy.');
