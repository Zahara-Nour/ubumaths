import { appendFile, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CHILD_ACCOUNT_DOMAIN } from '#lib/utils/child-account.ts';

// Capture des courriels en local : base locale → rien ne part chez Brevo,
// chaque courriel est écrit dans un dossier (tests Playwright, relecture).

const sendTransacEmail = vi.fn(async (_request: unknown) => ({ messageId: 'm1' }));
const privateEnv: Record<string, string | undefined> = {};
const publicEnv: Record<string, string | undefined> = {};

// Module simulé : un accesseur par variable lue (vitest refuse une clé absente du
// mock) ; chaque test remplit `privateEnv` / `publicEnv`.
function envModule(vars: Record<string, string | undefined>, keys: string[]) {
	return Object.defineProperties(
		{},
		Object.fromEntries(keys.map((key) => [key, { get: () => vars[key], enumerable: true }]))
	);
}

vi.mock('$app/env/private', () =>
	envModule(privateEnv, [
		'BREVO_API_KEY',
		'BREVO_SENDER_EMAIL',
		'BREVO_SENDER_NAME',
		'VERCEL',
		'EMAIL_ENVOI_REEL',
		'EMAIL_CAPTURE_DIR'
	])
);
vi.mock('$app/env/public', () => envModule(publicEnv, ['PUBLIC_SUPABASE_URL']));

vi.mock('@getbrevo/brevo', () => ({
	BrevoClient: class {
		transactionalEmails = { sendTransacEmail };
	}
}));

const { sendEmail, isBrevoConfigured } = await import('../brevo');
const { readCapturedEmails } = await import('../capture');

let dir: string;

function setEnv(priv: Record<string, string | undefined>, pub: Record<string, string | undefined>) {
	for (const k of Object.keys(privateEnv)) delete privateEnv[k];
	for (const k of Object.keys(publicEnv)) delete publicEnv[k];
	Object.assign(privateEnv, { EMAIL_CAPTURE_DIR: dir, ...priv });
	Object.assign(publicEnv, pub);
}

beforeEach(async () => {
	dir = await mkdtemp(join(tmpdir(), 'courriels-'));
	sendTransacEmail.mockClear();
});

afterEach(async () => {
	await rm(dir, { recursive: true, force: true });
});

