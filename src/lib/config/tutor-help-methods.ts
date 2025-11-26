/**
 * Configuration des méthodes d'aide pédagogique pour le système de tutorat (Père Ubu)
 *
 * Ce fichier définit les 15 méthodes d'aide utilisées par le tuteur pour guider les élèves
 * sans donner directement les réponses. La sélection des méthodes suit un système hybride
 * combinant règles obligatoires, contexte mathématique, et progression pédagogique.
 */

import type { MathTopic } from './tutor-prompts';

/**
 * Définition d'une méthode d'aide pédagogique
 */
export interface HelpMethod {
	/** Identifiant unique de la méthode */
	id: string;
	/** Nom d'affichage en français */
	name: string;
	/** Description de quand utiliser cette méthode */
	description: string;
	/** Priorité de la méthode (1 = haute, 2 = moyenne, 3 = basse) */
	priority: 1 | 2 | 3;
	/** Sujets mathématiques où cette méthode est la plus efficace */
	applicableTopics: MathTopic[];
	/** Année scolaire minimale (1 = CP, 12 = Terminale) */
	minGradeYear: number;
	/** Année scolaire maximale (1 = CP, 12 = Terminale) */
	maxGradeYear: number;
}

/**
 * Contexte pour la sélection d'une méthode d'aide
 */
export interface HelpContext {
	/** Premier message de l'interaction */
	isFirstMessage: boolean;
	/** La dernière réponse était incorrecte */
	lastAnswerWasWrong: boolean;
	/** Niveau de frustration détecté (0-100) */
	frustrationLevel: number;
	/** Nombre d'échecs consécutifs */
	failureCount: number;
	/** Sujet mathématique actuel */
	topic?: MathTopic;
	/** Année scolaire de l'élève (1 = CP, 12 = Terminale) */
	schoolYear: number;
	/** Niveau d'aide actuel (0-7) */
	currentHelpLevel: number;
	/** Méthodes déjà utilisées dans cette session */
	previousMethodsUsed: string[];
}

/**
 * Les 15 méthodes d'aide pédagogique du système de tutorat
 */
