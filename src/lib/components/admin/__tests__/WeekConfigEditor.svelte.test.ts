import { page } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import WeekConfigEditor from '../WeekConfigEditor.svelte';

/**
 * Presets must update the whole config, including the first/last day of week
 * selectors - not only the school/weekend day checkboxes.
 */
describe('WeekConfigEditor presets', () => {
	function dayTriggers(container: HTMLElement) {
		return Array.from(container.querySelectorAll<HTMLElement>('[aria-haspopup="listbox"]'));
	}

	function firstDayLabel(container: HTMLElement) {
		return dayTriggers(container)[0]?.textContent?.trim();
	}

	function lastDayLabel(container: HTMLElement) {
		return dayTriggers(container)[1]?.textContent?.trim();
	}

	it('applies the western preset (Monday -> Sunday)', async () => {
		const { container } = render(WeekConfigEditor);

		await page.getByRole('button', { name: 'Occidental (Lun-Ven)' }).click();

		await expect.poll(() => firstDayLabel(container)).toBe('Lundi');
		expect(lastDayLabel(container)).toBe('Dimanche');
		await expect.element(page.getByText('Lun → Dim')).toBeInTheDocument();
		await expect.element(page.getByText('Lun, Mar, Mer, Jeu, Ven')).toBeInTheDocument();
	});

	it('applies the israeli preset (Sunday -> Saturday)', async () => {
		const { container } = render(WeekConfigEditor);

		await page.getByRole('button', { name: 'Israélien (Dim-Jeu)' }).click();

		await expect.poll(() => firstDayLabel(container)).toBe('Dimanche');
		expect(lastDayLabel(container)).toBe('Samedi');
		await expect.element(page.getByText('Dim → Sam')).toBeInTheDocument();
	});

	it('applies the middle east preset (Saturday -> Friday)', async () => {
		const { container } = render(WeekConfigEditor);

		await page.getByRole('button', { name: 'Moyen-Orient (Sam-Mer)' }).click();

		await expect.poll(() => firstDayLabel(container)).toBe('Samedi');
		expect(lastDayLabel(container)).toBe('Vendredi');
		await expect.element(page.getByText('Sam → Ven')).toBeInTheDocument();
	});
});
