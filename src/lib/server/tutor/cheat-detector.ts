/**
 * Système de détection des tentatives d'obtenir directement les réponses
 *
 * Détecte les demandes directes de réponses et fournit des réponses polies
 * dans le style du Père Ubu pour rediriger vers l'apprentissage.
 *
 * Approche simple basée sur des patterns (pas de ML nécessaire).
 */

/**
 * Résultat de la détection de tentative de triche
 */
export interface CheatDetectionResult {
	/** Si une tentative de triche a été détectée */
	isCheatAttempt: boolean;
	/** Niveau de confiance de la détection */
	confidence: 'low' | 'medium' | 'high';
	/** Pattern qui a matché (pour debug/logs) */
	detectedPattern: string | null;
	/** Réponse suggérée à utiliser */
	suggestedResponse: string | null;
}

/**
 * Patterns de détection des demandes directes de réponses
 *
 * Organisés par niveau de confiance :
 * - high: Demandes explicites et sans ambiguïté
 * - medium: Demandes indirectes mais claires
 * - low: Potentiellement légitimes mais suspects
 */
export const DIRECT_ANSWER_PATTERNS: Array<{
	pattern: RegExp;
	confidence: 'low' | 'medium' | 'high';
}> = [
	// High confidence - explicit requests
	{ pattern: /donne[- ]?moi (?:la |le )?r[eé](?:ponse|sultat)/i, confidence: 'high' },
	{ pattern: /quelle? est (?:la |le )?r[eé](?:ponse|sultat)/i, confidence: 'high' },
	{ pattern: /dis[- ]?moi (?:la |le )?r[eé](?:ponse|sultat)/i, confidence: 'high' },
	{ pattern: /c['']?est quoi (?:la |le )?r[eé](?:ponse|sultat)/i, confidence: 'high' },
	{ pattern: /r[eé]ponds? [àa] ma place/i, confidence: 'high' },
	{ pattern: /fais[- ]?(?:le|la|les?) (?:pour|[àa]) moi/i, confidence: 'high' },
	{ pattern: /r[eé]sous?[- ]?(?:le|la|les?)/i, confidence: 'high' },
	{ pattern: /donne[- ]?moi (?:directement )?(?:juste )?la solution/i, confidence: 'high' },
	{
		pattern: /tu peux (?:juste )?(?:me )?donner (?:la |le )?r[eé](?:ponse|sultat)/i,
		confidence: 'high'
	},
	{ pattern: /balance[- ]?moi (?:la |le )?r[eé](?:ponse|sultat)/i, confidence: 'high' },
	{ pattern: /file[- ]?moi (?:la |le )?r[eé](?:ponse|sultat)/i, confidence: 'high' },

	// Medium confidence - indirect requests
	{ pattern: /je veux (?:juste )?(?:la |le )?r[eé](?:ponse|sultat)/i, confidence: 'medium' },
	{ pattern: /j['']?ai besoin (?:de )?(?:la |le )?r[eé](?:ponse|sultat)/i, confidence: 'medium' },
	{
		pattern: /peux[- ]?tu (?:me )?donner (?:la |le )?r[eé](?:ponse|sultat)/i,
		confidence: 'medium'
	},
	{
		pattern:
			/(?:juste |simplement )?(?:la |le )?r[eé](?:ponse|sultat),? (?:s['']?il te pla[îi]t|stp)/i,
		confidence: 'medium'
	},
	{ pattern: /montre[- ]?moi (?:la |le )?r[eé](?:ponse|sultat)/i, confidence: 'medium' },
	{ pattern: /(?:la |le )?r[eé](?:ponse|sultat),? (?:c['']?est quoi|stp)/i, confidence: 'medium' },
	{
		pattern:
			/tu (?:me |peux m[e'])?aider [àa] (?:trouver|avoir) (?:la |le )?r[eé](?:ponse|sultat)/i,
		confidence: 'medium'
	},
	{ pattern: /(?:juste |simplement )(?:donne|dis)[- ]?moi/i, confidence: 'medium' },

	// Low confidence - might be legitimate
	{ pattern: /aide[- ]?moi [àa] trouver (?:la |le )?r[eé](?:ponse|sultat)/i, confidence: 'low' },
	{ pattern: /je (?:ne )?comprends? (?:pas|rien)/i, confidence: 'low' },
	{ pattern: /je suis? (?:perdu|bloqu[eé]|coinc[eé])/i, confidence: 'low' },
	{ pattern: /je (?:ne )?sais? pas (?:quoi |comment )?faire/i, confidence: 'low' }
];

/**
 * Réponses polies de refus dans le style du Père Ubu
 *
 * Ces réponses :
 * - Refusent gentiment de donner la réponse directe
 * - Redirigent vers l'apprentissage
 * - Posent des questions pour engager la réflexion
 * - Utilisent le vocabulaire pataphysique du Père Ubu
 */
export const POLITE_REFUSAL_RESPONSES: string[] = [
	"Cornegidouille ! Le Père Ubu ne donne jamais les réponses tout cuit ! Mais je peux t'aider à réfléchir... Dis-moi, qu'as-tu déjà essayé ?",
	"Par ma chandelle verte ! Si je te donnais la réponse, tu n'apprendrais rien ! Allez, montre-moi ton raisonnement...",
	"Hornstrompe ! Un vrai mathématicien pataphysique trouve les réponses lui-même ! Je vais te poser une question pour t'aider...",
	"Mille millions de milliards ! La réponse est dans ta tête, pas dans la mienne ! Qu'est-ce que tu as compris jusqu'ici ?",
	"Tudieu ! Je préfère t'aider à comprendre plutôt que de te servir la solution sur un plateau d'argent ! Quel est le premier pas selon toi ?",
	'Merdre ! Si je te donnais la réponse, ce ne serait plus ta victoire ! Dis-moi plutôt ce qui te bloque...',
	"Par ma gidouille ! Les mathématiques, ça se mérite ! Quelle partie de l'exercice te pose problème ?",
	"Sapristi ! Le Père Ubu n'est pas une calculatrice ! Mais il peut t'aider à comprendre... Par quoi veux-tu commencer ?",
	"Cornemuse ! La gloire des mathématiques, c'est de trouver soi-même ! Montre-moi ce que tu as déjà fait...",
	"Bougrelas ! Un bon élève pataphysique réfléchit avant de demander ! Qu'est-ce qui te fait hésiter dans cette question ?",
	"Palsambleu ! Si je faisais tout à ta place, tu ne progresserais jamais ! Explique-moi ta démarche jusqu'ici...",
	"Jarnicoton ! Les réponses toutes faites, c'est pour les robots ! Toi, tu es capable de réfléchir ! Qu'as-tu compris du problème ?"
];

/**
 * Nettoie et normalise un message pour la détection de patterns
 *
 * @param message - Message à normaliser
 * @returns Message normalisé (lowercase, accents simplifiés, espaces normalisés)
 */
export function sanitizeForPatternMatching(message: string): string {
	return message
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '') // Remove diacritics
		.replace(/\s+/g, ' ') // Normalize spaces
		.trim();
}

/**
 * Détecte si le message contient une tentative d'obtenir directement la réponse
 *
 * @param message - Message de l'élève à analyser
 * @returns Résultat de la détection avec niveau de confiance et réponse suggérée
 */
export function detectCheatAttempt(message: string): CheatDetectionResult {
	const sanitized = sanitizeForPatternMatching(message);

	let highestConfidence: 'low' | 'medium' | 'high' | null = null;
	let matchedPattern: string | null = null;

	// Check all patterns and keep highest confidence match
	for (const { pattern, confidence } of DIRECT_ANSWER_PATTERNS) {
		if (pattern.test(sanitized)) {
			// Priority: high > medium > low
			if (
				!highestConfidence ||
				confidence === 'high' ||
				(confidence === 'medium' && highestConfidence === 'low')
			) {
				highestConfidence = confidence;
				matchedPattern = pattern.source;
			}
		}
	}

	if (!highestConfidence) {
		return {
			isCheatAttempt: false,
			confidence: 'low',
			detectedPattern: null,
			suggestedResponse: null
		};
	}

	return {
		isCheatAttempt: true,
		confidence: highestConfidence,
		detectedPattern: matchedPattern,
		suggestedResponse: getRandomRefusal()
	};
}

/**
 * Retourne une réponse de refus aléatoire
 *
 * @returns Une réponse polie dans le style du Père Ubu
 */
export function getRandomRefusal(): string {
	const randomIndex = Math.floor(Math.random() * POLITE_REFUSAL_RESPONSES.length);
	return POLITE_REFUSAL_RESPONSES[randomIndex];
}

/**
 * Vérifie si le message contient des indicateurs d'apprentissage légitime
 *
 * Ces indicateurs suggèrent que l'élève essaie vraiment de comprendre :
 * - Montre son travail
 * - Pose des questions spécifiques
 * - Exprime une confusion sur un concept (pas juste "donne-moi la réponse")
 *
 * @param message - Message à analyser
 * @returns true si le message semble être une demande d'aide légitime
 */
export function isLegitimateHelpRequest(message: string): boolean {
	const sanitized = sanitizeForPatternMatching(message);

	// Indicators of legitimate learning
	const legitimatePatterns = [
		// Shows work
		/j['']?ai essaye/i,
		/j['']?ai fait/i,
		/j['']?ai trouve/i,
		/mon calcul/i,
		/ma demarche/i,
		/mon raisonnement/i,
		/voici (?:ce que|comment)/i,
		/je pense que/i,

		// Asks specific questions
		/pourquoi/i,
		/comment (?:on |dois[- ]je |faire |calculer)/i,
		/qu['']?est[- ]ce que (?:c['']?est|ca veut dire)/i,
		/quelle (?:est la )?(?:difference|formule|methode)/i,
		/est[- ]ce que (?:je dois|c['']?est)/i,

		// Expresses confusion about concept
		/je ne comprends? pas (?:pourquoi|comment|la notion|le concept)/i,
		/(?:la notion|le concept|cette partie) me (?:pose probleme|bloque)/i,
		/peux[- ]tu (?:m['']?)?expliquer/i,
		/qu['']?est[- ]ce que ca veut dire/i,

		// Shows partial understanding
		/si je comprends? bien/i,
		/donc (?:si |c['']?est)/i,
		/ca veut dire que/i,
		/en gros/i,

		// Shows engagement
		/est[- ]ce que c['']?est (?:juste|correct|bon)/i,
		/ai[- ]je (?:raison|bon|juste)/i,
		/est[- ]ce que mon calcul/i
	];

	return legitimatePatterns.some((pattern) => pattern.test(sanitized));
}

/**
 * Analyse complète d'un message pour déterminer l'action recommandée
 *
 * Combine la détection de triche et la vérification de légitimité pour
 * fournir une recommandation d'action.
 *
 * @param message - Message de l'élève à analyser
 * @returns Analyse complète avec recommandation
 */
export function analyzeMessage(message: string): {
	isCheatAttempt: CheatDetectionResult;
	isLegitimate: boolean;
	recommendation: 'allow' | 'refuse' | 'gentle_redirect';
} {
	const cheatDetection = detectCheatAttempt(message);
	const legitimate = isLegitimateHelpRequest(message);

	// Decision logic
	let recommendation: 'allow' | 'refuse' | 'gentle_redirect';

	if (legitimate) {
		// Legitimate request - allow even if pattern matched
		recommendation = 'allow';
	} else if (cheatDetection.isCheatAttempt && cheatDetection.confidence === 'high') {
		// Clear cheat attempt - refuse politely
		recommendation = 'refuse';
	} else if (cheatDetection.isCheatAttempt && cheatDetection.confidence === 'medium') {
		// Possible cheat - gentle redirect
		recommendation = 'gentle_redirect';
	} else {
		// Low confidence or no detection - allow
		recommendation = 'allow';
	}

	return {
		isCheatAttempt: cheatDetection,
		isLegitimate: legitimate,
		recommendation
	};
}
