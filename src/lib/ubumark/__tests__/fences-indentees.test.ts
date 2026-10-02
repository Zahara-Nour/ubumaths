/**
 * Fences indentées hors d'une liste (Q56-Q58, 2026-10-02).
 *
 * Avant : hors d'une liste, une fence n'ouvrait un bloc de code que collée à
 * la marge ; avec un retrait, le bloc s'affichait en texte, backticks visibles.
 *
 * - Q56 : 1 à 3 espaces (CommonMark), le code perd ce retrait ; 4 espaces ou
 *   une tabulation → texte, inchangé.
 * - Q57 : une fence indentée jamais fermée reste du texte (elle n'avale pas la
 *   suite du document).
 * - Q58 : les blocs spéciaux indentés (```courbe…) restent du texte.
 * - Q59 : seule une fence ELLE AUSSI indentée la ferme, et toutes les lignes
 *   non vides entre les deux sont indentées ; une ligne à la marge abandonne
 *   (texte, comme avant). Le bloc reconnu est ramené à la marge AVANT tout le
 *   reste : le parseur le lit comme un bloc à la marge d'aujourd'hui.
 *
 * Une 1re version, branchée sur l'appariement par rang des deux repérages de
 * blocs (formules remplacées / texte original), avalait du texte : la revue
 * en a reproduit cinq cas, gardés ci-dessous.
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdown, type BlockNode } from '$lib/ubumark';

const children = (markdown: string) => parseMarkdown(markdown).children as BlockNode[];
const types = (markdown: string) => children(markdown).map((c) => c.type);
const codeOf = (node: BlockNode | undefined) => node as { code?: string; language?: string };

describe('Q56 — une fence indentée de 1 à 3 espaces ouvre un bloc de code', () => {
	it('2 espaces : un paragraphe, puis un bloc ts dont le code perd le retrait', () => {
		const nodes = children('texte\n\n  ```ts\n  x\n    y\n  ```');

		expect(nodes.map((n) => n.type)).toEqual(['paragraph', 'code-block']);
		expect(codeOf(nodes[1])).toMatchObject({ language: 'ts', code: 'x\n  y' });
	});

	it('3 espaces, et des tildes', () => {
		const nodes = children('texte\n\n   ~~~py\n   x\n   ~~~');

		expect(codeOf(nodes[1])).toMatchObject({ type: 'code-block', language: 'py', code: 'x' });
	});

	it('fence fermante plus ou moins indentée que l’ouvrante (1 à 3 espaces)', () => {
		expect(codeOf(children(' ```ts\n x\n   ```')[0])).toMatchObject({ code: 'x' });
		expect(codeOf(children('   ```ts\n   x\n ```')[0])).toMatchObject({ code: 'x' });
	});

	it('une ligne de code moins indentée que la fence : rien n’est coupé', () => {
		expect(codeOf(children('   ```ts\n x\n   ```')[0])).toMatchObject({ code: 'x' });
	});

	it('la suite du document reste lue', () => {
		expect(types('  ```ts\n  x\n  ```\n\nfin')).toEqual(['code-block', 'paragraph']);
	});
});

describe('ce qui ne change pas', () => {
	it('4 espaces ou une tabulation : texte', () => {
		expect(types('texte\n\n    ```ts\n    x\n    ```')).not.toContain('code-block');
		expect(types('texte\n\n\t```ts\n\tx\n\t```')).not.toContain('code-block');
	});

	it('Q59 — fermante à la marge : texte, comme avant', () => {
		// Le ``` nu final ouvre un bloc à la marge (vide), comme sur main
		const nodes = children('  ```ts\n  x\n```');
		expect(nodes.some((n) => codeOf(n).language === 'ts')).toBe(false);
		expect(JSON.stringify(nodes)).toContain('```ts');
	});

	it('Q57 — fence indentée jamais fermée : texte, la suite intacte', () => {
		const nodes = children('  ```ts\n  x\n\n## Titre\n\nfin');

		expect(nodes.map((n) => n.type)).not.toContain('code-block');
		expect(nodes.map((n) => n.type)).toContain('heading');
	});

	it('Q58 — bloc spécial indenté : pas un bloc de code', () => {
		expect(types('  ```courbe\n  f(x) = x\n  ```')).not.toContain('code-block');
		expect(types('  ```barres\n  A = 1\n  ```')).not.toContain('code-block');
	});

	it('dans une liste : lecture inchangée, le code une seule fois', () => {
		const nodes = children('- a\n\n  ```ts\n  x\n  ```');

		expect(nodes.map((n) => n.type)).toEqual(['list']);
		expect(JSON.stringify(nodes).split('"code":"x"').length - 1).toBe(1);
	});

	it('dans le code d’un bloc à la marge : intact', () => {
		expect(codeOf(children('```md\n  ```ts\n  x\n  ```\n```')[0])).toMatchObject({
			code: '  ```ts\n  x\n  ```'
		});
	});

	it('témoin : une fence à la marge', () => {
		expect(codeOf(children('```ts\n  x\n```')[0])).toMatchObject({ code: '  x' });
	});
});

// Empreinte : un guide SQL (`$$` de Postgres) faisait avaler du texte par un
// bloc de code — un `$$` pris pour une formule chevauche les fences, et
// l'appariement par rang des deux repérages se décale
describe('un `$$` qui chevauche des fences indentées', () => {
	it('le document garde sa lecture d’avant, rien n’est avalé', () => {
		const md = [
			'texte',
			'',
			'  ```sql',
			'  x $$;',
			'  ```',
			'',
			'milieu',
			'',
			'  ```sql',
			'  y $$;',
			'  ```',
			'',
			'  ```sql',
			'  w',
			'  ```',
			'',
			'## Suite',
			'',
			'fin'
		].join('\n');

		const all = JSON.stringify(children(md));
		expect(all).toContain('milieu');
		expect(types(md)).toContain('heading');
	});
});

// Les cinq cas de la revue de la 1re version : sur main, rien n'est avalé
describe('rien n’est avalé (revue)', () => {
	it('A — texte puis ```py à la marge après une fence indentée non fermée', () => {
		const md = '  ```ts\n  x\n\ntexte milieu\n\n```py\ncode\n```\n\nfin';
		const nodes = children(md);

		expect(JSON.stringify(nodes)).toContain('texte milieu');
		expect(nodes.find((n) => n.type === 'code-block')).toMatchObject({ code: 'code' });
		expect(JSON.stringify(nodes.at(-1))).toContain('fin');
	});

	it('B — un ``` nu à la marge ouvre un bloc, comme avant', () => {
		const md = '  ```ts\n  x\n\ntexte\n\n```\ncode\n```\n\n## Titre\n\nfin';

		expect(types(md)).toContain('heading');
		expect(children(md).find((n) => n.type === 'code-block')).toMatchObject({ code: 'code' });
	});

	it('C — un ```variation à la marge n’est pas avalé', () => {
		const md = '  ```ts\n  x\n\n```variation\nx | -inf | +inf\n```\n\nfin';

		// Aucun bloc ts (la fence n'est pas fermée) ; le ```variation, invalide,
		// montre sa source depuis Q64 au lieu de disparaître
		const blocks = children(md).filter((n) => n.type === 'code-block');
		expect(blocks.map((n) => codeOf(n).language)).toEqual(['variation']);
		expect(JSON.stringify(children(md).at(-1))).toContain('fin');
	});

	it('D — fence indentée de liste fermée plus loin : le ```py suivant reste un bloc', () => {
		const md = '- item\n\n  ```ts\n  x\n    ```\n\nparagraphe\n\n```py\ncode\n```\n\nfin';

		expect(children(md).find((n) => n.type === 'code-block')).toMatchObject({
			language: 'py',
			code: 'code'
		});
	});

	it('$$ qui fait disparaître une ligne de fence : tout reste visible', () => {
		const md = [
			'texte',
			'',
			'  ```',
			'  x $$',
			'  ```',
			'  y $$',
			'  ```',
			'  z',
			'  ```',
			'PARAGRAPHE IMPORTANT',
			'  ```'
		].join('\n');
		const all = JSON.stringify(children(md));

		expect(all).toContain('PARAGRAPHE IMPORTANT');
		expect(all.split('  z').length + all.split('"z"').length - 2).toBe(1);
	});
});

// 2e revue : une formule bloc sur plusieurs lignes AVANT la fermante replie des
// lignes dans l'extraction des formules → les blocs gardent la lecture d'avant
describe('formule bloc sur plusieurs lignes (2e revue)', () => {
	it('$$ qui enjambe le bloc : le bloc py suivant garde son code', () => {
		for (const md of [
			'$$ a\n\n  ```ts\n  x\n  ```\n\nb $$\n\n```py\ny\n```\n\nfin',
			'~~ a\n\n  ```ts\n  x\n  ```\n\nb ~~\n\n```py\ny\n```\n\nfin'
		]) {
			const code = children(md).find((n) => n.type === 'code-block');
			expect(code, md).toMatchObject({ language: 'py', code: 'y' });
		}
	});

	it('$$ dans la ligne d’info de l’ouvrante : rien n’est avalé', () => {
		const md = '  ```sql $$\n  x\n  ```\n\nmilieu\n\n```py\ny $$\n```\n\nfin';
		const all = JSON.stringify(children(md));

		expect(all).toContain('milieu');
		// Depuis Q65, le `$$` du bloc py (fermé) ne compte plus : la fence
		// indentée devient un bloc, et chaque bloc garde SON code
		const blocks = children(md).filter((n) => n.type === 'code-block');
		expect(blocks.map((n) => codeOf(n).code)).toEqual(['x', 'y $$']);
	});

	it('formule sur plusieurs lignes dans une liste : la liste n’est pas scindée', () => {
		const nodes = children('1. a $$x\n\ny$$\n   ```ts\n   x\n   ```\n2. b');

		expect(nodes.map((n) => n.type)).toEqual(['list']);
	});

	it('après la formule, une fence indentée reste du texte (lecture d’avant)', () => {
		expect(types('$$\na\n$$\n\n  ```ts\n  x\n  ```')).not.toContain('code-block');
	});

	it('avant la formule, elle est bien ramenée', () => {
		expect(types('  ```ts\n  x\n  ```\n\n$$\na\n$$')).toContain('code-block');
	});
});

describe('lu comme la même fence à la marge', () => {
	it('collée à un paragraphe, sans ligne vide', () => {
		const strip = (md: string) => JSON.stringify(parseMarkdown(md));
		expect(strip('texte\n  ```ts\n  x\n  ```\nsuite')).toBe(strip('texte\n```ts\nx\n```\nsuite'));
	});
});

// 3e revue
describe('fences que l’extraction des formules modifierait', () => {
	it('A — `~~~ a~` : la suite du document n’est pas avalée', () => {
		const md = 'texte\n\n  ~~~ a~\n  x\n  ~~~\n\n```py\ny\n```\n\n```js\nz\n```\n\nfin';
		const codes = children(md).filter((n) => n.type === 'code-block');

		expect(codes.map((n) => codeOf(n).code)).toEqual(['y', 'z']);
		expect(JSON.stringify(children(md).at(-1))).toContain('fin');
	});

	it('C — backtick dans l’info d’une fence en backticks : pas une fence', () => {
		expect(types('  ```ts ```\n  x\n  ```\n\nmilieu')).not.toContain('code-block');
	});
});

it('performance : ouvrantes jamais fermées sur 32 000 lignes indentées', () => {
	const md = 'texte\n\n' + Array.from({ length: 16_000 }, () => '  ```a\n  x').join('\n');
	const start = performance.now();
	parseMarkdown(md);

	expect(performance.now() - start).toBeLessThan(1500);
});

// 2e revue : 200 listes, 200 blocs, 4000 ouvrantes jamais fermées → 8,7 s
it('performance : un long document reste rapide', () => {
	const md = [
		...Array.from({ length: 200 }, (_, k) => `- item ${k}\n\n\`\`\`\ncode\n\`\`\`\n`),
		...Array.from({ length: 4000 }, () => '  ```a')
	].join('\n');
	const start = performance.now();
	parseMarkdown(md);

	expect(performance.now() - start).toBeLessThan(1500);
});
