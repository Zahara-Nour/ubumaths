/**
 * Programme Deck Page Server
 *
 * Charge le deck auto-managé Programme de l'élève et regroupe ses cartes
 * en 4 sections automatiques calculées à la lecture depuis l'état FSRS.
 *
 * Cf. docs/wip/srs-fsrs-spec-tdd.md §8
 *     docs/ref/srs/architecture.md §3.4 + §5.2
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/middleware/auth';
import { templateToBadge } from '$lib/server/srs/capacity-badge';

/**
 * Sous-ensemble des CapacityBadge utilisé côté Programme : un template seul
 * n'est jamais `non_commencee` (sinon il ne serait pas dans le deck).
 */
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

/**
 * Convertit un badge calculé par `templateToBadge` (peut être `non_commencee`)
 * en un ProgrammeBadge. Garde-fou : `non_commencee` ne devrait jamais arriver
 * ici (une carte du Programme a forcément un état FSRS), mais on retombe
 * sur `en_apprentissage` par sécurité.
 */
function toProgrammeBadge(b: ReturnType<typeof templateToBadge>): ProgrammeBadge {
	return b === 'non_commencee' ? 'en_apprentissage' : b;
}

export const load: PageServerLoad = async ({ locals }): Promise<ProgrammeData> => {
	const { user } = await requireAuth(locals);

	// 1. Récupérer le deck Programme (is_auto_managed=true)
	const { data: deck, error: deckErr } = await locals.supabase
		.from('srs_decks')
		.select('id')
		.eq('owner_id', user.id)
		.eq('is_auto_managed', true)
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

	// 3+4+5 — Les 3 SELECT sont indépendants une fois templateIds connu.
	// Parallélisation P1 (économise ≈ 90-180 ms latence Vercel→Supabase).
	const [statsRes, templatesRes, linksRes] = await Promise.all([
		locals.supabase
			.from('srs_card_stats')
			.select('card_reference_id, state, next_review, last_review')
			.eq('user_id', user.id)
			.eq('card_reference_type', 'template')
			.in('card_reference_id', templateIds),
		locals.supabase.from('question_templates').select('id, subdomain').in('id', templateIds),
		locals.supabase
			.from('question_template_points')
			.select(
				'template_id, curriculum_points!inner(objective_id, curriculum_objectives!inner(id, name, display_order))'
			)
			.in('template_id', templateIds)
			// Cast nécessaire : Supabase JS ne type pas la syntaxe d'ordre sur jointure nested.
			.order('curriculum_objectives(display_order)' as never, { ascending: true })
	]);

	if (statsRes.error) throw error(500, `Erreur stats FSRS : ${statsRes.error.message}`);
	if (templatesRes.error) throw error(500, `Erreur templates : ${templatesRes.error.message}`);
	if (linksRes.error) throw error(500, `Erreur tagging : ${linksRes.error.message}`);

	const stats = statsRes.data;
	const templates = templatesRes.data;
	const links = linksRes.data;

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

	const templateNameById = new Map<string, string>();
	for (const t of templates ?? []) {
		templateNameById.set(t.id, t.subdomain ?? '');
	}

	type LinkRow = {
		template_id: string;
		curriculum_points: {
			objective_id: string;
			curriculum_objectives: { id: string; name: string; display_order: number } | null;
		} | null;
	};
	const objectiveByTemplate = new Map<string, { id: string; name: string }>();
	// On garde le 1er objectif rencontré (le plus petit display_order grâce au tri ci-dessus)
	for (const l of (links ?? []) as unknown as LinkRow[]) {
		const obj = l.curriculum_points?.curriculum_objectives;
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
		const badge = toProgrammeBadge(templateToBadge(state, nextReview, nowMs));
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
