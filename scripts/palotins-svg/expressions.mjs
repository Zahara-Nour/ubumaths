// Les six expressions des Palotins (style affiche) : visage, geste et décor propres à chaque expression.
// « happy » reprend tel quel le dessin validé par David (parties de gen.mjs).

export const EXPRESSIONS = [
	'neutral',
	'happy',
	'sad',
	'thinking',
	'excited',
	'encouraging',
	'determined'
];

export const LIBELLES = {
	neutral: 'neutre',
	happy: 'content',
	sad: 'triste',
	thinking: 'pensif',
	excited: 'excité',
	encouraging: 'encourageant',
	determined: 'déterminé'
};

// ---------- Briques du visage ----------

const f = (n) => +n.toFixed(2);

// Œil ouvert (pupille + reflet), décalage du regard (dx, dy)
function eyeOpen(cx, cy, r, dx = 0, dy = 0) {
	const x = cx + dx;
	const y = cy + dy;
	return [
		{ r: 'ink', c: [f(x), f(y), r], k: 'oeil' },
		{ r: 'white', c: [f(x + r * 0.38), f(y - r * 0.38), f(r * 0.34)], k: 'oeil' }
	];
}
// Œil grand ouvert : pupille agrandie, deux reflets (pas de cerne : il ferait spirale)
function eyeWide(cx, cy, r) {
	return [
		{ r: 'ink', c: [cx, cy, f(r * 1.3)], k: 'oeil' },
		{ r: 'white', c: [f(cx + r * 0.45), f(cy - r * 0.45), f(r * 0.48)], k: 'oeil' },
		{ r: 'white', c: [f(cx - r * 0.4), f(cy + r * 0.45), f(r * 0.22)], k: 'oeil' }
	];
}
// Œil triste : regard baissé, paupière qui tombe vers l'extérieur (o = -1 gauche, +1 droite)
function eyeSad(cx, cy, r, o) {
	return [
		...eyeOpen(cx, cy, r, 0, 0.9),
		{
			r: 'line',
			d: `M${f(cx + o * 4.2)} ${f(cy - 1.4)} Q${cx} ${f(cy - 3.6)} ${f(cx - o * 4.2)} ${f(cy - 3.2)}`
		}
	];
}
// Œil décidé : paupière haute posée à plat sur la pupille (regard qui vise)
function eyeSet(cx, cy, r) {
	return [
		...eyeOpen(cx, cy, r),
		{
			r: 'lid',
			d: `M${f(cx - r - 1)} ${f(cy - r * 0.62)} L${f(cx + r + 1)} ${f(cy - r * 0.74)} L${f(cx + r + 1)} ${f(cy - r - 1.5)} L${f(cx - r - 1)} ${f(cy - r - 1.5)} Z`
		},
		{
			r: 'line',
			d: `M${f(cx - r - 0.6)} ${f(cy - r * 0.62)} L${f(cx + r + 0.6)} ${f(cy - r * 0.74)}`
		}
	];
}
// Sourcil : o = -1 gauche, +1 droite ; extérieur à cx + 6·o, intérieur à cx - 4·o
function brow(cx, cy, o, kind) {
	const out = f(cx + o * 6);
	const inn = f(cx - o * 4);
	const ctl = f(cx + o * 1);
	const Y = {
		normal: [cy - 7, cy - 10.5, cy - 8],
		raised: [cy - 9.5, cy - 13, cy - 10.5],
		sad: [cy - 6.5, cy - 8.5, cy - 11],
		flat: [cy - 7.6, cy - 8.6, cy - 7],
		set: [cy - 8.6, cy - 9.4, cy - 6.4]
	}[kind];
	return { r: 'line', d: `M${out} ${f(Y[0])} Q${ctl} ${f(Y[1])} ${inn} ${f(Y[2])}`, k: 'sourcil' };
}

