/**
 * Evoland Game Constants
 *
 * Enums and constants matching the original Haxe source code.
 * Source: https://github.com/deepnight/evolern
 */

// ============================================================================
// TILE TYPES (from World.hx)
// ============================================================================

/**
 * Block types representing different tile kinds in the world.
 * Order matches the original Haxe enum for sprite sheet compatibility.
 */
export const Block = {
	Dark: 0,
	Field: 1,
	Tree: 2,
	Water: 3,
	BridgeUD: 4,
	BridgeLR: 5,
	Bush: 6,
	RiverBank: 7,
	Detail: 8,
	Rock: 9,
	SavePoint: 10,
	Sand: 11,
	SandBank: 12,
	SandDetail: 13,
	Cactus: 14,
	Door: 15,
	Dungeon: 16,
	DungeonSoil: 17,
	DungeonWall: 18,
	DungeonStat: 19,
	DungeonStairs: 20,
	DungeonFakeWall: 21,
	DungeonPuzzle: 22,
	MonsterGenerator: 23,
	FakeTree: 24,
	DungeonExit: 25,
	DarkDungeon: 26,
	Lock: 27,
	Free: 28,
	DungeonFakeDark: 29
} as const;

export type Block = (typeof Block)[keyof typeof Block];

/** Block names for debugging and display */
export const BLOCK_NAMES: Record<Block, string> = {
	[Block.Dark]: 'Dark',
	[Block.Field]: 'Field',
	[Block.Tree]: 'Tree',
	[Block.Water]: 'Water',
	[Block.BridgeUD]: 'BridgeUD',
	[Block.BridgeLR]: 'BridgeLR',
	[Block.Bush]: 'Bush',
	[Block.RiverBank]: 'RiverBank',
	[Block.Detail]: 'Detail',
	[Block.Rock]: 'Rock',
	[Block.SavePoint]: 'SavePoint',
	[Block.Sand]: 'Sand',
	[Block.SandBank]: 'SandBank',
	[Block.SandDetail]: 'SandDetail',
	[Block.Cactus]: 'Cactus',
	[Block.Door]: 'Door',
	[Block.Dungeon]: 'Dungeon',
	[Block.DungeonSoil]: 'DungeonSoil',
	[Block.DungeonWall]: 'DungeonWall',
	[Block.DungeonStat]: 'DungeonStat',
	[Block.DungeonStairs]: 'DungeonStairs',
	[Block.DungeonFakeWall]: 'DungeonFakeWall',
	[Block.DungeonPuzzle]: 'DungeonPuzzle',
	[Block.MonsterGenerator]: 'MonsterGenerator',
	[Block.FakeTree]: 'FakeTree',
	[Block.DungeonExit]: 'DungeonExit',
	[Block.DarkDungeon]: 'DarkDungeon',
	[Block.Lock]: 'Lock',
	[Block.Free]: 'Free',
	[Block.DungeonFakeDark]: 'DungeonFakeDark'
};

// ============================================================================
// ENTITY TYPES (from entities/*)
// ============================================================================

/**
 * Entity kind enumeration for all game entities.
 * Used to identify entity types in the rendering and logic systems.
 */
export const EKind = {
	NPC: 0,
	Chest: 1,
	Monster: 2,
	Sword: 3,
	SavePoint: 4,
	Cursor: 5,
	Hero: 6,
	HeroUp: 7,
	Bat: 8,
	Knight: 9,
	Fireball: 10
} as const;

export type EKind = (typeof EKind)[keyof typeof EKind];

/** Entity kind names for debugging */
export const EKIND_NAMES: Record<EKind, string> = {
	[EKind.NPC]: 'NPC',
	[EKind.Chest]: 'Chest',
	[EKind.Monster]: 'Monster',
	[EKind.Sword]: 'Sword',
	[EKind.SavePoint]: 'SavePoint',
	[EKind.Cursor]: 'Cursor',
	[EKind.Hero]: 'Hero',
	[EKind.HeroUp]: 'HeroUp',
	[EKind.Bat]: 'Bat',
	[EKind.Knight]: 'Knight',
	[EKind.Fireball]: 'Fireball'
};

// ============================================================================
// CHEST/PROGRESSION ITEMS (from Chests.hx)
// ============================================================================

/**
 * Chest content types representing progression unlocks.
 * Each chest unlocks a new game feature or mechanic.
 * Order matches original Haxe enum for save compatibility.
 */
