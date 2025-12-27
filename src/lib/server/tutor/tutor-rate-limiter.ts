/**
 * Rate Limiter pour le Tuteur IA (Père Ubu)
 *
 * SECURITE : Prévient l'abus de l'API Groq et contrôle les coûts
 *
 * FONCTIONNALITES :
 * - Limite par exercice : 15 messages max par exercice
 * - Limite horaire : 30 messages max par heure par utilisateur
 * - Limite quotidienne : 100 messages max par jour par utilisateur
 * - Base de données Supabase (pas de Redis)
 * - Messages de feedback avec le style du Père Ubu
 * - Compteurs restants pour l'UI
 * - Fail-open en cas d'erreur base de données
 *
 * CONFIGURATION :
 * - Par exercice : 15 messages max (pas de fenêtre temporelle)
 * - Par heure : 30 messages sur 60 minutes
 * - Par jour : 100 messages sur 1440 minutes (24h)
 *
 * PATTERN D'UTILISATION :
 * ```typescript
 * // 1. Vérifier les limites avant de traiter le message
 * const rateLimit = await checkTutorRateLimit(userId, exerciseId);
 * if (!rateLimit.allowed) {
 *   return json({ error: rateLimit.message }, { status: 429 });
 * }
 *
 * // 2. Traiter le message avec l'API Groq
 * const response = await groqClient.chat.completions.create(...);
 *
 * // 3. Incrémenter les compteurs après succès
 * await incrementTutorUsage(userId, exerciseId);
 * ```
 *
 * CONTROLE DES COUTS :
 * - 100 messages/jour/utilisateur × 1000 utilisateurs = 100K messages/jour max
 * - À $0.002/message, coût max quotidien = $200
 * - Limite par exercice empêche le spam sur un seul problème
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { createLogger } from '$lib/utils/logger';
import { config } from 'dotenv';

// Charger les variables d'environnement
config();

const logger = createLogger('tutorRateLimiter');

// ============================================================================
// SERVICE ROLE CLIENT (SINGLETON POUR LE RATE LIMITING)
// ============================================================================

/**
 * Client service role singleton pour le rate limiting du tuteur
 *
 * Réutilise le même pattern que rateLimiter.ts :
 * - Singleton pour éviter l'épuisement du pool de connexions
 * - Service role pour contourner RLS (opération système)
 * - Stocké dans globalThis pour survivre aux rechargements HMR
 * - Pas de session ni de rafraîchissement auto (performances)
 *
 * SECURITE :
 * - La table rate_limits n'est jamais exposée au client
 * - Pas de données PII stockées (seulement des compteurs)
 * - Opération système serveur uniquement
 */
const globalForSupabase = globalThis as unknown as {
	supabaseTutorServiceRoleClient: SupabaseClient<Database> | undefined;
};

let tutorServiceRoleClientInstance: SupabaseClient<Database> | null =
	globalForSupabase.supabaseTutorServiceRoleClient || null;

function getTutorServiceRoleClient(): SupabaseClient<Database> {
	// Retourner l'instance existante si déjà créée
	if (tutorServiceRoleClientInstance) {
		return tutorServiceRoleClientInstance;
	}

	// Récupérer les variables d'environnement
	const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
	const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
		logger.error('Variables environnement Supabase manquantes pour tutor rate limiter', {
			hasUrl: !!SUPABASE_URL,
			hasKey: !!SERVICE_ROLE_KEY
		});
		throw new Error('Variables environnement Supabase manquantes pour tutor rate limiter');
	}

	// Créer et cacher la nouvelle instance
	tutorServiceRoleClientInstance = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});

	// Stocker dans globalThis pour persister entre les rechargements HMR
	globalForSupabase.supabaseTutorServiceRoleClient = tutorServiceRoleClientInstance;

	logger.trace('Tutor rate limiter service role client initialized');
	return tutorServiceRoleClientInstance;
}

// ============================================================================
// TYPES
// ============================================================================

/**
 * Configuration des limites pour le tuteur IA
 */
export interface TutorRateLimitConfig {
	/** Limite par exercice (pas de fenêtre temporelle) */
	perExercise: { max: number };
	/** Limite horaire (avec fenêtre en minutes) */
	perHour: { max: number; windowMinutes: number };
	/** Limite quotidienne (avec fenêtre en minutes) */
	perDay: { max: number; windowMinutes: number };
}

/**
 * Résultat de la vérification de rate limit pour le tuteur
 */
