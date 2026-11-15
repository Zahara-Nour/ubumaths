/**
 * Bloc ```robot — parseur
 * =======================
 *
 * ```robot
 * quadrillage: 8 x 5
 * codage: avance-pivote
 * départ: 2, 1, droite
 * arrivée: 6, 4
 * interdites: 4, 1 ; 4, 2
 * produire: oui
 * ```
 *
 * - `quadrillage: C x L` (obligatoire) : colonnes et lignes, 2 à 12.
 * - `codage: flèches | avance-pivote` (défaut `flèches`).
 * - `départ: col, ligne` (obligatoire), (1, 1) = case en bas à gauche ; en avance-pivote, le
 *   sens du robot en plus : `départ: 2, 1, droite` (haut, droite, bas, gauche).
 * - `arrivée: col, ligne` : la case verte (obligatoire avec `produire: oui`).
 * - `interdites: c, l ; c, l` : cases grises.
 * - `produire: oui | non` (défaut `non`) : une question, l'élève compose le code. Il faut
 *   alors un code de 15 instructions et 4 virages au plus jusqu'à l'arrivée (BO du CE1) ;
 *   sinon le bloc est en erreur (le générateur refait le tirage).
 * - `case: N` : posée par le générateur (question seulement).
 *
 * @module ubumark/parser/robot-parser
 */

import { unnestedLine } from './nested-line';
import { specialBlockEnd } from './unclosed-block';
import { plusCourtCode } from '../utils/robot-moteur';
import {
	CODAGES,
	ROBOT_MAX_COTE,
	ROBOT_MAX_INSTRUCTIONS,
	ROBOT_MAX_VIRAGES,
	ROBOT_MIN_COTE,
	SENS,
	type Case,
	type Codage,
	type RobotBlockRange,
	type RobotIssue,
	type RobotNode,
	type Sens
} from '../types/robot';

// ============================================================================
// CONSTANTES
// ============================================================================

const ROBOT_BLOCK_START_REGEX = /^```robot\s*$/;
const BLOCK_END_REGEX = /^```\s*$/;

/** `clé: valeur` */
const KEY_LINE_REGEX = /^([A-Za-zÀ-ÿ]+)\s*:\s*(.*)$/;

/** `produire: oui`, la ligne qui fait d'un bloc une question */
const PRODUIRE_OUI = /^produire\s*:\s*oui\s*$/i;

type Key = 'quadrillage' | 'codage' | 'départ' | 'arrivée' | 'interdites' | 'produire' | 'case';

const KEY_NAMES: Key[] = [
	'quadrillage',
	'codage',
	'départ',
	'arrivée',
	'interdites',
	'produire',
	'case'
];

/** Les clés du bloc, sans accent comprises : une ligne qui commence par l'une d'elles n'est
 * jamais du texte (Q66) */
const BLOCK_KEYS: readonly string[] = [...KEY_NAMES, 'depart', 'arrivee'];

const ENTIER = /^\d+$/;

// ============================================================================
// DÉTECTION
// ============================================================================

export function isRobotBlockStart(line: string): boolean {
	return ROBOT_BLOCK_START_REGEX.test(line);
}

/**
 * Blocs ```robot d'une liste de lignes (indices inclusifs, clôtures comprises). Fermé par un
 * ``` qui ne fait pas lire du texte comme contenu (Q66), sinon jusqu'à la première ligne vide.
 */
export function findRobotBlocks(lines: string[]): RobotBlockRange[] {
	const blocks: RobotBlockRange[] = [];
	let i = 0;
	while (i < lines.length) {
		if (isRobotBlockStart(lines[i])) {
			const { endIndex } = specialBlockEnd(
				lines,
				i,
				(line) => BLOCK_END_REGEX.test(line),
				BLOCK_KEYS
			);
			blocks.push({ startIndex: i, endIndex });
			i = endIndex;
		}
		i++;
	}
	return blocks;
}

/**
 * Les blocs ```robot à produire d'un énoncé (`produire: oui`, une case chacun), délimités
 * comme le parseur : corps sans clôtures, fermeture, et `nested` pour un bloc en retrait ou
 * cité (l'élève ne pourrait pas y répondre : sa case n'est pas créée)
 */
export function findRobotsToProduce(markdown: string): {
	startIndex: number;
	body: string[];
	closed: boolean;
	nested: boolean;
}[] {
	const lines = markdown.split('\n');
	const plain = lines.map(unnestedLine);
	const found: { startIndex: number; body: string[]; closed: boolean; nested: boolean }[] = [];
	let i = 0;
	while (i < plain.length) {
		if (isRobotBlockStart(plain[i])) {
			const { endIndex, closed } = specialBlockEnd(
				plain,
				i,
				(line) => BLOCK_END_REGEX.test(line),
				BLOCK_KEYS
			);
			const body = plain.slice(i + 1, closed ? endIndex : endIndex + 1);
			if (body.some((line) => PRODUIRE_OUI.test(line.trim()))) {
				found.push({ startIndex: i, body, closed, nested: lines[i] !== plain[i] });
			}
			i = endIndex;
		}
		i++;
	}
	return found;
}

