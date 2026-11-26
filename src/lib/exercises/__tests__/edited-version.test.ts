import { describe, it, expect } from 'vitest';
import {
	latestOf,
	pickEditedVersion,
	requestedVersionNumber
} from '#lib/exercises/edited-version.ts';

const V1 = { id: 'v1', number: 1 };
const V2 = { id: 'v2', number: 2 };
const V3 = { id: 'v3', number: 3 };
const VERSIONS = [V1, V3, V2];

describe('requestedVersionNumber', () => {
	it('lit un numéro entier positif', () => {
		expect(requestedVersionNumber(new URLSearchParams('version=2'))).toBe(2);
	});

	it.each(['', '0', '-1', '2.5', 'abc', '1e3', '9999999'])('« %s » : aucun numéro', (raw) => {
		expect(requestedVersionNumber(new URLSearchParams({ version: raw }))).toBeNull();
	});

	it('absent : aucun numéro', () => {
		expect(requestedVersionNumber(new URLSearchParams())).toBeNull();
	});
});

describe('pickEditedVersion', () => {
	it('sans rien demander : la plus récente, quel que soit l’ordre reçu', () => {
		expect(pickEditedVersion(VERSIONS, { number: null, worksheetVersionId: null })).toBe(V3);
		expect(latestOf(VERSIONS)).toBe(V3);
	});

	it('le numéro demandé', () => {
		expect(pickEditedVersion(VERSIONS, { number: 1, worksheetVersionId: null })).toBe(V1);
	});

	it('depuis une fiche : la version de la fiche', () => {
		expect(pickEditedVersion(VERSIONS, { number: null, worksheetVersionId: 'v2' })).toBe(V2);
	});

	it('le numéro demandé l’emporte sur la fiche', () => {
		expect(pickEditedVersion(VERSIONS, { number: 1, worksheetVersionId: 'v2' })).toBe(V1);
	});

	it('numéro inconnu, version de fiche inconnue : la plus récente', () => {
		expect(pickEditedVersion(VERSIONS, { number: 9, worksheetVersionId: 'autre' })).toBe(V3);
	});

	it('aucune version : null', () => {
		expect(pickEditedVersion([], { number: null, worksheetVersionId: null })).toBeNull();
	});
});
