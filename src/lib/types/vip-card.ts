// VIP Card Type Definitions
// =========================
// This file defines the structure and data for the VIP card reward system.

/**
 * Represents an instance of a VIP card owned by a student.
 * Each card can have multiple instances (student can collect duplicates).
 */
export interface VipCardInstance {
	cardId: string; // ID of the card definition
	earnedAt: string; // ISO timestamp when card was earned
	usedAt: string | null; // ISO timestamp when card was consumed, null if not used
}

/**
 * Category of VIP card privilege
 */
export type VipCardCategory =
	| 'bonus' // Bonus points and academic rewards
	| 'privilege' // Classroom privileges and special permissions
	| 'social' // Social and team-related perks
	| 'power'; // Special abilities and game-changers

/**
 * Definition of a VIP card type
 */
export interface VipCard {
	id: string; // Unique identifier (matches image filename without extension)
	name: string; // Display name in French
	description: string; // Description of the privilege in French
	imagePath: string; // Path to card front image
	category: VipCardCategory;
	rarity?: 'common' | 'rare' | 'epic' | 'legendary'; // For future weighted random selection
}

/**
 * Complete collection of all VIP cards available in the system.
 * These descriptions are inferred from card names and can be customized by teachers.
 */
export const VIP_CARDS: VipCard[] = [
	{
		id: 'bonus',
		name: 'Bonus',
		description: '+5 points bonus sur un devoir au choix',
		imagePath: '/images/vip-cards/bonus1@0.5x.jpg',
		category: 'bonus',
		rarity: 'common'
	},
	{
		id: 'super-bonus',
		name: 'Super Bonus',
		description: '+7 points bonus sur un devoir au choix',
		imagePath: '/images/vip-cards/super-bonus1@0.5x.jpg',
		category: 'bonus',
		rarity: 'rare'
	},
	{
		id: 'mega-bonus',
		name: 'Méga Bonus',
		description: '+10 points bonus sur un devoir au choix',
		imagePath: '/images/vip-cards/mega-bonus1@0.5x.jpg',
		category: 'bonus',
		rarity: 'epic'
	},
	{
		id: 'coup-double',
		name: 'Coup Double',
		description: 'Double les points gagnés sur un exercice',
		imagePath: '/images/vip-cards/coup-double1@0.5x.jpg',
		category: 'bonus',
		rarity: 'rare'
	},
	{
		id: 'choix',
		name: 'Choix de Place',
		description: 'Choisis ta place en classe pour une semaine',
		imagePath: '/images/vip-cards/choix1@0.5x.jpg',
		category: 'privilege',
		rarity: 'common'
	},
	{
		id: 'bougeotte',
		name: 'Bougeotte',
		description: 'Droit de te lever et bouger pendant 5 minutes',
		imagePath: '/images/vip-cards/bougeotte1@0.5x.jpg',
		category: 'privilege',
		rarity: 'common'
	},
	{
		id: 'super-bougeotte',
		name: 'Super Bougeotte',
		description: 'Déplacement libre en classe pendant un cours',
		imagePath: '/images/vip-cards/super-bougeotte1@0.5x.jpg',
		category: 'privilege',
		rarity: 'rare'
	},
	{
		id: 'tranquilou',
		name: 'Tranquilou',
		description: 'Repos exceptionnel - pas d\'interrogation surprise',
		imagePath: '/images/vip-cards/tranquilou1@0.5x.jpg',
		category: 'privilege',
		rarity: 'rare'
	},
	{
		id: 'throne',
		name: 'Trône',
		description: 'Siège royal spécial pour une journée',
		imagePath: '/images/vip-cards/throne1@0.5x.jpg',
		category: 'privilege',
		rarity: 'epic'
	},
	{
		id: 'candy',
		name: 'Candy',
		description: 'Bonbon surprise offert par le professeur',
		imagePath: '/images/vip-cards/candy1@0.5x.jpg',
		category: 'privilege',
		rarity: 'common'
	},
	{
		id: 'jeu',
		name: 'Temps de Jeu',
		description: 'Joue pendant 5 minutes en classe',
		imagePath: '/images/vip-cards/jeu1@0.5x.jpg',
		category: 'privilege',
		rarity: 'common'
	},
	{
		id: 'lalala',
		name: 'Lalala',
		description: 'Écoute de la musique pendant un travail individuel',
		imagePath: '/images/vip-cards/lalala1@0.5x.jpg',
		category: 'privilege',
		rarity: 'rare'
	},
	{
		id: 'captain',
		name: 'Capitaine',
		description: 'Devient capitaine d\'équipe pour un projet',
		imagePath: '/images/vip-cards/captain1@0.5x.jpg',
		category: 'social',
		rarity: 'common'
	},
	{
		id: 'team',
		name: 'Team Builder',
		description: 'Forme ton équipe pour un travail de groupe',
		imagePath: '/images/vip-cards/team1@0.5x.jpg',
		category: 'social',
		rarity: 'rare'
	},
	{
		id: 'fame',
		name: 'Célébrité',
		description: 'Ta photo sur le tableau d\'honneur',
		imagePath: '/images/vip-cards/fame1@0.5x.jpg',
		category: 'social',
		rarity: 'epic'
	},
	{
		id: 'help',
		name: 'Aide Précieuse',
		description: 'Aide du professeur pendant un test (1 question)',
		imagePath: '/images/vip-cards/help1@0.5x.jpg',
		category: 'power',
		rarity: 'rare'
	},
	{
		id: 'memoire',
		name: 'Mémoire',
		description: 'Antisèche autorisée (format carte) pour un contrôle',
		imagePath: '/images/vip-cards/memoire1@0.5x.jpg',
		category: 'power',
		rarity: 'epic'
	},
	{
		id: 'mathemagie',
		name: 'Mathémagie',
		description: 'Carte joker - saute un exercice difficile',
		imagePath: '/images/vip-cards/mathemagie1@0.5x.jpg',
		category: 'power',
		rarity: 'rare'
	},
	{
		id: 'alchimie',
		name: 'Alchimie',
		description: 'Transforme une mauvaise note (améliore de 2 points)',
		imagePath: '/images/vip-cards/alchimie1@0.5x.jpg',
		category: 'power',
		rarity: 'epic'
	},
	{
		id: 'ecrabouilleur',
		name: 'Écrabouilleur',
		description: 'Annule une punition mineure',
		imagePath: '/images/vip-cards/ecrabouilleur1@0.5x.jpg',
		category: 'power',
		rarity: 'rare'
	},
	{
		id: 'inventeur',
		name: 'Inventeur',
		description: 'Propose une activité créative pour la classe',
		imagePath: '/images/vip-cards/inventeur1@0.5x.jpg',
		category: 'power',
		rarity: 'rare'
	},
	{
		id: 'batman',
		name: 'Batman',
		description: 'Superhéros du jour - assistance spéciale du prof',
		imagePath: '/images/vip-cards/batman1@0.5x.jpg',
		category: 'power',
		rarity: 'epic'
	},
	{
		id: 'soldes',
		name: 'Soldes',
		description: 'Réduction de 2 gidouilles sur le prochain achat',
		imagePath: '/images/vip-cards/soldes1@0.5x.jpg',
		category: 'bonus',
		rarity: 'common'
	},
	{
		id: 'mega-soldes',
		name: 'Méga Soldes',
		description: 'Réduction de 5 gidouilles sur le prochain achat',
		imagePath: '/images/vip-cards/mega-soldes1@0.5x.jpg',
		category: 'bonus',
		rarity: 'rare'
	},
	{
		id: 'fortune',
		name: 'Roue de la Fortune',
		description: 'Tire au sort un privilège mystère',
		imagePath: '/images/vip-cards/fortune1@0.5x.jpg',
		category: 'power',
		rarity: 'legendary'
	},
	{
		id: 'Sheikh',
		name: 'Sheikh',
		description: 'Privilège royal au choix - décide avec le professeur',
		imagePath: '/images/vip-cards/Sheikh1@0.5x.jpg',
		category: 'power',
		rarity: 'legendary'
	}
];

/**
 * Get a VIP card definition by ID
 */
export function getVipCardById(id: string): VipCard | undefined {
	return VIP_CARDS.find((card) => card.id === id);
}

/**
 * Get all VIP cards by category
 */
export function getVipCardsByCategory(category: VipCardCategory): VipCard[] {
	return VIP_CARDS.filter((card) => card.category === category);
}

/**
 * Get total number of unique VIP cards available
 */
export function getTotalVipCards(): number {
	return VIP_CARDS.length;
}

/**
 * Type for student's VIP cards storage (JSONB in database)
 * Key: unique instance ID (UUID)
 * Value: VipCardInstance
 */
export type StudentVipCards = Record<string, VipCardInstance>;