export interface TutorRateLimitResult {
	/** true si la requête est autorisée, false si limitée */
	allowed: boolean;
	/** Type de limite dépassée (null si allowed: true) */
	limitType: 'exercise' | 'hour' | 'day' | null;
	/** Message d'erreur en français avec le style du Père Ubu (si !allowed) */
	message?: string;
	/** Nombre d'utilisations restantes pour chaque limite (si allowed: true) */
	remaining?: {
		exercise: number | null; // null si pas d'exerciseId
		hour: number;
		day: number;
	};
}

// ============================================================================
// CONSTANTES DE CONFIGURATION
// ============================================================================

/**
 * Limites de rate pour le tuteur IA (Père Ubu)
 *
 * Ces limites équilibrent l'aide pédagogique et le contrôle des coûts :
 *
 * **Par Exercice (15 messages)** :
 * - Encourage l'autonomie de l'élève
 * - Empêche la dépendance excessive au tuteur
 * - Pas de fenêtre temporelle (reset uniquement sur nouvel exercice)
 *
 * **Par Heure (30 messages)** :
 * - Permet de travailler sur ~2-3 exercices par heure
 * - Fenêtre glissante de 60 minutes
 * - Empêche le spam en session
 *
 * **Par Jour (100 messages)** :
 * - Permet une utilisation intensive mais contrôlée
 * - Fenêtre glissante de 1440 minutes (24h)
 * - Protège contre les abus automatisés
 */
import {
	TUTOR_MAX_PER_EXERCISE,
	TUTOR_MAX_PER_HOUR,
	TUTOR_MAX_PER_DAY
} from '$lib/config/tutor-limits';

export const TUTOR_RATE_LIMITS: TutorRateLimitConfig = {
	perExercise: { max: TUTOR_MAX_PER_EXERCISE },
	perHour: { max: TUTOR_MAX_PER_HOUR, windowMinutes: 60 },
	perDay: { max: TUTOR_MAX_PER_DAY, windowMinutes: 1440 }
};

/**
 * Messages d'erreur avec le style caractéristique du Père Ubu
 *
 * Ces messages utilisent les expressions favorites d'Ubu :
 * - "Cornegidouille !" (étonnement, reproche)
 * - "Par ma chandelle verte !" (surprise, admiration)
 * - "Hornstrompe !" (colère, frustration)
 *
 * Le ton reste pédagogique et bienveillant malgré le vocabulaire coloré.
 */
export const TUTOR_LIMIT_MESSAGES = {
	exercise:
		"Cornegidouille ! Tu as utilisé beaucoup d'aide sur cet exercice. Essaie de le résoudre par toi-même ou demande à ton professeur.",
	hour: 'Par ma chandelle verte ! Tu travailles beaucoup ! Fais une petite pause et reviens dans quelques minutes.',
	day: "Hornstrompe ! Tu as atteint ta limite quotidienne d'aide. Le Père Ubu sera de retour demain !"
};

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

/**
 * Masque les informations sensibles dans les clés pour les logs
 *
 * Protection PII (Personally Identifiable Information) :
 * - UUID utilisateur : montre les 4 premiers caractères
 * - UUID exercice : montre les 4 premiers caractères
 *
 * @param key - Clé de rate limit contenant potentiellement des données sensibles
 * @returns Clé masquée sécurisée pour les logs
 *
 * @example
 * ```typescript
 * maskKey('tutor:exercise:123e4567-e89b-12d3-a456-426614174000')
 * // Returns: 'tutor:exercise:123e***'
 * ```
 */
function maskKey(key: string): string {
	const parts = key.split(':');
	const value = parts[parts.length - 1];

	// UUID - montrer les 4 premiers caractères
	return `${parts.slice(0, -1).join(':')}:${value.substring(0, 4)}***`;
}

// ============================================================================
// LOGIQUE DE RATE LIMITING
// ============================================================================

/**
 * Récupère le nombre d'utilisations actuelles pour une clé donnée
 *
 * Compte les entrées dans la table rate_limits qui :
 * - Correspondent à la clé exacte
 * - N'ont pas encore expiré (expires_at > NOW())
 *
 * **Cas Par Exercice** :
 * - Pas de fenêtre temporelle, donc compte TOUTES les entrées non expirées
 * - L'expiration est fixée à 7 jours (pour éviter accumulation infinie)
 *
 * **Cas Temporels (Heure/Jour)** :
 * - Fenêtre glissante basée sur expires_at
 * - Les anciennes entrées sont automatiquement exclues
 *
 * @param key - Clé unique du bucket de rate limit (ex: "tutor:hour:user-uuid")
 * @returns Nombre d'utilisations dans la fenêtre active (0 si erreur)
 */
