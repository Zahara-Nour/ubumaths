/**
 * Tutor Grade Adaptations Configuration
 * Adapts Père Ubu's responses based on student grade level (CP to Terminale)
 */

import type { GradeCode } from '$lib/types/grades';
import { GRADES } from '$lib/types/grades';

/**
 * Niveaux de langue utilisés par le tuteur
 */
export type LanguageLevel = 'simple' | 'intermediate' | 'advanced' | 'academic';

/**
 * Niveaux de notation mathématique
 */
export type MathNotationLevel = 'basic' | 'intermediate' | 'advanced';

/**
 * Styles d'encouragement adaptés à l'âge
 */
export type EncouragementStyle = 'playful' | 'supportive' | 'respectful';

/**
 * Configuration d'adaptation pour un niveau scolaire
 */
export interface GradeAdaptation {
	/** Code du niveau scolaire */
	gradeCode: GradeCode;

	/** Niveau de langue à utiliser */
	languageLevel: LanguageLevel;

	/** Complexité maximale des phrases (1 = très simple, 5 = très complexe) */
	maxSentenceComplexity: number;

	/** Utiliser des emojis dans les réponses */
	useEmoji: boolean;

	/** Autoriser les concepts abstraits */
	allowAbstractConcepts: boolean;

	/** Types d'exemples préférés pour les explications */
	preferredExampleTypes: string[];

	/** Niveau de notation mathématique */
	mathNotationLevel: MathNotationLevel;

	/** Style d'encouragement */
	encouragementStyle: EncouragementStyle;

	/** Longueur maximale de réponse en caractères */
	responseMaxLength: number;

	/** Mots/concepts à éviter */
	vocabularyConstraints: string[];
}

/**
 * Adaptations par niveau scolaire
 */