export const HELP_METHODS: readonly HelpMethod[] = [
	{
		id: 'socratic',
		name: 'Questionnement Socratique',
		description: "Poser des questions ouvertes pour amener l'élève à réfléchir par lui-même",
		priority: 1,
		applicableTopics: ['proofs', 'logic', 'algebra', 'functions', 'calculus'],
		minGradeYear: 3,
		maxGradeYear: 12
	},
	{
		id: 'analogy',
		name: 'Analogies et Métaphores',
		description: 'Utiliser des comparaisons familières pour expliquer des concepts abstraits',
		priority: 2,
		applicableTopics: ['geometry', 'functions', 'algebra', 'calculus', 'statistics'],
		minGradeYear: 1,
		maxGradeYear: 12
	},
	{
		id: 'decomposition',
		name: 'Décomposition en Étapes',
		description: 'Diviser le problème complexe en sous-problèmes plus simples',
		priority: 1,
		applicableTopics: ['arithmetic', 'algebra', 'geometry', 'calculus', 'statistics'],
		minGradeYear: 1,
		maxGradeYear: 12
	},
	{
		id: 'worked_example',
		name: 'Exemple Similaire Résolu',
		description: 'Montrer un exercice similaire déjà résolu pour illustrer la méthode',
		priority: 3,
		applicableTopics: ['arithmetic', 'algebra', 'geometry', 'functions', 'calculus'],
		minGradeYear: 1,
		maxGradeYear: 12
	},
	{
		id: 'visual',
		name: 'Indice Visuel',
		description: 'Suggérer un schéma, graphique ou représentation visuelle',
		priority: 2,
		applicableTopics: ['geometry', 'functions', 'statistics', 'calculus', 'algebra'],
		minGradeYear: 1,
		maxGradeYear: 12
	},
	{
		id: 'error_analysis',
		name: "Analyse d'Erreur",
		description: 'Identifier et expliquer pourquoi une approche est incorrecte',
		priority: 1,
		applicableTopics: ['arithmetic', 'algebra', 'geometry', 'calculus', 'logic'],
		minGradeYear: 1,
		maxGradeYear: 12
	},
	{
		id: 'formula_reminder',
		name: 'Rappel de Formule',
		description: 'Rappeler une formule ou propriété mathématique pertinente',
		priority: 2,
		applicableTopics: ['algebra', 'geometry', 'calculus', 'statistics', 'functions'],
		minGradeYear: 3,
		maxGradeYear: 12
	},
	{
		id: 'real_world',
		name: 'Lien avec le Réel',
		description: 'Connecter le problème abstrait à une situation concrète du quotidien',
		priority: 2,
		applicableTopics: ['arithmetic', 'statistics', 'geometry', 'functions', 'algebra'],
		minGradeYear: 1,
		maxGradeYear: 12
	},
	{
		id: 'prerequisite',
		name: 'Vérification Prérequis',
		description: 'Vérifier la maîtrise des concepts nécessaires avant de continuer',
		priority: 2,
		applicableTopics: ['algebra', 'calculus', 'proofs', 'functions', 'geometry'],
		minGradeYear: 2,
		maxGradeYear: 12
	},
	{
		id: 'reformulation',
		name: 'Reformulation',
		description: 'Reformuler le problème avec des mots plus simples ou différents',
		priority: 2,
		applicableTopics: ['arithmetic', 'algebra', 'geometry', 'statistics', 'logic'],
		minGradeYear: 1,
		maxGradeYear: 12
	},
	{
		id: 'method_hint',
		name: 'Indice sur la Méthode',
		description: 'Suggérer quelle approche ou technique utiliser sans résoudre',
		priority: 2,
		applicableTopics: ['algebra', 'calculus', 'geometry', 'arithmetic', 'functions'],
		minGradeYear: 2,
		maxGradeYear: 12
	},
	{
		id: 'encouragement',
		name: 'Encouragement Ciblé',
		description: "Valoriser les efforts et renforcer la confiance de l'élève",
		priority: 1,
		applicableTopics: [
			'arithmetic',
			'algebra',
			'geometry',
			'calculus',
			'statistics',
			'functions',
			'proofs',
			'logic'
		],
		minGradeYear: 1,
		maxGradeYear: 12
	},
	{
		id: 'counter_example',
		name: 'Contre-Exemple',
		description: "Montrer un cas où l'approche de l'élève ne fonctionne pas",
		priority: 3,
		applicableTopics: ['proofs', 'logic', 'algebra', 'functions', 'calculus'],
		minGradeYear: 5,
		maxGradeYear: 12
	},
	{
		id: 'metacognitive',
		name: 'Question Métacognitive',
		description: "Amener l'élève à réfléchir sur sa propre démarche de pensée",
		priority: 3,
		applicableTopics: ['proofs', 'logic', 'algebra', 'calculus', 'functions'],
		minGradeYear: 6,
		maxGradeYear: 12
	},
	{
		id: 'scaffolded',
		name: 'Pratique Guidée',
		description: 'Guider pas à pas avec des questions très structurées',
		priority: 3,
		applicableTopics: ['arithmetic', 'algebra', 'geometry', 'calculus', 'statistics'],
		minGradeYear: 1,
		maxGradeYear: 12
	}
] as const;

/**
 * Règles de sélection hybride des méthodes d'aide
 */
export const HELP_SELECTION_RULES = {
	/**
	 * Règles obligatoires (toujours appliquées en priorité)
	 */
	mandatory: {
		/** Première interaction avec l'élève */
		firstMessage: 'socratic' as const,
		/** Après une réponse incorrecte */
		afterWrongAnswer: 'error_analysis' as const,
		/** Frustration détectée (score > 70) */
		frustrationDetected: 'encouragement' as const,
		/** Échec répété (3+ tentatives infructueuses) */
		repeatedFailure: 'worked_example' as const
	},

	/**
	 * Règles par type de sujet mathématique
	 */
	byTopic: {
		geometry: ['visual', 'decomposition', 'analogy'] as const,
		algebra: ['decomposition', 'worked_example', 'reformulation'] as const,
		arithmetic: ['real_world', 'decomposition', 'scaffolded'] as const,
		functions: ['visual', 'decomposition', 'analogy'] as const,
		proofs: ['socratic', 'prerequisite', 'metacognitive'] as const,
		statistics: ['real_world', 'visual', 'decomposition'] as const,
		calculus: ['decomposition', 'visual', 'formula_reminder'] as const,
		logic: ['socratic', 'counter_example', 'reformulation'] as const
	} as Record<MathTopic, readonly string[]>,

	/**
	 * Règles par niveau d'aide progressif (0-7)
	 */
	byHelpLevel: {
		/** Niveau 0 : Aide subtile et indirecte */
		0: ['socratic', 'reformulation'] as const,
		/** Niveau 1 : Support accru */
		1: ['analogy', 'decomposition'] as const,
		/** Niveau 2 : Indices plus directs */
		2: ['method_hint', 'formula_reminder'] as const,
		/** Niveau 3 : Aide concrète */
		3: ['visual', 'real_world'] as const,
		/** Niveau 4 : Très explicite */
		4: ['worked_example', 'prerequisite'] as const,
		/** Niveau 5 : Support intensif */
		5: ['scaffolded', 'counter_example'] as const,
		/** Niveau 6 : Réflexion métacognitive */
		6: ['metacognitive'] as const,
		/** Niveau 7 : Redirection vers le professeur */
		7: 'redirect_to_teacher' as const
	} as Record<number, readonly string[] | string>
} as const;