async function getCurrentCount(key: string): Promise<number> {
	const supabase = getTutorServiceRoleClient();

	try {
		const { data, error } = await supabase
			.from('rate_limits')
			.select('count')
			.eq('key', key)
			.gte('expires_at', new Date().toISOString())
			.maybeSingle();

		if (error) {
			logger.error('Erreur récupération count rate limit tuteur:', error);
			return 0; // Fail open
		}

		return data?.count || 0;
	} catch (error) {
		logger.error('Exception récupération count rate limit tuteur:', error);
		return 0; // Fail open
	}
}

/**
 * Vérifie les limites de rate pour le tuteur IA
 *
 * Vérifie dans l'ordre :
 * 1. Limite par exercice (si exerciseId fourni)
 * 2. Limite horaire
 * 3. Limite quotidienne
 *
 * Retourne la PREMIERE limite dépassée ou allowed: true si toutes passent.
 *
 * **Stratégie Fail-Open** :
 * - En cas d'erreur base de données, retourne allowed: true
 * - Empêche un DoS causé par une panne de la BDD
 * - Les logs d'erreur permettent de détecter les problèmes
 *
 * **Compteurs Restants** :
 * - Si allowed: true, retourne le nombre restant pour chaque limite
 * - Utile pour afficher un feedback dans l'UI ("Il te reste 5 messages")
 * - exercise: null si pas d'exerciseId fourni
 *
 * @param userId - UUID de l'utilisateur authentifié
 * @param exerciseId - UUID de l'exercice (optionnel, pour limite par exercice)
 * @returns Résultat avec allowed, limitType, message et remaining
 *
 * @example Utilisation basique
 * ```typescript
 * const result = await checkTutorRateLimit(userId, exerciseId);
 * if (!result.allowed) {
 *   return json({ error: result.message }, { status: 429 });
 * }
 * // Afficher les compteurs restants
 * console.log(`Restant: ${result.remaining.exercise} messages sur cet exercice`);
 * ```
 *
 * @example Sans exerciceId (chatbot général)
 * ```typescript
 * const result = await checkTutorRateLimit(userId);
 * // result.remaining.exercise sera null
 * // Seules les limites hour et day sont vérifiées
 * ```
 */
export async function checkTutorRateLimit(
	userId: string,
	exerciseId?: string
): Promise<TutorRateLimitResult> {
	if (!userId) {
		logger.warn('User ID manquant pour rate limit check tuteur');
		return { allowed: true, limitType: null }; // Fail open
	}

	try {
		// 1. Vérifier limite par exercice (si exerciceId fourni)
		let exerciseCount: number | null = null;
		if (exerciseId) {
			const exerciseKey = `tutor:exercise:${userId}:${exerciseId}`;
			exerciseCount = await getCurrentCount(exerciseKey);

			if (exerciseCount >= TUTOR_RATE_LIMITS.perExercise.max) {
				logger.warn('Limite tuteur par exercice dépassée', {
					userId: maskKey(`user:${userId}`),
					exerciseId: maskKey(`exercise:${exerciseId}`),
					count: exerciseCount
				});
				return {
					allowed: false,
					limitType: 'exercise',
					message: TUTOR_LIMIT_MESSAGES.exercise
				};
			}
		}

		// 2. Vérifier limite horaire
		const hourKey = `tutor:hour:${userId}`;
		const hourCount = await getCurrentCount(hourKey);

		if (hourCount >= TUTOR_RATE_LIMITS.perHour.max) {
			logger.warn('Limite tuteur horaire dépassée', {
				userId: maskKey(`user:${userId}`),
				count: hourCount
			});
			return {
				allowed: false,
				limitType: 'hour',
				message: TUTOR_LIMIT_MESSAGES.hour
			};
		}

		// 3. Vérifier limite quotidienne
		const dayKey = `tutor:day:${userId}`;
		const dayCount = await getCurrentCount(dayKey);

		if (dayCount >= TUTOR_RATE_LIMITS.perDay.max) {
			logger.warn('Limite tuteur quotidienne dépassée', {
				userId: maskKey(`user:${userId}`),
				count: dayCount
			});
			return {
				allowed: false,
				limitType: 'day',
				message: TUTOR_LIMIT_MESSAGES.day
			};
		}

		// Toutes les limites sont OK - retourner les compteurs restants
		logger.trace('Rate limit tuteur OK', {
			userId: maskKey(`user:${userId}`),
			exerciseId: exerciseId ? maskKey(`exercise:${exerciseId}`) : null,
			remaining: {
				exercise: exerciseId ? TUTOR_RATE_LIMITS.perExercise.max - (exerciseCount || 0) : null,
				hour: TUTOR_RATE_LIMITS.perHour.max - hourCount,
				day: TUTOR_RATE_LIMITS.perDay.max - dayCount
			}
		});

		return {
			allowed: true,
			limitType: null,
			remaining: {
				exercise: exerciseId ? TUTOR_RATE_LIMITS.perExercise.max - (exerciseCount || 0) : null,
				hour: TUTOR_RATE_LIMITS.perHour.max - hourCount,
				day: TUTOR_RATE_LIMITS.perDay.max - dayCount
			}
		};
	} catch (error) {
		logger.error('Exception vérification rate limit tuteur:', error);
		return { allowed: true, limitType: null }; // Fail open
	}
}

