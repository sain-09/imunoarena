const { cpSync, mkdirSync } = require('node:fs');
mkdirSync('dist', { recursive: true });
for (const path of ['index.html', 'css', 'js', 'models']) {
  cpSync(path, 'dist/' + path, { recursive: true });
}
