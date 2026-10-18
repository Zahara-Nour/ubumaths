<!--
	MathouAvatar — un Mathou (chat du Docteur Faustroll) dessiné en SVG inline.

	La race (couleur + motif) vient de mathou-races.ts, la taille et les proportions du stade :
	chaton (petit, grosse tête, grands yeux), matou (adulte), grand matou (plus grand, collerette).
	En sieste, il est couché, yeux fermés, avec un « Zzz » dessiné (pas de texte ni de police).
	En silhouette (pas encore découvert), une forme unie sans aucun détail de race.
-->
<script lang="ts">
	import { CHAT_NOIR, getMathouRace, type MathouStage } from './mathou-races';

	// Types
	interface Props {
		/** 0..18, une race par branche ; au-delà, modulo 19 */
		raceIndex: number;
		stage: MathouStage;
		/** Sieste : couché, yeux fermés, « Zzz » */
		asleep?: boolean;
		/** Pas encore découvert : silhouette unie */
		silhouette?: boolean;
		/** Taille en px */
		size?: number;
		/** Texte alternatif */
		label: string;
	}

	interface Ellipse {
		cx: number;
		cy: number;
		rx: number;
		ry: number;
	}

	type Point = [number, number];
	type Pose = 'assis' | 'couche';
	type Part = 'head' | 'body';

	interface Geometry {
		pose: Pose;
		scale: number;
		head: Ellipse;
		earLeft: Point[];
		earRight: Point[];
		body: string;
		bodyBox: { x0: number; y0: number; x1: number; y1: number };
		paws: Ellipse[];
		tail: string;
		tailWidth: number;
		eyes: Ellipse[];
		pupil: { rx: number; ry: number };
		nose: { x: number; y: number };
		ruff: { cx: number; cy: number; w: number; rotate: number };
	}

	// Constantes
	const INK = CHAT_NOIR.noir;
	const NOSE = 'hsl(350, 60%, 72%)';
	const EAR_INNER = 'hsl(350, 55%, 78%)';
	const OUTLINE = 3.2;
	// Liseré clair visible seulement en mode sombre (un chat noir ne disparaît pas sur fond noir)
	const RIM_STYLE = 'stroke: light-dark(transparent, hsl(40 30% 88% / 0.5))';
	const SILHOUETTE_STYLE = 'fill: var(--color-muted-foreground, hsl(220 10% 42%)); opacity: 0.75';

	const SEATED_ADULT: Omit<Geometry, 'scale'> = {
		pose: 'assis',
		head: { cx: 50, cy: 38, rx: 20, ry: 17 },
		earLeft: [
			[33, 30],
			[31, 11],
			[47, 23]
		],
		earRight: [
			[67, 30],
			[69, 11],
			[53, 23]
		],
		body: 'M34 92 C27 80 29 60 41 51 L59 51 C71 60 73 80 66 92 Z',
		bodyBox: { x0: 29, y0: 51, x1: 71, y1: 92 },
		paws: [
			{ cx: 43, cy: 91, rx: 6.5, ry: 4 },
			{ cx: 57, cy: 91, rx: 6.5, ry: 4 }
		],
		tail: 'M64 88 C80 91 88 80 85 68 C83 60 87 54 91 55',
		tailWidth: 7,
		eyes: [
			{ cx: 42, cy: 37, rx: 4.3, ry: 4.8 },
			{ cx: 58, cy: 37, rx: 4.3, ry: 4.8 }
		],
		pupil: { rx: 1.3, ry: 3.7 },
		nose: { x: 50, y: 44 },
		ruff: { cx: 50, cy: 56, w: 21, rotate: 0 }
	};

	const SEATED_KITTEN: Omit<Geometry, 'scale'> = {
		pose: 'assis',
		head: { cx: 50, cy: 54, rx: 21, ry: 18.5 },
		earLeft: [
			[32, 48],
			[30, 30],
			[45, 39]
		],
		earRight: [
			[68, 48],
			[70, 30],
			[55, 39]
		],
		body: 'M38 92 C33 84 35 72 43 67 L57 67 C65 72 67 84 62 92 Z',
		bodyBox: { x0: 34, y0: 67, x1: 66, y1: 92 },
		paws: [
			{ cx: 45, cy: 91.5, rx: 5.2, ry: 3.4 },
			{ cx: 55, cy: 91.5, rx: 5.2, ry: 3.4 }
		],
		tail: 'M60 89 C71 91 77 84 74 75',
		tailWidth: 6.5,
		eyes: [
			{ cx: 41.5, cy: 53.5, rx: 5.6, ry: 6.3 },
			{ cx: 58.5, cy: 53.5, rx: 5.6, ry: 6.3 }
		],
		pupil: { rx: 2.8, ry: 3.8 },
		nose: { x: 50, y: 61.5 },
		ruff: { cx: 50, cy: 72.5, w: 15, rotate: 0 }
	};

	const LYING_ADULT: Omit<Geometry, 'scale'> = {
		pose: 'couche',
		head: { cx: 30, cy: 70, rx: 16, ry: 14 },
		earLeft: [
			[17, 65],
			[13, 51],
			[26, 58]
		],
		earRight: [
			[31, 57],
			[37, 45],
			[41, 61]
		],
		body: ellipsePath({ cx: 55, cy: 78, rx: 31, ry: 14.5 }),
		bodyBox: { x0: 24, y0: 63.5, x1: 86, y1: 92.5 },
		paws: [],
		tail: 'M83 84 C88 96 62 97 42 92',
		tailWidth: 7,
		eyes: [
			{ cx: 24, cy: 70.5, rx: 3.6, ry: 2 },
			{ cx: 36, cy: 70.5, rx: 3.6, ry: 2 }
		],
		pupil: { rx: 0, ry: 0 },
		nose: { x: 30, y: 76 },
		ruff: { cx: 43, cy: 75, w: 13, rotate: -65 }
	};

	const LYING_KITTEN: Omit<Geometry, 'scale'> = {
		pose: 'couche',
		head: { cx: 32, cy: 72, rx: 17, ry: 15.5 },
		earLeft: [
			[18, 67],
			[14, 52],
			[28, 59]
		],
		earRight: [
			[33, 58],
			[40, 47],
			[44, 64]
		],
		body: ellipsePath({ cx: 56, cy: 80, rx: 27, ry: 12.5 }),
		bodyBox: { x0: 29, y0: 67.5, x1: 83, y1: 92.5 },
		paws: [],
		tail: 'M79 86 C84 96 62 97 46 93',
		tailWidth: 6.5,
		eyes: [
			{ cx: 25.5, cy: 72.5, rx: 3.8, ry: 2.2 },
			{ cx: 38.5, cy: 72.5, rx: 3.8, ry: 2.2 }
		],
		pupil: { rx: 0, ry: 0 },
		nose: { x: 32, y: 78.5 },
		ruff: { cx: 45.5, cy: 77, w: 12, rotate: -65 }
	};

	const STAGE_SCALE: Record<MathouStage, number> = {
		chaton: 0.8,
		matou: 0.9,
		grand_matou: 1
	};

	// Positions relatives (0..1 dans la boîte englobante) des taches et des plaques
	const SPOTS_BODY: Point[] = [
		[0.2, 0.3],
		[0.5, 0.2],
		[0.8, 0.33],
		[0.33, 0.52],
		[0.67, 0.56],
		[0.18, 0.76],
		[0.5, 0.74],
		[0.82, 0.74],
		[0.48, 0.42]
	];
	const SPOTS_HEAD: Point[] = [
		[0.32, 0.12],
		[0.68, 0.12],
		[0.5, 0.04],
		[0.12, 0.6],
		[0.88, 0.6]
	];

	// Variables
	let { raceIndex, stage, asleep = false, silhouette = false, size = 96, label }: Props = $props();

	// Identifiant unique par instance : préfixe des clipPath et des dégradés
	const uid = $props.id();
	const clipBodyId = `${uid}-mathou-corps`;
	const clipHeadId = `${uid}-mathou-tete`;
	const smokeId = `${uid}-mathou-fume`;

	const race = $derived(getMathouRace(raceIndex));

	const geo: Geometry = $derived.by(() => {
		const kitten = stage === 'chaton';
		const base = asleep
			? kitten
				? LYING_KITTEN
				: LYING_ADULT
			: kitten
				? SEATED_KITTEN
				: SEATED_ADULT;
		return { ...base, scale: STAGE_SCALE[stage] };
	});

	// Épaisseurs compensées par l'échelle : le trait garde la même épaisseur à l'écran
	const sw = $derived(OUTLINE / geo.scale);
	const fine = $derived(1.1 / geo.scale);
	const transform = $derived(`translate(50 95) scale(${geo.scale}) translate(-50 -95)`);

	const pattern = $derived(race.pattern);

	const earFill = $derived.by((): [string, string] => {
		if (pattern === 'pointes' || pattern === 'van') return [race.secondary, race.secondary];
		if (pattern === 'tricolore') return [race.secondary, race.tertiary ?? race.secondary];
		return [race.primary, race.primary];
	});

	const pawFill = $derived(
		['smoking', 'bicolore', 'chaussettes', 'pointes'].includes(pattern)
			? race.secondary
			: race.primary
	);

	const tailFill = $derived(
		['pointes', 'van', 'fume'].includes(pattern) ? race.secondary : race.primary
	);

	// Anneaux sur la queue (tigré, marbré, masqué)
	const tailRings = $derived(['tigre', 'marbre', 'masque'].includes(pattern));

	// Couleur sous la bouche : décide de l'encre (sombre ou claire) des moustaches et de la bouche
	const faceFill = $derived(
		pattern === 'smoking' || pattern === 'bicolore' || pattern === 'pointes'
			? race.secondary
			: race.primary
	);
	const faceInk = $derived(lightness(faceFill) < 45 ? CHAT_NOIR.creme : INK);

	const ruffPath = $derived(buildRuff(geo.ruff.cx, geo.ruff.cy, geo.ruff.w));

	// Fonctions
	function ellipsePath(e: Ellipse): string {
		const { cx, cy, rx, ry } = e;
		return `M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
	}

	function trianglePath(points: Point[]): string {
		return `M${points.map(([x, y]) => `${x} ${y}`).join(' L')} Z`;
	}

	// Triangle intérieur de l'oreille : rétréci vers le centre, décalé vers la base
	function innerEar(points: Point[]): string {
		const gx = (points[0][0] + points[1][0] + points[2][0]) / 3;
		const gy = (points[0][1] + points[1][1] + points[2][1]) / 3 + 1.5;
		return trianglePath(points.map(([x, y]): Point => [gx + (x - gx) * 0.5, gy + (y - gy) * 0.5]));
	}

	function lightness(color: string): number {
		const match = /,\s*([\d.]+)%\s*\)/.exec(color);
		return match ? Number(match[1]) : 50;
	}

	function round(n: number): number {
		return Math.round(n * 100) / 100;
	}

	// Collerette : bord supérieur en arc, bord inférieur festonné
	function buildRuff(cx: number, cy: number, w: number): string {
		const scallops = 6;
		const step = (2 * w) / scallops;
		const r = step / 2 + 0.4;
		let d = `M${cx - w} ${cy} Q${cx} ${cy - 5} ${cx + w} ${cy}`;
		for (let i = 1; i <= scallops; i++) {
			const x = cx + w - i * step;
			const t = (x - cx) / w;
			const y = cy + 4.5 - 2.5 * t * t;
			d += ` A${round(r)} ${round(r)} 0 0 1 ${round(x)} ${round(y)}`;
		}
		return `${d} Z`;
	}

	// Spirale de la gidouille (Ubu)
	function spiralPath(cx: number, cy: number, maxR: number): string {
		const turns = 2.6;
		const steps = 60;
		const thetaMax = turns * 2 * Math.PI;
		const points: string[] = [];
		for (let i = 0; i <= steps; i++) {
			const theta = (i / steps) * thetaMax;
			const r = (maxR * theta) / thetaMax;
			points.push(`${round(cx + r * Math.cos(theta))} ${round(cy + r * Math.sin(theta))}`);
		}
		return `M${points.join(' L')}`;
	}

	function starPath(cx: number, cy: number, outer: number): string {
		const inner = outer * 0.45;
		const points: string[] = [];
		for (let i = 0; i < 10; i++) {
			const r = i % 2 === 0 ? outer : inner;
			const a = -Math.PI / 2 + (i * Math.PI) / 5;
			points.push(`${round(cx + r * Math.cos(a))} ${round(cy + r * Math.sin(a))}`);
		}
		return `M${points.join(' L')} Z`;
	}

	function headBox(h: Ellipse) {
		return { x0: h.cx - h.rx, y0: h.cy - h.ry, w: 2 * h.rx, h: 2 * h.ry };
	}

	// Rayures du front (tigré, marbré)
	function foreheadStripes(h: Ellipse): string {
		const top = h.cy - h.ry;
		return [
			`M${h.cx - 4.5} ${top + 1} L${h.cx - 3.5} ${top + 6}`,
			`M${h.cx} ${top} L${h.cx} ${top + 8}`,
			`M${h.cx + 4.5} ${top + 1} L${h.cx + 3.5} ${top + 6}`
		].join(' ');
	}

	// Rayures du corps : depuis les flancs (assis) ou depuis le dos (couché)
	function bodyStripes(g: Geometry): string {
		const b = g.bodyBox;
		if (g.pose === 'assis') {
			const h = b.y1 - b.y0;
			return [0.22, 0.42, 0.62, 0.82]
				.map((v) => {
					const y = round(b.y0 + v * h);
					return `M${b.x0 - 1} ${y} Q${b.x0 + 6} ${y + 1} ${b.x0 + 10} ${y + 3} M${b.x1 + 1} ${y} Q${b.x1 - 6} ${y + 1} ${b.x1 - 10} ${y + 3}`;
				})
				.join(' ');
		}
		const w = b.x1 - b.x0;
		return [0.3, 0.45, 0.6, 0.75, 0.9]
			.map((u) => {
				const x = round(b.x0 + u * w);
				return `M${x} ${b.y0 - 1} Q${x + 1} ${b.y0 + 6} ${x + 3} ${b.y0 + 10}`;
			})
			.join(' ');
	}

	// Pavage en losanges de l'arlequin
	function harlequinDiamonds(g: Geometry): { d: string; colorIndex: number }[] {
		const b = g.bodyBox;
		const a = 5;
		const bh = 7;
		const result: { d: string; colorIndex: number }[] = [];
		for (let j = 0; b.y0 + (j - 1) * bh <= b.y1; j++) {
			for (let i = 0; b.x0 + (i - 1) * 2 * a <= b.x1; i++) {
				const cx = b.x0 + i * 2 * a + (j % 2 === 1 ? a : 0);
				const cy = b.y0 + j * bh;
				result.push({
					d: `M${cx} ${cy - bh} L${cx + a} ${cy} L${cx} ${cy + bh} L${cx - a} ${cy} Z`,
					colorIndex: (i + j) % 3
				});
			}
		}
		return result;
	}

	function zigzag(x: number, y: number, s: number): string {
		return `M${x} ${y} h${s} l${-s} ${s} h${s}`;
	}
</script>

{#snippet motif(part: Part)}
	{@const b = geo.bodyBox}
	{@const bw = b.x1 - b.x0}
	{@const bh = b.y1 - b.y0}
	{@const bcx = (b.x0 + b.x1) / 2}
	{@const h = geo.head}
	{@const hb = headBox(h)}
	{@const seated = geo.pose === 'assis'}
	{#if pattern === 'tigre'}
		<path
			d={part === 'head'
				? `${foreheadStripes(h)} M${h.cx - h.rx - 1} ${h.cy + 3} L${h.cx - h.rx + 6} ${h.cy + 4} M${h.cx + h.rx + 1} ${h.cy + 3} L${h.cx + h.rx - 6} ${h.cy + 4}`
				: bodyStripes(geo)}
			fill="none"
			stroke={race.secondary}
			stroke-width={3.2}
			stroke-linecap="round"
		/>
	{:else if pattern === 'tachete'}
		{#each part === 'head' ? SPOTS_HEAD : SPOTS_BODY as [u, v], i (i)}
			<circle
				cx={part === 'head' ? hb.x0 + u * hb.w : b.x0 + u * bw}
				cy={part === 'head' ? hb.y0 + v * hb.h : b.y0 + v * bh}
				r={part === 'head' ? 2.2 : 2.8}
				fill={race.secondary}
			/>
		{/each}
	{:else if pattern === 'bicolore'}
		{#if part === 'head'}
			<path
				d={`M${h.cx} ${h.cy - h.ry * 0.35} L${h.cx + h.rx * 0.75} ${h.cy + h.ry * 1.1} L${h.cx - h.rx * 0.75} ${h.cy + h.ry * 1.1} Z`}
				fill={race.secondary}
			/>
		{:else}
			<ellipse
				cx={seated ? bcx : bcx + 4}
				cy={b.y1}
				rx={bw * (seated ? 0.42 : 0.45)}
				ry={bh * (seated ? 0.62 : 0.45)}
				fill={race.secondary}
			/>
		{/if}
	{:else if pattern === 'smoking'}
		{#if part === 'head'}
			<ellipse
				cx={h.cx}
				cy={h.cy + h.ry * 0.55}
				rx={h.rx * 0.45}
				ry={h.ry * 0.45}
				fill={race.secondary}
			/>
		{:else if seated}
			<ellipse cx={bcx} cy={b.y0 + bh * 0.3} rx={bw * 0.2} ry={bh * 0.42} fill={race.secondary} />
		{:else}
			<!-- Couché : plastron blanc sous le menton -->
			<ellipse cx={h.cx + 12} cy={b.y1 - 4} rx={9} ry={7} fill={race.secondary} />
		{/if}
	{:else if pattern === 'ecaille'}
		{#if part === 'head'}
			<ellipse
				cx={h.cx - h.rx * 0.5}
				cy={h.cy - h.ry * 0.45}
				rx={h.rx * 0.45}
				ry={h.ry * 0.4}
				fill={race.secondary}
			/>
			<ellipse
				cx={h.cx + h.rx * 0.55}
				cy={h.cy + h.ry * 0.45}
				rx={h.rx * 0.35}
				ry={h.ry * 0.32}
				fill={race.tertiary}
			/>
		{:else}
			{#each [[0.25, 0.3, 0], [0.7, 0.22, 1], [0.4, 0.62, 1], [0.78, 0.66, 0], [0.18, 0.85, 1]] as [u, v, c], i (i)}
				<ellipse
					cx={b.x0 + u * bw}
					cy={b.y0 + v * bh}
					rx={7}
					ry={4.5}
					transform={`rotate(${i * 37 - 30} ${b.x0 + u * bw} ${b.y0 + v * bh})`}
					fill={c === 0 ? race.secondary : race.tertiary}
				/>
			{/each}
		{/if}
	{:else if pattern === 'tricolore'}
		{#if part === 'head'}
			<ellipse
				cx={h.cx - h.rx * 0.65}
				cy={h.cy - h.ry * 0.6}
				rx={h.rx * 0.6}
				ry={h.ry * 0.55}
				fill={race.secondary}
			/>
			<ellipse
				cx={h.cx + h.rx * 0.7}
				cy={h.cy - h.ry * 0.55}
				rx={h.rx * 0.5}
				ry={h.ry * 0.5}
				fill={race.tertiary}
			/>
		{:else}
			<ellipse
				cx={b.x0 + bw * 0.2}
				cy={b.y0 + bh * 0.35}
				rx={bw * 0.3}
				ry={bh * 0.28}
				fill={race.secondary}
			/>
			<ellipse
				cx={b.x0 + bw * 0.85}
				cy={b.y0 + bh * 0.62}
				rx={bw * 0.25}
				ry={bh * 0.25}
				fill={race.tertiary}
			/>
			<ellipse
				cx={b.x0 + bw * 0.45}
				cy={b.y0 + bh * 0.92}
				rx={bw * 0.18}
				ry={bh * 0.14}
				fill={race.secondary}
			/>
		{/if}
	{:else if pattern === 'pointes'}
		{#if part === 'head'}
			<ellipse
				cx={h.cx}
				cy={h.cy + h.ry * 0.35}
				rx={h.rx * 0.62}
				ry={h.ry * 0.62}
				fill={race.secondary}
			/>
		{/if}
	{:else if pattern === 'van'}
		{#if part === 'head'}
			<ellipse
				cx={h.cx - h.rx * 0.55}
				cy={h.cy - h.ry * 0.75}
				rx={h.rx * 0.55}
				ry={h.ry * 0.5}
				fill={race.secondary}
			/>
			<ellipse
				cx={h.cx + h.rx * 0.55}
				cy={h.cy - h.ry * 0.75}
				rx={h.rx * 0.55}
				ry={h.ry * 0.5}
				fill={race.secondary}
			/>
		{/if}
	{:else if pattern === 'masque'}
		{#if part === 'head'}
			<rect
				x={h.cx - h.rx - 1}
				y={geo.eyes[0].cy - h.ry * 0.3}
				width={2 * h.rx + 2}
				height={h.ry * 0.6}
				rx={h.ry * 0.3}
				fill={race.secondary}
			/>
		{/if}
	{:else if pattern === 'chaussettes'}
		{#if part === 'head'}
			<ellipse
				cx={h.cx}
				cy={h.cy + h.ry * 0.95}
				rx={h.rx * 0.35}
				ry={h.ry * 0.3}
				fill={race.secondary}
			/>
		{:else if seated}
			<ellipse cx={bcx} cy={b.y0 + bh * 0.25} rx={bw * 0.12} ry={bh * 0.14} fill={race.secondary} />
		{/if}
	{:else if pattern === 'marbre'}
		{#if part === 'head'}
			<path
				d={foreheadStripes(h)}
				fill="none"
				stroke={race.secondary}
				stroke-width={3}
				stroke-linecap="round"
			/>
		{:else if seated}
			{#each [b.x0 + 4, b.x1 - 4] as x (x)}
				<circle
					cx={x}
					cy={b.y0 + bh * 0.55}
					r={8}
					fill="none"
					stroke={race.secondary}
					stroke-width={3}
				/>
				<circle cx={x} cy={b.y0 + bh * 0.55} r={2.8} fill={race.secondary} />
			{/each}
		{:else}
			<circle
				cx={bcx + 4}
				cy={b.y0 + bh * 0.48}
				r={8.5}
				fill="none"
				stroke={race.secondary}
				stroke-width={3}
			/>
			<circle cx={bcx + 4} cy={b.y0 + bh * 0.48} r={3} fill={race.secondary} />
		{/if}
	{:else if pattern === 'fume'}
		<rect
			x={part === 'head' ? hb.x0 : b.x0}
			y={part === 'head' ? hb.y0 : b.y0}
			width={part === 'head' ? hb.w : bw}
			height={part === 'head' ? hb.h : bh}
			fill={`url(#${smokeId})`}
		/>
	{:else if pattern === 'gidouille'}
		{#if part === 'body'}
			<path
				d={seated ? spiralPath(bcx, b.y0 + bh * 0.6, 9) : spiralPath(bcx + 5, b.y0 + bh * 0.5, 8)}
				fill="none"
				stroke={race.secondary}
				stroke-width={2.6}
				stroke-linecap="round"
			/>
		{/if}
	{:else if pattern === 'arlequin'}
		{#if part === 'body'}
			{#each harlequinDiamonds(geo) as diamond, i (i)}
				<path
					d={diamond.d}
					fill={diamond.colorIndex === 0
						? race.secondary
						: diamond.colorIndex === 1
							? race.tertiary
							: race.primary}
				/>
			{/each}
		{/if}
	{:else if pattern === 'plastron'}
		{#if part === 'body'}
			{@const mx = seated ? bcx : bcx + 4}
			{@const my = seated ? b.y0 + bh * 0.32 : b.y0 + bh * 0.5}
			<circle cx={mx} cy={my} r={7.5} fill={race.secondary} />
			<circle cx={mx} cy={my - 3.2} r={6.6} fill={race.primary} />
		{/if}
	{:else if pattern === 'etoile'}
		{#if part === 'head'}
			<path d={starPath(h.cx, h.cy - h.ry * 0.55, 4.6)} fill={race.secondary} />
		{:else}
			<path
				d={seated ? starPath(bcx, b.y0 + bh * 0.35, 4.2) : starPath(bcx + 4, b.y0 + bh * 0.5, 4.2)}
				fill={race.secondary}
			/>
		{/if}
	{/if}
{/snippet}

<svg
	role="img"
	aria-label={label}
	width={size}
	height={size}
	viewBox="0 0 100 100"
	class="mathou-avatar"
	data-stage={stage}
	data-asleep={asleep ? 'true' : undefined}
	data-silhouette={silhouette ? 'true' : undefined}
>
	<defs>
		<clipPath id={clipBodyId}>
			<path d={geo.body} />
		</clipPath>
		<clipPath id={clipHeadId}>
			<ellipse cx={geo.head.cx} cy={geo.head.cy} rx={geo.head.rx} ry={geo.head.ry} />
		</clipPath>
		{#if !silhouette && pattern === 'fume'}
			<!-- Fumé : sous-poil clair, extrémités sombres -->
			<radialGradient id={smokeId} cx="0.5" cy="0.55" r="0.6">
				<stop offset="0.4" stop-color={race.secondary} stop-opacity="0" />
				<stop offset="1" stop-color={race.secondary} stop-opacity="0.95" />
			</radialGradient>
		{/if}
	</defs>

	<g {transform} stroke-linejoin="round">
		{#if silhouette}
			<!-- Silhouette : une seule couleur, aucun détail de race -->
			<g style={SILHOUETTE_STYLE} data-part="silhouette">
				<path
					d={geo.tail}
					fill="none"
					stroke-width={geo.tailWidth + 2}
					stroke-linecap="round"
					style="stroke: var(--color-muted-foreground, hsl(220 10% 42%))"
				/>
				<path d={geo.body} />
				{#each geo.paws as paw, i (i)}
					<ellipse cx={paw.cx} cy={paw.cy} rx={paw.rx} ry={paw.ry} />
				{/each}
				<path d={trianglePath(geo.earLeft)} />
				<path d={trianglePath(geo.earRight)} />
				<ellipse cx={geo.head.cx} cy={geo.head.cy} rx={geo.head.rx} ry={geo.head.ry} />
			</g>
		{:else}
			<!-- Liseré clair (mode sombre seulement) -->
			<g fill="none" stroke-width={sw + 3} stroke-linecap="round" style={RIM_STYLE}>
				<path d={geo.tail} stroke-width={geo.tailWidth + sw + 3} />
				<path d={geo.body} />
				{#each geo.paws as paw, i (i)}
					<ellipse cx={paw.cx} cy={paw.cy} rx={paw.rx} ry={paw.ry} />
				{/each}
				<path d={trianglePath(geo.earLeft)} />
				<path d={trianglePath(geo.earRight)} />
				<ellipse cx={geo.head.cx} cy={geo.head.cy} rx={geo.head.rx} ry={geo.head.ry} />
			</g>

			{#snippet tailShape()}
				<g data-part="queue">
					<path
						d={geo.tail}
						fill="none"
						stroke={INK}
						stroke-width={geo.tailWidth + sw}
						stroke-linecap="round"
					/>
					<path
						d={geo.tail}
						fill="none"
						stroke={tailFill}
						stroke-width={geo.tailWidth - sw * 0.3}
						stroke-linecap="round"
					/>
					{#if tailRings}
						<path
							d={geo.tail}
							fill="none"
							stroke={race.secondary}
							stroke-width={geo.tailWidth - sw * 0.3}
							stroke-dasharray="3 5"
						/>
					{/if}
					{#if pattern === 'chaussettes'}
						<path
							d={geo.tail}
							fill="none"
							stroke={race.secondary}
							stroke-width={geo.tailWidth - sw * 0.3}
							stroke-linecap="round"
							pathLength="100"
							stroke-dasharray="0 82 18"
						/>
					{/if}
				</g>
			{/snippet}

			{#snippet bodyShape()}
				<path d={geo.body} fill={race.primary} />
				<g clip-path={`url(#${clipBodyId})`} data-part="motif">
					{@render motif('body')}
				</g>
				<path d={geo.body} fill="none" stroke={INK} stroke-width={sw} />
				{#each geo.paws as paw, i (i)}
					<ellipse
						cx={paw.cx}
						cy={paw.cy}
						rx={paw.rx}
						ry={paw.ry}
						fill={pawFill}
						stroke={INK}
						stroke-width={sw}
					/>
					<path
						d={`M${paw.cx - paw.rx * 0.3} ${paw.cy + paw.ry * 0.1} v${paw.ry * 0.7} M${paw.cx + paw.rx * 0.3} ${paw.cy + paw.ry * 0.1} v${paw.ry * 0.7}`}
						stroke={INK}
						stroke-width={fine}
						stroke-linecap="round"
					/>
				{/each}
			{/snippet}

			{#if geo.pose === 'assis'}
				{@render tailShape()}
				{@render bodyShape()}
			{:else}
				{@render bodyShape()}
				{@render tailShape()}
			{/if}

			{#if stage === 'grand_matou'}
				<!-- Attribut du grand matou : la collerette -->
				<path
					d={ruffPath}
					transform={`rotate(${geo.ruff.rotate} ${geo.ruff.cx} ${geo.ruff.cy})`}
					fill={CHAT_NOIR.creme}
					stroke={INK}
					stroke-width={sw * 0.8}
					data-part="collerette"
				/>
			{/if}

			<!-- Oreilles -->
			<path d={trianglePath(geo.earLeft)} fill={earFill[0]} stroke={INK} stroke-width={sw} />
			<path d={trianglePath(geo.earRight)} fill={earFill[1]} stroke={INK} stroke-width={sw} />
			<path d={innerEar(geo.earLeft)} fill={EAR_INNER} />
			<path d={innerEar(geo.earRight)} fill={EAR_INNER} />

			<!-- Tête -->
			<ellipse
				cx={geo.head.cx}
				cy={geo.head.cy}
				rx={geo.head.rx}
				ry={geo.head.ry}
				fill={race.primary}
			/>
			<g clip-path={`url(#${clipHeadId})`} data-part="motif">
				{@render motif('head')}
			</g>
			<ellipse
				cx={geo.head.cx}
				cy={geo.head.cy}
				rx={geo.head.rx}
				ry={geo.head.ry}
				fill="none"
				stroke={INK}
				stroke-width={sw}
			/>

			<!-- Yeux -->
			<g data-part="yeux">
				{#each geo.eyes as eye, i (i)}
					{#if asleep}
						<path
							d={`M${eye.cx - eye.rx} ${eye.cy - eye.ry * 0.3} Q${eye.cx} ${eye.cy + eye.ry * 1.4} ${eye.cx + eye.rx} ${eye.cy - eye.ry * 0.3}`}
							fill="none"
							stroke={pattern === 'masque' || lightness(race.primary) < 45 ? CHAT_NOIR.creme : INK}
							stroke-width={sw * 0.7}
							stroke-linecap="round"
						/>
					{:else}
						<ellipse
							cx={eye.cx}
							cy={eye.cy}
							rx={eye.rx}
							ry={eye.ry}
							fill={race.eyes}
							stroke={INK}
							stroke-width={sw * 0.5}
						/>
						<ellipse cx={eye.cx} cy={eye.cy} rx={geo.pupil.rx} ry={geo.pupil.ry} fill={INK} />
						<circle
							cx={eye.cx + eye.rx * 0.35}
							cy={eye.cy - eye.ry * 0.4}
							r={eye.rx * 0.28}
							fill="white"
						/>
					{/if}
				{/each}
			</g>

			<!-- Nez, bouche, moustaches -->
			<path
				d={`M${geo.nose.x - 2.4} ${geo.nose.y - 1} L${geo.nose.x + 2.4} ${geo.nose.y - 1} L${geo.nose.x} ${geo.nose.y + 1.8} Z`}
				fill={NOSE}
				stroke={INK}
				stroke-width={fine * 0.8}
			/>
			<g fill="none" stroke={faceInk} stroke-width={fine} stroke-linecap="round">
				<path
					d={`M${geo.nose.x} ${geo.nose.y + 1.8} q-1.6 3 -4 1.8 M${geo.nose.x} ${geo.nose.y + 1.8} q1.6 3 4 1.8`}
				/>
				{#if !asleep}
					<path
						d={`M${geo.nose.x - 8} ${geo.nose.y + 1} l-12 -2 M${geo.nose.x - 8} ${geo.nose.y + 3} l-11 2 M${geo.nose.x + 8} ${geo.nose.y + 1} l12 -2 M${geo.nose.x + 8} ${geo.nose.y + 3} l11 2`}
					/>
				{/if}
			</g>
		{/if}
	</g>

	{#if asleep && !silhouette}
		<!-- « Zzz » dessiné en traits (pas de texte) -->
		<g
			data-part="zzz"
			fill="none"
			stroke-width="2.6"
			stroke-linecap="round"
			stroke-linejoin="round"
			style="stroke: var(--color-muted-foreground, hsl(220 10% 42%))"
		>
			<path d={zigzag(52, 50, 6)} />
			<path d={zigzag(64, 34, 8)} />
			<path d={zigzag(78, 14, 11)} />
		</g>
	{/if}
</svg>

<style>
	.mathou-avatar {
		display: inline-block;
		flex-shrink: 0;
		overflow: visible;
	}
</style>
