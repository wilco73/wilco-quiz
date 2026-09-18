/**
 * Cibles pixel-art générées procéduralement (plusieurs éléments, positions variées, couleurs multiples).
 * randomTarget(size, exclude) -> { name, grid } ; grid = tableau plat size*size d'index palette (-1 = vide).
 */

const PALETTE = [
  '#000000', '#FFFFFF', '#E53935', '#FB8C00', '#FDD835',
  '#43A047', '#1E88E5', '#8E24AA', '#EC407A', '#6D4C41',
];
// couleurs "vives" utilisables pour les éléments (on évite le blanc sur fond sombre par défaut)
const FG = [0, 2, 3, 4, 5, 6, 7, 8, 9];

function blank(size) { return new Array(size * size).fill(-1); }
const I = (size, x, y) => y * size + x;
const inb = (size, x, y) => x >= 0 && x < size && y >= 0 && y < size;
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
const ri = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// --- primitives (dessinent dans g, dans une boîte [x0,y0]..[x0+w,y0+h]) ---
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

// éléments "poseables" (nom + fonction qui remplit une boîte de taille s au coin x0,y0)
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

// Génère une cible composite : 2 à 4 éléments à des positions variées, couleurs différentes, parfois lignes/fond.
function generateComposite(size) {
  const g = blank(size);
  const parts = [];

  // fond léger occasionnel (grande grille seulement, couleur claire jaune/blanc)
  if (size >= 16 && Math.random() < 0.25) { const bg = rnd([1, 4]); rect(g, size, 0, 0, size, size, bg); parts.push('fond ' + PALETTE[bg]); }

  const nb = ri(2, size >= 24 ? 4 : 3);
  const colors = pickColors(nb + 1);
  const cells = size;
  const usedCorners = [];
  for (let k = 0; k < nb; k++) {
    const el = rnd(ELEMENTS);
    const s = ri(Math.max(3, Math.floor(cells * 0.22)), Math.floor(cells * 0.45));
    // position variée : coins / bords / aléatoire, en évitant de retomber toujours au centre
    let x0 = ri(0, size - s), y0 = ri(0, size - s);
    const key = `${Math.round(x0 / 4)}-${Math.round(y0 / 4)}`;
    if (usedCorners.includes(key)) { x0 = ri(0, size - s); y0 = ri(0, size - s); }
    usedCorners.push(key);
    el.fn(g, size, x0, y0, s, colors[k % colors.length]);
    parts.push(el.name);
  }

  // une ligne traversante de temps en temps
  if (Math.random() < 0.4) {
    const c = colors[colors.length - 1];
    if (Math.random() < 0.5) hline(g, size, 0, ri(2, size - 3), size, c, size >= 24 ? 2 : 1);
    else vline(g, size, ri(2, size - 3), 0, size, c, size >= 24 ? 2 : 1);
    parts.push('ligne');
  }

  const name = `${parts.length} éléments`;
  return { name, grid: g };
}

// Tirage sans remise dans une partie (exclude = liste de "signatures" déjà sorties)
function randomTarget(size, exclude = []) {
  let best = null;
  for (let i = 0; i < 12; i++) {
    const t = generateComposite(size);
    const sig = t.grid.join(',');
    if (!exclude.includes(sig)) { t.signature = sig; return t; }
    best = t;
  }
  best.signature = best.grid.join(',');
  return best; // au pire on renvoie la dernière (très improbable d'épuiser)
}

module.exports = { PALETTE, randomTarget };
