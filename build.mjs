// Assembles index.html from src/ — the game ships as one self-contained file.
// Usage: node build.mjs   (or: npm run build)
import { readFileSync, writeFileSync } from 'node:fs';

const read = f => readFileSync(new URL('src/' + f, import.meta.url), 'utf8');
const html = read('head.html').trimEnd()
  + '\n<script>\n'
  + read('data.js').trim() + '\n\n'
  + read('game-core.js').trim() + '\n\n'
  + read('game-match.js').trim()
  + '\n</script>\n</body>\n</html>\n';

writeFileSync(new URL('index.html', import.meta.url), html);
console.log(`index.html built — ${(html.length / 1024).toFixed(1)} KB`);
