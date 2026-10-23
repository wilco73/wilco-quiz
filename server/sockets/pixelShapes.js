/**
 * Cibles pixel-art générées procéduralement :
 *  - composites géométriques (carrés, ronds, losanges, croix, triangles, lignes…)
 *  - OBJETS reconnaissables en pixel (épée, maison, cœur, étoile, clé, champignon, poisson, fusée, ampoule)
 *    définis comme des "patterns" (chars -> couleurs) et mis à l'échelle sur la grille.
 * randomTarget(size, exclude) -> { name, grid, signature }.
 */

const PALETTE = [
  '#000000', '#FFFFFF', '#E53935', '#FB8C00', '#FDD835',
  '#43A047', '#1E88E5', '#8E24AA', '#EC407A', '#6D4C41',
];
const FG = [0, 2, 3, 4, 5, 6, 7, 8, 9];

function blank(size) { return new Array(size * size).fill(-1); }
const I = (size, x, y) => y * size + x;
const inb = (size, x, y) => x >= 0 && x < size && y >= 0 && y < size;
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
const ri = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// --- primitives géométriques ---
function rect(g, size, x0, y0, w, h, color, filled = true) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    if (!inb(size, x, y)) continue;
    const edge = x === x0 || x === x0 + w - 1 || y === y0 || y === y0 + h - 1;
    if (filled || edge) g[I(size, x, y)] = color;
  }
}
function disc(g, size, cx, cy, r, color) {
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if (inb(size, x, y) && Math.hypot(x - cx, y - cy) <= r + 0.2) g[I(size, x, y)] = color;
}
function diamond(g, size, cx, cy, r, color) {
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if (inb(size, x, y) && Math.abs(x - cx) + Math.abs(y - cy) <= r) g[I(size, x, y)] = color;
}
function hline(g, size, x0, y, w, color, th = 1) { for (let t = 0; t < th; t++) for (let x = x0; x < x0 + w; x++) if (inb(size, x, y + t)) g[I(size, x, y + t)] = color; }
function vline(g, size, x, y0, h, color, th = 1) { for (let t = 0; t < th; t++) for (let y = y0; y < y0 + h; y++) if (inb(size, x + t, y)) g[I(size, x + t, y)] = color; }
function crossShape(g, size, x0, y0, s, color) { const a = Math.floor(s / 3); rect(g, size, x0 + a, y0, s - 2 * a, s, color); rect(g, size, x0, y0 + a, s, s - 2 * a, color); }
function triangle(g, size, x0, y0, s, color) { for (let y = 0; y < s; y++) { const half = Math.round(((y + 1) / s) * (s / 2)); for (let x = -half; x <= half; x++) { const px = x0 + Math.floor(s / 2) + x, py = y0 + y; if (inb(size, px, py)) g[I(size, px, py)] = color; } } }

const ELEMENTS = [
  { name: 'carré', fn: (g, sz, x, y, s, c) => rect(g, sz, x, y, s, s, c) },
  { name: 'cercle', fn: (g, sz, x, y, s, c) => disc(g, sz, x + Math.floor(s / 2), y + Math.floor(s / 2), Math.floor(s / 2), c) },
  { name: 'losange', fn: (g, sz, x, y, s, c) => diamond(g, sz, x + Math.floor(s / 2), y + Math.floor(s / 2), Math.floor(s / 2), c) },
  { name: 'croix', fn: (g, sz, x, y, s, c) => crossShape(g, sz, x, y, s, c) },
  { name: 'triangle', fn: (g, sz, x, y, s, c) => triangle(g, sz, x, y, s, c) },
  { name: 'contour', fn: (g, sz, x, y, s, c) => rect(g, sz, x, y, s, s, c, false) },
];

