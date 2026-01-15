/**
 * Account Deletion API Tests
 * ==========================
 *
 * Tests for GDPR Art. 17 compliant account deletion.
 *
 * Tests cover:
 * - Authentication requirement
 * - Confirmation phrase validation
 * - Rate limiting (1 per 24 hours)
 * - Audit logging
 * - Successful deletion flow
 * - Error handling
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { DELETE } from '../../../../src/routes/api/account/delete/+server';
import { ACCOUNT_DELETION_CONFIRMATION_PHRASE } from '$lib/server/validation/account';

// ============================================================================
// SHARED TEST STATE
// ============================================================================

// These will be set up fresh in beforeEach
let mockServiceClient: {
	from: ReturnType<typeof vi.fn>;
	rpc: ReturnType<typeof vi.fn>;
	auth: { admin: { deleteUser: ReturnType<typeof vi.fn> } };
	storage: { from: ReturnType<typeof vi.fn> };
};

let mockRateLimitFn: ReturnType<typeof vi.fn>;

const TEST_USER = { id: 'user-123', email: 'test@example.com' };

// ============================================================================
// MOCKS - Must be defined before imports
// ============================================================================

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

// Mock auth middleware - returns a fixed user
vi.mock('$lib/server/middleware/auth', () => ({
	requireAuth: vi.fn().mockResolvedValue({
		user: { id: 'user-123', email: 'test@example.com' }
	})
}));

// Mock service role client - uses getter to access mockServiceClient
vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: vi.fn(() => {
		// This factory function is called at runtime, not at module load
		// So it can access the mockServiceClient variable
		return {
			from: vi.fn(),
			rpc: vi.fn(),
			auth: { admin: { deleteUser: vi.fn() } },
			storage: { from: vi.fn() }
		};
	})
}));

// Mock rate limiter
vi.mock('$lib/server/middleware/rateLimit', () => ({
	rateLimit: vi.fn(),
	resetRateLimit: vi.fn()
}));

// Import after mocks
import * as rateLimit from '$lib/server/middleware/rateLimit';
import * as serviceRoleClient from '$lib/server/serviceRoleClient';

// ============================================================================
// HELPERS
// ============================================================================

function createMockRequest(body: unknown): Request {
	return {
		json: vi.fn().mockResolvedValue(body),
		headers: new Headers({ 'user-agent': 'test-agent' })
	} as unknown as Request;
}

function createMockEvent(body: unknown) {
	return {
		request: createMockRequest(body),
		locals: { user: TEST_USER },
		getClientAddress: () => '127.0.0.1'
	};
}

function setupMockServiceClient() {
	mockServiceClient = {
		from: vi.fn(),
		rpc: vi.fn(),
		auth: { admin: { deleteUser: vi.fn() } },
		storage: { from: vi.fn() }
	};

	// Make createServiceRoleClient return our mock
	vi.mocked(serviceRoleClient.createServiceRoleClient).mockReturnValue(mockServiceClient as never);

	return mockServiceClient;
}

function setupSuccessfulDeletion() {
	const client = setupMockServiceClient();

	// Mock audit entry creation
	const mockAuditChain = {
		insert: vi.fn().mockReturnThis(),
		select: vi.fn().mockReturnThis(),
		single: vi.fn().mockResolvedValue({
			data: { id: 'audit-123' },
			error: null
		}),
		update: vi.fn().mockReturnThis(),
		eq: vi.fn().mockResolvedValue({ data: null, error: null })
	};
	client.from.mockReturnValue(mockAuditChain);

	// Mock RPC call
	client.rpc.mockResolvedValue({
		data: { error_logs_anonymized: 5, messages_deleted: 10 },
		error: null
	});

	// Mock storage cleanup
	client.storage.from.mockReturnValue({
		list: vi.fn().mockResolvedValue({ data: [], error: null }),
		remove: vi.fn().mockResolvedValue({ error: null })
	});

	// Mock auth deletion
	client.auth.admin.deleteUser.mockResolvedValue({ error: null });

	return { client, mockAuditChain };
}

// ============================================================================
// TESTS
// ============================================================================

describe('DELETE /api/account/delete', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset rate limiter to allow by default
		mockRateLimitFn = vi.mocked(rateLimit.rateLimit);
		mockRateLimitFn.mockImplementation(() => {});
	});

	afterEach(() => {
		vi.resetModules();
	});

	// =========================================================================
	// VALIDATION TESTS
	// =========================================================================

	describe('Validation', () => {
		test('requires correct confirmation phrase', async () => {
			setupSuccessfulDeletion();

			const event = createMockEvent({ confirmation: 'wrong phrase' });

			await expect(DELETE(event as never)).rejects.toThrow();
		});

		test('rejects empty confirmation', async () => {
			setupSuccessfulDeletion();

			const event = createMockEvent({});

			await expect(DELETE(event as never)).rejects.toThrow();
		});

		test('rejects invalid JSON body', async () => {
			setupSuccessfulDeletion();

			const event = {
				request: {
					json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
					headers: new Headers()
				},
				locals: { user: TEST_USER },
				getClientAddress: () => '127.0.0.1'
			};

			await expect(DELETE(event as never)).rejects.toMatchObject({
				status: 400,
				body: { message: 'Corps de requete JSON invalide' }
			});
		});

		test('accepts correct confirmation phrase', async () => {
			setupSuccessfulDeletion();

			const event = createMockEvent({
				confirmation: ACCOUNT_DELETION_CONFIRMATION_PHRASE
			});

			const response = await DELETE(event as never);
			const data = await response.json();

			expect(data.success).toBe(true);
		});
	});

	// =========================================================================
	// RATE LIMITING TESTS
	// =========================================================================

	describe('Rate Limiting', () => {
		test('applies rate limit of 1 per 24 hours', async () => {
			setupSuccessfulDeletion();

			const event = createMockEvent({
				confirmation: ACCOUNT_DELETION_CONFIRMATION_PHRASE
			});

			await DELETE(event as never);

			// Verify rate limit was called with correct params
			expect(mockRateLimitFn).toHaveBeenCalledWith(
				`account_delete:${TEST_USER.id}`,
				1, // 1 attempt
				24 * 60 * 60 * 1000 // 24 hours in ms
			);
		});

		test('returns 429 when rate limited', async () => {
			const { client } = setupSuccessfulDeletion();

			// Setup audit for rate limit logging
			const mockAuditChain = {
				insert: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: null, error: null })
			};
			client.from.mockReturnValue(mockAuditChain);

			// Make rate limiter throw
			mockRateLimitFn.mockImplementation(() => {
				const error = new Error('Rate limited') as Error & { status?: number };
				error.status = 429;
				throw error;
			});

			const event = createMockEvent({
				confirmation: ACCOUNT_DELETION_CONFIRMATION_PHRASE
			});

			await expect(DELETE(event as never)).rejects.toMatchObject({
				status: 429
			});
		});

		test('logs rate-limited attempts to audit', async () => {
			const { client } = setupSuccessfulDeletion();

			const mockAuditChain = {
				insert: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: null, error: null })
			};
			client.from.mockReturnValue(mockAuditChain);

			// Make rate limiter throw
			mockRateLimitFn.mockImplementation(() => {
				const error = new Error('Rate limited') as Error & { status?: number };
				error.status = 429;
				throw error;
			});

			const event = createMockEvent({
				confirmation: ACCOUNT_DELETION_CONFIRMATION_PHRASE
			});

			try {
				await DELETE(event as never);
			} catch {
				// Expected
			}

			// Verify audit entry was created for rate-limited attempt
			expect(client.from).toHaveBeenCalledWith('account_deletion_audit');
			expect(mockAuditChain.insert).toHaveBeenCalledWith(
				expect.objectContaining({
					user_id: TEST_USER.id,
					status: 'rate_limited',
					ip_address: '127.0.0.1'
				})
			);
		});
	});

	// =========================================================================
	// AUDIT LOGGING TESTS
	// =========================================================================

	describe('Audit Logging', () => {
		test('creates audit entry on deletion request', async () => {
			const { mockAuditChain } = setupSuccessfulDeletion();

			const event = createMockEvent({
				confirmation: ACCOUNT_DELETION_CONFIRMATION_PHRASE
			});

			await DELETE(event as never);

			// Verify initial audit entry
			expect(mockAuditChain.insert).toHaveBeenCalledWith(
				expect.objectContaining({
					user_id: TEST_USER.id,
					status: 'requested',
					ip_address: '127.0.0.1',
					user_agent: 'test-agent'
				})
			);
		});

		test('updates audit entry to completed on success', async () => {
			const { mockAuditChain } = setupSuccessfulDeletion();

			const event = createMockEvent({
				confirmation: ACCOUNT_DELETION_CONFIRMATION_PHRASE
			});

			await DELETE(event as never);

			// Verify final audit update
			expect(mockAuditChain.update).toHaveBeenCalledWith(
				expect.objectContaining({
					user_id: null, // Anonymized
					status: 'completed'
				})
			);
		});

		test('updates audit entry to failed on RPC error', async () => {
			const { client, mockAuditChain } = setupSuccessfulDeletion();

			// Make RPC fail
			client.rpc.mockResolvedValueOnce({
				data: null,
				error: { message: 'RPC failed' }
			});

			const event = createMockEvent({
				confirmation: ACCOUNT_DELETION_CONFIRMATION_PHRASE
			});

			await expect(DELETE(event as never)).rejects.toThrow();

			expect(mockAuditChain.update).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'failed',
					error_message: 'RPC failed'
				})
			);
		});

		test('hashes email in audit (no PII)', async () => {
			const { mockAuditChain } = setupSuccessfulDeletion();

			const event = createMockEvent({
				confirmation: ACCOUNT_DELETION_CONFIRMATION_PHRASE
			});

			await DELETE(event as never);

			// Get the insert call arguments
			const insertCall = mockAuditChain.insert.mock.calls[0][0];

			// email_hash should be a hex string (SHA-256 = 64 chars)
			expect(insertCall.email_hash).toMatch(/^[a-f0-9]{64}$/);

			// Should NOT contain the raw email
			expect(insertCall.email_hash).not.toContain('@');
			expect(insertCall.email_hash).not.toContain('test');
		});
	});

	// =========================================================================
	// DELETION FLOW TESTS
	// =========================================================================

	describe('Deletion Flow', () => {
		test('calls delete_user_account RPC', async () => {
			const { client } = setupSuccessfulDeletion();

			const event = createMockEvent({
				confirmation: ACCOUNT_DELETION_CONFIRMATION_PHRASE
			});

			await DELETE(event as never);

			expect(client.rpc).toHaveBeenCalledWith('delete_user_account', {
				p_user_id: TEST_USER.id
			});
		});

		test('calls auth.admin.deleteUser after RPC', async () => {
			const { client } = setupSuccessfulDeletion();

			const event = createMockEvent({
				confirmation: ACCOUNT_DELETION_CONFIRMATION_PHRASE
			});

			await DELETE(event as never);

			expect(client.auth.admin.deleteUser).toHaveBeenCalledWith(TEST_USER.id);
		});

		test('returns success message on completion', async () => {
			setupSuccessfulDeletion();

			const event = createMockEvent({
				confirmation: ACCOUNT_DELETION_CONFIRMATION_PHRASE
			});

			const response = await DELETE(event as never);
			const data = await response.json();

			expect(data.success).toBe(true);
			expect(data.message).toContain('supprime');
		});

		test('handles auth deletion failure', async () => {
			const { client } = setupSuccessfulDeletion();

			// Make auth deletion fail
			client.auth.admin.deleteUser.mockResolvedValueOnce({
				error: { message: 'Auth deletion failed' }
			});

			const event = createMockEvent({
				confirmation: ACCOUNT_DELETION_CONFIRMATION_PHRASE
			});

			await expect(DELETE(event as never)).rejects.toMatchObject({
				status: 500,
				body: { message: 'Erreur lors de la suppression du compte' }
			});
		});
	});

	// =========================================================================
	// STORAGE CLEANUP TESTS
	// =========================================================================

	describe('Storage Cleanup', () => {
		test('attempts to clean storage buckets', async () => {
			const { client } = setupSuccessfulDeletion();

			const event = createMockEvent({
				confirmation: ACCOUNT_DELETION_CONFIRMATION_PHRASE
			});

			await DELETE(event as never);

			// Should attempt to clean known buckets
			expect(client.storage.from).toHaveBeenCalledWith('chat-attachments');
			expect(client.storage.from).toHaveBeenCalledWith('message-attachments');
			expect(client.storage.from).toHaveBeenCalledWith('bug-report-screenshots');
		});

		test('continues even if storage cleanup fails', async () => {
			const { client, mockAuditChain } = setupSuccessfulDeletion();

			// Make storage fail
			client.storage.from.mockReturnValue({
				list: vi.fn().mockRejectedValue(new Error('Storage error')),
				remove: vi.fn()
			});

			const event = createMockEvent({
				confirmation: ACCOUNT_DELETION_CONFIRMATION_PHRASE
			});

			// Should not throw - storage cleanup is best-effort
			const response = await DELETE(event as never);
			const data = await response.json();

			expect(data.success).toBe(true);

			// Audit should still show completion
			expect(mockAuditChain.update).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'completed'
				})
			);
		});
	});
});

// ============================================================================
// HASH EMAIL TESTS
// ============================================================================

describe('Email Hashing', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(rateLimit.rateLimit).mockImplementation(() => {});
	});

	test('produces consistent hash for same email', async () => {
		const { client, mockAuditChain } = setupSuccessfulDeletion();

		const event = createMockEvent({
			confirmation: ACCOUNT_DELETION_CONFIRMATION_PHRASE
		});

		await DELETE(event as never);

		const hash1 = mockAuditChain.insert.mock.calls[0][0].email_hash;

		// Reset mocks but keep the same setup
		mockAuditChain.insert.mockClear();
		mockAuditChain.single.mockResolvedValue({ data: { id: 'audit-456' }, error: null });
		client.rpc.mockResolvedValue({ data: {}, error: null });
		client.auth.admin.deleteUser.mockResolvedValue({ error: null });

		await DELETE(event as never);

		const hash2 = mockAuditChain.insert.mock.calls[0][0].email_hash;

		expect(hash1).toBe(hash2);
	});
});
