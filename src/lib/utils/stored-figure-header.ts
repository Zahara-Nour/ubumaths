/**
 * En-tête d'une figure stockée (ADR 0027) : lecture et écriture d'une clé
 * =====================================================================
 *
 * Le texte d'une figure stockée est le contenu d'un bloc ```figure : en-tête
 * (`clé: valeur`), `---`, puis le script. Sans `---`, c'est un script nu.
 *
 * Les champs du formulaire lisent et écrivent ici la VALEUR BRUTE d'une clé,
 * ligne par ligne : tout le reste du texte (autres clés, lignes en erreur,
 * lignes vides, script sous `---`) est rendu tel quel. Le jugement des valeurs
 * reste au parseur du bloc (`parseFigureContent`), qui n'a pas de doublon.
 */

import { findFigureSeparator, readFigureHeaderLine } from '$lib/ubumark/parser/figure-parser';

// ============================================================================
// TYPES
// ============================================================================

/** Clés que le formulaire sait écrire (nom canonique, sans accent) */
export type StoredFigureFieldKey =
	'fenetre' | 'taille' | 'axes' | 'grille' | 'graduations' | 'deplacable' | 'rendu';

// ============================================================================
// CONSTANTES
// ============================================================================

/** Orthographes acceptées par le parseur pour chaque clé */
const KEY_SPELLINGS: Record<StoredFigureFieldKey, readonly string[]> = {
	fenetre: ['fenetre', 'fenêtre'],
	taille: ['taille'],
	axes: ['axes'],
	grille: ['grille'],
	graduations: ['graduations'],
	deplacable: ['deplacable', 'déplaçable'],
	rendu: ['rendu']
};

/**
 * En-tête qui reproduit l'affichage d'un script nu (toile de 520 px à 40 px par
 * unité, centrée sur l'origine, grille et axes, points déplaçables) : régler un
 * premier champ ne doit pas changer les autres (choix de David, 2026-10-14).
 * `grande` (560 px) est la taille la plus proche de 520 px.
 */
export const BARE_SCRIPT_HEADER: readonly (readonly [StoredFigureFieldKey, string])[] = [
	['fenetre', '-6.5 ; 6.5 ; -6.5 ; 6.5'],
	['taille', 'grande'],
	['axes', 'oui'],
	['grille', '1 ; 1'],
	['deplacable', 'oui']
];

// ============================================================================
// FONCTIONS
// ============================================================================

/** Le texte a-t-il un en-tête (une ligne `---`) ? Sinon, script nu. */
export function hasFigureHeader(text: string): boolean {
	return findFigureSeparator(text.split('\n')) !== -1;
}

/** Indice de la PREMIÈRE ligne d'en-tête qui porte la clé, -1 sinon. */
function findKeyLine(lines: string[], separator: number, key: StoredFigureFieldKey): number {
	for (let i = 0; i < separator; i++) {
		const kv = readFigureHeaderLine(lines[i]);
		if (kv && KEY_SPELLINGS[key].includes(kv.key)) return i;
	}
	return -1;
}

/** Valeur brute de la clé dans l'en-tête ; null si absente ou script nu. */
export function readHeaderField(text: string, key: StoredFigureFieldKey): string | null {
	const lines = text.split('\n');
	const separator = findFigureSeparator(lines);
	if (separator === -1) return null;
	const index = findKeyLine(lines, separator, key);
	return index === -1 ? null : (readFigureHeaderLine(lines[index])?.value ?? null);
}

/**
 * Écrire la valeur brute d'une clé (null : retirer sa ligne).
 *
 * - ligne présente : remplacée sur place, orthographe de la clé gardée ;
 * - absente : ajoutée juste avant `---` ;
 * - script nu : l'en-tête naît (`clé: valeur`, `---`, puis le script intact).
 */
export function writeHeaderField(
	text: string,
	key: StoredFigureFieldKey,
	value: string | null
): string {
	const lines = text.split('\n');
	const separator = findFigureSeparator(lines);
	if (separator === -1) {
		return value === null ? text : `${key}: ${value}\n---\n${text}`;
	}
	const index = findKeyLine(lines, separator, key);
	if (index === -1) {
		if (value === null) return text;
		lines.splice(separator, 0, `${key}: ${value}`);
		return lines.join('\n');
	}
	if (value === null) {
		lines.splice(index, 1);
		return lines.join('\n');
	}
	const rawKey = readFigureHeaderLine(lines[index])?.rawKey ?? key;
	lines[index] = `${rawKey}: ${value}`;
	return lines.join('\n');
}

/** Les 4 bornes brutes de `fenetre:` (chaînes vides si absente ou incomplète). */
export function readWindowFields(text: string): [string, string, string, string] {
	const raw = readHeaderField(text, 'fenetre');
	const parts = raw === null ? [] : raw.split(';').map((p) => p.trim());
	return [parts[0] ?? '', parts[1] ?? '', parts[2] ?? '', parts[3] ?? ''];
}

/** Écrire les 4 bornes ; toutes vides → la ligne `fenetre:` disparaît. */
export function writeWindowFields(text: string, bounds: readonly string[]): string {
	const trimmed = bounds.map((b) => b.trim());
	if (trimmed.every((b) => b === '')) return writeHeaderField(text, 'fenetre', null);
	return writeHeaderField(text, 'fenetre', trimmed.join(' ; '));
}

/**
 * Script nu : faire naître l'en-tête qui garde son affichage
 * (`BARE_SCRIPT_HEADER`) ; texte qui a déjà un en-tête : rendu tel quel.
 */
export function withBareScriptHeader(text: string): string {
	if (hasFigureHeader(text)) return text;
	const header = BARE_SCRIPT_HEADER.map(([key, value]) => `${key}: ${value}`).join('\n');
	return `${header}\n---\n${text}`;
}
