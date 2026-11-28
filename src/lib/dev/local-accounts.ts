/**
 * Comptes fictifs de la base locale
 * =================================
 *
 * Source unique : `pnpm voir --compte`, `pnpm lien` et les boutons de connexion
 * du serveur de dev (`DevAccountButtons.svelte`) lisent cette liste. Ces comptes
 * n'existent que dans la base locale (`supabase/seed/dev_accounts.sql`,
 * `pnpm db:neuf`) ; ce fichier n'est importé que par des scripts et par du code
 * chargé en dev seulement : rien de tout cela n'est dans le build (garde de CI
 * « Comptes fictifs absents du build »).
 * Doc : docs/pratiques/tester-sur-un-autre-appareil.md.
 */

// Types

export type LocalAccountName = 'prof' | 'eleve' | 'admin';

export interface LocalAccount {
	email: string;
	password: string;
}

/** Ce que rend une tentative de connexion : réussie (avec son résultat), ou refusée. */
export type SignInAttempt<T> = { ok: true; result: T } | { ok: false; message: string };

/** Ce que rend la suite des essais : le compte accepté et son résultat, ou le dernier refus. */
export type SignInOutcome<T> =
	{ ok: true; email: string; result: T } | { ok: false; message: string };

// Constantes

/**
 * Comptes essayés dans l'ordre. Élève : celui de `pnpm db:neuf` (dans une
 * classe, avec de l'activité), à défaut celui du seed de base, qui existe
 * toujours.
 */
export const LOCAL_ACCOUNTS: Record<LocalAccountName, LocalAccount[]> = {
	prof: [{ email: 'teacher@local.test', password: 'local-teacher' }],
	eleve: [
		{ email: 'eleve01@local.test', password: 'local-eleve' },
		{ email: 'student@local.test', password: 'local-student' }
	],
	admin: [{ email: 'admin@local.test', password: 'local-admin' }]
};

// Functions

/**
 * Essaie les comptes dans l'ordre et s'arrête au premier qui se connecte.
 * Tous refusés : le message du dernier essai.
 */
export async function signInWithFirst<T>(
	accounts: LocalAccount[],
	attempt: (account: LocalAccount) => Promise<SignInAttempt<T>>
): Promise<SignInOutcome<T>> {
	let message = 'Aucun compte fictif à essayer.';
	for (const account of accounts) {
		const tried = await attempt(account);
		if (tried.ok) return { ok: true, email: account.email, result: tried.result };
		message = tried.message;
	}
	return { ok: false, message };
}
