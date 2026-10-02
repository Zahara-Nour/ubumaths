/**
 * Le parseur avance toujours (Q55, 2026-10-02).
 *
 * Avant : le repli « paragraphe » de `parseBlocks` s'arrêtait sur une ligne
 * qu'aucun bloc n'avait prise (ligne de tableau sans ligne d'alignement,
 * ``` indenté…) ; rien n'était consommé et la boucle repartait sur la même
 * ligne, sans fin. Un énoncé figeait l'onglet de l'élève ou la génération du
 * PDF. Trouvé en mesurant #620 : 7 .md du dépôt bouclaient.
 *
 * ⚠️ Sans le correctif ces tests ne rougissent pas : ils BLOQUENT le processus
 * (boucle synchrone, le délai de vitest ne se déclenche pas). En CI, un retour
 * du bug se verrait comme un job de tests serveur muet, coupé à 15 min.
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdown, type BlockNode } from '$lib/ubumark';

const types = (markdown: string) => parseMarkdown(markdown).children.map((c) => c.type);

const textOf = (node: BlockNode) => JSON.stringify(node);

/** Le texte, tel qu'il apparaît échappé dans l'AST sérialisé */
const escaped = (text: string) => JSON.stringify(text).slice(1, -1);

describe('le parseur avance toujours', () => {
	it('`| a |` seul : un paragraphe, affiché tel quel', () => {
		const children = parseMarkdown('| a |').children;

		expect(children.map((c) => c.type)).toEqual(['paragraph']);
		expect(textOf(children[0])).toContain('| a |');
	});

	it('``` indenté après un paragraphe : plus de blocage, rien de perdu', () => {
		const children = parseMarkdown('texte\n\n  ```ts\n  x\n  ```').children;

		// Un bloc de code depuis Q56 (avant : du texte, backticks visibles)
		expect(children.map((c) => c.type)).toEqual(['paragraph', 'code-block']);
		expect(children[1]).toMatchObject({ code: 'x', language: 'ts' });
	});

	it('item de liste dont le code indenté contient une tabulation', () => {
		const children = parseMarkdown('- a\n\n  ```ts\n  \tx\n  ```').children;

		expect(children.map((c) => c.type)).toEqual(['list', 'paragraph', 'paragraph']);
		expect(textOf(children[1])).toContain(escaped('\tx'));
	});

	it('témoins : un vrai tableau et un vrai bloc de code se lisent comme avant', () => {
		expect(types('| a | b |\n| - | - |\n| 1 | 2 |')).toEqual(['table']);
		expect(types('```ts\nx\n```')).toEqual(['code-block']);
		expect(types('- a\n\n  ```ts\n  x\n  ```')).toEqual(['list']);
	});
});
