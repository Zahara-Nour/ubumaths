/**
 * Security — audit_logs PII minimization (needs a running DB)
 * ===========================================================
 * Vague-2 finding M13: audit_trigger_func must store only the CHANGED keys on
 * UPDATE (not the whole PII row) and no full snapshot on DELETE.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';

describe('Security — audit_logs minimization (M13)', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
	});
	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('an UPDATE on profiles logs only the changed keys, not the full PII row', async () => {
		expect.assertions(3);
		const svc = createServiceRoleClient();
		const student = await TestData.profile().withRole('student').create();

		await svc.from('profiles').update({ firstname: 'ChangedName' }).eq('id', student.id);

		const { data: logs } = await svc
			.from('audit_logs')
			.select('new_values, old_values')
			.eq('table_name', 'profiles')
			.eq('record_id', student.id)
			.eq('action', 'UPDATE')
			.order('created_at', { ascending: false })
			.limit(1);

		const newValues = (logs?.[0]?.new_values ?? {}) as Record<string, unknown>;
		const keys = Object.keys(newValues);
		expect(keys).toContain('firstname'); // the changed key is recorded
		expect(keys).not.toContain('email'); // unchanged PII is NOT snapshotted
		expect(keys.length).toBeLessThan(6); // only a small diff, not the whole row
	});
});
