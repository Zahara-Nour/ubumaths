/**
 * Marquage « Espaces dès 4 chiffres » des modèles en prod (lot 4d, PR 2)
 * =====================================================================
 *
 * Depuis #1642, le juge suit la règle du BIPM : espace exigée dès 5 chiffres
 * (`MIN_DIGITS_FOR_GROUPING`). Un modèle réglé `options.constraints.spacesFromFourDigits`
 * garde la règle de l'école (dès 4 chiffres, `SCHOOL_MIN_DIGITS_FOR_GROUPING`).
 *
 * Un modèle a BESOIN de la règle de l'école quand une de ses specs attend la
 * contrainte `spaces` sur une réponse que seule cette règle remarque (`7900`).
 * Deux traitements (David, 2026-10-23 ; journal simplify-carte, § 43) :
 * - primaire / collège : le modèle est MARQUÉ (colonne `options`) ;
 * - les 5 brouillons de 1re spé : PAS de marquage (BIPM au lycée), leurs specs
 *   sont corrigées (colonne `test_specs`) : la réponse devient juste.
 *
 * Les listes sont FIGÉES (relues le 2026-10-23) : le script refuse d'écrire si la
 * règle, appliquée à la prod courante, ne retrouve pas exactement ces modèles.
 */

import {
	MIN_DIGITS_FOR_GROUPING,
	SCHOOL_MIN_DIGITS_FOR_GROUPING
} from '../../../src/lib/mathAST/digit-grouping';
import { checkSpacesViolation } from '../../../src/lib/mathAST/cosmetic-transforms';
import type { QuestionTemplate, TestSpec } from '../../../src/lib/questions/types';

// ============================================================================
// TYPES
// ============================================================================

/** `marquage` : colonne `options` ; `specs` : colonne `test_specs` (lycée) */
export type Treatment = 'marquage' | 'specs';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Brouillons de 1re spé : specs corrigées, pas de marquage (BIPM au lycée) */
export const LYCEE_DRAFT_IDS: readonly string[] = [
	'245b4eb1-11fc-497a-b4cd-0a8934719d2c', // Décroissance exponentielle
	'ef807ee9-f95b-469a-a6a8-4232e933b4c6', // Somme des premiers entiers
	'e7cfe442-6653-4f97-a74e-08b8853d3305', // Somme des puissances successives de q
	'27d77564-e109-4681-8a64-13a3ee1729cd', // Valeur d'un placement
	// Scindé de 27d77564 par la passe lycée (#1646), après la relecture des listes
	'103cf8d9-a014-44d0-a4a0-08d94749a60e' // Valeur d'un placement à intérêts simples
];

