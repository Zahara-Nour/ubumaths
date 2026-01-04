/**
 * Class Journal Validation Schemas Tests
 * =======================================
 *
 * Tests for journal entry validation schemas.
 */

import { describe, it, expect } from 'vitest';
import {
	createJournalEntrySchema,
	updateJournalEntrySchema,
	listJournalEntriesQuerySchema,
	weekViewQuerySchema,
	upcomingHomeworkQuerySchema,
	dateSchema,
	futureDateSchema
} from './journal';

describe('dateSchema', () => {
	it('should accept valid YYYY-MM-DD dates', () => {
		const result = dateSchema.safeParse('2024-01-15');
		expect(result.success).toBe(true);
	});

	it('should reject invalid date formats', () => {
		const result = dateSchema.safeParse('15/01/2024');
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toContain('Format de date invalide');
		}
	});

	it('should reject invalid dates', () => {
		const result = dateSchema.safeParse('2024-02-30');
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toContain('Date invalide');
		}
	});

	it('should reject non-string values', () => {
		const result = dateSchema.safeParse(20240115);
		expect(result.success).toBe(false);
	});
});

describe('futureDateSchema', () => {
	it('should accept today', () => {
		const today = new Date().toISOString().split('T')[0];
		const result = futureDateSchema.safeParse(today);
		expect(result.success).toBe(true);
	});

	it('should accept future dates', () => {
		const future = new Date();
		future.setDate(future.getDate() + 7);
		const futureStr = future.toISOString().split('T')[0];
		const result = futureDateSchema.safeParse(futureStr);
		expect(result.success).toBe(true);
	});

	it('should reject past dates', () => {
		const past = new Date();
		past.setDate(past.getDate() - 7);
		const pastStr = past.toISOString().split('T')[0];
		const result = futureDateSchema.safeParse(pastStr);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toContain('ne peut pas etre dans le passe');
		}
	});
});