export const GRADE_ADAPTATIONS: Record<GradeCode, GradeAdaptation> = {
	// === PRIMAIRE (CP-CM2) ===

	CP: {
		gradeCode: 'CP',
		languageLevel: 'simple',
		maxSentenceComplexity: 1,
		useEmoji: true,
		allowAbstractConcepts: false,
		preferredExampleTypes: ['bonbons', 'jouets', 'animaux', 'fruits', 'jeux'],
		mathNotationLevel: 'basic',
		encouragementStyle: 'playful',
		responseMaxLength: 250,
		vocabularyConstraints: [
			'fonction',
			'variable',
			'équation',
			'démonstration',
			'théorème',
			'axiome',
			'ensemble',
			'intervalle',
			'coefficient'
		]
	},

	CE1: {
		gradeCode: 'CE1',
		languageLevel: 'simple',
		maxSentenceComplexity: 1,
		useEmoji: true,
		allowAbstractConcepts: false,
		preferredExampleTypes: ['jeux', 'bonbons', 'animaux', 'jouets', 'dessins'],
		mathNotationLevel: 'basic',
		encouragementStyle: 'playful',
		responseMaxLength: 300,
		vocabularyConstraints: [
			'fonction',
			'variable',
			'équation',
			'démonstration',
			'théorème',
			'axiome',
			'ensemble',
			'intervalle'
		]
	},

	CE2: {
		gradeCode: 'CE2',
		languageLevel: 'simple',
		maxSentenceComplexity: 2,
		useEmoji: true,
		allowAbstractConcepts: false,
		preferredExampleTypes: ['jeux', 'sport', 'animaux', 'nourriture', 'argent de poche'],
		mathNotationLevel: 'basic',
		encouragementStyle: 'playful',
		responseMaxLength: 350,
		vocabularyConstraints: [
			'fonction',
			'variable',
			'démonstration',
			'théorème',
			'axiome',
			'ensemble',
			'intervalle'
		]
	},

	CM1: {
		gradeCode: 'CM1',
		languageLevel: 'simple',
		maxSentenceComplexity: 2,
		useEmoji: true,
		allowAbstractConcepts: false,
		preferredExampleTypes: ['sport', 'jeux vidéo', 'recettes', 'argent', 'distances'],
		mathNotationLevel: 'basic',
		encouragementStyle: 'playful',
		responseMaxLength: 400,
		vocabularyConstraints: [
			'démonstration',
			'théorème',
			'axiome',
			'ensemble',
			'intervalle',
			'vecteur'
		]
	},

	CM2: {
		gradeCode: 'CM2',
		languageLevel: 'simple',
		maxSentenceComplexity: 2,
		useEmoji: true,
		allowAbstractConcepts: false,
		preferredExampleTypes: ['sport', 'jeux vidéo', 'technologie', 'argent', 'voyages'],
		mathNotationLevel: 'basic',
		encouragementStyle: 'playful',
		responseMaxLength: 450,
		vocabularyConstraints: ['démonstration', 'théorème', 'axiome', 'vecteur', 'matrice']
	},

	// === COLLÈGE (6ème-3ème) ===

	'6': {
		gradeCode: '6',
		languageLevel: 'intermediate',
		maxSentenceComplexity: 3,
		useEmoji: true,
		allowAbstractConcepts: false,
		preferredExampleTypes: ['sport', 'musique', 'jeux vidéo', 'réseaux sociaux', 'shopping'],
		mathNotationLevel: 'intermediate',
		encouragementStyle: 'supportive',
		responseMaxLength: 500,
		vocabularyConstraints: ['théorème', 'axiome', 'démonstration rigoureuse', 'matrice']
	},

	'5': {
		gradeCode: '5',
		languageLevel: 'intermediate',
		maxSentenceComplexity: 3,
		useEmoji: true,
		allowAbstractConcepts: false,
		preferredExampleTypes: ['sport', 'musique', 'films', 'technologie', 'voyages'],
		mathNotationLevel: 'intermediate',
		encouragementStyle: 'supportive',
		responseMaxLength: 550,
		vocabularyConstraints: ['axiome', 'démonstration formelle', 'matrice', 'dérivée']
	},

	'4': {
		gradeCode: '4',
		languageLevel: 'intermediate',
		maxSentenceComplexity: 3,
		useEmoji: true,
		allowAbstractConcepts: true,
		preferredExampleTypes: ['technologie', 'sport', 'films', 'science', 'économie'],
		mathNotationLevel: 'intermediate',
		encouragementStyle: 'supportive',
		responseMaxLength: 600,
		vocabularyConstraints: ['axiome', 'matrice', 'dérivée', 'intégrale']
	},

	'3': {
		gradeCode: '3',
		languageLevel: 'intermediate',
		maxSentenceComplexity: 4,
		useEmoji: false,
		allowAbstractConcepts: true,
		preferredExampleTypes: ['technologie', 'science', 'ingénierie', 'économie', 'sport'],
		mathNotationLevel: 'intermediate',
		encouragementStyle: 'supportive',
		responseMaxLength: 650,
		vocabularyConstraints: ['axiome', 'matrice', 'dérivée partielle', 'intégrale']
	},

	// === LYCÉE (2nde-Terminale) ===

	'2': {
		gradeCode: '2',
		languageLevel: 'advanced',
		maxSentenceComplexity: 4,
		useEmoji: false,
		allowAbstractConcepts: true,
		preferredExampleTypes: ['science', 'technologie', 'ingénierie', 'économie', 'physique'],
		mathNotationLevel: 'advanced',
		encouragementStyle: 'respectful',
		responseMaxLength: 700,
		vocabularyConstraints: ['axiome', 'topologie']
	},

	// Filière générale

	'1_GEN': {
		gradeCode: '1_GEN',
		languageLevel: 'advanced',
		maxSentenceComplexity: 4,
		useEmoji: false,
		allowAbstractConcepts: true,
		preferredExampleTypes: ['science', 'ingénierie', 'économie', 'statistiques', 'physique'],
		mathNotationLevel: 'advanced',
		encouragementStyle: 'respectful',
		responseMaxLength: 750,
		vocabularyConstraints: ['topologie', 'analyse complexe']
	},

	T_GEN: {
		gradeCode: 'T_GEN',
		languageLevel: 'advanced',
		maxSentenceComplexity: 5,
		useEmoji: false,
		allowAbstractConcepts: true,
		preferredExampleTypes: [
			'science',
			'recherche',
			'économie',
			'statistiques',
			'applications réelles'
		],
		mathNotationLevel: 'advanced',
		encouragementStyle: 'respectful',
		responseMaxLength: 800,
		vocabularyConstraints: ['topologie', 'analyse complexe']
	},

	// Spécialité maths

	'1_SPE': {
		gradeCode: '1_SPE',
		languageLevel: 'advanced',
		maxSentenceComplexity: 5,
		useEmoji: false,
		allowAbstractConcepts: true,
		preferredExampleTypes: ['physique', 'ingénierie', 'informatique', 'recherche', 'modélisation'],
		mathNotationLevel: 'advanced',
		encouragementStyle: 'respectful',
		responseMaxLength: 850,
		vocabularyConstraints: ['topologie']
	},

	T_SPE: {
		gradeCode: 'T_SPE',
		languageLevel: 'academic',
		maxSentenceComplexity: 5,
		useEmoji: false,
		allowAbstractConcepts: true,
		preferredExampleTypes: [
			'physique avancée',
			'ingénierie',
			'informatique',
			'recherche',
			'démonstrations'
		],
		mathNotationLevel: 'advanced',
		encouragementStyle: 'respectful',
		responseMaxLength: 900,
		vocabularyConstraints: []
	},

	T_EXP: {
		gradeCode: 'T_EXP',
		languageLevel: 'academic',
		maxSentenceComplexity: 5,
		useEmoji: false,
		allowAbstractConcepts: true,
		preferredExampleTypes: [
			'mathématiques pures',
			'recherche',
			'démonstrations',
			'théorie',
			'abstractions'
		],
		mathNotationLevel: 'advanced',
		encouragementStyle: 'respectful',
		responseMaxLength: 1000,
		vocabularyConstraints: []
	},

	T_COMP: {
		gradeCode: 'T_COMP',
		languageLevel: 'advanced',
		maxSentenceComplexity: 4,
		useEmoji: false,
		allowAbstractConcepts: true,
		preferredExampleTypes: [
			'économie',
			'statistiques',
			'sciences sociales',
			'gestion',
			'probabilités'
		],
		mathNotationLevel: 'advanced',
		encouragementStyle: 'respectful',
		responseMaxLength: 750,
		vocabularyConstraints: ['topologie', 'analyse complexe']
	},

	// Filière STMG

	'1_STMG': {
		gradeCode: '1_STMG',
		languageLevel: 'intermediate',
		maxSentenceComplexity: 3,
		useEmoji: false,
		allowAbstractConcepts: false,
		preferredExampleTypes: ['économie', 'gestion', 'commerce', 'statistiques', 'finances'],
		mathNotationLevel: 'intermediate',
		encouragementStyle: 'supportive',
		responseMaxLength: 600,
		vocabularyConstraints: ['théorème', 'démonstration', 'dérivée', 'intégrale', 'matrice']
	},

	T_STMG: {
		gradeCode: 'T_STMG',
		languageLevel: 'intermediate',
		maxSentenceComplexity: 3,
		useEmoji: false,
		allowAbstractConcepts: false,
		preferredExampleTypes: ['économie', 'gestion', 'marketing', 'statistiques', 'business'],
		mathNotationLevel: 'intermediate',
		encouragementStyle: 'supportive',
		responseMaxLength: 650,
		vocabularyConstraints: ['théorème', 'démonstration', 'dérivée', 'intégrale', 'matrice']
	}
};

