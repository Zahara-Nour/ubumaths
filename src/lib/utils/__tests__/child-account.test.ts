import { describe, expect, it } from 'vitest';
import {
	CHILD_ACCOUNT_DOMAIN,
	childAccountEmail,
	childLoginBase,
	isChildAccountEmail,
	normalizeLoginIdentifier,
	pickChildLoginId
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

	it('translittère les lettres que NFD ne décompose pas', () => {
		expect(normalizeLoginIdentifier('Łukasz7')).toBe(`lukasz7@${CHILD_ACCOUNT_DOMAIN}`);
		expect(normalizeLoginIdentifier('Søren3')).toBe(`soren3@${CHILD_ACCOUNT_DOMAIN}`);
	});

	it('ramène la pleine chasse d’un clavier mobile', () => {
		expect(normalizeLoginIdentifier('ｎｏｅｌｉｅ４２')).toBe(`noelie42@${CHILD_ACCOUNT_DOMAIN}`);
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

describe('childLoginBase', () => {
	it('retire accents, majuscules, tirets et espaces', () => {
		expect(childLoginBase('Noélie')).toBe('noelie');
		expect(childLoginBase('Jean-Marc')).toBe('jeanmarc');
		expect(childLoginBase(' Anne Sophie ')).toBe('annesophie');
	});

	it('retire les chiffres : le suffixe est seul à en mettre', () => {
		expect(childLoginBase('Louis14')).toBe('louis');
	});

	it('borne la racine à 20 caractères', () => {
		expect(childLoginBase('a'.repeat(50))).toBe('a'.repeat(20));
	});

	it("rend null s'il ne reste aucune lettre latine", () => {
		expect(childLoginBase('张伟')).toBeNull();
		expect(childLoginBase('42 - !')).toBeNull();
	});
});

describe('pickChildLoginId', () => {
	it('ajoute deux chiffres à la racine', () => {
		expect(pickChildLoginId('noelie', new Set(), () => 0.42)).toBe('noelie42');
		expect(pickChildLoginId('noelie', new Set(), () => 0)).toBe('noelie00');
	});

	it('ne rend jamais un identifiant pris', () => {
		const taken = new Set(
			Array.from({ length: 99 }, (_, n) => `noelie${String(n).padStart(2, '0')}`)
		);
		expect(pickChildLoginId('noelie', taken, () => 0)).toBe('noelie99');
	});

	it('passe à trois chiffres quand les cent sont pris', () => {
		const taken = new Set(
			Array.from({ length: 100 }, (_, n) => `noelie${String(n).padStart(2, '0')}`)
		);
		expect(pickChildLoginId('noelie', taken, () => 0.5)).toBe('noelie500');
	});
});

describe('childAccountEmail', () => {
	it("donne l'adresse du domaine fictif, que normalizeLoginIdentifier retrouve", () => {
		expect(childAccountEmail('noelie42')).toBe(`noelie42@${CHILD_ACCOUNT_DOMAIN}`);
		expect(normalizeLoginIdentifier('Noélie42')).toBe(childAccountEmail('noelie42'));
	});
});
