/**
 * Bloc ```figure-a-completer — lecture de ses lignes propres
 * ====================================================
 *
 * Le bloc est une figure de départ : en-tête et langage de ```figure, plus
 * trois lignes d'en-tête à lui (`verifier: carre A ; B` ou
 * `rectangle A ; B ; C` avec l'outil segment, CP-060) :
 *
 * ```figure-a-completer
 * fenetre: 0 ; 10 ; 0 ; 6
 * outils: droite
 * verifier: droite_par A ; B
 * ---
 * A = point(1, 2)
 * B = point(7, 2)
 * ```
 *
 * `case: N` est posée par le générateur de questions, jamais écrite. Ces
 * lignes sont lues ici puis remplacées par des lignes vides : le reste passe
 * tel quel au parseur de ```figure (numéros de ligne inchangés). Aucun import
 * du parseur de figure ni de geometry-core (`figure-parser.ts` importe ce module).
 *
 * @module ubumark/parser/construction-parser
 */

import {
	CHECK_TOOL,
	CONSTRUCTION_CHECK_KINDS,
	CONSTRUCTION_TOOLS,
	type ConstructionCheck,
	type ConstructionCheckKind,
	type ConstructionSpec,
	type ConstructionTool
} from '../types/construction';
import type { FigureIssue } from '../types/figure';

const CONSTRUCTION_BLOCK_START_REGEX = /^```figure-a-completer\s*$/;
const SEPARATOR_REGEX = /^\s*---\s*$/;
const KEY_LINE_REGEX = /^(outils|verifier|vérifier|case)\s*:\s*(.*)$/i;
const POINT_NAME_REGEX = /^[A-Za-z][A-Za-z0-9_']*$/;
const CASE_INDEX_REGEX = /^\d{1,3}$/;

export const CONSTRUCTION_MISSING_CHECK_MESSAGE =
	'Vérification manquante : ajouter « verifier: droite_par A ; B »';

class LineError extends Error {}

export function isConstructionBlockStart(line: string): boolean {
	return CONSTRUCTION_BLOCK_START_REGEX.test(line);
}

function readTools(value: string): ConstructionTool[] {
	const words = value
		.split(/[,;]/)
		.map((word) => word.trim().toLowerCase())
		.filter((word) => word !== '');
	if (words.length === 0) throw new LineError(`outils: écrire ${CONSTRUCTION_TOOLS.join(', ')}`);
	for (const word of words) {
		if (!(CONSTRUCTION_TOOLS as readonly string[]).includes(word)) {
			throw new LineError(`outil « ${word} » inconnu (${CONSTRUCTION_TOOLS.join(', ')})`);
		}
	}
	const tools = [...new Set(words)] as ConstructionTool[];
	if (tools.length > 1) throw new LineError('un seul outil par figure');
	return tools;
}

/** Nombre de points de chaque vérification, et comment l'écrire */
const CHECK_ARITY: Record<ConstructionCheckKind, { count: number; example: string; word: string }> =
	{
		droite_par: { count: 2, example: 'droite_par A ; B', word: 'deux' },
		carre: { count: 2, example: 'carre A ; B', word: 'deux' },
		rectangle: { count: 3, example: 'rectangle A ; B ; C', word: 'trois' }
	};

function readCheck(value: string, line: number): ConstructionCheck {
	const [word = '', ...rest] = value.split(/\s+/);
	if (!(CONSTRUCTION_CHECK_KINDS as readonly string[]).includes(word)) {
		throw new LineError(
			`vérification « ${word} » inconnue (${CONSTRUCTION_CHECK_KINDS.join(', ')})`
		);
	}
	const kind = word as ConstructionCheckKind;
	const { count, example, word: countWord } = CHECK_ARITY[kind];
	const points = rest
		.join(' ')
		.split(';')
		.map((name) => name.trim())
		.filter((name) => name !== '');
	if (points.length !== count || !points.every((name) => POINT_NAME_REGEX.test(name))) {
		throw new LineError(`${kind} attend ${countWord} points : « ${example} »`);
	}
	if (new Set(points).size !== count) {
		throw new LineError(`${kind} attend ${countWord} points différents`);
	}
	if (kind === 'rectangle') {
		return { kind, points: [points[0], points[1], points[2]], line };
	}
	return { kind, points: [points[0], points[1]], line };
}

/**
 * Une vérification qui ne va pas avec les autres : son outil n'est pas celui
 * de la figure, ou c'est un second carré / rectangle (le juge compte les
 * segments en trop sur UN polygone).
 */
function coherenceError(check: ConstructionCheck, spec: ConstructionSpec): string | null {
	const tool = CHECK_TOOL[check.kind];
	if (!spec.tools.includes(tool))
		return `${check.kind} se trace avec l’outil ${tool} (outils: ${tool})`;
	const polygons = spec.checks.filter((c) => c.kind !== 'droite_par');
	if (check.kind !== 'droite_par' && polygons[0] !== check) {
		return 'un seul carré ou rectangle par figure';
	}
	return null;
}

/**
 * Lire les lignes propres du bloc (avant `---`) : la spécification, les
 * erreurs situées, et le texte à donner au parseur de ```figure.
 */
export function readConstructionHeader(source: string): {
	figureSource: string;
	spec: ConstructionSpec;
	errors: FigureIssue[];
} {
	const lines = source.split('\n');
	const separator = lines.findIndex((l) => SEPARATOR_REGEX.test(l));
	const headerEnd = separator === -1 ? lines.length : separator;
	const errors: FigureIssue[] = [];
	const spec: ConstructionSpec = { tools: ['droite'], checks: [] };
	let toolsSeen = false;
	let checkErrors = 0;

	for (let index = 0; index < headerEnd; index++) {
		const kv = KEY_LINE_REGEX.exec(lines[index].trim());
		if (!kv) continue;
		const line = index + 1;
		const key = kv[1].toLowerCase();
		const value = kv[2].trim();
		lines[index] = '';
		try {
			if (key === 'outils') {
				if (toolsSeen) throw new LineError('outils: écrit deux fois');
				toolsSeen = true;
				spec.tools = readTools(value);
			} else if (key === 'case') {
				if (!CASE_INDEX_REGEX.test(value)) {
					throw new LineError('case: attend un numéro de case (0, 1, 2…)');
				}
				spec.caseIndex = Number(value);
			} else {
				try {
					spec.checks.push(readCheck(value, line));
				} catch (error) {
					checkErrors++;
					throw error;
				}
			}
		} catch (error) {
			if (!(error instanceof LineError)) throw error;
			errors.push({ message: `Ligne ${line} : ${error.message}`, line });
		}
	}
	if (spec.checks.length === 0 && checkErrors === 0) {
		errors.push({ message: CONSTRUCTION_MISSING_CHECK_MESSAGE });
	}
	// `outils:` absent : l'outil de la première vérification (droite par défaut)
	if (!toolsSeen && spec.checks.length > 0) spec.tools = [CHECK_TOOL[spec.checks[0].kind]];
	const coherent: ConstructionCheck[] = [];
	for (const check of spec.checks) {
		const message = coherenceError(check, spec);
		if (message) errors.push({ message: `Ligne ${check.line} : ${message}`, line: check.line });
		else coherent.push(check);
	}
	spec.checks = coherent;
	return { figureSource: lines.join('\n'), spec, errors };
}
