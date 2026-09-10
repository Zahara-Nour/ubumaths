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
 * PÉRIMÈTRE : l'ÉCOLE DE LA FICHE. Le professeur unique enseigne dans plusieurs
 * écoles ; une fiche appartient à l'une d'elles, et l'avertissement ne montre
 * que les séances des classes de cette école-là. L'école est la frontière
 * sociale de l'application, et un panneau qui nommerait la classe et la date
 * d'une séance de l'autre école la franchirait — pour un simple avertissement.
 *
 * @module server/worksheets/citations
 */

import { extractResourceReferences } from '$lib/resources/references';
import type { WorksheetCitation, WorksheetCitationsReport } from '$lib/types/worksheets';
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
 * Ne lève jamais : on ne fait pas échouer l'édition d'une fiche pour un
 * avertissement. Une lecture impossible rend `verifie: false`, que l'appelant
 * doit distinguer d'une absence de citation — sans quoi la garde se tait quand
 * elle devrait dire qu'elle ne sait pas.
 */
export async function fetchWorksheetCitations(
	supabase: Sb,
	worksheetId: string
): Promise<WorksheetCitationsReport> {
	// Un identifiant hors forme ne désigne aucune fiche : il n'y a rien à
	// vérifier, et c'est un état connu — pas une panne.
	if (!UUID.test(worksheetId)) return { citations: [], verifie: true };

	// L'extracteur rend les identifiants EN MINUSCULES, et un uuid s'écrit dans
	// les deux casses : comparer la forme reçue telle quelle ferait une liste
	// vide, donc un avertissement muet, sur une simple différence d'écriture.
	const cible = worksheetId.toLowerCase();

	// Le `#` FAIT PARTIE du motif SQL, et c'est un point de correction, pas une
	// optimisation. Sans lui, la présélection retenait aussi les citations de la
	// fiche entière — de loin les plus nombreuses — et la troncature à
	// `MAX_CITATIONS` s'appliquait AVANT le tri : une fiche liée chaque semaine
	// dans le cahier remplissait la fenêtre de bruit récent, et la seule séance
	// qui la citait par numéro tombait dehors. Le panneau se taisait précisément
	// dans le cas pour lequel il existe.
	//
	// La grammaire colle le `#` à l'uuid (`REFERENCE_REGEX`), donc le motif ne
	// peut pas rater une sélection. Il peut en revanche retenir un faux positif —
	// un `#` écrit à la main derrière un identifiant —, et c'est voulu : le tri
	// fin reste à `extractResourceReferences`, LA grammaire, celle qui sert déjà
	// à la couverture du programme. Deux reconnaissances concurrentes de la même
	// syntaxe finiraient par diverger.
	const motif = `%worksheet:${cible}#%`;

	// L'école de la fiche fixe le périmètre. Résolue ici plutôt que reçue de
	// l'appelant : la page charge la fiche par l'API, en parallèle de cet appel,
	// et attendre sa réponse rendrait les deux lectures séquentielles.
	const { data: fiche, error: ficheError } = await supabase
		.from('worksheets')
		.select('school_id')
		.eq('id', cible)
		.maybeSingle();

	if (ficheError) {
		console.error('[worksheet-citations] fiche illisible:', ficheError);
		return { citations: [], verifie: false };
	}

	// Fiche introuvable, ou rattachée à aucune école : le périmètre n'a pas de
	// sens, et on ne le remplace pas par « toutes les écoles ». Dire qu'on n'a
	// pas pu vérifier est la seule réponse honnête — se taire laisserait croire
	// que personne ne cite la fiche.
	if (!fiche?.school_id) return { citations: [], verifie: false };

	// DEUX balayages, parce que la citation peut vivre à deux endroits : dans le
	// contenu de la séance, ou dans l'un de ses travaux à faire — qui sont des
	// lignes d'une table fille depuis qu'une séance peut en porter plusieurs.
	// Un seul `ilike` sur `class_journal_entries` raterait le second cas en
	// silence, et le panneau se tairait sur des séances qui citent bien la fiche.
	const [{ data, error }, { data: travaux, error: travauxError }] = await Promise.all([
		supabase
			.from('class_journal_entries')
			.select(
				'id, class_id, entry_date, lesson_content, homework_content, classes!inner(name, school_id)'
			)
			.eq('classes.school_id', fiche.school_id)
			.or(`lesson_content.ilike.${motif},homework_content.ilike.${motif}`)
			.order('entry_date', { ascending: false })
			.limit(MAX_CITATIONS),
		supabase
			.from('journal_entry_homework')
			.select(
				'content, class_journal_entries!inner(id, class_id, entry_date, classes!inner(name, school_id))'
			)
			.eq('class_journal_entries.classes.school_id', fiche.school_id)
			.ilike('content', motif)
			// L'ordre AVANT la troncature, exactement pour la raison décrite plus
			// haut : sans lui, Postgres rend cinquante lignes arbitraires, et le tri
			// par date qui suit ne peut plus rattraper ce qui a été jeté. Le panneau
			// se tairait alors précisément dans le cas pour lequel il existe.
			.order('class_journal_entries(entry_date)', { ascending: false })
			.limit(MAX_CITATIONS)
	]);

	if (error) {
		console.error('[worksheet-citations] cahier illisible:', error);
		return { citations: [], verifie: false };
	}

	// Le second balayage manque : dire « aucune citation » serait affirmer plus
	// qu'on ne sait. `verifie: false` est la seule réponse honnête.
	if (travauxError) {
		console.error('[worksheet-citations] travaux illisibles:', travauxError);
		return { citations: [], verifie: false };
	}

	// Les contenus des deux sources sont regroupés PAR SÉANCE avant extraction :
	// une fiche citée à la fois dans le cours et dans un devoir est une seule
	// ligne du panneau, pas deux.
	const contenusParSeance = new Map<
		string,
		{ classId: string; className: string; entryDate: string; contenus: (string | null)[] }
	>();

	for (const entry of data ?? []) {
		contenusParSeance.set(entry.id, {
			classId: entry.class_id,
			className: entry.classes.name,
			entryDate: entry.entry_date,
			contenus: [entry.lesson_content, entry.homework_content]
		});
	}

	for (const travail of travaux ?? []) {
		const seance = travail.class_journal_entries;
		const existante = contenusParSeance.get(seance.id);
		if (existante) {
			existante.contenus.push(travail.content);
			continue;
		}
		contenusParSeance.set(seance.id, {
			classId: seance.class_id,
			className: seance.classes.name,
			entryDate: seance.entry_date,
			contenus: [travail.content]
		});
	}

	// Le tri se refait ici : deux requêtes bornées séparément ne sortent pas
	// triées l'une par rapport à l'autre, et le panneau annonce « de la plus
	// récente à la plus ancienne ».
	const seances = [...contenusParSeance.entries()]
		.sort(([, a], [, b]) => b.entryDate.localeCompare(a.entryDate))
		.slice(0, MAX_CITATIONS);

	const citations: WorksheetCitation[] = [];

	for (const [entryId, entry] of seances) {
		const decrites = extractResourceReferences(...entry.contenus)
			.filter((reference) => reference.kind === 'worksheet' && reference.id === cible)
			.map((reference) => parseExerciseSelection(reference.selection))
			.filter((numeros) => numeros.length > 0)
			.map(describeExerciseSelection);

		// Dédoublonné APRÈS mise en forme : le dédoublonnage de l'extracteur porte
		// sur la sélection telle qu'écrite, et `#3-5` puis `#3,4,5` sont deux
		// écritures distinctes du même ensemble. Sans ceci, la ligne afficherait
		// « ex. 3 à 5 · ex. 3 à 5 ».
		const selections = [...new Set(decrites)];

		if (selections.length === 0) continue;

		citations.push({
			entryId,
			classId: entry.classId,
			className: entry.className,
			entryDate: entry.entryDate,
			selections
		});
	}

	return { citations, verifie: true };
}
