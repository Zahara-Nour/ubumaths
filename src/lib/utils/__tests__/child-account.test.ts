import { describe, expect, it } from 'vitest';
import {
	CHILD_ACCOUNT_DOMAIN,
	childAccountEmail,
	childLoginBase,
	childLoginIdOf,
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
	// M2 : 3 chiffres au minimum, 1 000 identifiants par prénom (deviner un identifiant
	// d'une classe devient 10 fois plus long).
	it('ajoute trois chiffres à la racine', () => {
		expect(pickChildLoginId('noelie', new Set(), () => 0.042)).toBe('noelie042');
		expect(pickChildLoginId('noelie', new Set(), () => 0)).toBe('noelie000');
		expect(pickChildLoginId('noelie', new Set(), () => 0.9999)).toBe('noelie999');
	});

	it('ne rend jamais un identifiant pris', () => {
		const taken = new Set(
			Array.from({ length: 999 }, (_, n) => `noelie${String(n).padStart(3, '0')}`)
		);
		expect(pickChildLoginId('noelie', taken, () => 0)).toBe('noelie999');
	});

	it('passe à quatre chiffres quand les mille sont pris (jamais de refus)', () => {
		const taken = new Set(
			Array.from({ length: 1000 }, (_, n) => `noelie${String(n).padStart(3, '0')}`)
		);
		expect(pickChildLoginId('noelie', taken, () => 0.5)).toBe('noelie5000');
	});

	it('les identifiants à deux chiffres déjà donnés ne gênent pas', () => {
		expect(pickChildLoginId('noelie', new Set(['noelie42']), () => 0.042)).toBe('noelie042');
	});
});

describe('childAccountEmail', () => {
	it("donne l'adresse du domaine fictif, que normalizeLoginIdentifier retrouve", () => {
		expect(childAccountEmail('noelie42')).toBe(`noelie42@${CHILD_ACCOUNT_DOMAIN}`);
		expect(normalizeLoginIdentifier('Noélie42')).toBe(childAccountEmail('noelie42'));
	});
});

describe('childLoginIdOf', () => {
	it("rend l'identifiant d'une adresse du domaine fictif, null sinon", () => {
		expect(childLoginIdOf(`noelie42@${CHILD_ACCOUNT_DOMAIN}`)).toBe('noelie42');
		expect(childLoginIdOf(`Noelie42@${CHILD_ACCOUNT_DOMAIN.toUpperCase()}`)).toBe('noelie42');
		expect(childLoginIdOf('eleve@exemple.fr')).toBeNull();
		expect(childLoginIdOf(null)).toBeNull();
	});
});
