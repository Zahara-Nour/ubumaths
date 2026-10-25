/**
 * Account Data Export API Tests
 * ==============================
 *
 * Tests for GDPR Art. 20 compliant data export.
 *
 * Tests cover:
 * - Authentication requirement
 * - Rate limiting (1 per hour)
 * - Data structure validation
 * - All data categories included
 * - Sensitive data exclusion
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { GET } from '../+server';

// ============================================================================
// MOCKS
// ============================================================================

const TEST_USER = { id: 'user-123', email: 'test@example.com' };

// Mock Supabase client
let mockSupabase: {
	from: ReturnType<typeof vi.fn>;
};

// Mock rate limiter
let mockRateLimitFn: ReturnType<typeof vi.fn>;

// Mock logger
vi.mock('$lib/utils/logger', () => ({
	createServerLogger: () => ({
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
		trace: vi.fn()
	})
}));

// Mock auth middleware
vi.mock('$lib/server/middleware/auth', () => ({
	requireAuth: vi.fn().mockResolvedValue({
		user: { id: 'user-123', email: 'test@example.com' }
	})
}));

// Client service : seul lecteur du jour du dernier passage (aucune policy)
const serviceClient = vi.hoisted(() => ({ current: null as unknown }));
vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => serviceClient.current
}));

// Mock rate limiter
vi.mock('$lib/server/middleware/rateLimit', () => ({
	rateLimit: vi.fn()
}));

import * as rateLimit from '$lib/server/middleware/rateLimit';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockProfile = {
	id: 'user-123',
	email: 'test@example.com',
	firstname: 'John',
	lastname: 'Doe',
	avatar_url: null,
	role: 'student',
	grade: '6eme',
	gidouilles: 100,
	bonus: 50,
	vip_cards: 2,
	consent_required: true,
	consent_granted_at: null,
	consent_grace_period_ends: '2024-07-01T00:00:00Z',
	age_declaration: '15_plus',
	age_declared_at: '2024-06-15T00:00:00Z',
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-06-01T00:00:00Z'
};

// Conversations avec le tuteur IA, messages imbriqués (C12, 2026-10-11).
const mockTutorConversations = [
	{
		id: 'conv-1',
		exercise_topic: 'fractions',
		started_at: '2024-05-01T10:00:00Z',
		tutor_messages: [
			{ role: 'user', content: 'Je ne comprends pas', created_at: '2024-05-01T10:00:05Z' }
		]
	}
];

// Pedagogical data now lives in `exercise_completions` (renamed from the old
// `student_attempts`, which no longer exists in the schema).
const mockCompletions = [
	{
		exercise_id: 'ex1',
		assignment_id: null,
		completed_at: '2024-06-01T10:00:00Z',
		last_viewed_at: '2024-06-01T10:00:00Z',
		view_count: 1,
		created_at: '2024-06-01T10:00:00Z'
	}
];

// Mémoire des Mathoux (une ligne par notion)
const mockMathoux = [
	{
		notion_id: 'notion-1',
		best_stage: 'grand_matou',
		starred_grades: ['2', '1_SPE'],
		asleep: false,
		decoration: 'cockade',
		collar: 'leather',
		glasses: 'monocle',
		hat: 'bowler',
		first_seen_at: '2026-10-01T10:00:00Z',
		updated_at: '2026-10-18T10:00:00Z'
	}
];

// Décorations achetées : panse (lot B, 2026-10-24) et colliers (lot C, 2026-10-25)
const mockMathouDecorations = [
	{ decoration: 'cockade', price_paid: 20, purchased_at: '2026-10-24T10:00:00Z' },
	{ decoration: 'leather', price_paid: 20, purchased_at: '2026-10-25T10:00:00Z' },
	{ decoration: 'monocle', price_paid: 20, purchased_at: '2026-10-26T10:00:00Z' },
	{ decoration: 'bowler', price_paid: 10, purchased_at: '2026-10-26T11:00:00Z' }
];

// Palotin de l'élève (une ligne par élève)
const mockBuddy = {
	palotin_type: 'giron',
	level: 3,
	xp: 120,
	current_streak: 2,
	longest_streak: 5,
	themes_explored: ['fractions'],
	created_at: '2026-09-01T10:00:00Z',
	updated_at: '2026-10-18T10:00:00Z'
};

// Session automaths et ses réponses (jointure `test_answers(...)`)
const mockTestSessions = [
	{
		id: 'session-1',
		mode: 'interactive',
		score: 7,
		total_questions: 2,
		test_answers: [
			{
				question_instance: { statement: 'Combien font 2 + 2 ?' },
				user_answer: { blanks: ['4'] },
				is_correct: true
			}
		]
	}
];

// ============================================================================
// HELPERS
// ============================================================================

function createMockEvent() {
	return {
		locals: {
			supabase: mockSupabase,
			user: TEST_USER
		}
	};
}

/**
 * Creates a flexible chainable mock that handles all query patterns:
 * - .select().eq().single() -> for profiles
 * - .select().eq().order().limit() -> for student_attempts, messages, etc.
 * - .select().eq().maybeSingle() -> for game_players
 * - .select().eq() -> for student_progress, inventory, etc.
 * - .select().or() -> for friendships
 */
