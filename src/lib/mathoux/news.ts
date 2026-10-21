/**
 * Nouveautés de la Chatterie — annonce en fin de séance (Mathoux v1.2)
 * ====================================================================
 *
 * Spec validée par David le 2026-10-21 (docs/wip/mathoux-annonce-progress.md).
 * Une nouveauté = un Mathou que CE calcul a fait entrer dans la mémoire
 * (`student_mathoux`) ou y a fait progresser :
 *   - naissance : aucune ligne avant ;
 *   - croissance : stade au-dessus du stade mémorisé (étoiles jointes) ;
 *   - étoile : seulement de nouvelles étoiles.
 * Le genre se lit contre la ligne que CE calcul a remplacée (rendue par
 * `rememberMathoux`), pas contre la mémoire lue avant lui : un autre calcul (la
 * page, un autre onglet) a pu écrire entre-temps et annoncer sa part. Une
 * nouveauté n'est jamais annoncée deux fois.
 *
 * Logique pure, importable au client (carte de fin de séance, bulle du Palotin).
 */

import {
	bestGrowth,
	starGradeLabel,
	type MathouCollection,
	type MathouMemory,
	type MathouStage
} from './collection-logic';

// Types
export type MathouNewsKind = 'birth' | 'growth' | 'wake' | 'star';

export interface MathouNewsItem {
	kind: MathouNewsKind;
	notionId: string;
	name: string;
	raceIndex: number;
	/** Stade atteint. */
	stage: MathouStage;
	/** Croissance seulement : le stade de la ligne remplacée (le dessin se transforme depuis lui). */
	previousStage?: MathouStage;
	/** Codes de niveau étoilés par ce calcul (absents de la mémoire lue). */
	newStars: string[];
}

export interface MathouNews {
	/** Mémoire vide avant ce calcul : premier passage de l'élève. */
	firstVisit: boolean;
	/** Toutes les nouveautés, au-delà de celles détaillées dans `items`. */
	total: number;
	/** Les `MAX_NEWS_ITEMS` premières : naissances, puis croissances, puis étoiles. */
	items: MathouNewsItem[];
}

// Constantes
/** Nouveautés détaillées au plus ; le reste se dit « et N autres ». */
export const MAX_NEWS_ITEMS = 3;

const KIND_ORDER: Record<MathouNewsKind, number> = { birth: 0, growth: 1, wake: 2, star: 3 };

const STAGE_NOUN: Record<MathouStage, string> = {
	chaton: 'chaton',
	matou: 'matou',
	grand_matou: 'grand matou'
};

export const NO_NEWS: MathouNews = { firstVisit: false, total: 0, items: [] };

// Functions
/**
 * Nouveautés d'un calcul.
 *
 * @param memory la mémoire lue AVANT le calcul (vide : premier passage).
 * @param written notions dont ce calcul a réellement écrit la ligne, avec la
 *   ligne qu'il a remplacée (`null` : insérée).
 */
export function mathouNews(
	collection: MathouCollection,
	memory: ReadonlyMap<string, MathouMemory>,
	written: ReadonlyMap<string, MathouMemory | null>
): MathouNews {
	const news: MathouNewsItem[] = [];
	for (const mathou of collection.races.flatMap((race) => race.mathoux)) {
		if (mathou.growth === 'a_decouvrir' || !written.has(mathou.notionId)) continue;
		const stage = mathou.growth;
		const have = written.get(mathou.notionId);
		const newStars = mathou.stars.filter((grade) => !have?.starredGrades.includes(grade));
		let kind: MathouNewsKind | null;
		if (!have) kind = 'birth';
		else if (bestGrowth<MathouStage>(have.bestStage, stage) !== have.bestStage) kind = 'growth';
		// Réveil : il dormait au calcul précédent ; jamais pour un Mathou de la seule mémoire
		else if (have.asleep && !mathou.asleep && mathou.workablePoints > 0) kind = 'wake';
		else kind = newStars.length > 0 ? 'star' : null;
		if (!kind) continue;
		news.push({
			kind,
			notionId: mathou.notionId,
			name: mathou.name,
			raceIndex: mathou.raceIndex,
			stage,
			...(kind === 'growth' && have ? { previousStage: have.bestStage } : {}),
			newStars
		});
	}
	// Tri stable : à genre égal, l'ordre de la collection
	news.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
	return {
		firstVisit: memory.size === 0 && news.length > 0,
		total: news.length,
		items: news.slice(0, MAX_NEWS_ITEMS)
	};
}

/** Majuscule initiale (« le Mathou des Fractions » en tête de phrase). */
function capitalize(text: string): string {
	return text.charAt(0).toLocaleUpperCase('fr') + text.slice(1);
}

/** « Un chaton est né à la Chatterie : Pile-Poil ! », etc. */
export function newsItemPhrase(item: MathouNewsItem): string {
	const noun = STAGE_NOUN[item.stage];
	switch (item.kind) {
		case 'birth':
			return item.stage === 'chaton'
				? `Un chaton est né à la Chatterie : ${item.name} !`
				: `Un ${noun} est arrivé à la Chatterie : ${item.name} !`;
		case 'growth':
			return `${capitalize(item.name)} est devenu un ${noun} !`;
		case 'wake':
			return `${capitalize(item.name)} s’est réveillé !`;
		case 'star': {
			const stars = item.newStars.map((grade) => `★ ${starGradeLabel(grade)}`).join(' ');
			const word = item.newStars.length > 1 ? 'les étoiles' : 'l’étoile';
			return `${capitalize(item.name)} gagne ${word} ${stars} !`;
		}
	}
}

/** « Et 1 autre nouveauté à la Chatterie. » / « Et 4 autres nouveautés à la Chatterie. » */
export function moreNewsPhrase(count: number): string {
	return count === 1
		? 'Et 1 autre nouveauté à la Chatterie.'
		: `Et ${count} autres nouveautés à la Chatterie.`;
}

/** Premier passage avec plusieurs Mathoux : une seule phrase, pas une liste. */
export function isFirstVisitGroup(news: MathouNews): boolean {
	return news.firstVisit && news.total > 1;
}

/** « 7 Mathoux t’attendent à la Chatterie ! » */
export function firstVisitPhrase(total: number): string {
	return `${total} Mathoux t’attendent à la Chatterie !`;
}

/** Une phrase pour la bulle du Palotin ; `null` s'il n'y a rien à dire. */
export function newsSummaryPhrase(news: MathouNews): string | null {
	if (news.total === 0 || news.items.length === 0) return null;
	if (isFirstVisitGroup(news)) return firstVisitPhrase(news.total);
	const first = newsItemPhrase(news.items[0]);
	return news.total > 1 ? `${first} ${moreNewsPhrase(news.total - 1)}` : first;
}
