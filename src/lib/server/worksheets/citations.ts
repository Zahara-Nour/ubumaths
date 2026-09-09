/**
 * Quelles séances citent cette fiche PAR NUMÉRO d'exercice.
 * =========================================================
 *
 * `[[worksheet:<uuid>#3,5-7]]` désigne des NUMÉROS, pas des identifiants :
 * réordonner la fiche change donc ce que la séance désigne. C'est un choix
 * assumé — « les exercices 3 et 4 de la fiche » parle du document que l'élève a
 * sous les yeux — mais un choix qui doit se voir.
 *
 * Ce module existe pour ça : le professeur qui réorganise sa fiche doit
 * apprendre, sur la page où il la réorganise, que trois séances la citent par
 * numéro, à quelles dates et dans quelles classes. Sans cette liste, la
 * conséquence est invisible jusqu'à ce qu'un élève fasse le mauvais exercice.
 *
 * Une fiche citée SANS sélection est ignorée ici : elle ne désigne aucun
 * exercice en particulier, donc rien ne peut la casser.
 *
 * @module server/worksheets/citations
 */

import { extractResourceReferences } from '$lib/resources/references';
import type { WorksheetCitation } from '$lib/types/worksheets';
import {
	describeExerciseSelection,
	parseExerciseSelection
} from '$lib/resources/exercise-selection';

type Sb = App.Locals['supabase'];

/** Forme canonique exigée avant d'entrer dans un filtre PostgREST. */
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

/**
 * Borne de sûreté sur le balayage du cahier.
 *
 * Volontairement large : une fiche citée par cinquante séances n'existe pas, et
 * la borne ne doit jamais faire SOUS-COMPTER l'avertissement — le panneau
 * annonce le nombre de séances qu'il liste.
 */
const MAX_CITATIONS = 50;

/**
 * Les séances citant cette fiche par numéro, de la plus récente à la plus ancienne.
 *
 * @returns une liste vide si le cahier est illisible — la page reste utilisable,
 *          elle avertit seulement moins. Ne jamais faire échouer l'édition d'une
 *          fiche pour un avertissement.
 */
export async function fetchWorksheetCitations(
	supabase: Sb,
	worksheetId: string
): Promise<WorksheetCitation[]> {
	if (!UUID.test(worksheetId)) return [];

	// L'extracteur rend les identifiants EN MINUSCULES, et un uuid s'écrit dans
	// les deux casses : comparer la forme reçue telle quelle ferait une liste
	// vide, donc un avertissement muet, sur une simple différence d'écriture.
	const cible = worksheetId.toLowerCase();

	// On présélectionne en SQL sur l'uuid seul, sans le `#` : le tri entre « citée
	// avec sélection » et « citée tout court » est fait plus bas par
	// `extractResourceReferences`, c'est-à-dire par LA grammaire, celle qui sert
	// déjà à la couverture du programme. Deux reconnaissances concurrentes de la
	// même syntaxe finiraient par diverger.
	const motif = `%worksheet:${cible}%`;

	const { data, error } = await supabase
		.from('class_journal_entries')
		.select('id, class_id, entry_date, lesson_content, homework_content, classes(name)')
		.or(`lesson_content.ilike.${motif},homework_content.ilike.${motif}`)
		.order('entry_date', { ascending: false })
		.limit(MAX_CITATIONS);

	if (error) {
		console.error('[worksheet-citations] cahier illisible:', error);
		return [];
	}

	const citations: WorksheetCitation[] = [];

	for (const entry of data ?? []) {
		const selections = extractResourceReferences(entry.lesson_content, entry.homework_content)
			.filter((reference) => reference.kind === 'worksheet' && reference.id === cible)
			.map((reference) => parseExerciseSelection(reference.selection))
			.filter((numeros) => numeros.length > 0)
			.map(describeExerciseSelection);

		if (selections.length === 0) continue;

		citations.push({
			entryId: entry.id,
			classId: entry.class_id,
			className: entry.classes?.name ?? 'Classe inconnue',
			entryDate: entry.entry_date,
			selections
		});
	}

	return citations;
}