function pickColors(n) {
  const pool = [...FG]; const out = [];
  for (let i = 0; i < n && pool.length; i++) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

// ============================================================
//   OBJETS (patterns) — chars -> index palette ; ' '/'.' = vide
//   K noir  W blanc  R rouge  O orange  Y jaune  G vert
//   B bleu  P violet N rose   M marron
// ============================================================
const CHARMAP = { K: 0, W: 1, R: 2, O: 3, Y: 4, G: 5, B: 6, P: 7, N: 8, M: 9 };

const OBJECTS = {
  'Cœur': [
    '.RR.RR.',
    'RRRRRRR',
    'RRRRRRR',
    'RRRRRRR',
    '.RRRRR.',
    '..RRR..',
    '...R...',
  ],
  'Étoile': [
    '...Y...',
    '...Y...',
    '..YYY..',
    'YYYYYYY',
    '.YYYYY.',
    '..YYY..',
    '.YY.YY.',
    'Y.....Y',
  ],
  'Maison': [
    '...R...',
    '..RRR..',
    '.RRRRR.',
    'RRRRRRR',
    '.MMMMM.',
    '.MBMBM.',
    '.MMKMM.',
    '.MMKMM.',
  ],
  'Épée': [
    '..WWW..',
    '..WWW..',
    '..WWW..',
    '..WWW..',
    '..WWW..',
    '..WWW..',
    '.WWWWW.',
    'YYYYYYY',
    '...M...',
    '...M...',
    '..MMM..',
  ],
  'Clé': [
    '.YYY...',
    'Y...Y..',
    'Y...Y..',
    '.YYY...',
    '..Y....',
    '..Y....',
    '..YY...',
    '..Y....',
    '..YYY..',
  ],
  'Champignon': [
    '..RRRR..',
    '.RRRRRR.',
    'RRRRRRRR',
    'RRWRRWRR',
    'RRRRRRRR',
    '..WWWW..',
    '..WWWW..',
    '..WWWW..',
  ],
  'Poisson': [
    '.BBBBB..',
    'BBBBBBB.',
    'BBBKBBBB',
    'BBBBBBB.',
    '.BBBBB..',
  ],
  'Fusée': [
    '...W...',
    '..WWW..',
    '..WRW..',
    '..WWW..',
    '..WWW..',
    '.WWWWW.',
    'W.WWW.W',
    '...O...',
    '..OOO..',
    '...O...',
  ],
  'Ampoule': [
    '..YYY..',
    '.YYYYY.',
    'YYYYYYY',
    'YYYYYYY',
    'YYYYYYY',
    '.YYYYY.',
    '..KKK..',
    '..KKK..',
    '...K...',
  ],
  'Pokeball': [
    '....KKKK....',
    '..KKRRRRKK..',
    '.KRRRRRRRRK.',
    '.KRRRRRRRRK.',
    'KRRRRRRRRRRK',
    'KRRRRKKRRRRK',
    'KKRRKWWKRRKK',
    'KWKKKWWKKKWK',
    '.KWWWKKWWWK.',
    '.KWWWWWWWWK.',
    '..KKWWWWKK..',
    '....KKKK....',
  ],
  'Superball': [
    '....KKKK....',
    '..KKBBBBKK..',
    '.KRRBBBBRRK.',
    '.KRRRBBRRRK.',
    'KBBRRBBRRBBK',
    'KBBBBKKBBBBK',
    'KKBBKWWKBBKK',
    'KWKKKWWKKKWK',
    '.KWWWKKWWWK.',
    '.KWWWWWWWWK.',
    '..KKWWWWKK..',
    '....KKKK....',
  ],
  'Hyperball': [
    '....KKKK....',
    '..KKYYYYKK..',
    '.KYYKKKKYYK.',
    '.KYYKKKKYYK.',
    'KKYYKKKKYYKK',
    'KKYYKKKKYYKK',
    'KKYYKWWKYYKK',
    'KWKKKWWKKKWK',
    '.KWWWKKWWWK.',
    '.KWWWWWWWWK.',
    '..KKWWWWKK..',
    '....KKKK....',
  ],
  'Masterball': [
    '....KKKK....',
    '..KKNPPNKK..',
    '.KNNPPPPNNK.',
    '.KNPWPPWPNK.',
    'KNPWPWWPWPNK',
    'KPPWPKKPWPPK',
    'KKPPKWWKPPKK',
    'KWKKKWWKKKWK',
    '.KWWWKKWWWK.',
    '.KWWWWWWWWK.',
    '..KKWWWWKK..',
    '....KKKK....',
  ],
  'Rapidball': [
    '....KKKK....',
    '..KKBBBBKK..',
    '.KYBBYYBBYK.',
    '.KYYBYYBYYK.',
    'KBBBYYYYBBBK',
    'KBBYYKKYYBBK',
    'KKBYKWWKYBKK',
    'KBKKKWWKKKBK',
    '.KBYYKKYYBK.',
    '.KYYBYYBYYK.',
    '..KKBBBBKK..',
    '....KKKK....',
  ],
  'Rugby': [
    '.......KKK.......',
    '.....KKMMMKK.....',
    '...KKMMMMMMMKK...',
    '.KKWMMMMMMMMMWKK.',
    'KMMWMMWMWMWMMWMMK',
    'KMMWMWWWWWWWMWMMK',
    'KMMWMMWMWMWMMWMMK',
    '.KKWMMMMMMMMMWKK.',
    '...KKMMMMMMMKK...',
    '.....KKMMMKK.....',
    '.......KKK.......',
  ],
  'AmongUs Rouge': [
    '.....KKK.......',
    '...KKRRRKK.....',
    '..KRRRRRRRK....',
    '.KKKKKKRRRK....',
    '.KBWWBBKRRRK...',
    'KBWWWBBBKRRKKK.',
    'KBBBBBBBKRRKRRK',
    '.KBBBBBKRRRKRRK',
    '.KKKKKKRRRRKRRK',
    '.KRRRRRRRRRKRRK',
    '.KRRRRRRRRRKRRK',
    '.KRRRRRRRRRKKK.',
    '.KRRKKKKRRRK...',
    '.KRRK...KRRK...',
    '..KK.....KK....',
  ],
  'AmongUs Vert': [
    '.....KKK.......',
    '...KKGGGKK.....',
    '..KGGGGGGGK....',
    '.KKKKKKGGGK....',
    '.KBWWBBKGGGK...',
    'KBWWWBBBKGGKKK.',
    'KBBBBBBBKGGKGGK',
    '.KBBBBBKGGGKGGK',
    '.KKKKKKGGGGKGGK',
    '.KGGGGGGGGGKGGK',
    '.KGGGGGGGGGKGGK',
    '.KGGGGGGGGGKKK.',
    '.KGGKKKKGGGK...',
    '.KGGK...KGGK...',
    '..KK.....KK....',
  ],
  'AmongUs Jaune': [
    '.....KKK.......',
    '...KKYYYKK.....',
    '..KYYYYYYYK....',
    '.KKKKKKYYYK....',
    '.KBWWBBKYYYK...',
    'KBWWWBBBKYYKKK.',
    'KBBBBBBBKYYKYYK',
    '.KBBBBBKYYYKYYK',
    '.KKKKKKYYYYKYYK',
    '.KYYYYYYYYYKYYK',
    '.KYYYYYYYYYKYYK',
    '.KYYYYYYYYYKKK.',
    '.KYYKKKKYYYK...',
    '.KYYK...KYYK...',
    '..KK.....KK....',
  ],
  'AmongUs Rose': [
    '.....KKK.......',
    '...KKNNNKK.....',
    '..KNNNNNNNK....',
    '.KKKKKKNNNK....',
    '.KBWWBBKNNNK...',
    'KBWWWBBBKNNKKK.',
    'KBBBBBBBKNNKNNK',
    '.KBBBBBKNNNKNNK',
    '.KKKKKKNNNNKNNK',
    '.KNNNNNNNNNKNNK',
    '.KNNNNNNNNNKNNK',
    '.KNNNNNNNNNKKK.',
    '.KNNKKKKNNNK...',
    '.KNNK...KNNK...',
    '..KK.....KK....',
  ],
  'AmongUs Violet': [
    '.....KKK.......',
    '...KKPPPKK.....',
    '..KPPPPPPPK....',
    '.KKKKKKPPPK....',
    '.KBWWBBKPPPK...',
    'KBWWWBBBKPPKKK.',
    'KBBBBBBBKPPKPPK',
    '.KBBBBBKPPPKPPK',
    '.KKKKKKPPPPKPPK',
    '.KPPPPPPPPPKPPK',
    '.KPPPPPPPPPKPPK',
    '.KPPPPPPPPPKKK.',
    '.KPPKKKKPPPK...',
    '.KPPK...KPPK...',
    '..KK.....KK....',
  ],
  'AmongUs Orange': [
    '.....KKK.......',
    '...KKOOOKK.....',
    '..KOOOOOOOK....',
    '.KKKKKKOOOK....',
    '.KBWWBBKOOOK...',
    'KBWWWBBBKOOKKK.',
    'KBBBBBBBKOOKOOK',
    '.KBBBBBKOOOKOOK',
    '.KKKKKKOOOOKOOK',
    '.KOOOOOOOOOKOOK',
    '.KOOOOOOOOOKOOK',
    '.KOOOOOOOOOKKK.',
    '.KOOKKKKOOOK...',
    '.KOOK...KOOK...',
    '..KK.....KK....',
  ],
  'Sonic': [
    '....KBBKKKKKKOKKK.....',
    '....KBKBBBBKOOKBBKK...',
    '.....KBBBBBBBOKBBBKK..',
    '.....KBBBBBBBBBBBK....',
    '....KWBBBWWWBBBBBBK...',
    '....KWKBWWKWBBBBBBBK..',
    '....KWKWWWKWBBBBBBBBK.',
    '...KKKOOWWWOOOBBKKKKKK',
    '....KOOOOOOOKOBBK.....',
    '.....KOOOOKKOOBBBK....',
    '...KK.KOOOOOOKKKKKK...',
    '.KKWK..KKKKKKK........',
    'KWWWK.KKOOOBOOK.......',
    'KWWWKKOKOOOBKKOK......',
    'KWWWOOKKOOOBK.KOKK....',
    '.KKKKK.KOOBBK.KWWWK...',
    '.......KBBBBK.KWWWK...',
    '........KBBBK.KKWWK...',
    '........KBKBBK..KK....',
    '.....KKKRRKKBKKK......',
    '...KKRWRRRKKRRRKK.....',
    '..KRRRWWRRKRRRWWRK....',
    '..KKKKKKKKKRRWWRRRK...',
    '...........KKKKKKKK...',
  ],
  'Yoshi': [
    '.....KK..KK.....',
    '....KGGKKGGK....',
    '...KGWWGGWWGK...',
    '...KWWKWWKWWK...',
    '...KWWKWWKWWK...',
    '..KKWKKKKKKWKK..',
    '.KGGKGGGGGGKGGK.',
    'KGGKGGGGGGGGKGGK',
    'KWKGGGKGGKGGGKWK',
    'KWKGGGGGGGGGGKWK',
    'KWKGGGGGGGGGGKWK',
    'KWKGGGGGGGGGGKWK',
    'KKKGGGGGGGGGGKKK',
    '.KWKGGGGGGGGKWK.',
    '..KKKGGGGGGKKK..',
    '....KKKKKKKK....',
  ],
  'Oeuf de Yoshi': [
    '.....KKKK.....',
    '....KWWWWK....',
    '...KGGGWWWK...',
    '..KGGGWWWGGK..',
    '..KGGGWWWGGK..',
    '.KWGGWWWWGGGK.',
    '.KWWWWWWWWGGK.',
    'KWWWWGGGWWWWWK',
    'KWWWGGGGGWWWWK',
    'KWWWGGGGGWWGGK',
    'KGGWGGGGGWGGGK',
    '.KGGWGGGWWGGK.',
    '.KGGWWWWWWGGK.',
    '..KGWWWWWWWK..',
    '...KKWWWWKK...',
    '.....KKKK.....',
  ],
  'Etoile de Mario': [
    '.......KK.......',
    '......KYYK......',
    '......KYYK......',
    '.....KYYYYK.....',
    'KKKKKKYYYYKKKKKK',
    'KYYYYYYYYYYYYYYK',
    '.KYYYYKYYKYYYYK.',
    '..KYYYKYYKYYYK..',
    '...KYYKYYKYYK...',
    '...KYYYYYYYYK...',
    '..KYYYYYYYYYYK..',
    '..KYYYYYYYYYYK..',
    '.KYYYYYKKYYYYYK.',
    '.KYYYKK..KKYYYK.',
    'KYYKK......KKYYK',
    'KKK..........KKK',
  ],
  '1up': [
    '.....KKKKKK.....',
    '...KKKWGGWKKK...',
    '..KKWWWGGWWWKK..',
    '.KKGWWGGGGWWGKK.',
    '.KWGGGGGGGGGGWK.',
    'KKWWGGWWWWGGWWKK',
    'KWWWGWWWWWWGWWWK',
    'KWWWGWWWWWWGWWWK',
    'KWWGGWWWWWWGGWWK',
    'KGGGGGWWWWGGGGGK',
    'KGGKKKKKKKKKKGGK',
    'KKKKWWKWWKWWKKKK',
    '.KKWWWKWWKWWWKK.',
    '..KWWWWWWWWWWK..',
    '..KKWWWWWWWWKK..',
    '...KKKKKKKKKK...',
  ],
  'Champignon de Mario': [
    '.....KKKKKK.....',
    '...KKKWRRWKKK...',
    '..KKWWWRRWWWKK..',
    '.KKRWWRRRRWWRKK.',
    '.KWRRRRRRRRRRWK.',
    'KKWWRRWWWWRRWWKK',
    'KWWWRWWWWWWRWWWK',
    'KWWWRWWWWWWRWWWK',
    'KWWRRWWWWWWRRWWK',
    'KRRRRRWWWWRRRRRK',
    'KRRKKKKKKKKKKRRK',
    'KKKKWWKWWKWWKKKK',
    '.KKWWWKWWKWWWKK.',
    '..KWWWWWWWWWWK..',
    '..KKWWWWWWWWKK..',
    '...KKKKKKKKKK...',
  ],
  'Chat Magicien': [
    '........KPMPK......',
    '........KMPK.......',
    '.......KMPMK.......',
    '......KMPMPMK......',
    '......KPMPMPK......',
    '...KKKOOOYOOOKKK...',
    '...KNOOOOOOOOONK...',
    '...OOOOOOYOOOOOO...',
    '..KPPPPPPPPPPPPPK..',
    '.KPPPPPPPPPPPPPPPK.',
    '....KKWWKKKWWKK....',
    '...KKWWKWKWKWWKK...',
    'KKKKKWWKWKWKWWKKKKK',
    '....KKWWKKKWWKK....',
    '...KKKKKKNKKKKKK...',
    '..KK..KKKKKKK..KK..',
    '.KK....OKKKO....KK.',
    '.......KOOOK.......',
    '......KKKYKKK......',
    '......KKKKKKK......',
    '.....KKKKWKKKK.....',
    '....KKKWKWKWKKK....',
    '....KKKKWWWKKKK....',
    '.....KKKKKKKKK.....',
  ],
  'Chat': [
    '..KKK...........KKK..',
    '..KNKKK.......KKKNK..',
    '..KNNNKK.KKK.KKNNNK..',
    '..KNNNNKKKKKKKNNNNK..',
    '..KKNKKKKKKKKKKKNKK..',
    '...KKKKKKKKKKKKKKK...',
    '....KKKKKKKKKKKKK....',
    '...KKKKKKKKKKKKKKK...',
    '...KKKWWKKKKKWWKKK...',
    '...KKWWKWKKKWKWWKK...',
    'KKKKKWWKWKKKWKWWKKKKK',
    '....KKWWKKKKKWWKK....',
    '...KKKKKKKNKKKKKKK...',
    '..KK..KKKKKKKKK..KK..',
    '.KK....RKKKKKR....KK.',
    '.......KRRRRRK.......',
    '..K...KKKKKRRKK......',
    '.KK..KKKKKKKRKKK.....',
    '.KK.KKKKKWKWKKKKK....',
    '.KKKKKKWKWKWKWKKK....',
    '..KKKKKKWWKWWKKKK....',
    '.....KKKKKKKKKKK.....',
  ],
};

// Rotation d'un pattern (grille de caractères) de 90° horaire, répétée `times` fois.
function rotatePattern(pattern, times) {
  const w = Math.max(...pattern.map((r) => r.length));
  let rows = pattern.map((r) => { const a = r.split(''); while (a.length < w) a.push(' '); return a; });
  let t = ((times % 4) + 4) % 4;
  while (t-- > 0) {
    const h = rows.length, ww = rows[0].length, out = [];
    for (let x = 0; x < ww; x++) { const nr = []; for (let y = h - 1; y >= 0; y--) nr.push(rows[y][x]); out.push(nr); }
    rows = out;
  }
  return rows.map((r) => r.join(''));
}

// Dessine un pattern à une position (ox, oy) et une échelle données.
function stampPattern(g, size, pattern, ox, oy, scale) {
  const ph = pattern.length, pw = Math.max(...pattern.map((r) => r.length));
  for (let py = 0; py < ph; py++) {
    const row = pattern[py];
    for (let px = 0; px < pw; px++) {
      const ch = row[px] || ' ';
      if (ch === ' ' || ch === '.') continue;
      const col = CHARMAP[ch];
      if (col == null) continue;
      for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
        const x = ox + px * scale + sx, y = oy + py * scale + sy;
        if (inb(size, x, y)) g[I(size, x, y)] = col;
      }
    }
  }
}