/** L'énoncé a-t-il un code de robot à produire ? */
export function hasRobotToProduce(markdown: string): boolean {
	return findRobotsToProduce(markdown).length > 0;
}

// ============================================================================
// ANALYSE
// ============================================================================

/** Erreur d'une ligne, levée par les lecteurs de valeur */
class LineError extends Error {}

function normalizeKey(raw: string): Key | null {
	const lower = raw.toLowerCase();
	if (lower === 'depart') return 'départ';
	if (lower === 'arrivee') return 'arrivée';
	return KEY_NAMES.find((k) => k === lower) ?? null;
}

function lireCase(texte: string, key: string): Case {
	const parts = texte.split(',').map((p) => p.trim());
	if (parts.length !== 2 || !parts.every((p) => ENTIER.test(p))) {
		throw new LineError(`${key} « ${texte.trim()} » : écris colonne, ligne (ex. 2, 1)`);
	}
	return { col: Number(parts[0]), ligne: Number(parts[1]) };
}

function lireCodage(value: string): Codage {
	const v = value.trim().toLowerCase();
	if (v === 'fleches') return 'flèches';
	const found = CODAGES.find((c) => c === v);
	if (found === undefined) {
		throw new LineError(`codage « ${value} » : choisis ${CODAGES.join(' ou ')}`);
	}
	return found;
}

const caseTexte = (c: Case) => `${c.col}, ${c.ligne}`;
const memeCase = (a: Case, b: Case) => a.col === b.col && a.ligne === b.ligne;

/**
 * Analyser le texte d'un bloc (sans les clôtures).
 * Ligne 1 = première ligne après ```robot.
 */