/** Modèles de primaire / collège à marquer « Espaces dès 4 chiffres » (51, tous publiés) */
export const SCHOOL_RULE_IDS: readonly string[] = [
	'1dd4d0ea-26d6-40a8-b804-e4dbf412c710', // Convertir des vitesses (4e)
	'b6269f1e-8323-4cd4-a578-b669df1c31bb', // Calculer avec des unités (6e)
	'ddbce820-5e75-4a7a-832e-33980cd4b43a', // Calculer un produit (6e)
	'571ca739-e3be-47de-b431-e888a9e46f18', // Calculer un produit (6e)
	'819df2a9-5dd9-40c5-9525-c68e626c04b6', // Calculer un produit (6e)
	'e1b540fa-1be8-4993-a731-e536eac64c3e', // Calculer un produit (6e)
	'd793de49-b065-46ea-aa8b-d09adcbb7617', // Calculer un produit d'entiers (6e)
	'9c7978da-6bf9-4ff6-b117-f26733bda9f0', // Calculer un quotient (6e)
	'f3bf4c64-5de9-4728-adb7-c86ab79e94e5', // Compléter une multiplication à trou (6e)
	'7a90fc45-a7e2-493b-96d5-d0963e51e136', // Convertir dans une autre unité (6e)
	'355bd41a-1589-4c25-be09-5f062bada81a', // Convertir dans une autre unité (6e)
	'bac3e110-94a4-459e-a0a1-238c60266555', // Multiplier par 0,01 (6e)
	'bf774c82-c2cb-496f-9305-d5da7b3ffe10', // Utiliser la distributivité (6e)
	'98c41bde-bb56-4569-88ec-76f09f21e783', // Utiliser la distributivité (6e)
	'108b97fa-438e-47c4-8020-7e3877fc28c3', // Utiliser la distributivité (6e)
	'b0b30022-ed72-45e9-bbf9-628711470573', // Calculer une différence (CE1)
	'810f1824-18ac-48e5-bf15-1c0b3854f78b', // Calculer une différence (CE1)
	'579d0b00-b3a5-46e6-a076-04ec265c1c4f', // Calculer une somme (CE1)
	'850fc524-587b-4f8e-b2c5-851d17e9cfce', // Additionner par regroupements (CE2)
	'fbd02016-454b-49f1-8bca-6d0294581231', // Calculer astucieusement un produit (CE2)
	'2c3a18e7-2727-4ae3-a899-e16cfc9c730b', // Calculer un produit d'entiers (CE2)
	'a0cae721-afb8-46af-b966-8856fb012be0', // Calculer une différence (CE2)
	'ed5f5f52-ba4f-4c51-a843-2be19156b4b7', // Calculer une somme (CE2)
	'22b8da83-a8ea-4d8e-b500-ff24e08cf260', // Compléter une addition à trou (CE2)
	'9f4cbd66-4fab-460b-8872-4a2b36d94267', // Compléter une soustraction à trou (CE2)
	'823f9e95-4459-49fb-9378-683e1b886079', // Décomposer l'écriture décimale d'un nombre (CE2)
	'7a34967c-bcb2-414b-920f-05d04aba34b4', // Décomposer l'écriture décimale d'un nombre (CE2)
	'6ef8aedf-c8cf-4769-aa3e-b3de249492ae', // Décomposition décimale → nombre entier (CE2)
	'906252f8-0104-4c9f-9eb9-3f70d80d7045', // Écrire un grand nombre entier avec des espaces (CE2)
	'8d6f283f-e810-4b9e-be2d-567aa955fc03', // Multiplier par 20 (CE2)
	'e38d205a-5737-4a0a-a9cd-aab742107c2b', // Calculer un produit (CM1)
	'bd760867-7303-4ac8-87eb-724fb5994cab', // Écrire un grand nombre entier avec des espaces (CM1)
	'cda36cc2-7d9c-4340-99f0-143467c83786', // Écrire un grand nombre entier sans les zéros inutiles (CM1)
	'4643ed4a-4cb9-456f-bc7b-a36c99b8290a', // Multiplier deux multiples de 10 (CM1)
	'17a3c039-744d-4108-9b47-49f0183990b7', // Trouver le complément (CM1)
	'45e9fa53-1c61-40e8-88a4-183fcb162ce5', // Trouver le complément (CM1)
	'918598f5-d7b0-43f8-b679-f69ab2039134', // Calculer astucieusement un produit (CM2)
	'e009f9d0-bc51-452e-9119-b6eff18cfe83', // Calculer un produit d'entiers (CM2)
	'4b1968b9-2210-4f08-a1b8-69eae735d714', // Compléter une division à trou (CM2)
	'45e06ece-246e-4182-ae1f-8d04a98e6aae', // Compléter une division à trou (CM2)
	'ae96d7af-e1f6-4390-8100-c779260e4152', // Compléter une multiplication à trou (CM2)
	'58f7a8dd-b8de-48f4-9cfa-5356b75e1c64', // Décomposer en unités, dixièmes, centièmes, millièmes (CM2)
	'59b9170e-90db-4912-a6ee-0b7a9215e523', // Décomposer une fraction (CM2)
	'0dd3de90-10fc-485b-a961-343b01a84cee', // Écrire un grand nombre entier avec des espaces (CM2)
	'f3477519-1309-4deb-b3cc-5af828f900bb', // Forme décimale d'une fraction (CM2)
	'b1d3c8aa-34f3-4d01-9e27-499a91c1940e', // Forme décimale d'une fraction (CM2)
	'a62ccb82-e528-4618-867d-728eda80dd8e', // Forme décimale d'une fraction (CM2)
	'bddd7963-1e7d-4583-beb9-bb8b4cb759e3', // Utiliser la distributivité (CM2)
	'f1e954b5-b2b7-455c-ae63-8355013e9a2b', // Utiliser la distributivité (CM2)
	'c4de2983-0df0-46a5-8bfb-1170bbdee706', // Utiliser la distributivité (CM2)
	'f0420211-adb3-4e2c-955d-43c12f43ae98' // Utiliser la distributivité (CM2)
];

