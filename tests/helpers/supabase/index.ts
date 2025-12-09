/**
 * Supabase Test Helpers - Barrel Export
 * ======================================
 *
 * Central export point for all Supabase testing utilities.
 * Import from this file to access the unified mock Supabase client
 * and all related helper functions.
 *
 * @example
 * ```typescript
 * import {
 *   createMockSupabase,
 *   createMockLocals,
 *   createMockRequest,
 *   mockSuccess,
 *   mockError,
 *   mockSequence
 * } from 'tests/helpers/supabase';
 *
 * describe('MyAPI', () => {
 *   it('should work', async () => {
 *     const supabase = createMockSupabase();
 *     mockSuccess(supabase, { id: '123' });
 *
 *     const locals = createMockLocals('user-123', supabase);
 *     const request = createMockRequest({ action: 'test' });
 *
 *     const response = await POST({ request, locals });
 *     expect(response.status).toBe(200);
 *   });
 * });
 * ```
 */

// ============================================================================
// MOCK CLIENT
// ============================================================================

export {
	// Main factory
	createMockSupabase,

	// Auth configuration
	configureAuthUser,
	configureAuthUnauthenticated,
	configureAuthError,

	// Reset helper
	resetMockSupabase,

	// Types
	type MockChain,
	type MockAuth,
	type MockSupabaseClient,
	type RpcMockValue,
	type SupabaseResponse
} from './mock-client';

// ============================================================================
// MOCK LOCALS
// ============================================================================

export {
	// Main factory
	createMockLocals,

	// Specialized factories
	createStudentLocals,
	createTeacherLocals,
	createAdminLocals,
	createUnauthenticatedLocals,

	// Configuration helpers
	configureLocalsProfile,
	configureSessionExpired,
	configureTestUser,

	// Types
	type UserRole,
	type MockUser,
	type MockProfile,
	type MockSession,
	type SafeGetSessionResult,
	type MockLocals
} from './mock-locals';

// ============================================================================
// MOCK REQUEST
// ============================================================================

export {
	// Main factories
	createMockRequest,
	createMockRequestAdvanced,
	createMockURL,

	// Specialized factories
	createMockGetRequest,
	createMockPostRequest,
	createMockPutRequest,
	createMockPatchRequest,
	createMockDeleteRequest,
	createMockFormRequest,

	// Types
	type MockRequestBody,
	type MockFormDataEntries,
	type HttpMethod,
	type MockRequestOptions
} from './mock-request';

// ============================================================================
// MOCK HELPERS
// ============================================================================

export {
	// Core helpers
	mockSuccess,
	mockError,
	mockSequence,

	// RPC helpers
	mockRpcSuccess,
	mockRpcError,
	clearRpcMocks,

	// Assertion helpers
	expectTableQuery,
	expectErrorResponse,
	expectSuccessResponse,

	// Advanced helpers
	mockQueryChain,
	mockInsertWithId,
	mockUpdateMerge,

	// Types
	type TerminalMethod,
	type MockResponse
} from './mock-helpers';
