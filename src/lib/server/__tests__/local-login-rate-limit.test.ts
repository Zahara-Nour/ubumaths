import { describe, expect, it } from 'vitest';
import { skipsLoginRateLimit } from '../local-login-rate-limit';

describe('skipsLoginRateLimit', () => {
	it.each(['127.0.0.1', '::1', '::ffff:127.0.0.1'])(
		'saute le limiteur sous pnpm dev depuis %s',
		(ip) => {
			expect(skipsLoginRateLimit(true, ip)).toBe(true);
		}
	);

	it.each(['127.0.0.1', '::1', '::ffff:127.0.0.1'])(
		'garde le limiteur hors pnpm dev, même depuis %s',
		(ip) => {
			expect(skipsLoginRateLimit(false, ip)).toBe(false);
		}
	);

	it.each(['192.168.1.20', '10.0.0.5', '127.0.0.2', '::ffff:192.168.1.20', '203.0.113.7'])(
		'garde le limiteur sous pnpm dev depuis une autre IP (%s)',
		(ip) => {
			expect(skipsLoginRateLimit(true, ip)).toBe(false);
		}
	);

	it.each(['', 'localhost', '127.0.0.1 ', ' ::1', 'unknown'])(
		'garde le limiteur pour une IP vide ou bizarre (%j)',
		(ip) => {
			expect(skipsLoginRateLimit(true, ip)).toBe(false);
		}
	);
});
