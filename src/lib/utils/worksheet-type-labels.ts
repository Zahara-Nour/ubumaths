/**
 * Libellé de chaque type de fiche — la seule table
 * ================================================
 *
 * L'écran (prof et élève) et le PDF français lisent tous ici. La table était
 * recopiée neuf fois, avec des variantes (« Feuille », « Fiche de travail »,
 * « Corvées Domestiques », « Décervelage ») : décision de David du 2026-10-12,
 * langage courant partout, le lore reste dans les textes d'ambiance.
 *
 * Module sans dépendance : le générateur Typst l'importe sans tirer d'icônes.
 */
import type { WorksheetType } from '$lib/types/worksheets';

export const WORKSHEET_TYPE_LABELS: Record<WorksheetType, string> = {
	worksheet: "Fiche d'exercices",
	assessment: 'Contrôle',
	exam: 'Examen',
	quiz: 'Quiz',
	homework: 'Devoirs'
};

/** Ordre d'affichage des types dans les listes de choix. */
export const WORKSHEET_TYPE_ORDER: readonly WorksheetType[] = [
	'worksheet',
	'assessment',
	'exam',
	'quiz',
	'homework'
];