describe('createJournalEntrySchema', () => {
	it('should accept valid minimal input', () => {
		const result = createJournalEntrySchema.safeParse({
			classId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
			entryDate: '2024-01-15'
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.isPublished).toBe(false); // Default value
		}
	});

	it('should accept full input', () => {
		const result = createJournalEntrySchema.safeParse({
			classId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
			entryDate: '2024-01-15',
			lessonContent: 'Nous avons etudie les fractions',
			homeworkContent: 'Exercices 1-5 page 42',
			homeworkDueDate: '2024-01-20',
			isPublished: true
		});
		expect(result.success).toBe(true);
	});

	it('should reject invalid classId', () => {
		const result = createJournalEntrySchema.safeParse({
			classId: 'not-a-uuid',
			entryDate: '2024-01-15'
		});
		expect(result.success).toBe(false);
	});

	it('should reject invalid entryDate', () => {
		const result = createJournalEntrySchema.safeParse({
			classId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
			entryDate: '15/01/2024'
		});
		expect(result.success).toBe(false);
	});

	it('should reject homework due date without homework content', () => {
		const result = createJournalEntrySchema.safeParse({
			classId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
			entryDate: '2024-01-15',
			homeworkDueDate: '2024-01-20'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toContain('date limite requiert un contenu');
		}
	});

	it('should reject homework due date before entry date', () => {
		const result = createJournalEntrySchema.safeParse({
			classId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
			entryDate: '2024-01-20',
			homeworkContent: 'Exercices 1-5',
			homeworkDueDate: '2024-01-15'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toContain('posterieure ou egale');
		}
	});

	it('should accept homework due date equal to entry date', () => {
		const result = createJournalEntrySchema.safeParse({
			classId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
			entryDate: '2024-01-15',
			homeworkContent: 'Exercices 1-5',
			homeworkDueDate: '2024-01-15'
		});
		expect(result.success).toBe(true);
	});

	it('should reject content exceeding max length', () => {
		const longContent = 'a'.repeat(50001);
		const result = createJournalEntrySchema.safeParse({
			classId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
			entryDate: '2024-01-15',
			lessonContent: longContent
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toContain('trop long');
		}
	});

	it('should trim whitespace from content', () => {
		const result = createJournalEntrySchema.safeParse({
			classId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
			entryDate: '2024-01-15',
			lessonContent: '  Test content  ',
			homeworkContent: '  Homework  '
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.lessonContent).toBe('Test content');
			expect(result.data.homeworkContent).toBe('Homework');
		}
	});
});

describe('updateJournalEntrySchema', () => {
	it('should accept partial updates', () => {
		const result = updateJournalEntrySchema.safeParse({
			lessonContent: 'Updated lesson'
		});
		expect(result.success).toBe(true);
	});

	it('should accept multiple fields', () => {
		const result = updateJournalEntrySchema.safeParse({
			lessonContent: 'Updated lesson',
			homeworkContent: 'Updated homework',
			isPublished: true
		});
		expect(result.success).toBe(true);
	});

	it('should reject empty update object', () => {
		const result = updateJournalEntrySchema.safeParse({});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toContain('Au moins un champ');
		}
	});

	it('should reject setting homework due date without content', () => {
		const result = updateJournalEntrySchema.safeParse({
			homeworkContent: null,
			homeworkDueDate: '2024-01-20'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toContain('sans contenu de devoir');
		}
	});

	it('should allow clearing homework due date', () => {
		const result = updateJournalEntrySchema.safeParse({
			homeworkDueDate: null
		});
		expect(result.success).toBe(true);
	});

	it('should reject content exceeding max length', () => {
		const longContent = 'a'.repeat(50001);
		const result = updateJournalEntrySchema.safeParse({
			lessonContent: longContent
		});
		expect(result.success).toBe(false);
	});
});

describe('listJournalEntriesQuerySchema', () => {
	it('should accept empty query params', () => {
		const result = listJournalEntriesQuerySchema.safeParse({});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.page).toBe(1);
			expect(result.data.limit).toBe(50);
			expect(result.data.publishedOnly).toBe(false);
		}
	});

	it('should parse pagination params', () => {
		const result = listJournalEntriesQuerySchema.safeParse({
			page: '2',
			limit: '20'
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.page).toBe(2);
			expect(result.data.limit).toBe(20);
		}
	});

	it('should parse classId filter', () => {
		const result = listJournalEntriesQuerySchema.safeParse({
			classId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.classId).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
		}
	});

	it('should parse date filters', () => {
		const result = listJournalEntriesQuerySchema.safeParse({
			startDate: '2024-01-01',
			endDate: '2024-01-31'
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.startDate).toBe('2024-01-01');
			expect(result.data.endDate).toBe('2024-01-31');
		}
	});

	it('should parse publishedOnly as boolean', () => {
		const result1 = listJournalEntriesQuerySchema.safeParse({
			publishedOnly: 'true'
		});
		expect(result1.success).toBe(true);
		if (result1.success) {
			expect(result1.data.publishedOnly).toBe(true);
		}

		const result2 = listJournalEntriesQuerySchema.safeParse({
			publishedOnly: 'false'
		});
		expect(result2.success).toBe(true);
		if (result2.success) {
			expect(result2.data.publishedOnly).toBe(false);
		}
	});
});

describe('weekViewQuerySchema', () => {
	it('should accept valid week start', () => {
		const result = weekViewQuerySchema.safeParse({
			classId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
			weekStart: '2024-01-15'
		});
		expect(result.success).toBe(true);
	});

	it('should accept week start and end', () => {
		const result = weekViewQuerySchema.safeParse({
			classId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
			weekStart: '2024-01-15',
			weekEnd: '2024-01-21'
		});
		expect(result.success).toBe(true);
	});

	it('should reject missing classId', () => {
		const result = weekViewQuerySchema.safeParse({
			weekStart: '2024-01-15'
		});
		expect(result.success).toBe(false);
	});

	it('should reject missing weekStart', () => {
		const result = weekViewQuerySchema.safeParse({
			classId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
		});
		expect(result.success).toBe(false);
	});
});

describe('upcomingHomeworkQuerySchema', () => {
	it('should accept valid input with default daysAhead', () => {
		const result = upcomingHomeworkQuerySchema.safeParse({
			studentId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.daysAhead).toBe(14);
		}
	});

	it('should accept custom daysAhead', () => {
		const result = upcomingHomeworkQuerySchema.safeParse({
			studentId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
			daysAhead: 30
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.daysAhead).toBe(30);
		}
	});

	it('should reject daysAhead less than 1', () => {
		const result = upcomingHomeworkQuerySchema.safeParse({
			studentId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
			daysAhead: 0
		});
		expect(result.success).toBe(false);
	});

	it('should reject daysAhead greater than 90', () => {
		const result = upcomingHomeworkQuerySchema.safeParse({
			studentId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
			daysAhead: 100
		});
		expect(result.success).toBe(false);
	});

	it('should reject invalid studentId', () => {
		const result = upcomingHomeworkQuerySchema.safeParse({
			studentId: 'not-a-uuid',
			daysAhead: 14
		});
		expect(result.success).toBe(false);
	});
});
