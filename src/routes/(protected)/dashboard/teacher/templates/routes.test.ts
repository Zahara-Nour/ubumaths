/**
 * Chapter Templates Routes - Integration Tests
 * ==============================================
 *
 * Tests for teacher chapter template routes.
 * Covers gallery, creation, detail pages with load functions and form actions.
 *
 * @module routes/teacher/templates/routes.test
 */

import { describe, it, expect } from 'vitest';
import { createMockSupabase, createMockLocals } from '$tests/helpers';

// ============================================================================
// TEST DATA
// ============================================================================

const TEST_IDS = {
	teacher: '550e8400-e29b-41d4-a716-446655440001',
	teacher2: '550e8400-e29b-41d4-a716-446655440002',
	student: '550e8400-e29b-41d4-a716-446655440003',
	template: '550e8400-e29b-41d4-a716-446655440011',
	class: '550e8400-e29b-41d4-a716-446655440021',
	chapter: '550e8400-e29b-41d4-a716-446655440031'
};

const mockTeacher = {
	id: TEST_IDS.teacher,
	email: 'teacher@voltairedoha.com',
	role: 'teacher'
};

const mockTemplate = {
	id: TEST_IDS.template,
	title: 'Test Template',
	description: 'Test description',
	grades: ['3'],
	color: '#3b82f6',
	icon: 'book',
	status: 'published',
	is_public: true,
	instantiation_count: 5,
	current_version: 1,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z',
	created_by: TEST_IDS.teacher,
	content_snapshot: {
		documents: [],
		quizQuestions: [],
		checklistItems: [],
		exercises: []
	},
	profiles: {
		full_name: 'Teacher One'
	}
};

// ============================================================================
// GALLERY PAGE TESTS - /templates/+page.server.ts
// ============================================================================

