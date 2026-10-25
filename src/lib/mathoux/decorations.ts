/**
 * Décorations des Mathoux — le catalogue (lots B, C et D des accessoires)
 * =======================================================================
 *
 * Quatre emplacements, achetés en gidouilles dans la Chatterie :
 *   - la PANSE (`student_mathoux.decoration`) : six décorations (décisions de
 *     David du 2026-10-24, docs/wip/mathoux-accessoires-progress.md, « Lot B ») ;
 *   - le COU (`student_mathoux.collar`) : quatre colliers (décisions du
 *     2026-10-25, docs/wip/mathoux-colliers-progress.md) ;
 *   - les YEUX (`student_mathoux.glasses`) : cinq lunettes, et la TÊTE
 *     (`student_mathoux.hat`) : cinq chapeaux (décisions du 2026-10-25,
 *     docs/archive/wip/mathoux-chapeaux-lunettes-progress.md).
 * Mêmes règles pour tous : achetée une fois, une décoration orne UN SEUL
 * Mathou à la fois ; la poser ailleurs la déplace, gratuitement. Un Mathou porte
 * au plus une décoration par emplacement, et les quatre se cumulent.
 *
 * ⚠️ Les prix sont RECOPIÉS de la base : `mathou_decoration_catalog` (migrations
 * 20261024235000, 20261025160000 et 20261026000100) fait foi, c'est elle qui
 * débite. Des tests d'intégration (`tests/integration/mathoux-decorations.test.ts`,
 * `mathoux-colliers.test.ts`, `mathoux-lunettes-chapeaux.test.ts`) vérifient
 * l'égalité des deux.
 * Les dessins : `$lib/components/mathoux/mathou-decorations.ts` (panse),
 * `mathou-colliers.ts` (cou) et `mathou-chapeaux-lunettes.ts` (yeux et tête).
 */

// Types
export interface MathouDecorationInfo<Id extends MathouCatalogId = MathouDecorationId> {
	/** Clé du catalogue (`student_mathou_decorations.decoration`) */
	id: Id;
	/** Nom affiché */
	name: string;
	/** Prix en gidouilles */
	price: number;
	/** Fin du libellé du journal des récompenses (« Chatterie : cocarde achetée ») */
	purchaseLabel: string;
	/** Nom au féminin pluriel (« Portées ») : les lunettes, pas le monocle */
	plural?: true;
}

// Constantes
export const MATHOU_DECORATION_IDS = [
	'heart',
	'star',
	'gidouille',
	'cockade',
	'medal',
	'coat_of_arms'
] as const;

export type MathouDecorationId = (typeof MATHOU_DECORATION_IDS)[number];

export const MATHOU_COLLAR_IDS = ['bell', 'bow_tie', 'leather', 'order_chain'] as const;

export type MathouCollarId = (typeof MATHOU_COLLAR_IDS)[number];

export const MATHOU_GLASSES_IDS = [
	'round_glasses',
	'sunglasses',
	'monocle',
	'pince_nez',
	'spiral_glasses'
] as const;

export type MathouGlassesId = (typeof MATHOU_GLASSES_IDS)[number];

export const MATHOU_HAT_IDS = ['bowler', 'beret', 'boater', 'top_hat', 'pointed_hat'] as const;

export type MathouHatId = (typeof MATHOU_HAT_IDS)[number];

/** Toute clé du catalogue, quel que soit l'emplacement */
export type MathouCatalogId = MathouDecorationId | MathouCollarId | MathouGlassesId | MathouHatId;

export type MathouCollarInfo = MathouDecorationInfo<MathouCollarId>;
export type MathouGlassesInfo = MathouDecorationInfo<MathouGlassesId>;
export type MathouHatInfo = MathouDecorationInfo<MathouHatId>;

/** Dans l'ordre d'affichage : du moins cher au plus cher. */
export const MATHOU_DECORATIONS: readonly MathouDecorationInfo[] = [
	{ id: 'heart', name: 'Cœur', price: 10, purchaseLabel: 'cœur acheté' },
	{ id: 'star', name: 'Étoile', price: 10, purchaseLabel: 'étoile achetée' },
	{
		id: 'gidouille',
		name: 'Petite gidouille',
		price: 20,
		purchaseLabel: 'petite gidouille achetée'
	},
	{ id: 'cockade', name: 'Cocarde', price: 20, purchaseLabel: 'cocarde achetée' },
	{
		id: 'medal',
		name: 'Médaille de la Grande Passoire',
		price: 40,
		purchaseLabel: 'médaille achetée'
	},
	{ id: 'coat_of_arms', name: 'Blason', price: 40, purchaseLabel: 'blason acheté' }
];

