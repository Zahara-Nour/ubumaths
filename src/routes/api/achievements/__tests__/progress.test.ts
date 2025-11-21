/**
 * GET /api/achievements/student/[studentId]/progress/[achievementId] Tests
 * =========================================================================
 *
 * Tests for the achievement progress endpoint.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../student/[studentId]/progress/[achievementId]/+server';
import * as auth from '$lib/server/middleware/auth';
import * as studentAccess from '$lib/server/middleware/student-access';
import * as service from '$lib/server/achievements/service';

// Mock dependencies
vi.mock('$lib/server/middleware/auth');
vi.mock('$lib/server/middleware/student-access');
vi.mock('$lib/server/achievements/service');

describe('GET /api/achievements/student/[studentId]/progress/[achievementId]', () => {
	let mockLocals: { supabase: unknown; user?: { id: string } };
	let mockParams: { studentId: string; achievementId: string };
	let mockUrl: URL;

	const teacherId = '123e4567-e89b-12d3-a456-426614174000';
	const studentId = '123e4567-e89b-12d3-a456-426614174001';
	const achievementId = 'questions_master_calculus';

	beforeEach(() => {
		vi.clearAllMocks();
		mockLocals = { supabase: {}, user: { id: teacherId } };
		mockParams = { studentId, achievementId };
		mockUrl = new URL(
			`http://localhost/api/achievements/student/${studentId}/progress/${achievementId}`
		);
	});

	it('should return progress for valid request', async () => {
		const mockProgress = {
			id: 'uuid',
			student_id: studentId,
			achievement_id: achievementId,
			current_value: 73,
			target_value: 100,
			progress_percentage: 73
		};

		vi.mocked(auth.requireRole).mockResolvedValue({
			user: { id: studentId },
			profile: { role: 'student' }
		} as never);

		vi.mocked(service.getStudentProgress).mockResolvedValue(mockProgress as never);

		const response = await GET({
			url: mockUrl,
			params: mockParams,
			locals: mockLocals
		} as never);
		const data = await response.json();

		expect(data).toEqual({
			success: true,
			progress: mockProgress
		});
	});

	it('should allow teacher to view student progress', async () => {
		const mockProgress = {
			id: 'uuid',
			student_id: studentId,
			achievement_id: achievementId,
			current_value: 50,
			target_value: 100,
			progress_percentage: 50
		};

		vi.mocked(auth.requireRole).mockResolvedValue({
			user: { id: teacherId },
			profile: { role: 'teacher' }
		} as never);

		vi.mocked(studentAccess.verifyTeacherStudentWithRole).mockResolvedValue(true);
		vi.mocked(service.getStudentProgress).mockResolvedValue(mockProgress as never);

		const response = await GET({
			url: mockUrl,
			params: mockParams,
			locals: mockLocals
		} as never);
		const data = await response.json();

		expect(data.progress).toEqual(mockProgress);
	});

	it('should reject teacher without access to student', async () => {
		vi.mocked(auth.requireRole).mockResolvedValue({
			user: { id: teacherId },
			profile: { role: 'teacher' }
		} as never);

		vi.mocked(studentAccess.verifyTeacherStudentWithRole).mockResolvedValue(false);

		try {
			await GET({
				url: mockUrl,
				params: mockParams,
				locals: mockLocals
			} as never);
			expect.fail('Should have thrown an error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(403);
			expect(error.body.message).toBe('You can only access students you teach');
		}
	});

	it('should return 404 when progress not found', async () => {
		vi.mocked(auth.requireRole).mockResolvedValue({
			user: { id: studentId },
			profile: { role: 'student' }
		} as never);

		vi.mocked(service.getStudentProgress).mockResolvedValue(null);

		try {
			await GET({
				url: mockUrl,
				params: mockParams,
				locals: mockLocals
			} as never);
			expect.fail('Should have thrown an error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(404);
			expect(error.body.message).toBe('Progress not found for this achievement');
		}
	});

	it('should reject invalid student ID', async () => {
		await expect(
			GET({
				url: mockUrl,
				params: { ...mockParams, studentId: 'invalid-uuid' },
				locals: mockLocals
			} as never)
		).rejects.toThrow();
	});

	it('should reject invalid achievement ID', async () => {
		await expect(
			GET({
				url: mockUrl,
				params: { ...mockParams, achievementId: 'Invalid ID!' },
				locals: mockLocals
			} as never)
		).rejects.toThrow();
	});

	it('should reject student viewing other student progress', async () => {
		const otherStudentId = '123e4567-e89b-12d3-a456-426614174002';

		vi.mocked(auth.requireRole).mockResolvedValue({
			user: { id: studentId },
			profile: { role: 'student' }
		} as never);

		try {
			await GET({
				url: mockUrl,
				params: { ...mockParams, studentId: otherStudentId },
				locals: mockLocals
			} as never);
			expect.fail('Should have thrown an error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(403);
			expect(error.body.message).toBe('You can only access your own progress');
		}
	});

	it('should handle service errors gracefully', async () => {
		vi.mocked(auth.requireRole).mockResolvedValue({
			user: { id: studentId },
			profile: { role: 'student' }
		} as never);

		vi.mocked(service.getStudentProgress).mockRejectedValue(
			new service.AchievementServiceError('Database error', 'DATABASE_ERROR')
		);

		await expect(
			GET({
				url: mockUrl,
				params: mockParams,
				locals: mockLocals
			} as never)
		).rejects.toThrow();
	});
});
