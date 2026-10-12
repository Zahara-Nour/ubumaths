/**
 * Contrat entre ChatBot et POST /api/chat (écart V30) : le corps envoyé par le
 * navigateur doit passer le schéma du serveur. Il ne contient aucun tour `system`.
 */

import { describe, it, expect } from 'vitest';
import { buildChatRequestBody } from '../chat-request';
import { chatRequestSchema } from '$lib/server/validation/chat';

describe('buildChatRequestBody', () => {
	it('passe le schéma du serveur', () => {
		// Les messages de ChatBot portent un `timestamp`, que le corps ne doit pas transmettre.
		const history = [
			{ role: 'user' as const, content: 'Bonjour', timestamp: 1 },
			{ role: 'assistant' as const, content: 'Cornegidouille !', timestamp: 2 },
			{ role: 'user' as const, content: [{ type: 'text' as const, text: 'Et ça ?' }], timestamp: 3 }
		];
		const body = buildChatRequestBody('pereUbu', history);
		expect(body.messages[0]).toEqual({ role: 'user', content: 'Bonjour' });
		expect(chatRequestSchema.safeParse(body).success).toBe(true);
	});

	it('nomme la personnalité sans envoyer son prompt', () => {
		const body = buildChatRequestBody('pereUbu', [{ role: 'user', content: 'Bonjour' }]);
		expect(body.personality).toBe('pereUbu');
		expect(body.messages.map((m) => m.role as string)).not.toContain('system');
	});

	it('ne garde que les 10 derniers messages', () => {
		const history = Array.from({ length: 15 }, (_, i) => ({
			role: 'user' as const,
			content: `message ${i}`
		}));
		const body = buildChatRequestBody('pereUbu', history);
		expect(body.messages).toHaveLength(10);
		expect(body.messages[0].content).toBe('message 5');
	});
});
