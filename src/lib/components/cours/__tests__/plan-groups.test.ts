import { describe, it, expect } from 'vitest';
import { documentKind, groupPlanItems } from '../plan-groups';

const isRow = (s: string) => s.startsWith('doc');

describe('groupPlanItems', () => {
	it('regroupe les lignes consécutives dans un même groupe', () => {
		expect(groupPlanItems(['doc1', 'doc2'], isRow)).toEqual([
			{ kind: 'rows', items: ['doc1', 'doc2'] }
		]);
	});

	it('garde l’ordre : un bloc coupe les lignes en deux groupes', () => {
		expect(groupPlanItems(['doc1', 'serie', 'doc2', 'doc3'], isRow)).toEqual([
			{ kind: 'rows', items: ['doc1'] },
			{ kind: 'block', item: 'serie' },
			{ kind: 'rows', items: ['doc2', 'doc3'] }
		]);
	});

	it('deux blocs de suite restent deux blocs', () => {
		expect(groupPlanItems(['serie', 'objectifs'], isRow)).toEqual([
			{ kind: 'block', item: 'serie' },
			{ kind: 'block', item: 'objectifs' }
		]);
	});

	it('liste vide : aucun groupe', () => {
		expect(groupPlanItems([], isRow)).toEqual([]);
	});
});

describe('documentKind', () => {
	it('Drive avant le type de fichier', () => {
		expect(documentKind('google_drive', 'application/pdf')).toBe('drive');
	});

	it('PDF, image, vidéo, autre', () => {
		expect(documentKind('upload', 'application/pdf')).toBe('pdf');
		expect(documentKind('upload', 'image/jpeg')).toBe('image');
		expect(documentKind('upload', 'video/mp4')).toBe('video');
		expect(documentKind('upload', 'application/msword')).toBe('file');
		expect(documentKind('upload', null)).toBe('file');
	});
});
