/**
 * Bloc ```python-a-ecrire — parseur
 * =================================
 *
 * ```python-a-ecrire
 * fonction: seuil
 * depart: |
 *   def seuil(A):
 *       ...
 * solution: |
 *   def seuil(A):
 *       ...
 * essais: seuil(2) ; seuil(100) ; seuil(10000)
 * exiger: boucle
 * ```
 *
 * - `fonction:` (obligatoire) : le nom de la fonction à écrire.
 * - `solution:` (obligatoire) : le programme de l'auteur, qui calcule les résultats attendus ;
 *   il doit définir la fonction (`def seuil(`).
 * - `essais:` (obligatoire) : les appels essayés, séparés par `;`, chacun appelle la fonction.
 * - `depart:` (ou `départ:`) : le programme posé d'avance dans l'éditeur de l'élève.
 * - `exiger:` : exigences sur le code (`boucle`, `sans print`), séparées par `,` ou `;`.
 * - `case: N` : posée par le générateur.
 *
 * `depart:` et `solution:` s'écrivent en bloc littéral : `|` puis les lignes en retrait (le
 * retrait commun est retiré, les lignes vides gardées). Une valeur sur la même ligne vaut un
 * programme d'une ligne.
 *
 * La solution ne s'exécute pas ici (pas de Python côté serveur) : elle tourne dans le
 * navigateur de l'élève, à côté de son programme.
 *
 * @module ubumark/parser/python-a-ecrire-parser
 */

import { unnestedLine } from './nested-line';
import { specialBlockEnd } from './unclosed-block';
import {
	PYTHON_EXIGENCES,
	type PythonAEcrireBlockRange,
	type PythonAEcrireIssue,
	type PythonAEcrireNode,
	type PythonExigence
} from '../types/python-a-ecrire';

// ============================================================================
// CONSTANTES
// ============================================================================

const BLOCK_START_REGEX = /^```python-a-ecrire\s*$/;
const BLOCK_END_REGEX = /^```\s*$/;

/** `clé: valeur`, à la marge (une ligne en retrait appartient au bloc littéral au-dessus) */
const KEY_LINE_REGEX = /^([A-Za-zÀ-ÿ]+)\s*:\s*(.*)$/;

/** Nom de fonction Python */
const IDENTIFIER_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

type Key = 'fonction' | 'départ' | 'solution' | 'essais' | 'exiger' | 'case';

const KEY_NAMES: Key[] = ['fonction', 'départ', 'solution', 'essais', 'exiger', 'case'];

/** Les clés du bloc, `depart` sans accent compris (fermeture d'un bloc, Q66) */
const BLOCK_KEYS: readonly string[] = [...KEY_NAMES, 'depart'];

/** Plus d'essais n'apprend rien à l'élève et ralentit la validation */
const MAX_ESSAIS = 20;

// ============================================================================
// DÉTECTION
// ============================================================================

export function isPythonAEcrireBlockStart(line: string): boolean {
	return BLOCK_START_REGEX.test(line);
}

/**
 * Blocs ```python-a-ecrire d'une liste de lignes (indices inclusifs, clôtures comprises).
 * Fermé par un ``` qui ne fait pas lire du texte comme contenu (Q66), sinon jusqu'à la
 * première ligne vide.
 */
