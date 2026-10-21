import { describe, expect, it } from 'vitest';
import {
	CHILD_ACCOUNT_DOMAIN,
	isChildAccountEmail,
	normalizeLoginIdentifier
} from '../child-account';

describe('normalizeLoginIdentifier', () => {
	it('change un identifiant en adresse du domaine fictif', () => {
		expect(normalizeLoginIdentifier('noelie42')).toBe(`noelie42@${CHILD_ACCOUNT_DOMAIN}`);
	});

	it('ignore majuscules, accents et espaces autour', () => {
		expect(normalizeLoginIdentifier('  NOÉLIE42 ')).toBe(`noelie42@${CHILD_ACCOUNT_DOMAIN}`);
		expect(normalizeLoginIdentifier('Noélie42')).toBe(`noelie42@${CHILD_ACCOUNT_DOMAIN}`);
	});

	it('retire points, tirets et espaces internes', () => {
		expect(normalizeLoginIdentifier('jean-marc 07')).toBe(`jeanmarc07@${CHILD_ACCOUNT_DOMAIN}`);
		expect(normalizeLoginIdentifier('noelie.42')).toBe(`noelie42@${CHILD_ACCOUNT_DOMAIN}`);
	});

	it('déplie les ligatures', () => {
		expect(normalizeLoginIdentifier('Cœlia12')).toBe(`coelia12@${CHILD_ACCOUNT_DOMAIN}`);
	});

	it('garde une adresse telle quelle, en minuscules', () => {
		expect(normalizeLoginIdentifier(' Parent@Exemple.fr ')).toBe('parent@exemple.fr');
	});

	it('rend null quand il ne reste rien', () => {
		expect(normalizeLoginIdentifier('')).toBeNull();
		expect(normalizeLoginIdentifier(' .- ')).toBeNull();
	});
});

describe('isChildAccountEmail', () => {
	it('reconnaît le domaine fictif, quelle que soit la casse', () => {
		expect(isChildAccountEmail(`noelie42@${CHILD_ACCOUNT_DOMAIN}`)).toBe(true);
		expect(isChildAccountEmail(`Noelie42@${CHILD_ACCOUNT_DOMAIN.toUpperCase()}`)).toBe(true);
	});

	it('ne prend pas un domaine qui finit pareil', () => {
		expect(isChildAccountEmail(`x@faux${CHILD_ACCOUNT_DOMAIN}`)).toBe(false);
		expect(isChildAccountEmail('parent@exemple.fr')).toBe(false);
	});
});
