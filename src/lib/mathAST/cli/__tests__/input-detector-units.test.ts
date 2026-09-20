/**
 * Détection de format : les unités qui ne commencent pas par une lettre ASCII.
 *
 * Trouvé en exerçant le REPL web après le chantier des grandeurs :
 * `.simplify 30[°C]-20[°C]` répondait « Unexpected token: [ », alors que le
 * parseur maison lit cette écriture sans broncher. C'est `detectInputFormat`
 * qui l'envoyait au parseur LaTeX : sa regex d'unité exigeait `[a-zA-Z]` en
 * première position, donc `°C`, `°F`, `°` et `€` n'étaient pas reconnus.
 *
 * Même famille que le bug des noms de fonction collés (relevé §6.2) : une
 * écriture parfaitement lisible refusée par le portier, pas par le parseur.
 */

import { describe, it, expect } from 'vitest';
import { detectInputFormat } from '../core/input-detector';
import { parse } from '../core/pipeline';

describe('unités dont le symbole n’est pas une lettre ASCII', () => {
	it.each(['20[°C]', '30[°C]-20[°C]', '20[°C]+5[K]', '20[°F]', '2[°]', '5[€]', '3[μm]', 'x[°C]'])(
		'%s est de la syntaxe maison',
		(input) => {
			const result = detectInputFormat(input);
			expect(result.format).toBe('custom');
			expect(result.confidence).toBeGreaterThan(0.8);
		}
	);

	it.each(['20[°C]', '30[°C]-20[°C]', '20[°C]+5[K]', '2[°]'])(
		'%s se parse sans erreur',
		(input) => {
			const { ast, errors } = parse(input);
			expect(errors).toHaveLength(0);
			expect(ast).toBeDefined();
		}
	);
});

describe('les unités ASCII continuent de marcher', () => {
	it.each(['12[km]', '20[K]', '5[m/s]', '2[m^2]', '5[kg.m/s^2]', '1/2[m]', 'x[kg]'])(
		'%s est de la syntaxe maison',
		(input) => {
			expect(detectInputFormat(input).format).toBe('custom');
		}
	);
});

describe('un crochet qui n’est pas une unité n’en devient pas une', () => {
	// Comportement figé avant correctif : ces écritures partent au parseur LaTeX,
	// qui sait lire les matrices et les indices.
	it.each(['[[1,2],[3,4]]', 'x[1]', 'x_[1]', '2[3]'])('%s reste du LaTeX', (input) => {
		expect(detectInputFormat(input).format).toBe('latex');
	});

	it('une commande LaTeX explicite reste du LaTeX', () => {
		expect(detectInputFormat('\\sqrt[3]{x}').format).toBe('latex');
		expect(detectInputFormat('20\\unit{km}').format).toBe('latex');
	});
});
