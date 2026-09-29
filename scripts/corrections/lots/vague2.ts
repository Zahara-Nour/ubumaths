/**
 * Lots « vague2-brouillons » / « vague2-publies » : numération et calcul décimal
 * =============================================================================
 *
 * Classement : docs/wip/corrections-manquantes-frontiere.md, codes R-X10,
 * R-DEC-RANG, N-COMPARER-ENT, N-COMPARER-DEC, N-ESPACES, N-ZEROS, N-DIVEUCL.
 * Répartition selon le statut en prod (lecture seule, 2026-09-29) : `draft` →
 * `vague2-brouillons`, `published` → `vague2-publies`.
 *
 * Les stratégies R sont rédigées ici modèle par modèle, à partir de la STRUCTURE
 * réelle de chaque variation (variables relues en prod) : il n'y a pas de forme
 * commune assez régulière pour un générateur (opérande et puissance tantôt
 * variables, tantôt littérales ; sommes à 1 ou 2 décimales, avec ou sans retenue).
 *
 * Écartés (le vérificateur ne peut pas les valider, cf. rapport de la vague) :
 * modèles sans variable d'expression (N-POSITION, N-DIVISEUR, N-GRADUATION,
 * 1 N-ENCADR), trous multiples dans une inégalité ou une égalité à deux « ? »
 * (N-ENCADR, 14a51794).
 */

import type { Lot, LotEntry, WrittenCorrection } from '../lib/lot';
import { alignBlock, colored, inline } from '../lib/palette';
import { blue, orange, v } from './numeration';

// ============================================================================
// TYPES
// ============================================================================

type Power = number | { variable: string; values: number[] };

// ============================================================================
// CONSTANTS
// ============================================================================

/** Nom du rang 10^r */
const RANKS: Record<number, string> = {
	7: 'dizaines de millions',
	6: 'millions',
	5: 'centaines de milliers',
	4: 'dizaines de milliers',
	3: 'milliers',
	2: 'centaines',
	1: 'dizaines',
	0: 'unités',
	[-1]: 'dixièmes',
	[-2]: 'centièmes',
	[-3]: 'millièmes',
	[-4]: 'dix-millièmes',
	[-5]: 'cent-millièmes',
	[-6]: 'millionièmes'
};

const green = (latex: string): string => colored('conclusion', latex);

const RULE_TIMES_10 =
	'**Multiplier par $10$, $100$, $1000$.** Multiplier par $10$ rend chaque chiffre $10$ fois ' +
	"plus grand : dans le tableau de numération, chaque chiffre glisse d'un rang vers la gauche. " +
	'Par $100$, il glisse de deux rangs ; par $1000$, de trois rangs. Les rangs restés vides ' +
	"jusqu'aux unités reçoivent un $0$.";

const RULE_DIVIDE_10 =
	'**Diviser par $10$, $100$, $1000$.** Diviser par $10$ rend chaque chiffre $10$ fois plus ' +
	"petit : dans le tableau de numération, chaque chiffre glisse d'un rang vers la droite. " +
	'Par $100$, il glisse de deux rangs ; par $1000$, de trois rangs. Les rangs restés vides ' +
	'entre la virgule et le premier chiffre reçoivent un $0$.';

const RULE_DEC_ADD =
	'**Additionner des décimaux.** On additionne rang par rang : les unités avec les unités, ' +
	'les dixièmes avec les dixièmes, les centièmes avec les centièmes. $10$ dixièmes font ' +
	'$1$ unité.';

const RULE_DEC_SUB =
	'**Soustraire des décimaux.** On soustrait rang par rang : les unités des unités, les ' +
	'dixièmes des dixièmes. Quand on ne peut pas retirer les dixièmes, on échange $1$ unité ' +
	'contre $10$ dixièmes.';

const RULE_COMPARE_INT =
	'**Comparer deux entiers.** Le nombre qui a le moins de chiffres est le plus petit. ' +
	"S'ils ont autant de chiffres, on les compare chiffre par chiffre depuis la gauche : " +
	'le premier chiffre différent décide.';

