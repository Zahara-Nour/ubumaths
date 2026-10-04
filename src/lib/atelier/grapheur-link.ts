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
import { decodeAtelier } from './url';
import type { AtelierState } from './persistence';

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
			message: `Ce lien n'est pas valable : il faut entre 1 et ${MAX_LINK_CURVES} courbes, chacune non vide et d’au plus ${MAX_LINK_CURVE_LENGTH} caractères.`
		};
	}
	return { kind: 'curves', definitions: read.data };
}

/**
 * Un atelier neuf où chaque courbe du lien est une fonction TRACÉE, nommée
 * dans l'ordre (`f`, `g`, `h`, puis `f_1`, `f_2`…). Une courbe illisible fait refuser tout le lien, avec sa
 * citation (B6) : la page ouvre alors l'atelier personnel et le dit.
 */
export function atelierFromCurves(
	definitions: readonly string[]
): { ok: true; atelier: Atelier } | { ok: false; message: string } {
	const atelier = new Atelier();
	const created: { name: string; definition: string }[] = [];
	for (const definition of definitions) {
		const result = atelier.create({ kind: 'function', definition }, 'text');
		if (!result.ok) return { ok: false, message: result.message };
		created.push({ name: result.object.name, definition });
	}
	// ⚠️ Vérifié APRÈS toutes les créations : une courbe peut citer la suivante
	// (`?f=g(x)+1&f=x^2`). Une courbe « en attente » (`y=2x`, `a*x+b`) n'est pas
	// moins muette qu'une illisible : sans courbe à l'écran, on le dit (revue).
	for (const { name, definition } of created) {
		if (atelier.get(name)?.status !== 'ok') {
			return {
				ok: false,
				message: `Le lien contient une courbe qui ne se trace pas : « ${definition} ».`
			};
		}
		atelier.setPlotted(name, true);
	}
	return { ok: true, atelier };
}

/** Ce qu'une adresse ouvre : rien de particulier, un atelier reçu, ou un lien abîmé. */
export type OpenedLink =
	| { readonly kind: 'none' }
	| {
			readonly kind: 'received';
			readonly atelier: Atelier;
			readonly state: AtelierState;
			/** Ce qui n'a pas pu être relu, s'il y en a. */
			readonly notice: string | null;
	  }
	| { readonly kind: 'invalid'; readonly message: string };

/**
 * La porte UNIQUE des liens, pour `/atelier` et `/grapheur` (revue du lot 6,
 * B1 : « Partager » depuis `/grapheur` fabrique `/grapheur?a=…`, que la page
 * ne lisait pas — le camarade voyait son propre atelier, sans un mot).
 *
 * `?a=` porte un atelier entier (partage), `?f=` des courbes (projection).
 */
export async function openLink(params: URLSearchParams): Promise<OpenedLink> {
	const payload = params.get('a');
	if (payload !== null) {
		const decoded = await decodeAtelier(payload);
		if (!decoded.ok) return { kind: 'invalid', message: decoded.message };
		const atelier = new Atelier();
		const report = atelier.restore(decoded.state);
		const lost = decoded.dropped + report.skipped.length;
		return {
			kind: 'received',
			atelier,
			state: decoded.state,
			notice:
				lost === 0
					? null
					: `${lost} objet${lost > 1 ? 's' : ''} du lien n’${lost > 1 ? 'ont' : 'a'} pas pu être relu${lost > 1 ? 's' : ''}.`
		};
	}

	const curves = curvesFromLink(params);
	if (curves.kind === 'none') return { kind: 'none' };
	if (curves.kind === 'invalid') return { kind: 'invalid', message: curves.message };
	const built = atelierFromCurves(curves.definitions);
	if (!built.ok) return { kind: 'invalid', message: built.message };
	return {
		kind: 'received',
		atelier: built.atelier,
		state: built.atelier.serialize(),
		notice: null
	};
}