// ============================================================================
// FUNCTIONS — SÉLECTION
// ============================================================================

function expectsSpaces(spec: TestSpec): boolean {
	return spec.expected.constraintViolations?.includes('spaces') ?? false;
}

/** Réponse remarquée par la règle de l'école seulement (`7900`, `1159{,}27`) */
function schoolRuleOnly(answer: string): boolean {
	return (
		checkSpacesViolation(answer, SCHOOL_MIN_DIGITS_FOR_GROUPING) &&
		!checkSpacesViolation(answer, MIN_DIGITS_FOR_GROUPING)
	);
}

/** Spec qui attend `spaces` sur une réponse que seule la règle de l'école remarque */
export function specNeedsSchoolRule(spec: TestSpec): boolean {
	return expectsSpaces(spec) && (spec.answers ?? []).some(schoolRuleOnly);
}

/** Le modèle a-t-il besoin de la règle de l'école pour que ses specs restent vraies ? */
export function needsSchoolRule(template: QuestionTemplate): boolean {
	return (template.testSpecs ?? []).some(specNeedsSchoolRule);
}

/** Écart entre la sélection figée et celle que la règle trouve (vide = accord) */
export function selectionGap(
	expected: readonly string[],
	found: readonly string[]
): { missing: string[]; unexpected: string[] } {
	return {
		missing: expected.filter((id) => !found.includes(id)),
		unexpected: found.filter((id) => !expected.includes(id))
	};
}

// ============================================================================
// FUNCTIONS — TRAITEMENTS
// ============================================================================

/**
 * Traitement déjà fait (relance après une écriture interrompue) : le modèle est
 * sauté, sans compter comme un échec. Marquage : le réglage est posé ; specs :
 * plus aucune spec n'attend la règle de l'école.
 */
export function alreadyDone(template: QuestionTemplate, treatment: Treatment): boolean {
	return treatment === 'marquage'
		? template.options?.constraints?.spacesFromFourDigits === true
		: !needsSchoolRule(template);
}

/** Marque le modèle « Espaces dès 4 chiffres » (seule la colonne `options` change) */
export function markSchoolRule(template: QuestionTemplate): QuestionTemplate {
	if (template.options?.constraints?.spacesFromFourDigits === true) {
		throw new Error('déjà marqué « Espaces dès 4 chiffres »');
	}
	return {
		...template,
		options: {
			...template.options,
			constraints: { ...template.options?.constraints, spacesFromFourDigits: true }
		}
	};
}

/**
 * Corrige une spec à la règle du BIPM : la remarque `spaces` disparaît, et la
 * réponse devient juste si elle n'attendait rien d'autre. Une spec dont une
 * réponse reste remarquée au BIPM (5 chiffres ou plus) est refusée : la corriger
 * serait faux.
 */
function bipmSpec(spec: TestSpec): TestSpec {
	if (!specNeedsSchoolRule(spec)) return spec;
	const answers = spec.answers ?? [];
	if (answers.some((answer) => checkSpacesViolation(answer, MIN_DIGITS_FOR_GROUPING))) {
		throw new Error(`spec « ${spec.description} » : une réponse reste remarquée au BIPM`);
	}
	const violations = (spec.expected.constraintViolations ?? []).filter((v) => v !== 'spaces');
	const { constraintViolations: _cv, ...expected } = spec.expected;
	return {
		...spec,
		description: `${answers
			.filter(schoolRuleOnly)
			.map((a) => a.replace(/\{,\}/g, ','))
			.join(' ; ')} sans espace : accepté (espace exigée dès 5 chiffres)`,
		expected:
			violations.length > 0
				? { ...expected, constraintViolations: violations }
				: { ...expected, status: 'correct' }
	};
}

/** Corrige les specs du modèle à la règle du BIPM (seule la colonne `test_specs` change) */
export function bipmTestSpecs(template: QuestionTemplate): QuestionTemplate {
	if (!needsSchoolRule(template)) throw new Error('aucune spec à corriger');
	return { ...template, testSpecs: (template.testSpecs ?? []).map(bipmSpec) };
}
