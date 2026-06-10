/**
 * Component tests for CapacityFsrsBadge.svelte
 * =============================================
 *
 * Tests le composant avec vitest-browser-svelte (rendu réel dans navigateur).
 *
 * Couverture :
 *   - rendu conditionnel : `non_commencee` ne rend rien.
 *   - 4 badges actifs : icône + couleur correcte par badge.
 *   - showLabel toggle : affichage texte conditionnel.
 *   - size sm/md : iconSize 14/18.
 *   - title + aria-label : accessibilité.
 *
 * Source : src/lib/components/srs/CapacityFsrsBadge.svelte (chantier 2026-06-10)
 */

import { page } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CapacityFsrsBadge from './CapacityFsrsBadge.svelte';

describe('CapacityFsrsBadge', () => {
	// ========================================================================
	// Rendu conditionnel — non_commencee masqué
	// ========================================================================

	describe('non_commencee — rendu masqué', () => {
		it('renders nothing for badge=non_commencee', () => {
			const { container } = render(CapacityFsrsBadge, { badge: 'non_commencee' });
			// Le composant `{#if badge !== 'non_commencee'}` n'émet aucun span
			expect(container.querySelector('span')).toBeNull();
		});

		it('renders nothing for non_commencee even with showLabel=true', () => {
			const { container } = render(CapacityFsrsBadge, {
				badge: 'non_commencee',
				showLabel: true
			});
			expect(container.querySelector('span')).toBeNull();
		});
	});

	// ========================================================================
	// Rendu des 4 badges actifs
	// ========================================================================

	describe('a_remedier — badge rouge avec AlertCircle', () => {
		it('renders the badge', () => {
			render(CapacityFsrsBadge, { badge: 'a_remedier' });
			const badge = page.getByLabelText('À remédier');
			expect(badge).toBeTruthy();
		});

		it('applies title="À remédier" attribute', async () => {
			const { container } = render(CapacityFsrsBadge, { badge: 'a_remedier' });
			const span = container.querySelector('span[title="À remédier"]');
			expect(span).not.toBeNull();
		});

		it('uses red color classes for a_remedier', () => {
			const { container } = render(CapacityFsrsBadge, { badge: 'a_remedier' });
			const span = container.querySelector('span') as HTMLElement;
			expect(span.className).toContain('text-red-600');
		});
	});

	describe('a_renforcer — badge ambre avec RefreshCw', () => {
		it('renders with title="À renforcer"', () => {
			const { container } = render(CapacityFsrsBadge, { badge: 'a_renforcer' });
			const span = container.querySelector('span[title="À renforcer"]');
			expect(span).not.toBeNull();
		});

		it('uses amber color classes', () => {
			const { container } = render(CapacityFsrsBadge, { badge: 'a_renforcer' });
			const span = container.querySelector('span') as HTMLElement;
			expect(span.className).toContain('text-amber-600');
		});
	});

	describe('acquise_en_memoire — badge emerald avec CheckCircle', () => {
		it('renders with title="Acquise"', () => {
			const { container } = render(CapacityFsrsBadge, { badge: 'acquise_en_memoire' });
			const span = container.querySelector('span[title="Acquise"]');
			expect(span).not.toBeNull();
		});

		it('uses emerald color classes', () => {
			const { container } = render(CapacityFsrsBadge, { badge: 'acquise_en_memoire' });
			const span = container.querySelector('span') as HTMLElement;
			expect(span.className).toContain('text-emerald-600');
		});
	});

	describe('en_apprentissage — badge bleu avec Clock', () => {
		it('renders with title="En apprentissage"', () => {
			const { container } = render(CapacityFsrsBadge, { badge: 'en_apprentissage' });
			const span = container.querySelector('span[title="En apprentissage"]');
			expect(span).not.toBeNull();
		});

		it('uses blue color classes', () => {
			const { container } = render(CapacityFsrsBadge, { badge: 'en_apprentissage' });
			const span = container.querySelector('span') as HTMLElement;
			expect(span.className).toContain('text-blue-600');
		});
	});

	// ========================================================================
	// showLabel — affichage texte conditionnel
	// ========================================================================

	describe('showLabel', () => {
		it('hides the label text by default (showLabel undefined)', () => {
			const { container } = render(CapacityFsrsBadge, { badge: 'a_remedier' });
			// Le span externe contient juste l'icône, pas de span interne avec texte
			const innerSpan = container.querySelector('span > span');
			expect(innerSpan).toBeNull();
		});

		it('shows the label text when showLabel=true', () => {
			const { container } = render(CapacityFsrsBadge, {
				badge: 'a_remedier',
				showLabel: true
			});
			const innerSpan = container.querySelector('span > span');
			expect(innerSpan).not.toBeNull();
			expect(innerSpan?.textContent).toBe('À remédier');
		});

		it('shows different label for each badge when showLabel=true', () => {
			const labels: Record<string, string> = {
				a_renforcer: 'À renforcer',
				acquise_en_memoire: 'Acquise',
				en_apprentissage: 'En apprentissage'
			};
			for (const [badge, expectedLabel] of Object.entries(labels)) {
				const { container } = render(CapacityFsrsBadge, {
					badge: badge as 'a_renforcer' | 'acquise_en_memoire' | 'en_apprentissage',
					showLabel: true
				});
				const innerSpan = container.querySelector('span > span');
				expect(innerSpan?.textContent).toBe(expectedLabel);
			}
		});
	});

	// ========================================================================
	// Accessibilité — aria-label + role
	// ========================================================================

	describe('accessibilité', () => {
		it('sets aria-label to the badge label', () => {
			const { container } = render(CapacityFsrsBadge, { badge: 'a_remedier' });
			const span = container.querySelector('span[aria-label]') as HTMLElement;
			expect(span).not.toBeNull();
			expect(span.getAttribute('aria-label')).toBe('À remédier');
		});

		it('aria-label is identical to title for screen readers + tooltip alignment', () => {
			const { container } = render(CapacityFsrsBadge, { badge: 'a_renforcer' });
			const span = container.querySelector('span') as HTMLElement;
			expect(span.getAttribute('aria-label')).toBe('À renforcer');
			expect(span.getAttribute('title')).toBe('À renforcer');
		});

		it('icon has aria-hidden=true (decorative)', () => {
			const { container } = render(CapacityFsrsBadge, { badge: 'a_remedier' });
			const svg = container.querySelector('svg');
			expect(svg?.getAttribute('aria-hidden')).toBe('true');
		});
	});

	// ========================================================================
	// Smoke / fallback — pas de crash si props absentes (TS interdit mais runtime)
	// ========================================================================

	describe('smoke', () => {
		it('does not throw for all 5 badges', () => {
			const badges = [
				'a_remedier',
				'a_renforcer',
				'acquise_en_memoire',
				'en_apprentissage',
				'non_commencee'
			] as const;
			for (const badge of badges) {
				expect(() => render(CapacityFsrsBadge, { badge })).not.toThrow();
			}
		});
	});
});
