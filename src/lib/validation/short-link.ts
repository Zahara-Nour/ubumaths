/**
 * Liens courts des QR codes (`/l/<code>`)
 * ======================================
 *
 * Les mêmes règles que la migration `20261019170000_liens_courts` : la base
 * reste le filet, Zod donne le refus 400 en français avant d'y aller.
 * Phase 0 : `docs/wip/liens-courts-phase0.md`.
 *
 * @module validation/short-link
 */

import { z } from 'zod';

// ============================================================================
// CONSTANTES
// ============================================================================

/** 8 caractères, sans les ambigus 0 O o 1 l I (contrainte `short_links_code_shape`) */
export const SHORT_LINK_CODE = /^[a-km-np-zA-HJ-NP-Z2-9]{8}$/;

/** Longueur maximale de la cible (contrainte `short_links_target_internal`) */
export const SHORT_LINK_TARGET_MAX = 16384;

/**
 * Les seules cibles acceptées : un lien de série (`buildSeriesLink`), panier ou
 * forme lancée, avec sa requête. Décision de David (2026-10-19) : un QR Chiphre
 * mène à une série et à rien d'autre. Un autre usage ajoutera son préfixe ici.
 * La base, elle, n'exige qu'un chemin interne (filet).
 */
const SERIES_TARGET = /^\/automaths\/(?:panier|test)\?/;

/** Le chemin du lien court, sans origine */
export const SHORT_LINK_PREFIX = '/l/';

// ============================================================================
// SCHÉMAS
// ============================================================================

const TARGET_ERROR = 'Un lien court mène à une adresse du site';

/**
 * Un chemin INTERNE du site : sinon `chiph.re/l/…` serait une redirection
 * ouverte. `//hote` et `/\hote` mènent à un autre domaine dans un navigateur.
 * ASCII imprimable seulement : ni espace ni contrôle (en-tête `Location`), ni
 * Unicode (« ∕ » U+2215 ressemble à `/`).
 */
export const shortLinkTargetSchema = z
	.string({ error: TARGET_ERROR })
	.max(SHORT_LINK_TARGET_MAX, { error: 'Ce lien est trop long, même pour un lien court' })
	.regex(/^\/[!-~]*$/, { error: TARGET_ERROR })
	.refine((target) => !target.startsWith('//') && !target.includes('\\'), {
		error: TARGET_ERROR
	})
	.refine((target) => SERIES_TARGET.test(target), {
		error: 'Un lien court mène seulement à une série'
	});

export const createShortLinkSchema = z.object({ target: shortLinkTargetSchema }).strict();

export const shortLinkCodeSchema = z.string().regex(SHORT_LINK_CODE);

// ============================================================================
// FONCTIONS
// ============================================================================

/** `/l/<code>` */
export function shortLinkPath(code: string): string {
	return `${SHORT_LINK_PREFIX}${code}`;
}
