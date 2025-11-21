/**
 * GET /api/achievements/student/[studentId] Tests
 * ================================================
 *
 * Tests for the student achievements endpoint with authorization.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../student/[studentId]/+server';
import * as auth from '$lib/server/middleware/auth';
import * as studentAccess from '$lib/server/middleware/student-access';
import * as service from '$lib/server/achievements/service';

// Mock dependencies
vi.mock('$lib/server/middleware/auth');
vi.mock('$lib/server/middleware/student-access');
vi.mock('$lib/server/achievements/service');

describe('GET /api/achievements/student/[studentId]', () => {
	let mockLocals: { supabase: unknown; user?: { id: string } };
	let mockParams: { studentId: string };
	let mockUrl: URL;

	const teacherId = '123e4567-e89b-12d3-a456-426614174000';
	const studentId = '123e4567-e89b-12d3-a456-426614174001';

	beforeEach(() => {
		vi.clearAllMocks();
		mockLocals = { supabase: {}, user: { id: teacherId } };
		mockParams = { studentId };
		mockUrl = new URL('http://localhost/api/achievements/student/' + studentId);
	});

	it('should allow teacher to view their student achievements', async () => {
		const mockAchievements = [
			{
				id: 'uuid',
				student_id: studentId,
				achievement_id: 'test_achievement'
			}
		];

		vi.mocked(auth.requireRole).mockResolvedValue({
			user: { id: teacherId },
			profile: { role: 'teacher' }
		} as never);

		vi.mocked(studentAccess.verifyTeacherStudentWithRole).mockResolvedValue(true);
		vi.mocked(service.getStudentAchievements).mockResolvedValue(mockAchievements as never);

		const response = await GET({
			url: mockUrl,
			params: mockParams,
			locals: mockLocals
		} as never);
		const data = await response.json();

		expect(studentAccess.verifyTeacherStudentWithRole).toHaveBeenCalledWith(
			teacherId,
			studentId,
			{ role: 'teacher' },
			mockLocals.supabase
		);
		expect(data).toEqual({
			success: true,
			achievements: mockAchievements,
			count: 1
		});
	});

	it('should allow student to view their own achievements', async () => {
		const mockAchievements = [
			{
				id: 'uuid',
				student_id: studentId,
				achievement_id: 'test_achievement'
			}
		];

		vi.mocked(auth.requireRole).mockResolvedValue({
			user: { id: studentId },
			profile: { role: 'student' }
		} as never);

		vi.mocked(service.getStudentAchievements).mockResolvedValue(mockAchievements as never);

		const response = await GET({
			url: mockUrl,
			params: mockParams,
			locals: mockLocals
		} as never);
		const data = await response.json();

		// Should not call verifyTeacherStudentWithRole for students viewing their own
		expect(studentAccess.verifyTeacherStudentWithRole).not.toHaveBeenCalled();
		expect(data.achievements).toEqual(mockAchievements);
	});

	it('should allow admin to view any student achievements', async () => {
		const mockAchievements = [
			{
				id: 'uuid',
				student_id: studentId,
				achievement_id: 'test_achievement'
			}
		];

		vi.mocked(auth.requireRole).mockResolvedValue({
			user: { id: 'admin_id' },
			profile: { role: 'admin' }
		} as never);

		vi.mocked(studentAccess.verifyTeacherStudentWithRole).mockResolvedValue(true);
		vi.mocked(service.getStudentAchievements).mockResolvedValue(mockAchievements as never);

		const response = await GET({
			url: mockUrl,
			params: mockParams,
			locals: mockLocals
		} as never);
		const data = await response.json();

		expect(data.achievements).toEqual(mockAchievements);
	});

	it('should reject student viewing other student achievements', async () => {
		const otherStudentId = '123e4567-e89b-12d3-a456-426614174002';

		vi.mocked(auth.requireRole).mockResolvedValue({
			user: { id: studentId },
			profile: { role: 'student' }
		} as never);

		try {
			await GET({
				url: mockUrl,
				params: { studentId: otherStudentId },
				locals: mockLocals
			} as never);
			expect.fail('Should have thrown an error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(403);
			expect(error.body.message).toBe('You can only access your own achievements');
		}
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

	it('should filter achievements by context when provided', async () => {
		mockUrl.searchParams.set('context', 'minesweeper');

		const mockAchievements = [
			{
				id: 'uuid',
				student_id: studentId,
				achievement_id: 'minesweeper_first_win'
			}
		];

		vi.mocked(auth.requireRole).mockResolvedValue({
			user: { id: studentId },
			profile: { role: 'student' }
		} as never);

		vi.mocked(service.getStudentAchievements).mockResolvedValue(mockAchievements as never);

		const response = await GET({
			url: mockUrl,
			params: mockParams,
			locals: mockLocals
		} as never);
		const data = await response.json();

		expect(service.getStudentAchievements).toHaveBeenCalledWith(
			mockLocals.supabase,
			studentId,
			'minesweeper'
		);
		expect(data.achievements).toEqual(mockAchievements);
	});

	it('should reject invalid student ID format', async () => {
		await expect(
			GET({
				url: mockUrl,
				params: { studentId: 'invalid-uuid' },
				locals: mockLocals
			} as never)
		).rejects.toThrow();
	});

	it('should reject invalid context parameter', async () => {
		mockUrl.searchParams.set('context', 'invalid_context');

		vi.mocked(auth.requireRole).mockResolvedValue({
			user: { id: studentId },
			profile: { role: 'student' }
		} as never);

		await expect(
			GET({
				url: mockUrl,
				params: mockParams,
				locals: mockLocals
			} as never)
		).rejects.toThrow();
	});

	it('should handle service errors gracefully', async () => {
		vi.mocked(auth.requireRole).mockResolvedValue({
			user: { id: studentId },
			profile: { role: 'student' }
		} as never);

		vi.mocked(service.getStudentAchievements).mockRejectedValue(
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

	it('should return empty array when no achievements found', async () => {
		vi.mocked(auth.requireRole).mockResolvedValue({
			user: { id: studentId },
			profile: { role: 'student' }
		} as never);

		vi.mocked(service.getStudentAchievements).mockResolvedValue([]);

		const response = await GET({
			url: mockUrl,
			params: mockParams,
			locals: mockLocals
		} as never);
		const data = await response.json();

		expect(data).toEqual({
			success: true,
			achievements: [],
			count: 0
		});
	});
});
