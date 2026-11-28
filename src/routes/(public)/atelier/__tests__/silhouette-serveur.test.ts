/**
 * La silhouette de l'atelier, rendue par le serveur (piste 4 (c), volet 4).
 *
 * Avant ce volet, le serveur ne rendait rien : l'atelier n'est posé qu'après
 * `openLink(…)`, asynchrone, dans le navigateur → écran vide jusqu'à la fin du
 * JS (1,3 Mo, 3 s en 4G lente). La silhouette montre la forme de l'atelier tout
 * de suite ; elle est INERTE : rien ne s'y clique, rien ne s'y écrit.
 */
import { describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
import AtelierPage from '../+page.svelte';

// Hors d'une requête SvelteKit, `page` n'a pas de contexte : on lui donne l'adresse
vi.mock('$app/state', () => ({
	page: { url: new URL('http://localhost/atelier'), params: {}, data: {} }
}));

describe('atelier — rendu serveur', () => {
	const { body } = render(AtelierPage);

	const start = body.indexOf('class="silhouette');
	const silhouette = body.slice(start);

	it('rend la silhouette, annoncée comme en chargement', () => {
		expect(start).toBeGreaterThanOrEqual(0);
		expect(silhouette).toMatch(/role="status"[^>]*>Chargement de l’atelier…</);
	});

	it('porte le titre de la page, les onglets et « Mes objets »', () => {
		expect(silhouette).toMatch(/<h1[^>]*>Atelier<\/h1>/);
		for (const label of ['Graphe', 'Géométrie', 'Données', 'Mes objets']) {
			expect(silhouette).toContain(label);
		}
	});

	it('est inerte : aucun contrôle, ses parties visibles hors du parcours', () => {
		expect(silhouette).not.toMatch(/<(button|input|textarea|select|a)\b/);
		expect(silhouette).toMatch(/<aside[^>]*\binert\b/);
		expect(silhouette).toMatch(/class="barre[^"]*"[^>]*\binert\b/);
		expect(silhouette).toMatch(/class="onglets[^"]*"[^>]*\binert\b/);
		expect(silhouette.match(/\binert\b/g)).toHaveLength(3);
	});

	it('laisse le titre et l\u2019annonce hors de l\u2019inerte', () => {
		// Ni la racine, ni la zone, ni la scène ne sont inertes : le titre et
		// « Chargement… » y vivent, et un lecteur d'écran doit pouvoir les lire
		expect(silhouette).toMatch(/^class="silhouette[^"]*">/);
		expect(silhouette).toMatch(/<section class="zone[^"]*" aria-labelledby="[^"]+">/);
		expect(silhouette).toMatch(/<div class="scene[^"]*">/);
	});
});
