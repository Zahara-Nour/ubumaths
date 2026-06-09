/**
 * Programme Deck Page Server
 *
 * Charge le deck auto-managé Programme de l'élève et regroupe ses cartes
 * en 4 sections automatiques calculées à la lecture depuis l'état FSRS.
 *
 * Cf. docs/wip/srs-fsrs-spec-tdd.md §8
 *     docs/wip/srs-fsrs-architecture-cible.md §3.4 + §5.2
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/middleware/auth';

export type ProgrammeBadge =
	| 'a_remedier'
	| 'a_renforcer'
	| 'en_apprentissage'
	| 'acquise_en_memoire';

export interface ProgrammeCard {
	cardId: string;
	templateId: string;
	templateName: string | null;
	objectiveName: string | null;
	objectiveId: string | null;
	state: 'new' | 'learning' | 'review' | 'relearning';
	nextReview: string | null;
	lastReview: string | null;
	badge: ProgrammeBadge;
}

export interface ProgrammeSection {
	badge: ProgrammeBadge;
	title: string;
	cards: ProgrammeCard[];
}

export interface ProgrammeData {
	deckId: string | null;
	exists: boolean;
	totalCards: number;
	sections: ProgrammeSection[];
}

const SECTION_ORDER: ProgrammeBadge[] = [
	'a_remedier',
	'a_renforcer',
	'en_apprentissage',
	'acquise_en_memoire'
];

const SECTION_TITLE: Record<ProgrammeBadge, string> = {
	a_remedier: 'À remédier',
	a_renforcer: 'À renforcer',
	en_apprentissage: 'En apprentissage',
	acquise_en_memoire: 'Acquise en mémoire'
};

function computeCardBadge(
	state: 'new' | 'learning' | 'review' | 'relearning',
	nextReview: string | null,
	nowMs: number
): ProgrammeBadge {
	if (!nextReview) return 'en_apprentissage';
	const nextMs = new Date(nextReview).getTime();
	const isDue = nextMs <= nowMs;
	const isLearning = state === 'learning' || state === 'relearning' || state === 'new';
	const isReview = state === 'review';

	if (isDue && isLearning) return 'a_remedier';
	if (isDue && isReview) return 'a_renforcer';
	if (!isDue && isReview) return 'acquise_en_memoire';
	return 'en_apprentissage';
}

export const load: PageServerLoad = async ({ locals }): Promise<ProgrammeData> => {
	const { user } = await requireAuth(locals);

	// 1. Récupérer le deck Programme (is_auto_managed=true)
	const { data: deck, error: deckErr } = await locals.supabase
		.from('srs_decks')
		.select('id')
		.eq('owner_id', user.id)
		.eq('is_auto_managed' as never, true as never)
		.maybeSingle();

	if (deckErr) {
		throw error(500, `Erreur deck Programme : ${deckErr.message}`);
	}

	const emptyResult: ProgrammeData = {
		deckId: null,
		exists: false,
		totalCards: 0,
		sections: SECTION_ORDER.map((b) => ({ badge: b, title: SECTION_TITLE[b], cards: [] }))
	};

	if (!deck) {
		return emptyResult;
	}

	// 2. Charger les cartes du deck (template_id non-null)
	const { data: cards, error: cardsErr } = await locals.supabase
		.from('srs_cards')
		.select('id, template_id')
		.eq('deck_id', deck.id)
		.eq('card_type', 'template');

	if (cardsErr) {
		throw error(500, `Erreur cartes : ${cardsErr.message}`);
	}

	if (!cards || cards.length === 0) {
		return { ...emptyResult, deckId: deck.id, exists: true };
	}

	const templateIds = cards.map((c) => c.template_id).filter((t): t is string => Boolean(t));

	// 3. Charger les srs_card_stats correspondants
	const { data: stats, error: statsErr } = await locals.supabase
		.from('srs_card_stats')
		.select('card_reference_id, state, next_review, last_review')
		.eq('user_id', user.id)
		.eq('card_reference_type', 'template')
		.in('card_reference_id', templateIds);

	if (statsErr) {
		throw error(500, `Erreur stats FSRS : ${statsErr.message}`);
	}

	const statsByTemplate = new Map<
		string,
		{
			state: 'new' | 'learning' | 'review' | 'relearning';
			next_review: string;
			last_review: string | null;
		}
	>();
	for (const s of stats ?? []) {
		statsByTemplate.set(s.card_reference_id, {
			state: s.state as 'new' | 'learning' | 'review' | 'relearning',
			next_review: s.next_review,
			last_review: s.last_review
		});
	}

	// 4. Charger les métadonnées des templates (objectif via M2M skills)
	const { data: templates, error: tmplErr } = await locals.supabase
		.from('question_templates')
		.select('id, subdomain')
		.in('id', templateIds);

	if (tmplErr) {
		throw error(500, `Erreur templates : ${tmplErr.message}`);
	}

	const templateNameById = new Map<string, string>();
	for (const t of templates ?? []) {
		templateNameById.set(t.id, t.subdomain ?? '');
	}

	// 5. Charger les objectifs associés via question_template_skills → skills → skill_objectives
	const { data: links, error: linksErr } = await locals.supabase
		.from('question_template_skills')
		.select('template_id, skills!inner(objective_id, skill_objectives(id, name))')
		.in('template_id', templateIds);

	if (linksErr) {
		throw error(500, `Erreur tagging : ${linksErr.message}`);
	}

	type LinkRow = {
		template_id: string;
		skills: {
			objective_id: string | null;
			skill_objectives: { id: string; name: string } | null;
		} | null;
	};
	const objectiveByTemplate = new Map<string, { id: string; name: string }>();
	for (const l of (links ?? []) as unknown as LinkRow[]) {
		const obj = l.skills?.skill_objectives;
		if (obj && !objectiveByTemplate.has(l.template_id)) {
			objectiveByTemplate.set(l.template_id, { id: obj.id, name: obj.name });
		}
	}

	// 6. Construire les ProgrammeCard et regrouper par section
	const nowMs = Date.now();
	const sectionMap = new Map<ProgrammeBadge, ProgrammeCard[]>();
	for (const b of SECTION_ORDER) sectionMap.set(b, []);

	for (const c of cards) {
		const tid = c.template_id;
		if (!tid) continue;
		const stat = statsByTemplate.get(tid);
		const state = stat?.state ?? 'new';
		const nextReview = stat?.next_review ?? null;
		const lastReview = stat?.last_review ?? null;
		const badge = computeCardBadge(state, nextReview, nowMs);
		const obj = objectiveByTemplate.get(tid) ?? null;

		const card: ProgrammeCard = {
			cardId: c.id,
			templateId: tid,
			templateName: templateNameById.get(tid) ?? null,
			objectiveName: obj?.name ?? null,
			objectiveId: obj?.id ?? null,
			state,
			nextReview,
			lastReview,
			badge
		};
		sectionMap.get(badge)?.push(card);
	}

	// Tri intra-section : carte la plus en retard (next_review ascendant) en premier
	for (const cards of sectionMap.values()) {
		cards.sort((a, b) => {
			const aMs = a.nextReview ? new Date(a.nextReview).getTime() : 0;
			const bMs = b.nextReview ? new Date(b.nextReview).getTime() : 0;
			return aMs - bMs;
		});
	}

	const sections: ProgrammeSection[] = SECTION_ORDER.map((b) => ({
		badge: b,
		title: SECTION_TITLE[b],
		cards: sectionMap.get(b) ?? []
	}));

	return {
		deckId: deck.id,
		exists: true,
		totalCards: cards.length,
		sections
	};
};
