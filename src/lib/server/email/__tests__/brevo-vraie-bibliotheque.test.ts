import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// La vraie bibliothèque Brevo, sans réseau : seul `fetch` est remplacé. Vérifie
// ce que les tests à imitation ne voient pas : la requête réellement envoyée, et
// qu'une erreur de Brevo n'est jamais réessayée (doublon de courriel).

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

const { sendEmail } = await import('../brevo');

const LIEN_A_JETON = 'https://exemple.fr/carnet/jeton-secret';
const fetchMock = vi.fn<typeof fetch>();

function reponse(status: number, corps: unknown): Response {
	return new Response(JSON.stringify(corps), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

beforeEach(() => {
	fetchMock.mockReset();
	vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('Brevo — vraie bibliothèque, réseau simulé', () => {
	it('envoie une seule requête avec la clé, le courriel complet, et rend l’identifiant', async () => {
		fetchMock.mockResolvedValue(reponse(201, { messageId: '<m1@brevo>' }));

		const res = await sendEmail(
			'parent@exemple.fr',
			'Sujet',
			`<a href="${LIEN_A_JETON}">x</a>`,
			'x',
			'prof@exemple.fr',
			{ 'List-Unsubscribe': '<https://exemple.fr/stop>' }
		);

		expect(res).toEqual({ success: true, messageId: '<m1@brevo>' });
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0];
		expect(String(url)).toBe('https://api.brevo.com/v3/smtp/email');
		expect(init?.method).toBe('POST');
		expect(new Headers(init?.headers).get('api-key')).toBe('cle-de-test');
		expect(JSON.parse(String(init?.body))).toEqual({
			sender: { email: 'noreply@ubumaths.fr', name: 'Chiphre' },
			to: [{ email: 'parent@exemple.fr' }],
			subject: 'Sujet',
			htmlContent: `<a href="${LIEN_A_JETON}">x</a>`,
			textContent: 'x',
			replyTo: { email: 'prof@exemple.fr' },
			headers: { 'List-Unsubscribe': '<https://exemple.fr/stop>' }
		});
	});

	it.each([500, 503, 429, 408])(
		'erreur %i de Brevo : échec, jamais de deuxième envoi',
		async (status) => {
			fetchMock.mockResolvedValue(reponse(status, { code: 'erreur', message: 'indisponible' }));

			const res = await sendEmail('parent@exemple.fr', 'Sujet', `<a href="${LIEN_A_JETON}">x</a>`);

			expect(res.success).toBe(false);
			expect(fetchMock).toHaveBeenCalledTimes(1);
		}
	);

	it('erreur 400 : statut et code de Brevo seulement, ni adresse ni courriel', async () => {
		// Réponse qui cite tout : l'adresse et le contenu ne doivent pas en sortir.
		fetchMock.mockResolvedValue(
			reponse(400, {
				code: 'invalid_parameter',
				message: `parent@exemple.fr refusé : <a href="${LIEN_A_JETON}">`
			})
		);

		const res = await sendEmail('parent@exemple.fr', 'Sujet', `<a href="${LIEN_A_JETON}">x</a>`);

		expect(res).toEqual({
			success: false,
			error: 'Envoi refusé par Brevo (statut 400, invalid_parameter)'
		});
	});

	it('code de Brevo inattendu : le statut seul', async () => {
		fetchMock.mockResolvedValue(reponse(401, { code: 'parent@exemple.fr', message: 'x' }));

		const res = await sendEmail('parent@exemple.fr', 'Sujet', '<p>x</p>');

		expect(res.error).toBe('Envoi refusé par Brevo (statut 401)');
	});

	it('réseau coupé : « Brevo injoignable », un seul essai', async () => {
		fetchMock.mockRejectedValue(new TypeError(`fetch failed ${LIEN_A_JETON}`));

		const res = await sendEmail('parent@exemple.fr', 'Sujet', '<p>x</p>');

		expect(res).toEqual({ success: false, error: 'Brevo injoignable' });
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
