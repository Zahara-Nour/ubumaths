/**
 * Bloc ```figure — analyse du texte
 * =================================
 *
 * Découpe un bloc ```figure en en-tête (avant `---`) + script DSL BRUT :
 *
 * ```figure
 * fenetre: -1 ; 8 ; -1 ; 6
 * taille: petite
 * description: Triangle rectangle ABC.
 * ---
 * A = point(0, 0)
 * ```
 *
 * Volontairement LÉGER : aucun import de geometry-core (le parseur Markdown est
 * dans le chunk de toutes les pages). Le script est interprété par
 * `utils/figure-scene.ts`, chargé à la demande.
 *
 * Une erreur ne fait pas disparaître le bloc : le nœud porte ses messages
 * situés (n° de ligne du bloc) et le renderer les montre au prof (Q48).
 *
 * @module ubumark/parser/figure-parser
 */

import type {
	FigureBlockRange,
	FigureHeader,
	FigureIssue,
	FigureNode,
	FigureSize,
	FigureWindow
} from '../types/figure';
import { FIGURE_LIMITS, FIGURE_SIZES } from '../types/figure';
import { normalizeCourbeExpression } from './courbe-parser';
import { parseCustom } from '$lib/mathAST/parser/custom';
import { compile } from '$lib/mathAST/eval/compile';

// ============================================================================
// CONSTANTES
// ============================================================================

const FIGURE_BLOCK_START_REGEX = /^```figure\s*$/;
const BLOCK_END_REGEX = /^```\s*$/;
const SEPARATOR_REGEX = /^\s*---\s*$/;

/** `clé: valeur` */
const KEY_LINE_REGEX = /^([A-Za-zÀ-ÿ]+)\s*:\s*(.*)$/;

const KNOWN_KEYS = ['fenetre', 'fenêtre', 'taille', 'description'] as const;

// ============================================================================
// DÉTECTION
// ============================================================================

export function isFigureBlockStart(line: string): boolean {
	return FIGURE_BLOCK_START_REGEX.test(line);
}

/**
 * Blocs ```figure d'une liste de lignes (indices inclusifs, clôtures comprises).
 *
 * Bloc NON FERMÉ (fin du document, ou autre clôture d'ouverture ```python
 * avant toute clôture nue) : il s'arrête avant la première ligne vide qui suit
 * le script, pour ne pas avaler la suite du document.
 */
export function findFigureBlocks(lines: string[]): FigureBlockRange[] {
	const blocks: FigureBlockRange[] = [];
	let i = 0;
	while (i < lines.length) {
		if (!isFigureBlockStart(lines[i])) {
			i++;
			continue;
		}
		const startIndex = i;
		let j = i + 1;
		while (j < lines.length && !lines[j].startsWith('```')) j++;
		if (j < lines.length && BLOCK_END_REGEX.test(lines[j])) {
			blocks.push({ startIndex, endIndex: j, closed: true });
			i = j + 1;
			continue;
		}
		// Non fermé : jusqu'à la première ligne vide (ou la clôture étrangère)
		let end = startIndex;
		for (let k = startIndex + 1; k < j; k++) {
			if (lines[k].trim() === '') break;
			end = k;
		}
		blocks.push({ startIndex, endIndex: end, closed: false });
		i = end + 1;
	}
	return blocks;
}

// ============================================================================
// EN-TÊTE
// ============================================================================

class LineError extends Error {}

/** Une borne : nombre, éventuellement issu d'une variable (`--1`, `2{,}5`, `\pi`). */
function evaluateBound(raw: string): number {
	const normalized = normalizeCourbeExpression(raw);
	if (normalized === '') throw new LineError('valeur manquante');
	const direct = Number(normalized);
	if (Number.isFinite(direct)) return direct;
	let value: number;
	try {
		value = compile(parseCustom(normalized))({});
	} catch {
		throw new LineError(`« ${raw.trim()} » n'est pas un nombre`);
	}
	if (!Number.isFinite(value)) throw new LineError(`« ${raw.trim()} » n'est pas un nombre fini`);
	return value;
}

/** Pourquoi [min ; max] ne peut pas servir de fenêtre sur un axe, ou null. */
function rangeProblem(min: number, max: number): string | null {
	if (Math.abs(min) > FIGURE_LIMITS.bound || Math.abs(max) > FIGURE_LIMITS.bound) {
		return 'bornes trop grandes (au plus 10^6 en valeur absolue)';
	}
	if (!(min < max)) return 'la première borne doit être inférieure à la seconde';
	const scale = Math.max(1, Math.abs(min), Math.abs(max));
	if (max - min < FIGURE_LIMITS.relativeExtent * scale) return 'étendue trop petite';
	return null;
}

