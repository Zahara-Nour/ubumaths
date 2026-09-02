import { page } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SchoolConfigModal from '../SchoolConfigModal.svelte';
import { toStateProxy } from './state-proxy.svelte';

/**
 * The `school` prop comes from a `$state` variable on the schools page, so its
 * nested objects are state proxies. `structuredClone` throws DataCloneError on
 * a proxy, which used to break both the open effect (the school's saved week
 * config was never loaded, and saving overwrote it with the defaults) and the
 * cancel button (the modal would not close).
 */
describe('SchoolConfigModal with a $state-proxied school', () => {
	const westernWeekConfig = {
		first_day: 1,
		last_day: 0,
		school_days: [1, 2, 3, 4, 5],
		weekend_days: [0, 6]
	};

	function proxiedSchool() {
		return toStateProxy({
			id: '00000000-0000-0000-0000-000000000001',
			name: 'Collège Test',
			timezone: 'Europe/Paris',
			timetable: {
				periods: [],
				week_config: westernWeekConfig
			}
		});
	}

	it("loads the school's saved week config instead of the defaults", async () => {
		render(SchoolConfigModal, { open: true, school: proxiedSchool() });

		await expect.element(page.getByText('Lun → Dim')).toBeInTheDocument();
		await expect.element(page.getByText('Lun, Mar, Mer, Jeu, Ven')).toBeInTheDocument();
	});

	it('closes when cancelling', async () => {
		render(SchoolConfigModal, { open: true, school: proxiedSchool() });

		const title = page.getByText("Configuration de l'école");
		await expect.element(title).toBeInTheDocument();

		await page.getByRole('button', { name: 'Annuler' }).click();

		await expect.element(title).not.toBeInTheDocument();
	});
});
