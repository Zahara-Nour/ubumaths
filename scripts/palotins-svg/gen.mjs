// Générateur des propositions de style pour les Palotins (4 styles × 3 Palotins, expression « content »)
import { writeFileSync, mkdirSync } from 'node:fs';
import { EXPRESSIONS, variant } from './expressions.mjs';

const OUT = new URL('./styles/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const a = (o) =>
	Object.entries(o)
		.filter(([, v]) => v !== undefined && v !== null)
		.map(([k, v]) => `${k}="${v}"`)
		.join(' ');
const el = (tag, attrs, inner = '') =>
	inner ? `<${tag} ${a(attrs)}>${inner}</${tag}>` : `<${tag} ${a(attrs)}/>`;

// ---------- Anatomie des trois Palotins (viewBox 0 0 100 100) ----------

const PALOTINS = {
	giron: {
		key: 'giron',
		nom: 'Giron',
		trait: 'costaud, simple, loyal',
		colors: { cloth: '#E0612F', clothDark: '#1D2030', hatAccent: '#1D2030', halo: '#F2B83B' },
		body: 'M3 101 C5 81 22 71 50 71 C78 71 95 81 97 101 Z',
		neck: { x: 42, y: 64, w: 16, h: 10 },
		head: 'M27 48 C27 33 37 27 50 27 C63 27 73 33 73 48 C73 62 64 70 50 70 C36 70 27 62 27 48 Z',
		ears: ['M28 46 C22 44 21 54 28 54', 'M72 46 C78 44 79 54 72 54'],
		hair: 'M31 37 C33 31 38 29 41 31 C42 28 46 28 47 30',
		parts: [
			{ r: 'line', d: 'M37 45 Q41 40.5 45 45' },
			{ r: 'line', d: 'M55 45 Q59 40.5 63 45' },
			{ r: 'line', d: 'M35 38 Q40 34.5 45 37', k: 'sourcil' },
			{ r: 'line', d: 'M55 37 Q60 34.5 65 38', k: 'sourcil' },
			{ r: 'cheek', c: [34, 53, 4.2] },
			{ r: 'cheek', c: [66, 53, 4.2] },
			{ r: 'nose', e: [50, 50.5, 4, 3.4] },
			{ r: 'ink', d: 'M38 56 Q50 70 62 56 Z' },
			{ r: 'white', d: 'M39.5 56.6 L60.5 56.6 Q60 59 58.6 59.4 L41.4 59.4 Q40 59 39.5 56.6 Z' },
			{ r: 'pink', d: 'M44 62.6 Q50 59.6 56 62.6 Q50 66.6 44 62.6 Z' }
		],
		hat: [
			{ r: 'hat', d: 'M26 35 Q36 13 67 5 Q62 20 74 35 Z' },
			{ r: 'hatAccent', d: 'M50 35 Q57 17 67 5 Q62 20 74 35 Z' },
			{ r: 'hatBand', d: 'M24 32 Q50 27 76 32 L76 38 Q50 33 24 38 Z' },
			{ r: 'white', c: [67, 6, 5.5] }
		],
		// Bras droit levé, pouce en l'air
		arm: [
			{ r: 'cloth', d: 'M60 101 L64 89 Q71 84 78 88 L83 101 Z' },
			{ r: 'skin', d: 'M68 75 Q68 71 72 71 L76 71 L76 91 L72 91 Q68 91 68 87 Z' },
			{ r: 'skin', d: 'M69 73 Q66 64 69 59 Q71.5 56 74.5 58 Q77 60 76 65 L75 73 Z', k: 'pouce' },
			{ r: 'skin', d: 'M74 71.5 L83 71.5 Q85.5 71.5 85.5 74 Q85.5 76.5 83 76.5 L74 76.5 Z' },
			{ r: 'skin', d: 'M74 76.5 L84 76.5 Q86.5 76.5 86.5 79 Q86.5 81.5 84 81.5 L74 81.5 Z' },
			{ r: 'skin', d: 'M74 81.5 L83.5 81.5 Q86 81.5 86 84 Q86 86.5 83.5 86.5 L74 86.5 Z' },
			{ r: 'skin', d: 'M74 86.5 L81.5 86.5 Q84 86.5 84 88.8 Q84 91 81.5 91 L74 91 Z' }
		]
	},
	pile: {
		key: 'pile',
		nom: 'Pile',
		trait: 'fourbe, opportuniste',
		colors: { cloth: '#2F62B0', clothDark: '#1D2030', hatAccent: '#2F62B0', halo: '#E0612F' },
		body: 'M15 101 C17 84 30 75 50 75 C70 75 83 84 85 101 Z',
		neck: { x: 44, y: 66, w: 12, h: 11 },
		head: 'M31 46 C31 33 39 27 50 27 C61 27 69 33 69 46 C69 58 59 69 50 72 C41 69 31 58 31 46 Z',
		ears: ['M32 44 C26 42 26 52 32 51', 'M68 44 C74 42 74 52 68 51'],
		hair: 'M60 33 C64 33 67 36 67 40',
		parts: [
			{ r: 'line', d: 'M37 46 Q41 49.5 45 46' },
			{ r: 'ink', c: [59, 45.5, 3], k: 'oeil' },
			{ r: 'white', c: [60, 44.5, 1], k: 'oeil' },
			{ r: 'line', d: 'M36 41.5 Q40.5 40 45 42' },
			{ r: 'line', d: 'M54 38.5 Q59 33.5 65 37' },
			{ r: 'cheek', c: [65, 54, 3.6] },
			{ r: 'cheek', c: [36, 54, 3.2] },
			{ r: 'nose', d: 'M49 43 Q57 52 53 56 Q50 57 48 55 Z' },
			{
				r: 'ink',
				d: 'M51 58.5 C47 56 41 57 38.5 61 C41.5 59.5 44 60.5 45 61.5 C47 60 49.5 59.5 51 58.5 Z'
			},
			{
				r: 'ink',
				d: 'M51 58.5 C55 56 61 57 63.5 61 C60.5 59.5 58 60.5 57 61.5 C55 60 52.5 59.5 51 58.5 Z'
			},
			{ r: 'line', d: 'M43 64 Q51 69 59 63 Q61 62 61.5 60.5' }
		],
		hat: [
			{
				r: 'group',
				t: 'rotate(-12 50 30)',
				items: [
					{ r: 'hat', d: 'M36 31 L37.5 6 Q50 3 62.5 6 L64 31 Z' },
					{ r: 'hatAccent', d: 'M40.5 7 L59.5 7 L50 23 Z' },
					{ r: 'hatBand', d: 'M36.6 25 L63.4 25 L63.8 30 L36.2 30 Z' },
					{ r: 'hat', e: [50, 31, 24, 4.8] }
				]
			}
		],
		// Main gauche qui tient une carte « à échanger »
		arm: [
			{
				r: 'group',
				k: 'carte',
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
		key: 'cotice',
		nom: 'Cotice',
		trait: 'lettré, bavard',
		colors: { cloth: '#2E8B57', clothDark: '#1D2030', hatAccent: '#2E8B57', halo: '#8E2C4F' },
		body: 'M9 101 C11 83 26 73 50 73 C74 73 89 83 91 101 Z',
		neck: { x: 43, y: 65, w: 14, h: 10 },
		head: 'M30 49 C30 36 38 28 50 28 C62 28 70 36 70 49 C70 61 61 69 50 69 C39 69 30 61 30 49 Z',
		ears: ['M31 47 C25 45 25 55 31 54', 'M69 47 C75 45 75 55 69 54'],
		hair: null,
		parts: [
			{ r: 'ink', c: [42.5, 46.5, 2.4], k: 'oeil' },
			{ r: 'ink', c: [57.5, 46.5, 2.4], k: 'oeil' },
			{ r: 'white', c: [43.3, 45.6, 0.8], k: 'oeil' },
			{ r: 'white', c: [58.3, 45.6, 0.8], k: 'oeil' },
			{ r: 'glass', c: [42.5, 46.5, 6.2] },
			{ r: 'glass', c: [57.5, 46.5, 6.2] },
			{ r: 'line', d: 'M48.7 46 Q50 44.4 51.3 46' },
			{ r: 'line', d: 'M35 37.5 Q40.5 33.5 47 36' },
			{ r: 'line', d: 'M53 36 Q59.5 33.5 65 37.5' },
			{ r: 'cheek', c: [35.5, 56, 3.6] },
			{ r: 'cheek', c: [64.5, 56, 3.6] },
			{ r: 'nose', d: 'M50 50 Q54 54 50.5 56 Q48 56 48 54 Z' },
			{ r: 'ink', e: [50, 61.5, 5.5, 4.6] },
			{ r: 'pink', d: 'M46 63.5 Q50 61 54 63.5 Q50 66.2 46 63.5 Z' }
		],
		hat: [
			{
				r: 'hat',
				d: 'M26 34 C24 25 38 19 52 19 C68 19 79 24 77 31 C75 36 62 36 50 35 C40 34 28 37 26 34 Z'
			},
			{ r: 'hatCotice', d: 'M33 22 L39 20 L64 36 L57 36.5 Z' },
			{ r: 'hat', d: 'M51 19.5 L52 13.5 L54.5 14 L53.5 19.8 Z' }
		],
		// Plume derrière l'oreille + index levé (« alors voilà… »)
		// Plume d'oie glissée derrière l'oreille : barbes découpées, tuyau visible
		extra: [
			{
				r: 'quill',
				d: 'M28 48 L22.5 45.5 L24.5 43.5 L19 40 L21 38 L16.5 33.5 L18.5 31.5 L14.5 26 L16 24.5 L14 19 Q22 24 27 34 Q30 40 30.5 46 Z'
			},
			{ r: 'quillShaft', d: 'M14.5 19.5 Q23 30 30 50' },
			{ r: 'thin', d: 'M20 31 L23.6 30 M22.4 36.5 L26 35.2 M24.8 42 L28.2 40.6' }
		],
		sash: 'M22 71 L32 71 L78 101 L64 101 Z',
		arm: [
			{ r: 'cloth', d: 'M60 101 L64 91 Q71 87 78 91 L82 101 Z' },
			{
				r: 'group',
				k: 'livre',
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

// ---------- Rendu générique d'une liste de parties ----------

function shape(p, attrs) {
	if (p.d) return el('path', { d: p.d, ...attrs });
	if (p.c) return el('circle', { cx: p.c[0], cy: p.c[1], r: p.c[2], ...attrs });
	if (p.e) return el('ellipse', { cx: p.e[0], cy: p.e[1], rx: p.e[2], ry: p.e[3], ...attrs });
	return '';
}

function render(parts, paint) {
	return parts
		.map((p) => {
			if (p.r === 'group') {
				const g = el('g', { transform: p.t }, render(p.items, paint));
				return p.k ? el('g', { class: p.k }, g) : g;
			}
			const attrs = paint(p.r);
			if (!attrs) return '';
			const extra = p.k ? { class: p.k } : {};
			if (p.delay !== undefined) extra.style = `animation-delay:${p.delay}s`;
			return shape(p, { ...attrs, ...extra });
		})
		.join('');
}

// ---------- Les quatre styles ----------

const STYLES = {
	pantins: {
		titre: 'Les Pantins de 1898',
		pitch:
			'Ubu Roi a été joué en marionnettes au Théâtre des Pantins (1898), avec des décors de Bonnard. Têtes de bois tourné, joues peintes, chevilles aux articulations, fils qui montent vers les cintres, rideau de scène rouge.',
		plus: 'Le plus vivant et le plus chaleureux. Les fils racontent déjà une histoire.',
		moins: 'Le plus chargé à petite taille ; les fils disparaissent sous 48 px.',
		build(P, uid) {
			const C = P.colors;
			const line = '#4A2A14';
			const lw = 2;
			const defs = `
				<radialGradient id="${uid}-wood" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#F7DDB3"/><stop offset=".65" stop-color="#E2B077"/><stop offset="1" stop-color="#B97A44"/></radialGradient>
				<linearGradient id="${uid}-cloth" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.cloth}"/><stop offset="1" stop-color="${C.cloth}" stop-opacity=".78"/></linearGradient>
				<linearGradient id="${uid}-curtain" x1="0" x2="1"><stop offset="0" stop-color="#7A1626"/><stop offset=".5" stop-color="#A3253A"/><stop offset="1" stop-color="#6E1322"/></linearGradient>
				<clipPath id="${uid}-body"><path d="${P.body}"/></clipPath>`;
			const folds = [12, 26, 40, 60, 74, 88]
				.map(
					(x) =>
						`<path d="M${x} 0 Q${x + 3} 50 ${x} 100" stroke="#5A0E1A" stroke-width="3" fill="none" opacity=".45"/>`
				)
				.join('');
			const bg = `<rect width="100" height="100" fill="url(#${uid}-curtain)"/>${folds}<path d="M0 0 H100 V9 Q75 15 50 9 Q25 15 0 9 Z" fill="#D9A43A"/><path d="M0 9 Q25 15 50 9 Q75 15 100 9" stroke="#8A5A12" stroke-width="1" fill="none"/>`;
			const paint = (r) =>
				({
					cloth: { fill: `url(#${uid}-cloth)`, stroke: line, 'stroke-width': lw },
					skin: { fill: `url(#${uid}-wood)`, stroke: line, 'stroke-width': lw },
					nose: { fill: '#E9A36E', stroke: line, 'stroke-width': 1.4 },
					line: { fill: 'none', stroke: '#1E140C', 'stroke-width': 2.1, 'stroke-linecap': 'round' },
					ink: { fill: '#1E140C' },
					white: { fill: '#FFF8EA', stroke: line, 'stroke-width': 0.8 },
					pink: { fill: '#E2707A' },
					cheek: { fill: '#D9483B', opacity: 0.85 },
					glass: { fill: '#FFFFFF', 'fill-opacity': 0.25, stroke: '#B8862E', 'stroke-width': 1.6 },
					hat: { fill: '#2A1D16', stroke: line, 'stroke-width': lw },
					hatAccent: {
						fill: C.hatAccent === '#1D2030' ? '#3A2A20' : C.hatAccent,
						stroke: line,
						'stroke-width': 1.2
					},
					hatBand: { fill: '#D9A43A', stroke: line, 'stroke-width': 1.2 },
					hatCotice: { fill: C.cloth, stroke: line, 'stroke-width': 1 },
					card: { fill: '#FFF8EA', stroke: line, 'stroke-width': 1.4 },
					cardMark: { fill: '#D9A43A' },
					quill: { fill: '#FFF8EA', stroke: line, 'stroke-width': 1.2 },
					bookCover: { fill: '#8E2C4F', stroke: line, 'stroke-width': 1.6 },
					thin: { fill: 'none', stroke: line, 'stroke-width': 0.7, opacity: 0.6 }
				})[r];
			const joints = `<circle cx="${P.neck.x + P.neck.w / 2}" cy="${P.neck.y + 7}" r="2" fill="#7A4A26"/>`;
			const strings = ['M50 0 L50 18', 'M30 0 L30 30', 'M70 0 L70 30']
				.map((d) => `<path d="${d}" stroke="#EAD9B0" stroke-width=".7"/>`)
				.join('');
			const armStrings =
				P.key === 'pile'
					? '<path d="M18 0 L18 79" stroke="#EAD9B0" stroke-width=".7"/>'
					: '<path d="M82 0 L81 58" stroke="#EAD9B0" stroke-width=".7"/>';
			return {
				defs,
				body: [
					bg,
					strings,
					armStrings,
					shape({ d: P.body }, paint('cloth')),
					P.sash
						? `<g clip-path="url(#${uid}-body)">${shape({ d: P.sash }, { fill: '#D9A43A', stroke: line, 'stroke-width': 1.2 })}</g>`
						: '',
					`<path d="M30 ${P.neck.y + 13} Q50 ${P.neck.y + 20} 70 ${P.neck.y + 13}" stroke="#D9A43A" stroke-width="3" fill="none"/>`,
					`<rect x="${P.neck.x}" y="${P.neck.y}" width="${P.neck.w}" height="${P.neck.h}" fill="#C88C55" stroke="${line}" stroke-width="1.4"/>`,
					joints,
					render(P.arm, paint),
					P.extra ? render(P.extra, paint) : '',
					P.ears.map((d) => shape({ d }, paint('skin'))).join(''),
					shape({ d: P.head }, paint('skin')),
					`<ellipse cx="42" cy="36" rx="6" ry="3" fill="#FFF3DA" opacity=".5"/>`,
					render(P.parts, paint),
					render(P.hat, paint)
				].join('')
			};
		}
	},

	affiche: {
		titre: "L'Affiche de cabaret",
		thin: 0.6,
		pitch:
			"La lithographie Belle Époque de l'affiche du Chat Noir (Steinlen, 1896) : aplats francs, gros cerne noir, grand disque de couleur derrière la tête, ombres posées en masses noires. C'est déjà la palette des écrans culturels de Chiphre.",
		plus: 'Le plus lisible à petite taille, et le plus proche de l’identité Chiphre (vert chandelle, or, pourpre).',
		moins:
			'Plus graphique que tendre : la joie passe par les poses et les visages, pas par le modelé.',
		build(P, uid) {
			const C = P.colors;
			const ink = '#16181F';
			const lw = 3;
			const bg = `<rect width="100" height="100" fill="#EBCB8B"/><circle cx="50" cy="44" r="38" fill="${C.halo}"/>${[
				0, 30, 60, 90, 120, 150
			]
				.map(
					(ang) =>
						`<rect x="49" y="-6" width="2" height="12" fill="${C.halo}" transform="rotate(${ang} 50 44) translate(0 -36)"/>`
				)
				.join('')}`;
			const paint = (r) =>
				({
					cloth: { fill: C.cloth, stroke: ink, 'stroke-width': lw, 'stroke-linejoin': 'round' },
					skin: { fill: '#F6E9D2', stroke: ink, 'stroke-width': lw, 'stroke-linejoin': 'round' },
					nose: { fill: '#F6E9D2', stroke: ink, 'stroke-width': 2.4, 'stroke-linejoin': 'round' },
					line: {
						fill: 'none',
						stroke: ink,
						'stroke-width': 2.8,
						'stroke-linecap': 'round',
						'stroke-linejoin': 'round'
					},
					ink: { fill: ink },
					white: { fill: '#FFFDF6' },
					pink: { fill: '#E2707A' },
					cheek: { fill: C.halo === '#F2B83B' ? '#E0612F' : '#E0612F', opacity: 0.55 },
					glass: { fill: 'none', stroke: ink, 'stroke-width': 2.2 },
					hat: { fill: ink },
					hatAccent: { fill: C.hatAccent === '#1D2030' ? C.cloth : C.hatAccent },
					hatBand: { fill: C.cloth === '#E0612F' ? '#F2B83B' : C.cloth },
					hatCotice: { fill: C.cloth },
					card: { fill: '#FFFDF6', stroke: ink, 'stroke-width': 2.4 },
					cardMark: { fill: '#F2B83B', stroke: ink, 'stroke-width': 1 },
					quill: { fill: '#DCE4EC', stroke: ink, 'stroke-width': 2, 'stroke-linejoin': 'round' },
					quillShaft: { fill: 'none', stroke: ink, 'stroke-width': 1.6, 'stroke-linecap': 'round' },
					bookCover: {
						fill: '#8E2C4F',
						stroke: ink,
						'stroke-width': 2.4,
						'stroke-linejoin': 'round'
					},
					eyeWhite: { fill: '#FFFDF6', stroke: ink, 'stroke-width': 2 },
					lid: { fill: '#F6E9D2' },
					spark: { fill: '#F2B83B', stroke: ink, 'stroke-width': 1.6, 'stroke-linejoin': 'round' },
					dot: { fill: '#FFFDF6', stroke: ink, 'stroke-width': 1.8 },
					thin: {
						fill: 'none',
						stroke: ink,
						'stroke-width': 0.9,
						'stroke-linecap': 'round',
						opacity: 0.6
					}
				})[r];
			// Giron : bonnet bicolore orange/noir comme aujourd'hui
			const hatPaint = (r) => {
				if (P.key === 'giron') {
					if (r === 'hat')
						return { fill: C.cloth, stroke: ink, 'stroke-width': lw, 'stroke-linejoin': 'round' };
					if (r === 'hatAccent') return { fill: ink };
					if (r === 'hatBand') return { fill: ink };
				}
				return paint(r);
			};
			const shadow = `<g clip-path="url(#${uid}-body)"><path d="M58 70 Q76 76 84 101 L100 101 L100 70 Z" fill="${ink}" opacity=".28"/></g>`;
			const OR = '#F2B83B';
			let piece = '';
			if (P.key === 'giron') {
				// Écusson gironné d'or et de sable, cousu haut sur la poitrine
				const shield = 'M26 79 H42 V86 Q42 93 34 96 Q26 93 26 86 Z';
				const cx = 34,
					cy = 86,
					R = 14;
				const pt = (k) =>
					`${(cx + R * Math.cos((k * Math.PI) / 4)).toFixed(1)} ${(cy + R * Math.sin((k * Math.PI) / 4)).toFixed(1)}`;
				const wedges = [0, 2, 4, 6]
					.map((k) => `<path d="M${cx} ${cy} L${pt(k)} L${pt(k + 1)} Z" fill="${ink}"/>`)
					.join('');
				piece = `<path d="${shield}" fill="${OR}"/><g clip-path="url(#${uid}-shield)">${wedges}</g><path d="${shield}" fill="none" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>`;
			} else if (P.key === 'pile') {
				// Pile d'or en plastron, pointe en bas
				piece = `<g clip-path="url(#${uid}-body)"><path d="M33 74 L67 74 L50 99 Z" fill="${OR}" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"/></g>`;
			}
			return {
				defs: `<clipPath id="${uid}-body"><path d="${P.body}"/></clipPath><clipPath id="${uid}-shield"><path d="M26 79 H42 V86 Q42 93 34 96 Q26 93 26 86 Z"/></clipPath>`,
				body: [
					bg,
					'<g class="corps">',
					shape({ d: P.body }, paint('cloth')),
					P.sash
						? `<g clip-path="url(#${uid}-body)">${shape({ d: P.sash }, { fill: '#F2B83B', stroke: ink, 'stroke-width': 2.2 })}</g>`
						: '',
					piece,
					shadow,
					shape(
						{ d: P.body },
						{ fill: 'none', stroke: ink, 'stroke-width': lw, 'stroke-linejoin': 'round' }
					),
					`<path d="M38 ${P.neck.y + 10} L50 ${P.neck.y + 18} L62 ${P.neck.y + 10}" fill="#FFFDF6" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"/>`,
					render(P.arm, paint),
					'</g><g class="tete">',
					P.extra ? `<g class="plume">${render(P.extra, paint)}</g>` : '',
					P.ears.map((d) => shape({ d }, paint('skin'))).join(''),
					shape({ d: P.head }, paint('skin')),
					P.hair
						? `<path d="${P.hair}" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>`
						: '',
					render(P.parts, paint),
					P.front ? render(P.front, paint) : '',
					`<g class="chapeau">${render(P.hat, hatPaint)}</g>`,
					'</g>',
					P.deco ? render(P.deco, paint) : ''
				].join('')
			};
		}
	},

	blason: {
		titre: 'Le Blason vivant',
		pitch:
			"Giron, Pile et Cotice sont des pièces d'un blason. Chaque Palotin porte sa pièce sur un tabard de héraut, dans les émaux de l'héraldique : Giron gironné d'or et de gueules, Pile d'azur à la pile d'or, Cotice d'argent à la cotice de sinople. Fond de parchemin, liserés d'or.",
		plus: 'Le seul où le nom du Palotin se voit sur lui : c’est le lore qui fait le dessin.',
		moins:
			'Plus « cérémonie » que copain ; demande un trait fin, donc un peu moins lisible en très petit.',
		build(P, uid) {
			const ink = '#2A2015';
			const lw = 2.2;
			const OR = '#E3B23C';
			const GUEULES = '#C8342B';
			const AZUR = '#2F62B0';
			const SINOPLE = '#2E8B57';
			const ARGENT = '#F4F1E8';
			const tabard = {
				giron: {
					base: OR,
					charge: [0, 1, 2, 3]
						.map(
							(k) =>
								`<path d="M50 86 L${[0, 100, 100, 0][k]} ${[60, 60, 112, 112][k]} L${[50, 100, 50, 0][k]} ${[60, 86, 112, 86][k]} Z" fill="${GUEULES}"/>`
						)
						.join('')
				},
				pile: {
					base: AZUR,
					charge: `<path d="M33 72 L67 72 L50 101 Z" fill="${OR}" stroke="${ink}" stroke-width="1.4"/>`
				},
				cotice: {
					base: ARGENT,
					charge: `<path d="M20 70 L29 70 L79 101 L69 101 Z" fill="${SINOPLE}" stroke="${ink}" stroke-width="1.4"/>`
				}
			}[P.key === 'giron' ? 'giron' : P.key === 'pile' ? 'pile' : 'cotice'];
			const sleeve = P.key === 'giron' ? GUEULES : P.key === 'pile' ? AZUR : SINOPLE;
			const paint = (r) =>
				({
					cloth: { fill: sleeve, stroke: ink, 'stroke-width': lw },
					skin: { fill: '#F5E4C8', stroke: ink, 'stroke-width': lw },
					nose: { fill: '#F0D2AE', stroke: ink, 'stroke-width': 1.6 },
					line: { fill: 'none', stroke: ink, 'stroke-width': 2.2, 'stroke-linecap': 'round' },
					ink: { fill: ink },
					white: { fill: '#FFFDF6' },
					pink: { fill: '#DE6B73' },
					cheek: { fill: GUEULES, opacity: 0.4 },
					glass: { fill: 'none', stroke: OR, 'stroke-width': 1.8 },
					hat: { fill: sleeve === GUEULES ? GUEULES : '#2A2015', stroke: ink, 'stroke-width': lw },
					hatAccent: { fill: OR, stroke: ink, 'stroke-width': 1 },
					hatBand: { fill: OR, stroke: ink, 'stroke-width': 1 },
					hatCotice: { fill: SINOPLE, stroke: OR, 'stroke-width': 0.8 },
					card: { fill: '#FFFDF6', stroke: ink, 'stroke-width': 1.6 },
					cardMark: { fill: GUEULES },
					quill: { fill: '#FFFDF6', stroke: ink, 'stroke-width': 1.4 },
					bookCover: { fill: '#8E2C4F', stroke: ink, 'stroke-width': 1.6 },
					thin: { fill: 'none', stroke: ink, 'stroke-width': 0.7, opacity: 0.6 }
				})[r];
			const shield = `<path d="M14 10 H86 V46 C86 72 68 86 50 94 C32 86 14 72 14 46 Z" fill="none" stroke="#C9A46A" stroke-width="2" opacity=".55"/><path d="M19 15 H81 V46 C81 68 66 80 50 88 C34 80 19 68 19 46 Z" fill="none" stroke="#C9A46A" stroke-width=".8" opacity=".55"/>`;
			const fleurs = [
				[8, 8],
				[92, 8],
				[8, 60],
				[92, 60]
			]
				.map(
					([x, y]) =>
						`<path d="M${x} ${y - 3} L${x + 1} ${y - 1} L${x + 3} ${y} L${x + 1} ${y + 1} L${x} ${y + 3} L${x - 1} ${y + 1} L${x - 3} ${y} L${x - 1} ${y - 1} Z" fill="#C9A46A" opacity=".7"/>`
				)
				.join('');
			return {
				defs: `<clipPath id="${uid}-body"><path d="${P.body}"/></clipPath>`,
				body: [
					`<rect width="100" height="100" fill="#F2E6CC"/>`,
					shield,
					fleurs,
					shape({ d: P.body }, { fill: tabard.base }),
					`<g clip-path="url(#${uid}-body)">${tabard.charge}</g>`,
					shape({ d: P.body }, { fill: 'none', stroke: ink, 'stroke-width': lw }),
					`<path d="${P.body.replace(/Z$/, '')}" fill="none" stroke="${OR}" stroke-width="1" transform="translate(0 2.5)" clip-path="url(#${uid}-body)"/>`,
					`<path d="M36 ${P.neck.y + 9} Q50 ${P.neck.y + 16} 64 ${P.neck.y + 9} L64 ${P.neck.y + 13} Q50 ${P.neck.y + 20} 36 ${P.neck.y + 13} Z" fill="${OR}" stroke="${ink}" stroke-width="1.2"/>`,
					render(P.arm, paint),
					P.extra ? render(P.extra, paint) : '',
					P.ears.map((d) => shape({ d }, paint('skin'))).join(''),
					shape({ d: P.head }, paint('skin')),
					P.hair
						? `<path d="${P.hair}" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>`
						: '',
					render(P.parts, paint),
					render(P.hat, paint)
				].join('')
			};
		}
	},

	gravure: {
		titre: 'Le Bois gravé de Jarry',
		pitch:
			"Jarry illustrait lui-même ses pièces au bois gravé (le « Véritable portrait de Monsieur Ubu »). Encre noire sur papier, hachures pour les ombres, et une seule couleur d'imprimeur par Palotin, posée avec un léger décalage de repérage.",
		plus: 'Le plus « Jarry » et le plus singulier : aucune autre appli ne ressemble à ça.',
		moins:
			'Le moins coloré ; la joie doit tout porter dans le trait. Les hachures se tassent en très petit.',
		build(P, uid) {
			const C = P.colors;
			const ink = '#1B1A17';
			const paper = '#F3EADA';
			const off = 'translate(1.6 1.2)';
			const defs = `
				<pattern id="${uid}-hatch" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0 V3" stroke="${ink}" stroke-width="1"/></pattern>
				<pattern id="${uid}-hatch2" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)"><path d="M0 0 V4" stroke="${ink}" stroke-width=".7"/></pattern>
				<clipPath id="${uid}-body"><path d="${P.body}"/></clipPath>
				<clipPath id="${uid}-head"><path d="${P.head}"/></clipPath>`;
			// Calque couleur (décalé), puis calque encre
			const colorPaint = (r) =>
				({
					cloth: { fill: C.cloth, opacity: 0.9 },
					hatAccent: { fill: C.cloth, opacity: 0.9 },
					hatBand: { fill: C.cloth, opacity: 0.9 },
					hatCotice: { fill: C.cloth, opacity: 0.9 },
					cheek: { fill: '#E0612F', opacity: 0.75 },
					pink: { fill: '#E0612F', opacity: 0.8 },
					cardMark: { fill: '#E3B23C' }
				})[r];
			const inkPaint = (r) =>
				({
					cloth: { fill: 'none', stroke: ink, 'stroke-width': 2.6, 'stroke-linejoin': 'round' },
					skin: { fill: paper, stroke: ink, 'stroke-width': 2.6, 'stroke-linejoin': 'round' },
					nose: { fill: paper, stroke: ink, 'stroke-width': 2, 'stroke-linejoin': 'round' },
					line: { fill: 'none', stroke: ink, 'stroke-width': 2.6, 'stroke-linecap': 'round' },
					ink: { fill: ink },
					white: { fill: paper },
					glass: { fill: 'none', stroke: ink, 'stroke-width': 2 },
					hat: { fill: ink },
					hatAccent: { fill: 'none' },
					hatBand: { fill: `url(#${uid}-hatch2)` },
					hatCotice: { fill: paper, stroke: ink, 'stroke-width': 0.8 },
					card: { fill: paper, stroke: ink, 'stroke-width': 2 },
					cardMark: { fill: 'none', stroke: ink, 'stroke-width': 1.2 },
					quill: { fill: paper, stroke: ink, 'stroke-width': 1.8 },
					bookCover: { fill: ink },
					thin: { fill: 'none', stroke: ink, 'stroke-width': 0.8 }
				})[r];
			// Les accents de chapeau ressortent en couleur pure sur le noir
			const hatColor = (r) =>
				r === 'hatAccent' || r === 'hatCotice'
					? { fill: C.cloth }
					: r === 'white'
						? { fill: paper, stroke: ink, 'stroke-width': 2 }
						: inkPaint(r);
			const giron = P.key === 'giron';
			return {
				defs,
				body: [
					`<rect width="100" height="100" fill="${paper}"/>`,
					`<rect x="3" y="3" width="94" height="94" fill="none" stroke="${ink}" stroke-width="1.6"/>`,
					`<path d="M3 3 H97 V30 Q50 16 3 30 Z" fill="url(#${uid}-hatch2)" opacity=".6"/>`,
					// couleur
					`<g transform="${off}">${shape({ d: P.body }, colorPaint('cloth'))}${P.arm
						.filter((p) => p.r === 'cloth')
						.map((p) => shape(p, colorPaint('cloth')))
						.join('')}</g>`,
					// encre
					shape({ d: P.body }, inkPaint('cloth')),
					`<g clip-path="url(#${uid}-body)"><path d="M60 70 Q80 78 86 101 L100 101 L100 70 Z" fill="url(#${uid}-hatch)"/></g>`,
					P.sash
						? `<g clip-path="url(#${uid}-body)">${shape({ d: P.sash }, { fill: paper, stroke: ink, 'stroke-width': 2 })}</g>`
						: '',
					`<path d="M40 ${P.neck.y + 10} L50 ${P.neck.y + 17} L60 ${P.neck.y + 10}" fill="${paper}" stroke="${ink}" stroke-width="2.2" stroke-linejoin="round"/>`,
					render(P.arm, (r) => (r === 'cloth' ? inkPaint('cloth') : inkPaint(r))),
					P.extra ? render(P.extra, inkPaint) : '',
					P.ears.map((d) => shape({ d }, inkPaint('skin'))).join(''),
					shape({ d: P.head }, inkPaint('skin')),
					`<g clip-path="url(#${uid}-head)"><path d="M62 30 Q76 48 62 72 L80 72 L80 30 Z" fill="url(#${uid}-hatch)" opacity=".55"/></g>`,
					P.hair
						? `<path d="${P.hair}" fill="none" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>`
						: '',
					`<g transform="${off}">${render(
						P.parts.filter((p) => p.r === 'cheek'),
						colorPaint
					)}</g>`,
					render(
						P.parts.filter((p) => p.r !== 'cheek' && p.r !== 'pink'),
						inkPaint
					),
					render(
						P.parts.filter((p) => p.r === 'pink'),
						colorPaint
					),
					render(
						P.hat,
						giron
							? (r) =>
									r === 'hat'
										? { fill: paper, stroke: ink, 'stroke-width': 2.6, 'stroke-linejoin': 'round' }
										: r === 'hatAccent'
											? { fill: ink }
											: r === 'hatBand'
												? { fill: C.cloth }
												: hatColor(r)
							: hatColor
					)
				].join('')
			};
		}
	}
};

// ---------- Animation au repos ----------

const RYTHME = {
	giron: { souffle: 3.6, cligne: 5, chapeau: 4.2 },
	pile: { souffle: 3.1, cligne: 4.2, chapeau: 5 },
	cotice: { souffle: 3.9, cligne: 6.1, chapeau: 4.6 }
};
function animation(pk) {
	const r = RYTHME[pk];
	return `<style>
.corps{transform-origin:50px 100px;animation:souffle ${r.souffle}s ease-in-out infinite}
.tete{animation:respire ${r.souffle}s ease-in-out infinite}
.oeil{transform-box:fill-box;transform-origin:center;animation:cligne ${r.cligne}s infinite}
.sourcil{animation:sourcil ${r.cligne}s ease-in-out infinite}
.chapeau{transform-origin:50px 34px;animation:balance ${r.chapeau}s ease-in-out infinite}
.pouce{transform-origin:72px 73px;animation:pouce 2.8s ease-in-out infinite}
.carte{transform-origin:26px 86px;animation:carte 3.2s ease-in-out infinite}
.plume{transform-origin:31px 50px;animation:plume 2.3s ease-in-out infinite}
.etincelle{transform-box:fill-box;transform-origin:center;animation:scintille 1.8s ease-in-out infinite}
.livre{transform-origin:68px 90px;animation:livre ${r.souffle}s ease-in-out infinite}
.poing{transform-origin:82px 92px;animation:poing 2.6s ease-in-out infinite}
.battage{transform-origin:25px 88px;animation:battage 2.4s ease-in-out infinite}
.page{transform-origin:72px 82px;animation:page 3.4s ease-in-out infinite}
@keyframes souffle{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.018)}}
@keyframes respire{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.1px)}}
@keyframes cligne{0%,91%,97%,100%{transform:scaleY(1)}94%{transform:scaleY(.08)}}
@keyframes sourcil{0%,80%,100%{transform:translateY(0)}86%,92%{transform:translateY(-1.4px)}}
@keyframes balance{0%,100%{transform:rotate(-1.8deg)}50%{transform:rotate(1.8deg)}}
@keyframes pouce{0%,62%,100%{transform:rotate(0)}74%{transform:rotate(-9deg)}86%{transform:rotate(3deg)}}
@keyframes carte{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(4deg)}}
@keyframes plume{0%,100%{transform:rotate(-3.5deg)}50%{transform:rotate(3deg)}}
@keyframes livre{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.2px)}}
@keyframes poing{0%,55%,100%{transform:rotate(0)}68%{transform:rotate(-7deg) translateY(-1.5px)}80%{transform:rotate(2deg)}90%{transform:rotate(-2deg)}}
@keyframes battage{0%,50%,100%{transform:translate(0,0) rotate(0)}62%{transform:translate(-1px,-7px) rotate(-10deg)}76%{transform:translate(1px,-2px) rotate(5deg)}88%{transform:translate(0,0) rotate(-1deg)}}
@keyframes page{0%,30%{transform:scaleX(1);opacity:1}62%,78%{transform:scaleX(-1);opacity:1}86%{transform:scaleX(-1);opacity:0}87%{transform:scaleX(1);opacity:0}100%{transform:scaleX(1);opacity:1}}
@keyframes scintille{0%,100%{transform:scale(.7) rotate(0);opacity:.75}50%{transform:scale(1.1) rotate(20deg);opacity:1}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>`;
}

// ---------- Sortie ----------

const result = {};
for (const [sk, S] of Object.entries(STYLES)) {
	result[sk] = {};
	for (const [pk, P] of Object.entries(PALOTINS)) {
		const uid = `${sk}-${pk}`;
		let { defs, body } = S.build(P, uid);
		// Style retenu : traits affinés (David, 2026-10-21 : « trop épais »)
		if (S.thin)
			body = body.replace(
				/stroke-width="([\d.]+)"/g,
				(_, w) => `stroke-width="${(parseFloat(w) * S.thin).toFixed(2)}"`
			);
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="${P.nom}, style ${S.titre}"><defs>${defs}</defs>${body}</svg>`;
		writeFileSync(`${OUT}${uid}.svg`, svg);
		if (sk === 'affiche') {
			const anime = svg.replace('<defs>', `${animation(pk)}<defs>`);
			writeFileSync(`${OUT}anime-${pk}.svg`, anime);
			(result.anime ??= {})[pk] = anime;
		}
		result[sk][pk] = svg;
	}
}
const FINAL = new URL('./final/', import.meta.url).pathname;
mkdirSync(FINAL, { recursive: true });
result.expressions = {};
for (const [pk, P] of Object.entries(PALOTINS)) {
	result.expressions[pk] = {};
	for (const expr of EXPRESSIONS) {
		const P2 = { ...P, ...variant(pk, P, expr) };
		const uid = `${pk}-${expr}`;
		let { defs, body } = STYLES.affiche.build(P2, uid);
		body = body.replace(
			/stroke-width="([\d.]+)"/g,
			(_, w) => `stroke-width="${(parseFloat(w) * STYLES.affiche.thin).toFixed(2)}"`
		);
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${animation(pk)}<defs>${defs}</defs>${body}</svg>`;
		writeFileSync(`${FINAL}${uid}.svg`, svg);
		result.expressions[pk][expr] = svg;
	}
}
writeFileSync(
	new URL('./styles.json', import.meta.url).pathname,
	JSON.stringify({
		result,
		meta: Object.fromEntries(
			Object.entries(STYLES).map(([k, s]) => [
				k,
				{ titre: s.titre, pitch: s.pitch, plus: s.plus, moins: s.moins }
			])
		),
		palotins: Object.fromEntries(
			Object.entries(PALOTINS).map(([k, p]) => [k, { nom: p.nom, trait: p.trait }])
		)
	})
);
console.log('ok');
