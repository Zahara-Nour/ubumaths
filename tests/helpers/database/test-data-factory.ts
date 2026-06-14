/**
 * Test Data Factory
 *
 * Provides builder functions for creating test data with sensible defaults.
 * Useful for reducing boilerplate in trigger tests.
 */

import type { Database } from '$lib/types/database';
import { generateTestId, generateTestEmail, createServiceRoleClient } from './trigger-test-helpers';
import { insertAuthUser } from './postgres-client';

type Tables = Database['public']['Tables'];

/**
 * Builder for creating test profiles
 */
export class ProfileBuilder {
	private data: Partial<Tables['profiles']['Insert']> = {};

	constructor() {
		this.data = {
			id: generateTestId('user'),
			email: generateTestEmail('user'),
			role: 'student',
			full_name: 'Test User',
			created_at: new Date().toISOString()
		};
	}

	withId(id: string): this {
		this.data.id = id;
		return this;
	}

	withEmail(email: string): this {
		this.data.email = email;
		return this;
	}

	withRole(role: 'student' | 'teacher' | 'admin'): this {
		this.data.role = role;
		this.data.full_name = `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`;
		return this;
	}

	withFullName(fullName: string): this {
		this.data.full_name = fullName;
		return this;
	}

	withGidouilles(amount: number): this {
		this.data.gidouilles = amount;
		return this;
	}

	async create(): Promise<Tables['profiles']['Row']> {
		const client = createServiceRoleClient();

		// First, create auth.users entry using direct PostgreSQL client
		// (Supabase client cannot access auth schema)
		// This will trigger handle_new_user() which auto-creates a basic profile
		await insertAuthUser({
			id: this.data.id!,
			email: this.data.email!,
			fullName: this.data.full_name || undefined
		});

		// Wait for the trigger to complete (with retries)
		let profile = null;
		for (let i = 0; i < 10; i++) {
			await new Promise((resolve) => setTimeout(resolve, 100));
			const { data: checkData } = await client.from('profiles').select('*').eq('id', this.data.id!);
			if (checkData && checkData.length > 0) {
				profile = checkData[0];
				break;
			}
		}

		if (!profile) {
			throw new Error(
				`Profile not created by trigger after 1000ms for ID: ${this.data.id}, email: ${this.data.email}`
			);
		}

		// Update the auto-created profile with our custom data
		// (The trigger creates a minimal profile, we enhance it here)
		const { data, error } = await client
			.from('profiles')
			.update({
				...this.data,
				updated_at: new Date().toISOString()
			} as Tables['profiles']['Update'])
			.eq('id', this.data.id!)
			.select();
		if (error) throw error;
		// Return first element
		if (!data || data.length === 0) {
			throw new Error(`No profile data returned after update for ID: ${this.data.id}`);
		}
		return data[0];
	}
}

/**
 * Builder for creating test classes
 */
export class ClassBuilder {
	private data: Partial<Tables['classes']['Insert']> = {};