// Dimension max (largeur/hauteur) d'un objet, en cases de son pattern.
function objMaxDim(name) { const pat = OBJECTS[name]; return Math.max(pat.length, Math.max(...pat.map((r) => r.length))); }
// Objets dont le pattern tient dans une zone de côté `maxDim`.
function objectsFitting(maxDim) { return Object.keys(OBJECTS).filter((n) => objMaxDim(n) <= maxDim); }

function generateObject(size) {
  const g = blank(size);
  const names = objectsFitting(size); // seuls les objets qui tiennent dans la grille
  if (!names.length) return generateComposite(size);
  const name = names[Math.floor(Math.random() * names.length)];
  // Orientation aléatoire (0/90/180/270°)
  const pattern = rotatePattern(OBJECTS[name], Math.floor(Math.random() * 4));
  const ph = pattern.length, pw = Math.max(...pattern.map((r) => r.length));
  // Échelle : tient dans la grille avec une marge de 1 case
  const avail = size - 2;
  const scale = Math.max(1, Math.floor(avail / Math.max(pw, ph)));
  const dw = pw * scale, dh = ph * scale;
  // Position aléatoire (en restant dans les limites)
  const ox = Math.floor(Math.random() * (size - dw + 1));
  const oy = Math.floor(Math.random() * (size - dh + 1));
  stampPattern(g, size, pattern, ox, oy, scale);
  return { name, grid: g };
}

