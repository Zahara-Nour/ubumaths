import { describe, expect, it } from 'vitest';
import { CHILD_ACCOUNT_DOMAIN } from '#lib/utils/child-account.ts';
import {
	privateLessonInvitationCreateSchema,
	privateLessonInvitationIdSchema,
	privateLessonRedeemFormSchema,
	privateLessonTokenSchema
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

describe('formulaire de la page du parent (PR 3)', () => {
	const FORMULAIRE = {
		password: 'Zz-Enfant-2026!',
		confirmPassword: 'Zz-Enfant-2026!',
		acceptTerms: 'true',
		consent: 'true'
	};

	function champsEnErreur(entree: Record<string, string | undefined>): string[] {
		const res = privateLessonRedeemFormSchema.safeParse(entree);
		return res.success ? [] : [...new Set(res.error.issues.map((i) => String(i.path[0])))];
	}

	it('mot de passe confirmé, CGU et consentement cochés : accepté', () => {
		expect(privateLessonRedeemFormSchema.parse(FORMULAIRE)).toEqual({
			password: 'Zz-Enfant-2026!',
			confirmPassword: 'Zz-Enfant-2026!',
			acceptTerms: true,
			consent: true
		});
	});

	it('consentement ou CGU non cochés : refusé sur leur champ', () => {
		expect(champsEnErreur({ ...FORMULAIRE, consent: 'false' })).toEqual(['consent']);
		expect(champsEnErreur({ ...FORMULAIRE, consent: undefined })).toEqual(['consent']);
		expect(champsEnErreur({ ...FORMULAIRE, acceptTerms: 'false' })).toEqual(['acceptTerms']);
	});

	it('mots de passe différents, trop court ou trop courant : refusé', () => {
		expect(champsEnErreur({ ...FORMULAIRE, confirmPassword: 'Autre-2026!' })).toEqual([
			'confirmPassword'
		]);
		expect(champsEnErreur({ ...FORMULAIRE, password: 'court', confirmPassword: 'court' })).toEqual([
			'password'
		]);
		expect(
			champsEnErreur({ ...FORMULAIRE, password: 'password123', confirmPassword: 'password123' })
		).toEqual(['password']);
	});

	it('jeton : 43 caractères base64url, rien d’autre', () => {
		expect(privateLessonTokenSchema.safeParse('A'.repeat(42) + '_').success).toBe(true);
		for (const jeton of ['', 'A'.repeat(42), 'A'.repeat(44), 'A'.repeat(42) + '/', '../x']) {
			expect(privateLessonTokenSchema.safeParse(jeton).success).toBe(false);
		}
	});
});