const LOCAL = { PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321' };
const DISTANTE = { PUBLIC_SUPABASE_URL: 'https://exemple.supabase.co' };

describe('Brevo — capture des courriels sur la base locale', () => {
	it('base locale : rien ne part, le courriel est écrit et compté comme envoyé', async () => {
		setEnv({ BREVO_API_KEY: 'cle-de-test' }, LOCAL);
		const res = await sendEmail(
			'parent@exemple.fr',
			'Le carnet de Noé',
			'<p>Ouvrir le <a href="http://localhost/carnet/abc">carnet</a></p>',
			'texte'
		);
		expect(res.success).toBe(true);
		expect(sendTransacEmail).not.toHaveBeenCalled();

		const courriels = await readCapturedEmails(dir);
		expect(courriels).toHaveLength(1);
		expect(courriels[0]).toMatchObject({ to: 'parent@exemple.fr', subject: 'Le carnet de Noé' });
		const html = await readFile(join(dir, courriels[0].file), 'utf8');
		expect(html).toContain('/carnet/abc');
	});

	it('base locale sans clé Brevo : capture quand même, service « prêt »', async () => {
		setEnv({}, { PUBLIC_SUPABASE_URL: 'http://localhost:54321' });
		expect(isBrevoConfigured()).toBe(true);
		const res = await sendEmail('parent@exemple.fr', 'Sujet', '<p>x</p>');
		expect(res.success).toBe(true);
		expect(await readCapturedEmails(dir)).toHaveLength(1);
	});

	it('base locale + EMAIL_ENVOI_REEL=1 : envoi réel, rien de capturé', async () => {
		setEnv({ BREVO_API_KEY: 'cle-de-test', EMAIL_ENVOI_REEL: '1' }, LOCAL);
		const res = await sendEmail('parent@exemple.fr', 'Sujet', '<p>x</p>');
		expect(res.success).toBe(true);
		expect(sendTransacEmail).toHaveBeenCalledTimes(1);
		expect(await readdir(dir)).toHaveLength(0);
	});

	it('base distante (prod) : envoi réel, jamais de capture', async () => {
		setEnv({ BREVO_API_KEY: 'cle-de-test' }, DISTANTE);
		const res = await sendEmail('parent@exemple.fr', 'Sujet', '<p>x</p>');
		expect(res.success).toBe(true);
		expect(sendTransacEmail).toHaveBeenCalledTimes(1);
		expect(await readdir(dir)).toHaveLength(0);
	});

	it('sur Vercel, même avec une adresse de base locale : envoi réel', async () => {
		setEnv({ BREVO_API_KEY: 'cle-de-test', VERCEL: '1' }, LOCAL);
		await sendEmail('parent@exemple.fr', 'Sujet', '<p>x</p>');
		expect(sendTransacEmail).toHaveBeenCalledTimes(1);
		expect(await readdir(dir)).toHaveLength(0);
	});

	it('adresse de base absente : envoi réel (jamais de capture à l’aveugle)', async () => {
		setEnv({ BREVO_API_KEY: 'cle-de-test' }, {});
		await sendEmail('parent@exemple.fr', 'Sujet', '<p>x</p>');
		expect(sendTransacEmail).toHaveBeenCalledTimes(1);
	});

	it('base jointe par le tailnet (autre appareil) : capture', async () => {
		setEnv(
			{ BREVO_API_KEY: 'cle-de-test' },
			{
				PUBLIC_SUPABASE_URL: 'https://serveur.tail00000.ts.net:8443'
			}
		);
		await sendEmail('parent@exemple.fr', 'Sujet', '<p>x</p>');
		expect(sendTransacEmail).not.toHaveBeenCalled();
		expect(await readCapturedEmails(dir)).toHaveLength(1);
	});

	it('index avec une ligne tronquée : les autres restent lisibles', async () => {
		setEnv({}, LOCAL);
		await sendEmail('a@exemple.fr', 'Premier', '<p>1</p>');
		await appendFile(join(dir, 'index.jsonl'), '{"date":"2026\n');
		await sendEmail('b@exemple.fr', 'Second', '<p>2</p>');
		expect((await readCapturedEmails(dir)).map((c) => c.subject)).toEqual(['Premier', 'Second']);
	});

	it('adresse du domaine fictif : refusée, rien de capturé', async () => {
		setEnv({ BREVO_API_KEY: 'cle-de-test' }, LOCAL);
		const res = await sendEmail(`noelie42@${CHILD_ACCOUNT_DOMAIN}`, 'Sujet', '<p>x</p>');
		expect(res.success).toBe(false);
		expect(await readdir(dir)).toHaveLength(0);
	});

	it('dossier de capture inaccessible : envoi noté en échec, rien ne part', async () => {
		setEnv({ EMAIL_CAPTURE_DIR: '/dev/null/impossible' }, LOCAL);
		const res = await sendEmail('parent@exemple.fr', 'Sujet', '<p>x</p>');
		expect(res.success).toBe(false);
		expect(sendTransacEmail).not.toHaveBeenCalled();
	});

	it('garde les en-têtes et l’ordre d’envoi', async () => {
		setEnv({}, LOCAL);
		await sendEmail('a@exemple.fr', 'Premier', '<p>1</p>');
		await sendEmail('b@exemple.fr', 'Second', '<p>2</p>', undefined, undefined, {
			'List-Unsubscribe': '<http://localhost/carnet/x#arreter>'
		});
		const courriels = await readCapturedEmails(dir);
		expect(courriels.map((c) => c.subject)).toEqual(['Premier', 'Second']);
		expect(courriels[1].headers).toEqual({
			'List-Unsubscribe': '<http://localhost/carnet/x#arreter>'
		});
	});
});