export const ChestKind = {
	CLeftCtrl: 0,
	C2D: 1,
	CScroll: 2,
	CColor: 3,
	CMonsters: 4,
	CWeapon: 5,
	CZoom: 6,
	CAllowSave: 7,
	CWeb: 8,
	CNpc: 9,
	CGoldCoin: 10,
	CKey: 11,
	CFreeMove: 12,
	CDiablo: 13,
	CExit: 14,
	CPorn: 15,
	CSounds: 16,
	CMusic: 17,
	CTitleScreen: 18,
	CRightCtrl: 19,
	CPushBlock: 20,
	CDungeon: 21,
	CDungeonKills: 22,
	CPuzzle: 23,
	CLevelUp: 24,
	CFarming: 25,
	CPrincess: 26
} as const;

export type ChestKind = (typeof ChestKind)[keyof typeof ChestKind];

// ============================================================================
// DIRECTION
// ============================================================================

/**
 * Cardinal directions for entity movement and facing.
 */
export const Direction = {
	Up: 0,
	Down: 1,
	Left: 2,
	Right: 3
} as const;

export type Direction = (typeof Direction)[keyof typeof Direction];

/** Direction names for debugging */
export const DIRECTION_NAMES: Record<Direction, string> = {
	[Direction.Up]: 'Up',
	[Direction.Down]: 'Down',
	[Direction.Left]: 'Left',
	[Direction.Right]: 'Right'
};

/** Direction vectors for movement calculations */
export const DIRECTION_VECTORS: Record<Direction, { dx: number; dy: number }> = {
	[Direction.Up]: { dx: 0, dy: -1 },
	[Direction.Down]: { dx: 0, dy: 1 },
	[Direction.Left]: { dx: -1, dy: 0 },
	[Direction.Right]: { dx: 1, dy: 0 }
};

// ============================================================================
// GAME STATUS
// ============================================================================

/**
 * Game state machine states.
 */
export const GameStatus = {
	Title: 0,
	Playing: 1,
	Paused: 2,
	GameOver: 3,
	Victory: 4
} as const;

export type GameStatus = (typeof GameStatus)[keyof typeof GameStatus];

// ============================================================================
// GAME CONSTANTS
// ============================================================================

/** World dimensions in tiles (98x98 grid from World.hx) */
export const WORLD_SIZE = 98;

/** Size of each tile in pixels */
export const TILE_SIZE = 16;

/** Base game resolution width (GBA-style) */
export const BASE_WIDTH = 240;

/** Base game resolution height (GBA-style) */
export const BASE_HEIGHT = 160;

/** Target frames per second */
export const TARGET_FPS = 40;

/** Frame duration in milliseconds */
export const FRAME_DURATION = 1000 / TARGET_FPS;

/** Experience points gained per monster kill */
export const XP_PER_KILL = 10;

/** Experience points required to level up */
export const XP_FOR_LEVEL = 100;

/** Maximum number of monsters allowed in the world */
export const MAX_MONSTERS = 50;

/** Hero starting HP */
export const HERO_START_HP = 3;

/** Hero maximum HP cap */
export const HERO_MAX_HP = 10;

/** Hero base movement speed */
export const HERO_BASE_SPEED = 1.5;

/** Hit recovery frames (invincibility after taking damage) */
export const HIT_RECOVER_FRAMES = 60;

/** Sword attack duration in frames */
export const SWORD_DURATION = 8;

// ============================================================================
// CHEST DATA (from Chests.hx static data)
// ============================================================================

/**
 * Chest content data with names and descriptions.
 * Text is in French to match the original game's localization.
 */
export interface ChestData {
	readonly name: string;
	readonly description: string;
}