export function findPythonAEcrireBlocks(lines: string[]): PythonAEcrireBlockRange[] {
	const blocks: PythonAEcrireBlockRange[] = [];
	let i = 0;
	while (i < lines.length) {
		if (isPythonAEcrireBlockStart(lines[i])) {
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
 * Les blocs ```python-a-ecrire d'un énoncé (tous portent une case) : corps sans clôtures,
 * fermeture, et `nested` pour un bloc en retrait ou cité (sa case n'est pas créée)
 */
export function findPythonsAEcrire(markdown: string): {
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
		if (isPythonAEcrireBlockStart(plain[i])) {
			const { endIndex, closed } = specialBlockEnd(
				plain,
				i,
				(line) => BLOCK_END_REGEX.test(line),
				BLOCK_KEYS
			);
			// Corps lu sur les lignes d'origine sans leur seul préfixe d'imbrication : le
			// retrait des programmes (bloc littéral) doit rester intact
			const prefix = lines[i].length - plain[i].length;
			const body = lines
				.slice(i + 1, closed ? endIndex : endIndex + 1)
				.map((line) => line.slice(Math.min(prefix, leadingNestingLength(line))));
			found.push({ startIndex: i, body, closed, nested: lines[i] !== plain[i] });
			i = endIndex;
		}
		i++;
	}
	return found;
}

/** Longueur du préfixe d'imbrication d'une ligne (retrait, `>`) */
function leadingNestingLength(line: string): number {
	return (/^[\s>]*/.exec(line)?.[0] ?? '').length;
}

/** L'énoncé a-t-il un programme Python à écrire ? */
export function hasPythonAEcrire(markdown: string): boolean {
	return findPythonsAEcrire(markdown).length > 0;
}

// ============================================================================
// ANALYSE
// ============================================================================

function normalizeKey(raw: string): Key | null {
	const lower = raw.toLowerCase();
	if (lower === 'depart') return 'départ';
	return KEY_NAMES.find((k) => k === lower) ?? null;
}

/** Retire le retrait commun des lignes non vides ; lignes vides de fin retirées */
function dedent(lines: string[]): string {
	const kept = [...lines];
	while (kept.length > 0 && kept[kept.length - 1].trim() === '') kept.pop();
	const margins = kept.filter((line) => line.trim() !== '').map((line) => leadingSpaces(line));
	const margin = margins.length === 0 ? 0 : Math.min(...margins);
	return kept.map((line) => (line.trim() === '' ? '' : line.slice(margin))).join('\n');
}

function leadingSpaces(line: string): number {
	return (/^[ \t]*/.exec(line)?.[0] ?? '').length;
}

/** Un essai appelle-t-il la fonction ? `seuil(2)` oui, `rang(2)` ou `seuil` non */
export function callsFunction(essai: string, fonction: string): boolean {
	const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*\(([\s\S]*)\)$/.exec(essai.trim());
	return match !== null && match[1] === fonction;
}

/** La solution définit-elle la fonction (`def seuil(` en tête de ligne) ? */
function definesFunction(code: string, fonction: string): boolean {
	return new RegExp(`^\\s*def\\s+${fonction}\\s*\\(`, 'm').test(code);
}

/**
 * Analyser le texte d'un bloc (sans les clôtures).
 * Ligne 1 = première ligne après ```python-a-ecrire.
 */
export function parsePythonAEcrireContent(source: string): PythonAEcrireNode {
	const lines = source.split('\n');
	const errors: PythonAEcrireIssue[] = [];
	const fail = (line: number, message: string) =>
		errors.push({ message: `Ligne ${line} : ${message}`, line });

	const values = new Map<Key, string>();
	const seen = new Map<Key, number>();
	let caseIndex: number | undefined;

	let index = 0;
	while (index < lines.length) {
		const line = lines[index];
		const lineNo = index + 1;
		index++;
		if (line.trim() === '') continue;
		const match = /^\s/.test(line) ? null : KEY_LINE_REGEX.exec(line.trimEnd());
		if (!match) {
			fail(
				lineNo,
				`ligne « ${line.trim()} » non comprise (attendu : clé: valeur ; un programme s’écrit en retrait sous « solution: | »)`
			);
			continue;
		}
		const key = normalizeKey(match[1]);
		if (key === null) {
			fail(
				lineNo,
				`clé « ${match[1]} » inconnue (clés possibles : fonction, depart, solution, essais, exiger)`
			);
			continue;
		}
		const previous = seen.get(key);
		if (previous !== undefined) {
			fail(lineNo, `« ${key} » déjà donnée ligne ${previous}`);
			continue;
		}
		seen.set(key, lineNo);
		let value = match[2].trim();
		// Bloc littéral : les lignes en retrait (et vides) qui suivent
		if (value === '|') {
			const block: string[] = [];
			while (index < lines.length && (lines[index].trim() === '' || /^\s/.test(lines[index]))) {
				block.push(lines[index]);
				index++;
			}
			value = dedent(block);
		}
		if (key === 'case') {
			if (/^\d+$/.test(value)) caseIndex = Number(value);
			else fail(lineNo, `case « ${value} » : numéro de case entier`);
			continue;
		}
		values.set(key, value);
	}

	const fonction = values.get('fonction') ?? '';
	const solution = values.get('solution') ?? '';
	const essaisText = values.get('essais') ?? '';

	if (!seen.has('fonction')) {
		fail(1, 'il manque la ligne fonction: (le nom de la fonction à écrire, ex. fonction: seuil)');
	} else if (!IDENTIFIER_REGEX.test(fonction)) {
		fail(
			seen.get('fonction') ?? 1,
			`fonction: « ${fonction} » n’est pas un nom de fonction Python`
		);
	}
	const fonctionLue = seen.has('fonction') && IDENTIFIER_REGEX.test(fonction);

	if (solution === '') {
		fail(
			seen.get('solution') ?? 1,
			'il manque la solution (solution: | puis le programme de l’auteur, en retrait)'
		);
	} else if (fonctionLue && !definesFunction(solution, fonction)) {
		fail(
			seen.get('solution') ?? 1,
			`la solution ne définit pas la fonction ${fonction} (def ${fonction}(…):)`
		);
	}

	const essais = essaisText
		.split(';')
		.map((e) => e.trim())
		.filter((e) => e !== '');
	if (!seen.has('essais') || essais.length === 0) {
		fail(seen.get('essais') ?? 1, 'il manque la ligne essais: (ex. essais: seuil(2) ; seuil(100))');
	} else if (essais.length > MAX_ESSAIS) {
		fail(seen.get('essais') ?? 1, `essais: ${MAX_ESSAIS} essais au plus`);
	} else if (fonctionLue) {
		const fautif = essais.find((e) => !callsFunction(e, fonction));
		if (fautif !== undefined) {
			fail(seen.get('essais') ?? 1, `l’essai « ${fautif} » n’appelle pas la fonction ${fonction}`);
		}
	}

	const exiger: PythonExigence[] = [];
	for (const raw of (values.get('exiger') ?? '').split(/[,;]/)) {
		const name = raw.trim().toLowerCase().replace(/\s+/g, ' ');
		if (name === '') continue;
		const known = PYTHON_EXIGENCES.find((e) => e === name);
		if (known === undefined) {
			fail(
				seen.get('exiger') ?? 1,
				`exigence « ${raw.trim()} » inconnue (exigences possibles : ${PYTHON_EXIGENCES.join(', ')})`
			);
		} else if (!exiger.includes(known)) {
			exiger.push(known);
		}
	}

	const withCase = caseIndex === undefined ? {} : { caseIndex };
	if (errors.length > 0) {
		return { type: 'python-a-ecrire', source, spec: null, errors, ...withCase };
	}
	return {
		type: 'python-a-ecrire',
		source,
		spec: { fonction, depart: values.get('départ') ?? '', solution, essais, exiger },
		errors,
		...withCase
	};
}

/**
 * Analyser un bloc repéré dans les lignes d'un document : `end` EXCLU, la fence de fin pour un
 * bloc fermé, la ligne qui suit le bloc sinon.
 */
export function parsePythonAEcrire(
	lines: string[],
	startIndex: number,
	end: number
): { node: PythonAEcrireNode } {
	const body = lines.slice(startIndex + 1, end);
	const node = parsePythonAEcrireContent(body.join('\n'));
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
