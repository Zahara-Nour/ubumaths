/**
 * Doublure de la garde commune `$lib/server/middleware/auth` pour les tests
 * unitaires d'endpoints dont les `locals` fournissent `user` (et parfois `profile`).
 *
 * Contrat de la vraie garde conservé : 401 sans session, 403 sans profil ou avec
 * un mauvais rôle. Seules les sources changent : la session vient de `locals.user`
 * (pas de `safeGetSession`) et le profil de `locals.profile` s'il existe, sinon de
 * la VRAIE `requireAuth` (requête `profiles` sur le client Supabase simulé).
 * ⚠️ Quand `locals.profile` est fourni, la doublure ne relit pas `profiles` : les
 * chemins « profil introuvable → 403 » et « panne de lecture → 500 » de la vraie garde
 * ne sont pas couverts par les tests qui l'utilisent. Ils le sont par les tests qui
 * passent par la vraie garde (`api/teacher/classes/__tests__/garde.test.ts`,
 * `api/messages/templates/[id]/approve/__tests__/garde.test.ts`).
 *
 * Usage :
 *   vi.mock('$lib/server/middleware/auth', async (importActual) =>
 *     (await import('$tests/helpers/garde-auth-locals')).gardeAuthDepuisLocals(importActual)
 *   );
 */
import { error } from '@sveltejs/kit';

type UserRole = 'student' | 'teacher' | 'admin';

const NOMS_ROLES: Record<UserRole, string> = {
	student: 'Élèves',
	teacher: 'Enseignants',
	admin: 'Administrateurs'
};

type LocalsSimules = {
	user?: { id: string } | null;
	profile?: { role?: string | null } | null;
	supabase?: unknown;
};

type ModuleGarde = {
	requireAuth: (
		locals: App.Locals
	) => Promise<{ user: unknown; profile: { role?: string | null } }>;
};

export async function gardeAuthDepuisLocals(importActual: () => Promise<unknown>) {
	const reel = (await importActual()) as ModuleGarde;

	async function lireSession(locals: LocalsSimules) {
		if (!locals.user) {
			throw error(401, 'Non autorisé - Authentification requise');
		}
		if (locals.profile) {
			return { user: locals.user, profile: locals.profile };
		}
		const avecSession = {
			...locals,
			safeGetSession: async () => ({ user: locals.user })
		} as unknown as App.Locals;
		return reel.requireAuth(avecSession);
	}

	return {
		requireAuth: async (locals: LocalsSimules) => lireSession(locals),
		requireRole: async (locals: LocalsSimules, role: UserRole) => {
			const session = await lireSession(locals);
			if (session.profile.role !== role)
				throw error(403, `Interdit - ${NOMS_ROLES[role]} uniquement`);
			return session;
		},
		requireRoles: async (locals: LocalsSimules, roles: UserRole[]) => {
			const session = await lireSession(locals);
			if (!roles.includes(session.profile.role as UserRole)) {
				throw error(403, `Interdit - ${roles.map((r) => NOMS_ROLES[r]).join(', ')} uniquement`);
			}
			return session;
		}
	};
}
