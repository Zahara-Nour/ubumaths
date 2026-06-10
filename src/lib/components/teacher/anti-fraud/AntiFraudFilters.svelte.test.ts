/**
 * AntiFraudFilters — component tests.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from '@vitest/browser/context';
import AntiFraudFilters from './AntiFraudFilters.svelte';

describe('AntiFraudFilters', () => {
	it('renders the "Inclure les flags résolus" toggle', async () => {
		render(AntiFraudFilters, { showResolved: false });
		await expect.element(page.getByText(/Inclure les flags résolus/)).toBeVisible();
	});

	it('renders the help text', async () => {
		render(AntiFraudFilters, { showResolved: false });
		await expect.element(page.getByText(/Décoché par défaut/)).toBeVisible();
	});

	it('renders with showResolved=true', async () => {
		render(AntiFraudFilters, { showResolved: true });
		await expect.element(page.getByText(/Inclure les flags résolus/)).toBeVisible();
	});
});
