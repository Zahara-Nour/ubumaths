/**
 * Garde : `\textcolor` hors `$…$` dans le rendu d'un tirage
 * ========================================================
 *
 * Ubumark n'a pas de syntaxe de texte coloré : hors `$`, `\textcolor{…}{…}` reste
 * dans un nœud texte et l'élève lit le LaTeX brut (chantier questions-2de, § 58-59 :
 * 648 occurrences sur 24 modèles publiés de 2de). On juge le RENDU : chaque tirage
 * (énoncé avec ses choix et tableaux, étapes du corrigé, retours `feedback`) passe par
 * `parseMarkdown`, comme dans l'appli.
 *
 * Appelée par `pnpm question:specs` seulement (décision de David du 2026-11-02) :
 * la publication dans l'appli n'est pas gardée.
 */

import type { QuestionTemplate } from '$lib/questions/types';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import { parseMarkdown } from '$lib/ubumark/parser/markdown-parser';

// ============================================================================
// TYPES
// ============================================================================

export interface TextcolorFinding {
	variationIndex: number;
	seed: number;
	/** Début du texte fautif, tel que l'élève le lit */
	excerpt: string;
}

export interface TextcolorReport {
	/** Tirages lus, toutes variations confondues */
	checked: number;
	findings: TextcolorFinding[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COMMAND = '\\textcolor';
const EXCERPT_LENGTH = 80;

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Textes affichés qui portent `\textcolor` hors `$`, à toute profondeur. Trois porteurs :
 * le nœud `text` (hors code en ligne) ; les chaînes brutes que le composant rend comme du
 * markdown — choix d'un bloc ```choix, cellules de tableau, texte de lien — relues ici par
 * `parseMarkdown` (leurs `$…$` y deviennent des formules, donc pas signalées).
 */
function textcolorTexts(node: unknown): string[] {
	if (!node || typeof node !== 'object') return [];
	if (Array.isArray(node)) return node.flatMap(textcolorTexts);
	const record = node as Record<string, unknown>;
	if (record.type === 'text' && typeof record.content === 'string') {
		return record.code !== true && record.content.includes(COMMAND) ? [record.content] : [];
	}
	if (record.type === 'choice' && Array.isArray(record.choices)) {
		return record.choices.flatMap((choice: unknown) => rawTexts(choice));
	}
	if (record.type === 'link') return rawTexts(record.text);
	// Cellule de tableau (`header[]`, `rows[][]`) : `{ content, align }`, sans `type`
	if (record.type === undefined && typeof record.content === 'string') {
		return rawTexts(record.content);
	}
	return Object.values(record).flatMap(textcolorTexts);
}

/** Chaîne brute rendue comme du markdown : relue par le parseur */
function rawTexts(text: unknown): string[] {
	return typeof text === 'string' && text.includes(COMMAND)
		? textcolorTexts(parseMarkdown(text))
		: [];
}

/** Chaque variation, sur `instances` tirages : un `\textcolor` affiché en texte ? */
export function findTextcolorOutsideMath(
	template: QuestionTemplate,
	instances: number
): TextcolorReport {
	const findings: TextcolorFinding[] = [];
	let checked = 0;
	template.variations.forEach((variation, variationIndex) => {
		const single: QuestionTemplate = { ...template, variations: [variation] };
		for (let seed = 1; seed <= instances; seed++) {
			const result = generateInstance(single, seed);
			// Un tirage en échec est déjà compté par `checkTemplate`
			if (!result.success) continue;
			checked++;
			const { instance } = result;
			// Énoncé (choix et tableaux compris), étapes et retours du corrigé
			const texts = [
				instance.statement,
				...(instance.correction?.steps ?? []),
				...Object.values(instance.correction?.feedback ?? {})
			].filter((text): text is string => typeof text === 'string');
			const found = texts.flatMap((text) => textcolorTexts(parseMarkdown(text)));
			if (found.length > 0) {
				const excerpt = found[0].slice(
					found[0].indexOf(COMMAND),
					found[0].indexOf(COMMAND) + EXCERPT_LENGTH
				);
				findings.push({ variationIndex, seed, excerpt });
			}
		}
	});
	return { checked, findings };
}

/** Rapport lisible (terminal) : dit toujours combien de tirages ont été lus */
export function formatTextcolorReport(report: TextcolorReport): string {
	if (report.findings.length === 0) {
		return `✅ \\textcolor hors $ : 0 sur ${report.checked} tirage(s)`;
	}
	const variations = [...new Set(report.findings.map((f) => f.variationIndex + 1))];
	const first = report.findings[0];
	return [
		`❌ \\textcolor hors $ : ${report.findings.length} tirage(s) sur ${report.checked}, variation(s) ${variations.join(', ')}`,
		`   ex. variation ${first.variationIndex + 1}, tirage ${first.seed} : ${first.excerpt}`,
		'   → l’élève lit le LaTeX brut : mettre la couleur entre $ (ex. $\\textcolor{…}{…}$)'
	].join('\n');
}
