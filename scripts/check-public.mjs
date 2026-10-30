// 公開されるフォルダ（characters/・stages/・ui/ は assets/images/ からのリンク）に、
// 画像以外のファイルが紛れ込んでいないか確かめる。見つかったらビルドを止める。
import { readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const PUBLIC_DIRS = ['characters', 'stages', 'ui'];
const ALLOWED = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const IGNORED = new Set(['.DS_Store', '.gitkeep']);

const bad = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (IGNORED.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (!ALLOWED.has(extname(name).toLowerCase())) bad.push(path);
  }
}
for (const dir of PUBLIC_DIRS) {
  try { walk(dir); } catch { /* フォルダが無ければ何もしない */ }
}
if (bad.length > 0) {
  console.error('公開されるフォルダに画像以外のファイルがあります（art-work/ に移してください）:');
  for (const f of bad) console.error('  ' + f);
  process.exit(1);
}
