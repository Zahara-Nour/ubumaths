/**
 * Bloc ```yohaku — parseur
 * ========================
 *
 * ```yohaku
 * opération: produit
 * ligne: [x+2] | [x+3]
 * ligne: [2x+1] | x+1
 * ```
 *
 * - `opération:` (obligatoire) : `somme` ou `produit`.
 * - `ligne:` (deux fois, obligatoire) : deux cases séparées par `|`, en syntaxe maison ; une
 *   case entre crochets est à remplir par l'élève. L'auteur écrit une solution ; le bloc
 *   calcule les totaux des lignes et des colonnes.
 * - `solution: oui | non` (défaut `non`) : la solution montrée dans les cases (corrigé
 *   imprimé, cours).
 * - `case: N` : posée par le générateur (question seulement).
 * - Énoncé masqué d'une évaluation notée (`maskGestureAnswers`) : les cases à remplir deviennent
 *   `[?]` et les totaux sont écrits (`totaux: L1 ; L2 | C1 ; C2`), la solution ne part pas au
 *   navigateur. `totaux:` seulement avec des cases `[?]`.
 *
 * Un bloc qui a une case à remplir est une question (une case de réponse).
 *
 * @module ubumark/parser/yohaku-parser
 */

import { unnestedLine } from './nested-line';
import { specialBlockEnd } from './unclosed-block';
import { lireCase, total, type CaseLue } from '../utils/yohaku-moteur';
import {
	YOHAKU_TAILLE,
	type YohakuBlockRange,
	type YohakuCase,
	type YohakuIssue,
	type YohakuNode,
	type YohakuOperation
} from '../types/yohaku';
import type { MathNode } from '#lib/mathAST/types.ts';

// ============================================================================
// CONSTANTES
// ============================================================================

const YOHAKU_BLOCK_START_REGEX = /^```yohaku\s*$/;
const BLOCK_END_REGEX = /^```\s*$/;

/** `clé: valeur` */
const KEY_LINE_REGEX = /^([A-Za-zÀ-ÿ]+)\s*:\s*(.*)$/;

/** Une case à remplir : `[x+2]` */
const A_REMPLIR = /^\[(.*)\]$/;

type Key = 'opération' | 'ligne' | 'solution' | 'case' | 'totaux';

const KEY_NAMES: Key[] = ['opération', 'ligne', 'solution', 'case', 'totaux'];

/** Case masquée de l'énoncé d'une évaluation : `[?]` */
export const YOHAKU_MASQUEE = '?';

/** Les clés du bloc, sans accent comprises : une ligne qui commence par l'une d'elles n'est
 * jamais du texte (Q66) */
const BLOCK_KEYS: readonly string[] = [...KEY_NAMES, 'operation'];

const ENTIER = /^\d+$/;

// ============================================================================
// DÉTECTION
// ============================================================================

export function isYohakuBlockStart(line: string): boolean {
	return YOHAKU_BLOCK_START_REGEX.test(line);
}

/**
 * Blocs ```yohaku d'une liste de lignes (indices inclusifs, clôtures comprises). Fermé par un
 * ``` qui ne fait pas lire du texte comme contenu (Q66), sinon jusqu'à la première ligne vide.
 */
