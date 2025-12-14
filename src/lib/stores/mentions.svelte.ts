/**
 * Mentions Store
 * ==============
 *
 * Store for user mentions in the rich text editor.
 * Provides filtering functions for autocomplete.
 *
 * @module stores/mentions
 */

/**
 * User data for mentions
 */
export interface MentionUser {
	username: string;
	displayName: string;
}

/**
 * Mock users for development.
 * In production, this would be fetched from Supabase.
 */
const mockUsers: MentionUser[] = [
	{ username: 'professeur', displayName: 'Prof. Martin' },
	{ username: 'alice', displayName: 'Alice Dupont' },
	{ username: 'bob', displayName: 'Bob Durand' },
	{ username: 'charlie', displayName: 'Charlie Martin' },
	{ username: 'david', displayName: 'David Bernard' },
	{ username: 'emma', displayName: 'Emma Petit' },
	{ username: 'admin', displayName: 'Administrateur' },
	{ username: 'classe.3eme', displayName: 'Classe 3ème' },
	{ username: 'classe.2nde', displayName: 'Classe 2nde' }
];

/**
 * Search users by query string.
 *
 * Searches both username and displayName.
 *
 * @param query - The search query (partial username or name)
 * @returns Promise with array of matching users
 *
 * @example
 * await searchUsers('al'); // Returns Alice
 * await searchUsers('prof'); // Returns Prof. Martin
 */
export async function searchUsers(query: string): Promise<MentionUser[]> {
	const q = query.toLowerCase();
	if (!q) {
		return [...mockUsers];
	}
	return mockUsers.filter(
		(u) => u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q)
	);
}

/**
 * Get a user by username.
 *
 * @param username - The exact username to find
 * @returns The user or undefined if not found
 */
export function getUserByUsername(username: string): MentionUser | undefined {
	return mockUsers.find((u) => u.username === username);
}

/**
 * Get all available users.
 *
 * @returns Copy of the mock users array
 */
export function getAllUsers(): MentionUser[] {
	return [...mockUsers];
}