/** Les colliers, du moins cher au plus cher. */
export const MATHOU_COLLARS: readonly MathouCollarInfo[] = [
	{ id: 'bell', name: 'Ruban à grelot', price: 10, purchaseLabel: 'ruban à grelot acheté' },
	{ id: 'bow_tie', name: 'Nœud papillon', price: 10, purchaseLabel: 'nœud papillon acheté' },
	{ id: 'leather', name: 'Collier de cuir', price: 20, purchaseLabel: 'collier de cuir acheté' },
	{
		id: 'order_chain',
		name: 'Collier de l’Ordre de la Grande Passoire',
		price: 40,
		purchaseLabel: "collier de l'Ordre acheté"
	}
];

/** Les lunettes, du moins cher au plus cher. */
export const MATHOU_GLASSES: readonly MathouGlassesInfo[] = [
	{
		id: 'round_glasses',
		name: 'Lunettes rondes',
		price: 10,
		purchaseLabel: 'lunettes rondes achetées',
		plural: true
	},
	{
		id: 'sunglasses',
		name: 'Lunettes de soleil',
		price: 10,
		purchaseLabel: 'lunettes de soleil achetées',
		plural: true
	},
	{ id: 'monocle', name: 'Monocle', price: 20, purchaseLabel: 'monocle acheté' },
	{ id: 'pince_nez', name: 'Pince-nez', price: 20, purchaseLabel: 'pince-nez acheté' },
	{
		id: 'spiral_glasses',
		name: 'Lunettes à gidouille',
		price: 40,
		purchaseLabel: 'lunettes à gidouille achetées',
		plural: true
	}
];

/** Les chapeaux, du moins cher au plus cher. */
export const MATHOU_HATS: readonly MathouHatInfo[] = [
	{ id: 'bowler', name: 'Chapeau melon', price: 10, purchaseLabel: 'chapeau melon acheté' },
	{ id: 'beret', name: 'Béret', price: 10, purchaseLabel: 'béret acheté' },
	{ id: 'boater', name: 'Canotier', price: 10, purchaseLabel: 'canotier acheté' },
	{ id: 'top_hat', name: 'Haut-de-forme', price: 20, purchaseLabel: 'haut-de-forme acheté' },
	{
		id: 'pointed_hat',
		name: 'Chapeau pointu',
		price: 20,
		purchaseLabel: 'chapeau pointu acheté'
	}
];

// Functions
export function isMathouDecoration(value: unknown): value is MathouDecorationId {
	return typeof value === 'string' && (MATHOU_DECORATION_IDS as readonly string[]).includes(value);
}

export function isMathouCollar(value: unknown): value is MathouCollarId {
	return typeof value === 'string' && (MATHOU_COLLAR_IDS as readonly string[]).includes(value);
}

export function isMathouGlasses(value: unknown): value is MathouGlassesId {
	return typeof value === 'string' && (MATHOU_GLASSES_IDS as readonly string[]).includes(value);
}

export function isMathouHat(value: unknown): value is MathouHatId {
	return typeof value === 'string' && (MATHOU_HAT_IDS as readonly string[]).includes(value);
}

export function isMathouCatalogId(value: unknown): value is MathouCatalogId {
	return (
		isMathouDecoration(value) ||
		isMathouCollar(value) ||
		isMathouGlasses(value) ||
		isMathouHat(value)
	);
}

export function mathouCollarInfo(id: MathouCollarId): MathouCollarInfo {
	const info = MATHOU_COLLARS.find((c) => c.id === id);
	if (!info) throw new Error(`Collier inconnu : ${id}`);
	return info;
}

export function mathouGlassesInfo(id: MathouGlassesId): MathouGlassesInfo {
	const info = MATHOU_GLASSES.find((g) => g.id === id);
	if (!info) throw new Error(`Lunettes inconnues : ${id}`);
	return info;
}

export function mathouHatInfo(id: MathouHatId): MathouHatInfo {
	const info = MATHOU_HATS.find((h) => h.id === id);
	if (!info) throw new Error(`Chapeau inconnu : ${id}`);
	return info;
}

export function mathouDecorationInfo(id: MathouDecorationId): MathouDecorationInfo {
	const info = MATHOU_DECORATIONS.find((d) => d.id === id);
	if (!info) throw new Error(`Décoration inconnue : ${id}`);
	return info;
}
