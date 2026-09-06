import { describe, expect, it } from 'vitest';
import { asNotebookContent } from '../notebook';

/**
 * `python_notebooks.content` est une colonne jsonb. Les deux routes de
 * duplication la castaient — une affirmation sur toute la structure du
 * notebook, jamais vérifiée. Un notebook aux cellules manquantes aurait été
 * recopié en coquille vide, sans que rien ne le signale.
 */
describe('asNotebookContent', () => {
	it('accepte un notebook complet', () => {
		const contenu = asNotebookContent({
			version: '1.0',
			metadata: { title: 'Suites', created_at: '', updated_at: '' },
			cells: [{ id: 'c1', type: 'code', source: 'print(1)' }]
		});

		expect(contenu?.cells).toHaveLength(1);
	});

	it('refuse une version inconnue', () => {
		expect(asNotebookContent({ version: '2.0', metadata: {}, cells: [] })).toBeNull();
	});

	it('refuse un notebook sans cellules exploitables', () => {
		expect(asNotebookContent({ version: '1.0', metadata: {} })).toBeNull();
		expect(asNotebookContent({ version: '1.0', metadata: {}, cells: 'aucune' })).toBeNull();
	});

	it('refuse un notebook sans métadonnées', () => {
		expect(asNotebookContent({ version: '1.0', cells: [] })).toBeNull();
	});

	it('refuse toute valeur qui n’est pas un objet', () => {
		expect(asNotebookContent(null)).toBeNull();
		expect(asNotebookContent('notebook')).toBeNull();
		expect(asNotebookContent([{ version: '1.0' }])).toBeNull();
	});
});
