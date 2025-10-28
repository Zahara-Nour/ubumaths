/**
 * Direct PostgreSQL Client for Test Database Operations
 *
 * Provides direct PostgreSQL access for operations that require auth schema access,
 * which is not available through the Supabase client API.
 *
 * Used primarily for:
 * - Inserting test users into auth.users table
 * - Cleaning up auth.users table after tests
 */

import { Client, type ClientConfig } from 'pg';

/**
 * Singleton PostgreSQL client instance
 */
let pgClient: Client | null = null;

/**
 * PostgreSQL connection configuration for local Supabase
 */
const PG_CONFIG: ClientConfig = {
	host: process.env.SUPABASE_DB_HOST || 'localhost',
	port: parseInt(process.env.SUPABASE_DB_PORT || '54322'),
	database: process.env.SUPABASE_DB_NAME || 'postgres',
	user: process.env.SUPABASE_DB_USER || 'postgres',
	password: process.env.SUPABASE_DB_PASSWORD || 'postgres'
};

/**
 * Get or create the PostgreSQL client
 * Uses singleton pattern to reuse connection across tests
 */
export async function getPostgresClient(): Promise<Client> {
	if (!pgClient) {
		pgClient = new Client(PG_CONFIG);
		await pgClient.connect();
	}
	return pgClient;
}

/**
 * Close the PostgreSQL client connection
 * Should be called in global test teardown
 */
export async function closePostgresClient(): Promise<void> {
	if (pgClient) {
		await pgClient.end();
		pgClient = null;
	}
}

/**
 * Parameters for inserting an auth user
 */
export interface InsertAuthUserParams {
	id: string;
	email: string;
	fullName?: string;
	encryptedPassword?: string;
}

/**
 * Insert a user into auth.users table
 *
 * This is necessary because:
 * 1. Supabase client cannot access auth schema tables
 * 2. profiles table has a foreign key constraint to auth.users
 * 3. Some triggers rely on auth.users data being present
 *
 * @param params - User data to insert
 * @returns The inserted user ID
 */
export async function insertAuthUser(params: InsertAuthUserParams): Promise<string> {
	const client = await getPostgresClient();

	const {
		id,
		email,
		fullName = 'Test User',
		// Default bcrypt hash for password "password123"
		encryptedPassword = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
	} = params;

	const now = new Date().toISOString();

	try {
		await client.query(
			`
			INSERT INTO auth.users (
				id,
				instance_id,
				aud,
				role,
				email,
				encrypted_password,
				email_confirmed_at,
				raw_app_meta_data,
				raw_user_meta_data,
				created_at,
				updated_at,
				confirmation_token,
				recovery_token,
				email_change_token_new,
				email_change
			) VALUES (
				$1,
				'00000000-0000-0000-0000-000000000000',
				'authenticated',
				'authenticated',
				$2,
				$3,
				$4,
				'{"provider": "email", "providers": ["email"]}',
				$5,
				$4,
				$4,
				'',
				'',
				'',
				''
			)
			ON CONFLICT (id) DO NOTHING
		`,
			[id, email, encryptedPassword, now, JSON.stringify({ full_name: fullName })]
		);

		return id;
	} catch (error) {
		// Log error but don't throw for duplicate key violations
		if (error instanceof Error && !error.message.includes('duplicate key')) {
			throw error;
		}
		return id;
	}
}

/**
 * Delete all test users from auth.users table
 *
 * Test users are identified by email pattern: %@test.com%
 * This should be called in global test cleanup.
 */
export async function deleteTestAuthUsers(): Promise<void> {
	const client = await getPostgresClient();

	try {
		await client.query(`
			DELETE FROM auth.users
			WHERE email LIKE '%@test.com%'
		`);
	} catch (error) {
		console.debug('Error deleting test auth users:', error);
	}
}

/**
 * Delete a specific test user from auth.users table by ID
 *
 * @param userId - The UUID of the user to delete
 */
export async function deleteAuthUser(userId: string): Promise<void> {
	const client = await getPostgresClient();

	try {
		await client.query(
			`
			DELETE FROM auth.users
			WHERE id = $1 AND email LIKE '%@test.com%'
		`,
			[userId]
		);
	} catch (error) {
		console.debug('Error deleting auth user:', error);
	}
}