function parseWindow(value: string): FigureWindow {
	const parts = value.split(';');
	if (parts.length !== 4) {
		throw new LineError(
			`fenêtre : 4 bornes attendues « xmin ; xmax ; ymin ; ymax », ${parts.length} reçue(s)`
		);
	}
	const [xMin, xMax, yMin, yMax] = parts.map(evaluateBound);
	const xProblem = rangeProblem(xMin, xMax);
	if (xProblem) throw new LineError(`fenêtre (x) : ${xProblem}`);
	const yProblem = rangeProblem(yMin, yMax);
	if (yProblem) throw new LineError(`fenêtre (y) : ${yProblem}`);
	const ratio = (yMax - yMin) / (xMax - xMin);
	if (ratio > FIGURE_LIMITS.aspect || ratio < 1 / FIGURE_LIMITS.aspect) {
		throw new LineError(
			`fenêtre trop allongée (repère orthonormé : hauteur/largeur entre 1/${FIGURE_LIMITS.aspect} et ${FIGURE_LIMITS.aspect})`
		);
	}
	return { xMin, xMax, yMin, yMax };
}

// ============================================================================
// BLOC
// ============================================================================

/**
 * Analyser le texte d'un bloc (sans les clôtures).
 * Ligne 1 = première ligne après ```figure.
 */
export function parseFigureContent(source: string): FigureNode {
	const lines = source.split('\n');
	const errors: FigureIssue[] = [];
	const header: FigureHeader = { window: null, size: 'moyenne', description: null };

	const separator = lines.findIndex((l) => SEPARATOR_REGEX.test(l));
	const headerLines = separator === -1 ? lines : lines.slice(0, separator);
	let windowSeen = false;

	headerLines.forEach((content, index) => {
		const line = index + 1;
		const trimmed = content.trim();
		if (trimmed === '') return;
		try {
			const kv = KEY_LINE_REGEX.exec(trimmed);
			const key = kv?.[1].toLowerCase();
			if (!kv || key === undefined || !(KNOWN_KEYS as readonly string[]).includes(key)) {
				// Sans séparateur, le script commence ici : l'erreur est dite une seule fois plus bas
				if (separator === -1) return;
				throw new LineError(
					`« ${trimmed} » : en-tête attendu (fenetre, taille, description), puis ---`
				);
			}
			const value = kv[2].trim();
			if (key === 'fenetre' || key === 'fenêtre') {
				windowSeen = true;
				header.window = parseWindow(value);
			} else if (key === 'taille') {
				const size = value.toLowerCase();
				if (!(FIGURE_SIZES as readonly string[]).includes(size)) {
					throw new LineError(`taille « ${value} » inconnue (${FIGURE_SIZES.join(', ')})`);
				}
				header.size = size as FigureSize;
			} else {
				header.description = value === '' ? null : value;
			}
		} catch (error) {
			const detail = error instanceof Error ? error.message : String(error);
			errors.push({ message: `Ligne ${line} : ${detail}`, line });
		}
	});

	if (separator === -1) {
		errors.push({
			message:
				'Séparateur --- manquant : écrire l’en-tête (fenetre, taille, description), puis ---, puis le script'
		});
	}
	if (!windowSeen) {
		errors.push({ message: 'Fenêtre manquante : ajouter « fenetre: xmin ; xmax ; ymin ; ymax »' });
	}

	const script = separator === -1 ? '' : lines.slice(separator + 1).join('\n');
	return {
		type: 'figure',
		source,
		header,
		script,
		scriptStartLine: separator + 2,
		errors
	};
}

/**
 * Analyser un bloc repéré dans les lignes d'un document (clôtures comprises).
 */
export function parseFigure(lines: string[], startIndex: number, endIndex: number): FigureNode {
	const closed = endIndex > startIndex && BLOCK_END_REGEX.test(lines[endIndex]);
	const body = lines.slice(startIndex + 1, closed ? endIndex : endIndex + 1);
	const node = parseFigureContent(body.join('\n'));
	if (closed) return node;
	return {
		...node,
		errors: [
			...node.errors,
			{
				message: `Ligne ${body.length + 1} : bloc non fermé (\`\`\` manquant après la dernière ligne)`,
				line: body.length + 1
			}
		]
	};
}