describe('GET /dashboard/teacher/templates (Gallery)', () => {
	it('should reject unauthenticated requests', async () => {
		const { load } = await import('./+page.server');

		const locals = createMockLocals(); // No user
		const params = {};
		const url = new URL('http://localhost/dashboard/teacher/templates');

		try {
			await load({ locals, params, url } as never);
			expect.fail('Should have thrown an error');
		} catch (err) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(401);
			expect(error.body.message).toBe('Unauthorized');
		}
	});

	it('should reject non-teacher users', async () => {
		const { load } = await import('./+page.server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(TEST_IDS.student, mockSupabase);

		// Mock student profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'student' },
			error: null
		});

		const params = {};
		const url = new URL('http://localhost/dashboard/teacher/templates');

		try {
			await load({ locals, params, url } as never);
			expect.fail('Should have thrown an error');
		} catch (err) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(403);
		}
	});

	it('should load templates for teacher (default: own + public)', async () => {
		const { load } = await import('./+page.server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		// Mock teacher profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock templates query
		mockSupabase._mockChain.select.mockReturnThis();
		mockSupabase._mockChain.or.mockReturnThis();
		mockSupabase._mockChain.order.mockReturnThis();
		mockSupabase._mockChain.range.mockResolvedValueOnce({
			data: [mockTemplate],
			error: null,
			count: 1
		});

		const params = {};
		const url = new URL('http://localhost/dashboard/teacher/templates');

		const result = await load({ locals, params, url } as never);

		expect(result).toHaveProperty('templates');
		expect(result).toHaveProperty('total');
		expect((result as { templates: unknown[] }).templates).toHaveLength(1);
		expect((result as { templates: Array<{ id: string }> }).templates[0].id).toBe(
			TEST_IDS.template
		);
	});

	it('should filter templates by grade level', async () => {
		const { load } = await import('./+page.server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		// Mock teacher profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock templates query with grade filter
		mockSupabase._mockChain.select.mockReturnThis();
		mockSupabase._mockChain.or.mockReturnThis();
		mockSupabase._mockChain.overlaps.mockReturnThis();
		mockSupabase._mockChain.order.mockReturnThis();
		mockSupabase._mockChain.range.mockResolvedValueOnce({
			data: [mockTemplate],
			error: null,
			count: 1
		});

		const params = {};
		const url = new URL('http://localhost/dashboard/teacher/templates?grades=3,4');

		const result = await load({ locals, params, url } as never);

		expect((result as { templates: unknown[] }).templates).toBeDefined();
		expect(mockSupabase._mockChain.overlaps).toHaveBeenCalledWith('grades', ['3', '4']);
	});

	it('should search templates by title', async () => {
		const { load } = await import('./+page.server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		// Mock teacher profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock templates query with search
		mockSupabase._mockChain.select.mockReturnThis();
		mockSupabase._mockChain.or.mockReturnThis();
		mockSupabase._mockChain.ilike.mockReturnThis();
		mockSupabase._mockChain.order.mockReturnThis();
		mockSupabase._mockChain.range.mockResolvedValueOnce({
			data: [mockTemplate],
			error: null,
			count: 1
		});

		const params = {};
		const url = new URL('http://localhost/dashboard/teacher/templates?search=Test');

		const result = await load({ locals, params, url } as never);

		expect((result as { templates: unknown[] }).templates).toBeDefined();
		expect(mockSupabase._mockChain.ilike).toHaveBeenCalledWith('title', '%Test%');
	});
});

// ============================================================================
// CREATE PAGE TESTS - /templates/new/+page.server.ts
// ============================================================================

describe('POST /dashboard/teacher/templates/new (Create Template)', () => {
	it('should reject unauthenticated requests', async () => {
		const { actions } = await import('./new/+page.server');

		const locals = createMockLocals(); // No user
		const formData = new FormData();
		formData.append('title', 'New Template');
		formData.append('grades', '3,4');

		const request = new Request('http://localhost', {
			method: 'POST',
			body: formData
		});

		try {
			await actions.create({ request, locals } as never);
			expect.fail('Should have thrown an error');
		} catch (err) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(401);
		}
	});

	it('should reject non-teacher users', async () => {
		const { actions } = await import('./new/+page.server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(TEST_IDS.student, mockSupabase);

		// Mock student profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'student' },
			error: null
		});

		const formData = new FormData();
		formData.append('title', 'New Template');

		const request = new Request('http://localhost', {
			method: 'POST',
			body: formData
		});

		try {
			await actions.create({ request, locals } as never);
			expect.fail('Should have thrown an error');
		} catch (err) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(403);
		}
	});

	it('should reject invalid title (too short)', async () => {
		const { actions } = await import('./new/+page.server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		// Mock teacher profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		const formData = new FormData();
		formData.append('title', ''); // Empty title

		const request = new Request('http://localhost', {
			method: 'POST',
			body: formData
		});

		const result = await actions.create({ request, locals } as never);

		expect(result).toHaveProperty('error');
		expect((result as { error: string }).error).toContain('requis');
	});

	it('should reject invalid title (too long)', async () => {
		const { actions } = await import('./new/+page.server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		// Mock teacher profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		const formData = new FormData();
		formData.append('title', 'a'.repeat(201)); // Too long

		const request = new Request('http://localhost', {
			method: 'POST',
			body: formData
		});

		const result = await actions.create({ request, locals } as never);

		expect(result).toHaveProperty('error');
		expect((result as { error: string }).error).toContain('trop long');
	});

	it('should create template with valid data', async () => {
		const { actions } = await import('./new/+page.server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		// Mock teacher profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock template creation
		mockSupabase._mockChain.insert.mockReturnThis();
		mockSupabase._mockChain.select.mockReturnThis();
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { id: TEST_IDS.template, title: 'New Template' },
			error: null
		});

		const formData = new FormData();
		formData.append('title', 'New Template');
		formData.append('description', 'Test description');
		formData.append('grades', '3,4');

		const request = new Request('http://localhost', {
			method: 'POST',
			body: formData
		});

		const result = await actions.create({ request, locals } as never);

		expect(result).toHaveProperty('success', true);
		expect(result).toHaveProperty('templateId', TEST_IDS.template);
	});
});

// ============================================================================
// DETAIL PAGE TESTS - /templates/[templateId]/+page.server.ts
// ============================================================================