/**
 * Récupère une méthode d'aide par son identifiant
 */
export function getHelpMethodById(id: string): HelpMethod | undefined {
	return HELP_METHODS.find((method) => method.id === id);
}

/**
 * Récupère les méthodes applicables à un sujet mathématique donné
 * Triées par priorité (1 = haute, 3 = basse)
 */
export function getMethodsForTopic(topic: MathTopic): HelpMethod[] {
	return HELP_METHODS.filter((method) => method.applicableTopics.includes(topic)).sort(
		(a, b) => a.priority - b.priority
	);
}

/**
 * Récupère les méthodes appropriées pour une année scolaire donnée
 * Triées par priorité (1 = haute, 3 = basse)
 */
export function getMethodsForGrade(schoolYear: number): HelpMethod[] {
	return HELP_METHODS.filter(
		(method) => schoolYear >= method.minGradeYear && schoolYear <= method.maxGradeYear
	).sort((a, b) => a.priority - b.priority);
}

/**
 * Sélectionne la méthode d'aide la plus appropriée selon le contexte
 *
 * Logique de sélection hybride :
 * 1. Règles obligatoires (mandatory) - priorité absolue
 * 2. Règles par niveau d'aide (byHelpLevel) - structure progressive
 * 3. Règles par sujet (byTopic) - contexte mathématique
 * 4. Filtrage par année scolaire et méthodes déjà utilisées
 *
 * @param context - Contexte actuel de l'interaction
 * @returns Identifiant de la méthode sélectionnée
 */
export function selectHelpMethod(context: HelpContext): string {
	// 1. Règles obligatoires (priorité absolue)
	if (context.isFirstMessage) {
		return HELP_SELECTION_RULES.mandatory.firstMessage;
	}

	if (context.frustrationLevel > 70) {
		return HELP_SELECTION_RULES.mandatory.frustrationDetected;
	}

	if (context.failureCount >= 3) {
		return HELP_SELECTION_RULES.mandatory.repeatedFailure;
	}

	if (context.lastAnswerWasWrong && context.failureCount < 3) {
		return HELP_SELECTION_RULES.mandatory.afterWrongAnswer;
	}

	// 2. Niveau d'aide maximum atteint - redirection
	if (context.currentHelpLevel >= 7) {
		return 'redirect_to_teacher';
	}

	// 3. Sélection basée sur le niveau d'aide
	const levelMethods = HELP_SELECTION_RULES.byHelpLevel[context.currentHelpLevel];

	if (typeof levelMethods === 'string') {
		return levelMethods;
	}

	// 4. Combiner avec les méthodes recommandées pour le sujet
	let candidateMethods = [...levelMethods];

	if (context.topic) {
		const topicMethods = HELP_SELECTION_RULES.byTopic[context.topic];
		if (topicMethods) {
			// Privilégier les méthodes qui apparaissent dans les deux listes
			const intersection = candidateMethods.filter((method) => topicMethods.includes(method));
			if (intersection.length > 0) {
				candidateMethods = intersection;
			} else {
				// Sinon, combiner les deux listes
				candidateMethods = [...candidateMethods, ...topicMethods];
			}
		}
	}

	// 5. Filtrer par année scolaire
	candidateMethods = candidateMethods.filter((methodId) => {
		const method = getHelpMethodById(methodId);
		return (
			method &&
			context.schoolYear >= method.minGradeYear &&
			context.schoolYear <= method.maxGradeYear
		);
	});

	// 6. Exclure les méthodes déjà utilisées (variété pédagogique)
	let availableMethods = candidateMethods.filter(
		(methodId) => !context.previousMethodsUsed.includes(methodId)
	);

	// Si toutes ont été utilisées, réinitialiser
	if (availableMethods.length === 0) {
		availableMethods = candidateMethods;
	}

	// 7. Sélectionner la méthode avec la plus haute priorité
	if (availableMethods.length > 0) {
		const methodsWithPriority = availableMethods
			.map((id) => ({ id, method: getHelpMethodById(id) }))
			.filter((item): item is { id: string; method: HelpMethod } => item.method !== undefined)
			.sort((a, b) => a.method.priority - b.method.priority);

		return methodsWithPriority[0].id;
	}

	// Fallback : questionnement socratique (méthode universelle)
	return 'socratic';
}