/**
 * Modificateurs de personnalité Père Ubu par niveau scolaire
 */
export const PERE_UBU_GRADE_MODIFIERS: Record<'primary' | 'middle' | 'high', string> = {
	primary:
		'Utilise un langage enfantin et des exclamations joyeuses. Fais des références à des jeux et des bonbons. Sois très encourageant et enthousiaste !',
	middle:
		'Garde ton caractère grotesque mais explique clairement. Utilise des références modernes que les ados comprennent (jeux vidéo, musique, films). Reste fun mais pédagogique.',
	high: 'Reste pataphysique mais sois plus précis mathématiquement. Tu peux faire des blagues plus subtiles et des références culturelles. Montre du respect pour leur niveau intellectuel.'
};

/**
 * Obtient l'adaptation pour un niveau scolaire donné
 */
export function getAdaptationForGrade(gradeCode: GradeCode): GradeAdaptation {
	return GRADE_ADAPTATIONS[gradeCode];
}

/**
 * Obtient l'adaptation pour une année scolaire donnée (1-12)
 */
export function getAdaptationForSchoolYear(schoolYear: number): GradeAdaptation {
	// Find the first grade with this school year
	const gradeCode = Object.values(GRADES).find((g) => g.schoolYear === schoolYear)?.code;

	if (!gradeCode) {
		// Default to CM2 for invalid school years
		return GRADE_ADAPTATIONS.CM2;
	}

	return GRADE_ADAPTATIONS[gradeCode];
}

