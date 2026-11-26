/**
 * Version d'un exercice dans une fiche (ADR 0044, points 5 et 6) — ce que la ligne affiche
 */
import { describe, it, expect } from 'vitest';
import {
	lineVersionState,
	versionChangeConfirmation,
	versionOptionLabel,
	type LineVersionChoice
} from '../line-version.ts';

const V1 = { id: 'v1', number: 1, note: null, created_at: '2026-11-20T10:00:00Z' };
const V2 = {
	id: 'v2',
	number: 2,
	note: 'question b) reformulée',
	created_at: '2026-11-25T10:00:00Z'
};
const V3 = { id: 'v3', number: 3, note: null, created_at: '2026-11-26T10:00:00Z' };

function choice(current: string): LineVersionChoice {
	return { current_version_id: current, versions: [V1, V2, V3] };
}

describe('lineVersionState', () => {
	it('fiche restée en v2 : une version plus récente existe (v3)', () => {
		const state = lineVersionState(choice('v2'));
		expect(state?.current.number).toBe(2);
		expect(state?.latest.number).toBe(3);
		expect(state?.isLatest).toBe(false);
	});

	it('fiche à la dernière version : rien à proposer', () => {
		expect(lineVersionState(choice('v3'))?.isLatest).toBe(true);
	});

	it('versions dans le désordre : la dernière reste le plus grand numéro', () => {
		const state = lineVersionState({ current_version_id: 'v1', versions: [V3, V1, V2] });
		expect(state?.latest.id).toBe('v3');
	});

	it('version de la ligne absente de la liste (supprimée entre-temps) : null', () => {
		expect(lineVersionState(choice('autre'))).toBeNull();
	});
});

describe('versionOptionLabel', () => {
	it('numéro, note et date', () => {
		expect(versionOptionLabel(V2, 3)).toBe('v2 · question b) reformulée · 25/11/2026');
	});

	it('la dernière le dit, sans note', () => {
		expect(versionOptionLabel(V3, 3)).toBe('v3 (la plus récente) · 26/11/2026');
	});
});

describe('versionChangeConfirmation', () => {
	it('sans affectation : direct, aucune confirmation', () => {
		expect(versionChangeConfirmation(0)).toBeNull();
	});

	it('une affectation en cours : singulier', () => {
		expect(versionChangeConfirmation(1)).toBe(
			'1 affectation en cours : les élèves verront la nouvelle rédaction à leur prochaine ouverture.'
		);
	});

	it('plusieurs affectations : pluriel', () => {
		expect(versionChangeConfirmation(2)).toBe(
			'2 affectations en cours : les élèves verront la nouvelle rédaction à leur prochaine ouverture.'
		);
	});
});
