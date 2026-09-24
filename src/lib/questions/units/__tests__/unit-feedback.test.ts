/**
 * Messages de correction d'un trou à unité
 * =========================================
 *
 * Spécification validée (Phase 3, saisie des unités) : quand la réponse d'un
 * trou à unité est fausse À CAUSE de l'unité, l'élève doit lire pourquoi.
 * Les messages sont figés, mot pour mot.
 *
 * Tout passe par le pipeline complet `validateAnswer`, avec les chaînes que
 * MathLive produit réellement (cf. `student-quantity-input.test.ts`).
 */

import { describe, it, expect } from 'vitest';
import { validateAnswer } from '$lib/utils/answer-validator';
import type { QuestionInstance, InstanceBlank } from '$lib/questions/types';
import type { ResolvedMarkdown } from '$lib/ubumark';

// ============================================================================
// HELPERS
// ============================================================================

function createInstance(blanks: InstanceBlank[]): QuestionInstance {
	return {
		templateId: 'test-unit-feedback',
		statement: 'Test' as ResolvedMarkdown,
		blanks,
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		generatedAt: new Date().toISOString()
	};
}

/** Trou à unité, avec éventuellement une unité imposée */
function unitBlank(expectedAnswer: string, required?: string): InstanceBlank {
	return {
		expectedAnswer,
		type: 'math',
		unit: required ? { expected: true, required } : { expected: true }
	};
}

/** Soumet une saisie MathLive dans un trou unique */
function submit(latex: string, blank: InstanceBlank) {
	return validateAnswer([latex], createInstance([blank]), [latex]);
}

// ============================================================================
// LES CINQ SITUATIONS
// ============================================================================

describe('trou à unité — message affiché quand l’unité est en cause', () => {
	it('grandeur différente : 5ms (milliseconde) quand une vitesse en m/s est attendue', () => {
		const result = submit('5ms', unitBlank('5\\unit{m/s}'));
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).toBe(
			'Cette unité ne mesure pas la bonne grandeur. Pour un produit d’unités, écris m·s.'
		);
	});

	it('unité imposée non utilisée : 5000 m quand km est imposé', () => {
		const result = submit('5000\\operatorname{\\mathrm{m}}', unitBlank('5\\unit{km}', 'km'));
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).toBe('Donne ta réponse en km.');
	});

	it('unité imposée : le message nomme l’unité imposée réelle (m)', () => {
		const result = submit('5\\operatorname{\\mathrm{km}}', unitBlank('5000\\unit{m}', 'm'));
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).toBe('Donne ta réponse en m.');
	});

	it('unité oubliée : 5 quand 5 km est attendu', () => {
		const result = submit('5', unitBlank('5\\unit{km}'));
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).toBe('N’oublie pas l’unité.');
	});

	it('écriture ambiguë kg/m.s (barre en ligne) : message construit sur l’écriture de l’élève', () => {
		const result = submit('3kg/m.s', unitBlank('3\\unit{kg/(m.s)}'));
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).toBe('Écris kg/(m·s) ou kg·m⁻¹·s⁻¹.');
	});

	it('écriture ambiguë avec exposant au dénominateur : kg/m.s^2', () => {
		const result = submit('3kg/m.s^2', unitBlank('3\\unit{kg/(m.s^2)}'));
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).toBe('Écris kg/(m·s²) ou kg·m⁻¹·s⁻².');
	});

	it('lettres qui ne sont pas une unité : 5xyz', () => {
		const result = submit('5xyz', unitBlank('5\\unit{km}'));
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).toBe('Unité inconnue : xyz.');
	});
});

// ============================================================================
// SAISIE RÉELLE DE kg/m.s ET CAS INCHANGÉS
// ============================================================================

describe('trou à unité — ce qui ne change pas', () => {
	it('MathLive met la barre en fraction : \\frac{3kg}{m.s} se lit kg/(m·s), donc correct', () => {
		// Taper « / » dans MathLive ouvre une fraction : le dénominateur m.s est
		// alors sans ambiguïté, la saisie n'a pas besoin du message.
		const result = submit(
			'\\frac{3\\operatorname{\\mathrm{kg}}}{m.s}',
			unitBlank('3\\unit{kg/(m.s)}')
		);
		expect(result.isCorrect).toBe(true);
		expect(result.feedback).toBeUndefined();
	});

	it('bonne unité, mauvaise valeur : le message existant est conservé', () => {
		const result = submit('6\\operatorname{\\mathrm{km}}', unitBlank('5\\unit{km}'));
		expect(result.isCorrect).toBe(false);
		// Rien ne change ici : l'unité n'est pas en cause
		expect(result.feedback).toBe('Les blancs suivants sont incorrects: 1');
	});

	it('réponse juste : aucun message', () => {
		const result = submit('5\\operatorname{\\mathrm{km}}', unitBlank('5\\unit{km}'));
		expect(result.isCorrect).toBe(true);
		expect(result.feedback).toBeUndefined();
	});
});
