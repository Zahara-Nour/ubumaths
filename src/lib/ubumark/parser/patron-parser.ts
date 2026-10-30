/**
 * Bloc ```patron (nœud `espace`, genre `patron`) — analyse du texte
 * ==================================================================
 *
 * ```patron
 * solide: pave 4 2 3
 * forme: 7
 * sommets: A B C D E ? G H
 * faces: numeros
 * marquer: face 3, sommet A
 * cotes: cm
 * ```
 *
 * - `solide:` (obligatoire) : les mots et dimensions de ```solide (`cube` peut
 *   se passer de dimension), sans le cône ni la boule.
 * - `forme:` : cube, pavé → `1` à `11` (catalogue) ou `faux 1` à `faux 8` ; cube →
 *   aussi une grille en retrait sous la clé (`X` une face, `.` vide), qui doit se
 *   plier en cube, ou ne pas s'y plier avec `faux: oui`. Prisme : `1` ou `2` ;
 *   pyramide, cylindre : `1`. Défaut `1`.
 * - `tourner: 90 | 180 | 270`, `retourner: oui` : le même patron autrement posé.
 * - `dessous: N` (cube, pavé) : la face N (ordre de lecture) devient ABCD.
 * - `sommets:` : les noms des sommets du SOLIDE (ordre de ```solide), `-` sans
 *   nom, `?` (une fois) : à trouver.
 * - `faces: numeros`, `marquer: face 3 | face dessus | sommet A`, `cotes:`.
 *
 * Chantier `solides`, lot 4 (§ 9 du journal), ADR 0034.
 *
 * @module ubumark/parser/patron-parser
 */

import {
	PATRON_GRID_LIMITS,
	PATRON_KEYS,
	PATRON_TURNS,
	SOLIDE_UNITS,
	type PatronMark,
	type PatronSolid,
	type PatronSpec,
	type PatronTurn
} from '../types/espace';
import { SOLIDE_PLACES, solideTopology, type SolidePlace } from '../utils/espace-solides';
import {
	CUBE_NETS,
	FALSE_CUBE_NETS,
	PATRON_LAYOUTS,
	gridIsConnected,
	gridOf,
	patronNet,
	trimGrid
} from '../utils/espace-patrons';
import { readForm } from './solide-parser';

// ============================================================================
// CONSTANTES
// ============================================================================

/** `clé: valeur` */
const KEY_LINE_REGEX = /^([A-Za-zÀ-ÿ]+)\s*:\s*(.*)$/;

const KEY_LIST = PATRON_KEYS.join(', ');