const RULE_COMPARE_DEC =
	'**Comparer deux décimaux.** On compare d’abord les parties entières. Si elles sont ' +
	'égales, on compare les dixièmes, puis les centièmes… Un rang sans chiffre compte pour ' +
	'$0$ (on peut compléter par des zéros : $2.3 = 2.30$).';

const RULE_SPACES =
	'**Écrire un grand nombre.** On sépare les chiffres par groupes de trois **en partant de ' +
	'la droite** (des unités) : classe des unités, classe des milliers, classe des millions, ' +
	'classe des milliards. Le groupe de gauche peut avoir un, deux ou trois chiffres.';

const RULE_ZEROS =
	'**Zéros inutiles.** Dans un nombre entier, les zéros écrits **à gauche** du premier ' +
	'chiffre non nul ne servent à rien : on les enlève. Les autres zéros (au milieu ou à ' +
	'droite) donnent le rang des chiffres : on les garde.';

const RULE_DIVEUCL =
	'**Division euclidienne.** Diviser $N$ par $b$, c’est trouver le quotient $q$ et le ' +
	'reste $r$ tels que $N = \\left( q \\times b \\right) + r$, avec un reste plus petit que ' +
	'$b$. Le quotient est le plus grand nombre de fois que $b$ « tient » dans $N$.';

const CHOICE_CONCLUSION = 'Le plus petit des deux nombres est donc :\n\n{{solution}}';

// ============================================================================
// FUNCTIONS — R-X10
// ============================================================================

function powerLatex(power: Power): string {
	return typeof power === 'number' ? String(power) : `{{eval:10^${power.variable}}}`;
}

/** « glisse de deux rangs » ; `{{if:…}}` quand la puissance est tirée */
function byPower(power: Power, build: (shift: number) => string): string {
	if (typeof power === 'number') return build(Math.log10(power));
	const { variable, values } = power;
	return values
		.slice(0, -1)
		.reduceRight(
			(rest, value) => `{{if:${variable}=${value}|${build(value)}|${rest}}}`,
			build(values[values.length - 1])
		);
}

const SHIFT_WORDS: Record<number, string> = {
	1: "d'un rang",
	2: 'de deux rangs',
	3: 'de trois rangs'
};

/**
 * Premier chiffre (le plus à gauche) de l'opérande et son rang, avant et après le
 * glissement. `leftmost` : plus grand rang possible de l'opérande.
 */
function firstDigitSentence(
	operand: string,
	power: Power,
	times: boolean,
	ranks: { top: number; bottom: number }
): string {
	const sentence = (r: number): string => {
		// Premier chiffre : floor(x / 10^r), avec une marge contre les arrondis binaires
		const digit =
			r >= 0
				? `{{eval:floor(${operand}/${10 ** r}+1/100000)}}`
				: `{{eval:floor(${operand}*${10 ** -r}+1/100000)}}`;
		return byPower(power, (shift) => {
			const target = times ? r + shift : r - shift;
			return (
				`Le premier chiffre de ${inline(v(operand))}, ${inline(orange(digit))}, est au rang des ` +
				`${RANKS[r]}. Il glisse ${SHIFT_WORDS[shift]} vers la ${times ? 'gauche' : 'droite'} : ` +
				`il arrive au rang des ${inline(blue(`\\text{${RANKS[target]}}`))}.`
			);
		});
	};
	let text = sentence(ranks.bottom);
	for (let r = ranks.bottom + 1; r <= ranks.top; r++) {
		const threshold = r >= 0 ? String(10 ** r) : `1/${10 ** -r}`;
		text = `{{if:${operand}>=${threshold}|${sentence(r)}|${text}}}`;
	}
	return text;
}

/**
 * × ou : par une puissance de 10. `powerFirst` : `10 × a` (l'ordre de l'énoncé).
 */
