/**
 * Génère des formes "cibles" pixelisées à n'importe quelle taille de grille.
 * Chaque forme renvoie un tableau plat de longueur size*size, où chaque case est
 * un index de couleur de la PALETTE (0 = fond/vide, voir PALETTE ci-dessous) ou -1 pour vide.
 * On garde ça simple et net : cercle, cœur, étoile, croix, carré, losange, smiley, maison, arbre, éclair.
 */

// Palette v1 (index -> hex). -1 = case vide (transparent/fond).
const PALETTE = [
  '#000000', // 0 noir
  '#FFFFFF', // 1 blanc
  '#E53935', // 2 rouge
  '#FB8C00', // 3 orange
  '#FDD835', // 4 jaune
  '#43A047', // 5 vert
  '#1E88E5', // 6 bleu
  '#8E24AA', // 7 violet
  '#EC407A', // 8 rose
  '#6D4C41', // 9 marron
];

function blank(size) { return new Array(size * size).fill(-1); }
const idx = (size, x, y) => y * size + x;

function drawCircle(size, color) {
  const g = blank(size); const c = (size - 1) / 2, r = size * 0.42;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const d = Math.hypot(x - c, y - c); if (d <= r) g[idx(size, x, y)] = color; }
  return g;
}
function drawSquare(size, color) {
  const g = blank(size); const m = Math.max(1, Math.floor(size * 0.2));
  for (let y = m; y < size - m; y++) for (let x = m; x < size - m; x++) g[idx(size, x, y)] = color;
  return g;
}
function drawDiamond(size, color) {
  const g = blank(size); const c = (size - 1) / 2, r = size * 0.5;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (Math.abs(x - c) + Math.abs(y - c) <= r * 0.9) g[idx(size, x, y)] = color;
  return g;
}
function drawCross(size, color) {
  const g = blank(size); const a = Math.floor(size * 0.35), b = Math.ceil(size * 0.65);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if ((x >= a && x < b) || (y >= a && y < b)) g[idx(size, x, y)] = color;
  return g;
}
function drawHeart(size, color) {
  const g = blank(size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const fx = (x / (size - 1)) * 2 - 1;
    const fy = 1 - (y / (size - 1)) * 2 + 0.15;
    const v = Math.pow(fx * fx + fy * fy - 0.5, 3) - fx * fx * fy * fy * fy;
    if (v <= 0) g[idx(size, x, y)] = color;
  }
  return g;
}
function drawStar(size, color) {
  const g = blank(size); const cx = (size - 1) / 2, cy = (size - 1) / 2, R = size * 0.48, r = R * 0.45;
  const pts = [];
  for (let i = 0; i < 10; i++) { const ang = -Math.PI / 2 + (i * Math.PI) / 5; const rad = i % 2 === 0 ? R : r; pts.push([cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)]); }
  const inside = (px, py) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if (((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)) c = !c; } return c; };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (inside(x, y)) g[idx(size, x, y)] = color;
  return g;
}
function drawSmiley(size) {
  const g = drawCircle(size, 4); // visage jaune
  const c = (size - 1) / 2;
  const eyeY = Math.round(size * 0.38);
  g[idx(size, Math.round(size * 0.35), eyeY)] = 0;
  g[idx(size, Math.round(size * 0.65), eyeY)] = 0;
  for (let x = 0; x < size; x++) { const my = Math.round(c + size * 0.22 + Math.pow((x - c) / (size * 0.5), 2) * -size * 0.12); if (Math.abs(x - c) < size * 0.28 && g[idx(size, x, my)] === 4) g[idx(size, x, my)] = 0; }
  return g;
}
function drawHouse(size) {
  const g = blank(size);
  const w = Math.floor(size * 0.6), x0 = Math.floor((size - w) / 2), yBase = Math.floor(size * 0.85), yWall = Math.floor(size * 0.45);
  for (let y = yWall; y < yBase; y++) for (let x = x0; x < x0 + w; x++) g[idx(size, x, y)] = 9; // murs marron
  const apex = Math.floor(size * 0.15);
  for (let y = apex; y < yWall; y++) { const half = ((y - apex) / (yWall - apex)) * (w / 2 + 1); for (let x = Math.round(size / 2 - half); x <= Math.round(size / 2 + half); x++) if (x >= 0 && x < size) g[idx(size, x, y)] = 2; } // toit rouge
  return g;
}
function drawLightning(size) {
  const g = blank(size);
  for (let y = 0; y < size; y++) { const cx = Math.round(size * 0.55 - (y / size) * size * 0.25 + (y > size / 2 ? size * 0.2 : 0)); for (let x = cx - 1; x <= cx + 1; x++) if (x >= 0 && x < size) g[idx(size, x, y)] = 4; }
  return g;
}

const SHAPES = [
  { name: 'Cercle', fn: (s) => drawCircle(s, 6) },
  { name: 'Carré', fn: (s) => drawSquare(s, 5) },
  { name: 'Losange', fn: (s) => drawDiamond(s, 7) },
  { name: 'Croix', fn: (s) => drawCross(s, 2) },
  { name: 'Cœur', fn: (s) => drawHeart(s, 8) },
  { name: 'Étoile', fn: (s) => drawStar(s, 4) },
  { name: 'Smiley', fn: (s) => drawSmiley(s) },
  { name: 'Maison', fn: (s) => drawHouse(s) },
  { name: 'Éclair', fn: (s) => drawLightning(s) },
];

function randomTarget(size) {
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  return { name: shape.name, grid: shape.fn(size) };
}

module.exports = { PALETTE, SHAPES, randomTarget };