/** Un nom de sommet : une majuscule, puis des primes ou un nombre (A, A', O1) */
const NAME_REGEX = /^[A-Z](?:'+|\d+)?$/;

const SOLID_WORDS = ['cube', 'pave', 'prisme', 'pyramide', 'cylindre'];

const PLACE_LABELS: Record<SolidePlace, string> = {
	devant: 'face de devant',
	derriere: 'face de derrière',
	dessus: 'face du dessus',
	dessous: 'face du dessous',
	gauche: 'face de gauche',
	droite: 'face de droite'
};

// ============================================================================
// FONCTIONS
// ============================================================================

/** Retire les accents et les majuscules */
function plain(text: string): string {
	return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const isGridSolid = (solid: PatronSolid) => solid === 'cube' || solid === 'pave';

/** Le solide et ses dimensions ; une phrase d'erreur sinon */
function readSolid(
	value: string
): { solid: PatronSolid; dims: number[]; written: boolean } | string {
	const first = plain(value.split(/\s+/)[0] ?? '');
	if (first === 'cone' || first === 'boule') {
		return `${first === 'cone' ? 'le cône' : 'la boule'} n’a pas de patron dans ce bloc (solides possibles : ${SOLID_WORDS.join(', ')})`;
	}
	if (!SOLID_WORDS.includes(first)) {
		return `solide « ${value.split(/\s+/)[0] ?? ''} » inconnu (solides possibles : ${SOLID_WORDS.join(', ')})`;
	}
	if (plain(value.trim()) === 'cube') return { solid: 'cube', dims: [1], written: false };
	const shape = readForm(value);
	if (typeof shape === 'string') return shape.replace('(forme: ', '(solide: ');
	return { solid: shape.form as PatronSolid, dims: shape.dims, written: true };
}

/** Une grille écrite en X et . ; une phrase d'erreur sinon */
function readGrid(rows: string[]): boolean[][] | string {
	const cells: boolean[][] = [];
	for (const row of rows) {
		const bare = row.replace(/\s+/g, '');
		const bad = [...bare].find((ch) => !'Xx.'.includes(ch));
		if (bad !== undefined) {
			return `« ${bad} » : une grille s’écrit avec X (une face) et . (une case vide)`;
		}
		cells.push([...bare].map((ch) => ch !== '.'));
	}
	const grid = trimGrid(cells);
	const count = grid.flat().filter(Boolean).length;
	const { rows: maxRows, cols: maxCols, cells: maxCells } = PATRON_GRID_LIMITS;
	if (count === 0) return 'grille vide (aucun X)';
	if (grid.length > maxRows || grid[0].length > maxCols) {
		return `grille de ${grid.length} × ${grid[0].length} : au plus ${maxRows} rangées et ${maxCols} colonnes`;
	}
	if (count > maxCells) return `${count} cases : au plus ${maxCells}`;
	if (!gridIsConnected(grid))
		return 'les cases doivent se toucher, de proche en proche, par un côté';
	return grid;
}

/** Les noms de `sommets:` ; une phrase d'erreur sinon */
function readNames(value: string, solid: PatronSolid): (string | null)[] | string {
	const topology = solideTopology(solid);
	const items = value.split(/[\s,]+/).filter((w) => w !== '');
	const count = topology.vertexCount;
	if (items.length !== count) {
		const what = topology.curved ? `se nomme par ${count} points` : `a ${count} sommets`;
		return `${topology.indefinite} ${what} : ${count} noms attendus (- pour un sommet sans nom, ? pour celui à trouver)`;
	}
	const names: (string | null)[] = [];
	for (const item of items) {
		if (item === '-') {
			names.push(null);
			continue;
		}
		if (item !== '?' && !NAME_REGEX.test(item)) {
			return `« ${item} » : un nom de sommet est une majuscule, puis éventuellement ' ou un nombre (A, A', O1), ou ?`;
		}
		if (names.includes(item)) {
			return item === '?'
				? '? deux fois : un seul sommet à trouver par patron'
				: `« ${item} » deux fois : chaque sommet a son nom`;
		}
		names.push(item);
	}
	return names;
}

const sameSet = (a: number[], b: number[]) =>
	a.length === b.length && a.every((v) => b.includes(v));

/**
 * Analyser le texte d'un bloc ```patron (sans les clôtures).
 * Ligne 1 = première ligne après ```patron.
 */
export function parsePatronContent(source: string): {
	spec: PatronSpec | null;
	errors: string[];
} {
	const errors: string[] = [];
	const fail = (line: number, message: string) => errors.push(`Ligne ${line} : ${message}`);
	const seen = new Map<string, { line: number; value: string }>();
	const gridRows: string[] = [];
	/** Les lignes sans clé qui suivent `forme:` (sans valeur) sont des rangées */
	let inGrid = false;

	source.split('\n').forEach((line, index) => {
		const text = line.trim();
		if (text === '') return;
		const lineNo = index + 1;
		const match = KEY_LINE_REGEX.exec(text);
		if (!match) {
			if (inGrid) {
				gridRows.push(text);
				return;
			}
			fail(lineNo, `ligne « ${text} » non comprise (attendu : clé: valeur, ex. solide: cube)`);
			return;
		}
		inGrid = false;
		const key = plain(match[1]);
		if (!(PATRON_KEYS as readonly string[]).includes(key)) {
			fail(lineNo, `clé « ${match[1]} » inconnue (clés possibles : ${KEY_LIST})`);
			return;
		}
		const previous = seen.get(key);
		if (previous !== undefined) {
			fail(lineNo, `« ${key} » déjà donnée ligne ${previous.line}`);
			return;
		}
		seen.set(key, { line: lineNo, value: match[2].trim() });
		if (key === 'forme' && match[2].trim() === '') inGrid = true;
	});

	// Le solide
	const solidEntry = seen.get('solide');
	if (solidEntry === undefined) {
		fail(1, 'il manque le solide (ex. solide: cube, ou solide: pave 4 2 3)');
		return { spec: null, errors };
	}
	const shape = readSolid(solidEntry.value);
	if (typeof shape === 'string') {
		fail(solidEntry.line, shape);
		return { spec: null, errors };
	}
	const { solid, dims } = shape;
	const topology = solideTopology(solid);
	const gridSolid = isGridSolid(solid);

	// La disposition
	let cells: boolean[][] | null = gridSolid ? gridOf(CUBE_NETS[0]) : null;
	let layout = 1;
	let faux = false;
	let written = false;
	const formEntry = seen.get('forme');
	if (formEntry !== undefined) {
		const value = plain(formEntry.value);
		const fauxMatch = /^faux\s+(\d+)$/.exec(value);
		if (value === '') {
			if (solid !== 'cube') {
				fail(
					formEntry.line,
					`une grille ne dessine que le patron d’un cube (${topology.indefinite} : forme: 1 à ${PATRON_LAYOUTS[solid]})`
				);
			} else if (gridRows.length === 0) {
				fail(
					formEntry.line,
					'forme: quelle disposition ? (un numéro, faux N, ou une grille en retrait sous la clé)'
				);
			} else {
				const grid = readGrid(gridRows);
				if (typeof grid === 'string') fail(formEntry.line, grid);
				else {
					cells = grid;
					written = true;
				}
			}
		} else if (fauxMatch) {
			const n = Number(fauxMatch[1]);
			if (!gridSolid) {
				fail(formEntry.line, `faux patrons : seulement pour un cube ou un pavé`);
			} else if (n < 1 || n > FALSE_CUBE_NETS.length) {
				fail(formEntry.line, `faux ${n} : faux patrons de 1 à ${FALSE_CUBE_NETS.length}`);
			} else {
				cells = gridOf(FALSE_CUBE_NETS[n - 1]);
				faux = true;
			}
		} else if (
			/^\d+$/.test(value) &&
			Number(value) >= 1 &&
			Number(value) <= PATRON_LAYOUTS[solid]
		) {
			if (gridSolid) cells = gridOf(CUBE_NETS[Number(value) - 1]);
			else layout = Number(value);
		} else {
			const choices = gridSolid
				? `1 à ${CUBE_NETS.length}, faux 1 à faux ${FALSE_CUBE_NETS.length}${solid === 'cube' ? ', ou une grille' : ''}`
				: PATRON_LAYOUTS[solid] === 1
					? '1'
					: `1 à ${PATRON_LAYOUTS[solid]}`;
			fail(formEntry.line, `forme « ${formEntry.value} » inconnue (formes possibles : ${choices})`);
		}
	}

	const fauxEntry = seen.get('faux');
	if (fauxEntry !== undefined) {
		const value = plain(fauxEntry.value);
		if (value !== 'oui' && value !== 'non') {
			fail(fauxEntry.line, `faux « ${fauxEntry.value} » : oui ou non`);
		} else if (!written && value === 'oui') {
			fail(
				fauxEntry.line,
				'faux: sert à une grille écrite ; un faux patron du catalogue s’écrit forme: faux 3'
			);
		} else if (written) {
			faux = value === 'oui';
		}
	}

	let turn: PatronTurn = 0;
	const turnEntry = seen.get('tourner');
	if (turnEntry !== undefined) {
		const n = Number(turnEntry.value);
		if ((PATRON_TURNS as readonly number[]).includes(n) && turnEntry.value !== '')
			turn = n as PatronTurn;
		else
			fail(
				turnEntry.line,
				`tourner « ${turnEntry.value} » : ${PATRON_TURNS.join(', ')} (degrés, sens des aiguilles d’une montre)`
			);
	}

	let mirror = false;
	const mirrorEntry = seen.get('retourner');
	if (mirrorEntry !== undefined) {
		const value = plain(mirrorEntry.value);
		if (value === 'oui') mirror = true;
		else if (value !== 'non')
			fail(mirrorEntry.line, `retourner « ${mirrorEntry.value} » : oui ou non`);
	}

	const faceCount =
		cells !== null
			? cells.flat().filter(Boolean).length
			: solid === 'cylindre'
				? 3
				: topology.faces.length;

	let bottom = 0;
	const bottomEntry = seen.get('dessous');
	if (bottomEntry !== undefined) {
		const n = Number(bottomEntry.value);
		if (!gridSolid) {
			fail(bottomEntry.line, 'dessous: seulement pour un cube ou un pavé');
		} else if (!/^\d+$/.test(bottomEntry.value) || n < 1 || n > faceCount) {
			fail(
				bottomEntry.line,
				`dessous « ${bottomEntry.value} » : un numéro de face, de 1 à ${faceCount}`
			);
		} else {
			bottom = n - 1;
		}
	}

	let names: (string | null)[] | null = null;
	const namesEntry = seen.get('sommets');
	if (namesEntry !== undefined) {
		const read = readNames(namesEntry.value, solid);
		if (typeof read === 'string') fail(namesEntry.line, read);
		else names = read;
	}
	// Un faux patron ne se plie pas : deux sommets y tombent au même coin (« F/A »),
	// ce qui donnerait la réponse de « est-ce un patron ? »
	if (namesEntry !== undefined && faux) {
		fail(
			namesEntry.line,
			'un faux patron ne se plie pas : ses coins ne se nomment pas (retire sommets:)'
		);
	}

	let numbers = false;
	const facesEntry = seen.get('faces');
	if (facesEntry !== undefined) {
		const value = plain(facesEntry.value);
		if (value === 'numeros') numbers = true;
		else if (value !== 'non')
			fail(facesEntry.line, `faces « ${facesEntry.value} » : numeros ou non`);
	}

	let cotes: PatronSpec['cotes'] = null;
	const cotesEntry = seen.get('cotes');
	if (cotesEntry !== undefined) {
		const value = plain(cotesEntry.value);
		if ((SOLIDE_UNITS as readonly string[]).includes(value)) {
			cotes = { unit: value as (typeof SOLIDE_UNITS)[number] };
		} else if (value === 'oui') {
			cotes = { unit: '' };
		} else if (value !== 'non') {
			fail(
				cotesEntry.line,
				`cotes « ${cotesEntry.value} » : valeurs possibles ${SOLIDE_UNITS.join(', ')}, oui, non`
			);
		}
		if (cotes !== null && !shape.written) {
			fail(cotesEntry.line, 'écris le côté du cube (solide: cube 3) pour écrire les cotes');
		}
	}

	if (errors.length > 0) return { spec: null, errors };

	const spec: PatronSpec = {
		kind: 'patron',
		solid,
		dims,
		dimsWritten: shape.written,
		cells,
		layout,
		faux,
		turn,
		mirror,
		bottom,
		names,
		numbers,
		marks: [],
		cotes
	};

	// Le pliage : ce que la grille annonce, et des faces qui ne se chevauchent pas
	const net = patronNet(spec);
	const formLine = formEntry?.line ?? solidEntry.line;
	if (written && !faux && net.notFolding !== null) {
		fail(
			formLine,
			`cette grille ne se plie pas en cube : ${net.notFolding} (faux: oui pour un faux patron)`
		);
	} else if (written && faux && net.notFolding === null) {
		fail(formLine, 'cette grille est un vrai patron du cube (retire faux: oui)');
	} else if (net.overlap !== null) {
		const [i, j] = net.overlap;
		fail(
			formLine,
			`les faces ${i + 1} et ${j + 1} se chevauchent sur le dessin (choisis une autre forme ou d’autres dimensions)`
		);
	}

	const marksEntry = seen.get('marquer');
	if (marksEntry !== undefined) {
		for (const item of marksEntry.value.split(',').filter((i) => i.trim() !== '')) {
			const mark = readMark(
				item,
				spec,
				net.faces.map((f) => f.solidFace)
			);
			if (typeof mark === 'string') fail(marksEntry.line, mark);
			else spec.marks.push(mark);
		}
	}

	if (errors.length > 0) return { spec: null, errors };
	return { spec, errors };
}

/** Une marque de `marquer:` ; une phrase d'erreur sinon */
function readMark(
	item: string,
	spec: PatronSpec,
	solidFaces: (number | null)[]
): PatronMark | string {
	const match = /^(\S+)\s*(.*)$/.exec(item.trim());
	const kind = plain(match?.[1] ?? '');
	const what = (match?.[2] ?? '').trim();
	const topology = solideTopology(spec.solid);
	if (!['face', 'sommet'].includes(kind) || what === '') {
		return `marquer « ${item.trim()} » non compris (ex. face 3, face dessus, sommet A)`;
	}
	if (kind === 'sommet') {
		if (spec.names === null) return `nomme les sommets (sommets:) pour marquer le sommet ${what}`;
		const vertex = spec.names.indexOf(what);
		if (vertex < 0 || what === '?') return `aucun sommet ne s’appelle ${what}`;
		return { kind: 'sommet', vertex, label: `sommet ${what}` };
	}
	if (/^\d+$/.test(what)) {
		const n = Number(what);
		if (n < 1 || n > solidFaces.length)
			return `face ${what} : le patron a ${solidFaces.length} faces, numérotées de 1 à ${solidFaces.length}`;
		return { kind: 'face', faces: [n - 1], label: `face ${n}` };
	}
	const place = plain(what);
	if (!(SOLIDE_PLACES as readonly string[]).includes(place)) {
		return `face « ${what} » : un numéro (face 3) ou une place (${SOLIDE_PLACES.join(', ')})`;
	}
	const vertices = topology.places[place as SolidePlace];
	if (vertices === undefined) {
		return `${topology.indefinite} n’a pas de ${PLACE_LABELS[place as SolidePlace]} (désigne-la par son numéro)`;
	}
	const solidFace = topology.faces.findIndex((f) => sameSet(f, vertices));
	const faces = solidFaces.flatMap((f, i) => (f === solidFace ? [i] : []));
	// Un faux patron : une place peut tomber sur deux cases, ou aucune (réponse donnée)
	if (spec.faux) return 'un faux patron ne se plie pas : désigne la face par son numéro (face 3)';
	if (faces.length === 0) return `aucune case ne devient la ${PLACE_LABELS[place as SolidePlace]}`;
	// Lue par son numéro : sa place une fois pliée est souvent la question
	return { kind: 'face', faces, label: `face ${faces[0] + 1}` };
}
