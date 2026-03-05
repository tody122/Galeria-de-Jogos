/**
 * Grid de gradiente de cores para o Colorama (estilo Hues and Cues).
 * Tabuleiro com várias cores em eixos de matiz (hue) e luminosidade (lightness).
 */

export const GRID_ROWS = 20;
export const GRID_COLS = 30;

export interface GridCell {
  row: number;
  col: number;
  hex: string;
}

/** Converte HSL para hex (H 0-360, S e L 0-100). */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  const r = Math.round(f(0) * 255);
  const g = Math.round(f(8) * 255);
  const b = Math.round(f(4) * 255);
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/** Retorna a cor hex da célula (row, col). Gradiente: col = matiz, row = luminosidade. */
export function getColorAt(row: number, col: number): string {
  const hue = (col / GRID_COLS) * 360;
  const lightness = 22 + (row / GRID_ROWS) * 68;
  const saturation = 75;
  return hslToHex(hue, saturation, lightness);
}

/** Seed fixo para embaralhar a ordem das cores (igual em todos os clientes). */
const SHUFFLE_SEED = 0x4d1a7f3e;

/** Gerador de números pseudoaleatórios determinístico (LCG). */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** Lista de todas as células (row, col) em ordem "aleatória" fixa. */
let shuffledCells: { row: number; col: number }[] | null = null;

function getShuffledCells(): { row: number; col: number }[] {
  if (shuffledCells) return shuffledCells;
  const cells: { row: number; col: number }[] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      cells.push({ row: r, col: c });
    }
  }
  const random = seededRandom(SHUFFLE_SEED);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  shuffledCells = cells;
  return shuffledCells;
}

/** Retorna a célula secreta para a rodada (ordem aleatória mas igual para todos os clientes). */
export function getSecretCellForRound(round: number): { row: number; col: number } {
  const cells = getShuffledCells();
  return cells[round % cells.length];
}

/** Distância de Chebyshev (máximo das distâncias em row e col). */
export function cellDistance(
  r1: number,
  c1: number,
  r2: number,
  c2: number
): number {
  return Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2));
}

/** Pontos do palpite: exato 5, adjacente 3, distância 2 = 1. */
export function pointsForGuess(
  guessRow: number,
  guessCol: number,
  secretRow: number,
  secretCol: number
): number {
  const d = cellDistance(guessRow, guessCol, secretRow, secretCol);
  if (d === 0) return 5;
  if (d === 1) return 3;
  if (d === 2) return 1;
  return 0;
}

/** Verifica se o palpite está na área 3x3 ao redor da cor secreta (distância <= 1). */
export function isIn3x3Area(
  guessRow: number,
  guessCol: number,
  secretRow: number,
  secretCol: number
): boolean {
  return cellDistance(guessRow, guessCol, secretRow, secretCol) <= 1;
}