export const CHEST_DATA: Record<ChestKind, ChestData> = {
	[ChestKind.CLeftCtrl]: {
		name: 'Fleche Gauche',
		description: "Vous pouvez maintenant aller a gauche avec la fleche gauche ou 'Q'!"
	},
	[ChestKind.C2D]: {
		name: 'Mode 2D',
		description: 'Le monde devient 2D! Vous pouvez voir plus loin maintenant.'
	},
	[ChestKind.CScroll]: {
		name: 'Defilement',
		description: "L'ecran suit maintenant vos mouvements!"
	},
	[ChestKind.CColor]: {
		name: 'Couleurs',
		description: 'Le monde prend des couleurs! Magnifique!'
	},
	[ChestKind.CMonsters]: {
		name: 'Monstres',
		description: 'Des monstres apparaissent! Attention danger!'
	},
	[ChestKind.CWeapon]: {
		name: 'Epee',
		description: "Vous avez trouve une epee! Appuyez sur 'Espace' pour attaquer!"
	},
	[ChestKind.CZoom]: {
		name: 'Zoom',
		description: 'La camera fait un zoom arriere pour voir plus loin!'
	},
	[ChestKind.CAllowSave]: {
		name: 'Sauvegarde',
		description: 'Vous pouvez maintenant sauvegarder votre progression!'
	},
	[ChestKind.CWeb]: {
		name: 'Web',
		description: 'Connexion au monde en ligne activee!'
	},
	[ChestKind.CNpc]: {
		name: 'PNJ',
		description: 'Les villageois peuvent maintenant vous parler!'
	},
	[ChestKind.CGoldCoin]: {
		name: "Piece d'Or",
		description: "Vous avez trouve une piece d'or! Les monstres en laissent tomber aussi."
	},
	[ChestKind.CKey]: {
		name: 'Cle',
		description: 'Une cle pour ouvrir les portes verrouillees!'
	},
	[ChestKind.CFreeMove]: {
		name: 'Mouvement Libre',
		description: 'Vous pouvez maintenant vous deplacer librement en diagonale!'
	},
	[ChestKind.CDiablo]: {
		name: 'Mode Diablo',
		description: 'Le jeu passe en vue isometrique style Diablo!'
	},
	[ChestKind.CExit]: {
		name: 'Sortie',
		description: 'La sortie du donjon est maintenant accessible!'
	},
	[ChestKind.CPorn]: {
		name: 'Contenu Cache',
		description: 'Vous avez trouve un coffre mysterieux...'
	},
	[ChestKind.CSounds]: {
		name: 'Sons',
		description: 'Les effets sonores sont maintenant actives!'
	},
	[ChestKind.CMusic]: {
		name: 'Musique',
		description: 'La musique de fond commence a jouer!'
	},
	[ChestKind.CTitleScreen]: {
		name: 'Ecran Titre',
		description: 'Le jeu a maintenant un ecran titre!'
	},
	[ChestKind.CRightCtrl]: {
		name: 'Fleche Droite',
		description: "Vous pouvez maintenant aller a droite avec la fleche droite ou 'D'!"
	},
	[ChestKind.CPushBlock]: {
		name: 'Pousser',
		description: 'Vous pouvez maintenant pousser certains blocs!'
	},
	[ChestKind.CDungeon]: {
		name: 'Donjon',
		description: "L'entree du donjon est maintenant accessible!"
	},
	[ChestKind.CDungeonKills]: {
		name: 'Compteur de Monstres',
		description: 'Un compteur de monstres tues apparait!'
	},
	[ChestKind.CPuzzle]: {
		name: 'Enigme',
		description: 'Les enigmes du donjon sont maintenant activees!'
	},
	[ChestKind.CLevelUp]: {
		name: 'Niveau',
		description: 'Vous pouvez maintenant gagner des niveaux en tuant des monstres!'
	},
	[ChestKind.CFarming]: {
		name: 'Farming',
		description: "Les monstres reapparaissent! Farmez pour de l'XP!"
	},
	[ChestKind.CPrincess]: {
		name: 'Princesse',
		description: 'Vous avez sauve la princesse! Felicitations!'
	}
} as const;

// ============================================================================
// COLLISION HELPERS
// ============================================================================

/**
 * Set of blocks that are walkable (non-collision).
 */
export const WALKABLE_BLOCKS: ReadonlySet<Block> = new Set([
	Block.Field,
	Block.BridgeUD,
	Block.BridgeLR,
	Block.Detail,
	Block.SavePoint,
	Block.Sand,
	Block.SandDetail,
	Block.Door,
	Block.DungeonSoil,
	Block.DungeonStairs,
	Block.DungeonFakeWall,
	Block.DungeonPuzzle,
	Block.FakeTree,
	Block.DungeonExit,
	Block.Free,
	Block.DungeonFakeDark
]);

/**
 * Set of blocks that are solid (cause collision).
 */
export const SOLID_BLOCKS: ReadonlySet<Block> = new Set([
	Block.Dark,
	Block.Tree,
	Block.Water,
	Block.Bush,
	Block.RiverBank,
	Block.Rock,
	Block.SandBank,
	Block.Cactus,
	Block.Dungeon,
	Block.DungeonWall,
	Block.DungeonStat,
	Block.MonsterGenerator,
	Block.DarkDungeon,
	Block.Lock
]);

/**
 * Check if a block type is walkable.
 */
export function isWalkable(block: Block): boolean {
	return WALKABLE_BLOCKS.has(block);
}

/**
 * Check if a block type is solid.
 */
export function isSolid(block: Block): boolean {
	return SOLID_BLOCKS.has(block);
}
