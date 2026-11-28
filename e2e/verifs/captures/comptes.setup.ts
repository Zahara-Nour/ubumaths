import { test as setup } from '@playwright/test';
import { login, storageStatePath, type Role } from '../helpers/comptes';

/** Une session par rôle, réutilisée par les captures (`test.use({ storageState })`) */
for (const role of ['teacher', 'admin'] satisfies Role[]) {
	setup(`connexion ${role}`, async ({ page }) => {
		await login(page, role);
		await page.context().storageState({ path: storageStatePath(role) });
	});
}