	constructor(teacherId: string) {
		this.data = {
			id: generateTestId('class'),
			teacher_id: teacherId,
			name: 'Test Class',
			join_code: `TEST${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
			created_at: new Date().toISOString(),
			is_active: true
		};
	}

	withName(name: string): this {
		this.data.name = name;
		return this;
	}

	archived(): this {
		this.data.is_active = false;
		return this;
	}

	async create(): Promise<Tables['classes']['Row']> {
		const client = createServiceRoleClient();
		const { data, error } = await client
			.from('classes')
			.insert(this.data as Tables['classes']['Insert'])
			.select();
		if (error) throw error;
		// Return first element (can't use .single() due to potential triggers)
		if (!data || data.length === 0) {
			throw new Error('No class data returned after insert');
		}
		return data[0];
	}
}

/**
 * Builder for creating test exercises
 */
export class ExerciseBuilder {
	private data: Partial<Tables['exercises']['Insert']> = {};

	constructor(createdBy: string) {
		this.data = {
			id: generateTestId('exercise'),
			created_by: createdBy,
			category: 'automatisme',
			variations: [
				{
					label: 'default',
					statement_md: 'What is 2 + 2?',
					solution_md: 'The answer is 4'
				}
			],
			is_public: false,
			created_at: new Date().toISOString()
		};
	}

	withCategory(category: string): this {
		this.data.category = category;
		return this;
	}

	withStatement(statement: string): this {
		// Update the default variation's statement
		if (this.data.variations && Array.isArray(this.data.variations) && this.data.variations[0]) {
			const variation = this.data.variations[0] as {
				label: string;
				statement_md: string;
				solution_md: string;
			};
			variation.statement_md = statement;
		}
		return this;
	}

	withQuestion(question: string): this {
		// Update the default variation's statement
		if (this.data.variations && Array.isArray(this.data.variations) && this.data.variations[0]) {
			const variation = this.data.variations[0] as {
				label: string;
				statement_md: string;
				solution_md: string;
			};
			variation.statement_md = question;
		}
		return this;
	}

	withSolution(solution: string): this {
		// Update the default variation's solution
		if (this.data.variations && Array.isArray(this.data.variations) && this.data.variations[0]) {
			const variation = this.data.variations[0] as {
				label: string;
				statement_md: string;
				solution_md: string;
			};
			variation.solution_md = solution;
		}
		return this;
	}

	async create(): Promise<Tables['exercises']['Row']> {
		const client = createServiceRoleClient();
		const { data, error } = await client
			.from('exercises')
			.insert(this.data as Tables['exercises']['Insert'])
			.select()
			.single();
		if (error) throw error;
		return data;
	}
}

/**
 * Builder for creating test game combats
 */
export class GameCombatBuilder {
	private data: Partial<Tables['game_combats']['Insert']> = {};

	constructor(organizerId: string, monsterId?: string) {
		this.data = {
			id: generateTestId('combat'),
			organizer_id: organizerId,
			monster_id: monsterId || generateTestId('monster'),
			status: 'active',
			xp_gained: 0,
			ready_player_ids: [],
			created_at: new Date().toISOString()
		};
	}

	withStatus(status: 'active' | 'completed' | 'cancelled'): this {
		this.data.status = status;
		return this;
	}

	withOutcome(outcome: 'victory' | 'defeat'): this {
		this.data.outcome = outcome;
		return this;
	}

	withXp(xp: number): this {
		this.data.xp_gained = xp;
		return this;
	}

	withReadyPlayers(playerIds: string[]): this {
		this.data.ready_player_ids = playerIds;
		return this;
	}

	async create(): Promise<Tables['game_combats']['Row']> {
		const client = createServiceRoleClient();
		const { data, error } = await client
			.from('game_combats')
			.insert(this.data as Tables['game_combats']['Insert'])
			.select()
			.single();
		if (error) throw error;
		return data;
	}
}

/**
 * Builder for creating test private messages
 */
export class PrivateMessageBuilder {
	private data: Partial<Tables['private_messages']['Insert']> = {};

	constructor(senderId: string) {
		this.data = {
			id: generateTestId('message'),
			sender_id: senderId,
			subject: 'Test Message',
			content: {
				type: 'doc',
				content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test message content' }] }]
			},
			plain_text: 'Test message content',
			sent_at: new Date().toISOString(),
			is_group_message: false,
			recipient_count: 1
		};
	}

	withSubject(subject: string): this {
		this.data.subject = subject;
		return this;
	}

	withPlainText(text: string): this {
		this.data.plain_text = text;
		return this;
	}

	isGroupMessage(): this {
		this.data.is_group_message = true;
		return this;
	}

	withRecipientCount(count: number): this {
		this.data.recipient_count = count;
		return this;
	}

	async create(): Promise<Tables['private_messages']['Row']> {
		const client = createServiceRoleClient();
		const { data, error } = await client
			.from('private_messages')
			.insert(this.data as Tables['private_messages']['Insert'])
			.select()
			.single();
		if (error) throw error;
		return data;
	}
}

/**
 * Builder for creating test error logs
 */
export class ErrorLogBuilder {
	private data: Partial<Tables['error_logs']['Insert']> = {};

	constructor() {
		this.data = {
			id: generateTestId('error'),
			error_type: 'client_js',
			message: 'Test error message',
			url: 'https://test.com/page',
			severity: 'error',
			created_at: new Date().toISOString()
		};
	}

	withType(type: string): this {
		this.data.error_type = type;
		return this;
	}

	withMessage(message: string): this {
		this.data.message = message;
		return this;
	}

	withUrl(url: string): this {
		this.data.url = url;
		return this;
	}

	withFile(filePath: string, lineNumber?: number): this {
		this.data.file_path = filePath;
		if (lineNumber !== undefined) {
			this.data.line_number = lineNumber;
		}
		return this;
	}

	withUserId(userId: string): this {
		this.data.user_id = userId;
		return this;
	}

	withSeverity(severity: string): this {
		this.data.severity = severity;
		return this;
	}

	async create(): Promise<Tables['error_logs']['Row']> {
		const client = createServiceRoleClient();
		const { data, error } = await client
			.from('error_logs')
			.insert(this.data as Tables['error_logs']['Insert'])
			.select()
			.single();
		if (error) throw error;
		return data;
	}
}

// Export factory functions for convenience
export const TestData = {
	profile: () => new ProfileBuilder(),
	class: (teacherId: string) => new ClassBuilder(teacherId),
	exercise: (createdBy: string) => new ExerciseBuilder(createdBy),
	gameCombat: (organizerId: string, monsterId?: string) =>
		new GameCombatBuilder(organizerId, monsterId),
	privateMessage: (senderId: string) => new PrivateMessageBuilder(senderId),
	errorLog: () => new ErrorLogBuilder()
};
