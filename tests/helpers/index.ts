/**
 * Test Helpers - Main Barrel Export
 * ==================================
 *
 * Central export point for ALL test helpers in the UbuMaths project.
 * This is the recommended import path for test utilities.
 *
 * @example
 * ```typescript
 * import {
 *   // Supabase mocks
 *   createMockSupabase,
 *   createMockLocals,
 *   createMockRequest,
 *   mockSuccess,
 *   mockError,
 *   mockSequence,
 *
 *   // Fixtures
 *   mockIds,
 *   mockProfiles,
 *   createMockProfile
 * } from 'tests/helpers';
 *
 * describe('My API tests', () => {
 *   it('should handle authenticated request', async () => {
 *     const supabase = createMockSupabase();
 *     mockSuccess(supabase, { id: mockIds.student, name: 'Test' });
 *
 *     const locals = createMockLocals(mockIds.teacher, supabase, 'teacher');
 *     const request = createMockRequest({ studentId: mockIds.student });
 *
 *     const response = await POST({ request, locals });
 *     expect(response.status).toBe(200);
 *   });
 * });
 * ```
 *
 * ## Import Patterns
 *
 * ### Full Import (Recommended)
 * ```typescript
 * import { createMockSupabase, mockSuccess, mockIds } from 'tests/helpers';
 * ```
 *
 * ### Supabase Only
 * ```typescript
 * import { createMockSupabase, mockSuccess } from 'tests/helpers/supabase';
 * ```
 *
 * ### Fixtures Only
 * ```typescript
 * import { mockIds, createMockProfile } from 'tests/helpers/fixtures';
 * ```
 */

// ============================================================================
// SUPABASE MOCKS
// ============================================================================

// Re-export everything from supabase module
export * from './supabase';

// ============================================================================
// FIXTURES
// ============================================================================

// Re-export everything from fixtures module
export * from './fixtures';