// Génère une cible composite géométrique.
function generateComposite(size) {
  const g = blank(size);
  const parts = [];
  if (size >= 16 && Math.random() < 0.25) { const bg = rnd([1, 4]); rect(g, size, 0, 0, size, size, bg); parts.push('fond ' + PALETTE[bg]); }
  const nb = ri(2, size >= 24 ? 4 : 3);
  const colors = pickColors(nb + 1);
  const cells = size;
  const usedCorners = [];
  for (let k = 0; k < nb; k++) {
    const el = rnd(ELEMENTS);
    const s = ri(Math.max(3, Math.floor(cells * 0.22)), Math.floor(cells * 0.45));
    let x0 = ri(0, size - s), y0 = ri(0, size - s);
    const key = `${Math.round(x0 / 4)}-${Math.round(y0 / 4)}`;
    if (usedCorners.includes(key)) { x0 = ri(0, size - s); y0 = ri(0, size - s); }
    usedCorners.push(key);
    el.fn(g, size, x0, y0, s, colors[k % colors.length]);
    parts.push(el.name);
  }
  if (Math.random() < 0.4) {
    const c = colors[colors.length - 1];
    if (Math.random() < 0.5) hline(g, size, 0, ri(2, size - 3), size, c, size >= 24 ? 2 : 1);
    else vline(g, size, ri(2, size - 3), 0, size, c, size >= 24 ? 2 : 1);
    parts.push('ligne');
  }
  return { name: `${parts.length} éléments`, grid: g };
}

