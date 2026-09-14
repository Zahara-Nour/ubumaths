/**
 * Le plan d'un chapitre, tel que l'élève le voit
 *
 * Le professeur range ses ressources par MOMENT du cours ; l'élève doit lire
 * la même chose, dans le même ordre, sans onglet à choisir.
 *
 * ⚠️ Deux règles vivent ICI et non dans le composant, et c'est délibéré :
 *
 * 1. **Une section sans contenu n'est pas rendue.** Le titre d'une section est
 *    visible dès que le chapitre l'est, alors que les CONTENUS attendent leur
 *    `published_at`. Laisser ce filtre à l'affichage ferait d'une règle de
 *    confidentialité une question de gabarit — « Contrôle vendredi » comme nom
 *    de section fuiterait au premier composant qui oublie la condition.
 * 2. **Les questions de quiz d'une section forment UN quiz**, et ses objectifs
 *    UNE liste — chacun posé à la position de son premier élément. Sans ça,
 *    cinq questions donneraient cinq blocs, et `ChecklistSection`, qui est
 *    conçu pour une liste avec ses statistiques, serait détourné en ligne.
 *
 * @module server/chapter-plan
 */

import type { StudentWorksheetListItem } from '$lib/types/worksheets';
import type {
	ChapterSection,
	ChapterDocument,
	ChapterExercise,
	ChapterChecklistItem,
	ChapterQuizQuestion,
	ChapterQuizResult
} from '$lib/types/chapters';

export type ChecklistItemWithProgress = ChapterChecklistItem & {
	isCompleted: boolean;
	completedAt: string | null;
};

export type QuizQuestionWithResult = ChapterQuizQuestion & {
	bestResult: ChapterQuizResult | null;
	attemptsCount: number;
};

/**
 * Une fiche telle que `/api/student/worksheets` la rend.
 *
 * ⚠️ Le type COMPLET, et non un sous-ensemble : `WorksheetCard` affiche le
 * titre, la classe, l'échéance… Un type réduit ici compilait, mais faisait
 * échouer le composant à l'autre bout.
 */
export type StudentWorksheet = StudentWorksheetListItem;

/** Où chaque fiche est rangée, lu dans `chapter_worksheets`. */
export type WorksheetPlacement = { sectionId: string | null; sectionOrder: number };

export type PlanItem =
	| { kind: 'document'; document: ChapterDocument }
	| { kind: 'exercise'; exerciseId: string; title: string }
	| { kind: 'worksheet'; worksheet: StudentWorksheet }
	| { kind: 'checklist'; items: ChecklistItemWithProgress[] }
	| { kind: 'quiz'; questions: QuizQuestionWithResult[] };

export type PlanSection = {
	id: string;
	/** `null` pour « Non classé » : l'élève voit les ressources, pas l'étiquette. */
	title: string | null;
	items: PlanItem[];
};

/** Identifiant de la zone des ressources non rangées. */
export const UNASSIGNED_SECTION_ID = 'non-classe';

type Place<T> = { sectionId: string | null; order: number; value: T };

function place<T extends { sectionId: string | null; sectionOrder: number }>(
	valeurs: T[],
	fabrique: (v: T) => PlanItem
): Place<PlanItem>[] {
	return valeurs.map((v) => ({
		sectionId: v.sectionId,
		order: v.sectionOrder,
		value: fabrique(v)
	}));
}

export type BuildPlanInput = {
	sections: ChapterSection[];
	documents: ChapterDocument[];
	exercises: ChapterExercise[];
	checklistItems: ChecklistItemWithProgress[];
	quizQuestions: QuizQuestionWithResult[];
	worksheets: StudentWorksheet[];
	/** Titres des exercices, par identifiant d'exercice. */
	exerciseTitles: Record<string, { title: string }>;
	/** Rangement des fiches, par `worksheet_id`. */
	worksheetPlacements: Record<string, WorksheetPlacement>;
};

/**
 * Construit le plan lisible par l'élève.
 *
 * Tout ce qui entre ici a DÉJÀ passé la RLS : cette fonction range, elle ne
 * garde rien. Lui confier un filtre de publication serait une seconde vérité à
 * tenir à jour.
 */
export function buildChapterPlan(input: BuildPlanInput): PlanSection[] {
	const places: Place<PlanItem>[] = [
		...place(input.documents, (d) => ({ kind: 'document', document: d })),
		...place(input.exercises, (e) => ({
			kind: 'exercise',
			exerciseId: e.exerciseId,
			// Un exercice sans titre reste ouvrable : un libellé de repli vaut
			// mieux qu'une ligne muette.
			title: input.exerciseTitles[e.exerciseId]?.title ?? 'Exercice'
		})),
		...input.worksheets.map((w) => {
			const rangement = input.worksheetPlacements[w.worksheet_id];
			return {
				sectionId: rangement?.sectionId ?? null,
				order: rangement?.sectionOrder ?? 0,
				value: { kind: 'worksheet', worksheet: w } as PlanItem
			};
		})
	];

	// Quiz et objectifs se regroupent par section, chacun posé à la position de
	// son premier élément.
	function grouper<T extends { sectionId: string | null; sectionOrder: number }>(
		valeurs: T[],
		fabrique: (membres: T[]) => PlanItem
	) {
		const parSection = new Map<string | null, { order: number; membres: T[] }>();

		for (const v of valeurs) {
			const courant = parSection.get(v.sectionId);
			if (!courant) {
				parSection.set(v.sectionId, { order: v.sectionOrder, membres: [v] });
			} else {
				courant.order = Math.min(courant.order, v.sectionOrder);
				courant.membres.push(v);
			}
		}

		for (const [sectionId, bloc] of parSection) {
			places.push({
				sectionId,
				order: bloc.order,
				value: fabrique([...bloc.membres].sort((a, b) => a.sectionOrder - b.sectionOrder))
			});
		}
	}

	grouper(input.quizQuestions, (questions) => ({ kind: 'quiz', questions }));
	grouper(input.checklistItems, (items) => ({ kind: 'checklist', items }));

	const parSection = new Map<string | null, Place<PlanItem>[]>();
	for (const p of places) {
		const liste = parSection.get(p.sectionId);
		if (liste) liste.push(p);
		else parSection.set(p.sectionId, [p]);
	}

	const ordonner = (liste: Place<PlanItem>[]) =>
		[...liste].sort((a, b) => a.order - b.order).map((p) => p.value);

	const plan: PlanSection[] = [];

	for (const section of [...input.sections].sort((a, b) => a.displayOrder - b.displayOrder)) {
		const items = parSection.get(section.id);
		// Une section vide n'est pas rendue : un titre suivi de rien ressemble à
		// une panne, et « Bilan » en tête de chapitre annonce un contenu qui
		// n'existe pas encore.
		if (!items || items.length === 0) continue;
		plan.push({ id: section.id, title: section.title, items: ordonner(items) });
	}

	const nonClassees = parSection.get(null);
	if (nonClassees && nonClassees.length > 0) {
		// Sans titre : l'élève voit les ressources, pas l'étiquette du rangement
		// en cours du professeur.
		plan.push({ id: UNASSIGNED_SECTION_ID, title: null, items: ordonner(nonClassees) });
	}

	return plan;
}
