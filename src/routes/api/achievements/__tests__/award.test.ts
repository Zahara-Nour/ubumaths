/**
 * POST /api/achievements/award Tests
 * ===================================
 *
 * Tests for the manual achievement award endpoint (teacher only).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../award/+server';
import * as auth from '$lib/server/middleware/auth';
import * as studentAccess from '$lib/server/middleware/student-access';
import * as service from '$lib/server/achievements/service';

// Mock dependencies
vi.mock('$lib/server/middleware/auth');
vi.mock('$lib/server/middleware/student-access');
vi.mock('$lib/server/achievements/service');

describe('POST /api/achievements/award', () => {
	let mockLocals: { supabase: unknown; user?: { id: string } };
	let mockRequest: Request;

	const teacherId = '123e4567-e89b-12d3-a456-426614174000';
	const studentId = '123e4567-e89b-12d3-a456-426614174001';

	beforeEach(() => {
		vi.clearAllMocks();
		mockLocals = { supabase: {}, user: { id: teacherId } };
	});

	it('should allow teacher to award achievement to their student', async () => {
		const requestBody = {
			studentId,
			achievementId: 'social_helpful_peer',
			reason: 'Helped classmate understand math'
		};

		mockRequest = new Request('http://localhost/api/achievements/award', {
			method: 'POST',
			body: JSON.stringify(requestBody)
		});

		vi.mocked(auth.requireRoles).mockResolvedValue({
			user: { id: teacherId },
			profile: { role: 'teacher' }
		} as never);

		vi.mocked(studentAccess.verifyTeacherStudentWithRole).mockResolvedValue(true);
		vi.mocked(service.awardAchievement).mockResolvedValue(true);

		const response = await POST({ request: mockRequest, locals: mockLocals } as never);
		const data = await response.json();

		expect(service.awardAchievement).toHaveBeenCalledWith(
			mockLocals.supabase,
			teacherId,
			studentId,
			'social_helpful_peer',
			'Helped classmate understand math'
		);
		expect(data).toEqual({
			success: true,
			message: 'Achievement awarded successfully'
		});
	});

	it('should allow teacher to award achievement without reason', async () => {
		const requestBody = {
			studentId,
			achievementId: 'social_helpful_peer'
		};

		mockRequest = new Request('http://localhost/api/achievements/award', {
			method: 'POST',
			body: JSON.stringify(requestBody)
		});

		vi.mocked(auth.requireRoles).mockResolvedValue({
			user: { id: teacherId },
			profile: { role: 'teacher' }
		} as never);

		vi.mocked(studentAccess.verifyTeacherStudentWithRole).mockResolvedValue(true);
		vi.mocked(service.awardAchievement).mockResolvedValue(true);

		const response = await POST({ request: mockRequest, locals: mockLocals } as never);
		const data = await response.json();

		expect(service.awardAchievement).toHaveBeenCalledWith(
			mockLocals.supabase,
			teacherId,
			studentId,
			'social_helpful_peer',
			undefined
		);
		expect(data.success).toBe(true);
	});

	it('should allow admin to award achievement to any student', async () => {
		const requestBody = {
			studentId,
			achievementId: 'social_helpful_peer',
			reason: 'Admin award'
		};

		mockRequest = new Request('http://localhost/api/achievements/award', {
			method: 'POST',
			body: JSON.stringify(requestBody)
		});

		vi.mocked(auth.requireRoles).mockResolvedValue({
			user: { id: 'admin-id' },
			profile: { role: 'admin' }
		} as never);

		vi.mocked(studentAccess.verifyTeacherStudentWithRole).mockResolvedValue(true); // Admin bypass
		vi.mocked(service.awardAchievement).mockResolvedValue(true);

		const response = await POST({ request: mockRequest, locals: mockLocals } as never);
		const data = await response.json();

		expect(data.success).toBe(true);
	});

	it('should reject teacher without access to student', async () => {
		const requestBody = {
			studentId,
			achievementId: 'social_helpful_peer'
		};

		mockRequest = new Request('http://localhost/api/achievements/award', {
			method: 'POST',
			body: JSON.stringify(requestBody)
		});

		vi.mocked(auth.requireRoles).mockResolvedValue({
			user: { id: teacherId },
			profile: { role: 'teacher' }
		} as never);

		vi.mocked(studentAccess.verifyTeacherStudentWithRole).mockResolvedValue(false);

		try {
			await POST({ request: mockRequest, locals: mockLocals } as never);
			expect.fail('Should have thrown an error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(403);
			expect(error.body.message).toBe('You can only award achievements to students you teach');
		}
	});

	it('should validate student ID format', async () => {
		const requestBody = {
			studentId: 'invalid-uuid',
			achievementId: 'social_helpful_peer'
		};

		mockRequest = new Request('http://localhost/api/achievements/award', {
			method: 'POST',
			body: JSON.stringify(requestBody)
		});

		vi.mocked(auth.requireRoles).mockResolvedValue({
			user: { id: teacherId },
			profile: { role: 'teacher' }
		} as never);

		await expect(POST({ request: mockRequest, locals: mockLocals } as never)).rejects.toThrow();
	});

	it('should validate achievement ID format', async () => {
		const requestBody = {
			studentId,
			achievementId: 'Invalid ID!'
		};

		mockRequest = new Request('http://localhost/api/achievements/award', {
			method: 'POST',
			body: JSON.stringify(requestBody)
		});

		vi.mocked(auth.requireRoles).mockResolvedValue({
			user: { id: teacherId },
			profile: { role: 'teacher' }
		} as never);

		await expect(POST({ request: mockRequest, locals: mockLocals } as never)).rejects.toThrow();
	});

	it('should reject reason exceeding max length', async () => {
		const requestBody = {
			studentId,
			achievementId: 'social_helpful_peer',
			reason: 'a'.repeat(501) // Exceeds 500 character limit
		};

		mockRequest = new Request('http://localhost/api/achievements/award', {
			method: 'POST',
			body: JSON.stringify(requestBody)
		});

		vi.mocked(auth.requireRoles).mockResolvedValue({
			user: { id: teacherId },
			profile: { role: 'teacher' }
		} as never);

		await expect(POST({ request: mockRequest, locals: mockLocals } as never)).rejects.toThrow();
	});

	it('should handle service failure', async () => {
		const requestBody = {
			studentId,
			achievementId: 'social_helpful_peer'
		};

		mockRequest = new Request('http://localhost/api/achievements/award', {
			method: 'POST',
			body: JSON.stringify(requestBody)
		});

		vi.mocked(auth.requireRoles).mockResolvedValue({
			user: { id: teacherId },
			profile: { role: 'teacher' }
		} as never);

		vi.mocked(studentAccess.verifyTeacherStudentWithRole).mockResolvedValue(true);
		vi.mocked(service.awardAchievement).mockResolvedValue(false);

		try {
			await POST({ request: mockRequest, locals: mockLocals } as never);
			expect.fail('Should have thrown an error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(500);
			expect(error.body.message).toBe('Failed to award achievement');
		}
	});

	it('should handle service errors gracefully', async () => {
		const requestBody = {
			studentId,
			achievementId: 'social_helpful_peer'
		};

		mockRequest = new Request('http://localhost/api/achievements/award', {
			method: 'POST',
			body: JSON.stringify(requestBody)
		});

		vi.mocked(auth.requireRoles).mockResolvedValue({
			user: { id: teacherId },
			profile: { role: 'teacher' }
		} as never);

		vi.mocked(studentAccess.verifyTeacherStudentWithRole).mockResolvedValue(true);
		vi.mocked(service.awardAchievement).mockRejectedValue(
			new service.AchievementServiceError('RPC error', 'RPC_ERROR')
		);

		await expect(POST({ request: mockRequest, locals: mockLocals } as never)).rejects.toThrow();
	});
});
