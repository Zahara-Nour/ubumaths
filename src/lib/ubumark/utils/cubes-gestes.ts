/**
 * Bloc ```cubes — gestes de l'élève : réponses, réponses attendues, jugement
 * ==========================================================================
 *
 * Chantier `solides`, lot 2 (`docs/archive/wip/solides-progress.md` § 7).
 *
 * `dessiner: face` — l'élève colorie la vue dans un quadrillage vide, plus grand
 * que la vue d'un carreau de chaque côté :
 * - réponse de la case : le quadrillage, rangées de haut en bas séparées par `/`,
 *   `1` = colorié (`00000/01000/01110/00000`) ; `''` quand rien n'est colorié.
 *   Elle se suffit : la correction redessine le quadrillage de l'élève ;
 * - réponse attendue : la vue juste, même écriture, sans marge (`100/111`) ;
 * - jugement : à une translation près (les carreaux coloriés, recadrés, sont la vue).
 *
 * `retrouver: face, droite` — l'élève écrit une hauteur sur chaque carreau de la
 * vue de dessus :
 * - réponse de la case : les hauteurs, écriture du bloc (`2 1 1 / 1 0 1`), `-`
 *   pour une case non remplie ;
 * - réponse attendue : `face, droite : 2 1 1 / 1 0 1` (vues jugées, assemblage du bloc) ;
 * - jugement : « mêmes vues » — la vue de dessus et celles listées. Plusieurs
 *   assemblages peuvent être justes ; le juge calcule les vues, il ne compare
 *   jamais aux hauteurs du bloc.
 *
 * Calcul pur, sans Svelte.
 *
 * @module ubumark/utils/cubes-gestes
 */

import {
	CUBES_LIMITS,
	CUBES_SIDE_VIEWS,
	type CubesDrawnView,
	type CubesSideView,
	type CubesSpec
} from '../types/espace';
import { sideColumns } from './espace-scene';

export { sideColumns };

// Constantes

export const NOTHING_COLORED_CUBES = 'Tu n’as rien colorié.';

export const MISSING_HEIGHTS = 'Tu n’as pas rempli toutes les cases.';

export const OTHER_SOLUTIONS = 'Il y a d’autres réponses justes.';

/** Nom d'une vue dans une phrase : « la vue de face » */
const VIEW_NAMES: Record<CubesDrawnView, string> = {
	dessus: 'vue de dessus',
	face: 'vue de face',
	droite: 'vue de droite',
	gauche: 'vue de gauche'
};

const DRAWING_ROW_REGEX = /^[01]+$/;
const EXPECTED_RETROUVER_REGEX = /^([a-z, ]+):(.+)$/;

// Functions — vues

const maxOf = (values: number[]) => values.reduce((a, b) => Math.max(a, b), 0);

/** Une vue en grille de carreaux (rangée du haut d'abord), sans marge */
export function viewGrid(heights: number[][], view: CubesDrawnView): boolean[][] {
	if (view === 'dessus') return heights.map((row) => row.map((h) => h > 0));
	const columns = sideColumns(heights, view);
	const top = maxOf(columns);
	return Array.from({ length: top }, (_, line) => columns.map((h) => h >= top - line));
}

// Functions — dessiner

/** Taille du quadrillage à colorier : la vue agrandie d'un carreau de chaque côté */
export function drawingGridSize(
	heights: number[][],
	view: CubesDrawnView
): { rows: number; cols: number } {
	const grid = viewGrid(heights, view);
	return { rows: grid.length + 2, cols: grid[0].length + 2 };
}

/** Réponse de la case pour ce quadrillage ; '' quand rien n'est colorié */
export function drawingAnswer(grid: readonly (readonly boolean[])[]): string {
	if (!grid.some((row) => row.some(Boolean))) return '';
	return grid.map((row) => row.map((cell) => (cell ? '1' : '0')).join('')).join('/');
}

/** Quadrillage d'une réponse ; [] pour rien colorié, null si illisible */
export function readDrawingAnswer(answer: string): boolean[][] | null {
	const text = answer.trim();
	if (text === '') return [];
	const rows = text.split('/').map((row) => row.trim());
	if (rows.some((row) => !DRAWING_ROW_REGEX.test(row))) return null;
	if (rows.some((row) => row.length !== rows[0].length)) return null;
	return rows.map((row) => [...row].map((cell) => cell === '1'));
}

/** Les carreaux coloriés recadrés sur leur boîte ; [] si aucun */
function cropGrid(grid: boolean[][]): boolean[][] {
	const rowsIn = grid.map((row, r) => (row.some(Boolean) ? r : -1)).filter((r) => r >= 0);
	if (rowsIn.length === 0) return [];
	const colsIn = grid[0].map((_, c) => (grid.some((row) => row[c]) ? c : -1)).filter((c) => c >= 0);
	return grid
		.slice(rowsIn[0], rowsIn[rowsIn.length - 1] + 1)
		.map((row) => row.slice(colsIn[0], colsIn[colsIn.length - 1] + 1));
}

/** Les carreaux coloriés (`answer`) ont-ils la forme de la vue attendue, où qu'ils soient ? */
export function isDrawingCorrect(answer: string, expected: string): boolean {
	const drawn = readDrawingAnswer(answer);
	const wanted = readDrawingAnswer(expected);
	if (drawn === null || wanted === null || drawn.length === 0) return false;
	return drawingAnswer(cropGrid(drawn)) === drawingAnswer(cropGrid(wanted));
}

/** Les phrases de la correction, pour un dessin faux */
export function drawingMistakes(answer: string, view: CubesDrawnView): string[] {
	if (answer.trim() === '') return [NOTHING_COLORED_CUBES];
	return [`Ce n’est pas la ${VIEW_NAMES[view]} de l’assemblage.`];
}

