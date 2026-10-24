/**
 * Décorations de panse des Mathoux — le catalogue (lot B des accessoires)
 * =======================================================================
 *
 * Six décorations, achetées en gidouilles dans la Chatterie (décisions de David
 * du 2026-10-24, docs/wip/mathoux-accessoires-progress.md, « Lot B ») : achetée
 * une fois, elle orne UN SEUL Mathou à la fois ; la poser ailleurs la déplace,
 * gratuitement.
 *
 * ⚠️ Les prix sont RECOPIÉS de la base : `mathou_decoration_catalog` (migration
 * 20261024235000) fait foi, c'est elle qui débite. Un test d'intégration
 * (`tests/integration/mathoux-decorations.test.ts`) vérifie l'égalité des deux.
 * Les dessins : `$lib/components/mathoux/mathou-decorations.ts`.
 */

// Types
export interface MathouDecorationInfo {
	/** Clé du catalogue (`student_mathou_decorations.decoration`) */
	id: MathouDecorationId;
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

// Functions
export function isMathouDecoration(value: unknown): value is MathouDecorationId {
	return typeof value === 'string' && (MATHOU_DECORATION_IDS as readonly string[]).includes(value);
}

export function mathouDecorationInfo(id: MathouDecorationId): MathouDecorationInfo {
	const info = MATHOU_DECORATIONS.find((d) => d.id === id);
	if (!info) throw new Error(`Décoration inconnue : ${id}`);
	return info;
}
