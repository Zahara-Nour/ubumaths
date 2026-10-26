import { expect, type Page } from '@playwright/test';

/**
 * Comptes LOCAUX des captures (`supabase/seed/dev_accounts.sql`)
 * ===============================================================
 *
 * Mots de passe publics, valables seulement sur la base locale : jamais de mot de
 * passe saisi en prod. `login` refuse toute adresse qui n'est pas localhost.
 */

export type Role = 'teacher' | 'admin';

const ACCOUNTS: Record<Role, { email: string; password: string }> = {
	teacher: { email: 'teacher@local.test', password: 'local-teacher' },
	admin: { email: 'admin@local.test', password: 'local-admin' }
};

/** L'état de session de chaque rôle, écrit par `comptes.setup.ts` */
export function storageStatePath(role: Role): string {
	return `.captures/.auth/${role}.json`;
}

/** Se connecte avec le compte local de ce rôle, par le formulaire */
export async function login(page: Page, role: Role): Promise<void> {
	await page.goto('/auth/login');
	const { hostname } = new URL(page.url());
	if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
		throw new Error(`Comptes locaux refusés hors de localhost (${hostname})`);
	}
	const email = page.locator('#email');
	// Connexion Google proposée : le formulaire par email est replié
	if (!(await email.isVisible())) {
		await page.getByRole('button', { name: /Autres comptes/ }).click();
	}
	await email.fill(ACCOUNTS[role].email);
	await page.locator('#password').fill(ACCOUNTS[role].password);
	await page.getByRole('button', { name: 'Se connecter' }).click();
	await expect(page).not.toHaveURL(/\/auth\/login/);
}
