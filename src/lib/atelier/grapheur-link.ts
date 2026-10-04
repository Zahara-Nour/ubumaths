/**
 * Atelier — les liens `/grapheur?f=…`
 *
 * L'entrée « projection » (phase 0 `/grapheur` §6 B4 à B6) : le prof prépare
 * ses liens, une courbe par `f`, et le lien ouvre un écran propre avec ces
 * seules courbes. L'atelier ainsi construit est ÉPHÉMÈRE : la page ne lit ni
 * n'écrit l'atelier personnel (même mécanisme que `/atelier?a=`).
 *
 * @module atelier/grapheur-link
 */

import { z } from 'zod';
import { Atelier } from './atelier.svelte';

// =============================================================================
// Constantes
// =============================================================================

/** Au-delà, l'écran de projection ne serait plus lisible. */
export const MAX_LINK_CURVES = 8;

/**
 * Longueur d'une courbe dans un lien. ⚠️ Pas `MAX_DEFINITION_LENGTH`, taillé
 * pour une LISTE de 200 valeurs : une expression de projection est bien plus
 * courte, et un lien reste lisible et partageable.
 */
const MAX_LINK_CURVE_LENGTH = 200;

/** Ce qu'un lien peut porter : quelques définitions, chacune bornée. */
const linkSchema = z
	.array(z.string().trim().min(1).max(MAX_LINK_CURVE_LENGTH))
	.max(MAX_LINK_CURVES);

// =============================================================================
// Types
// =============================================================================

export type LinkCurves =
	| { readonly kind: 'none' }
	| { readonly kind: 'curves'; readonly definitions: readonly string[] }
	| { readonly kind: 'invalid'; readonly message: string };

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Les courbes qu'un lien demande, validées (CLAUDE.md : toute entrée passe par
 * Zod — un paramètre d'URL en est une).
 */
export function curvesFromLink(params: URLSearchParams): LinkCurves {
	const raw = params.getAll('f');
	if (raw.length === 0) return { kind: 'none' };
	const read = linkSchema.safeParse(raw);
	if (!read.success) {
		return {
			kind: 'invalid',
			message: `Ce lien n'est pas valable : il faut entre 1 et ${MAX_LINK_CURVES} courbes, chacune non vide et de moins de ${MAX_LINK_CURVE_LENGTH} caractères.`
		};
	}
	return { kind: 'curves', definitions: read.data };
}

/**
 * Un atelier neuf où chaque courbe du lien est une fonction TRACÉE : `f`, `g`,
 * `h`… dans l'ordre. Une courbe illisible fait refuser tout le lien, avec sa
 * citation (B6) : la page ouvre alors l'atelier personnel et le dit.
 */
export function atelierFromCurves(
	definitions: readonly string[]
): { ok: true; atelier: Atelier } | { ok: false; message: string } {
	const atelier = new Atelier();
	for (const definition of definitions) {
		const created = atelier.create({ kind: 'function', definition }, 'text');
		if (!created.ok) return { ok: false, message: created.message };
		if (created.object.status === 'error') {
			return {
				ok: false,
				message: `Le lien contient une courbe illisible : « ${definition} ».`
			};
		}
		atelier.setPlotted(created.object.name, true);
	}
	return { ok: true, atelier };
}