/**
 * Détermine si un langage simple doit être utilisé
 */
export function shouldUseSimpleLanguage(gradeCode: GradeCode): boolean {
	const adaptation = getAdaptationForGrade(gradeCode);
	return adaptation.languageLevel === 'simple';
}

/**
 * Génère un prompt pour des exemples appropriés au niveau
 */
export function getExamplePrompt(gradeCode: GradeCode): string {
	const adaptation = getAdaptationForGrade(gradeCode);
	const gradeInfo = GRADES[gradeCode];

	const exampleTypes = adaptation.preferredExampleTypes.join(', ');

	let prompt = `Utilise des exemples concrets liés à : ${exampleTypes}. `;

	// Add emoji instruction
	if (adaptation.useEmoji) {
		prompt += 'Tu peux utiliser des emojis pour rendre tes explications plus vivantes. ';
	} else {
		prompt += "N'utilise pas d'emojis. ";
	}

	// Add complexity instruction
	if (adaptation.maxSentenceComplexity <= 2) {
		prompt += 'Fais des phrases courtes et simples. ';
	} else if (adaptation.maxSentenceComplexity === 3) {
		prompt += 'Utilise des phrases de longueur moyenne. ';
	} else {
		prompt += 'Tu peux faire des phrases plus élaborées. ';
	}

	// Add abstract concepts instruction
	if (!adaptation.allowAbstractConcepts) {
		prompt += 'Reste très concret, évite les concepts abstraits. ';
	}

	// Add vocabulary constraints
	if (adaptation.vocabularyConstraints.length > 0) {
		prompt += `Évite d'utiliser ces termes : ${adaptation.vocabularyConstraints.join(', ')}. `;
	}

	// Add math notation level
	if (adaptation.mathNotationLevel === 'basic') {
		prompt += 'Utilise une notation mathématique très simple. ';
	} else if (adaptation.mathNotationLevel === 'intermediate') {
		prompt += 'Tu peux utiliser une notation mathématique standard. ';
	} else {
		prompt += 'Tu peux utiliser une notation mathématique avancée. ';
	}

	// Add encouragement style
	if (adaptation.encouragementStyle === 'playful') {
		prompt += "Sois très enjoué et joueur dans tes encouragements. C'est un enfant ! ";
	} else if (adaptation.encouragementStyle === 'supportive') {
		prompt +=
			'Sois bienveillant et encourageant, adapté à un adolescent. Montre que tu crois en ses capacités. ';
	} else {
		prompt += "Sois respectueux et professionnel dans tes encouragements. C'est un jeune adulte. ";
	}

	// Add personality modifier based on school level
	const levelModifier = PERE_UBU_GRADE_MODIFIERS[gradeInfo.level];
	prompt += levelModifier;

	return prompt;
}

/**
 * Obtient le modificateur de personnalité pour un niveau scolaire
 */
export function getPersonalityModifier(gradeCode: GradeCode): string {
	const gradeInfo = GRADES[gradeCode];
	return PERE_UBU_GRADE_MODIFIERS[gradeInfo.level];
}

/**
 * Vérifie si les emojis doivent être utilisés pour un niveau
 */
export function shouldUseEmoji(gradeCode: GradeCode): boolean {
	return getAdaptationForGrade(gradeCode).useEmoji;
}

/**
 * Obtient la longueur maximale de réponse pour un niveau
 */
export function getMaxResponseLength(gradeCode: GradeCode): number {
	return getAdaptationForGrade(gradeCode).responseMaxLength;
}

/**
 * Obtient le niveau de complexité des phrases pour un niveau
 */
export function getSentenceComplexity(gradeCode: GradeCode): number {
	return getAdaptationForGrade(gradeCode).maxSentenceComplexity;
}

/**
 * Vérifie si les concepts abstraits sont autorisés pour un niveau
 */
export function allowAbstractConcepts(gradeCode: GradeCode): boolean {
	return getAdaptationForGrade(gradeCode).allowAbstractConcepts;
}
