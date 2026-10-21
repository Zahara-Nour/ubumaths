import { describe, expect, it, vi } from 'vitest';
import { CHILD_ACCOUNT_DOMAIN } from '$lib/utils/child-account';

const sendTransacEmail = vi.fn(async () => ({ body: { messageId: 'm1' } }));

vi.mock('$env/dynamic/private', () => ({ env: { BREVO_API_KEY: 'cle-de-test' } }));

vi.mock('@getbrevo/brevo', () => ({
	TransactionalEmailsApi: class {
		setApiKey() {}
		sendTransacEmail = sendTransacEmail;
	},
	TransactionalEmailsApiApiKeys: { apiKey: 0 },
	SendSmtpEmail: class {}
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
});
