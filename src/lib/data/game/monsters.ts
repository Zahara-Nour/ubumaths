// Monster data registry
// Maps monster types to their visual assets and metadata
// Author: Claude Code
// Date: 2025-10-15

export type MonsterElement = 'fire' | 'water' | 'earth' | 'wind';
export type MonsterCategory = 'common' | 'elite' | 'legendary';

export interface MonsterTemplate {
	id: string;
	name: string;
	element: MonsterElement;
	category: MonsterCategory;
	imgBasename: string; // Base filename without extension (e.g., 'dragon', 'cobra')
}

/**
 * Monster templates organized by element and category
 * Used to generate random monsters with appropriate visuals
 */
export const MONSTER_TEMPLATES: Record<MonsterElement, Record<MonsterCategory, MonsterTemplate[]>> = {
	fire: {
		common: [
			{ id: 'fire_scorpion', name: 'Scorpion', element: 'fire', category: 'common', imgBasename: 'scorpion' },
			{ id: 'fire_cobra', name: 'Cobra', element: 'fire', category: 'common', imgBasename: 'cobra' },
			{ id: 'fire_vipere', name: 'Vipère', element: 'fire', category: 'common', imgBasename: 'vipere' },
			{ id: 'fire_veuve_noire', name: 'Veuve Noire', element: 'fire', category: 'common', imgBasename: 'veuve_noire' },
			{ id: 'fire_dard_mortel', name: 'Dard Mortel', element: 'fire', category: 'common', imgBasename: 'dard_mortel' }
		],
		elite: [
			{ id: 'fire_lion', name: 'Lion', element: 'fire', category: 'elite', imgBasename: 'lion' },
			{ id: 'fire_tigre', name: 'Tigre', element: 'fire', category: 'elite', imgBasename: 'tigre' },
			{ id: 'fire_jaguar', name: 'Jaguar', element: 'fire', category: 'elite', imgBasename: 'jaguar' },
			{ id: 'fire_fureur_des_pics', name: 'Fureur des Pics', element: 'fire', category: 'elite', imgBasename: 'fureur_des_pics' }
		],
		legendary: [
			{ id: 'fire_dragon', name: 'Dragon de Feu', element: 'fire', category: 'legendary', imgBasename: 'dragon' },
			{ id: 'fire_minotaure', name: 'Minotaure', element: 'fire', category: 'legendary', imgBasename: 'minotaure' }
		]
	},
	water: {
		common: [
			{ id: 'water_sangsue', name: 'Sangsue', element: 'water', category: 'common', imgBasename: 'sangsue' },
			{ id: 'water_dendrobate', name: 'Dendrobate', element: 'water', category: 'common', imgBasename: 'dendrobate' },
			{ id: 'water_couleuvre', name: 'Couleuvre', element: 'water', category: 'common', imgBasename: 'couleuvre' },
			{ id: 'water_iguane', name: 'Iguane', element: 'water', category: 'common', imgBasename: 'iguane' },
			{ id: 'water_varan', name: 'Varan', element: 'water', category: 'common', imgBasename: 'varan' }
		],
		elite: [
			{ id: 'water_boa', name: 'Boa', element: 'water', category: 'elite', imgBasename: 'boa' },
			{ id: 'water_anaconda', name: 'Anaconda', element: 'water', category: 'elite', imgBasename: 'anaconda' },
			{ id: 'water_alligator', name: 'Alligator', element: 'water', category: 'elite', imgBasename: 'alligator' },
			{ id: 'water_gavial', name: 'Gavial', element: 'water', category: 'elite', imgBasename: 'gavial' },
			{ id: 'water_rage_des_marais', name: 'Rage des Marais', element: 'water', category: 'elite', imgBasename: 'rage_des_marais' }
		],
		legendary: [
			{ id: 'water_hydre', name: 'Hydre', element: 'water', category: 'legendary', imgBasename: 'hydre' },
			{ id: 'water_hippopotame', name: 'Hippopotame', element: 'water', category: 'legendary', imgBasename: 'hippopotame' }
		]
	},
	earth: {
		common: [
			{ id: 'earth_sanglier', name: 'Sanglier', element: 'earth', category: 'common', imgBasename: 'sanglier' },
			{ id: 'earth_loup', name: 'Loup', element: 'earth', category: 'common', imgBasename: 'loup' },
			{ id: 'earth_lynx', name: 'Lynx', element: 'earth', category: 'common', imgBasename: 'lynx' },
			{ id: 'earth_puma', name: 'Puma', element: 'earth', category: 'common', imgBasename: 'puma' },
			{ id: 'earth_vautour', name: 'Vautour', element: 'earth', category: 'common', imgBasename: 'vautour' }
		],
		elite: [
			{ id: 'earth_ours_brun', name: 'Ours Brun', element: 'earth', category: 'elite', imgBasename: 'ours_brun' },
			{ id: 'earth_grizzly', name: 'Grizzly', element: 'earth', category: 'elite', imgBasename: 'grizzly' },
			{ id: 'earth_gorille', name: 'Gorille', element: 'earth', category: 'elite', imgBasename: 'gorille' },
			{ id: 'earth_brute_des_plaines', name: 'Brute des Plaines', element: 'earth', category: 'elite', imgBasename: 'brute_des_plaines' }
		],
		legendary: [
			{ id: 'earth_cyclope', name: 'Cyclope', element: 'earth', category: 'legendary', imgBasename: 'cyclope' },
			{ id: 'earth_devoreur', name: 'Dévoreur', element: 'earth', category: 'legendary', imgBasename: 'devoreur' }
		]
	},
	wind: {
		common: [
			{ id: 'wind_chauve_souris', name: 'Chauve-Souris', element: 'wind', category: 'common', imgBasename: 'chauve_souris' },
			{ id: 'wind_vautour', name: 'Vautour', element: 'wind', category: 'common', imgBasename: 'vautour' },
			{ id: 'wind_aigle', name: 'Aigle', element: 'wind', category: 'common', imgBasename: 'aigle' }
		],
		elite: [
			{ id: 'wind_terreur_ailee', name: 'Terreur Ailée', element: 'wind', category: 'elite', imgBasename: 'terreur_ailee' },
			{ id: 'wind_coureur_du_vent', name: 'Coureur du Vent', element: 'wind', category: 'elite', imgBasename: 'coureur_du_vent' },
			{ id: 'wind_harpie', name: 'Harpie', element: 'wind', category: 'elite', imgBasename: 'harpie' }
		],
		legendary: [
			{ id: 'wind_griffon', name: 'Griffon', element: 'wind', category: 'legendary', imgBasename: 'griffon' }
		]
	}
};

/**
 * Get a random monster template for given element and category
 */
export function getRandomMonsterTemplate(element: MonsterElement, category: MonsterCategory): MonsterTemplate {
	const templates = MONSTER_TEMPLATES[element][category];
	return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Get all monster templates for an element (all categories)
 */
export function getMonsterTemplatesByElement(element: MonsterElement): MonsterTemplate[] {
	return [
		...MONSTER_TEMPLATES[element].common,
		...MONSTER_TEMPLATES[element].elite,
		...MONSTER_TEMPLATES[element].legendary
	];
}

/**
 * Get monster image paths from template
 */
export function getMonsterImagePaths(template: MonsterTemplate) {
	return {
		img_url: `${template.imgBasename}.png`,
		img_head_url: `${template.imgBasename}_tete.png`
	};
}
