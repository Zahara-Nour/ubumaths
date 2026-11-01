/**
 * Modèles de questions RÉELS, copiés de la production le 2026-09-28 (lecture
 * seule) — lignes `question_templates` telles que la page automaths les passe à
 * `generateInstance` (cast direct de la ligne). `created_by`, `created_at`,
 * `updated_at` et `test_specs` retirés : sans objet ici.
 *
 * Servent à fabriquer de VRAIES instances : les anciens tests de
 * `saveTestSchema` fabriquaient un format que le générateur ne produit plus
 * (`answer`, `type`), et restaient verts pendant que la route refusait tout.
 */

import type { QuestionTemplate } from '$lib/questions/types';

// Texte à trous, une case (table d'addition)
const singleBlankRow = {
	id: '0830bc42-9462-4ab7-8854-9d9a50b1f885',
	type: 'fill_in_blanks',
	delay: 15,
	level: 1,
	theme: 'Entiers',
	title: "Table d'addition'",
	domain: 'Additionner',
	grades: ['CP'],
	shared: null,
	status: 'draft',
	options: null,
	precision: null,
	subdomain: 'Tables',
	variations: [
		{
			blanks: [{ expectedAnswer: 'eval:expression' }],
			statement: '$${{expression}}$$',
			variables: [
				{ name: 'a', expression: '0..9' },
				{ name: 'expression', expression: 'a+1' }
			]
		}
	],
	description: 'de 1',
	exercise_instruction: 'Calcule.',
	default_display_options: null
};

// Case choix (signe d'un quotient) : l'ancien QCM, tel que migré en prod le 2026-10-28
// (lot 4 du chantier figure-et-choix ; correction retirée, sans objet ici)
const choiceCaseRow = {
	id: '4d13f5d6-8350-4c34-96de-a5e31fb9759b',
	type: 'fill_in_blanks',
	delay: 20,
	level: 1,
	theme: 'Relatifs',
	title: "Déterminer le signe d'un quotient",
	domain: 'Multiplier et Diviser',
	grades: ['4'],
	shared: null,
	status: 'draft',
	options: null,
	precision: null,
	subdomain: 'Quotient',
	variations: [
		{
			blanks: [{ expectedAnswer: '{{eval:(1-a*b/abs(a*b))/2}}' }],
			statement:
				'Quel est le signe de ce quotient ?\n\n$${{expr1}}$$\n\n```choix\nmelanger: non\n- positif\n- négatif\n```',
			variables: [
				{ name: 'a', expression: '30..99;±' },
				{ name: 'b', expression: '30..99;±' },
				{ name: 'expr1', expression: 'a:(b)' }
			],
			conditions: ['a<=0 || b<0']
		}
	],
	description: null,
	exercise_instruction: null,
	default_display_options: null
};

// Plusieurs cases (encadrement d'un décimal)
const multiBlankRow = {
	id: 'fac5225d-2dae-49ec-b449-8900e7385fe6',
	type: 'fill_in_blanks',
	delay: 20,
	level: 1,
	theme: 'Décimaux',
	title: 'Encadrer un nombre décimal par deux entiers consécutifs',
	domain: 'Apprivoiser',
	grades: ['CM1'],
	shared: null,
	status: 'draft',
	options: null,
	precision: null,
	subdomain: 'Encadrer',
	variations: [
		{
			blanks: [{ expectedAnswer: '{{a}}' }, { expectedAnswer: '{{eval:a+1}}' }],
			statement: 'Encadre ce nombre décimal par deux entiers consécutifs.\n\n$${{expression1}}$$',
			variables: [
				{ name: 'a', expression: '0..9' },
				{ name: 'b', expression: '1..9' },
				{ name: 'c', expression: 'eval:a+b*0.1;d' },
				{ name: 'expression1', expression: '?<c<?' }
			]
		}
	],
	description: null,
	exercise_instruction: null,
	default_display_options: null
};

// Question à unité (vitesse moyenne)
const unitRow = {
	id: '6b44d220-2485-4d2c-aa35-70e74abec66e',
	type: 'fill_in_blanks',
	delay: 20,
	level: 1,
	theme: 'Grandeurs',
	title: 'Calculer une vitesse moyenne',
	domain: 'Vitesses',
	grades: ['4'],
	shared: null,
	status: 'draft',
	options: null,
	precision: null,
	subdomain: 'Calculer',
	variations: [
		{
			blanks: [{ unit: { expected: true }, expectedAnswer: '{{eval:b;[km.h^{-1}]}}' }],
			statement:
				"Quelle est la vitesse moyenne d'une voiture parcourant ${{eval:{b}*{c};[km]}}$ en ${{c}}$ ? (n'oublie pas l'unité)\n\nLa vitesse est de $?$.",
			variables: [
				{ name: 'a1', expression: '2..9' },
				{ name: 'a', expression: 'eval:a1*10 ' },
				{ name: 'b', expression: 'eval:(a)[km.h^{-1}]' },
				{ name: 'c1', expression: '2..9' },
				{ name: 'c', expression: 'c1[h]' }
			],
			correction: {
				steps: [
					"La vitesse d'une voiture parcourant ${{eval:{b}*{c};[km]}}$ en ${{c}}$ est de $\\dfrac{ {{eval:{b}*{c};[km]}} }{ {{eval:c;[h]}} } = {{solution}}$."
				]
			}
		}
	],
	description: null,
	exercise_instruction: null,
	default_display_options: null
};

// Carte de cours (#617) : ni case ni choix, recto = énoncé, verso = correction
const courseCardRow = {
	id: '03b3d9b3-2d38-4062-a70b-c9b31839444b',
	type: 'course_card',
	// Comme en production : les 4 cartes n'ont pas de délai (généré depuis #495)
	delay: null,
	level: 3,
	theme: 'Fonctions',
	title: 'Étude de fonction : ce que donne la dérivée',
	domain: 'Etude de fonction',
	grades: ['1_SPE'],
	shared: null,
	status: 'draft',
	options: { courseCard: true },
	precision: null,
	subdomain: 'Flash',
	variations: [
		{
			statement: "Que permet de trouver la dérivée d'une fonction ?",
			correction: { steps: ['Ses **variations** et ses **extremums**.'] }
		}
	],
	description: 'Carte de cours',
	exercise_instruction: null,
	default_display_options: null
};

// La page automaths caste la ligne telle quelle : on fait pareil
export const REAL_TEMPLATES = {
	singleBlank: singleBlankRow as unknown as QuestionTemplate,
	choiceCase: choiceCaseRow as unknown as QuestionTemplate,
	multiBlank: multiBlankRow as unknown as QuestionTemplate,
	unit: unitRow as unknown as QuestionTemplate,
	courseCard: courseCardRow as unknown as QuestionTemplate
};