function rx10(options: {
	operand: string;
	power: Power;
	times: boolean;
	powerFirst?: boolean;
	ranks: { top: number; bottom: number };
}): string[] {
	const { operand, power, times, powerFirst = false, ranks } = options;
	const op = times ? '\\times' : '\\div';
	const posed = powerFirst
		? `${powerLatex(power)} ${op} ${v(operand)}`
		: `${v(operand)} ${op} ${powerLatex(power)}`;
	return [
		times ? RULE_TIMES_10 : RULE_DIVIDE_10,
		firstDigitSentence(operand, power, times, ranks),
		alignBlock([`${posed} &= {{solution}}`])
	];
}

function shared(steps: string[], notes: string[] = []): () => WrittenCorrection {
	return () => ({ steps: { shared: steps }, notes });
}

function byVariation(steps: string[][], notes: string[] = []): () => WrittenCorrection {
	return () => ({ steps: { byVariation: steps }, notes });
}

// ============================================================================
// FUNCTIONS — R-DEC-RANG
// ============================================================================

/** `{{eval:b/10;d}}` : dixièmes d'un chiffre */
const tenth = (name: string): string => `{{eval:${name}/10;d}}`;
const hundredth = (name: string): string => `{{eval:${name}/100;d}}`;

/**
 * a.b + d.f (un chiffre après la virgule), avec ou sans retenue sur les dixièmes.
 * `ab`/`df` : variables des nombres posés (`c`, `g`).
 */
function decimalSumOneDigit(): string[] {
	return [
		RULE_DEC_ADD,
		`Unités : ${inline(`${orange('{{a}}')} + ${orange('{{d}}')} = {{eval:a+d}}`)}. ` +
			`Dixièmes : ${inline(`${orange('{{b}}')} + ${orange('{{f}}')} = {{eval:b+f}}`)} dixièmes` +
			`{{if:b+f>=10|, soit ${inline(blue('1'))} unité et ${inline('{{eval:b+f-10}}')} dixième{{if:b+f-10>1|s|}}|}}.`,
		alignBlock([
			'{{c}} + {{g}}' +
				` &= \\left( ${orange('{{a}}')} + ${orange('{{d}}')} \\right) + \\left( ${orange(tenth('b'))} + ${orange(tenth('f'))} \\right)`,
			`&= {{eval:a+d}} + ${blue('{{eval:(b+f)/10;d}}')}`,
			'&= {{solution}}'
		])
	];
}

// ============================================================================
// FUNCTIONS — comparaisons
// ============================================================================

/** Chiffre de rang 10^k d'un entier */
const digitAt = (x: string, k: number): string => `{{eval:mod(floor(${x}/${10 ** k}),10)}}`;

/**
 * Comparer deux entiers x, y (au plus `maxDigits` chiffres) : premier rang, depuis
 * la gauche, où les chiffres diffèrent ; si l'un n'a pas encore de chiffre à ce
 * rang, il a moins de chiffres.
 */
function compareIntegers(x: string, y: string, maxDigits: number): string {
	const decide = (k: number): string => {
		const fewer = (small: string, big: string): string =>
			`${inline(v(small))} a moins de chiffres que ${inline(v(big))} : ` +
			`${inline(`${green(v(small))} < ${v(big)}`)}.`;
		const same =
			`Les deux nombres ont le même nombre de chiffres. ` +
			(k === maxDigits - 1
				? ''
				: `Depuis la gauche, leurs chiffres sont les mêmes jusqu'au rang des ${RANKS[k + 1]}. `) +
			`Au rang des ${inline(blue(`\\text{${RANKS[k]}}`))}, ${inline(v(x))} a ${inline(orange(digitAt(x, k)))} ` +
			`et ${inline(v(y))} a ${inline(orange(digitAt(y, k)))} : ` +
			`{{if:${x}<${y}|${inline(`${green(v(x))} < ${v(y)}`)}|${inline(`${green(v(y))} < ${v(x)}`)}}}.`;
		if (k === 0) return same;
		return `{{if:${x}<${10 ** k}|${fewer(x, y)}|{{if:${y}<${10 ** k}|${fewer(y, x)}|${same}}}}}`;
	};
	let text = decide(0);
	for (let k = 1; k < maxDigits; k++) {
		text = `{{if:floor(${x}/${10 ** k})=floor(${y}/${10 ** k})|${text}|${decide(k)}}}`;
	}
	return text;
}

