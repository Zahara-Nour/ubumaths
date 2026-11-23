import { expect, test, type Page } from '@playwright/test';

/**
 * Connexion en un geste aux comptes fictifs (serveur de dev)
 * ==========================================================
 *
 * Les trois boutons de la page de connexion du serveur de dev
 * (`DevAccountButtons.svelte`) : un appui connecte au compte fictif de la base
 * locale et mène au tableau de bord. Jamais contre la prod (`VERIFS_URL`) : les
 * boutons n'y existent pas (garde de CI « Comptes fictifs absents du build »).
 *
 * Élève : `eleve01` si la base est remplie (`pnpm db:neuf`), sinon `student`.
 */

const CASES = [
	{ label: 'Prof', emails: ['teacher@local.test'] },
	{ label: 'Élève', emails: ['eleve01@local.test', 'student@local.test'] },
	{ label: 'Admin', emails: ['admin@local.test'] }
];

/** Adresse du compte connecté, lue dans le cookie de session (découpé en morceaux). */
async function signedInEmail(page: Page): Promise<string> {
	const cookies = (await page.context().cookies())
		.filter((cookie) => /^sb-.*-auth-token(\.\d+)?$/.test(cookie.name))
		.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
	const raw = cookies.map((cookie) => decodeURIComponent(cookie.value)).join('');
	const json = raw.startsWith('base64-')
		? Buffer.from(raw.slice('base64-'.length), 'base64').toString('utf8')
		: raw;
	const session: unknown = JSON.parse(json);
	if (typeof session !== 'object' || session === null || !('user' in session)) return '';
	const user = session.user;
	return typeof user === 'object' && user !== null && 'email' in user ? String(user.email) : '';
}

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev seulement');

for (const { label, emails } of CASES) {
	test(`comptes fictifs — « ${label} » connecte et mène au tableau de bord`, async ({ page }) => {
		await page.goto('/auth/login');
		const buttons = page.getByTestId('comptes-fictifs-dev');
		await expect(buttons).toBeVisible();
		await buttons.getByRole('button', { name: label, exact: true }).click();
		await expect(page).toHaveURL(/\/dashboard/);
		expect(emails).toContain(await signedInEmail(page));
	});
}
