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
} from '../journal';

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
	/** La date civile LOCALE — celle qu'un sélecteur de date montre. */
	const aujourdHuiLocal = () => {
		const d = new Date();
		return [
			d.getFullYear(),
			String(d.getMonth() + 1).padStart(2, '0'),
			String(d.getDate()).padStart(2, '0')
		].join('-');
	};

	it('should accept today', () => {
		// `toISOString()` donnerait la date UTC, qui diffère de la date locale
		// pendant la fenêtre entre minuit local et minuit UTC. Le test échouait
		// alors pour une raison de fuseau, pas de logique.
		const result = futureDateSchema.safeParse(aujourdHuiLocal());
		expect(result.success).toBe(true);
	});

	it('accepte aujourd’hui quel que soit le fuseau du serveur', () => {
		// Le contrôle de non-régression : on éprouve les deux dates civiles
		// possibles à un instant donné — la locale et celle d'UTC. Aucune des
		// deux n'est « dans le passé » du point de vue de l'utilisateur, et une
		// comparaison qui mélange instants et dates civiles en refuse une.
		const utc = new Date().toISOString().split('T')[0];
		const local = aujourdHuiLocal();
		// La date UTC est soit la même, soit la veille de la locale.
		expect(futureDateSchema.safeParse(local).success).toBe(true);
		if (utc !== local) {
			// Le seul cas où elles diffèrent : UTC est en retard, donc « hier »
			// localement. Le schéma le refuse, et c'est correct — on vérifie que
			// c'est bien la date LOCALE qui fait référence.
			expect(futureDateSchema.safeParse(utc).success).toBe(false);
		}
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
			lessonContent: '  Test content  '
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.lessonContent).toBe('Test content');
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
