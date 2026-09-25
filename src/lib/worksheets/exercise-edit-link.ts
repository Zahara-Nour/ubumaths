/**
 * Aller-retour entre l'édition d'une fiche et l'édition d'un de ses exercices
 *
 * Le bouton « Modifier l'exercice » d'une ligne de fiche ouvre l'exercice dans le
 * même onglet, en passant la fiche d'origine dans `?fiche=` ; la page de
 * l'exercice en tire un bouton « Retour à la fiche ». Ce paramètre vient de
 * l'URL : seul un UUID est accepté, jamais un chemin ni une adresse.
 */
import { z } from 'zod';

export const WORKSHEET_RETURN_PARAM = 'fiche';

const worksheetIdSchema = z.string().uuid();

/** Page d'édition de l'exercice, en retenant la fiche d'où l'on vient. */
export function exerciseEditHref(exerciseId: string, worksheetId: string): string {
	return `/dashboard/teacher/contenu/exercices/${exerciseId}?${WORKSHEET_RETURN_PARAM}=${worksheetId}`;
}

/** Page d'édition de la fiche d'origine, ou null si `?fiche=` est absent ou invalide. */
export function worksheetReturnHref(searchParams: URLSearchParams): string | null {
	const parsed = worksheetIdSchema.safeParse(searchParams.get(WORKSHEET_RETURN_PARAM));
	return parsed.success ? `/dashboard/teacher/contenu/worksheets/${parsed.data}` : null;
}