function compareIntegersChoice(x: string, y: string, maxDigits: number): WrittenCorrection {
	return {
		steps: { shared: [RULE_COMPARE_INT, compareIntegers(x, y, maxDigits), CHOICE_CONCLUSION] },
		notes: []
	};
}

/**
 * Deux décimaux de même partie entière, au plus deux décimales : dixièmes, puis
 * centièmes (en centièmes entiers : round(100·x), sans arrondi binaire).
 */
function compareDecimalsSameUnits(x: string, y: string, units: string): string {
	const hx = `round(100*${x})`;
	const hy = `round(100*${y})`;
	const tenths = (n: string): string => `{{eval:mod(floor(${n}/10),10)}}`;
	const hundredths = (n: string): string => `{{eval:mod(${n},10)}}`;
	const conclusion = `{{if:${x}<${y}|${inline(`${green(v(x))} < ${v(y)}`)}|${inline(`${green(v(y))} < ${v(x)}`)}}}`;
	return (
		`Les parties entières sont égales (${inline(v(units))}). ` +
		`{{if:floor(${hx}/10)=floor(${hy}/10)|` +
		`Les dixièmes sont les mêmes (${inline(tenths(hx))}). On compare les ${inline(blue('\\text{centièmes}'))} : ` +
		`${inline(v(x))} en a ${inline(orange(hundredths(hx)))}, ${inline(v(y))} en a ${inline(orange(hundredths(hy)))}` +
		`{{if:mod(${hx},10)=0| (pas de chiffre écrit : ${inline('0')})|}}{{if:mod(${hy},10)=0| (pas de chiffre écrit : ${inline('0')})|}} : ${conclusion}.|` +
		`On compare les ${inline(blue('\\text{dixièmes}'))} : ${inline(v(x))} en a ${inline(orange(tenths(hx)))}, ` +
		`${inline(v(y))} en a ${inline(orange(tenths(hy)))} : ${conclusion}.}}`
	);
}

/**
 * Entier écrit par groupes de trois chiffres (`\\,` entre deux groupes), au plus
 * `maxDigits` chiffres ; groupes intérieurs complétés par des zéros ; le groupe
 * des unités (celui par lequel on commence) en orange.
 */
function spacedNumber(n: string, digitCount: number | string): string {
	// Une condition ne peut pas nommer `expression` (variable d'expression, non
	// évaluée à la génération) : on branche sur le NOMBRE DE CHIFFRES (`a` ou fixe)
	const maxDigits = typeof digitCount === 'number' ? digitCount : 10;
	const groups = Math.ceil(maxDigits / 3);
	// Groupe k sans `mod` sur le grand nombre : au-delà de 2^31, l'évaluateur perd
	// l'entier (« mod requires integer arguments ») ; `round` le rétablit
	const group = (k: number): string =>
		k === 0
			? `round(${n}-1000*floor(${n}/1000))`
			: `round(floor(${n}/${1000 ** k})-1000*floor(${n}/${1000 ** (k + 1)}))`;
	const padded = (k: number): string =>
		`{{eval:floor(${group(k)}/100)}}{{eval:mod((floor(${group(k)}/10)),10)}}{{eval:mod((${group(k)}),10)}}`;
	const lead = (k: number): string => `{{eval:${group(k)}}}`;
	const piece = (k: number): string => (k === 0 ? orange(padded(0)) : `${padded(k)}\\,`);
	if (typeof digitCount === 'number') {
		const top = groups - 1;
		const parts = [top === 0 ? orange(lead(0)) : `${lead(top)}\\,`];
		for (let k = top - 1; k >= 0; k--) parts.push(piece(k));
		return parts.join('');
	}
	let text = '';
	for (let k = groups - 1; k >= 0; k--) {
		// Groupe k : écrit si le nombre a plus de 3k chiffres ; en tête s'il en a au plus 3(k+1)
		const head = k === 0 ? orange(lead(0)) : `${lead(k)}\\,`;
		text += `{{if:${digitCount}>${3 * (k + 1)}|${piece(k)}|{{if:${digitCount}>${3 * k}|${head}|}}}}`;
	}
	return text;
}

