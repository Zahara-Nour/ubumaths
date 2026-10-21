import { describe, expect, it, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({}) }));

import { mailboxKey } from '../rateLimiter';

describe('mailboxKey : une boîte aux lettres, une clé', () => {
	it('retire le +tag', () => {
		expect(mailboxKey('Victime+1@Exemple.fr')).toBe('victime@exemple.fr');
	});

	it('retire les points chez Gmail et confond googlemail', () => {
		expect(mailboxKey('v.i.c.time+x@googlemail.com')).toBe('victime@gmail.com');
	});

	it('garde les points ailleurs', () => {
		expect(mailboxKey('jean.dupont@exemple.fr')).toBe('jean.dupont@exemple.fr');
	});
});