/** Tables dont la lecture échoue dans le test en cours (vidé avant chaque test). */
let failingTables: Set<string> = new Set();

function setupMockSupabase() {
	failingTables = new Set();
	// Create a thenable that resolves to { data, error } ; `error` seulement pour une table en panne
	const createThenableFor = (table: string) => (data: unknown) => ({
		then: (resolve: (value: { data: unknown; error: { message: string } | null }) => void) => {
			return Promise.resolve(
				resolve(
					failingTables.has(table)
						? { data: null, error: { message: `${table} en panne` } }
						: { data, error: null }
				)
			);
		}
	});

	const build = () => ({
		from: vi.fn((table: string) => {
			// Determine the data for this table
			const getData = () => {
				switch (table) {
					case 'profiles':
						return mockProfile;
					case 'exercise_completions':
						return mockCompletions;
					case 'test_sessions':
						return mockTestSessions;
					case 'tutor_conversations':
						return mockTutorConversations;
					case 'student_mathoux':
						return mockMathoux;
					case 'student_mathou_decorations':
						return mockMathouDecorations;
					case 'student_buddies':
						return mockBuddy;
					case 'student_last_visits':
						return { last_visit_date: '2026-10-20', welcome_back_on: '2026-10-20' };
					case 'game_players':
						return null; // maybeSingle returns null if no data
					default:
						return [];
				}
			};

			const data = getData();
			const createThenable = createThenableFor(table);

			// Create chain that works for all patterns
			const terminalResult = createThenable(data);

			// Methods that can be terminal
			// limit() peut être suivi d'un second limit() (table imbriquée, referencedTable)
			const limitFn = vi.fn().mockReturnValue({
				...terminalResult,
				limit: vi.fn().mockReturnValue(terminalResult)
			});
			const singleFn = vi.fn().mockReturnValue(terminalResult);
			const maybeSingleFn = vi.fn().mockReturnValue(terminalResult);
			const orFn = vi.fn().mockReturnValue(terminalResult);

			// order() returns something with limit()
			const orderFn = vi.fn().mockReturnValue({
				limit: limitFn,
				...terminalResult
			});

			// contains() (array filter, e.g. notifications.target_user_ids) → order/limit
			const containsFn = vi.fn().mockReturnValue({
				order: orderFn,
				limit: limitFn,
				...terminalResult
			});

			// eq() can be terminal or chained with order/single/maybeSingle
			const eqFn = vi.fn().mockReturnValue({
				order: orderFn,
				limit: limitFn,
				single: singleFn,
				maybeSingle: maybeSingleFn,
				...terminalResult
			});

			// select() returns something with eq/or/contains
			const selectFn = vi.fn().mockReturnValue({
				eq: eqFn,
				or: orFn,
				contains: containsFn,
				...terminalResult
			});

			return {
				select: selectFn
			};
		})
	});

	mockSupabase = build();
	serviceClient.current = build();
	return mockSupabase;
}

// ============================================================================
// TESTS
// ============================================================================

