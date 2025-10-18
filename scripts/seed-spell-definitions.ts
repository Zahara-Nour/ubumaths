// Seed initial spell definitions
// Author: Claude Code
// Date: 2025-10-15

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
	process.env.PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Spell definitions (20 starter spells across 4 elements)
const spellDefinitions = [
	// Fire spells (1-5)
	{ num: 1, element: 'fire', type: 'attack', basePower: 30, name: 'Boule de Feu' },
	{ num: 2, element: 'fire', type: 'attack', basePower: 50, name: 'Lance-flammes' },
	{ num: 3, element: 'fire', type: 'attack', basePower: 70, name: 'Météorite' },
	{ num: 4, element: 'fire', type: 'attack', basePower: 90, name: 'Explosion Solaire' },
	{ num: 5, element: 'fire', type: 'attack', basePower: 120, name: 'Tempête de Feu' },

	// Water spells (6-10)
	{ num: 6, element: 'water', type: 'attack', basePower: 30, name: "Jet d'Eau" },
	{ num: 7, element: 'water', type: 'attack', basePower: 50, name: 'Vague' },
	{ num: 8, element: 'water', type: 'heal', basePower: 40, name: 'Soin Aquatique' },
	{ num: 9, element: 'water', type: 'attack', basePower: 70, name: 'Tsunami' },
	{ num: 10, element: 'water', type: 'attack', basePower: 90, name: 'Torrent' },

	// Earth spells (11-15)
	{ num: 11, element: 'earth', type: 'attack', basePower: 35, name: 'Rocher' },
	{ num: 12, element: 'earth', type: 'attack', basePower: 55, name: 'Tremblement de Terre' },
	{ num: 13, element: 'earth', type: 'attack', basePower: 75, name: 'Éboulement' },
	{ num: 14, element: 'earth', type: 'heal', basePower: 50, name: 'Régénération Terrestre' },
	{ num: 15, element: 'earth', type: 'attack', basePower: 100, name: 'Fissure' },

	// Wind spells (16-20)
	{ num: 16, element: 'wind', type: 'attack', basePower: 25, name: 'Rafale' },
	{ num: 17, element: 'wind', type: 'attack', basePower: 45, name: 'Tornade' },
	{ num: 18, element: 'wind', type: 'attack', basePower: 65, name: 'Cyclone' },
	{ num: 19, element: 'wind', type: 'heal', basePower: 35, name: 'Brise Curative' },
	{ num: 20, element: 'wind', type: 'attack', basePower: 85, name: 'Ouragan' }
];

async function seedSpells() {
	console.log('='.repeat(60));
	console.log('Seeding Spell Definitions');
	console.log('='.repeat(60));

	// This script creates spell definitions as a reference
	// In the actual game, spells are unlocked per-user in the game_spells table

	console.log(`\nDefined ${spellDefinitions.length} spell types:\n`);

	spellDefinitions.forEach((spell) => {
		console.log(
			`  ${spell.num}. ${spell.name} (${spell.element}) - ${spell.type} - Power: ${spell.basePower}`
		);
	});

	console.log('\n' + '='.repeat(60));
	console.log('Spell definitions ready!');
	console.log('These will be used when creating game_spells for players.');
	console.log('='.repeat(60));

	// Optionally, we can create a helper function to unlock starter spells for a player
	console.log('\nTo unlock starter spells for a player, use:');
	console.log('  unlockStarterSpells(userId)');
}

/**
 * Unlock starter spells (1-5 from each element) for a player
 */
export async function unlockStarterSpells(userId: string) {
	const starterSpells = spellDefinitions.slice(0, 10); // First 10 spells

	const spellsToInsert = starterSpells.map((spell) => ({
		user_id: userId,
		spell_num: spell.num,
		level: 1,
		element: spell.element,
		power: spell.basePower,
		type: spell.type
	}));

	const { error } = await supabase.from('game_spells').insert(spellsToInsert);

	if (error) {
		console.error('Failed to unlock starter spells:', error);
	} else {
		console.log(`✓ Unlocked ${starterSpells.length} starter spells for user ${userId}`);
	}
}

// Export spell data for use in the app
export { spellDefinitions };

// Run seed if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
	seedSpells().catch(console.error);
}
