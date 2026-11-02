/**
 * Bloc ```variation à cases cachées (`?`) dans l'éditeur riche : le `?` survit
 * à l'aller-retour (la structure ubumark range la valeur sans `?`).
 */
import { describe, expect, it } from 'vitest';
import { markdownToTipTap } from '../markdown-import';
import { tipTapToMarkdown } from '../markdown-export';

const MD = [
	'```variation',
	'variable: x',
	'domain: -inf, ?-3, 2, +inf',
	'',
	'sign: f(x)',
	'  -inf,-3: ?-',
	'  -3: ?z',
	'  -3,2: +',
	'  2: ?rien',
	'  2,+inf: -',
	'```'
].join('\n');

describe('bloc ```variation à cases cachées — éditeur riche', () => {
	it('garde les ? dans le contenu du nœud', () => {
		const json = markdownToTipTap(MD);
		const content = json.content?.[0]?.attrs?.content as string;
		expect(content).toContain('domain: -inf, ?-3, 2, +inf');
		expect(content).toContain('-inf,-3: ?-');
		expect(content).toContain('2: ?rien');
	});

	it('repart en ```variation identique', () => {
		expect(tipTapToMarkdown(markdownToTipTap(MD)).trim()).toBe(MD);
	});

	it('un tableau sans ? passe toujours par la sérialisation de la structure', () => {
		const md = '```variation\nvariable: x\ndomain: -inf, 0, +inf\n\nsign: f(x)\n  0: z\n```';
		const content = markdownToTipTap(md).content?.[0]?.attrs?.content as string;
		expect(content).toContain('domain: -inf, 0, +inf');
	});
});
