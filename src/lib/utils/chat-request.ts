/**
 * Corps de la requête du chat libre (`ChatBot` → POST /api/chat).
 *
 * Le navigateur NOMME la personnalité ; le serveur pose lui-même son prompt
 * système (`api/chat/+server.ts`). Un tour `system` venu du client est refusé
 * depuis H11 : il remplacerait les consignes du serveur.
 */

import type { PersonalityKey } from '$lib/config/personalities';

type ChatContentPart =
	{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };

export interface ChatTurn {
	role: 'user' | 'assistant';
	content: string | ChatContentPart[];
}

// Contexte envoyé au modèle : les derniers messages seulement.
const MAX_CONTEXT_MESSAGES = 10;

export function buildChatRequestBody(personality: PersonalityKey, history: ChatTurn[]) {
	return {
		personality,
		messages: history
			.slice(-MAX_CONTEXT_MESSAGES)
			.map(({ role, content }): ChatTurn => ({ role, content }))
	};
}
