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
 * axes: oui
 * grille: 1
 * ---
 * A = point(0, 0)
 * ```
 *
 * Repère (géométrie repérée) : `axes: oui|non`, `grille: oui|non|pas|pas x ; pas y`
 * (mêmes mots que ```courbe), `graduations: pas|pas x ; pas y|non` (défaut : le
 * pas de la grille, sinon 1). Sans ces clés, ni axes ni grille.
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

import { bodyOpensParagraph } from './block-closure';
import type {
	FigureBlockRange,
	FigureHeader,
	FigureStep,
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

const KNOWN_KEYS = [
	'fenetre',
	'fenêtre',
	'taille',
	'description',
	'axes',
	'grille',
	'graduations'
] as const;

/** Clés citées dans les messages (sans la variante accentuée) */
const KEYS_HINT = 'fenetre, taille, description, axes, grille, graduations';

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
/** Mots qui ouvrent une instruction du langage des figures */
const FIGURE_STATEMENT_START = /^(pour|si|sinon|macro|retourne)\b/;

/** Une ligne qui est sûrement du langage des figures, et jamais du texte */
function looksLikeFigureLine(line: string): boolean {
	const trimmed = line.trim();
	return trimmed === '---' || FIGURE_STATEMENT_START.test(trimmed);
}

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
		// ⚠️ Un ``` plus loin ne ferme la figure que si rien de markdown ne les
		// sépare (Q25) : sinon il avalait le texte, et ouvrait un bloc de code
		// jamais refermé
		if (
			j < lines.length &&
			BLOCK_END_REGEX.test(lines[j]) &&
			!bodyOpensParagraph(lines.slice(startIndex + 1, j), looksLikeFigureLine)
		) {
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

/** `oui` / `non` → booléen ; null si ce n'est ni l'un ni l'autre */
function yesNo(value: string): boolean | null {
	const v = value.trim().toLowerCase();
	if (v === 'oui') return true;
	if (v === 'non') return false;
	return null;
}

/** Un pas, ou deux pas « x ; y » (comme `grille:` de ```courbe), strictement positifs. */
function parseStep(value: string, key: string): FigureStep {
	const parts = value.split(';').map((p) => p.trim());
	if (parts.length > 2 || parts.some((p) => p === '')) {
		throw new LineError(`${key} attend oui, non, un pas, ou deux pas « x ; y » (ex. 1 ; 2)`);
	}
	const x = evaluateBound(parts[0]);
	const y = parts.length === 2 ? evaluateBound(parts[1]) : x;
	if (!(x > 0) || !(y > 0)) throw new LineError(`${key} : les pas doivent être positifs`);
	return { x, y };
}

/** Trop de lignes de grille ou de graduations pour la fenêtre ? */
function tooManyLines(step: FigureStep, w: FigureWindow): boolean {
	return (
		(w.xMax - w.xMin) / step.x > FIGURE_LIMITS.gridLines ||
		(w.yMax - w.yMin) / step.y > FIGURE_LIMITS.gridLines
	);
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
	const header: FigureHeader = {
		window: null,
		size: 'moyenne',
		description: null,
		axes: false,
		grid: null,
		ticks: null
	};
	/** Ligne de chaque clé du repère, pour les erreurs qui dépendent de la fenêtre */
	const keyLines: { grille?: number; graduations?: number } = {};

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
				throw new LineError(`« ${trimmed} » : en-tête attendu (${KEYS_HINT}), puis ---`);
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
			} else if (key === 'axes') {
				const on = yesNo(value);
				if (on === null) throw new LineError(`axes « ${value} » : écrire oui ou non`);
				header.axes = on;
			} else if (key === 'grille') {
				keyLines.grille = line;
				const on = yesNo(value);
				header.grid = on === null ? parseStep(value, 'grille') : on ? { x: 1, y: 1 } : null;
			} else if (key === 'graduations') {
				keyLines.graduations = line;
				// `oui` : le pas par défaut (celui de la grille, sinon 1)
				const on = yesNo(value);
				header.ticks = on === null ? parseStep(value, 'graduations') : on ? null : false;
			} else {
				header.description = value === '' ? null : value;
			}
		} catch (error) {
			const detail = error instanceof Error ? error.message : String(error);
			errors.push({ message: `Ligne ${line} : ${detail}`, line });
		}
	});

	// Repère : cohérence entre clés, et nombre de lignes une fois la fenêtre connue
	const located = (line: number, message: string) =>
		errors.push({ message: `Ligne ${line} : ${message}`, line });
	if (keyLines.graduations !== undefined && header.ticks && !header.axes) {
		located(keyLines.graduations, 'graduations sans axes : ajouter « axes: oui »');
	}
	const w = header.window;
	if (w !== null) {
		const tooSmall = `pas trop petit pour la fenêtre (plus de ${FIGURE_LIMITS.gridLines} lignes par axe)`;
		if (keyLines.grille !== undefined && header.grid && tooManyLines(header.grid, w)) {
			located(keyLines.grille, `grille : ${tooSmall}`);
		}
		if (keyLines.graduations !== undefined && header.ticks && tooManyLines(header.ticks, w)) {
			located(keyLines.graduations, `graduations : ${tooSmall}`);
		}
	}
	errors.sort((a, b) => (a.line ?? 0) - (b.line ?? 0));

	if (separator === -1) {
		errors.push({
			message: `Séparateur --- manquant : écrire l’en-tête (${KEYS_HINT}), puis ---, puis le script`
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
