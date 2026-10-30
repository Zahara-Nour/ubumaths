/**
 * Bloc ```patron — gestes de l'élève : réponses, réponses attendues, jugement
 * ===========================================================================
 *
 * Chantier `solides`, lot 5 (`docs/wip/solides-progress.md` § 10).
 *
 * `designer: opposee` (`voisines`, `sommet A`, `face EFGH`) — l'élève touche
 * une ou plusieurs faces :
 * - faces attendues calculées par le pliage (`targetFaces`), jamais écrites par
 *   le prof ;
 * - réponse de la case : les numéros des faces touchées (ordre de lecture, de 1),
 *   croissants, séparés par des virgules (`2,4`) ; `''` quand rien n'est touché ;
 * - réponse attendue : même écriture ; juste si mêmes faces.
 *
 * `completer: 4` — des cases sont retirées du patron du cube, l'élève pose
 * autant de faces sur les cases vides qui touchent une face :
 * - réponse de la case : le quadrillage de travail (la grille agrandie d'autant
 *   de cases que de faces retirées, de chaque côté), rangées de haut en bas
 *   séparées par `/`, `1` = face donnée, `2` = face posée ; `''` quand rien
 *   n'est posé. Elle se suffit : la correction redessine le quadrillage ;
 * - réponse attendue : le patron du prof, même cadre (`2` = face retirée) ;
 * - jugement : les 6 faces se plient-elles en cube ? Plusieurs poses peuvent
 *   être justes ; le juge plie, il ne compare jamais à la case retirée.
 *
 * Calcul pur, sans Svelte.
 *
 * @module ubumark/utils/patron-gestes
 */

import type { PatronSolid, PatronSpec, PatronTarget } from '../types/espace';
import { solideTopology } from './espace-solides';
import { gridIsConnected, patronNet, transformGrid, type PatronNet } from './espace-patrons';

// Types

/** Une case du quadrillage de `completer:` : vide, face donnée, face posée (ou retirée) */
export type CompleterCell = 0 | 1 | 2;

// Constantes

export const NOTHING_TOUCHED = 'Tu n’as touché aucune face.';

export const NOTHING_PLACED = 'Tu n’as posé aucune face.';

export const NOT_FOLDING = 'Ces faces ne se plient pas en cube : deux faces se recouvrent.';

export { OTHER_SOLUTIONS } from './cubes-gestes';

/** Noms des sommets quand `sommets:` ne les donne pas (ordre de ```solide) */
const DEFAULT_NAMES: Record<PatronSolid, string[]> = {
	cube: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
	pave: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
	'prisme-triangle': ['A', 'B', 'C', 'D', 'E', 'F'],
	'prisme-triangle-rectangle': ['A', 'B', 'C', 'D', 'E', 'F'],
	'pyramide-carree': ['S', 'A', 'B', 'C', 'D'],
	'pyramide-rectangle': ['S', 'A', 'B', 'C', 'D'],
	'pyramide-triangle': ['S', 'A', 'B', 'C'],
	cylindre: []
};

