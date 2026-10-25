/**
 * Bloc ```collection — scènes figées
 *
 * La scène de la collection partage son hasard, son vrac et son toucher avec
 * ```monnaie (`utils/scene-commune.ts`, phase 0 : `docs/wip/monnaie-progress.md`
 * § 8). Ces instantanés fixent la position de chaque objet : une retouche du
 * code commun qui déplacerait un seul objet d'un centième les fait échouer.
 */

import { describe, expect, it } from 'vitest';
import { parseCollectionContent } from '$lib/ubumark/parser/collection-parser';
import {
	buildCollectionScene,
	type CollectionItem,
	type CollectionScene
} from '$lib/ubumark/utils/collection-scene';

// ============================================================================
// CONSTANTES
// ============================================================================

/** Blocs témoins : chaque disposition, chaque dessin, plusieurs collections, le vide */
const BLOCS: Record<string, string[]> = {
	'vrac de jetons': ['unités: 23', 'dessin: paquets'],
	'paquets + vrac': ['dizaines: 4', 'unités: 7', 'dessin: paquets'],
	'barres + vrac de cubes': ['dizaines: 3', 'unités: 15'],
	'barres + rangées': ['dizaines: 2', 'unités: 23', 'unités en: rangées'],
	'vrac de 100': ['unités: 100'],
	'trois collections': ['dizaines: 1 ; 0 ; 2', 'unités: 9 ; 19 ; 0', 'dessin: paquets'],
	'collection vide': ['unités: 0 ; 5']
};

// ============================================================================
// FONCTIONS
// ============================================================================

/** Une ligne par objet : genre, boîte, centre, valeur, centres des jetons d'un paquet */
function itemLine(item: CollectionItem): string {
	const jetons = item.jetons?.map((j) => `${j.cx},${j.cy}`).join(' ');
	return [
		`${item.kind} ${item.x},${item.y} ${item.width}×${item.height}`,
		`centre ${item.cx},${item.cy} valeur ${item.value}`,
		...(jetons ? [`jetons ${jetons}`] : [])
	].join(' · ');
}

function sceneLines(scene: CollectionScene): string[] {
	return [`cadre ${scene.width}×${scene.height}`, ...scene.items.map(itemLine)];
}

// ============================================================================
// TESTS
// ============================================================================

describe('collection-scene — scènes figées (code partagé avec la monnaie)', () => {
	for (const [name, lines] of Object.entries(BLOCS)) {
		it(name, () => {
			const node = parseCollectionContent(lines.join('\n'));
			expect(node.errors).toEqual([]);
			const spec = node.spec!;
			const scenes = spec.sets.map((_, i) => sceneLines(buildCollectionScene(spec, i)));
			expect(scenes).toMatchSnapshot();
		});
	}
});