// ============================================================================
// ENTRIES
// ============================================================================

const e = (templateId: string, code: string, written: () => WrittenCorrection): LotEntry => ({
	templateId,
	classe: code.startsWith('R-') ? 'R' : 'N',
	code,
	written
});

const X10_POWER_A = { variable: 'a', values: [1, 2, 3] };

const DRAFT_ENTRIES: LotEntry[] = [
	// R-X10 — décimal × 10, 100, 1000 (a = digits:p.q : jusqu'à 2 chiffres entiers, 2 décimales)
	e(
		'69f6a332-5c4f-4e85-af37-0a4e1bcd07ad',
		'R-X10',
		shared(rx10({ operand: 'a', power: 10, times: true, ranks: { top: 4, bottom: -2 } }))
	),
	e(
		'e38d205a-5737-4a0a-a9cd-aab742107c2b',
		'R-X10',
		shared(rx10({ operand: 'a', power: 100, times: true, ranks: { top: 4, bottom: -2 } }))
	),
	e(
		'19323604-1e27-4b0f-8a24-1eef76ab6e59',
		'R-X10',
		shared(rx10({ operand: 'a', power: 1000, times: true, ranks: { top: 4, bottom: -2 } }))
	),
	// 10^a × b puis b × 10^a (b : jusqu'à 3 chiffres entiers, 4 décimales)
	e(
		'819df2a9-5dd9-40c5-9525-c68e626c04b6',
		'R-X10',
		byVariation(
			[true, false].map((powerFirst) =>
				rx10({
					operand: 'b',
					power: X10_POWER_A,
					times: true,
					powerFirst,
					ranks: { top: 4, bottom: -4 }
				})
			)
		)
	),
	// R-X10 — quotients
	e(
		'0629645f-7de3-4225-8326-83c868ce8adf',
		'R-X10',
		shared(rx10({ operand: 'a', power: 10, times: false, ranks: { top: 4, bottom: -1 } }))
	),
	e(
		'590169c4-e51d-4ea1-adaa-1cc38093442f',
		'R-X10',
		shared(rx10({ operand: 'a', power: 100, times: false, ranks: { top: 4, bottom: -1 } }))
	),
	e(
		'de15a4b0-a846-40d5-acb2-7a3f0b1aa22c',
		'R-X10',
		shared(rx10({ operand: 'b', power: 1000, times: false, ranks: { top: 3, bottom: 0 } }))
	),
	e(
		'a94ddf87-4e4d-46a3-935e-e28e6a2d49df',
		'R-X10',
		shared(rx10({ operand: 'b', power: X10_POWER_A, times: false, ranks: { top: 4, bottom: -3 } }))
	),
	// R-DEC-RANG — sommes a.b + d.f
	e('3bbe92f2-84f0-487f-9ca1-2077248a313b', 'R-DEC-RANG', shared(decimalSumOneDigit())),
	e(
		'a0241952-7930-4e8a-aa6c-2a5b8bef664a',
		'R-DEC-RANG',
		shared(decimalSumOneDigit(), ['Retenue toujours présente (b + f ≥ 10).'])
	),
	e(
		'ff3ee576-e032-4c82-a428-9f49f046c313',
		'R-DEC-RANG',
		shared(decimalSumOneDigit(), ['Retenue toujours présente (b + f ≥ 10).'])
	),
	// a.b + (d + f/10 + g/100), dans les deux ordres, sans retenue
	e(
		'f1a392f5-060d-4e1c-b7a5-2920a054b83b',
		'R-DEC-RANG',
		byVariation(
			[false, true].map((swap) => {
				const [first, second] = swap ? ['{{h}}', '{{c}}'] : ['{{c}}', '{{h}}'];
				const units = swap ? ['{{d}}', '{{a}}'] : ['{{a}}', '{{d}}'];
				const tenths = swap ? [tenth('f'), tenth('b')] : [tenth('b'), tenth('f')];
				return [
					RULE_DEC_ADD,
					`Unités : ${inline(`${orange(units[0])} + ${orange(units[1])} = {{eval:a+d}}`)}. ` +
						`Dixièmes : ${inline('{{eval:b+f}}')} dixièmes. Centièmes : ${inline(orange('{{g}}'))} ` +
						`centième{{if:g>1|s|}}, seul le nombre ${inline('{{h}}')} en a.`,
					alignBlock([
						`${first} + ${second} &= \\left( ${orange(units[0])} + ${orange(units[1])} \\right) + ` +
							`\\left( ${orange(tenths[0])} + ${orange(tenths[1])} \\right) + ${orange(hundredth('g'))}`,
						`&= {{eval:a+d}} + ${blue('{{eval:(b+f)/10;d}}')} + ${hundredth('g')}`,
						'&= {{solution}}'
					])
				];
			})
		)
	),
	// R-DEC-RANG — différences
	e(
		'b100ddb2-e91d-402c-9940-012da8236d1d',
		'R-DEC-RANG',
		shared([
			RULE_DEC_SUB,
			`Unités : ${inline(`${orange('{{a}}')} - ${orange('{{d}}')} = {{eval:a-d}}`)}. ` +
				`Dixièmes : ${inline(`${orange('{{b}}')} - ${orange('{{f}}')} = {{eval:b-f}}`)}.`,
			alignBlock([
				`{{c}} - {{g}} &= \\left( ${orange('{{a}}')} - ${orange('{{d}}')} \\right) + ` +
					`\\left( ${orange(tenth('b'))} - ${orange(tenth('f'))} \\right)`,
				`&= {{eval:a-d}} + ${blue('{{eval:(b-f)/10;d}}')}`,
				'&= {{solution}}'
			])
		])
	),
	e(
		'7d57fb3b-a050-4920-8231-e5ac609fa07d',
		'R-DEC-RANG',
		shared(
			[
				RULE_DEC_SUB,
				`On ne peut pas retirer ${inline(orange('{{f}}'))} dixièmes de ${inline(orange('{{b}}'))} dixièmes : ` +
					`on échange ${inline(blue('1'))} unité de ${inline('{{c}}')} contre ${inline(blue('10'))} dixièmes. ` +
					`${inline('{{c}}')}, c'est ${inline('{{eval:a-1}}')} unité{{if:a-1>1|s|}} et ${inline(blue('{{eval:10+b}}'))} dixièmes. ` +
					`Unités : ${inline(`{{eval:a-1}} - ${orange('{{d}}')} = {{eval:a-1-d}}`)}. ` +
					`Dixièmes : ${inline(`${blue('{{eval:10+b}}')} - ${orange('{{f}}')} = {{eval:10+b-f}}`)}.`,
				alignBlock([
					`{{c}} - {{g}} &= \\left( {{eval:a-1}} + ${blue('{{eval:(10+b)/10;d}}')} \\right) - ` +
						`\\left( ${orange('{{d}}')} + ${orange(tenth('f'))} \\right)`,
					`&= \\left( {{eval:a-1}} - ${orange('{{d}}')} \\right) + \\left( ${blue('{{eval:(10+b)/10;d}}')} - ${orange(tenth('f'))} \\right)`,
					`&= {{if:a-1-d>0|{{eval:a-1-d}} + |}}{{eval:(10+b-f)/10;d}}`,
					'&= {{solution}}'
				])
			],
			['Échange toujours nécessaire (f > b).']
		)
	),
	e(
		'6a16303a-acb1-46c4-aed2-ebae62cb5c32',
		'R-DEC-RANG',
		shared([
			RULE_DEC_SUB,
			`Parties entières : ${inline(`${orange('{{eval:10+a}}')} - ${orange('{{d}}')} = {{eval:10+a-d}}`)}. ` +
				`Dixièmes : ${inline(`${orange('{{b}}')} - ${orange('{{f}}')} = {{eval:b-f}}`)}.`,
			alignBlock([
				`{{c}} - {{h}} &= \\left( ${orange('{{eval:10+a}}')} - ${orange('{{d}}')} \\right) + ` +
					`\\left( ${orange(tenth('b'))} - ${orange(tenth('f'))} \\right)`,
				`&= {{eval:10+a-d}} + ${blue('{{eval:(b-f)/10;d}}')}`,
				'&= {{solution}}'
			])
		])
	),
	e(
		'b9a9048a-d973-47a3-ad5b-acbde2d80a66',
		'R-DEC-RANG',
		shared([
			RULE_DEC_SUB,
			`Unités : ${inline(`${orange('{{a}}')} - ${orange('{{f}}')} = {{eval:a-f}}`)}. ` +
				`Dixièmes : ${inline(`${orange('{{b}}')} - ${orange('{{g}}')} = {{eval:b-g}}`)}. ` +
				`Centièmes : ${inline('{{h}}')} n'en a pas, il reste les ${inline(orange('{{c}}'))} centième{{if:c>1|s|}} de ${inline('{{d}}')}.`,
			alignBlock([
				`{{d}} - {{h}} &= \\left( ${orange('{{a}}')} - ${orange('{{f}}')} \\right) + ` +
					`\\left( ${orange(tenth('b'))} - ${orange(tenth('g'))} \\right) + ${orange(hundredth('c'))}`,
				`&= {{eval:a-f}} + ${blue('{{eval:(b-g)/10;d}}')} + ${hundredth('c')}`,
				'&= {{solution}}'
			])
		])
	),
	// N-COMPARER-DEC — même partie entière
	e(
		'9c0c47ef-72b0-4333-870d-06cdf0f4a2de',
		'N-COMPARER-DEC',
		byVariation([
			[RULE_COMPARE_DEC, compareDecimalsSameUnits('h', 'j', 'c'), CHOICE_CONCLUSION],
			[RULE_COMPARE_DEC, compareDecimalsSameUnits('h', 'j', 'b'), CHOICE_CONCLUSION]
		])
	)
];