export function parseRobotContent(source: string): RobotNode {
	const lines = source.split('\n');
	const errors: RobotIssue[] = [];
	const fail = (line: number, message: string) =>
		errors.push({ message: `Ligne ${line} : ${message}`, line });

	let colonnes = 0;
	let lignes = 0;
	let codage = 'flèches' as Codage;
	let depart: Case | null = null;
	let departTexte = '';
	let arrivee = null as Case | null;
	let interdites: Case[] = [];
	let produire = false as boolean;
	let caseIndex: number | undefined;
	const seen = new Map<Key, number>();

	lines.forEach((line, index) => {
		const text = line.trim();
		if (text === '') return;
		const lineNo = index + 1;
		const match = KEY_LINE_REGEX.exec(text);
		if (!match) {
			fail(
				lineNo,
				`ligne « ${text} » non comprise (attendu : clé: valeur, ex. quadrillage: 8 x 5)`
			);
			return;
		}
		const key = normalizeKey(match[1]);
		const value = match[2].trim();
		if (key === null) {
			fail(
				lineNo,
				`clé « ${match[1]} » inconnue (clés possibles : quadrillage, codage, départ, arrivée, interdites, produire)`
			);
			return;
		}
		const previous = seen.get(key);
		if (previous !== undefined) {
			fail(lineNo, `« ${key} » déjà donnée ligne ${previous}`);
			return;
		}
		seen.set(key, lineNo);

		try {
			switch (key) {
				case 'quadrillage': {
					const m = /^(\d+)\s*[x×]\s*(\d+)$/i.exec(value);
					if (!m)
						throw new LineError(`quadrillage « ${value} » : écris colonnes x lignes (ex. 8 x 5)`);
					colonnes = Number(m[1]);
					lignes = Number(m[2]);
					const bornes = (n: number) => n >= ROBOT_MIN_COTE && n <= ROBOT_MAX_COTE;
					if (!bornes(colonnes) || !bornes(lignes)) {
						throw new LineError(
							`quadrillage « ${value} » : de ${ROBOT_MIN_COTE} à ${ROBOT_MAX_COTE} colonnes et lignes`
						);
					}
					break;
				}
				case 'codage':
					codage = lireCodage(value);
					break;
				case 'départ':
					departTexte = value;
					break;
				case 'arrivée':
					arrivee = lireCase(value, 'arrivée');
					break;
				case 'interdites':
					interdites = value
						.split(';')
						.filter((c) => c.trim() !== '')
						.map((c) => lireCase(c, 'interdites'));
					break;
				case 'produire': {
					const v = value.toLowerCase();
					if (v !== 'oui' && v !== 'non') {
						throw new LineError(`produire « ${value} » : choisis oui ou non`);
					}
					produire = v === 'oui';
					break;
				}
				case 'case':
					if (!ENTIER.test(value)) throw new LineError(`case « ${value} » : numéro de case entier`);
					caseIndex = Number(value);
					break;
			}
		} catch (e) {
			if (!(e instanceof LineError)) throw e;
			fail(lineNo, e.message);
		}
	});

	// Départ : lu après le codage (le sens n'existe qu'en avance-pivote)
	let sens: Sens | null = null;
	const ligneDepart = seen.get('départ');
	if (ligneDepart === undefined) {
		fail(1, 'il manque la ligne départ: (ex. départ: 2, 1)');
	} else {
		try {
			const parts = departTexte.split(',').map((p) => p.trim());
			if (codage === 'avance-pivote') {
				if (parts.length !== 3) {
					throw new LineError(
						`départ « ${departTexte} » : en avance-pivote, écris aussi le sens du robot (ex. 2, 1, droite)`
					);
				}
				const s = SENS.find((x) => x === parts[2].toLowerCase());
				if (s === undefined) {
					throw new LineError(`départ : sens « ${parts[2]} » inconnu (${SENS.join(', ')})`);
				}
				sens = s;
			} else if (parts.length === 3) {
				throw new LineError(
					`départ « ${departTexte} » : le sens ne sert qu'en codage: avance-pivote`
				);
			}
			depart = lireCase(parts.slice(0, 2).join(','), 'départ');
		} catch (e) {
			if (!(e instanceof LineError)) throw e;
			fail(ligneDepart, e.message);
		}
	}
	if (!seen.has('quadrillage')) fail(1, 'il manque la ligne quadrillage: (ex. quadrillage: 8 x 5)');
	if (produire && !seen.has('arrivée')) {
		fail(seen.get('produire') ?? 1, 'produire: oui demande une arrivée: (la case verte)');
	}
	if (!produire && caseIndex !== undefined) {
		fail(seen.get('case') ?? 1, 'case: seulement avec produire: oui');
	}

	const withCase = caseIndex === undefined ? {} : { caseIndex };
	if (errors.length > 0 || depart === null) {
		return { type: 'robot', source, spec: null, errors, ...withCase };
	}

	// Cases dans le quadrillage, départ et arrivée libres
	const dedans = (c: Case) => c.col >= 1 && c.col <= colonnes && c.ligne >= 1 && c.ligne <= lignes;
	const placees: [Case, Key, string][] = [
		[depart, 'départ', 'départ'],
		...(arrivee ? [[arrivee, 'arrivée', 'arrivée'] as [Case, Key, string]] : []),
		...interdites.map((c) => [c, 'interdites', 'case grise'] as [Case, Key, string])
	];
	for (const [c, key, nom] of placees) {
		if (!dedans(c)) {
			fail(
				seen.get(key) ?? 1,
				`${nom} (${caseTexte(c)}) hors du quadrillage ${colonnes} x ${lignes}`
			);
		}
	}
	const sur = (c: Case) => interdites.some((g) => memeCase(g, c));
	if (sur(depart)) fail(seen.get('interdites') ?? 1, 'le départ est sur une case grise');
	if (arrivee && sur(arrivee))
		fail(seen.get('interdites') ?? 1, 'l’arrivée est sur une case grise');
	if (arrivee && memeCase(arrivee, depart))
		fail(seen.get('arrivée') ?? 1, 'l’arrivée est le départ');
	if (errors.length > 0) return { type: 'robot', source, spec: null, errors, ...withCase };

	const scene = { colonnes, lignes, codage, depart, sens, arrivee, interdites };
	let solution = null;
	if (produire) {
		solution = plusCourtCode(scene);
		if (solution === null) {
			fail(
				seen.get('arrivée') ?? 1,
				`aucun code de ${ROBOT_MAX_INSTRUCTIONS} instructions et ${ROBOT_MAX_VIRAGES} virages au plus ne mène à l’arrivée`
			);
			return { type: 'robot', source, spec: null, errors, ...withCase };
		}
	}
	return { type: 'robot', source, spec: { ...scene, produire, solution }, errors, ...withCase };
}

/**
 * Analyser un bloc repéré dans les lignes d'un document : `end` EXCLU, la fence de fin pour un
 * bloc fermé, la ligne qui suit le bloc sinon.
 */
export function parseRobot(lines: string[], startIndex: number, end: number): { node: RobotNode } {
	const body = lines.slice(startIndex + 1, end);
	const node = parseRobotContent(body.join('\n'));
	const closed = end > startIndex && BLOCK_END_REGEX.test(lines[end] ?? '');
	if (closed) return { node };
	return {
		node: {
			...node,
			spec: null,
			errors: [
				...node.errors,
				{
					message: `Ligne ${body.length + 1} : bloc non fermé (\`\`\` manquant après la dernière ligne)`,
					line: body.length + 1
				}
			]
		}
	};
}
