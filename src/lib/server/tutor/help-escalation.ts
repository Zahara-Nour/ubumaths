/**
 * Adaptive Help Escalation System
 *
 * Détermine le niveau d'aide à fournir aux élèves en fonction de leurs signaux d'effort.
 * Les élèves qui font plus d'efforts reçoivent une escalade plus patiente ;
 * ceux qui montrent peu d'effort reçoivent une escalade plus rapide pour éviter l'exploitation.
 */

/**
 * Signaux d'effort de l'élève extraits de la conversation
 */
export interface StudentEffortSignals {
	/** Longueur moyenne des réponses de l'élève */
	avgResponseLength: number;
	/** Temps moyen entre les messages (en secondes) */
	avgResponseTime: number;
	/** Ratio de messages contenant du contenu mathématique (0-1) */
	mathContentRatio: number;
	/** L'élève a-t-il posé une question de clarification ? */
	questionAsked: boolean;
	/** L'élève a-t-il montré son travail/raisonnement ? */
	showedWork: boolean;
	/** Nombre de tentatives au problème */
	attemptsCount: number;
}

/**
 * État de l'escalade de l'aide
 */
export interface HelpEscalationState {
	/** Niveau d'aide actuel (0-7) */
	currentLevel: number;
	/** Niveau maximum autorisé basé sur le score d'effort */
	maxAllowedLevel: number;
	/** Score d'effort (0-100) */
	effortScore: number;
	/** Historique des changements de niveau */
	escalationHistory: number[];
	/** Date de la dernière escalade */
	lastEscalation: Date | null;
	/** Nombre d'échecs consécutifs */
	consecutiveFailures: number;
}

/**
 * Descriptions des niveaux d'escalade
 */
export const ESCALATION_LEVEL_DESCRIPTIONS = {
	0: 'Aide minimale - Questions socratiques ouvertes',
	1: 'Aide légère - Indices subtils',
	2: 'Aide modérée - Décomposition en étapes',
	3: 'Aide substantielle - Exemples similaires',
	4: 'Aide importante - Aide visuelle/concrète',
	5: 'Aide maximale - Pratique guidée',
	6: 'Dernière tentative - Révision des prérequis',
	7: 'Redirection - Suggérer de demander au professeur'
} as const;

/**
 * Calcule le score d'effort basé sur les signaux de l'élève
 *
 * @param signals - Signaux d'effort extraits de la conversation
 * @returns Score d'effort (0-100)
 */
export function calculateEffortScore(signals: StudentEffortSignals): number {
	let score = 50; // Commence au milieu

	// Scoring basé sur la longueur des réponses
	if (signals.avgResponseLength > 100) {
		score += 15;
	} else if (signals.avgResponseLength > 50) {
		score += 8;
	} else if (signals.avgResponseLength < 20) {
		score -= 15;
	}

	// Scoring basé sur le temps de réponse (temps de réflexion)
	if (signals.avgResponseTime > 60) {
		score += 15; // Prend le temps de réfléchir
	} else if (signals.avgResponseTime > 30) {
		score += 8;
	} else if (signals.avgResponseTime < 10) {
		score -= 15; // Trop rapide, ne réfléchit pas
	}

	// Scoring basé sur le contenu mathématique
	if (signals.mathContentRatio > 0.5) {
		score += 15; // Montre son travail
	} else if (signals.mathContentRatio > 0.2) {
		score += 5;
	} else if (signals.mathContentRatio === 0) {
		score -= 10;
	}

	// Bonus pour l'engagement
	if (signals.questionAsked) {
		score += 10;
	}
	if (signals.showedWork) {
		score += 10;
	}

	// Pénalité pour tentatives minimales
	if (signals.attemptsCount === 0) {
		score -= 20;
	}

	return Math.max(0, Math.min(100, score));
}

/**
 * Détermine le niveau d'aide maximum autorisé basé sur le score d'effort
 *
 * @param effortScore - Score d'effort (0-100)
 * @returns Niveau maximum autorisé (3-7)
 */
export function determineMaxHelpLevel(effortScore: number): number {
	if (effortScore >= 80) return 7; // Très haut effort - patience totale
	if (effortScore >= 60) return 6; // Haut effort
	if (effortScore >= 40) return 5; // Effort modéré
	if (effortScore >= 25) return 4; // Effort faible
	return 3; // Effort minimal - escalade rapide
}

/**
 * Détermine si l'aide doit être escaladée
 *
 * @param state - État actuel de l'escalade
 * @param consecutiveFailures - Nombre d'échecs consécutifs
 * @param timeSinceLastEscalation - Temps depuis la dernière escalade (en secondes)
 * @returns true si l'escalade est nécessaire
 */
