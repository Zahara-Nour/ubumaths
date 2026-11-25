import { describe, expect, it } from 'vitest';
import { CHILD_ACCOUNT_DOMAIN } from '#lib/utils/child-account.ts';
import {
	privateLessonInvitationCreateSchema,
	privateLessonInvitationIdSchema
} from '../private-lessons';

const VALIDE = { firstname: '  Jade ', parentEmail: ' Parent.Jade@Example.TEST ', grade: '5' };

describe("entrées d'une invitation de cours particulier", () => {
	it('prénom rogné, adresse en minuscules, niveau au format de la base', () => {
		expect(privateLessonInvitationCreateSchema.parse(VALIDE)).toEqual({
			firstname: 'Jade',
			parentEmail: 'parent.jade@example.test',
			grade: '5'
		});
	});

	it('mêmes règles de prénom que l’inscription par le parent', () => {
		for (const firstname of ['Anne-Sophie', "N'Golo", 'Éloïse']) {
			expect(privateLessonInvitationCreateSchema.safeParse({ ...VALIDE, firstname }).success).toBe(
				true
			);
		}
		for (const firstname of ['', 'Jade <b>', 'http://x.y', '42', 'x'.repeat(51)]) {
			expect(privateLessonInvitationCreateSchema.safeParse({ ...VALIDE, firstname }).success).toBe(
				false
			);
		}
	});

	it("refuse une adresse fictive d'enfant, ou que la base refuserait", () => {
		for (const parentEmail of ['pas-une-adresse', `jade123@${CHILD_ACCOUNT_DOMAIN}`, 'a@b.c']) {
			expect(
				privateLessonInvitationCreateSchema.safeParse({ ...VALIDE, parentEmail }).success
			).toBe(false);
		}
	});

	it("refuse un niveau hors liste ou au format d'affichage", () => {
		for (const grade of ['5e', '5ème', 'TERM', '']) {
			expect(privateLessonInvitationCreateSchema.safeParse({ ...VALIDE, grade }).success).toBe(
				false
			);
		}
	});

	it('identifiant : UUID seulement', () => {
		expect(privateLessonInvitationIdSchema.safeParse({ id: 'abc' }).success).toBe(false);
		expect(
			privateLessonInvitationIdSchema.safeParse({ id: '11111111-1111-4111-8111-111111111111' })
				.success
		).toBe(true);
	});
});