describe('GET /dashboard/teacher/templates/[templateId] (Detail)', () => {
	it('should reject unauthenticated requests', async () => {
		const { load } = await import('./[templateId]/+page.server');

		const locals = createMockLocals(); // No user
		const params = { templateId: TEST_IDS.template };
		const url = new URL('http://localhost/dashboard/teacher/templates/' + TEST_IDS.template);

		try {
			await load({ locals, params, url } as never);
			expect.fail('Should have thrown an error');
		} catch (err) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(401);
		}
	});

	it('should reject non-teacher users', async () => {
		const { load } = await import('./[templateId]/+page.server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(TEST_IDS.student, mockSupabase);

		// Mock student profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'student' },
			error: null
		});

		const params = { templateId: TEST_IDS.template };
		const url = new URL('http://localhost/dashboard/teacher/templates/' + TEST_IDS.template);

		try {
			await load({ locals, params, url } as never);
			expect.fail('Should have thrown an error');
		} catch (err) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(403);
		}
	});

	it('should return 404 for non-existent template', async () => {
		const { load } = await import('./[templateId]/+page.server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		// Mock teacher profile check
		mockSupabase._mockChain.single
			.mockResolvedValueOnce({
				data: { role: 'teacher' },
				error: null
			})
			// Mock template not found
			.mockResolvedValueOnce({
				data: null,
				error: { message: 'Not found' }
			});

		const params = { templateId: TEST_IDS.template };
		const url = new URL('http://localhost/dashboard/teacher/templates/' + TEST_IDS.template);

		try {
			await load({ locals, params, url } as never);
			expect.fail('Should have thrown an error');
		} catch (err) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(404);
		}
	});

	it('should load template detail for owner', async () => {
		const { load } = await import('./[templateId]/+page.server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		const fullTemplate = {
			...mockTemplate,
			created_by: mockTeacher.id
		};

		// Mock teacher profile check
		mockSupabase._mockChain.single
			.mockResolvedValueOnce({
				data: { role: 'teacher' },
				error: null
			})
			// Mock template fetch
			.mockResolvedValueOnce({
				data: fullTemplate,
				error: null
			});

		// Mock versions fetch
		mockSupabase._mockChain.select.mockReturnThis();
		mockSupabase._mockChain.eq.mockReturnThis();
		mockSupabase._mockChain.order.mockResolvedValueOnce({
			data: [],
			error: null
		});

		// Mock teacher classes fetch
		mockSupabase._mockChain.select.mockReturnThis();
		mockSupabase._mockChain.eq.mockResolvedValueOnce({
			data: [],
			error: null
		});

		const params = { templateId: TEST_IDS.template };
		const url = new URL('http://localhost/dashboard/teacher/templates/' + TEST_IDS.template);

		const result = await load({ locals, params, url } as never);

		expect(result).toHaveProperty('template');
		expect((result as { template: { id: string } }).template.id).toBe(TEST_IDS.template);
		expect(result).toHaveProperty('versions');
		expect(result).toHaveProperty('classes');
	});

	it('should reject draft template access by non-owner', async () => {
		const { load } = await import('./[templateId]/+page.server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(TEST_IDS.teacher2, mockSupabase);

		const draftTemplate = {
			...mockTemplate,
			status: 'draft',
			created_by: mockTeacher.id // Different owner
		};

		// Mock teacher profile check
		mockSupabase._mockChain.single
			.mockResolvedValueOnce({
				data: { role: 'teacher' },
				error: null
			})
			// Mock template fetch
			.mockResolvedValueOnce({
				data: draftTemplate,
				error: null
			});

		const params = { templateId: TEST_IDS.template };
		const url = new URL('http://localhost/dashboard/teacher/templates/' + TEST_IDS.template);

		try {
			await load({ locals, params, url } as never);
			expect.fail('Should have thrown an error');
		} catch (err) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(403);
		}
	});
});

// ============================================================================
// FORM ACTIONS TESTS
// ============================================================================

