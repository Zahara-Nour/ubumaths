/**
 * L'indicateur de modèle ne doit pas casser la page qui l'accueille
 * ==================================================================
 *
 * Il pose des tooltips. Sans `Tooltip.Provider`, bits-ui jette
 * « Context "Tooltip.Provider" not found » AU MONTAGE — et ce n'est pas le
 * tooltip qui manque, c'est l'hydratation de toute la page hôte qui s'arrête.
 * Vécu en production le 2026-09-15 sur la page de chapitre du professeur.
 *
 * Le composant apporte donc son propre contexte, et ces cas le vérifient là où
 * ça se voit : au montage, pas au survol.
 */
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { InstantiationWithStatus } from '$lib/types/chapter-templates';
import ChapterTemplateIndicator from '../ChapterTemplateIndicator.svelte';

const QUAND = '2026-09-14T05:36:02.215Z';

function instanciation(delta: Partial<InstantiationWithStatus> = {}): InstantiationWithStatus {
	return {
		id: '11111111-1111-4111-8111-111111111111',
		templateId: '22222222-2222-4222-8222-222222222222',
		templateVersion: 2,
		chapterId: '33333333-3333-4333-8333-333333333333',
		currentTemplateVersion: 2,
		isDetached: false,
		instantiatedAt: QUAND,
		lastMigratedAt: null,
		hasUpdate: false,
		latestVersion: null,
		templateTitle: 'Les fonctions affines',
		...delta
	};
}

describe('ChapterTemplateIndicator', () => {
	/** ⚠️ LE cas : le montage lui-même levait, et emportait la page avec lui. */
	it('se monte sans exiger de contexte de son hôte', () => {
		const { container } = render(ChapterTemplateIndicator, {
			instantiation: instanciation(),
			onDetach: () => {}
		});

		expect(container.textContent).toContain('Les fonctions affines');
	});

	/** Détaché, mise à jour disponible : les trois tooltips du composant. */
	it('se monte aussi avec tous ses tooltips', () => {
		const { container } = render(ChapterTemplateIndicator, {
			instantiation: instanciation({ isDetached: true, hasUpdate: true, latestVersion: 3 }),
			hasUpdate: true,
			onUpdate: () => {},
			onDetach: () => {}
		});

		expect(container.textContent).toContain('Les fonctions affines');
	});

	/**
	 * Un chapitre créé à la main n'a PAS de modèle, et l'écran ne doit rien en
	 * dire. `null` est la seule valeur qui signifie « rien à montrer » — c'est
	 * pour avoir passé un objet « pas de mise à jour » à la place que la page
	 * annonçait « Template supprimé » sur tous les chapitres.
	 */
	it('n’affiche rien sans instanciation', () => {
		const { container } = render(ChapterTemplateIndicator, { instantiation: null });

		expect(container.textContent?.trim()).toBe('');
	});
});
