/**
 * Taille commune aux choix d'un QCM de monnaie (`monnaieChoiceSize`)
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { monnaieChoiceSize } from '../../utils/monnaie-choix';
import { buildMonnaieScene, MONNAIE_VIEW } from '../../utils/monnaie-scene';
import { parseMonnaieContent } from '../../parser/monnaie-parser';

const bloc = (lignes: string) => `\`\`\`monnaie\n${lignes}\n\`\`\``;
const ratio = (lignes: string) =>
	buildMonnaieScene(parseMonnaieContent(lignes).spec!, 0).width / MONNAIE_VIEW.fullWidth;

describe('monnaieChoiceSize', () => {
	it('sans pièces ni billets : 10 cm', () => {
		expect(monnaieChoiceSize(['Léa', 'Tom'])).toBe('10cm');
	});

	it('réduit tous les choix d’après le plus LARGE, pour une même échelle', () => {
		const large = 'billets: 10 10 5\npièces: 2 2';
		const etroit = 'billets: 10 5\npièces: 2';
		expect(ratio(large)).toBeGreaterThan(ratio(etroit));
		const r = Number(ratio(large).toFixed(4));
		expect(monnaieChoiceSize([bloc(etroit), bloc(large), bloc(etroit)])).toBe(
			`min(10cm, calc(100cqw / ${r}))`
		);
	});

	it('plusieurs ensembles dans un bloc : le plus large compte', () => {
		const r = Number(ratio('billets: 50 20 20 10').toFixed(4));
		expect(monnaieChoiceSize([bloc('billets: 5 ; 50 20 20 10')])).toBe(
			`min(10cm, calc(100cqw / ${r}))`
		);
	});

	it('un bloc à `taille:` donnée garde sa taille et ne compte pas', () => {
		expect(monnaieChoiceSize([bloc('billets: 50 20 20 10\ntaille: 4cm')])).toBe('10cm');
	});

	it('un bloc en erreur ne compte pas', () => {
		expect(monnaieChoiceSize([bloc('billets: 3')])).toBe('10cm');
	});
});
