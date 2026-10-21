/**
 * Passage de l'élève sur son tableau de bord (Palotin triste au retour)
 * =====================================================================
 *
 * `record_student_visit` est appelée au client service, avec l'identité de la
 * session et le jour UTC calculé par le serveur. Seul « triste oui/non » en
 * sort ; écriture en échec → pas triste (docs/wip/palotins-absence-progress.md).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { utcDay } from '$lib/utils/buddy-constance';

const service = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => service
}));

import { recordVisitAndCheckLongAbsence } from '../buddy-queries';

// Constantes
const STUDENT = '11111111-1111-4111-8111-111111111111';
const DAY_MS = 86_400_000;

// Functions
function daysAgo(days: number): string {
	return utcDay(new Date(Date.now() - days * DAY_MS));
}

beforeEach(() => {
	service.rpc.mockReset();
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('recordVisitAndCheckLongAbsence', () => {
	it('appelle la fonction au client service, identité et jour UTC du serveur', async () => {
		service.rpc.mockResolvedValue({ data: daysAgo(1), error: null });
		await recordVisitAndCheckLongAbsence(STUDENT);
		expect(service.rpc).toHaveBeenCalledWith('record_student_visit', {
			p_student_id: STUDENT,
			p_today: utcDay()
		});
	});

	it('dernier passage il y a 21 jours : triste', async () => {
		service.rpc.mockResolvedValue({ data: daysAgo(21), error: null });
		expect(await recordVisitAndCheckLongAbsence(STUDENT)).toBe(true);
	});

	it('dernier passage il y a 20 jours : pas triste', async () => {
		service.rpc.mockResolvedValue({ data: daysAgo(20), error: null });
		expect(await recordVisitAndCheckLongAbsence(STUDENT)).toBe(false);
	});

	it('tout premier passage (aucun jour enregistré) : pas triste', async () => {
		service.rpc.mockResolvedValue({ data: null, error: null });
		expect(await recordVisitAndCheckLongAbsence(STUDENT)).toBe(false);
	});

	it('écriture en échec : pas triste', async () => {
		service.rpc.mockResolvedValue({ data: null, error: { message: 'panne' } });
		expect(await recordVisitAndCheckLongAbsence(STUDENT)).toBe(false);
	});
});