const mouth = {
	smile: (x, y) => [{ r: 'line', d: `M${x - 7} ${y - 1.5} Q${x} ${y + 4} ${x + 7} ${y - 1.5}` }],
	warm: (x, y) => [
		{
			r: 'ink',
			d: `M${x - 7.5} ${y - 2} Q${x} ${y + 7} ${x + 7.5} ${y - 2} Q${x} ${y + 1} ${x - 7.5} ${y - 2} Z`
		},
		{
			r: 'pink',
			d: `M${x - 3.6} ${y + 2.4} Q${x} ${y + 1.2} ${x + 3.6} ${y + 2.4} Q${x} ${y + 4.4} ${x - 3.6} ${y + 2.4} Z`
		}
	],
	sad: (x, y) => [{ r: 'line', d: `M${x - 5.5} ${y + 2} Q${x} ${y - 2.5} ${x + 5.5} ${y + 2}` }],
	// sourire en coin, le coin droit qui remonte
	smirk: (x, y) => [
		{
			r: 'line',
			d: `M${x - 6} ${y} Q${x - 0.5} ${y + 2.4} ${x + 5} ${y - 1} Q${x + 6.4} ${y - 2} ${x + 6.8} ${y - 3.4}`
		},
		{ r: 'thin', d: `M${x + 7.6} ${y - 1.6} Q${x + 8.4} ${y - 0.4} ${x + 7.8} ${y + 0.6}` }
	],
	hmm: (x, y) => [
		{ r: 'line', d: `M${x - 3} ${y + 0.5} Q${x + 1.5} ${y + 1.4} ${x + 5} ${y - 1}` }
	],
	excited: (x, y) => [
		{
			r: 'ink',
			d: `M${x - 6.5} ${y - 2.5} Q${x} ${y - 3.5} ${x + 6.5} ${y - 2.5} Q${x + 6} ${y + 7.5} ${x} ${y + 8} Q${x - 6} ${y + 7.5} ${x - 6.5} ${y - 2.5} Z`
		},
		{
			r: 'white',
			d: `M${x - 5.4} ${y - 2} Q${x} ${y - 2.9} ${x + 5.4} ${y - 2} L${x + 5} ${y - 0.4} Q${x} ${y - 1.1} ${x - 5} ${y - 0.4} Z`
		},
		{
			r: 'pink',
			d: `M${x - 3.8} ${y + 5} Q${x} ${y + 2.8} ${x + 3.8} ${y + 5} Q${x} ${y + 7.6} ${x - 3.8} ${y + 5} Z`
		}
	]
};

// Étincelle à quatre branches (excité)
function spark(x, y, s, delay) {
	const a = s * 0.3;
	return {
		r: 'spark',
		k: 'etincelle',
		delay,
		d: `M${x} ${y - s} L${x + a} ${y - a} L${x + s} ${y} L${x + a} ${y + a} L${x} ${y + s} L${x - a} ${y + a} L${x - s} ${y} L${x - a} ${y - a} Z`
	};
}

// ---------- Particularités de chaque Palotin ----------

const FIXE = {
	giron: [
		{ r: 'cheek', c: [34, 53, 4.2] },
		{ r: 'cheek', c: [66, 53, 4.2] },
		{ r: 'nose', e: [50, 50.5, 4, 3.4] }
	],
	pile: [
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
		}
	],
	// les lunettes passent après les yeux
	cotice: [
		{ r: 'cheek', c: [35.5, 56, 3.6] },
		{ r: 'cheek', c: [64.5, 56, 3.6] },
		{ r: 'nose', d: 'M50 50 Q54 54 50.5 56 Q48 56 48 54 Z' }
	]
};
const LUNETTES = [
	{ r: 'glass', c: [42.5, 46.5, 6.2] },
	{ r: 'glass', c: [57.5, 46.5, 6.2] },
	{ r: 'line', d: 'M48.7 46 Q50 44.4 51.3 46' }
];
const YEUX = {
	giron: [[41, 45], [59, 45], 2.8],
	pile: [[41, 46], [59, 45.5], 2.9],
	cotice: [[42.5, 46.5], [57.5, 46.5], 2.4]
};
const BOUCHE = { giron: [50, 58], pile: [51, 65], cotice: [50, 61] };
const SOURIRE_PILE = [{ r: 'line', d: 'M43 64 Q51 69 59 63 Q61 62 61.5 60.5' }];
const SOURIRE_COIN_PILE = [
	{ r: 'line', d: 'M45 64.5 Q51 66.6 57 63.6 Q59.4 62.2 60 60' },
	{ r: 'thin', d: 'M61.2 62 Q61.8 63.2 61.2 64.2' }
];