/**
 * Récupère l'utilisation restante pour le tuteur IA
 *
 * Retourne le nombre de messages restants pour chaque type de limite.
 * Utile pour afficher un feedback proactif dans l'UI avant d'atteindre la limite.
 *
 * **Différence avec checkTutorRateLimit** :
 * - checkTutorRateLimit : Vérifie ET retourne les compteurs (si autorisé)
 * - getRemainingUsage : Retourne UNIQUEMENT les compteurs (pas de vérification)
 *
 * **Cas d'Usage** :
 * - Afficher "Il te reste 5 messages sur cet exercice" dans l'UI
 * - Montrer une barre de progression de l'utilisation
 * - Warning préventif quand proche de la limite
 *
 * @param userId - UUID de l'utilisateur authentifié
 * @param exerciseId - UUID de l'exercice (optionnel)
 * @returns Objet avec le nombre restant pour exercise, hour et day
 *
 * @example Afficher les compteurs dans l'UI
 * ```typescript
 * const remaining = await getRemainingUsage(userId, exerciseId);
 * return {
 *   exerciseMessagesLeft: remaining.exercise, // null si pas d'exerciceId
 *   hourMessagesLeft: remaining.hour,
 *   dayMessagesLeft: remaining.day
 * };
 * ```
 *
 * @example Warning préventif
 * ```typescript
 * const remaining = await getRemainingUsage(userId, exerciseId);
 * if (remaining.exercise !== null && remaining.exercise <= 3) {
 *   showWarning("Attention ! Il ne te reste que 3 messages sur cet exercice.");
 * }
 * ```
 */
export async function getRemainingUsage(
	userId: string,
	exerciseId?: string
): Promise<{
	exercise: number | null;
	hour: number;
	day: number;
}> {
	if (!userId) {
		logger.warn('User ID manquant pour getRemainingUsage tuteur');
		return {
			exercise: null,
			hour: TUTOR_RATE_LIMITS.perHour.max,
			day: TUTOR_RATE_LIMITS.perDay.max
		};
	}

	try {
		// Récupérer les counts actuels pour chaque limite
		let exerciseCount: number | null = null;
		if (exerciseId) {
			const exerciseKey = `tutor:exercise:${userId}:${exerciseId}`;
			exerciseCount = await getCurrentCount(exerciseKey);
		}

		const hourKey = `tutor:hour:${userId}`;
		const hourCount = await getCurrentCount(hourKey);

		const dayKey = `tutor:day:${userId}`;
		const dayCount = await getCurrentCount(dayKey);

		// Calculer les compteurs restants
		const remaining = {
			exercise: exerciseId ? Math.max(0, TUTOR_RATE_LIMITS.perExercise.max - exerciseCount!) : null,
			hour: Math.max(0, TUTOR_RATE_LIMITS.perHour.max - hourCount),
			day: Math.max(0, TUTOR_RATE_LIMITS.perDay.max - dayCount)
		};

		logger.trace('Usage restant tuteur récupéré', {
			userId: maskKey(`user:${userId}`),
			exerciseId: exerciseId ? maskKey(`exercise:${exerciseId}`) : null,
			remaining
		});

		return remaining;
	} catch (error) {
		logger.error('Exception getRemainingUsage tuteur:', error);
		// Fail open - retourner les limites max
		return {
			exercise: exerciseId ? TUTOR_RATE_LIMITS.perExercise.max : null,
			hour: TUTOR_RATE_LIMITS.perHour.max,
			day: TUTOR_RATE_LIMITS.perDay.max
		};
	}
}

