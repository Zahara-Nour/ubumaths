/**
 * Template Variables Registry
 *
 * Centralized registry of all available template variables organized by context.
 * This provides:
 * - Type safety for variable usage
 * - Documentation for template creators
 * - Validation of template placeholders
 * - Example values for previews
 */

import type { TemplateVariable, TriggerType } from '$lib/types/messageTemplates';

// =====================================================
// Global Variables (available in all templates)
// =====================================================

export const GLOBAL_VARIABLES: TemplateVariable[] = [
	{
		name: 'student_name',
		label: "Nom de l'étudiant",
		example: 'Marie Dubois',
		description: "Nom complet de l'étudiant qui envoie le message"
	},
	{
		name: 'student_first_name',
		label: "Prénom de l'étudiant",
		example: 'Marie',
		description: "Prénom de l'étudiant"
	},
	{
		name: 'teacher_name',
		label: 'Nom du professeur',
		example: 'M. Martin',
		description: 'Nom complet du professeur destinataire'
	},
	{
		name: 'class_name',
		label: 'Nom de la classe',
		example: '6ème A',
		description: "Nom de la classe de l'étudiant"
	},
	{
		name: 'today_date',
		label: 'Date du jour',
		example: '22 octobre 2025',
		description: 'Date actuelle au format français'
	},
	{
		name: 'today_date_short',
		label: 'Date (court)',
		example: '22/10/2025',
		description: 'Date actuelle au format court'
	},
	{
		name: 'time',
		label: 'Heure',
		example: '14:30',
		description: 'Heure actuelle'
	},
	{
		name: 'year',
		label: 'Année scolaire',
		example: '2025-2026',
		description: 'Année scolaire en cours'
	}
];

// =====================================================
// Context-Specific Variables
// =====================================================

/**
 * Variables for assessment-related messages
 */
export const ASSESSMENT_VARIABLES: TemplateVariable[] = [
	{
		name: 'assessment_title',
		label: "Titre de l'évaluation",
		example: 'Devoir Maison #3',
		description: "Titre de l'évaluation concernée",
		required: true
	},
	{
		name: 'assessment_link',
		label: "Lien vers l'évaluation",
		example: 'https://ubumaths.com/assessments/123',
		description: "URL vers la page de l'évaluation",
		required: true
	},
	{
		name: 'assessment_due_date',
		label: 'Date limite',
		example: '30 octobre 2025',
		description: 'Date limite de rendu'
	},
	{
		name: 'assessment_type',
		label: "Type d'évaluation",
		example: 'Devoir Maison',
		description: 'Type: Devoir Maison, Interrogation, etc.'
	},
	{
		name: 'student_question',
		label: "Question de l'étudiant",
		example: "[Saisie par l'étudiant]",
		description: "Question ou message de l'étudiant",
		required: true,
		userInput: true
	}
];

/**
 * Variables for SRS (Spaced Repetition System) messages
 */
export const SRS_VARIABLES: TemplateVariable[] = [
	{
		name: 'deck_name',
		label: 'Nom du deck',
		example: 'Fractions - Niveau 6ème',
		description: 'Nom du deck de révision',
		required: true
	},
	{
		name: 'deck_link',
		label: 'Lien vers le deck',
		example: 'https://ubumaths.com/srs/decks/456',
		description: 'URL vers la page du deck',
		required: true
	},
	{
		name: 'card_count',
		label: 'Nombre de cartes',
		example: '24',
		description: 'Nombre total de cartes dans le deck'
	},
	{
		name: 'due_cards',
		label: 'Cartes à réviser',
		example: '8',
		description: 'Nombre de cartes dues pour révision'
	},
	{
		name: 'student_message',
		label: "Message de l'étudiant",
		example: "[Saisie par l'étudiant]",
		description: "Message ou question de l'étudiant",
		required: true,
		userInput: true
	}
];

/**
 * Variables for enigma/challenge messages (future feature)
 */
export const ENIGMA_VARIABLES: TemplateVariable[] = [
	{
		name: 'enigma_number',
		label: "Numéro de l'énigme",
		example: '42',
		description: "Numéro de l'énigme",
		required: true
	},
	{
		name: 'enigma_title',
		label: "Titre de l'énigme",
		example: 'Le mystère des nombres premiers',
		description: "Titre de l'énigme"
	},
	{
		name: 'enigma_link',
		label: "Lien vers l'énigme",
		example: 'https://ubumaths.com/enigma/789',
		description: "URL vers la page de l'énigme avec correction",
		required: true
	},
	{
		name: 'enigma_difficulty',
		label: 'Difficulté',
		example: 'Difficile',
		description: "Niveau de difficulté de l'énigme"
	},
	{
		name: 'student_answer',
		label: "Réponse de l'étudiant",
		example: "[Saisie par l'étudiant]",
		description: "Réponse proposée par l'étudiant",
		required: true,
		userInput: true
	}
];

