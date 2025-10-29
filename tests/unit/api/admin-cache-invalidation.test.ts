/**
 * Unit tests for Admin Cache Invalidation API Endpoint
 *
 * Tests the POST /api/admin/cache/invalidate endpoint that allows
 * admins to manually invalidate Redis and in-memory caches.
 *
 * Coverage:
 * 1. Authentication check (401 if not logged in)
 * 2. Authorization check (403 if not admin)
 * 3. School cache invalidation with valid ID
 * 4. School cache invalidation without ID (400 error)
 * 5. Templates cache invalidation (global, no ID)
 * 6. Profile cache invalidation with valid ID
 * 7. Profile cache invalidation without ID (400 error)
 * 8. Invalid cache type (400 error)
 * 9. Audit logging of invalidations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

// Mock @sveltejs/kit error function
vi.mock('@sveltejs/kit', async () => {
	const actual = await vi.importActual('@sveltejs/kit');
	return {
		...actual,
		error: (status: number, message: string) => {
			const err = new Error(message) as Error & { status: number; body: { message: string } };
			err.status = status;
			err.body = { message };
			return err;
		}
	};
});

// Mock cache invalidation modules
const mockInvalidateSchoolCache = vi.fn();
const mockInvalidateTemplatesCache = vi.fn();
const mockInvalidateProfileCache = vi.fn();
const mockGetCachedProfile = vi.fn();

vi.mock('$lib/server/cache/schools', () => ({
	invalidateSchoolCache: mockInvalidateSchoolCache
}));

vi.mock('$lib/server/cache/templates', () => ({
	invalidateTemplatesCache: mockInvalidateTemplatesCache
}));

vi.mock('$lib/server/cache/profile', () => ({
	invalidateProfileCache: mockInvalidateProfileCache,
	getCachedProfile: mockGetCachedProfile
}));

// Import the endpoint handler
const { POST } = await import('$lib/../routes/api/admin/cache/invalidate/+server');

describe('Admin Cache Invalidation API', () => {
	// Helper to create mock request event
	const createMockEvent = (params: {
		authenticated?: boolean;
		userId?: string;
		userRole?: 'student' | 'teacher' | 'admin';
		queryParams?: Record<string, string>;
	}): RequestEvent => {
		const {
			authenticated = true,
			userId = 'test-user-id',
			userRole: _userRole = 'admin',
			queryParams = {}
		} = params;

		const url = new URL('http://localhost:5175/api/admin/cache/invalidate');
		Object.entries(queryParams).forEach(([key, value]) => {
			url.searchParams.set(key, value);
		});

		const mockSupabase = {
			from: vi.fn()
		} as unknown as SupabaseClient<Database>;

		return {
			url,
			locals: {
				user: authenticated ? { id: userId } : null,
				supabase: mockSupabase
			},
			request: {} as Request
		} as unknown as RequestEvent;
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Authentication Check', () => {
		it('should return 401 if not authenticated', async () => {
			// Arrange
			const event = createMockEvent({ authenticated: false });

			// Act & Assert
			await expect(POST(event)).rejects.toThrow('Authentication required');

			// Verify error type
			try {
				await POST(event);
			} catch (err) {
				expect(err).toMatchObject({
					status: 401,
					body: { message: 'Authentication required. Please log in.' }
				});
			}
		});

		it('should not check role if user not authenticated', async () => {
			// Arrange
			const event = createMockEvent({
				authenticated: false,
				queryParams: { type: 'templates' }
			});

			// Act
			try {
				await POST(event);
			} catch (_err) {
				// Expected error
			}

			// Assert: getCachedProfile NOT called (auth fails first)
			expect(mockGetCachedProfile).not.toHaveBeenCalled();
		});
	});

	describe('Authorization Check', () => {
		it('should return 403 if user is not admin', async () => {
			// Arrange
			const event = createMockEvent({
				authenticated: true,
				userId: 'teacher-user',
				userRole: 'teacher',
				queryParams: { type: 'templates' }
			});

			mockGetCachedProfile.mockResolvedValue({ role: 'teacher' });

			// Act & Assert
			await expect(POST(event)).rejects.toThrow('Admin access required');

			try {
				await POST(event);
			} catch (err) {
				expect(err).toMatchObject({
					status: 403,
					body: {
						message: 'Admin access required. This action is restricted to administrators.'
					}
				});
			}
		});

		it('should return 403 if user is student', async () => {
			// Arrange
			const event = createMockEvent({
				authenticated: true,
				userId: 'student-user',
				userRole: 'student',
				queryParams: { type: 'school', id: '123-456' }
			});

			mockGetCachedProfile.mockResolvedValue({ role: 'student' });

			// Act & Assert
			await expect(POST(event)).rejects.toThrow('Admin access required');
		});

		it('should return 500 if profile loading fails', async () => {
			// Arrange
			const event = createMockEvent({
				authenticated: true,
				queryParams: { type: 'templates' }
			});

			mockGetCachedProfile.mockResolvedValue(null); // Profile load failed

			// Act & Assert
			await expect(POST(event)).rejects.toThrow('Failed to load user profile');

			try {
				await POST(event);
			} catch (err) {
				expect(err).toMatchObject({
					status: 500,
					body: { message: 'Failed to load user profile. Please try again.' }
				});
			}
		});

		it('should allow admin users to proceed', async () => {
			// Arrange
			const event = createMockEvent({
				authenticated: true,
				userId: 'admin-user',
				userRole: 'admin',
				queryParams: { type: 'templates' }
			});

			mockGetCachedProfile.mockResolvedValue({ role: 'admin' });
			mockInvalidateTemplatesCache.mockResolvedValue(undefined);

			// Act
			const response = await POST(event);
			const data = await response.json();

			// Assert: Request succeeds
			expect(data.success).toBe(true);
		});
	});

	describe('School Cache Invalidation', () => {
		it('should invalidate school cache with valid ID', async () => {
			// Arrange
			const schoolId = '550e8400-e29b-41d4-a716-446655440000';
			const event = createMockEvent({
				authenticated: true,
				userRole: 'admin',
				queryParams: { type: 'school', id: schoolId }
			});

			mockGetCachedProfile.mockResolvedValue({ role: 'admin' });
			mockInvalidateSchoolCache.mockResolvedValue(undefined);

			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			// Act
			const response = await POST(event);
			const data = await response.json();

			// Assert: Success response
			expect(data).toEqual({
				success: true,
				message: 'School cache invalidated successfully'
			});

			// Assert: School cache invalidated with correct ID
			expect(mockInvalidateSchoolCache).toHaveBeenCalledWith(schoolId);

			// Assert: Audit log (log format is a single string)
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringMatching(
					new RegExp(`\\[Admin Cache\\] School cache invalidated: ${schoolId} by admin`)
				)
			);

			consoleSpy.mockRestore();
		});

		it('should return 400 if school ID is missing', async () => {
			// Arrange
			const event = createMockEvent({
				authenticated: true,
				userRole: 'admin',
				queryParams: { type: 'school' } // Missing 'id' parameter
			});

			mockGetCachedProfile.mockResolvedValue({ role: 'admin' });

			// Act & Assert
			await expect(POST(event)).rejects.toThrow('Missing school ID');

			try {
				await POST(event);
			} catch (err) {
				expect(err).toMatchObject({
					status: 400,
					body: { message: 'Missing school ID. Provide ?type=school&id=SCHOOL_UUID' }
				});
			}

			// Verify invalidation NOT called
			expect(mockInvalidateSchoolCache).not.toHaveBeenCalled();
		});

		it('should return 500 if school invalidation fails', async () => {
			// Arrange
			const event = createMockEvent({
				authenticated: true,
				userRole: 'admin',
				queryParams: { type: 'school', id: '123-456' }
			});

			mockGetCachedProfile.mockResolvedValue({ role: 'admin' });
			mockInvalidateSchoolCache.mockRejectedValue(new Error('Redis connection failed'));

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			// Act & Assert
			await expect(POST(event)).rejects.toThrow('Failed to invalidate school cache');

			try {
				await POST(event);
			} catch (err) {
				expect(err).toMatchObject({
					status: 500,
					body: { message: 'Failed to invalidate school cache. Please try again.' }
				});
			}

			// Assert: Error logged
			expect(consoleSpy).toHaveBeenCalledWith(
				'[Admin Cache] Failed to invalidate school cache:',
				expect.any(Error)
			);

			consoleSpy.mockRestore();
		});
	});

	describe('Templates Cache Invalidation', () => {
		it('should invalidate templates cache without ID', async () => {
			// Arrange
			const event = createMockEvent({
				authenticated: true,
				userRole: 'admin',
				queryParams: { type: 'templates' } // No 'id' required (global cache)
			});

			mockGetCachedProfile.mockResolvedValue({ role: 'admin' });
			mockInvalidateTemplatesCache.mockResolvedValue(undefined);

			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			// Act
			const response = await POST(event);
			const data = await response.json();

			// Assert: Success response
			expect(data).toEqual({
				success: true,
				message: 'Templates cache invalidated successfully'
			});

			// Assert: Templates cache invalidated (no ID needed)
			expect(mockInvalidateTemplatesCache).toHaveBeenCalledOnce();

			// Assert: Audit log
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('[Admin Cache] Templates cache invalidated by admin')
			);

			consoleSpy.mockRestore();
		});

		it('should return 500 if templates invalidation fails', async () => {
			// Arrange
			const event = createMockEvent({
				authenticated: true,
				userRole: 'admin',
				queryParams: { type: 'templates' }
			});

			mockGetCachedProfile.mockResolvedValue({ role: 'admin' });
			mockInvalidateTemplatesCache.mockRejectedValue(new Error('Cache server down'));

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			// Act & Assert
			await expect(POST(event)).rejects.toThrow('Failed to invalidate templates cache');

			try {
				await POST(event);
			} catch (err) {
				expect(err).toMatchObject({
					status: 500,
					body: { message: 'Failed to invalidate templates cache. Please try again.' }
				});
			}

			consoleSpy.mockRestore();
		});
	});

	describe('Profile Cache Invalidation', () => {
		it('should invalidate profile cache with valid ID', async () => {
			// Arrange
			const profileUserId = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
			const event = createMockEvent({
				authenticated: true,
				userRole: 'admin',
				queryParams: { type: 'profile', id: profileUserId }
			});

			mockGetCachedProfile.mockResolvedValue({ role: 'admin' });
			mockInvalidateProfileCache.mockReturnValue(undefined);

			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			// Act
			const response = await POST(event);
			const data = await response.json();

			// Assert: Success response
			expect(data).toEqual({
				success: true,
				message: 'Profile cache invalidated successfully'
			});

			// Assert: Profile cache invalidated with correct ID
			expect(mockInvalidateProfileCache).toHaveBeenCalledWith(profileUserId);

			// Assert: Audit log (single string format)
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringMatching(
					new RegExp(`\\[Admin Cache\\] Profile cache invalidated: ${profileUserId} by admin`)
				)
			);

			consoleSpy.mockRestore();
		});

		it('should return 400 if profile ID is missing', async () => {
			// Arrange
			const event = createMockEvent({
				authenticated: true,
				userRole: 'admin',
				queryParams: { type: 'profile' } // Missing 'id' parameter
			});

			mockGetCachedProfile.mockResolvedValue({ role: 'admin' });

			// Act & Assert
			await expect(POST(event)).rejects.toThrow('Missing user ID');

			try {
				await POST(event);
			} catch (err) {
				expect(err).toMatchObject({
					status: 400,
					body: { message: 'Missing user ID. Provide ?type=profile&id=USER_UUID' }
				});
			}

			// Verify invalidation NOT called
			expect(mockInvalidateProfileCache).not.toHaveBeenCalled();
		});

		it('should return 500 if profile invalidation fails', async () => {
			// Arrange
			const event = createMockEvent({
				authenticated: true,
				userRole: 'admin',
				queryParams: { type: 'profile', id: 'user-123' }
			});

			mockGetCachedProfile.mockResolvedValue({ role: 'admin' });
			// Note: invalidateProfileCache is synchronous, so we mock a throw
			mockInvalidateProfileCache.mockImplementation(() => {
				throw new Error('Memory cache corrupted');
			});

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			// Act & Assert
			await expect(POST(event)).rejects.toThrow('Failed to invalidate profile cache');

			try {
				await POST(event);
			} catch (err) {
				expect(err).toMatchObject({
					status: 500,
					body: { message: 'Failed to invalidate profile cache. Please try again.' }
				});
			}

			consoleSpy.mockRestore();
		});
	});

	describe('Invalid Cache Type', () => {
		it('should return 400 for invalid cache type', async () => {
			// Arrange
			const event = createMockEvent({
				authenticated: true,
				userRole: 'admin',
				queryParams: { type: 'invalid-type' }
			});

			mockGetCachedProfile.mockResolvedValue({ role: 'admin' });

			// Act & Assert
			await expect(POST(event)).rejects.toThrow('Invalid cache type: invalid-type');

			try {
				await POST(event);
			} catch (err) {
				expect(err).toMatchObject({
					status: 400,
					body: {
						message: 'Invalid cache type: invalid-type. Valid types: school, templates, profile'
					}
				});
			}

			// Verify no cache invalidation called
			expect(mockInvalidateSchoolCache).not.toHaveBeenCalled();
			expect(mockInvalidateTemplatesCache).not.toHaveBeenCalled();
			expect(mockInvalidateProfileCache).not.toHaveBeenCalled();
		});

		it('should return 400 if type parameter is missing', async () => {
			// Arrange
			const event = createMockEvent({
				authenticated: true,
				userRole: 'admin',
				queryParams: {} // No 'type' parameter
			});

			mockGetCachedProfile.mockResolvedValue({ role: 'admin' });

			// Act & Assert
			await expect(POST(event)).rejects.toThrow('Missing required parameter: type');

			try {
				await POST(event);
			} catch (err) {
				expect(err).toMatchObject({
					status: 400,
					body: {
						message: 'Missing required parameter: type. Use: school, templates, or profile'
					}
				});
			}
		});

		it('should reject unknown cache types', async () => {
			// Test various invalid types
			const invalidTypes = ['users', 'assessments', 'activities', 'foo', ''];

			for (const invalidType of invalidTypes) {
				vi.clearAllMocks();

				const event = createMockEvent({
					authenticated: true,
					userRole: 'admin',
					queryParams: { type: invalidType }
				});

				mockGetCachedProfile.mockResolvedValue({ role: 'admin' });

				await expect(POST(event)).rejects.toThrow(
					invalidType ? `Invalid cache type: ${invalidType}` : 'Missing required parameter: type'
				);
			}
		});
	});

	describe('Audit Logging', () => {
		it('should log admin user ID for school invalidation', async () => {
			// Arrange
			const adminUserId = 'admin-xyz-123';
			const schoolId = 'school-abc-456';
			const event = createMockEvent({
				authenticated: true,
				userId: adminUserId,
				userRole: 'admin',
				queryParams: { type: 'school', id: schoolId }
			});

			mockGetCachedProfile.mockResolvedValue({ role: 'admin' });
			mockInvalidateSchoolCache.mockResolvedValue(undefined);

			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			// Act
			await POST(event);

			// Assert: Audit log includes admin user ID
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringMatching(new RegExp(`admin ${adminUserId}`))
			);

			consoleSpy.mockRestore();
		});

		it('should log admin user ID for templates invalidation', async () => {
			// Arrange
			const adminUserId = 'admin-templates-user';
			const event = createMockEvent({
				authenticated: true,
				userId: adminUserId,
				userRole: 'admin',
				queryParams: { type: 'templates' }
			});

			mockGetCachedProfile.mockResolvedValue({ role: 'admin' });
			mockInvalidateTemplatesCache.mockResolvedValue(undefined);

			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			// Act
			await POST(event);

			// Assert: Audit log includes admin user ID
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringMatching(new RegExp(`admin ${adminUserId}`))
			);

			consoleSpy.mockRestore();
		});

		it('should log admin user ID for profile invalidation', async () => {
			// Arrange
			const adminUserId = 'admin-profile-user';
			const targetUserId = 'target-user-123';
			const event = createMockEvent({
				authenticated: true,
				userId: adminUserId,
				userRole: 'admin',
				queryParams: { type: 'profile', id: targetUserId }
			});

			mockGetCachedProfile.mockResolvedValue({ role: 'admin' });
			mockInvalidateProfileCache.mockReturnValue(undefined);

			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			// Act
			await POST(event);

			// Assert: Audit log includes both admin and target user IDs (single string format)
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringMatching(
					new RegExp(
						`\\[Admin Cache\\] Profile cache invalidated: ${targetUserId} by admin ${adminUserId}`
					)
				)
			);

			consoleSpy.mockRestore();
		});

		it('should log errors with context', async () => {
			// Arrange
			const event = createMockEvent({
				authenticated: true,
				userRole: 'admin',
				queryParams: { type: 'school', id: 'error-school' }
			});

			mockGetCachedProfile.mockResolvedValue({ role: 'admin' });
			const cacheError = new Error('Redis timeout');
			mockInvalidateSchoolCache.mockRejectedValue(cacheError);

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			// Act
			try {
				await POST(event);
			} catch (_err) {
				// Expected error
			}

			// Assert: Error logged with context
			expect(consoleSpy).toHaveBeenCalledWith(
				'[Admin Cache] Failed to invalidate school cache:',
				cacheError
			);

			consoleSpy.mockRestore();
		});
	});

	describe('Integration Scenarios', () => {
		it('should handle complete workflow: auth → authorize → invalidate → log', async () => {
			// Arrange
			const event = createMockEvent({
				authenticated: true,
				userId: 'admin-complete',
				userRole: 'admin',
				queryParams: { type: 'templates' }
			});

			mockGetCachedProfile.mockResolvedValue({ role: 'admin' });
			mockInvalidateTemplatesCache.mockResolvedValue(undefined);

			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			// Act
			const response = await POST(event);
			const data = await response.json();

			// Assert: Complete workflow executed
			expect(mockGetCachedProfile).toHaveBeenCalledOnce(); // Authorization check
			expect(mockInvalidateTemplatesCache).toHaveBeenCalledOnce(); // Cache invalidation
			expect(consoleSpy).toHaveBeenCalled(); // Audit logging
			expect(data.success).toBe(true);

			consoleSpy.mockRestore();
		});

		it('should validate all three cache types in sequence', async () => {
			// Test school, templates, and profile in order
			const adminUserId = 'admin-seq-test';

			// 1. School cache
			vi.clearAllMocks();
			const schoolEvent = createMockEvent({
				authenticated: true,
				userId: adminUserId,
				userRole: 'admin',
				queryParams: { type: 'school', id: 'school-1' }
			});
			mockGetCachedProfile.mockResolvedValue({ role: 'admin' });
			mockInvalidateSchoolCache.mockResolvedValue(undefined);

			let response = await POST(schoolEvent);
			let data = await response.json();
			expect(data.success).toBe(true);
			expect(mockInvalidateSchoolCache).toHaveBeenCalledWith('school-1');

			// 2. Templates cache
			vi.clearAllMocks();
			const templatesEvent = createMockEvent({
				authenticated: true,
				userId: adminUserId,
				userRole: 'admin',
				queryParams: { type: 'templates' }
			});
			mockGetCachedProfile.mockResolvedValue({ role: 'admin' });
			mockInvalidateTemplatesCache.mockResolvedValue(undefined);

			response = await POST(templatesEvent);
			data = await response.json();
			expect(data.success).toBe(true);
			expect(mockInvalidateTemplatesCache).toHaveBeenCalledOnce();

			// 3. Profile cache
			vi.clearAllMocks();
			const profileEvent = createMockEvent({
				authenticated: true,
				userId: adminUserId,
				userRole: 'admin',
				queryParams: { type: 'profile', id: 'user-1' }
			});
			mockGetCachedProfile.mockResolvedValue({ role: 'admin' });
			mockInvalidateProfileCache.mockReturnValue(undefined);

			response = await POST(profileEvent);
			data = await response.json();
			expect(data.success).toBe(true);
			expect(mockInvalidateProfileCache).toHaveBeenCalledWith('user-1');
		});
	});
});
