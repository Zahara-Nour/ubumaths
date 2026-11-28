import { describe, expect, it, vi } from 'vitest';
import { CHILD_ACCOUNT_DOMAIN } from '#lib/utils/child-account.ts';

const sendTransacEmail = vi.fn(async (_request: unknown) => ({ messageId: 'm1' }));
const brevoClientOptions: unknown[] = [];

vi.mock('$app/env/private', () => ({
	BREVO_API_KEY: 'cle-de-test',
	BREVO_SENDER_EMAIL: undefined,
	BREVO_SENDER_NAME: undefined,
	VERCEL: undefined,
	EMAIL_ENVOI_REEL: undefined,
	EMAIL_CAPTURE_DIR: undefined
}));
// Base distante : envoi réel (la capture locale a son propre test).
vi.mock('$app/env/public', () => ({ PUBLIC_SUPABASE_URL: 'https://exemple.supabase.co' }));

vi.mock('@getbrevo/brevo', () => ({
	BrevoClient: class {
		constructor(options: unknown) {
			brevoClientOptions.push(options);
		}
		transactionalEmails = { sendTransacEmail };
	}
}));

const { sendEmail, sendWelcomeEmail } = await import('../brevo');

describe('Brevo — aucun courriel vers le domaine fictif', () => {
	it('refuse une adresse du domaine fictif sans rien envoyer', async () => {
		const res = await sendEmail(`noelie42@${CHILD_ACCOUNT_DOMAIN}`, 'Sujet', '<p>x</p>');
		expect(res.success).toBe(false);
		expect(sendTransacEmail).not.toHaveBeenCalled();
	});

	it('refuse aussi le courriel de bienvenue', async () => {
		const res = await sendWelcomeEmail(`NOELIE42@${CHILD_ACCOUNT_DOMAIN.toUpperCase()}`, 'Noélie');
		expect(res.success).toBe(false);
		expect(sendTransacEmail).not.toHaveBeenCalled();
	});

	it('envoie normalement vers une vraie adresse', async () => {
		const res = await sendEmail('parent@exemple.fr', 'Sujet', '<p>x</p>');
		expect(res.success).toBe(true);
		expect(sendTransacEmail).toHaveBeenCalledTimes(1);
	});

	it('transmet le courriel complet à Brevo et rend son identifiant', async () => {
		sendTransacEmail.mockClear();
		const res = await sendEmail('parent@exemple.fr', 'Sujet', '<p>x</p>', 'x', 'prof@exemple.fr', {
			'List-Unsubscribe': '<https://exemple.fr/stop>'
		});
		expect(res).toEqual({ success: true, messageId: 'm1' });
		expect(sendTransacEmail).toHaveBeenCalledWith({
			sender: { email: 'noreply@ubumaths.fr', name: 'Chiphre' },
			to: [{ email: 'parent@exemple.fr' }],
			subject: 'Sujet',
			htmlContent: '<p>x</p>',
			textContent: 'x',
			replyTo: { email: 'prof@exemple.fr' },
			headers: { 'List-Unsubscribe': '<https://exemple.fr/stop>' }
		});
	});

	it('ne réessaie jamais un envoi (un doublon de lien de consentement)', () => {
		expect(brevoClientOptions).toEqual([{ apiKey: 'cle-de-test', maxRetries: 0 }]);
	});
});