export function shouldEscalate(
	state: HelpEscalationState,
	consecutiveFailures: number,
	timeSinceLastEscalation: number
): boolean {
	// Ne jamais escalader au-delà du niveau maximum autorisé
	if (state.currentLevel >= state.maxAllowedLevel) {
		return false;
	}

	// Ne jamais escalader au-delà du niveau 7
	if (state.currentLevel >= 7) {
		return false;
	}

	// Escalader après 2 échecs consécutifs
	if (consecutiveFailures >= 2) {
		return true;
	}

	// Escalader après 3 minutes au même niveau sans progrès
	if (timeSinceLastEscalation >= 180) {
		return true;
	}

	return false;
}

/**
 * Escalade le niveau d'aide
 *
 * @param state - État actuel de l'escalade
 * @returns Nouvel état avec niveau incrémenté
 */
export function escalate(state: HelpEscalationState): HelpEscalationState {
	const newLevel = Math.min(state.currentLevel + 1, state.maxAllowedLevel, 7);

	return {
		...state,
		currentLevel: newLevel,
		escalationHistory: [...state.escalationHistory, newLevel],
		lastEscalation: new Date(),
		consecutiveFailures: 0 // Reset après escalade
	};
}

/**
 * Crée un état initial pour l'escalade
 *
 * @param effortScore - Score d'effort initial (optionnel)
 * @returns État initial de l'escalade
 */
export function createInitialState(effortScore?: number): HelpEscalationState {
	const score = effortScore ?? 50; // Score par défaut au milieu
	const maxLevel = determineMaxHelpLevel(score);

	return {
		currentLevel: 0,
		maxAllowedLevel: maxLevel,
		effortScore: score,
		escalationHistory: [0],
		lastEscalation: null,
		consecutiveFailures: 0
	};
}

/**
 * Détecte si un message contient du contenu mathématique
 *
 * @param message - Message à analyser
 * @returns true si le message contient du contenu mathématique
 */
export function detectMathContent(message: string): boolean {
	// Motifs LaTeX
	if (message.includes('$$') || message.includes('\\(') || message.includes('\\[')) {
		return true;
	}

	// Symboles mathématiques
	const mathSymbols = /[+\-*/=<>≤≥≠×÷√∑∫∂]/;
	if (mathSymbols.test(message)) {
		return true;
	}

	// Mots mathématiques en français
	const mathWords = [
		'nombre',
		'calcul',
		'résultat',
		'solution',
		'équation',
		'somme',
		'produit',
		'quotient',
		'différence',
		'fraction',
		'pourcentage',
		'aire',
		'périmètre',
		'volume',
		'angle',
		'théorème',
		'formule',
		'variable',
		'inconnue',
		'racine',
		'puissance',
		'carré',
		'cube'
	];

	const lowerMessage = message.toLowerCase();
	if (mathWords.some((word) => lowerMessage.includes(word))) {
		return true;
	}

	// Nombres avec opérations (ex: "2 + 3", "10 * 5")
	const numberWithOperation = /\d+\s*[+\-*/=]\s*\d+/;
	if (numberWithOperation.test(message)) {
		return true;
	}

	return false;
}

/**
 * Analyse les messages de l'élève pour calculer les signaux d'effort
 *
 * @param messages - Historique des messages de l'élève
 * @returns Signaux d'effort calculés
 */
export function analyzeStudentMessages(
	messages: Array<{ content: string; timestamp: number }>
): StudentEffortSignals {
	if (messages.length === 0) {
		return {
			avgResponseLength: 0,
			avgResponseTime: 0,
			mathContentRatio: 0,
			questionAsked: false,
			showedWork: false,
			attemptsCount: 0
		};
	}

	// Calcul de la longueur moyenne des réponses
	const totalLength = messages.reduce((sum, msg) => sum + msg.content.length, 0);
	const avgResponseLength = totalLength / messages.length;

	// Calcul du temps moyen entre les messages
	let totalTime = 0;
	let timeCount = 0;
	for (let i = 1; i < messages.length; i++) {
		const timeDiff = (messages[i].timestamp - messages[i - 1].timestamp) / 1000; // En secondes
		// Ignorer les délais très longs (> 10 minutes) qui indiquent probablement une pause
		if (timeDiff <= 600) {
			totalTime += timeDiff;
			timeCount++;
		}
	}
	const avgResponseTime = timeCount > 0 ? totalTime / timeCount : 0;

	// Calcul du ratio de contenu mathématique
	const messagesWithMath = messages.filter((msg) => detectMathContent(msg.content)).length;
	const mathContentRatio = messagesWithMath / messages.length;

	// Détection de questions posées
	const questionAsked = messages.some((msg) => msg.content.includes('?'));

	// Détection de travail montré (messages longs avec contenu mathématique)
	const showedWork = messages.some(
		(msg) => msg.content.length > 50 && detectMathContent(msg.content)
	);

	// Nombre de tentatives (messages avec contenu mathématique)
	const attemptsCount = messagesWithMath;

	return {
		avgResponseLength,
		avgResponseTime,
		mathContentRatio,
		questionAsked,
		showedWork,
		attemptsCount
	};
}
