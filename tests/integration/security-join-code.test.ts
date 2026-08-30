/**
 * Security — class join-code entropy (needs a running DB)
 * =======================================================
 * Vague-2 finding M16: generate_join_code() must use a CSPRNG and >= 8 chars
 * (was 6 hex from md5(random()) = 24 bits, non-crypto).
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { createServiceRoleClient } from '../helpers/database/trigger-test-helpers';

describe('Security — join code entropy (M16)', () => {
	it('generate_join_code returns an 8-char uppercase hex code', async () => {
		expect.assertions(2);
		const svc = createServiceRoleClient();
		const { data, error } = await svc.rpc('generate_join_code');
		expect(error).toBeNull();
		expect(String(data)).toMatch(/^[0-9A-F]{8}$/);
	});
});