// Functions — retrouver

/** Réponse de la case pour ces hauteurs (`null` : case non remplie) */
export function heightsAnswer(cells: readonly (readonly (number | null)[])[]): string {
	return cells.map((row) => row.map((h) => (h === null ? '-' : String(h))).join(' ')).join(' / ');
}

/** Hauteurs d'une réponse (`null` : case non remplie) ; null si illisible */
export function readHeightsAnswer(answer: string): (number | null)[][] | null {
	const text = answer.trim();
	if (text === '') return null;
	const rows = text.split('/').map((row) => row.trim().split(/\s+/));
	if (rows.some((row) => row.length !== rows[0].length)) return null;
	const cells = rows.map((row) =>
		row.map((cell) => (cell === '-' ? null : /^\d+$/.test(cell) ? Number(cell) : Number.NaN))
	);
	const bad = cells.some((row) =>
		row.some((h) => h !== null && (Number.isNaN(h) || h > CUBES_LIMITS.height))
	);
	return bad ? null : cells;
}

/** Lecture de la réponse attendue de `retrouver:` ; null si illisible */
function readExpectedRetrouver(
	expected: string
): { views: CubesSideView[]; heights: number[][] } | null {
	const match = EXPECTED_RETROUVER_REGEX.exec(expected.trim());
	if (!match) return null;
	const views = match[1].split(',').map((view) => view.trim());
	if (!views.every((view) => (CUBES_SIDE_VIEWS as readonly string[]).includes(view))) return null;
	const heights = readHeightsAnswer(match[2]);
	if (heights === null || heights.some((row) => row.some((h) => h === null))) return null;
	return { views: views as CubesSideView[], heights: heights as number[][] };
}

const sameColumns = (a: number[], b: number[]) =>
	a.length === b.length && a.every((h, i) => h === b[i]);

/** Les vues (dessus, puis celles listées) qui diffèrent entre deux assemblages de même taille */
function differingViews(
	answer: number[][],
	wanted: number[][],
	views: readonly CubesSideView[]
): CubesDrawnView[] {
	const differing: CubesDrawnView[] = [];
	if (drawingAnswer(viewGrid(answer, 'dessus')) !== drawingAnswer(viewGrid(wanted, 'dessus'))) {
		differing.push('dessus');
	}
	for (const view of views) {
		if (!sameColumns(sideColumns(answer, view), sideColumns(wanted, view))) differing.push(view);
	}
	return differing;
}

/** Hauteurs remplies de la réponse, de la taille de l'assemblage attendu ; null sinon */
function filledHeights(answer: string, wanted: number[][]): number[][] | null {
	const cells = readHeightsAnswer(answer);
	if (cells === null || cells.some((row) => row.some((h) => h === null))) return null;
	if (cells.length !== wanted.length || cells[0].length !== wanted[0].length) return null;
	return cells as number[][];
}

/** L'assemblage de l'élève a-t-il les mêmes vues (dessus et celles listées) ? */
export function isRetrouverCorrect(answer: string, expected: string): boolean {
	const wanted = readExpectedRetrouver(expected);
	if (wanted === null) return false;
	const heights = filledHeights(answer, wanted.heights);
	return heights !== null && differingViews(heights, wanted.heights, wanted.views).length === 0;
}

/** Les phrases de la correction, pour un assemblage faux */
export function retrouverMistakes(answer: string, expected: string): string[] {
	const wanted = readExpectedRetrouver(expected);
	if (wanted === null) return [];
	const heights = filledHeights(answer, wanted.heights);
	if (heights === null) return [MISSING_HEIGHTS];
	return differingViews(heights, wanted.heights, wanted.views).map(
		(view) => `Ton assemblage n’a pas la même ${VIEW_NAMES[view]}.`
	);
}

/**
 * Un autre assemblage a-t-il les mêmes vues ? Le plus haut possible (chaque pile
 * au plus bas des vues qui la bornent) en est un ; s'il est l'assemblage du bloc,
 * il en existe un autre seulement si une pile peut descendre d'un cube seule.
 */
export function retrouverHasOtherSolutions(
	heights: number[][],
	views: readonly CubesSideView[]
): boolean {
	const bound = (r: number, c: number) => {
		let top: number = CUBES_LIMITS.height;
		for (const view of views) {
			const columns = sideColumns(heights, view);
			const index = view === 'face' ? c : view === 'droite' ? heights.length - 1 - r : r;
			top = Math.min(top, columns[index]);
		}
		return top;
	};
	const highest = heights.map((row, r) => row.map((h, c) => (h > 0 ? bound(r, c) : 0)));
	if (heightsAnswer(highest) !== heightsAnswer(heights)) return true;
	return heights.some((row, r) =>
		row.some((h, c) => {
			if (h < 2) return false;
			const lowered = heights.map((line) => [...line]);
			lowered[r][c] = h - 1;
			return differingViews(lowered, heights, views).length === 0;
		})
	);
}

// Functions — les deux gestes

/** Réponse attendue d'un assemblage à geste */
export function expectedCubesAnswer(spec: CubesSpec): string {
	const task = spec.task;
	if (task === undefined) return '';
	if (task.kind === 'dessiner') return drawingAnswer(viewGrid(spec.heights, task.view));
	return `${task.views.join(', ')} : ${heightsAnswer(spec.heights)}`;
}

/** Jugement d'un assemblage à geste : le genre se lit sur la réponse attendue */
export function isCubesAnswerCorrect(answer: string, expected: string): boolean {
	return expected.includes(':')
		? isRetrouverCorrect(answer, expected)
		: isDrawingCorrect(answer, expected);
}