/**
 * Incrémente les compteurs d'utilisation du tuteur après un message réussi
 *
 * **IMPORTANT : Appeler APRES le succès de l'API Groq**
 * - Ne pas incrémenter si l'API Groq échoue (erreur, timeout, etc.)
 * - Ne pas incrémenter si la validation du message échoue
 * - Incrémenter uniquement après avoir envoyé la réponse au client
 *
 * **Compteurs Incrémentés** :
 * - Si exerciseId : tutor:exercise:{userId}:{exerciseId} (expire dans 7 jours)
 * - Toujours : tutor:hour:{userId} (expire dans 60 minutes)
 * - Toujours : tutor:day:{userId} (expire dans 1440 minutes)
 *
 * **Gestion des Erreurs** :
 * - Fail-silent : Ne lance pas d'exception si l'insertion échoue
 * - Log l'erreur pour investigation
 * - Permet à la requête de continuer même si le rate limiting échoue
 *
 * @param userId - UUID de l'utilisateur authentifié
 * @param exerciseId - UUID de l'exercice (optionnel)
 * @returns Promise<void> (ne lance pas d'exception)
 *
 * @example Workflow complet
 * ```typescript
 * // 1. Vérifier les limites AVANT de traiter
 * const rateLimit = await checkTutorRateLimit(userId, exerciseId);
 * if (!rateLimit.allowed) {
 *   return json({ error: rateLimit.message }, { status: 429 });
 * }
 *
 * // 2. Traiter le message avec Groq
 * const response = await groqClient.chat.completions.create({
 *   messages: [{ role: 'user', content: userMessage }],
 *   model: 'llama-3.3-70b-versatile'
 * });
 *
 * // 3. Incrémenter APRES succès
 * await incrementTutorUsage(userId, exerciseId);
 *
 * // 4. Retourner la réponse
 * return json({ message: response.choices[0].message.content });
 * ```
 *
 * @example Gestion d'erreur API
 * ```typescript
 * try {
 *   const response = await groqClient.chat.completions.create(...);
 *   // Incrémenter seulement si succès
 *   await incrementTutorUsage(userId, exerciseId);
 *   return json({ message: response.choices[0].message.content });
 * } catch (error) {
 *   // Ne PAS incrémenter si erreur
 *   logger.error('Groq API error:', error);
 *   return json({ error: 'Erreur serveur' }, { status: 500 });
 * }
 * ```
 */
export async function incrementTutorUsage(userId: string, exerciseId?: string): Promise<void> {
	if (!userId) {
		logger.warn('User ID manquant pour incrementTutorUsage');
		return; // Fail silent
	}

	const supabase = getTutorServiceRoleClient();
	const now = new Date();

	try {
		// Helper to atomically increment a rate limit entry using RPC
		// This prevents TOCTOU race conditions by using a single atomic operation
		// Note: The function is defined in migration 20251227160535_atomic_rate_limit_increment.sql
		const incrementEntry = async (key: string, expiresAt: Date) => {
			// Type assertion needed until database types are regenerated after migration
			const { error } = await (supabase.rpc as CallableFunction)('increment_rate_limit', {
				p_key: key,
				p_expires_at: expiresAt.toISOString()
			});

			if (error) {
				logger.error('Erreur increment rate limit tuteur:', { key, error });
			}
		};

		// 1. Exercice (si fourni) - expire dans 7 jours
		if (exerciseId) {
			const exerciseKey = `tutor:exercise:${userId}:${exerciseId}`;
			const exerciseExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 jours
			await incrementEntry(exerciseKey, exerciseExpiry);
		}

		// 2. Heure - expire dans 60 minutes
		const hourKey = `tutor:hour:${userId}`;
		const hourExpiry = new Date(
			now.getTime() + TUTOR_RATE_LIMITS.perHour.windowMinutes * 60 * 1000
		);
		await incrementEntry(hourKey, hourExpiry);

		// 3. Jour - expire dans 1440 minutes (24h)
		const dayKey = `tutor:day:${userId}`;
		const dayExpiry = new Date(now.getTime() + TUTOR_RATE_LIMITS.perDay.windowMinutes * 60 * 1000);
		await incrementEntry(dayKey, dayExpiry);

		logger.trace('Compteurs tuteur incrémentés', {
			userId: maskKey(`user:${userId}`),
			exerciseId: exerciseId ? maskKey(`exercise:${exerciseId}`) : null
		});
	} catch (error) {
		logger.error('Exception incrementTutorUsage:', error);
		// Fail silent - ne pas bloquer la requête
	}
}