// Place un objet aléatoire (pivoté) centré dans une boîte (x0,y0,w,h), mis à l'échelle pour y tenir.
function placeObject(g, size, x0, y0, w, h) {
  const names = objectsFitting(Math.min(w, h)); // objets qui tiennent dans la zone
  if (!names.length) return null;
  const name = names[Math.floor(Math.random() * names.length)];
  const pattern = rotatePattern(OBJECTS[name], Math.floor(Math.random() * 4));
  const ph = pattern.length, pw = Math.max(...pattern.map((r) => r.length));
  const scale = Math.max(1, Math.floor(Math.min(w / pw, h / ph)));
  const dw = pw * scale, dh = ph * scale;
  const ox = x0 + Math.floor((w - dw) / 2), oy = y0 + Math.floor((h - dh) / 2);
  stampPattern(g, size, pattern, ox, oy, scale);
  return name;
}

// Découpe la grille en zones (2 moitiés, ou 4 quadrants sur grande grille) pour poser plusieurs formes sans chevauchement.
function regionsFor(size) {
  const h = Math.floor(size / 2);
  if (size >= 24) return [[0, 0, h, h], [h, 0, size - h, h], [0, h, h, size - h], [h, h, size - h, size - h]];
  return Math.random() < 0.5 ? [[0, 0, h, size], [h, 0, size - h, size]] : [[0, 0, size, h], [0, h, size, size - h]];
}

