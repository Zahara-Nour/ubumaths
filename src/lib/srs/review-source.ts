/**
 * Source d'une séance de révision
 * ===============================
 *
 * L'écran de séance (`ReviewSession.svelte`) est le même pour un paquet (deck,
 * Programme) et pour le paquet CALCULÉ d'un chapitre (questions de cours,
 * étape 3). Seuls changent : l'adresse des questions dues, l'adresse et le
 * corps d'une réponse, et la forme des questions rendues par le serveur.
 *
 * Ce module traduit les deux réponses serveur en une même carte de séance —
 * l'écran ne connaît plus qu'elle.
 */

import { z } from 'zod';
import type { QuestionInstance } from '$lib/questions/types';
import { templateMarkdown, type TemplateMarkdown } from '$lib/ubumark/types/template';

// Types
export type ReviewSource =
	| {
			kind: 'deck';
			deckId: string;
			/** Filtre d'états FSRS (sections du Programme), ex. `learning,relearning` */
			states?: string;
			/** Révision forcée : échéance ignorée */
			all?: boolean;
	  }
	| { kind: 'chapter'; chapterId: string };

/** Une carte de la séance, quelle que soit sa source. */
export type SessionCard =
	| { key: string; kind: 'template'; instance: QuestionInstance }
	| { key: string; kind: 'custom'; frontContent: TemplateMarkdown; backContent: TemplateMarkdown };

export interface SessionPayload {
	cards: SessionCard[];
	/** Questions que le serveur n'a pas pu générer */
	skipped: number;
}

// Constantes
/** L'instance est générée par le serveur : seule sa forme d'objet est vérifiée ici. */
const instanceSchema = z.custom<QuestionInstance>(
	(value) => typeof value === 'object' && value !== null
);

/** `GET /api/srs/review/due` : une carte de paquet (modèle ou carte libre). */
const deckCardSchema = z.discriminatedUnion('cardType', [
	z.object({ cardId: z.string(), cardType: z.literal('template'), instance: instanceSchema }),
	z.object({
		cardId: z.string(),
		cardType: z.literal('custom'),
		frontContent: z.string(),
		backContent: z.string()
	})
]);

/** `GET /api/srs/chapters/[id]/due` : une question du paquet du chapitre. */
const chapterCardSchema = z.object({ templateId: z.string(), instance: instanceSchema });

// Functions

/** Adresse des questions dues de la séance. */
export function dueUrl(source: ReviewSource): string {
	if (source.kind === 'chapter') {
		return `/api/srs/chapters/${encodeURIComponent(source.chapterId)}/due`;
	}
	const params = new URLSearchParams({ deck_id: source.deckId });
	if (source.states) params.set('states', source.states);
	// Seul `'true'` active la révision forcée côté serveur
	if (source.all) params.set('all', 'true');
	return `/api/srs/review/due?${params.toString()}`;
}

/** Adresse et corps de la réponse à une carte. */
export function submitRequest(
	source: ReviewSource,
	card: SessionCard,
	grade: 1 | 2 | 3 | 4,
	timeSpent: number
): { url: string; body: Record<string, unknown> } {
	if (source.kind === 'chapter') {
		return {
			url: `/api/srs/chapters/${encodeURIComponent(source.chapterId)}/submit`,
			body: { templateId: card.key, grade, timeSpent }
		};
	}
	return {
		url: '/api/srs/review/submit',
		body: { cardId: card.key, deckId: source.deckId, grade, timeSpent }
	};
}

/**
 * Cartes de la séance depuis la réponse du serveur. Une carte mal formée est
 * comptée comme écartée plutôt que de faire planter l'écran.
 */
export function toSessionPayload(source: ReviewSource, payload: unknown): SessionPayload {
	const raw = typeof payload === 'object' && payload !== null ? payload : {};
	const rawCards: unknown[] =
		'cards' in raw && Array.isArray(raw.cards) ? (raw.cards as unknown[]) : [];
	const serverSkipped =
		'skipped' in raw && typeof raw.skipped === 'number' && raw.skipped > 0 ? raw.skipped : 0;

	const cards: SessionCard[] = [];
	let malformed = 0;
	for (const rawCard of rawCards) {
		const card = toSessionCard(source, rawCard);
		if (card) cards.push(card);
		else malformed++;
	}
	return { cards, skipped: serverSkipped + malformed };
}

function toSessionCard(source: ReviewSource, rawCard: unknown): SessionCard | null {
	if (source.kind === 'chapter') {
		const parsed = chapterCardSchema.safeParse(rawCard);
		return parsed.success
			? { key: parsed.data.templateId, kind: 'template', instance: parsed.data.instance }
			: null;
	}
	const parsed = deckCardSchema.safeParse(rawCard);
	if (!parsed.success) return null;
	if (parsed.data.cardType === 'template') {
		return { key: parsed.data.cardId, kind: 'template', instance: parsed.data.instance };
	}
	return {
		key: parsed.data.cardId,
		kind: 'custom',
		frontContent: templateMarkdown(parsed.data.frontContent),
		backContent: templateMarkdown(parsed.data.backContent)
	};
}
