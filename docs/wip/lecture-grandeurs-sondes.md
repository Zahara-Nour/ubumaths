# Chantier lecture-grandeurs — sondes

Scripts hors dépôt : les copier dans un dossier temporaire, puis `npx tsx --tsconfig tsconfig.json <dossier>/arbre.ts <fichier.tsv>` depuis la racine du dépôt (imports par chemins absolus). Entrée : un TSV `id<TAB>écriture`, plusieurs écritures séparées par `  ·  `.

## arbre.ts

```ts
import { readFileSync } from 'node:fs';
import { parseCustomSafe } from '/Users/david/Coding/js/ubumaths/src/lib/mathAST/parser/custom';
type N = Record<string, unknown> & { type: string };
const p = (n: N): string => {
	const c = (k: string) => p(n[k] as N);
	switch (n.type) {
		case 'number':
			return String(n.value);
		case 'variable':
			return n.name === 'π' ? 'π(lettre)' : String(n.name);
		case 'constant':
			return String(n.constant) === 'pi' ? 'π' : String(n.constant);
		case 'unit': {
			const u = n.unit as { original?: string };
			const e = n.expression as N;
			const inner = ['number', 'variable', 'constant'].includes(e.type) ? p(e) : `(${p(e)})`;
			return `${inner}[${u.original}]`;
		}
		case 'addition':
			return `(${c('left')} + ${c('right')})`;
		case 'subtraction':
			return `(${c('left')} − ${c('right')})`;
		case 'multiplication':
			return `(${c('left')} × ${c('right')})`;
		case 'division':
			return `(${c('numerator')} / ${c('denominator')})`;
		case 'superscript':
			return `(${c('base')})^(${c('superscript')})`;
		case 'opposite':
			return `−(${c('operand')})`;
		case 'positive':
			return `+(${c('operand')})`;
		case 'delimiter':
			return c('content');
		case 'function':
			return `${n.name}(${(n.args as N[]).map(p).join(' ; ')})`;
		default:
			return `<${n.type}>`;
	}
};
for (const line of readFileSync(process.argv[2], 'utf8').trim().split('\n')) {
	const [id, e] = line.split('\t');
	for (const x of e.split('  ·  ')) {
		const r = parseCustomSafe(x);
		console.log(
			`${id}\t${x}\t${r.ast && !r.errors.length ? p(r.ast as N) : 'REFUS : ' + r.errors[0]?.message}`
		);
	}
}
```

## calcul.ts

```ts
import { readFileSync } from 'node:fs';
import { parseCustomSafe } from '/Users/david/Coding/js/ubumaths/src/lib/mathAST/parser/custom';
import { toCustom } from '/Users/david/Coding/js/ubumaths/src/lib/mathAST/custom-generator';
import { computeQuantity } from '/Users/david/Coding/js/ubumaths/src/lib/mathAST/cli/quantities';
const out: Record<string, string> = {};
for (const line of readFileSync(process.argv[2], 'utf8').trim().split('\n')) {
	const [id, e] = line.split('\t');
	const parts = e.split('  ·  ').map((x) => {
		const r = parseCustomSafe(x);
		if (!r.ast || r.errors.length) return 'pas de lecture';
		try {
			const q = computeQuantity(r.ast, 'exact');
			if (q.ok === true)
				return q.exact.text === q.decimal.text
					? q.exact.text
					: `${q.exact.text} (≈ ${q.decimal.text})`;
			if (q.ok === 'plain') return `${toCustom(q.node)} (nombre sans unité)`;
			return `refus « ${q.message} »`;
		} catch (err) {
			return `erreur « ${(err as Error).message} »`;
		}
	});
	out[id] = parts.join(' ; ');
}
console.log(JSON.stringify(out, null, 1));
```

## codes.ts

```ts
import { parseCustomSafe } from '/Users/david/Coding/js/ubumaths/src/lib/mathAST/parser/custom';
const cas = [
	'.5[m]',
	'12 500[m]',
	'2.5×10^3[m]',
	'10^-3[m]',
	'2[m]×3[m]',
	'2[m]3[m]',
	'2[h] 30[min]',
	'2[h]30[min]',
	'2[m] 30[cm]',
	'10[m]^3',
	'3[kg/m.s]',
	'3[m s]',
	'5[xyz]',
	'5[M]',
	'5[]',
	'12 500',
	'1 2',
	'1, 2',
	'1 ,2',
	'1,2,3',
	',5',
	'5,',
	'x,2',
	'2,x',
	'max(2;5)',
	'mod(16;4)',
	'f(x;y)',
	'max(2,5;3)',
	'1;2',
	'(1;2)',
	'A(1;2)',
	'[1;2]',
	'{1;2}',
	'x 2',
	'x2',
	'(2) 3'
];
for (const c of cas) {
	const r = parseCustomSafe(c);
	const e = r.errors[0];
	console.log(c.padEnd(14), '|', r.ast && !r.errors.length ? 'LU' : `${e?.code} | ${e?.message}`);
}
```