// Cible "mixte" : plusieurs formes (objets ET/OU formes géométriques), une par zone.
function generateMulti(size) {
  const g = blank(size);
  const parts = [];
  const regions = regionsFor(size);
  const quad = regions.length === 4;
  for (const [rx, ry, rw, rh] of regions) {
    if (quad && Math.random() < 0.25) continue; // sur grande grille, parfois laisser une zone vide
    let placed = null;
    if (Math.random() < 0.6) placed = placeObject(g, size, rx + 1, ry + 1, rw - 2, rh - 2); // tente un objet
    if (placed) {
      parts.push(placed);
    } else {
      const el = rnd(ELEMENTS); // une forme géométrique (y compris si aucun objet ne tient dans la zone)
      const sMax = Math.max(3, Math.min(rw, rh) - 2);
      const sq = ri(Math.max(3, Math.floor(sMax * 0.6)), sMax);
      el.fn(g, size, rx + Math.floor((rw - sq) / 2), ry + Math.floor((rh - sq) / 2), sq, rnd(FG));
      parts.push(el.name);
    }
  }
  if (!parts.length) return generateComposite(size);
  return { name: parts.join(' + '), grid: g };
}

function generateTarget(size) {
  // < 16 : trop petit pour les objets -> formes géométriques uniquement
  if (size < 16) return generateComposite(size);
  // 16-19 : un objet seul OU des formes géométriques (pas de multi, trop à l'étroit)
  if (size < 20) return Math.random() < 0.5 ? generateObject(size) : generateComposite(size);
  // >= 20 : on ajoute les cibles "mixtes" (plusieurs formes, objets + géométriques mélangés)
  const r = Math.random();
  if (r < 0.30) return generateObject(size);    // un seul objet
  if (r < 0.60) return generateComposite(size); // formes géométriques
  return generateMulti(size);                   // mix de plusieurs formes
}

// Rejette une cible trop pauvre : vide, ou entièrement peinte d'une seule couleur (ex. tout jaune).
function tooUniform(grid, size) {
  const total = size * size; let empty = 0; const cols = new Set();
  for (const c of grid) { if (c === -1) empty++; else cols.add(c); }
  if (cols.size === 0) return true;                       // rien de dessiné
  if (empty < total * 0.1 && cols.size <= 1) return true; // tout rempli d'une seule couleur
  return false;
}

// Tirage sans remise dans une partie (exclude = signatures déjà sorties)
function randomTarget(size, exclude = []) {
  let best = null;
  for (let i = 0; i < 24; i++) {
    const t = generateTarget(size);
    if (tooUniform(t.grid, size)) continue; // on saute les cibles trop faciles
    best = t;
    const sig = t.grid.join(',');
    if (!exclude.includes(sig)) { t.signature = sig; return t; }
  }
  if (!best) best = generateComposite(size);
  best.signature = best.grid.join(',');
  return best;
}

module.exports = { PALETTE, randomTarget };
