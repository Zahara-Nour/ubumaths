/**
 * Question d'évaluation, version PUBLIQUE (chantier 5, ADR 0015, Q32)
 * ===================================================================
 *
 * Pendant une évaluation, le serveur tire et corrige ; le navigateur ne reçoit
 * que ce qu'il faut pour afficher la question et y répondre. Construite en
 * LISTE BLANCHE, champ par champ : ni réponse attendue, ni correction, ni bon
 * choix d'une case choix, ni graine, ni variables tirées, ni règle de validation ;
 * l'énoncé lui-même sans la valeur à trouver de ses blocs à geste
 * (`maskGestureAnswers`).
 *
 * Pas d'identifiant de modèle non plus : avec lui, un élève retrouverait la
 * formule de la correction (les modèles publiés sont lisibles) et pourrait
 * chercher la graine en régénérant (2^31 essais pour un seul modèle ; sans
 * lui, il faut en plus deviner le modèle dans la catégorie). Aucun composant
 * de saisie n'en a besoin.
 *
 * `toDisplayInstance` (navigateur) rhabille la version publique en
 * `QuestionInstance` pour les composants de saisie existants : réponses
 * attendues vides, aucun choix marqué juste.
 */

import type { ResolvedMarkdown } from '$lib/ubumark';
import { unitKeysFor } from '$lib/questions/units/keyboard-units';
import type { CapitalPairs } from '$lib/mathAST/parser/types';
import type { ConstraintMode, GradeLevel, InstanceBlank, QuestionInstance } from './types';
import { isWorkFigureBlank } from './graded-part';
import { maskGestureAnswers } from './masked-statement';

// Types
export interface PublicBlank {
	type: InstanceBlank['type'];
	prefilled?: string;
	unit?: { expected: boolean; required?: string };
	/** Touches de l'onglet « Unités » (famille de grandeurs, jamais l'unité attendue seule) */
	unitKeys?: string[];
	graphicalConfig?: InstanceBlank['graphicalConfig'];
	/** Nature de la réponse (clavier « Intervalles ») — le drapeau seul, jamais l'attendu */
	answerKind?: InstanceBlank['answerKind'];
	/**
	 * Case choix : les choix dans l'ordre AFFICHÉ (comme le bloc de l'énoncé), jamais
	 * l'ordre d'origine (il trahirait la réponse) ; la réponse envoie des positions
	 * affichées, ramenées aux indices d'origine par le serveur (`toOriginalChoiceValues`)
	 */
	choice?: { choices: string[]; multiple: boolean };
	/** Figure de travail : jamais notée, peut rester vide (rien d'attendu à cacher) */
	workFigure?: true;
	/**
	 * Figure à compléter (notée) : le fait seul, que l'énoncé montre déjà ; jamais
	 * `construction` (son texte et ses vérifications disent la réponse). Sans lui,
	 * l'écran la compterait comme une case écrite (aide, numéros des cases)
	 */
	figure?: true;
	/**
	 * Case d'un bloc à geste : le genre du bloc seul (`line`, `horloge`…), que l'énoncé
	 * montre déjà ; sans lui, l'écran afficherait l'aide des cases écrites
	 */
	construire?: InstanceBlank['construire'];
}

export interface PublicQuestion {
	/** Rang dans la tentative (0, 1, …) : c'est lui qui relie la réponse à la question */
	position: number;
	/** Durée de la question (Entraînement) */
	delaySeconds: number;
	type: 'fill_in_blanks';
	statement: string;
	exerciseInstruction?: string;
	blanks?: PublicBlank[];
	expressions?: { name: string; latex: string; displayLatex?: string; answerFormat?: string }[];
	/** Réglage des espaces (clavier : espace fine insérée ou non) */
	spaces?: ConstraintMode;
	/** Fonctions déclarées par le modèle (`P`, `C`) : notation de l'énoncé, aucune réponse */
	genericFunctions?: string[];
	/** Sens de `AB` (longueur ou produit) : lecture de la saisie, aucune réponse */
	capitalPairs?: CapitalPairs;
	/** Niveaux de la carte (clavier : onglet « n! » en Terminale) : aucune réponse, aucun indice */
	grades?: GradeLevel[];
}

