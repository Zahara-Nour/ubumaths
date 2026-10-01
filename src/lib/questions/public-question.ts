/**
 * Question d'évaluation, version PUBLIQUE (chantier 5, ADR 0015, Q32)
 * ===================================================================
 *
 * Pendant une évaluation, le serveur tire et corrige ; le navigateur ne reçoit
 * que ce qu'il faut pour afficher la question et y répondre. Construite en
 * LISTE BLANCHE, champ par champ : ni réponse attendue, ni correction, ni bon
 * choix d'un QCM, ni graine, ni variables tirées, ni règle de validation.
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
import {
	getQuestionType,
	type ConstraintMode,
	type InstanceBlank,
	type QuestionInstance
} from './types';

// Types
export interface PublicBlank {
	type: InstanceBlank['type'];
	prefilled?: string;
	unit?: { expected: boolean; required?: string };
	/** Touches de l'onglet « Unités » (famille de grandeurs, jamais l'unité attendue seule) */
	unitKeys?: string[];
	graphicalConfig?: InstanceBlank['graphicalConfig'];
}

export interface PublicQuestion {
	/** Rang dans la tentative (0, 1, …) : c'est lui qui relie la réponse à la question */
	position: number;
	/** Durée de la question (Entraînement) */
	delaySeconds: number;
	type: 'fill_in_blanks' | 'multiple_choice';
	statement: string;
	exerciseInstruction?: string;
	blanks?: PublicBlank[];
	expressions?: { name: string; latex: string; displayLatex?: string; answerFormat?: string }[];
	/** Choix dans l'ordre AFFICHÉ ; la réponse envoie ces positions */
	choices?: { content: string }[];
	multipleAnswers?: boolean;
	/** Réglage des espaces (clavier : espace fine insérée ou non) */
	spaces?: ConstraintMode;
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
	return result;
}

/** Version publique d'une instance générée par le serveur (liste blanche) */
export function toPublicQuestion(
	instance: QuestionInstance,
	meta: { position: number; delaySeconds: number }
): PublicQuestion {
	const type =
		getQuestionType(instance) === 'multiple_choice' ? 'multiple_choice' : 'fill_in_blanks';
	const question: PublicQuestion = {
		position: meta.position,
		delaySeconds: meta.delaySeconds,
		type,
		statement: instance.statement
	};
	if (instance.exerciseInstruction) question.exerciseInstruction = instance.exerciseInstruction;
	const spaces = instance.options?.constraints?.spaces;
	if (spaces) question.spaces = spaces;

	if (type === 'multiple_choice') {
		question.choices = (instance.shuffledChoices ?? []).map((choice) => ({
			content: choice.content
		}));
		if (instance.multipleAnswers) question.multipleAnswers = true;
		return question;
	}

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
		grades: [],
		theme: '',
		domain: '',
		level: 0,
		generatedAt: '',
		...(question.exerciseInstruction && { exerciseInstruction: question.exerciseInstruction }),
		...(question.spaces && { options: { constraints: { spaces: question.spaces } } })
	};

	if (question.type === 'multiple_choice') {
		const choices = question.choices ?? [];
		instance.choices = choices.map((choice) => ({
			content: choice.content as ResolvedMarkdown,
			isCorrect: false
		}));
		// Position affichée = indice : l'envoi transmet les positions cochées. Toute
		// conversion « position affichée → indice d'origine » faite par la carte
		// (QuestionCard) est donc NEUTRE ici ; seul le serveur, qui a l'instance
		// complète, convertit (test : QuestionCard-evaluation.svelte.test.ts)
		instance.shuffledChoices = choices.map((choice, index) => ({
			content: choice.content as ResolvedMarkdown,
			originalIndex: index
		}));
		if (question.multipleAnswers) instance.multipleAnswers = true;
		return instance;
	}

	instance.blanks = (question.blanks ?? []).map((blank) => ({
		expectedAnswer: '',
		type: blank.type,
		...(blank.prefilled && { prefilled: blank.prefilled }),
		...(blank.unit && { unit: blank.unit }),
		...(blank.graphicalConfig && { graphicalConfig: blank.graphicalConfig })
	}));
	if (question.expressions?.length) instance.expressions = question.expressions;
	return instance;
}

/** Touches d'unités de chaque case (FillBlanksInput ne peut plus les déduire) */
export function unitKeysOf(question: PublicQuestion): string[] | undefined {
	const keys = (question.blanks ?? []).flatMap((blank) => blank.unitKeys ?? []);
	return keys.length > 0 ? [...new Set(keys)] : undefined;
}
