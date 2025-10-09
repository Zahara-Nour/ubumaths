import type { User, Session } from '@supabase/supabase-js';

function createAuthStore() {
	let user = $state<User | null>(null);
	let session = $state<Session | null>(null);

	function setAuth(newSession: Session | null, newUser: User | null) {
		session = newSession;
		user = newUser;
	}

	return {
		get user() {
			return user;
		},
		get session() {
			return session;
		},
		setAuth
	};
}

export const auth = createAuthStore();