// Functions
function publicBlank(blank: InstanceBlank): PublicBlank {
	const result: PublicBlank = { type: blank.type };
	if (blank.prefilled) result.prefilled = blank.prefilled;
	if (blank.unit) {
		result.unit = {
			expected: blank.unit.expected,
			...(blank.unit.required && { required: blank.unit.required })
		};
		if (blank.type === 'math' && blank.unit.expected) {
			// Calculées ICI : le navigateur n'a pas la réponse attendue pour les déduire
			result.unitKeys = unitKeysFor([blank.expectedAnswer], [blank.unit.required]);
		}
	}
	if (blank.graphicalConfig) result.graphicalConfig = blank.graphicalConfig;
	if (blank.answerKind) result.answerKind = blank.answerKind;
	if (isWorkFigureBlank(blank)) result.workFigure = true;
	else if (blank.construction) result.figure = true;
	if (blank.construire) result.construire = blank.construire;
	if (blank.choice) {
		const { choices, order, multiple } = blank.choice;
		result.choice = { choices: order.map((index) => choices[index]), multiple };
	}
	return result;
}

/** Version publique d'une instance générée par le serveur (liste blanche) */
export function toPublicQuestion(
	instance: QuestionInstance,
	meta: { position: number; delaySeconds: number }
): PublicQuestion {
	const question: PublicQuestion = {
		position: meta.position,
		delaySeconds: meta.delaySeconds,
		type: 'fill_in_blanks',
		// Les blocs à geste sans la valeur à trouver (`placer: A=?`) : chantier `fuite-enonce`
		statement: maskGestureAnswers(instance.statement)
	};
	if (instance.exerciseInstruction) question.exerciseInstruction = instance.exerciseInstruction;
	const spaces = instance.options?.constraints?.spaces;
	if (spaces) question.spaces = spaces;
	if (instance.genericFunctions?.length) question.genericFunctions = [...instance.genericFunctions];
	if (instance.capitalPairs) question.capitalPairs = instance.capitalPairs;
	if (instance.grades?.length) question.grades = [...instance.grades];

	question.blanks = (instance.blanks ?? []).map(publicBlank);
	if (instance.expressions?.length) {
		question.expressions = instance.expressions.map((expression) => ({
			name: expression.name,
			latex: expression.latex,
			...(expression.displayLatex && { displayLatex: expression.displayLatex }),
			...(expression.answerFormat && { answerFormat: expression.answerFormat })
		}));
	}
	return question;
}

/**
 * Navigateur : `QuestionInstance` d'affichage depuis la version publique. Les
 * champs exigés par le type sont neutres (réponses vides, aucun choix juste) ;
 * la correction n'existe pas avant l'envoi.
 */
export function toDisplayInstance(question: PublicQuestion): QuestionInstance {
	const instance: QuestionInstance = {
		templateId: '',
		statement: question.statement as ResolvedMarkdown,
		grades: question.grades ? [...question.grades] : [],
		theme: '',
		domain: '',
		level: 0,
		generatedAt: '',
		...(question.exerciseInstruction && { exerciseInstruction: question.exerciseInstruction }),
		...(question.spaces && { options: { constraints: { spaces: question.spaces } } }),
		...(question.genericFunctions?.length && { genericFunctions: question.genericFunctions }),
		...(question.capitalPairs && { capitalPairs: question.capitalPairs })
	};

	instance.blanks = (question.blanks ?? []).map((blank) => ({
		expectedAnswer: '',
		type: blank.type,
		...(blank.prefilled && { prefilled: blank.prefilled }),
		...(blank.unit && { unit: blank.unit }),
		...(blank.graphicalConfig && { graphicalConfig: blank.graphicalConfig }),
		...(blank.answerKind && { answerKind: blank.answerKind }),
		...(blank.construire && { construire: blank.construire }),
		// Figure de travail : la figure vient de l'énoncé, la case dit seulement qu'elle n'est pas notée
		...(blank.workFigure && {
			construction: { source: '', checks: [], work: true as const }
		}),
		// Figure à compléter : la figure vient de l'énoncé, jugée par le serveur
		...(blank.figure && { construction: { source: '', checks: [] } }),
		// Ordre affiché = ordre d'origine du navigateur : les positions cochées partent telles quelles
		...(blank.choice && {
			choice: {
				choices: [...blank.choice.choices],
				order: blank.choice.choices.map((_, index) => index),
				multiple: blank.choice.multiple
			}
		})
	}));
	if (question.expressions?.length) instance.expressions = question.expressions;
	return instance;
}

/** Touches d'unités de chaque case (FillBlanksInput ne peut plus les déduire) */
export function unitKeysOf(question: PublicQuestion): string[] | undefined {
	const keys = (question.blanks ?? []).flatMap((blank) => blank.unitKeys ?? []);
	return keys.length > 0 ? [...new Set(keys)] : undefined;
}