/** Un nom de sommet dans une suite de lettres (`EFGH`, `A'B'C'`) */
const NAME_TOKEN_REGEX = /[A-Z](?:'+|\d+)?/g;

const FACES_ANSWER_REGEX = /^\d+(?:\s*,\s*\d+)*$/;
const COMPLETER_ROW_REGEX = /^[012]+$/;

// Functions — designer

/**
 * Le sommet du solide qui porte ce nom : d'abord ceux de `sommets:`, sinon le nom
 * par défaut d'un sommet que `sommets:` laisse sans nom ; null s'il n'existe pas
 */
function vertexNamed(spec: PatronSpec, name: string): number | null {
	const written = spec.names?.indexOf(name) ?? -1;
	if (written >= 0) return written;
	const byDefault = DEFAULT_NAMES[spec.solid].indexOf(name);
	if (byDefault < 0) return null;
	const there = spec.names?.[byDefault] ?? null;
	return there === null || there === '?' ? byDefault : null;
}

/** Les sommets d'un nom de face (`EFGH`) ; une phrase d'erreur sinon */
function verticesNamed(spec: PatronSpec, name: string): number[] | string {
	const tokens = name.match(NAME_TOKEN_REGEX) ?? [];
	if (tokens.join('') !== name || tokens.length < 3) {
		return `face « ${name} » : les noms de ses sommets, à la suite (ex. face EFGH)`;
	}
	const vertices: number[] = [];
	for (const token of tokens) {
		const vertex = vertexNamed(spec, token);
		if (vertex === null) return `aucun sommet ne s’appelle ${token}`;
		vertices.push(vertex);
	}
	return vertices;
}

const common = (a: number[], b: number[]) => a.filter((v) => b.includes(v)).length;

/**
 * Les faces du patron (ordre de lecture, de 0) que `designer:` fait toucher ;
 * `marked` : la face marquée (ordre de lecture), pour `opposee` et `voisines`.
 * Une phrase d'erreur pour le prof quand la cible n'existe pas.
 */
export function targetFaces(
	spec: PatronSpec,
	net: PatronNet,
	target: PatronTarget,
	marked: number | null
): number[] | string {
	const solidFaces = solideTopology(spec.solid).faces;
	const onNet = (solidFace: number) =>
		net.faces.flatMap((f, i) => (f.solidFace === solidFace ? [i] : []));
	const facesWhere = (keep: (face: number[], index: number) => boolean) =>
		solidFaces
			.flatMap((face, index) => (keep(face, index) ? onNet(index) : []))
			.sort((a, b) => a - b);

	if (target.kind === 'opposee' || target.kind === 'voisines') {
		const solidFace = marked === null ? null : net.faces[marked]?.solidFace;
		if (solidFace === null || solidFace === undefined) {
			return `designer: ${target.kind} : marque la face de départ (marquer: face 3)`;
		}
		const own = solidFaces[solidFace];
		if (target.kind === 'voisines') {
			return facesWhere((face, index) => index !== solidFace && common(face, own) >= 2);
		}
		const opposite = facesWhere((face) => common(face, own) === 0);
		if (opposite.length !== 1) return 'designer: opposee : cette face n’a pas de face opposée';
		return opposite;
	}
	// Un nom écrit sur le patron montrerait les faces à toucher (ses coins)
	const shown = (vertex: number) => {
		const name = spec.names?.[vertex] ?? null;
		return name !== null && name !== '?';
	};
	if (target.kind === 'sommet') {
		const vertex = vertexNamed(spec, target.name);
		if (vertex === null) return `aucun sommet ne s’appelle ${target.name}`;
		if (shown(vertex)) {
			return `designer: sommet ${target.name} : ${target.name} est écrit sur le patron, ses coins donnent la réponse (cache-le avec - dans sommets:)`;
		}
		return facesWhere((face) => face.includes(vertex));
	}
	const vertices = verticesNamed(spec, target.name);
	if (typeof vertices === 'string') return vertices;
	const visible = vertices.filter(shown).map((v) => spec.names?.[v]);
	if (visible.length > 0) {
		return `designer: face ${target.name} : ${visible.join(', ')} ${visible.length > 1 ? 'sont écrits' : 'est écrit'} sur le patron et montre${visible.length > 1 ? 'nt' : ''} la face (cache ses sommets avec - dans sommets:)`;
	}
	const faces = facesWhere(
		(face) => face.length === vertices.length && common(face, vertices) === vertices.length
	);
	return faces.length > 0 ? faces : `${target.name} n’est pas une face du solide`;
}

/** Réponse de la case pour ces faces touchées (de 0) ; '' quand aucune */
export function facesAnswer(faces: Iterable<number>): string {
	return [...new Set(faces)]
		.sort((a, b) => a - b)
		.map((i) => String(i + 1))
		.join(',');
}

/** Faces d'une réponse (de 0) ; [] pour aucune, null si illisible */
export function readFacesAnswer(answer: string): number[] | null {
	const text = answer.trim();
	if (text === '') return [];
	if (!FACES_ANSWER_REGEX.test(text)) return null;
	const faces = text.split(',').map((n) => Number(n.trim()) - 1);
	return faces.some((i) => i < 0) ? null : [...new Set(faces)].sort((a, b) => a - b);
}

/** L'élève a-t-il touché exactement les faces attendues ? */
export function isDesignerCorrect(answer: string, expected: string): boolean {
	const touched = readFacesAnswer(answer);
	const wanted = readFacesAnswer(expected);
	if (touched === null || wanted === null || touched.length === 0) return false;
	return facesAnswer(touched) === facesAnswer(wanted);
}

/** Les phrases de la correction, pour des faces fausses */
export function designerMistakes(answer: string, target: PatronTarget): string[] {
	if (answer.trim() === '') return [NOTHING_TOUCHED];
	switch (target.kind) {
		case 'opposee':
			return ['Ce n’est pas la face opposée à la face grise.'];
		case 'voisines':
			return ['Ce ne sont pas les faces voisines de la face grise.'];
		case 'sommet':
			return [`Ce ne sont pas les faces qui se touchent en ${target.name}.`];
		case 'face':
			return [`Ce n’est pas la face ${target.name}.`];
	}
}

// Functions — completer

/**
 * Quadrillage de travail de `completer:` : la grille du patron tel qu'il est
 * dessiné (tourné, retourné), `2` sur les cases retirées ; la boîte des faces
 * DONNÉES, agrandie d'autant de cases que de faces retirées de chaque côté (une
 * face posée y tient toujours). Jamais la boîte du patron entier : un vide d'un
 * seul côté montrerait où manque la face.
 */
export function completerFrame(spec: PatronSpec, removed: readonly number[]): CompleterCell[][] {
	const cells = spec.cells ?? [];
	let rank = 0;
	const marked = cells.map((row) =>
		row.map((on): CompleterCell => (on ? (removed.includes(rank++) ? 2 : 1) : 0))
	);
	const turned = transformGrid(marked, spec.turn, spec.mirror);
	const rows = turned.flatMap((row, r) => (row.includes(1) ? [r] : []));
	const cols = turned[0].flatMap((_, c) => (turned.some((row) => row[c] === 1) ? [c] : []));
	const [top, bottom] = [rows[0], rows[rows.length - 1]];
	const [left, right] = [cols[0], cols[cols.length - 1]];
	const margin = removed.length;
	// Les faces retirées, à au plus `margin` cases des données, restent dans le cadre
	return Array.from({ length: bottom - top + 1 + 2 * margin }, (_, r) =>
		Array.from(
			{ length: right - left + 1 + 2 * margin },
			(_, c): CompleterCell => turned[r + top - margin]?.[c + left - margin] ?? 0
		)
	);
}

/** Réponse de la case pour ce quadrillage ; '' quand aucune face n'est posée */
export function completerAnswer(frame: readonly (readonly CompleterCell[])[]): string {
	if (!frame.some((row) => row.includes(2))) return '';
	return frame.map((row) => row.join('')).join('/');
}

/** Quadrillage d'une réponse ; null si illisible ou vide */
export function readCompleterAnswer(answer: string): CompleterCell[][] | null {
	const text = answer.trim();
	if (text === '') return null;
	const rows = text.split('/').map((row) => row.trim());
	if (rows.some((row) => !COMPLETER_ROW_REGEX.test(row))) return null;
	if (rows.some((row) => row.length !== rows[0].length)) return null;
	return rows.map((row) => [...row].map((cell) => Number(cell) as CompleterCell));
}

/** Le quadrillage de départ : les faces données seules (sans les faces retirées) */
export function givenFrame(expected: readonly (readonly CompleterCell[])[]): CompleterCell[][] {
	return expected.map((row) => row.map((cell): CompleterCell => (cell === 1 ? 1 : 0)));
}

/** Les cases vides qui touchent une face (donnée ou posée) par un côté */
export function completerSpots(frame: readonly (readonly CompleterCell[])[]): [number, number][] {
	const on = (r: number, c: number) => (frame[r]?.[c] ?? 0) !== 0;
	return frame.flatMap((row, r) =>
		row.flatMap((cell, c): [number, number][] =>
			cell === 0 && (on(r - 1, c) || on(r + 1, c) || on(r, c - 1) || on(r, c + 1)) ? [[r, c]] : []
		)
	);
}

/** Ces cases se plient-elles en cube ? (Le pliage suppose des cases qui se touchent) */
export function cubeCellsFold(cells: boolean[][]): boolean {
	if (!gridIsConnected(cells)) return false;
	const net = patronNet({
		kind: 'patron',
		solid: 'cube',
		dims: [1],
		dimsWritten: false,
		cells,
		layout: 1,
		faux: false,
		turn: 0,
		mirror: false,
		bottom: 0,
		names: null,
		numbers: false,
		marks: [],
		cotes: null
	});
	return net.notFolding === null;
}

const foldsOf = (frame: readonly (readonly CompleterCell[])[]) =>
	cubeCellsFold(frame.map((row) => row.map((cell) => cell !== 0)));

const count = (frame: readonly (readonly CompleterCell[])[], value: CompleterCell) =>
	frame.flat().filter((cell) => cell === value).length;

/** La réponse a-t-elle les faces données, et autant de faces posées que de retirées ? */
function sameFrame(answer: CompleterCell[][], wanted: CompleterCell[][]): boolean {
	if (answer.length !== wanted.length || answer[0].length !== wanted[0].length) return false;
	return answer.every((row, r) => row.every((cell, c) => (cell === 1) === (wanted[r][c] === 1)));
}

/** Les 6 faces de l'élève (données et posées) se plient-elles en cube ? */
export function isCompleterCorrect(answer: string, expected: string): boolean {
	const placed = readCompleterAnswer(answer);
	const wanted = readCompleterAnswer(expected);
	if (placed === null || wanted === null || !sameFrame(placed, wanted)) return false;
	return count(placed, 2) === count(wanted, 2) && foldsOf(placed);
}

/** Les phrases de la correction, pour une pose fausse */
export function completerMistakes(answer: string, expected: string): string[] {
	const wanted = readCompleterAnswer(expected);
	if (wanted === null) return [];
	const placed = readCompleterAnswer(answer);
	if (placed === null) return [NOTHING_PLACED];
	const missing = count(wanted, 2) - (sameFrame(placed, wanted) ? count(placed, 2) : 0);
	if (missing > 0) {
		return [missing === 1 ? 'Il manque encore une face.' : `Il manque encore ${missing} faces.`];
	}
	return [NOT_FOLDING];
}

/** Une autre pose que celle du prof se plie-t-elle en cube ? */
export function completerHasOtherSolutions(expected: string): boolean {
	const wanted = readCompleterAnswer(expected);
	if (wanted === null) return false;
	const toPlace = count(wanted, 2);
	const key = (frame: CompleterCell[][]) => completerAnswer(frame);
	const teacher = key(wanted);
	const seen = new Set<string>();
	const search = (frame: CompleterCell[][], left: number): boolean => {
		const k = key(frame);
		if (seen.has(k)) return false;
		seen.add(k);
		if (left === 0) return k !== teacher && foldsOf(frame);
		return completerSpots(frame).some(([r, c]) => {
			const next = frame.map((row) => [...row]);
			next[r][c] = 2;
			return search(next, left - 1);
		});
	};
	return search(givenFrame(wanted), toPlace);
}

// Functions — les deux gestes

/** Réponse attendue d'un patron à geste */
export function expectedPatronAnswer(spec: PatronSpec): string {
	const task = spec.task;
	if (task === undefined) return '';
	if (task.kind === 'designer') return facesAnswer(task.faces);
	return completerAnswer(completerFrame(spec, task.removed));
}

/** Jugement d'un patron à geste : le genre se lit sur la réponse attendue */
export function isPatronAnswerCorrect(answer: string, expected: string): boolean {
	return expected.includes('/')
		? isCompleterCorrect(answer, expected)
		: isDesignerCorrect(answer, expected);
}
