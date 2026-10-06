/**
 * L'ancien pied de page de l'accueil (copyright + trois liens légaux en ligne)
 * est remplacé par le bouton « Infos et confidentialité », qui ouvre un panneau
 * (décision de David, 2026-10-06).
 *
 * Lecture du code du layout racine : le rendre en test demanderait de simuler
 * Supabase, l'en-tête et la barre latérale. Le comportement du bouton et du
 * panneau est testé à part (InfoPanel.svelte.test.ts).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const layout = readFileSync(join(process.cwd(), 'src', 'routes', '+layout.svelte'), 'utf8');

describe('pied de page de l’accueil', () => {
	it('n’affiche plus les liens légaux en ligne ni le copyright', () => {
		expect(layout).not.toMatch(/Tous droits/);
		expect(layout).not.toMatch(/resolve\('\/legal\//);
	});

	it('affiche le panneau « Infos et confidentialité »', () => {
		expect(layout).toMatch(/import InfoPanel from '\$lib\/components\/InfoPanel\.svelte'/);
		expect(layout).toMatch(/<InfoPanel\s*\/>/);
	});
});
