/**
 * Avertissement à la création d'un contrôle (outil 49, Q1) : les modèles de la série qui
 * ont une case Python (jugée dans le navigateur seulement) n'entreront pas dans le contrôle.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pythonTemplateTitles } from '../series-python-cases';
import { createFakeSupabase } from './helpers/fake-supabase';

const PYTHON_ID = '4d5e6f70-4444-4444-8444-444444444444';
const AUTRE_ID = '5e6f7081-5555-4555-8555-555555555555';
const PYTHON =
	'```python-a-ecrire\nfonction: f\nsolution: |\n  def f(x):\n      return x\nessais: f(1)\n```';

beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('pythonTemplateTitles', () => {
	it('les titres des modèles à case Python, dans l’ordre de la série, sans doublon', async () => {
		const fake = createFakeSupabase(() => ({
			data: [
				{ id: AUTRE_ID, title: 'Tables', shared: null, variations: [{ statement: '2 × 3 = [_]' }] },
				{
					id: PYTHON_ID,
					title: 'Fonction seuil',
					shared: null,
					variations: [{ statement: PYTHON }]
				}
			]
		}));
		const items = [
			{ templateId: PYTHON_ID, quantity: 1, delay: 60 },
			{ templateId: AUTRE_ID, quantity: 2, delay: 20 },
			{ templateId: PYTHON_ID, quantity: 1, delay: 60 }
		];
		expect(await pythonTemplateTitles(fake.client, items)).toEqual(['Fonction seuil']);
	});

	it('lecture en échec : aucun avertissement, jamais une page cassée', async () => {
		const fake = createFakeSupabase(() => ({ error: { message: 'panne' } }));
		const items = [{ templateId: PYTHON_ID, quantity: 1, delay: 60 }];
		expect(await pythonTemplateTitles(fake.client, items)).toEqual([]);
	});

	it('série vide : rien à lire', async () => {
		const fake = createFakeSupabase(() => ({ data: [] }));
		expect(await pythonTemplateTitles(fake.client, [])).toEqual([]);
		expect(fake.queries).toHaveLength(0);
	});
});