export function findYohakuBlocks(lines: string[]): YohakuBlockRange[] {
	const blocks: YohakuBlockRange[] = [];
	let i = 0;
	while (i < lines.length) {
		if (isYohakuBlockStart(lines[i])) {
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

/** Une ligne `ligne:` qui a une case entre crochets */
function aUneCaseARemplir(line: string): boolean {
	const m = KEY_LINE_REGEX.exec(line.trim());
	if (!m || m[1].toLowerCase() !== 'ligne') return false;
	return m[2].split('|').some((c) => A_REMPLIR.test(c.trim()));
}

/**
 * Les grilles à remplir d'un énoncé (une case de réponse chacune), délimitées comme le
 * parseur : corps sans clôtures, fermeture, et `nested` pour un bloc en retrait ou cité
 * (l'élève ne pourrait pas y répondre : sa case n'est pas créée)
 */
export function findYohakusARemplir(markdown: string): {
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
		if (isYohakuBlockStart(plain[i])) {
			const { endIndex, closed } = specialBlockEnd(
				plain,
				i,
				(line) => BLOCK_END_REGEX.test(line),
				BLOCK_KEYS
			);
			const body = plain.slice(i + 1, closed ? endIndex : endIndex + 1);
			if (body.some(aUneCaseARemplir)) {
				found.push({ startIndex: i, body, closed, nested: lines[i] !== plain[i] });
			}
			i = endIndex;
		}
		i++;
	}
	return found;
}

/** L'énoncé a-t-il une grille à remplir ? */
export function hasYohakuARemplir(markdown: string): boolean {
	return findYohakusARemplir(markdown).length > 0;
}

// ============================================================================
// ANALYSE
// ============================================================================

/** Erreur d'une ligne, levée par les lecteurs de valeur */
class LineError extends Error {}

function normalizeKey(raw: string): Key | null {
	const lower = raw.toLowerCase();
	if (lower === 'operation') return 'opération';
	return KEY_NAMES.find((k) => k === lower) ?? null;
}

function lireOuiNon(value: string, key: string): boolean {
	const v = value.toLowerCase();
	if (v !== 'oui' && v !== 'non') throw new LineError(`${key} « ${value} » : choisis oui ou non`);
	return v === 'oui';
}

/** Une ligne de la grille : ses cases lues, avec leur formule */
function lireLigne(value: string): { cases: YohakuCase[]; nodes: (MathNode | null)[] } {
	const morceaux = value.split('|').map((c) => c.trim());
	if (morceaux.length !== YOHAKU_TAILLE) {
		throw new LineError(
			`ligne « ${value} » : ${YOHAKU_TAILLE} cases séparées par | (ex. ligne: [x+2] | x+3) ; pas de valeur absolue |x| dans une case`
		);
	}
	const cases: YohakuCase[] = [];
	const nodes: (MathNode | null)[] = [];
	for (const morceau of morceaux) {
		const crochets = A_REMPLIR.exec(morceau);
		const texte = crochets ? crochets[1] : morceau;
		if (texte.trim() === '') throw new LineError(`case vide dans « ${value} » : écris sa solution`);
		if (crochets && texte.trim() === YOHAKU_MASQUEE) {
			cases.push({ source: '', latex: '', aRemplir: true });
			nodes.push(null);
			continue;
		}
		const lue = lireCase(texte);
		if (lue === 'relation') {
			throw new LineError(`case « ${texte.trim()} » : une expression, pas une égalité`);
		}
		if (lue === 'illisible') {
			throw new LineError(`case « ${texte.trim()} » illisible (ex. 2x+1, 2,5, 1/2)`);
		}
		cases.push({ source: lue.source, latex: lue.latex, aRemplir: crochets !== null });
		nodes.push(lue.node);
	}
	return { cases, nodes };
}

/** `totaux: L1 ; L2 | C1 ; C2` (énoncé masqué) : les totaux des lignes puis des colonnes */
function lireTotaux(value: string): { lignes: CaseLue[]; colonnes: CaseLue[] } {
	const groupes = value.split('|').map((g) => g.split(';').map((t) => t.trim()));
	if (groupes.length !== 2 || groupes.some((g) => g.length !== YOHAKU_TAILLE)) {
		throw new LineError(`totaux « ${value} » : écris L1 ; L2 | C1 ; C2`);
	}
	const [lignes, colonnes] = groupes.map((g) =>
		g.map((t) => {
			const lu = lireCase(t);
			if (typeof lu === 'string') throw new LineError(`total « ${t} » illisible`);
			return lu;
		})
	);
	return { lignes, colonnes };
}

/** La ligne `totaux:` d'une grille (énoncé masqué) */
export function totauxEcrits(lignes: readonly string[], colonnes: readonly string[]): string {
	return `${lignes.join(' ; ')} | ${colonnes.join(' ; ')}`;
}

/**
 * Analyser le texte d'un bloc (sans les clôtures).
 * Ligne 1 = première ligne après ```yohaku.
 */
export function parseYohakuContent(source: string): YohakuNode {
	const lines = source.split('\n');
	const errors: YohakuIssue[] = [];
	const fail = (line: number, message: string) =>
		errors.push({ message: `Ligne ${line} : ${message}`, line });

	let operation = null as YohakuOperation | null;
	let solution = false as boolean;
	let caseIndex: number | undefined;
	const grille: { cases: YohakuCase[]; nodes: (MathNode | null)[] }[] = [];
	let totaux: { lignes: CaseLue[]; colonnes: CaseLue[] } | null = null;
	let lignesLues = 0;
	const seen = new Map<Key, number>();

	lines.forEach((line, index) => {
		const text = line.trim();
		if (text === '') return;
		const lineNo = index + 1;
		const match = KEY_LINE_REGEX.exec(text);
		if (!match) {
			fail(
				lineNo,
				`ligne « ${text} » non comprise (attendu : clé: valeur, ex. ligne: [x+2] | x+3)`
			);
			return;
		}
		const key = normalizeKey(match[1]);
		const value = match[2].trim();
		if (key === null) {
			fail(lineNo, `clé « ${match[1]} » inconnue (clés possibles : opération, ligne, solution)`);
			return;
		}
		if (key === 'ligne') {
			lignesLues++;
			if (lignesLues > YOHAKU_TAILLE) {
				fail(
					lineNo,
					`${YOHAKU_TAILLE} lignes seulement (grille ${YOHAKU_TAILLE} × ${YOHAKU_TAILLE})`
				);
				return;
			}
		} else {
			const previous = seen.get(key);
			if (previous !== undefined) {
				fail(lineNo, `« ${key} » déjà donnée ligne ${previous}`);
				return;
			}
		}
		seen.set(key, lineNo);

		try {
			switch (key) {
				case 'opération': {
					const v = value.toLowerCase();
					if (v !== 'somme' && v !== 'produit') {
						throw new LineError(`opération « ${value} » : somme ou produit`);
					}
					operation = v;
					break;
				}
				case 'ligne':
					grille.push(lireLigne(value));
					break;
				case 'solution':
					solution = lireOuiNon(value, 'solution');
					break;
				case 'totaux':
					totaux = lireTotaux(value);
					break;
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

	if (!seen.has('opération')) fail(1, 'il manque la ligne opération: (somme ou produit)');
	if (lignesLues < YOHAKU_TAILLE) {
		fail(
			1,
			`il faut ${YOHAKU_TAILLE} lignes ligne: (ex. ligne: [x+2] | x+3), ${lignesLues} donnée${lignesLues > 1 ? 's' : ''}`
		);
	}
	const aRemplir = grille.some((l) => l.cases.some((c) => c.aRemplir));
	if (errors.length === 0 && !aRemplir) {
		fail(seen.get('ligne') ?? 1, 'aucune case à remplir : mets au moins une case entre crochets');
	}

	const masquee = grille.some((l) => l.nodes.some((n) => n === null));
	if (errors.length === 0 && masquee && totaux === null) {
		fail(seen.get('ligne') ?? 1, 'une case [?] demande la ligne totaux: (L1 ; L2 | C1 ; C2)');
	}
	if (errors.length === 0 && !masquee && totaux !== null) {
		fail(seen.get('totaux') ?? 1, 'totaux: seulement avec des cases [?] (les totaux se calculent)');
	}

	const withCase = caseIndex === undefined ? {} : { caseIndex };
	if (errors.length > 0 || operation === null || grille.length !== YOHAKU_TAILLE) {
		return { type: 'yohaku', source, spec: null, errors, ...withCase };
	}

	const op: YohakuOperation = operation;
	const calcules =
		totaux ??
		totauxDe(
			op,
			grille.map((l) => l.nodes)
		);
	return {
		type: 'yohaku',
		source,
		spec: {
			operation: op,
			cases: grille.map((l) => l.cases),
			lignes: calcules.lignes.map((t) => t.latex),
			colonnes: calcules.colonnes.map((t) => t.latex),
			totaux: totauxEcrits(
				calcules.lignes.map((t) => t.source),
				calcules.colonnes.map((t) => t.source)
			),
			solution
		},
		errors,
		...withCase
	};
}

/** Totaux calculés depuis la solution de l'auteur (aucune case masquée) */
function totauxDe(
	op: YohakuOperation,
	nodes: (MathNode | null)[][]
): { lignes: CaseLue[]; colonnes: CaseLue[] } {
	const n = (l: number, c: number): MathNode => {
		const node = nodes[l][c];
		if (node === null) throw new Error('case masquée sans totaux');
		return node;
	};
	return {
		lignes: [0, 1].map((l) => total(op, n(l, 0), n(l, 1))),
		colonnes: [0, 1].map((c) => total(op, n(0, c), n(1, c)))
	};
}

/**
 * Analyser un bloc repéré dans les lignes d'un document : `end` EXCLU, la fence de fin pour un
 * bloc fermé, la ligne qui suit le bloc sinon.
 */
export function parseYohaku(
	lines: string[],
	startIndex: number,
	end: number
): { node: YohakuNode } {
	const body = lines.slice(startIndex + 1, end);
	const node = parseYohakuContent(body.join('\n'));
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
