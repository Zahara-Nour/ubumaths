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
		imagePath: '/src/lib/assets/images/vips-cards/bonus1@0.5x.jpg',
		category: 'bonus',
		rarity: 'common'
	},
	{
		id: 'super-bonus',
		name: 'Super Bonus',
		description: '+7 points bonus sur un devoir au choix',
		imagePath: '/src/lib/assets/images/vips-cards/super-bonus1@0.5x.jpg',
		category: 'bonus',
		rarity: 'rare'
	},
	{
		id: 'mega-bonus',
		name: 'Méga Bonus',
		description: '+10 points bonus sur un devoir au choix',
		imagePath: '/src/lib/assets/images/vips-cards/mega-bonus1@0.5x.jpg',
		category: 'bonus',
		rarity: 'epic'
	},
	{
		id: 'coup-double',
		name: 'Coup Double',
		description: 'Double les points gagnés sur un exercice',
		imagePath: '/src/lib/assets/images/vips-cards/coup-double1@0.5x.jpg',
		category: 'bonus',
		rarity: 'rare'
	},
	{
		id: 'choix',
		name: 'Choix de Place',
		description: 'Choisis ta place en classe pour une semaine',
		imagePath: '/src/lib/assets/images/vips-cards/choix1@0.5x.jpg',
		category: 'privilege',
		rarity: 'common'
	},
	{
		id: 'bougeotte',
		name: 'Bougeotte',
		description: 'Droit de te lever et bouger pendant 5 minutes',
		imagePath: '/src/lib/assets/images/vips-cards/bougeotte1@0.5x.jpg',
		category: 'privilege',
		rarity: 'common'
	},
	{
		id: 'super-bougeotte',
		name: 'Super Bougeotte',
		description: 'Déplacement libre en classe pendant un cours',
		imagePath: '/src/lib/assets/images/vips-cards/super-bougeotte1@0.5x.jpg',
		category: 'privilege',
		rarity: 'rare'
	},
	{
		id: 'tranquilou',
		name: 'Tranquilou',
		description: 'Repos exceptionnel - pas d\'interrogation surprise',
		imagePath: '/src/lib/assets/images/vips-cards/tranquilou1@0.5x.jpg',
		category: 'privilege',
		rarity: 'rare'
	},
	{
		id: 'throne',
		name: 'Trône',
		description: 'Siège royal spécial pour une journée',
		imagePath: '/src/lib/assets/images/vips-cards/throne1@0.5x.jpg',
		category: 'privilege',
		rarity: 'epic'
	},
	{
		id: 'candy',
		name: 'Candy',
		description: 'Bonbon surprise offert par le professeur',
		imagePath: '/src/lib/assets/images/vips-cards/candy1@0.5x.jpg',
		category: 'privilege',
		rarity: 'common'
	},
	{
		id: 'jeu',
		name: 'Temps de Jeu',
		description: 'Joue pendant 5 minutes en classe',
		imagePath: '/src/lib/assets/images/vips-cards/jeu1@0.5x.jpg',
		category: 'privilege',
		rarity: 'common'
	},
	{
		id: 'lalala',
		name: 'Lalala',
		description: 'Écoute de la musique pendant un travail individuel',
		imagePath: '/src/lib/assets/images/vips-cards/lalala1@0.5x.jpg',
		category: 'privilege',
		rarity: 'rare'
	},
	{
		id: 'captain',
		name: 'Capitaine',
		description: 'Devient capitaine d\'équipe pour un projet',
		imagePath: '/src/lib/assets/images/vips-cards/captain1@0.5x.jpg',
		category: 'social',
		rarity: 'common'
	},
	{
		id: 'team',
		name: 'Team Builder',
		description: 'Forme ton équipe pour un travail de groupe',
		imagePath: '/src/lib/assets/images/vips-cards/team1@0.5x.jpg',
		category: 'social',
		rarity: 'rare'
	},
	{
		id: 'fame',
		name: 'Célébrité',
		description: 'Ta photo sur le tableau d\'honneur',
		imagePath: '/src/lib/assets/images/vips-cards/fame1@0.5x.jpg',
		category: 'social',
		rarity: 'epic'
	},
	{
		id: 'help',
		name: 'Aide Précieuse',
		description: 'Aide du professeur pendant un test (1 question)',
		imagePath: '/src/lib/assets/images/vips-cards/help1@0.5x.jpg',
		category: 'power',
		rarity: 'rare'
	},
	{
		id: 'memoire',
		name: 'Mémoire',
		description: 'Antisèche autorisée (format carte) pour un contrôle',
		imagePath: '/src/lib/assets/images/vips-cards/memoire1@0.5x.jpg',
		category: 'power',
		rarity: 'epic'
	},
	{
		id: 'mathemagie',
		name: 'Mathémagie',
		description: 'Carte joker - saute un exercice difficile',
		imagePath: '/src/lib/assets/images/vips-cards/mathemagie1@0.5x.jpg',
		category: 'power',
		rarity: 'rare'
	},
	{
		id: 'alchimie',
		name: 'Alchimie',
		description: 'Transforme une mauvaise note (améliore de 2 points)',
		imagePath: '/src/lib/assets/images/vips-cards/alchimie1@0.5x.jpg',
		category: 'power',
		rarity: 'epic'
	},
	{
		id: 'ecrabouilleur',
		name: 'Écrabouilleur',
		description: 'Annule une punition mineure',
		imagePath: '/src/lib/assets/images/vips-cards/ecrabouilleur1@0.5x.jpg',
		category: 'power',
		rarity: 'rare'
	},
	{
		id: 'inventeur',
		name: 'Inventeur',
		description: 'Propose une activité créative pour la classe',
		imagePath: '/src/lib/assets/images/vips-cards/inventeur1@0.5x.jpg',
		category: 'power',
		rarity: 'rare'
	},
	{
		id: 'batman',
		name: 'Batman',
		description: 'Superhéros du jour - assistance spéciale du prof',
		imagePath: '/src/lib/assets/images/vips-cards/batman1@0.5x.jpg',
		category: 'power',
		rarity: 'epic'
	},
	{
		id: 'soldes',
		name: 'Soldes',
		description: 'Réduction de 2 gidouilles sur le prochain achat',
		imagePath: '/src/lib/assets/images/vips-cards/soldes1@0.5x.jpg',
		category: 'bonus',
		rarity: 'common'
	},
	{
		id: 'mega-soldes',
		name: 'Méga Soldes',
		description: 'Réduction de 5 gidouilles sur le prochain achat',
		imagePath: '/src/lib/assets/images/vips-cards/mega-soldes1@0.5x.jpg',
		category: 'bonus',
		rarity: 'rare'
	},
	{
		id: 'fortune',
		name: 'Roue de la Fortune',
		description: 'Tire au sort un privilège mystère',
		imagePath: '/src/lib/assets/images/vips-cards/fortune1@0.5x.jpg',
		category: 'power',
		rarity: 'legendary'
	},
	{
		id: 'Sheikh',
		name: 'Sheikh',
		description: 'Privilège royal au choix - décide avec le professeur',
		imagePath: '/src/lib/assets/images/vips-cards/Sheikh1@0.5x.jpg',
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
