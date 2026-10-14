/**
 * Notification d'un signalement traité (décision D6, 2026-10-13)
 * ==============================================================
 *
 * L'élève lit le numéro de l'exercice dans SA copie, et la notification le
 * mène à sa fiche, sur l'exercice signalé : ancre fondée sur l'identifiant de
 * l'exercice de fiche. Numéro inconnu : on ne cite pas de numéro plutôt
 * qu'un numéro faux.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const created = vi.hoisted(() => ({ calls: [] as Array<Record<string, unknown>> }));
vi.mock('../notifications', () => ({
	createSystemNotification: async (data: Record<string, unknown>) => {
		created.calls.push(data);
	}
}));

import { notifyErrorReportRejected, notifyErrorReportValidated } from '../auto-notifications';

const STUDENT = '550e8400-e29b-41d4-a716-446655440501';
const ASSIGNMENT = '550e8400-e29b-41d4-a716-446655440010';
const WE_ID = '550e8400-e29b-41d4-a716-446655440012';
const ACTION_URL = `/dashboard/student/worksheets/${ASSIGNMENT}#exercice-${WE_ID}`;

beforeEach(() => {
	created.calls = [];
});

describe('signalement validé', () => {
	it('cite le numéro de la copie et mène à l’exercice signalé', async () => {
		await notifyErrorReportValidated({
			studentId: STUDENT,
			worksheetTitle: 'Dérivées',
			exerciseNumber: 7,
			assignmentId: ASSIGNMENT,
			worksheetExerciseId: WE_ID
		});
		const [notification] = created.calls;
		expect(notification.message).toContain('<strong>7</strong>');
		expect(notification.action_url).toBe(ACTION_URL);
		expect(notification.action_label).toBe('Voir l’exercice');
		expect(notification.target_user_ids).toEqual([STUDENT]);
	});

	it('numéro inconnu : aucun numéro cité, le lien reste', async () => {
		await notifyErrorReportValidated({
			studentId: STUDENT,
			worksheetTitle: 'Dérivées',
			exerciseNumber: null,
			assignmentId: ASSIGNMENT,
			worksheetExerciseId: WE_ID
		});
		const [notification] = created.calls;
		expect(notification.message).not.toMatch(/exercice <strong>/);
		expect(notification.message).toContain('un exercice');
		expect(notification.action_url).toBe(ACTION_URL);
	});
});

describe('signalement rejeté', () => {
	it('cite le numéro de la copie et mène à l’exercice signalé', async () => {
		await notifyErrorReportRejected({
			studentId: STUDENT,
			worksheetTitle: 'Dérivées',
			exerciseNumber: 3,
			assignmentId: ASSIGNMENT,
			worksheetExerciseId: WE_ID,
			response: 'Relis la consigne.'
		});
		const [notification] = created.calls;
		expect(notification.message).toContain('<strong>3</strong>');
		expect(notification.message).toContain('Relis la consigne.');
		expect(notification.action_url).toBe(ACTION_URL);
	});

	it('numéro inconnu : aucun numéro cité', async () => {
		await notifyErrorReportRejected({
			studentId: STUDENT,
			worksheetTitle: 'Dérivées',
			exerciseNumber: null,
			assignmentId: ASSIGNMENT,
			worksheetExerciseId: WE_ID
		});
		expect(created.calls[0].message).not.toMatch(/exercice <strong>/);
	});
});
