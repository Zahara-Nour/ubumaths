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
		await insertAuthUser({
			id: this.data.id!,
			email: this.data.email!,
			fullName: this.data.full_name || undefined
		});

		// Then create profile
		const { data, error } = await client.from('profiles').insert(this.data).select().single();
		if (error) throw error;
		return data;
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
			created_at: new Date().toISOString(),
			archived: false
		};
	}

	withName(name: string): this {
		this.data.name = name;
		return this;
	}

	archived(): this {
		this.data.archived = true;
		return this;
	}

	async create(): Promise<Tables['classes']['Row']> {
		const client = createServiceRoleClient();
		const { data, error } = await client.from('classes').insert(this.data).select().single();
		if (error) throw error;
		return data;
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
			type: 'multiple_choice',
			question: 'What is 2 + 2?',
			answer: '4',
			created_at: new Date().toISOString()
		};
	}

	withType(type: string): this {
		this.data.type = type;
		return this;
	}

	withQuestion(question: string): this {
		this.data.question = question;
		return this;
	}

	withAnswer(answer: string): this {
		this.data.answer = answer;
		return this;
	}

	async create(): Promise<Tables['exercises']['Row']> {
		const client = createServiceRoleClient();
		const { data, error } = await client.from('exercises').insert(this.data).select().single();
		if (error) throw error;
		return data;
	}
}

/**
 * Builder for creating test game combats
 */
export class GameCombatBuilder {
	private data: Partial<Tables['game_combats']['Insert']> = {};

	constructor(organizerId: string) {
		this.data = {
			id: generateTestId('combat'),
			organizer_id: organizerId,
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
		const { data, error } = await client.from('game_combats').insert(this.data).select().single();
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
			.insert(this.data)
			.select()
			.single();
		if (error) throw error;
		return data;
	}
}

/**
 * Builder for creating test geometry exercises
 */
export class GeometryExerciseBuilder {
	private data: Partial<Tables['geometry_exercises']['Insert']> = {};

	constructor(createdBy: string) {
		this.data = {
			id: generateTestId('geo'),
			created_by: createdBy,
			exercise_type: 'construct',
			title: 'Test Geometry Exercise',
			description: 'Test description',
			instructions: 'Complete the construction',
			created_at: new Date().toISOString()
		};
	}

	withType(type: string): this {
		this.data.exercise_type = type;
		return this;
	}

	withTitle(title: string): this {
		this.data.title = title;
		return this;
	}

	async create(): Promise<Tables['geometry_exercises']['Row']> {
		const client = createServiceRoleClient();
		const { data, error } = await client
			.from('geometry_exercises')
			.insert(this.data)
			.select()
			.single();
		if (error) throw error;
		return data;
	}
}

/**
 * Builder for creating test geometry exercise attempts
 */
export class GeometryExerciseAttemptBuilder {
	private data: Partial<Tables['geometry_exercise_attempts']['Insert']> = {};

	constructor(exerciseId: string, studentId: string) {
		this.data = {
			id: generateTestId('attempt'),
			exercise_id: exerciseId,
			student_id: studentId,
			status: 'in_progress',
			attempt_number: 1,
			hint_penalties: 0,
			time_penalties: 0,
			time_spent_seconds: 0,
			active_time_seconds: 0,
			started_at: new Date().toISOString(),
			last_saved_at: new Date().toISOString()
		};
	}

	withStatus(status: string): this {
		this.data.status = status;
		return this;
	}

	withRawScore(score: number): this {
		this.data.raw_score = score;
		return this;
	}

	withHintPenalties(penalties: number): this {
		this.data.hint_penalties = penalties;
		return this;
	}

	withTimePenalties(penalties: number): this {
		this.data.time_penalties = penalties;
		return this;
	}

	withFinalScore(score: number | null): this {
		this.data.final_score = score;
		return this;
	}

	async create(): Promise<Tables['geometry_exercise_attempts']['Row']> {
		const client = createServiceRoleClient();
		const { data, error } = await client
			.from('geometry_exercise_attempts')
			.insert(this.data)
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
		const { data, error } = await client.from('error_logs').insert(this.data).select().single();
		if (error) throw error;
		return data;
	}
}

// Export factory functions for convenience
export const TestData = {
	profile: () => new ProfileBuilder(),
	class: (teacherId: string) => new ClassBuilder(teacherId),
	exercise: (createdBy: string) => new ExerciseBuilder(createdBy),
	gameCombat: (organizerId: string) => new GameCombatBuilder(organizerId),
	privateMessage: (senderId: string) => new PrivateMessageBuilder(senderId),
	geometryExercise: (createdBy: string) => new GeometryExerciseBuilder(createdBy),
	geometryExerciseAttempt: (exerciseId: string, studentId: string) =>
		new GeometryExerciseAttemptBuilder(exerciseId, studentId),
	errorLog: () => new ErrorLogBuilder()
};
