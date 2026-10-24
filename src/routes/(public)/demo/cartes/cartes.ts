/**
 * Les quatre cartes de la vitrine `/demo/cartes`, une par rareté.
 *
 * Écrites dans le code, images copiées dans `static/images/demo-cartes/` : la
 * page ne lit ni la base ni le stockage, un visiteur la voit sans compte
 * (chantier demo-debug, PR 6c). Textes repris du catalogue de la prod.
 */
import type { VipCard } from '$lib/types/vip-card';

export const DEMO_CARDS: VipCard[] = [
	{
		id: 'coup-double',
		name: 'Coup Double',
		description: 'Choisis une évaluation qui comptera 2 fois dans ta moyenne ce trimestre.',
		imagePath: '/images/demo-cartes/coup-double.webp',
		category: 'bonus',
		rarity: 'legendary'
	},
	{
		id: 'super-bonus',
		name: 'Super Bonus',
		description: '+2 sur un devoir au choix',
		imagePath: '/images/demo-cartes/super-bonus.webp',
		category: 'bonus',
		rarity: 'epic'
	},
	{
		id: 'throne',
		name: 'Game of throne',
		description: 'Prends le fauteuil du prof',
		imagePath: '/images/demo-cartes/throne.webp',
		category: 'privilege',
		rarity: 'rare'
	},
	{
		id: 'batman',
		name: 'Batman and Robin',
		description: 'Deviens le super-assistant du prof',
		imagePath: '/images/demo-cartes/batman.webp',
		category: 'privilege',
		rarity: 'common'
	}
];