describe('GET /api/account/export', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRateLimitFn = vi.mocked(rateLimit.rateLimit);
		mockRateLimitFn.mockImplementation(() => {});
		setupMockSupabase();
	});

	// =========================================================================
	// RATE LIMITING TESTS
	// =========================================================================

	describe('Rate Limiting', () => {
		test('applies rate limit of 1 per hour', async () => {
			const event = createMockEvent();

			await GET(event as never);

			expect(mockRateLimitFn).toHaveBeenCalledWith(
				`account_export:${TEST_USER.id}`,
				1, // 1 attempt
				60 * 60 * 1000 // 1 hour in ms
			);
		});

		test('returns 429 when rate limited', async () => {
			mockRateLimitFn.mockImplementation(() => {
				const error = new Error('Rate limited') as Error & { status?: number };
				error.status = 429;
				throw error;
			});

			const event = createMockEvent();

			await expect(GET(event as never)).rejects.toMatchObject({
				status: 429
			});
		});
	});

	// =========================================================================
	// RESPONSE STRUCTURE TESTS
	// =========================================================================

	describe('Response Structure', () => {
		test('returns JSON with correct content-type', async () => {
			const event = createMockEvent();

			const response = await GET(event as never);

			expect(response.headers.get('Content-Type')).toContain('application/json');
		});

		test('includes Content-Disposition header for download', async () => {
			const event = createMockEvent();

			const response = await GET(event as never);

			const contentDisposition = response.headers.get('Content-Disposition');
			expect(contentDisposition).toContain('attachment');
			expect(contentDisposition).toContain('chiphre-export');
			expect(contentDisposition).toContain('.json');
		});

		test('includes no-cache headers', async () => {
			const event = createMockEvent();

			const response = await GET(event as never);

			expect(response.headers.get('Cache-Control')).toContain('no-store');
		});

		test('includes metadata section', async () => {
			const event = createMockEvent();

			const response = await GET(event as never);
			const data = await response.json();

			expect(data._metadata).toBeDefined();
			expect(data._metadata.exported_at).toBeDefined();
			expect(data._metadata.user_id).toBe(TEST_USER.id);
			expect(data._metadata.format_version).toBe('1.4');
			expect(data._metadata.gdpr_article).toContain('Article 20');
		});

		test('includes all data categories', async () => {
			const event = createMockEvent();

			const response = await GET(event as never);
			const data = await response.json();

			// Check all categories exist
			expect(data.profile).toBeDefined();
			expect(data.evaluation).toBeDefined();
			expect(data.activite).toBeDefined();
			expect(data.communications).toBeDefined();
			expect(data.social).toBeDefined();
			expect(data.gaming).toBeDefined();
			expect(data.rewards).toBeDefined();
			expect(data.classes).toBeDefined();
			expect(data.tuteur).toBeDefined();
		});
	});

	// =========================================================================
	// DATA CONTENT TESTS
	// =========================================================================

	describe('Data Content', () => {
		// C12 (décision de David, 2026-10-11) : le tuteur et la déclaration d'âge manquaient.
		test('contient les conversations avec le tuteur et leurs messages', async () => {
			const response = await GET(createMockEvent() as never);
			const data = await response.json();

			expect(data.tuteur.conversations).toEqual(mockTutorConversations);
			const appel = mockSupabase.from.mock.calls.findIndex(
				(c: unknown[]) => c[0] === 'tutor_conversations'
			);
			expect(appel).toBeGreaterThanOrEqual(0);
			// Seulement les conversations de l'appelant : jamais celles des élèves d'un prof.
			const chaine = mockSupabase.from.mock.results[appel].value;
			const eq = chaine.select.mock.results[0].value.eq;
			expect(eq).toHaveBeenCalledWith('student_id', TEST_USER.id);
			// Les inférences sur l'élève font partie de l'accès (art. 15).
			expect(chaine.select.mock.calls[0][0]).toContain('cheat_detected');
			expect(chaine.select.mock.calls[0][0]).toContain('effort_score');
		});

		// Mémoire des Mathoux (Chatterie, 2026-10-18) : meilleur stade et étoiles par notion
		test('contient la mémoire des Mathoux de l’appelant (catégorie gaming)', async () => {
			const response = await GET(createMockEvent() as never);
			const data = await response.json();

			expect(data.gaming.mathoux).toEqual(mockMathoux);
			const appel = mockSupabase.from.mock.calls.findIndex(
				(c: unknown[]) => c[0] === 'student_mathoux'
			);
			expect(appel).toBeGreaterThanOrEqual(0);
			const chaine = mockSupabase.from.mock.results[appel].value;
			expect(chaine.select.mock.calls[0][0]).toBe(
				'notion_id, best_stage, starred_grades, asleep, decoration, collar, glasses, hat, first_seen_at, updated_at'
			);
			const eq = chaine.select.mock.results[0].value.eq;
			expect(eq).toHaveBeenCalledWith('student_id', TEST_USER.id);
		});

		test('contient les décorations achetées par l’appelant, lunettes et chapeaux compris (catégorie gaming)', async () => {
			const response = await GET(createMockEvent() as never);
			const data = await response.json();

			expect(data.gaming.mathou_decorations).toEqual(mockMathouDecorations);
			const appel = mockSupabase.from.mock.calls.findIndex(
				(c: unknown[]) => c[0] === 'student_mathou_decorations'
			);
			expect(appel).toBeGreaterThanOrEqual(0);
			const chaine = mockSupabase.from.mock.results[appel].value;
			expect(chaine.select.mock.calls[0][0]).toBe('decoration, price_paid, purchased_at');
			const eq = chaine.select.mock.results[0].value.eq;
			expect(eq).toHaveBeenCalledWith('student_id', TEST_USER.id);
		});

		// Palotin de l'élève (décision de David, 2026-10-18)
		test('contient le Palotin de l’appelant (catégorie gaming)', async () => {
			const response = await GET(createMockEvent() as never);
			const data = await response.json();

			expect(data.gaming.palotin).toEqual(mockBuddy);
			const appel = mockSupabase.from.mock.calls.findIndex(
				(c: unknown[]) => c[0] === 'student_buddies'
			);
			expect(appel).toBeGreaterThanOrEqual(0);
			const chaine = mockSupabase.from.mock.results[appel].value;
			const colonnes = chaine.select.mock.calls[0][0] as string;
			for (const colonne of ['palotin_type', 'xp', 'themes_explored', 'constance_days_this_week']) {
				expect(colonnes).toContain(colonne);
			}
			const eq = chaine.select.mock.results[0].value.eq;
			expect(eq).toHaveBeenCalledWith('student_id', TEST_USER.id);
		});

		// Jour du dernier passage (Palotin triste au retour, 2026-10-21) : lisible par le
		// serveur seul, donc lu au client service, filtré sur l'identité de la session
		test('contient le jour du dernier passage et le retour à fêter, lus au client service pour l’appelant', async () => {
			const response = await GET(createMockEvent() as never);
			const data = await response.json();

			expect(data.gaming.dernier_passage).toBe('2026-10-20');
			expect(data.gaming.retour_a_feter).toBe('2026-10-20');
			const service = serviceClient.current as typeof mockSupabase;
			const appel = service.from.mock.calls.findIndex(
				(c: unknown[]) => c[0] === 'student_last_visits'
			);
			expect(appel).toBeGreaterThanOrEqual(0);
			const chaine = service.from.mock.results[appel].value;
			const eq = chaine.select.mock.results[0].value.eq;
			expect(eq).toHaveBeenCalledWith('student_id', TEST_USER.id);
			expect(
				mockSupabase.from.mock.calls.some((c: unknown[]) => c[0] === 'student_last_visits')
			).toBe(false);
		});

		test('le profil exporte le consentement parental et la déclaration d’âge', async () => {
			const response = await GET(createMockEvent() as never);
			const data = await response.json();

			expect(data.profile).toMatchObject({
				consent_required: true,
				consent_granted_at: null,
				consent_grace_period_ends: '2024-07-01T00:00:00Z',
				age_declaration: '15_plus',
				age_declared_at: '2024-06-15T00:00:00Z'
			});
		});

		test('includes profile data', async () => {
			const event = createMockEvent();

			const response = await GET(event as never);
			const data = await response.json();

			expect(data.profile.id).toBe(TEST_USER.id);
			expect(data.profile.email).toBe('test@example.com');
			expect(data.profile.firstname).toBeDefined();
		});

		test('evaluation and activite sections have correct structure', async () => {
			const event = createMockEvent();

			const response = await GET(event as never);
			const data = await response.json();

			// Évaluation référentielle (connaissances famille A + compétences famille B)
			expect(data.evaluation.connaissances).toBeDefined();
			expect(data.evaluation.competences).toBeDefined();
			expect(data.evaluation.tentatives).toBeDefined();
			expect(data.evaluation.observables).toBeDefined();
			// Activité exercices (section distincte de l'évaluation)
			expect(data.activite.completions).toBeDefined();
			expect(data.activite.mastery).toBeDefined();
			expect(data.activite.flashcard_decks).toBeDefined();
		});

		// Décision de David (2026-09-28) : l'export contient tout ce qu'on garde
		// sur l'élève, y compris ses sessions automaths et le détail des réponses.
		test('contient les sessions automaths avec leurs réponses', async () => {
			const response = await GET(createMockEvent() as never);
			const data = await response.json();

			expect(data.activite.automaths_sessions).toEqual(mockTestSessions);

			const call = mockSupabase.from.mock.results.find(
				(_r, i) => mockSupabase.from.mock.calls[i][0] === 'test_sessions'
			);
			const selectArg = call?.value.select.mock.calls[0][0] as string;
			expect(selectArg).toMatch(/test_answers\(/);
			// `test_sessions.assignment_id` a été supprimée (20260930150000) :
			// la citer ferait échouer toute la requête, donc l'export entier.
			expect(selectArg).not.toMatch(/\bassignment_id\b/);
			expect(selectArg).toMatch(/\bevaluation_id\b/);
			// Évaluation notée (chantier 5) : la note et les verdicts du serveur font
			// partie des données de l'élève
			const [sessionPart, answersPart] = selectArg.split('test_answers(');
			expect(sessionPart).toMatch(/\bgrade\b/);
			expect(sessionPart).toMatch(/\bpoints_earned\b/);
			expect(answersPart).toMatch(/\bpoints\b/);
			expect(answersPart).toMatch(/\bstatus\b/);
		});

		test('communications section has correct structure', async () => {
			const event = createMockEvent();

			const response = await GET(event as never);
			const data = await response.json();

			expect(data.communications.messages_sent).toBeDefined();
			expect(data.communications.private_messages_sent).toBeDefined();
			expect(data.communications.notifications).toBeDefined();
		});

		test('rewards section has correct structure', async () => {
			const event = createMockEvent();

			const response = await GET(event as never);
			const data = await response.json();

			// Rewards data was unified into the `reward_events` table; the old
			// inventory / gidouilles_history / bonus_history / purchases tables were
			// dropped and the export now reads `reward_events` (f97abdb00).
			expect(data.rewards.events).toBeDefined();
		});
	});

	// =========================================================================
	// SECURITY TESTS
	// =========================================================================

	// Un export qui omettrait une table sur une panne serait faux : 500, l'élève réessaie
	describe('Lecture en échec', () => {
		test.each([
			'student_mathoux',
			'student_mathou_decorations',
			'student_buddies',
			'student_last_visits'
		])('%s illisible → 500', async (table) => {
			failingTables.add(table);
			await expect(GET(createMockEvent() as never)).rejects.toMatchObject({ status: 500 });
		});
	});

	describe('Security', () => {
		test('does not include sensitive OAuth tokens', async () => {
			const event = createMockEvent();

			const response = await GET(event as never);
			const data = await response.json();
			const jsonString = JSON.stringify(data);

			// Should not contain token-related fields
			expect(jsonString).not.toContain('access_token');
			expect(jsonString).not.toContain('refresh_token');
			expect(jsonString).not.toContain('google_integrations');
		});

		test('profile does not include internal fields', async () => {
			const event = createMockEvent();

			const response = await GET(event as never);
			const data = await response.json();

			// Check that certain internal fields are not exposed
			// (these would depend on your actual schema)
			expect(data.profile).not.toHaveProperty('password_hash');
			expect(data.profile).not.toHaveProperty('is_test');
		});
	});

	// =========================================================================
	// DATA QUERIES TESTS
	// =========================================================================

	describe('Data Queries', () => {
		test('queries all required tables', async () => {
			const event = createMockEvent();

			await GET(event as never);

			// Verify that from() was called with expected tables
			const fromCalls = mockSupabase.from.mock.calls.map((call) => call[0]);

			expect(fromCalls).toContain('profiles');
			// Évaluation référentielle (connaissances famille A + compétences famille B)
			expect(fromCalls).toContain('student_point_state');
			expect(fromCalls).toContain('student_competence_level');
			expect(fromCalls).toContain('skill_attempts');
			expect(fromCalls).toContain('student_observable_state');
			// Activité exercices
			expect(fromCalls).toContain('exercise_completions');
			expect(fromCalls).toContain('student_exercise_mastery');
			expect(fromCalls).toContain('srs_decks');
			expect(fromCalls).toContain('messages');
			expect(fromCalls).toContain('friendships');
			expect(fromCalls).toContain('notifications');
		});

		test('never queries tables removed/renamed by schema drift', async () => {
			const event = createMockEvent();

			await GET(event as never);

			const fromCalls = mockSupabase.from.mock.calls.map((call) => call[0]);
			// These tables no longer exist in the current schema — querying them
			// silently returned empty data (the bug this fix closes).
			for (const dead of [
				'student_attempts',
				'student_progress',
				'assignment_submissions',
				'srs_cards'
			]) {
				expect(fromCalls).not.toContain(dead);
			}
		});
	});
});
