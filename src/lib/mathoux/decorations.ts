/**
 * Décorations des Mathoux — le catalogue (lots B et C des accessoires)
 * ====================================================================
 *
 * Deux emplacements, achetés en gidouilles dans la Chatterie :
 *   - la PANSE (`student_mathoux.decoration`) : six décorations (décisions de
 *     David du 2026-10-24, docs/wip/mathoux-accessoires-progress.md, « Lot B ») ;
 *   - le COU (`student_mathoux.collar`) : quatre colliers (décisions du
 *     2026-10-25, docs/wip/mathoux-colliers-progress.md).
 * Mêmes règles pour les deux : achetée une fois, une décoration orne UN SEUL
 * Mathou à la fois ; la poser ailleurs la déplace, gratuitement. Un Mathou porte
 * au plus une décoration par emplacement, et les deux se cumulent.
 *
 * ⚠️ Les prix sont RECOPIÉS de la base : `mathou_decoration_catalog` (migrations
 * 20261024235000 et 20261025160000) fait foi, c'est elle qui débite. Des tests
 * d'intégration (`tests/integration/mathoux-decorations.test.ts`,
 * `mathoux-colliers.test.ts`) vérifient l'égalité des deux.
 * Les dessins : `$lib/components/mathoux/mathou-decorations.ts` (panse) et
 * `mathou-colliers.ts` (cou).
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

/** Toute clé du catalogue, panse ou cou */
export type MathouCatalogId = MathouDecorationId | MathouCollarId;

export type MathouCollarInfo = MathouDecorationInfo<MathouCollarId>;

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

// Functions
export function isMathouDecoration(value: unknown): value is MathouDecorationId {
	return typeof value === 'string' && (MATHOU_DECORATION_IDS as readonly string[]).includes(value);
}

export function isMathouCollar(value: unknown): value is MathouCollarId {
	return typeof value === 'string' && (MATHOU_COLLAR_IDS as readonly string[]).includes(value);
}

export function isMathouCatalogId(value: unknown): value is MathouCatalogId {
	return isMathouDecoration(value) || isMathouCollar(value);
}

export function mathouCollarInfo(id: MathouCollarId): MathouCollarInfo {
	const info = MATHOU_COLLARS.find((c) => c.id === id);
	if (!info) throw new Error(`Collier inconnu : ${id}`);
	return info;
}

export function mathouDecorationInfo(id: MathouDecorationId): MathouDecorationInfo {
	const info = MATHOU_DECORATIONS.find((d) => d.id === id);
	if (!info) throw new Error(`Décoration inconnue : ${id}`);
	return info;
}