describe('Template Actions', () => {
	describe('Update Template', () => {
		it('should update template with valid data', async () => {
			const { actions } = await import('./[templateId]/+page.server');

			const mockSupabase = createMockSupabase();
			const locals = createMockLocals(mockTeacher.id, mockSupabase);

			// Mock teacher profile check
			mockSupabase._mockChain.single
				.mockResolvedValueOnce({
					data: { role: 'teacher' },
					error: null
				})
				// Mock template ownership check
				.mockResolvedValueOnce({
					data: { id: TEST_IDS.template, created_by: mockTeacher.id, status: 'draft' },
					error: null
				})
				// Mock current template
				.mockResolvedValueOnce({
					data: {
						status: 'draft',
						content_snapshot: {},
						current_version: 1
					},
					error: null
				});

			// Mock update
			mockSupabase._mockChain.update.mockReturnThis();
			mockSupabase._mockChain.eq.mockReturnThis();
			mockSupabase._mockChain.select.mockReturnThis();
			mockSupabase._mockChain.single.mockResolvedValueOnce({
				data: { id: TEST_IDS.template },
				error: null
			});

			const formData = new FormData();
			formData.append('title', 'Updated Title');
			formData.append('description', 'Updated description');

			const request = new Request('http://localhost', {
				method: 'POST',
				body: formData
			});

			const result = await actions.update({
				request,
				locals,
				params: { templateId: TEST_IDS.template }
			} as never);

			expect(result).toHaveProperty('success', true);
		});

		it('should reject update by non-owner', async () => {
			const { actions } = await import('./[templateId]/+page.server');

			const mockSupabase = createMockSupabase();
			const locals = createMockLocals(TEST_IDS.teacher2, mockSupabase);

			// Mock teacher profile check
			mockSupabase._mockChain.single
				.mockResolvedValueOnce({
					data: { role: 'teacher' },
					error: null
				})
				// Mock template ownership check - different owner
				.mockResolvedValueOnce({
					data: { id: TEST_IDS.template, created_by: mockTeacher.id },
					error: null
				});

			const formData = new FormData();
			formData.append('title', 'Updated Title');

			const request = new Request('http://localhost', {
				method: 'POST',
				body: formData
			});

			const result = await actions.update({
				request,
				locals,
				params: { templateId: TEST_IDS.template }
			} as never);

			expect(result).toHaveProperty('error');
			expect((result as { error: string }).error).toContain('refus');
		});
	});

	describe('Publish Template', () => {
		it('should publish template', async () => {
			const { actions } = await import('./[templateId]/+page.server');

			const mockSupabase = createMockSupabase();
			const locals = createMockLocals(mockTeacher.id, mockSupabase);

			// Mock teacher profile check
			mockSupabase._mockChain.single
				.mockResolvedValueOnce({
					data: { role: 'teacher' },
					error: null
				})
				// Mock template ownership check WITH content_snapshot
				.mockResolvedValueOnce({
					data: {
						id: TEST_IDS.template,
						created_by: mockTeacher.id,
						status: 'draft',
						content_snapshot: {
							documents: [
								{
									title: 'Doc 1',
									description: null,
									documentUrl: 'http://example.com/doc',
									sourceType: 'external_url',
									mimeType: 'application/pdf',
									displayOrder: 0
								}
							],
							quizQuestions: [],
							checklistItems: [],
							exercises: []
						}
					},
					error: null
				})
				// Mock content validation for publishTemplate service
				.mockResolvedValueOnce({
					data: {
						content_snapshot: {
							documents: [
								{
									title: 'Doc 1',
									description: null,
									documentUrl: 'http://example.com/doc',
									sourceType: 'external_url',
									mimeType: 'application/pdf',
									displayOrder: 0
								}
							],
							quizQuestions: [],
							checklistItems: [],
							exercises: []
						}
					},
					error: null
				});

			// Mock publish update
			mockSupabase._mockChain.update.mockReturnThis();
			mockSupabase._mockChain.eq.mockReturnThis();
			mockSupabase._mockChain.select.mockReturnThis();
			mockSupabase._mockChain.single.mockResolvedValueOnce({
				data: { id: TEST_IDS.template, status: 'published' },
				error: null
			});

			const formData = new FormData();
			formData.append('isPublic', 'true');

			const request = new Request('http://localhost', {
				method: 'POST',
				body: formData
			});

			const result = await actions.publish({
				request,
				locals,
				params: { templateId: TEST_IDS.template }
			} as never);

			expect(result).toHaveProperty('success', true);
		});

		it('should reject publish of empty template', async () => {
			const { actions } = await import('./[templateId]/+page.server');

			const mockSupabase = createMockSupabase();
			const locals = createMockLocals(mockTeacher.id, mockSupabase);

			// Mock teacher profile check
			mockSupabase._mockChain.single
				.mockResolvedValueOnce({
					data: { role: 'teacher' },
					error: null
				})
				// Mock template ownership check WITH empty content
				.mockResolvedValueOnce({
					data: {
						id: TEST_IDS.template,
						created_by: mockTeacher.id,
						status: 'draft',
						content_snapshot: {
							documents: [],
							quizQuestions: [],
							checklistItems: [],
							exercises: []
						}
					},
					error: null
				});

			const formData = new FormData();
			formData.append('isPublic', 'false');

			const request = new Request('http://localhost', {
				method: 'POST',
				body: formData
			});

			const result = await actions.publish({
				request,
				locals,
				params: { templateId: TEST_IDS.template }
			} as never);

			expect(result).toHaveProperty('error');
			expect((result as { error: string }).error).toContain('vide');
		});
	});

	describe('Instantiate Template', () => {
		it('should instantiate template into chapter', async () => {
			const { actions } = await import('./[templateId]/+page.server');

			const mockSupabase = createMockSupabase();
			const locals = createMockLocals(mockTeacher.id, mockSupabase);

			// Mock teacher profile check
			mockSupabase._mockChain.single
				.mockResolvedValueOnce({
					data: { role: 'teacher' },
					error: null
				})
				// Mock class ownership check
				.mockResolvedValueOnce({
					data: { id: TEST_IDS.class, teacher_id: mockTeacher.id },
					error: null
				})
				// Mock template fetch
				.mockResolvedValueOnce({
					data: {
						title: 'Template',
						content_snapshot: {},
						current_version: 1,
						color: '#3b82f6',
						icon: 'book'
					},
					error: null
				})
				// Mock chapter creation
				.mockResolvedValueOnce({
					data: { id: TEST_IDS.chapter },
					error: null
				})
				// Mock instantiation record
				.mockResolvedValueOnce({
					data: { id: 'inst-1' },
					error: null
				});

			const formData = new FormData();
			formData.append('classId', TEST_IDS.class);
			formData.append('title', 'New Chapter from Template');

			const request = new Request('http://localhost', {
				method: 'POST',
				body: formData
			});

			const result = await actions.instantiate({
				request,
				locals,
				params: { templateId: TEST_IDS.template }
			} as never);

			expect(result).toHaveProperty('success', true);
			expect(result).toHaveProperty('chapterId', TEST_IDS.chapter);
		});

		it('should reject instantiation into class not owned by teacher', async () => {
			const { actions } = await import('./[templateId]/+page.server');

			const mockSupabase = createMockSupabase();
			const locals = createMockLocals(mockTeacher.id, mockSupabase);

			// Mock teacher profile check
			mockSupabase._mockChain.single
				.mockResolvedValueOnce({
					data: { role: 'teacher' },
					error: null
				})
				// Mock class ownership check - different teacher
				.mockResolvedValueOnce({
					data: null,
					error: { message: 'Not found' }
				});

			const formData = new FormData();
			formData.append('classId', TEST_IDS.class);

			const request = new Request('http://localhost', {
				method: 'POST',
				body: formData
			});

			const result = await actions.instantiate({
				request,
				locals,
				params: { templateId: TEST_IDS.template }
			} as never);

			// fail() returns an object with status and data properties
			expect(result).toHaveProperty('status');
			if (typeof result === 'object' && result !== null && 'status' in result) {
				expect(result.status).toBe(403);
				if (
					'data' in result &&
					result.data &&
					typeof result.data === 'object' &&
					'error' in result.data
				) {
					expect((result.data as { error: string }).error).toContain('refus');
				}
			}
		});
	});
});
