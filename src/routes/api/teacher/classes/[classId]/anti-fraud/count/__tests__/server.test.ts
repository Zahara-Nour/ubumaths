/**
 * GET /api/teacher/classes/[classId]/anti-fraud/count — le message de la base
 * ne part pas au navigateur.
 */
import { describe, it, expect, vi } from 'vitest';
import { createFakeSupabase } from '#lib/server/__tests__/helpers/fake-supabase.ts';

vi.mock('#lib/server/stats/teacher-class-auth.ts', () => ({
	requireTeacherOfClass: async () => undefined
}));

import { GET } from '../+server';

const CLASS_ID = '11111111-1111-4111-8111-111111111111';
const STUDENT_ID = '22222222-2222-4222-8222-222222222222';

async function get(flags: { count?: number; error?: { message: string } }) {
	const fake = createFakeSupabase((table) => {
		if (table === 'class_members') return { data: [{ student_id: STUDENT_ID }] };
		return flags;
	});
	return GET({ params: { classId: CLASS_ID }, locals: { supabase: fake.client } } as never);
}

describe('GET anti-fraud/count', () => {
	it('rend le nombre de signalements à traiter', async () => {
		const response = await get({ count: 3 });
		expect(await response.json()).toEqual({ count: 3 });
	});

	it('ne rend pas le message de la base quand le comptage échoue', async () => {
		const response = await get({ error: { message: 'relation srs_anti_fraud_flags oups' } });
		expect(response.status).toBe(500);
		expect(JSON.stringify(await response.json())).not.toContain('srs_anti_fraud_flags');
	});
});
