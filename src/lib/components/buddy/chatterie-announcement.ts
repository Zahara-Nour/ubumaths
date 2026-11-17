/**
 * Ce que le Palotin, gardien de la Chatterie, a à en dire
 * ========================================================
 *
 * Les nouveautés d'abord (naissance, croissance, étoile : celles qu'aucun écran
 * de fin de séance n'a montrées), sinon les Mathoux en sieste. Une nouveauté
 * n'est rendue qu'une fois par le serveur : la lire, c'est la consommer.
 *
 * Demandé APRÈS l'affichage : le calcul de la collection n'alourdit pas les
 * chargements. Partagé par la maison (`BuddyWidget`) et les passages
 * (`PalotinPresence`).
 */

import { resolve } from '$app/paths';
import type { BuddyExpression } from '$lib/types/buddy';
import { nappingPhrase } from '$lib/mathoux/collection-logic';
import { mathouxSummarySchema } from '$lib/mathoux/summary';
import { newsSummaryPhrase } from '$lib/mathoux/news';

// Types
export interface ChatterieAnnouncement {
	/** `news` : passage important ; `napping` : passage spontané (soumis au plafond) */
	kind: 'news' | 'napping';
	message: string;
	expression: BuddyExpression;
}

// Constantes
export const CHATTERIE_HREF = resolve('/dashboard/student/chatterie');
export const CHATTERIE_LINK = { href: CHATTERIE_HREF, label: 'Aller à la Chatterie' };

// Functions
/** L'annonce, ou `null` si rien à dire, ou si la réponse est en échec ou inattendue. */
export async function fetchChatterieAnnouncement(): Promise<ChatterieAnnouncement | null> {
	try {
		const response = await fetch('/api/student/mathoux');
		if (!response.ok) return null;
		const parsed = mathouxSummarySchema.safeParse(await response.json());
		if (!parsed.success) return null;
		const news = newsSummaryPhrase(parsed.data.news);
		if (news) return { kind: 'news', message: news, expression: 'happy' };
		const { napping } = parsed.data;
		return napping > 0
			? { kind: 'napping', message: `${nappingPhrase(napping)}.`, expression: 'thinking' }
			: null;
	} catch {
		return null;
	}
}
