/**
 * Un chapitre a-t-il de quoi faire un modèle ?
 *
 * Un chapitre vide ne fait pas un modèle (le serveur refuse de publier un modèle
 * vide). Depuis l'ADR 0029, le modèle emporte TOUT le contenu du chapitre,
 * séries comprises — comme `templateHasContent` côté serveur. (La règle Q128, qui
 * excluait les séries, venait de l'ancien modèle « snapshot ».)
 */
export function chapterHasTemplateContent(counts: {
	documents: number;
	checklistItems: number;
	exercises: number;
	worksheets: number;
	series: number;
}): boolean {
	return (
		counts.documents +
			counts.checklistItems +
			counts.exercises +
			counts.worksheets +
			counts.series >
		0
	);
}
