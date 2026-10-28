/**
 * Bornes des points des programmes — lues au build
 * ================================================
 *
 * La source est `docs/systeme/programmes/bornes/*.json` (cycles 2 à 4) et `…/bornes/lycee/*.json`
 * (décidé le 2026-10-28, chantier revue-modeles : les fichiers restent dans la doc, qui fait foi).
 * Vite les intègre au build : rien n'est lu sur le disque en prod. Les fichiers `questions*.json`
 * (relevés des modèles, pas des points) sont écartés. Aucun test ne lit `docs/` : si les fichiers
 * bougent, la table est vide et `/dev/modeles` le dit.
 */

// Types

export interface PointBounds {
	libelle: string;
	bornes: { borne: string }[];
	remarque?: string;
}

// Constantes

const FILES = import.meta.glob<unknown>(
	[
		'/docs/systeme/programmes/bornes/*.json',
		'/docs/systeme/programmes/bornes/lycee/*.json',
		'!/docs/systeme/programmes/bornes/**/questions*.json'
	],
	{ eager: true, import: 'default' }
);

// Functions

function isPointBounds(v: unknown): v is PointBounds {
	return (
		typeof v === 'object' &&
		v !== null &&
		'libelle' in v &&
		typeof v.libelle === 'string' &&
		'bornes' in v &&
		Array.isArray(v.bornes)
	);
}

function readBounds(): ReadonlyMap<string, PointBounds> {
	const bounds = new Map<string, PointBounds>();
	for (const [path, content] of Object.entries(FILES)) {
		if (path.split('/').pop()?.startsWith('questions')) continue;
		if (typeof content !== 'object' || content === null) continue;
		for (const level of Object.values(content)) {
			if (typeof level !== 'object' || level === null || !('points' in level)) continue;
			const list = level.points;
			if (typeof list !== 'object' || list === null) continue;
			for (const [code, point] of Object.entries(list)) {
				if (isPointBounds(point)) bounds.set(code, point);
			}
		}
	}
	return bounds;
}

/** Tous les points relevés, par code (les codes portent leur niveau : `6-012`, `1SPE-224`) */
export const POINT_BOUNDS = readBounds();
