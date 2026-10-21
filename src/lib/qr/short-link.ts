/**
 * Le lien court d'une adresse du site, demandé au serveur (`POST /api/short-links`)
 * ===============================================================================
 *
 * Pour le QR code d'une série : son lien porte toute la composition et dépasse
 * toujours ce qu'un QR lisible contient. Prof et admin seulement.
 * Phase 0 : `docs/wip/liens-courts-phase0.md`.
 *
 * @module qr/short-link
 */

import { z } from 'zod';
import { SHORT_LINK_CODE, shortLinkPath } from '$lib/validation/short-link';

// ============================================================================
// CONSTANTES
// ============================================================================

const responseSchema = z.object({ code: z.string().regex(SHORT_LINK_CODE) });

// ============================================================================
// FONCTIONS
// ============================================================================

/**
 * `/l/<code>` pour `target` (chemin du site, avec sa requête). Rejette si le
 * serveur refuse ou ne répond pas : l'appelant propose alors le lien long.
 */
export async function fetchShortLinkPath(target: string): Promise<string> {
	const response = await fetch('/api/short-links', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ target })
	});
	if (!response.ok) throw new Error(`Lien court refusé (${response.status})`);

	const body = responseSchema.safeParse(await response.json());
	if (!body.success) throw new Error('Lien court illisible');
	return shortLinkPath(body.data.code);
}