// ---------- Gestes ----------

const PILE_CARTE = (t) => [
	{
		r: 'group',
		k: 'carte',
		t,
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
];
const COTICE_LIVRE = (t, ferme = false) => [
	{ r: 'cloth', d: 'M60 101 L64 91 Q71 87 78 91 L82 101 Z' },
	{
		r: 'group',
		k: 'livre',
		t,
		items: ferme
			? [
					{
						r: 'bookCover',
						d: 'M58 79 L82 79 Q84 79 84 81 L84 91 Q84 93 82 93 L58 93 Q56 93 56 91 L56 81 Q56 79 58 79 Z'
					},
					{ r: 'card', d: 'M59 91 L83 91 L83 93 L59 93 Z' },
					{ r: 'cardMark', d: 'M68 83 L72 83 L72 89 L70 87.6 L68 89 Z' },
					{
						r: 'skin',
						d: 'M64 90 Q64 85.5 68.5 85.5 L75.5 85.5 Q80 85.5 80 90 Q80 94 75.5 94 L68.5 94 Q64 94 64 90 Z'
					}
				]
			: [
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
];
// Giron retrousse ses manches : avant-bras levé, manche roulée au coude, poing serré
const GIRON_POING_LEVE = [
	{ r: 'cloth', d: 'M61 101 L65 91 Q73 86 82 89.5 L89 101 Z' },
	{
		r: 'group',
		k: 'poing',
		t: 'translate(0 0)',
		items: [
			{ r: 'skin', d: 'M75.5 91 L76 71 L88 71 L87.5 91 Z' },
			{ r: 'cloth', d: 'M73 83.5 Q81.5 80.5 90 83.5 L90.5 91.5 Q81.5 88.5 72.5 91.5 Z' },
			{ r: 'thin', d: 'M72.8 87.4 Q81.5 84.4 90.2 87.4' },
			{
				r: 'skin',
				d: 'M73 62.5 Q73 57 78.5 57 L85.5 57 Q91 57 91 62.5 L91 68.5 Q91 74 85.5 74 L78.5 74 Q73 74 73 68.5 Z'
			},
			{ r: 'thin', d: 'M78 57.4 L78 62.6 M82.4 57.2 L82.4 62.6 M86.6 57.6 L86.6 62.6' },
			{ r: 'line', d: 'M73.6 66 Q80 64.2 86.8 66.6' }
		]
	}
];
// Pile rebat son paquet : deux cartes dessous, celle du dessus qui glisse et revient
const CARTE = 'M8 66 L23 66 Q25 66 25 68 L25 87 Q25 89 23 89 L8 89 Q6 89 6 87 L6 68 Q6 66 8 66 Z';
const DOS = 'M10 69.5 L21 69.5 L21 85.5 L10 85.5 Z';
const PILE_PAQUET = [
	{
		r: 'group',
		t: 'translate(9 1) rotate(-26 16 80)',
		items: [
			{ r: 'card', d: CARTE },
			{ r: 'thin', d: DOS }
		]
	},
	{
		r: 'group',
		t: 'translate(9 1) rotate(-12 16 80)',
		items: [
			{ r: 'card', d: CARTE },
			{ r: 'thin', d: DOS }
		]
	},
	{
		r: 'group',
		k: 'battage',
		t: 'translate(9 1) rotate(2 16 80)',
		items: [
			{ r: 'card', d: CARTE },
			{
				r: 'cardMark',
				d: 'M15.5 71.5 L17.8 76.2 L23 76.8 L19.2 80.2 L20.2 85.4 L15.5 82.9 L10.8 85.4 L11.8 80.2 L8 76.8 L13.2 76.2 Z'
			}
		]
	},
	{ r: 'cloth', d: 'M16 101 L19 90 Q26 85 33 89 L39 101 Z' },
	{ r: 'skin', d: 'M20 86 Q20 80 26 80 Q32 80 32 86 Q32 91 26 91 Q20 91 20 86 Z' },
	{ r: 'skin', d: 'M25 81.5 L31.5 79.2 Q34 78.6 34.4 80.9 Q34.7 83.1 32.3 83.7 L26 85.6 Z' }
];
// Cotice tourne la page : livre ouvert, la page de droite qui passe à gauche
const COTICE_PAGE_TOURNEE = () => {
	const [manche, livre] = COTICE_LIVRE('translate(-4 0)');
	const main = livre.items.at(-1);
	const page = {
		r: 'group',
		k: 'page',
		t: 'translate(0 0)',
		items: [
			{ r: 'card', d: 'M72 75.5 Q78 72.5 86 76.5 L86 89 Q78 85.5 72 88.5 Z' },
			{ r: 'thin', d: 'M74.5 78.5 Q78.5 77 83 79 M74.5 81.5 Q78.5 80 83 82' }
		]
	};
	return [manche, { ...livre, items: [...livre.items.slice(0, -1), page, main] }];
};
// Giron, main au menton (pensif) : avant-bras dans le corps, poing devant le menton
const GIRON_AVANT_BRAS = [{ r: 'cloth', d: 'M53 101 L56 82 Q60 77 66 79 L70 101 Z' }];
const GIRON_POING_MENTON = [
	{
		r: 'skin',
		d: 'M51 70 Q51 65.5 55.5 65.5 L63 65.5 Q67.5 65.5 67.5 70 L67.5 74 Q67.5 79 63 79 L55.5 79 Q51 79 51 74 Z'
	},
	{ r: 'thin', d: 'M55 69.6 Q59 68.6 63.5 69.6 M55 73.4 Q59 72.4 63.5 73.4' }
];

// ---------- Assemblage ----------

export function variant(key, P, expr) {
	// « content » validé tel quel pour Giron et Pile ; Cotice refait (sa bouche ronde faisait peur, David 2026-10-21)
	if (expr === 'happy' && key !== 'cotice') return { parts: P.parts, arm: P.arm };
	const [[lx, ly], [rx, ry], er] = YEUX[key];
	const [mx, my] = BOUCHE[key];
	let eyes = [];
	let brows = [];
	let lips = [];
	let arm = P.arm;
	let front = [];
	let deco = [];

	switch (expr) {
		case 'neutral':
			eyes = [...eyeOpen(lx, ly, er), ...eyeOpen(rx, ry, er)];
			brows = [brow(lx, ly, -1, 'normal'), brow(rx, ry, 1, 'normal')];
			lips = key === 'pile' ? SOURIRE_PILE : mouth.smile(mx, my);
			if (key === 'giron') arm = [];
			break;
		case 'sad':
			eyes = [...eyeSad(lx, ly, er, -1), ...eyeSad(rx, ry, er, 1)];
			brows = [brow(lx, ly, -1, 'sad'), brow(rx, ry, 1, 'sad')];
			lips = mouth.sad(mx, my);
			if (key === 'giron') arm = [];
			if (key === 'pile') arm = PILE_CARTE('translate(10 7) rotate(10 16 80)');
			if (key === 'cotice') arm = COTICE_LIVRE('translate(-4 0)', true);
			break;
		case 'thinking': {
			// Giron et Pile lèvent les yeux de côté ; Cotice lit son livre
			const look = key === 'cotice' ? [0, 1.3] : [1.1, -1.1];
			eyes = [...eyeOpen(lx, ly, er, ...look), ...eyeOpen(rx, ry, er, ...look)];
			brows = [brow(lx, ly, -1, 'flat'), brow(rx, ry, 1, 'raised')];
			lips = mouth.hmm(mx, my);
			if (key === 'giron') {
				arm = GIRON_AVANT_BRAS;
				front = GIRON_POING_MENTON;
				deco = [
					{ r: 'dot', c: [76, 29, 1.3] },
					{ r: 'dot', c: [80.5, 24, 1.8] },
					{ r: 'dot', c: [85, 18.5, 2.3] }
				];
			}
			break;
		}
		case 'excited':
			eyes = [...eyeWide(lx, ly, er), ...eyeWide(rx, ry, er)];
			brows = [brow(lx, ly, -1, 'raised'), brow(rx, ry, 1, 'raised')];
			lips = mouth.excited(mx, my);
			if (key === 'pile') arm = PILE_CARTE('translate(8 -5) rotate(-24 16 80)');
			if (key === 'cotice') arm = COTICE_LIVRE('translate(-4 -4)');
			deco = {
				giron: [spark(17, 25, 4.5, 0), spark(86, 44, 3.6, 0.5), spark(12, 52, 3, 1)],
				pile: [spark(84, 40, 4.5, 0), spark(14, 40, 3.6, 0.5), spark(86, 58, 3, 1)],
				cotice: [spark(85, 42, 4.5, 0), spark(87, 57, 3.2, 0.5), spark(13, 63, 3, 1)]
			}[key];
			break;
		case 'happy':
			// Cotice : yeux plissés de rire derrière les lunettes, grand sourire ouvert qui raconte
			eyes = [
				{ r: 'line', d: `M${lx - 3.2} ${ly + 0.6} Q${lx} ${ly - 3} ${lx + 3.2} ${ly + 0.6}` },
				{ r: 'line', d: `M${rx - 3.2} ${ry + 0.6} Q${rx} ${ry - 3} ${rx + 3.2} ${ry + 0.6}` }
			];
			brows = [brow(lx, ly, -1, 'raised'), brow(rx, ry, 1, 'raised')];
			lips = [
				{
					r: 'ink',
					d: `M${mx - 8} ${my - 3} Q${mx} ${my + 9} ${mx + 8} ${my - 3} Q${mx} ${my - 0.5} ${mx - 8} ${my - 3} Z`
				},
				{
					r: 'white',
					d: `M${mx - 6.4} ${my - 1.9} Q${mx} ${my + 0.2} ${mx + 6.4} ${my - 1.9} L${mx + 5.8} ${my - 0.3} Q${mx} ${my + 1.8} ${mx - 5.8} ${my - 0.3} Z`
				},
				{
					r: 'pink',
					d: `M${mx - 3.8} ${my + 3.4} Q${mx} ${my + 1.8} ${mx + 3.8} ${my + 3.4} Q${mx} ${my + 6.2} ${mx - 3.8} ${my + 3.4} Z`
				}
			];
			break;
		case 'determined':
			// après une erreur : on se relève, sourire en coin, et le geste qui dit « on y retourne »
			eyes = [...eyeSet(lx, ly, er), ...eyeSet(rx, ry, er)];
			brows = [brow(lx, ly, -1, 'set'), brow(rx, ry, 1, 'set')];
			lips = key === 'pile' ? SOURIRE_COIN_PILE : mouth.smirk(mx, my);
			if (key === 'giron') arm = GIRON_POING_LEVE;
			if (key === 'pile') arm = PILE_PAQUET;
			if (key === 'cotice') arm = COTICE_PAGE_TOURNEE();
			break;
		case 'encouraging':
			eyes = [...eyeOpen(lx, ly, er), ...eyeOpen(rx, ry, er)];
			brows = [brow(lx, ly, -1, 'raised'), brow(rx, ry, 1, 'raised')];
			lips = mouth.warm(mx, my);
			break;
	}

	const parts =
		key === 'cotice'
			? [...FIXE.cotice, ...eyes, ...LUNETTES, ...brows, ...lips]
			: [...FIXE[key], ...eyes, ...brows, ...lips];
	return { parts, arm, front, deco };
}
