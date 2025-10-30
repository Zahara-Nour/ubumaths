/**
 * Tests for message templates validation schemas
 */

import { describe, it, expect } from 'vitest';
import {
	createMessageTemplateSchema,
	updateMessageTemplateSchema,
	listTemplatesQuerySchema,
	toggleFavoriteSchema,
	trackTemplateUsageSchema,
	searchTemplatesSchema,
	templateMatchSchema,
	previewTemplateSchema,
	duplicateTemplateSchema,
	approveTemplateSchema,
	templateStatsQuerySchema
} from './message-templates';

describe('message templates validation schemas', () => {
	// ============================================================================
	// CREATE & UPDATE SCHEMAS
	// ============================================================================

	describe('createMessageTemplateSchema', () => {
		it('should accept valid template data', () => {
			const data = {
				title: 'Welcome Message',
				description: 'Template for welcoming new students',
				subject_template: 'Welcome to {{school_name}}!',
				body_template: 'Hello {{student_name}}, welcome to our school.',
				trigger_type: 'manual',
				trigger_config: { key: 'value' },
				scope: 'system',
				class_id: null,
				variables: ['school_name', 'student_name'],
				is_active: true
			};

			const result = createMessageTemplateSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should use default values', () => {
			const data = {
				title: 'Simple Template',
				subject_template: 'Subject',
				body_template: 'Body',
				trigger_type: 'manual',
				scope: 'system'
			};

			const result = createMessageTemplateSchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.is_active).toBe(true);
				expect(result.data.trigger_config).toEqual({});
				expect(result.data.variables).toEqual([]);
			}
		});

		it('should accept all trigger types', () => {
			const types = [
				'manual',
				'assignment_created',
				'assignment_due',
				'achievement_unlocked',
				'weekly_summary'
			] as const;

			types.forEach((trigger_type) => {
				const data = {
					title: 'Test',
					subject_template: 'Subject',
					body_template: 'Body',
					trigger_type,
					scope: 'system'
				};

				const result = createMessageTemplateSchema.safeParse(data);
				expect(result.success).toBe(true);
			});
		});

		it('should accept both scopes', () => {
			['system', 'class'].forEach((scope) => {
				const data = {
					title: 'Test',
					subject_template: 'Subject',
					body_template: 'Body',
					trigger_type: 'manual',
					scope
				};

				const result = createMessageTemplateSchema.safeParse(data);
				expect(result.success).toBe(true);
			});
		});

		it('should accept class template with class_id', () => {
			const data = {
				title: 'Class Template',
				subject_template: 'Subject',
				body_template: 'Body',
				trigger_type: 'manual',
				scope: 'class',
				class_id: '550e8400-e29b-41d4-a716-446655440000'
			};

			const result = createMessageTemplateSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject empty title', () => {
			const data = {
				title: '   ',
				subject_template: 'Subject',
				body_template: 'Body',
				trigger_type: 'manual',
				scope: 'system'
			};

			const result = createMessageTemplateSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject title exceeding max length', () => {
			const data = {
				title: 'a'.repeat(201),
				subject_template: 'Subject',
				body_template: 'Body',
				trigger_type: 'manual',
				scope: 'system'
			};

			const result = createMessageTemplateSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject description exceeding max length', () => {
			const data = {
				title: 'Template',
				description: 'a'.repeat(501),
				subject_template: 'Subject',
				body_template: 'Body',
				trigger_type: 'manual',
				scope: 'system'
			};

			const result = createMessageTemplateSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject empty subject_template', () => {
			const data = {
				title: 'Template',
				subject_template: '   ',
				body_template: 'Body',
				trigger_type: 'manual',
				scope: 'system'
			};

			const result = createMessageTemplateSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject subject_template exceeding max length', () => {
			const data = {
				title: 'Template',
				subject_template: 'a'.repeat(201),
				body_template: 'Body',
				trigger_type: 'manual',
				scope: 'system'
			};

			const result = createMessageTemplateSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject empty body_template', () => {
			const data = {
				title: 'Template',
				subject_template: 'Subject',
				body_template: '',
				trigger_type: 'manual',
				scope: 'system'
			};

			const result = createMessageTemplateSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject body_template exceeding max length', () => {
			const data = {
				title: 'Template',
				subject_template: 'Subject',
				body_template: 'a'.repeat(10001),
				trigger_type: 'manual',
				scope: 'system'
			};

			const result = createMessageTemplateSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject too many variables', () => {
			const data = {
				title: 'Template',
				subject_template: 'Subject',
				body_template: 'Body',
				trigger_type: 'manual',
				scope: 'system',
				variables: Array.from({ length: 21 }, (_, i) => `var${i}`)
			};

			const result = createMessageTemplateSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid trigger_type', () => {
			const data = {
				title: 'Template',
				subject_template: 'Subject',
				body_template: 'Body',
				trigger_type: 'invalid',
				scope: 'system'
			};

			const result = createMessageTemplateSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid scope', () => {
			const data = {
				title: 'Template',
				subject_template: 'Subject',
				body_template: 'Body',
				trigger_type: 'manual',
				scope: 'invalid'
			};

			const result = createMessageTemplateSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid class_id UUID', () => {
			const data = {
				title: 'Template',
				subject_template: 'Subject',
				body_template: 'Body',
				trigger_type: 'manual',
				scope: 'class',
				class_id: 'not-a-uuid'
			};

			const result = createMessageTemplateSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	describe('updateMessageTemplateSchema', () => {
		it('should accept partial updates', () => {
			const updates = [
				{ title: 'Updated Title' },
				{ is_active: false },
				{ trigger_type: 'assignment_due' },
				{ body_template: 'New body content' }
			];

			updates.forEach((update) => {
				const result = updateMessageTemplateSchema.safeParse(update);
				expect(result.success).toBe(true);
			});
		});

		it('should accept empty object', () => {
			const result = updateMessageTemplateSchema.safeParse({});
			expect(result.success).toBe(true);
		});
	});

	// ============================================================================
	// QUERY SCHEMAS
	// ============================================================================

	describe('listTemplatesQuerySchema', () => {
		it('should accept valid query parameters', () => {
			const data = {
				page: 2,
				limit: 25,
				scope: 'system',
				trigger_type: 'manual',
				class_id: '550e8400-e29b-41d4-a716-446655440000',
				is_active: 'true'
			};

			const result = listTemplatesQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should use default pagination', () => {
			const result = listTemplatesQuerySchema.safeParse({});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.page).toBe(1);
				expect(result.data.limit).toBe(50);
			}
		});

		it('should coerce is_active to boolean', () => {
			const data = {
				is_active: 'true'
			};

			const result = listTemplatesQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.is_active).toBe(true);
				expect(typeof result.data.is_active).toBe('boolean');
			}
		});

		it('should accept both scope values', () => {
			['system', 'class'].forEach((scope) => {
				const data = { scope };
				const result = listTemplatesQuerySchema.safeParse(data);
				expect(result.success).toBe(true);
			});
		});

		it('should reject invalid scope', () => {
			const data = {
				scope: 'invalid'
			};

			const result = listTemplatesQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	describe('searchTemplatesSchema', () => {
		it('should accept valid search', () => {
			const data = {
				query: 'welcome',
				scope: 'system',
				limit: 10
			};

			const result = searchTemplatesSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should use default limit', () => {
			const data = {
				query: 'test'
			};

			const result = searchTemplatesSchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.limit).toBe(20);
			}
		});

		it('should reject empty query', () => {
			const data = {
				query: '   '
			};

			const result = searchTemplatesSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject query exceeding max length', () => {
			const data = {
				query: 'a'.repeat(201)
			};

			const result = searchTemplatesSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject limit exceeding max', () => {
			const data = {
				query: 'test',
				limit: 51
			};

			const result = searchTemplatesSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	describe('templateMatchSchema', () => {
		it('should accept subject and content', () => {
			const data = {
				subject: 'Welcome message',
				content: 'Hello student',
				limit: 5
			};

			const result = templateMatchSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should use default limit', () => {
			const data = {
				subject: 'Test'
			};

			const result = templateMatchSchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.limit).toBe(5);
			}
		});

		it('should accept empty object', () => {
			const result = templateMatchSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		it('should reject subject exceeding max length', () => {
			const data = {
				subject: 'a'.repeat(201)
			};

			const result = templateMatchSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject content exceeding max length', () => {
			const data = {
				content: 'a'.repeat(1001)
			};

			const result = templateMatchSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject limit exceeding max', () => {
			const data = {
				limit: 11
			};

			const result = templateMatchSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	// ============================================================================
	// TEMPLATE OPERATION SCHEMAS
	// ============================================================================

	describe('toggleFavoriteSchema', () => {
		it('should accept valid toggle', () => {
			const data = {
				templateId: '550e8400-e29b-41d4-a716-446655440000',
				isFavorite: true
			};

			const result = toggleFavoriteSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject invalid templateId', () => {
			const data = {
				templateId: 'not-a-uuid',
				isFavorite: true
			};

			const result = toggleFavoriteSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject missing isFavorite', () => {
			const data = {
				templateId: '550e8400-e29b-41d4-a716-446655440000'
			};

			const result = toggleFavoriteSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	describe('trackTemplateUsageSchema', () => {
		it('should accept valid tracking data', () => {
			const data = {
				templateId: '550e8400-e29b-41d4-a716-446655440000',
				messageId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
			};

			const result = trackTemplateUsageSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject invalid templateId', () => {
			const data = {
				templateId: 'not-a-uuid',
				messageId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
			};

			const result = trackTemplateUsageSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid messageId', () => {
			const data = {
				templateId: '550e8400-e29b-41d4-a716-446655440000',
				messageId: 'not-a-uuid'
			};

			const result = trackTemplateUsageSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	describe('previewTemplateSchema', () => {
		it('should accept valid preview data', () => {
			const data = {
				data: {
					student_name: 'John Doe',
					school_name: 'Test School',
					score: 95
				}
			};

			const result = previewTemplateSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept empty data object', () => {
			const data = {
				data: {}
			};

			const result = previewTemplateSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept undefined data', () => {
			const result = previewTemplateSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		it('should accept string and number values', () => {
			const data = {
				data: {
					name: 'Alice',
					age: 25,
					grade: 'A+',
					score: 98.5
				}
			};

			const result = previewTemplateSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject value exceeding max length', () => {
			const data = {
				data: {
					long_text: 'a'.repeat(1001)
				}
			};

			const result = previewTemplateSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject too many keys', () => {
			const data = {
				data: Object.fromEntries(Array.from({ length: 51 }, (_, i) => [`key${i}`, `value${i}`]))
			};

			const result = previewTemplateSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should accept exactly 50 keys', () => {
			const data = {
				data: Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`key${i}`, `value${i}`]))
			};

			const result = previewTemplateSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept exactly 1000 character value', () => {
			const data = {
				data: {
					text: 'a'.repeat(1000)
				}
			};

			const result = previewTemplateSchema.safeParse(data);
			expect(result.success).toBe(true);
		});
	});

	describe('duplicateTemplateSchema', () => {
		it('should accept new title and class_id', () => {
			const data = {
				new_title: 'Copied Template',
				class_id: '550e8400-e29b-41d4-a716-446655440000'
			};

			const result = duplicateTemplateSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept empty object', () => {
			const result = duplicateTemplateSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		it('should accept only new_title', () => {
			const data = {
				new_title: 'New Title'
			};

			const result = duplicateTemplateSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept only class_id', () => {
			const data = {
				class_id: '550e8400-e29b-41d4-a716-446655440000'
			};

			const result = duplicateTemplateSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject new_title exceeding max length', () => {
			const data = {
				new_title: 'a'.repeat(201)
			};

			const result = duplicateTemplateSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid class_id UUID', () => {
			const data = {
				class_id: 'not-a-uuid'
			};

			const result = duplicateTemplateSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should trim new_title', () => {
			const data = {
				new_title: '  Template Title  '
			};

			const result = duplicateTemplateSchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.new_title).toBe('Template Title');
			}
		});
	});

	describe('approveTemplateSchema', () => {
		it('should accept approve action', () => {
			const data = {
				action: 'approve',
				notes: 'Looks good'
			};

			const result = approveTemplateSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept reject action', () => {
			const data = {
				action: 'reject',
				notes: 'Needs revision'
			};

			const result = approveTemplateSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept action without notes', () => {
			const data = {
				action: 'approve'
			};

			const result = approveTemplateSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject invalid action', () => {
			const data = {
				action: 'pending'
			};

			const result = approveTemplateSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject notes exceeding max length', () => {
			const data = {
				action: 'approve',
				notes: 'a'.repeat(1001)
			};

			const result = approveTemplateSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should accept notes at exactly max length', () => {
			const data = {
				action: 'reject',
				notes: 'a'.repeat(1000)
			};

			const result = approveTemplateSchema.safeParse(data);
			expect(result.success).toBe(true);
		});
	});

	describe('templateStatsQuerySchema', () => {
		it('should accept template_id and period', () => {
			const data = {
				template_id: '550e8400-e29b-41d4-a716-446655440000',
				period: 'month'
			};

			const result = templateStatsQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should use default period', () => {
			const result = templateStatsQuerySchema.safeParse({});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.period).toBe('month');
			}
		});

		it('should accept all period values', () => {
			['week', 'month', 'year', 'all'].forEach((period) => {
				const data = { period };
				const result = templateStatsQuerySchema.safeParse(data);
				expect(result.success).toBe(true);
			});
		});

		it('should reject invalid period', () => {
			const data = {
				period: 'day'
			};

			const result = templateStatsQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid template_id UUID', () => {
			const data = {
				template_id: 'not-a-uuid'
			};

			const result = templateStatsQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should accept period without template_id', () => {
			const data = {
				period: 'year'
			};

			const result = templateStatsQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
		});
	});
});
