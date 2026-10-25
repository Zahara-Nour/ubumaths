/**
 * Bloc ```construction — lecture de ses lignes propres
 * ====================================================
 *
 * Le bloc est une figure de départ : en-tête et langage de ```figure, plus
 * trois lignes d'en-tête à lui :
 *
 * ```construction
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
	CONSTRUCTION_CHECK_KINDS,
	CONSTRUCTION_TOOLS,
	type ConstructionCheck,
	type ConstructionSpec,
	type ConstructionTool
} from '../types/construction';
import type { FigureIssue } from '../types/figure';

const CONSTRUCTION_BLOCK_START_REGEX = /^```construction\s*$/;
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
	return [...new Set(words)] as ConstructionTool[];
}

function readCheck(value: string, line: number): ConstructionCheck {
	const [kind = '', ...rest] = value.split(/\s+/);
	if (!(CONSTRUCTION_CHECK_KINDS as readonly string[]).includes(kind)) {
		throw new LineError(
			`vérification « ${kind} » inconnue (${CONSTRUCTION_CHECK_KINDS.join(', ')})`
		);
	}
	const points = rest
		.join(' ')
		.split(';')
		.map((name) => name.trim())
		.filter((name) => name !== '');
	if (points.length !== 2 || !points.every((name) => POINT_NAME_REGEX.test(name))) {
		throw new LineError('droite_par attend deux points : « droite_par A ; B »');
	}
	if (points[0] === points[1]) throw new LineError('droite_par attend deux points différents');
	return { kind: 'droite_par', points: [points[0], points[1]], line };
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
	return { figureSource: lines.join('\n'), spec, errors };
}
