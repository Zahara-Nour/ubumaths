// Style retenu, affermi : affiche de cabaret + pièce héraldique, anatomie moins enfantine
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';

const OUT = new URL('./styles/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const a = (o) =>
	Object.entries(o)
		.filter(([, v]) => v !== undefined && v !== null)
		.map(([k, v]) => `${k}="${v}"`)
		.join(' ');
const el = (tag, attrs) => `<${tag} ${a(attrs)}/>`;
function shape(p, attrs) {
	if (p.d) return el('path', { d: p.d, ...attrs });
	if (p.c) return el('circle', { cx: p.c[0], cy: p.c[1], r: p.c[2], ...attrs });
	if (p.e) return el('ellipse', { cx: p.e[0], cy: p.e[1], rx: p.e[2], ry: p.e[3], ...attrs });
	return '';
}
function render(parts, paint) {
	return parts
		.map((p) => {
			if (p.r === 'group') return `<g transform="${p.t}">${render(p.items, paint)}</g>`;
			const attrs = paint(p.r);
			return attrs ? shape(p, attrs) : '';
		})
		.join('');
}
// Symétrique d'un chemin par rapport à x = 50 (commandes absolues M L Q C Z uniquement)
const mirror = (d) =>
	d.replace(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${+(100 - x).toFixed(2)} ${y}`);

const INK = '#16181F';
const OR = '#F2B83B';
const SKIN = '#F3E3C8';
const SHADE = '#E0C6A2';
const PAPER = '#FFFDF6';

// ---------- Anatomie ----------

const browL = 'M37 40.5 Q41.5 37.5 46 39.5 L45.6 40.9 Q41.5 39.4 37.4 41.7 Z';

const PALOTINS = {
	giron: {
		nom: 'Giron',
		trait: 'costaud, simple, loyal',
		cloth: '#E0612F',
		halo: '#F2B83B',
		hairColor: '#5A3A22',
		body: 'M2 101 C4 84 20 75 50 75 C80 75 96 84 98 101 Z',
		neck: 'M40 60 L40 78 L60 78 L60 60 Z',
		head: 'M33 44 C33 32 40 26 50 26 C60 26 67 32 67 44 L67 52 C67 61 60 68 50 68 C40 68 33 61 33 52 Z',
		ears: ['M33.5 44.5 C28.5 42.5 28 52.5 33.5 53'],
		hair: ['M33 37 L33 49 L36.2 47.5 L36.6 36 Z'],
		face: [
			// yeux plissés de rire : iris, paupière haute, paupière basse remontée
			{ r: 'ink', c: [42, 45.6, 1.8] },
			{ r: 'line', d: 'M38.6 45.4 Q42 42.6 45.4 45.2' },
			{ r: 'thin', d: 'M39.2 47 Q42 48.3 44.8 47' },
			{ r: 'ink', c: [58, 45.6, 1.8] },
			{ r: 'line', d: 'M61.4 45.4 Q58 42.6 54.6 45.2' },
			{ r: 'thin', d: 'M60.8 47 Q58 48.3 55.2 47' },
			{ r: 'thin', d: 'M37.6 44.4 L36.2 43.6 M62.4 44.4 L63.8 43.6' },
			{ r: 'brow', d: browL },
			{ r: 'brow', d: mirror(browL) },
			// nez large
			{ r: 'line', d: 'M50.5 44 L48.4 52 Q50.2 54 53.4 52.6' },
			{ r: 'thin', d: 'M46.6 52.4 Q47.6 53.6 48.8 53.4' },
			// grand sourire franc
			{ r: 'ink', d: 'M40.5 56.5 Q50 66.5 59.5 56.5 Q50 59 40.5 56.5 Z' },
			{ r: 'white', d: 'M42.3 57.6 Q50 59.8 57.7 57.6 L57.1 59.1 Q50 61.3 42.9 59.1 Z' },
			{ r: 'thin', d: 'M39.4 53.6 Q38 56.8 39.8 59.6 M60.6 53.6 Q62 56.8 60.2 59.6' },
			{ r: 'thin', d: 'M48.4 65 Q50 66 51.6 65' }
		],
		hat: [
			{ r: 'hat', d: 'M30 34 Q38 15 64 7 Q60 20 70 34 Z' },
			{ r: 'hatDark', d: 'M50 34 Q56 18 64 7 Q60 20 70 34 Z' },
			{ r: 'hatDark', d: 'M29 31 Q50 27 71 31 L71 36 Q50 32 29 36 Z' },
			{ r: 'white', c: [64, 8, 4.5] }
		],
		collar: 'M38 76 L50 85 L62 76',
		arm: [
			{ r: 'cloth', d: 'M60 101 L64 89 Q71 84 78 88 L83 101 Z' },
			{ r: 'skin', d: 'M68 75 Q68 71 72 71 L76 71 L76 91 L72 91 Q68 91 68 87 Z' },
			{ r: 'skin', d: 'M69 73 Q66 64 69 59 Q71.5 56 74.5 58 Q77 60 76 65 L75 73 Z' },
			{ r: 'skin', d: 'M74 71.5 L83 71.5 Q85.5 71.5 85.5 74 Q85.5 76.5 83 76.5 L74 76.5 Z' },
			{ r: 'skin', d: 'M74 76.5 L84 76.5 Q86.5 76.5 86.5 79 Q86.5 81.5 84 81.5 L74 81.5 Z' },
			{ r: 'skin', d: 'M74 81.5 L83.5 81.5 Q86 81.5 86 84 Q86 86.5 83.5 86.5 L74 86.5 Z' },
			{ r: 'skin', d: 'M74 86.5 L81.5 86.5 Q84 86.5 84 88.8 Q84 91 81.5 91 L74 91 Z' }
		]
	},
	pile: {
		nom: 'Pile',
		trait: 'fourbe, opportuniste',
		cloth: '#2F62B0',
		halo: '#E0612F',
		hairColor: INK,
		body: 'M14 101 C16 86 30 78 50 78 C70 78 84 86 86 101 Z',
		neck: 'M44 62 L44 81 L56 81 L56 62 Z',
		head: 'M35 43 C35 31 41 26 50 26 C59 26 65 31 65 43 C65 55 58 66 50 69 C42 66 35 55 35 43 Z',
		ears: ['M35.5 42.5 C31 40.5 31 49.5 35.5 49.5'],
		hair: ['M35 35 Q35.5 31 40 30 L38.4 42 L35.2 41 Z'],
		face: [
			// clin d'œil à gauche, œil droit mi-clos et rusé
			{ r: 'line', d: 'M38.6 45.2 Q42 47.4 45.4 44.6' },
			{ r: 'thin', d: 'M38.4 46.2 L37 47.2' },
			{ r: 'ink', c: [58, 45, 1.8] },
			{ r: 'line', d: 'M54.4 44.6 Q58 41.8 61.6 44.2' },
			{ r: 'thin', d: 'M55 46.2 Q58 47.2 61 46' },
			{ r: 'brow', d: 'M37.5 41.6 Q41.5 40.2 46 41.8 L45.8 43 Q41.5 41.6 37.8 42.9 Z' },
			{ r: 'brow', d: 'M54 39 Q58.5 34.4 63.2 37.4 L62.6 38.6 Q58.5 36 54.4 40.2 Z' },
			// nez long et pointu
			{ r: 'line', d: 'M50 41.5 L53 51 Q51.4 53.2 48.6 52.2' },
			// moustache en croc
			{
				r: 'ink',
				d: 'M50 55 C47 53.4 43 53.8 41 56.4 C40.2 57.4 39 56.6 39.6 55.4 C37.8 57.6 40.6 59.6 42.6 57.6 C45 56.2 48 56.4 50 56.6 Z'
			},
			{
				r: 'ink',
				d: mirror(
					'M50 55 C47 53.4 43 53.8 41 56.4 C40.2 57.4 39 56.6 39.6 55.4 C37.8 57.6 40.6 59.6 42.6 57.6 C45 56.2 48 56.4 50 56.6 Z'
				)
			},
			// sourire en coin et bouc
			{ r: 'line', d: 'M44.6 60.4 Q50 62.6 56.6 59.2 Q58.2 58.4 58.8 57' },
			{ r: 'ink', d: 'M47.6 63.6 Q50 70 52.4 63.6 Q50 64.8 47.6 63.6 Z' },
			{ r: 'thin', d: 'M60.4 52 Q61.6 55 60.6 58' }
		],
		hat: [
			{
				r: 'group',
				t: 'rotate(-10 50 30)',
				items: [
					{ r: 'hatDark', d: 'M38 31 L39.3 8 Q50 5.5 60.7 8 L62 31 Z' },
					{ r: 'cloth', d: 'M42 9 L58 9 L50 23 Z' },
					{ r: 'cloth', d: 'M38.5 26 L61.5 26 L61.8 30.5 L38.2 30.5 Z' },
					{ r: 'hatDark', e: [50, 31, 20, 4] }
				]
			}
		],
		collar: 'M40 79 L50 87 L60 79',
		piece: 'M34 78 L66 78 L50 99 Z',
		arm: [
			{
				r: 'group',
				t: 'translate(9 1) rotate(-14 16 80)',
				items: [
					{
						r: 'card',
						d: 'M8 66 L23 66 Q25 66 25 68 L25 87 Q25 89 23 89 L8 89 Q6 89 6 87 L6 68 Q6 66 8 66 Z'
					},
					{
						r: 'cardMark',
						d: 'M15.5 71.5 L17.8 76.2 L23 76.8 L19.2 80.2 L20.2 85.4 L15.5 82.9 L10.8 85.4 L11.8 80.2 L8 76.8 L13.2 76.2 Z'
					}
				]
			},
			{ r: 'cloth', d: 'M16 101 L19 90 Q26 85 33 89 L39 101 Z' },
			{ r: 'skin', d: 'M20 86 Q20 80 26 80 Q32 80 32 86 Q32 91 26 91 Q20 91 20 86 Z' },
			{ r: 'skin', d: 'M25 81.5 L31.5 79.2 Q34 78.6 34.4 80.9 Q34.7 83.1 32.3 83.7 L26 85.6 Z' }
		]
	},
	cotice: {
		nom: 'Cotice',
		trait: 'lettré, bavard',
		cloth: '#2E8B57',
		halo: '#8E2C4F',
		hairColor: '#7A4E2D',
		body: 'M8 101 C10 85 26 76 50 76 C74 76 90 85 92 101 Z',
		neck: 'M43.5 61 L43.5 79 L56.5 79 L56.5 61 Z',
		head: 'M34 46 C34 33 41 27 50 27 C59 27 66 33 66 46 C66 58 59 67 50 67 C41 67 34 58 34 46 Z',
		ears: ['M34.5 45.5 C30 43.5 30 52.5 34.5 52'],
		hair: ['M34 36 Q33.6 42 34.6 47.5 L37.6 44.4 L37.4 35 Z'],
		face: [
			{ r: 'ink', c: [43, 46.4, 1.8] },
			{ r: 'ink', c: [57, 46.4, 1.8] },
			{ r: 'white', c: [43.6, 45.8, 0.6] },
			{ r: 'white', c: [57.6, 45.8, 0.6] },
			{ r: 'thin', d: 'M40 45 Q43 43 46 45 M54 45 Q57 43 60 45' },
			{ r: 'glass', c: [43, 46, 5.4] },
			{ r: 'glass', c: [57, 46, 5.4] },
			{ r: 'line', d: 'M48.4 45.4 Q50 44 51.6 45.4' },
			{ r: 'thin', d: 'M37.6 45 L34.6 44 M62.4 45 L65.4 44' },
			{ r: 'brow', d: 'M37.4 38.8 Q42 35.6 47 37.8 L46.6 39 Q42 37.2 37.8 40 Z' },
			{ r: 'brow', d: mirror('M37.4 38.8 Q42 35.6 47 37.8 L46.6 39 Q42 37.2 37.8 40 Z') },
			{ r: 'line', d: 'M50 47.5 L51.8 53 Q50.6 54.6 48.6 53.8' },
			// bouche ouverte qui parle
			{ r: 'ink', d: 'M44.5 58.4 Q50 56.8 55.5 58.4 Q54.6 64 50 64.6 Q45.4 64 44.5 58.4 Z' },
			{ r: 'white', d: 'M45.6 58.7 Q50 57.6 54.4 58.7 L54.1 59.8 Q50 59 45.9 59.8 Z' },
			{ r: 'pink', d: 'M46.6 62.4 Q50 60.8 53.4 62.4 Q50 64.6 46.6 62.4 Z' },
			{ r: 'thin', d: 'M42.6 56.2 Q42 58.6 43.2 60.4 M57.4 56.2 Q58 58.6 56.8 60.4' }
		],
		hat: [
			{
				r: 'hatDark',
				d: 'M30 35 C28 27 40 21 52 21 C66 21 76 26 74 32 C72 37 61 37 50 36 C41 35 32 38 30 35 Z'
			},
			{ r: 'cloth', d: 'M36 24 L41.5 22 L63 37 L56.5 37.3 Z' },
			{ r: 'hatDark', d: 'M51 21.5 L52 16 L54.3 16.4 L53.4 21.8 Z' }
		],
		collar: 'M41 77 L50 84 L59 77',
		bowtie: true,
		sash: 'M22 74 L32 74 L78 101 L64 101 Z',
		extra: [
			{
				r: 'group',
				t: 'translate(3.5 0)',
				items: [
					{
						r: 'quill',
						d: 'M28 48 L22.5 45.5 L24.5 43.5 L19 40 L21 38 L16.5 33.5 L18.5 31.5 L14.5 26 L16 24.5 L14 19 Q22 24 27 34 Q30 40 30.5 46 Z'
					},
					{ r: 'line', d: 'M14.5 19.5 Q23 30 30 50' },
					{ r: 'thin', d: 'M20 31 L23.6 30 M22.4 36.5 L26 35.2 M24.8 42 L28.2 40.6' }
				]
			}
		],
		arm: [
			{ r: 'cloth', d: 'M60 101 L64 91 Q71 87 78 91 L82 101 Z' },
			{
				r: 'group',
				t: 'translate(-4 0)',
				items: [
					{
						r: 'bookCover',
						d: 'M56 77 Q66 72.5 72 76 Q78 72.5 88 77 L88 91 Q78 87 72 90 Q66 87 56 91 Z'
					},
					{ r: 'card', d: 'M58 76.5 Q66 72.5 72 75.5 L72 88.5 Q66 85.5 58 89 Z' },
					{ r: 'card', d: 'M86 76.5 Q78 72.5 72 75.5 L72 88.5 Q78 85.5 86 89 Z' },
					{
						r: 'thin',
						d: 'M61 79 Q65.5 77 69.5 78.5 M61 82 Q65.5 80 69.5 81.5 M61 85 Q65.5 83 69.5 84.5 M74.5 78.5 Q78.5 77 83 79 M74.5 81.5 Q78.5 80 83 82 M74.5 84.5 Q78.5 83 83 85'
					},
					{
						r: 'skin',
						d: 'M64 90 Q64 85.5 68.5 85.5 L75.5 85.5 Q80 85.5 80 90 Q80 94 75.5 94 L68.5 94 Q64 94 64 90 Z'
					}
				]
			}
		]
	}
};

// ---------- Rendu ----------

function build(key, P) {
	const uid = `affirme-${key}`;
	const lw = 1.8;
	const paint = (r) =>
		({
			cloth: { fill: P.cloth, stroke: INK, 'stroke-width': lw, 'stroke-linejoin': 'round' },
			skin: { fill: SKIN, stroke: INK, 'stroke-width': lw, 'stroke-linejoin': 'round' },
			line: {
				fill: 'none',
				stroke: INK,
				'stroke-width': 1.6,
				'stroke-linecap': 'round',
				'stroke-linejoin': 'round'
			},
			thin: { fill: 'none', stroke: INK, 'stroke-width': 0.9, 'stroke-linecap': 'round' },
			ink: { fill: INK },
			brow: { fill: P.hairColor === INK ? INK : P.hairColor, stroke: INK, 'stroke-width': 0.5 },
			white: { fill: PAPER },
			pink: { fill: '#D9646E' },
			glass: { fill: 'none', stroke: INK, 'stroke-width': 1.3 },
			hat: { fill: P.cloth, stroke: INK, 'stroke-width': lw, 'stroke-linejoin': 'round' },
			hatDark: { fill: INK },
			card: { fill: PAPER, stroke: INK, 'stroke-width': 1.4, 'stroke-linejoin': 'round' },
			cardMark: { fill: OR, stroke: INK, 'stroke-width': 0.6 },
			quill: { fill: '#DCE4EC', stroke: INK, 'stroke-width': 1.2, 'stroke-linejoin': 'round' },
			bookCover: { fill: '#8E2C4F', stroke: INK, 'stroke-width': 1.4, 'stroke-linejoin': 'round' }
		})[r];

	const halo = `<rect width="100" height="100" fill="#EBCB8B"/><circle cx="50" cy="44" r="38" fill="${P.halo}"/>${[
		0, 30, 60, 90, 120, 150
	]
		.map(
			(ang) =>
				`<rect x="49.2" y="-6" width="1.6" height="12" fill="${P.halo}" transform="rotate(${ang} 50 44) translate(0 -36)"/>`
		)
		.join('')}`;

	let piece = '';
	if (key === 'giron') {
		const shield = 'M26 80 H42 V87 Q42 94 34 97 Q26 94 26 87 Z';
		const cx = 34,
			cy = 87,
			R = 14;
		const pt = (k) =>
			`${(cx + R * Math.cos((k * Math.PI) / 4)).toFixed(1)} ${(cy + R * Math.sin((k * Math.PI) / 4)).toFixed(1)}`;
		piece = `<path d="${shield}" fill="${OR}"/><g clip-path="url(#${uid}-shield)">${[0, 2, 4, 6].map((k) => `<path d="M${cx} ${cy} L${pt(k)} L${pt(k + 1)} Z" fill="${INK}"/>`).join('')}</g><path d="${shield}" fill="none" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/>`;
		piece = piece.replace('</g>', '</g>');
		var shieldClip = `<clipPath id="${uid}-shield"><path d="${shield}"/></clipPath>`;
	}
	if (P.piece)
		piece = `<g clip-path="url(#${uid}-body)"><path d="${P.piece}" fill="${OR}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/></g>`;
	if (P.sash)
		piece = `<g clip-path="url(#${uid}-body)"><path d="${P.sash}" fill="${OR}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/></g>`;

	const ears = P.ears.flatMap((d) => [d, mirror(d)]);
	const hair = P.hair.flatMap((d) => [d, mirror(d)]);
	const bodyShadow = `<g clip-path="url(#${uid}-body)"><path d="M60 72 Q78 79 85 101 L100 101 L100 72 Z" fill="${INK}" opacity=".22"/></g>`;
	const faceShadow = `<g clip-path="url(#${uid}-head)"><path d="M57 20 Q69 40 60 72 L80 72 L80 20 Z" fill="${SHADE}"/></g>`;
	const neckShadow = `<g clip-path="url(#${uid}-neck)"><rect x="30" y="${key === 'pile' ? 62 : 60}" width="40" height="9" fill="${SHADE}"/></g>`;
	const bowtie = P.bowtie
		? `<path d="M43 78.5 L50 81 L43 84 Z M57 78.5 L50 81 L57 84 Z" fill="#8E2C4F" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/><circle cx="50" cy="81.2" r="1.7" fill="#8E2C4F" stroke="${INK}" stroke-width="1"/>`
		: '';

	const defs = `<clipPath id="${uid}-body"><path d="${P.body}"/></clipPath><clipPath id="${uid}-head"><path d="${P.head}"/></clipPath><clipPath id="${uid}-neck"><path d="${P.neck}"/></clipPath>${shieldClip || ''}`;
	const body = [
		halo,
		shape({ d: P.body }, { fill: P.cloth }),
		piece && key !== 'giron' ? piece : '',
		bodyShadow,
		shape(
			{ d: P.body },
			{ fill: 'none', stroke: INK, 'stroke-width': lw, 'stroke-linejoin': 'round' }
		),
		shape({ d: P.neck }, paint('skin')),
		neckShadow,
		`<path d="${P.collar}" fill="${PAPER}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>`,
		bowtie,
		key === 'giron' ? piece : '',
		render(P.arm, paint),
		P.extra ? render(P.extra, paint) : '',
		ears.map((d) => shape({ d }, paint('skin'))).join(''),
		shape({ d: P.head }, { fill: SKIN }),
		faceShadow,
		shape(
			{ d: P.head },
			{ fill: 'none', stroke: INK, 'stroke-width': lw, 'stroke-linejoin': 'round' }
		),
		hair
			.map((d) =>
				shape(
					{ d },
					{ fill: P.hairColor, stroke: INK, 'stroke-width': 0.8, 'stroke-linejoin': 'round' }
				)
			)
			.join(''),
		render(P.face, paint),
		render(P.hat, paint)
	].join('');
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="${P.nom}"><defs>${defs}</defs>${body}</svg>`;
}

const json = JSON.parse(readFileSync(new URL('./styles.json', import.meta.url), 'utf8'));
json.affirme = {};
for (const [key, P] of Object.entries(PALOTINS)) {
	const svg = build(key, P);
	writeFileSync(`${OUT}affirme-${key}.svg`, svg);
	json.affirme[key] = svg;
}
writeFileSync(new URL('./styles.json', import.meta.url), JSON.stringify(json));
console.log('ok');
