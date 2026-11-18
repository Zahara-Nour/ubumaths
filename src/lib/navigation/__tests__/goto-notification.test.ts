/**
 * Lien d'une notification : `goto`, et chargement complet si kit 3 refuse
 * l'adresse (route inconnue) ; jamais vers un autre site.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const goto = vi.hoisted(() => vi.fn());
vi.mock('$app/navigation', () => ({ goto }));

const { gotoNotification, isSitePath } = await import('../goto-notification');

const assign = vi.fn();

beforeEach(() => {
	goto.mockReset();
	assign.mockReset();
	vi.stubGlobal('window', { location: { assign } });
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('gotoNotification', () => {
	it('navigue par goto quand la route existe', async () => {
		goto.mockResolvedValue(undefined);
		gotoNotification('/dashboard/student/work');
		await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/dashboard/student/work'));
		expect(assign).not.toHaveBeenCalled();
	});

	it('charge la page en entier quand goto refuse la route (lien périmé)', async () => {
		goto.mockRejectedValue(new Error('navigation_route_missing'));
		gotoNotification('/dashboard/student/resources/abc');
		await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('/dashboard/student/resources/abc'));
	});

	it.each(['https://ailleurs.example/x', '//ailleurs.example/x', '/\\ailleurs.example', 'x'])(
		'ignore %s, qui n’est pas un chemin du site',
		async (url) => {
			goto.mockRejectedValue(new Error('refus'));
			gotoNotification(url);
			await Promise.resolve();
			expect(goto).not.toHaveBeenCalled();
			expect(assign).not.toHaveBeenCalled();
			expect(isSitePath(url)).toBe(false);
		}
	);
});