/**
 * Variables for system notifications
 */
export const NOTIFICATION_VARIABLES: TemplateVariable[] = [
	{
		name: 'notification_title',
		label: 'Titre de la notification',
		example: 'Nouvelle évaluation disponible',
		description: 'Titre de la notification système',
		required: true
	},
	{
		name: 'notification_body',
		label: 'Corps de la notification',
		example: 'Une nouvelle évaluation a été assignée à votre classe.',
		description: 'Contenu de la notification',
		required: true
	},
	{
		name: 'notification_link',
		label: "Lien d'action",
		example: 'https://ubumaths.com/dashboard',
		description: "Lien vers l'action concernée"
	},
	{
		name: 'notification_type',
		label: 'Type de notification',
		example: 'info',
		description: 'Type: info, warning, success, error'
	}
];

/**
 * Variables for general messages
 */
export const GENERAL_VARIABLES: TemplateVariable[] = [
	{
		name: 'custom_subject',
		label: 'Sujet personnalisé',
		example: 'Question sur le cours',
		description: 'Sujet du message',
		required: true,
		userInput: true
	},
	{
		name: 'custom_message',
		label: 'Message personnalisé',
		example: "[Saisie par l'étudiant]",
		description: 'Contenu du message',
		required: true,
		userInput: true
	}
];

// =====================================================
// Variable Registry Map
// =====================================================

/**
 * Map of trigger types to their available variables
 */
export const VARIABLES_BY_TRIGGER: Record<TriggerType, TemplateVariable[]> = {
	assessment_question: [...GLOBAL_VARIABLES, ...ASSESSMENT_VARIABLES],
	srs_help: [...GLOBAL_VARIABLES, ...SRS_VARIABLES],
	enigma_answer: [...GLOBAL_VARIABLES, ...ENIGMA_VARIABLES],
	system_notification: [...GLOBAL_VARIABLES, ...NOTIFICATION_VARIABLES],
	general: [...GLOBAL_VARIABLES, ...GENERAL_VARIABLES]
};

// =====================================================
// Helper Functions
// =====================================================

/**
 * Get all available variables for a trigger type
 */
export function getVariablesForTrigger(triggerType: TriggerType): TemplateVariable[] {
	return VARIABLES_BY_TRIGGER[triggerType] || GLOBAL_VARIABLES;
}

/**
 * Get a specific variable by name from a trigger context
 */
export function getVariable(
	triggerType: TriggerType,
	variableName: string
): TemplateVariable | undefined {
	const variables = getVariablesForTrigger(triggerType);
	return variables.find((v) => v.name === variableName);
}

/**
 * Get all required variables for a trigger type
 */
export function getRequiredVariables(triggerType: TriggerType): TemplateVariable[] {
	return getVariablesForTrigger(triggerType).filter((v) => v.required);
}

/**
 * Get all user input variables for a trigger type
 */
export function getUserInputVariables(triggerType: TriggerType): TemplateVariable[] {
	return getVariablesForTrigger(triggerType).filter((v) => v.userInput);
}

/**
 * Get all auto-filled variables for a trigger type
 */
export function getAutoFilledVariables(triggerType: TriggerType): TemplateVariable[] {
	return getVariablesForTrigger(triggerType).filter((v) => !v.userInput);
}

/**
 * Check if a variable name is valid for a trigger type
 */
export function isValidVariable(triggerType: TriggerType, variableName: string): boolean {
	return getVariablesForTrigger(triggerType).some((v) => v.name === variableName);
}

/**
 * Get example data for all variables of a trigger type
 */
export function getExampleData(triggerType: TriggerType): Record<string, string> {
	const variables = getVariablesForTrigger(triggerType);
	return Object.fromEntries(variables.map((v) => [v.name, v.example]));
}

/**
 * Format variable name for display ({{variable_name}})
 */
export function formatVariableName(variableName: string): string {
	return `{{${variableName}}}`;
}

/**
 * Extract variable name from placeholder ({{variable_name}} -> variable_name)
 */
export function extractVariableName(placeholder: string): string {
	return placeholder.replace(/\{\{|\}\}/g, '').trim();
}