const PUBLISHED_ENTRIES: LotEntry[] = [
	// R-X10 — entiers
	e(
		'8390762c-b72d-4449-a8cc-5322e5bd77a4',
		'R-X10',
		shared(
			rx10({
				operand: 'a',
				power: { variable: 'b', values: [1, 2, 3] },
				times: true,
				ranks: { top: 1, bottom: 0 }
			})
		)
	),
	e(
		'4063af49-ad24-46be-a9c1-124dcbe74413',
		'R-X10',
		byVariation(
			[false, true].map((powerFirst) =>
				rx10({ operand: 'a', power: 10, times: true, powerFirst, ranks: { top: 1, bottom: 0 } })
			)
		)
	),
	e(
		'2c3a18e7-2727-4ae3-a899-e16cfc9c730b',
		'R-X10',
		byVariation(
			[false, true].map((powerFirst) =>
				rx10({ operand: 'a', power: 100, times: true, powerFirst, ranks: { top: 1, bottom: 0 } })
			)
		)
	),
	// N-COMPARER-ENT — QCM « le plus petit »
	e('943151d0-0af5-46f0-bce8-e4acbd5f1029', 'N-COMPARER-ENT', () =>
		compareIntegersChoice('f', 'g', 2)
	),
	e('d4245f88-26a7-4608-991b-bfac03f996a5', 'N-COMPARER-ENT', () =>
		compareIntegersChoice('h', 'j', 3)
	),
	e('68775a97-3dd5-4bc6-8af0-1ec9544e9a19', 'N-COMPARER-ENT', () =>
		compareIntegersChoice('h', 'j', 4)
	),
	e('0021eee7-2b1d-4228-ada9-6c759c01d0ec', 'N-COMPARER-ENT', () =>
		compareIntegersChoice('g', 'h', 6)
	),
	// N-ESPACES : n ≤ 4, 7 et 10 chiffres
	...(
		[
			['906252f8-0104-4c9f-9eb9-3f70d80d7045', 4],
			['bd760867-7303-4ac8-87eb-724fb5994cab', 'a'],
			['0dd3de90-10fc-485b-a961-343b01a84cee', 'a']
		] as const
	).map(([id, maxDigits]) =>
		e(
			id,
			'N-ESPACES',
			shared([
				RULE_SPACES,
				`On part du chiffre des unités de ${inline('{{expression}}')} et on compte les chiffres ` +
					'trois par trois vers la gauche ; on laisse un espace entre deux groupes.',
				alignBlock([`{{expression}} &= ${spacedNumber('expression', maxDigits)}`])
			])
		)
	),
	// N-ZEROS
	e(
		'cda36cc2-7d9c-4340-99f0-143467c83786',
		'N-ZEROS',
		byVariation(
			['', '0', '00'].map((trailing) => [
				RULE_ZEROS,
				`Les deux zéros ${inline(blue('00'))} écrits devant ${inline(orange('{{a}}'))} sont inutiles : on les enlève.` +
					(trailing
						? ` Le${trailing.length > 1 ? 's' : ''} zéro${trailing.length > 1 ? 's' : ''} de droite ${trailing.length > 1 ? 'restent' : 'reste'} : ${trailing.length > 1 ? 'ils donnent' : 'il donne'} le rang des autres chiffres.`
						: ''),
				alignBlock([`${blue('00')}${orange('{{a}}')}{{b}}{{c}}{{d}}${trailing} &= {{solution}}`])
			])
		)
	),
	// N-DIVEUCL — une case : l'égalité entière
	e(
		'15ed5af4-6f6b-4795-baf9-5037e801a532',
		'N-DIVEUCL',
		shared([
			RULE_DIVEUCL,
			`On cherche ${inline('{{eval:a*b+c}}')} dans la table de ${inline('{{b}}')} : ` +
				`${inline(`${orange('{{a}}')} \\times {{b}} = {{eval:a*b}}`)} ne dépasse pas ${inline('{{eval:a*b+c}}')}, ` +
				`mais ${inline(`{{eval:a+1}} \\times {{b}} = {{eval:(a+1)*b}}`)} le dépasse. ` +
				`Le quotient est ${inline(orange('{{a}}'))}. Le reste est ${inline(`{{eval:a*b+c}} - {{eval:a*b}} = ${blue('{{c}}')}`)}, ` +
				`plus petit que ${inline('{{b}}')}.`,
			alignBlock([
				'? &= {{eval:a*b+c}}',
				`&= \\left( ${orange('{{a}}')} \\times {{b}} \\right) + ${blue('{{c}}')}`
			])
		])
	)
];

export const VAGUE2_BROUILLONS_LOT: Lot = {
	name: 'vague2-brouillons',
	description:
		'Vague 2, modèles en brouillon : R-X10, R-DEC-RANG, N-COMPARER-DEC (numération, décimaux)',
	entries: DRAFT_ENTRIES
};

export const VAGUE2_PUBLIES_LOT: Lot = {
	name: 'vague2-publies',
	description:
		'Vague 2, modèles publiés : R-X10, N-COMPARER-ENT, N-ESPACES, N-ZEROS, N-DIVEUCL (numération)',
	entries: PUBLISHED_ENTRIES
};
