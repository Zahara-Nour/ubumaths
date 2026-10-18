<!--
	MathouAvatar — un Mathou (chat du Docteur Faustroll) dessiné en SVG inline, direction « AB3 » :
	le chat-poire bonhomme-digne, gidouille sur la panse, sur une affiche jaune avec auréole.

	La race (couleurs + motif) vient de mathou-races.ts, le gabarit du stade (mathou-dessin.ts) :
	chaton (grosse tête, petite panse), matou, grand matou (panse royale, couronne, fraise et bâton,
	dans une gloire rayonnante). En sieste : yeux fermés, bonnet de nuit, lune et « Zzz » dessinés
	(pas de texte ni de police). En silhouette (pas encore découvert) : une forme unie, sans aucun
	détail de race. Le dessin porte son propre fond (la pastille jaune) : il tient en clair et en sombre.
-->
<script lang="ts">
	import { getMathouRace, type MathouStage } from './mathou-races';
	import {
		CREAM,
		INK,
		MOON,
		NIGHTCAP,
		RED,
		SILHOUETTE_FILL,
		SILHOUETTE_LINE,
		YELLOW,
		crown,
		dressing,
		faceDrawing,
		pearGeometry,
		rays,
		ruff,
		zzz,
		type FaceMode
	} from './mathou-dessin';

	// Types
	interface Props {
		/** 0..18, une race par branche ; au-delà, modulo 19 */
		raceIndex: number;
		stage: MathouStage;
		/** Sieste : yeux fermés, bonnet de nuit, « Zzz » */
		asleep?: boolean;
		/** Pas encore découvert : silhouette unie */
		silhouette?: boolean;
		/** Taille en px */
		size?: number;
		/** Texte alternatif */
		label: string;
	}

	// Constantes
	const STROKE = 3;

	// Variables
	let { raceIndex, stage, asleep = false, silhouette = false, size = 96, label }: Props = $props();

	const uid = $props.id();
	const cardId = `${uid}-mathou-carte`;
	const bodyClipId = `${uid}-mathou-corps`;
	const capClipId = `${uid}-mathou-bonnet`;
	const smokeId = `${uid}-mathou-fume`;
	const eyeClipId = (i: number): string => `${uid}-mathou-oeil-${i}`;

	const race = $derived(getMathouRace(raceIndex));
	const geo = $derived(pearGeometry(stage));
	const dr = $derived(dressing(race, geo));
	const sleeping = $derived(asleep && !silhouette);
	const majesty = $derived(stage === 'grand_matou' && !sleeping);
	const mode = $derived<FaceMode>(sleeping ? 'closed' : majesty ? 'proud' : 'open');
	const face = $derived(faceDrawing(geo, dr, mode));
	const st = $derived(geo.stage);
	// Auréole derrière la tête : plus large pour la grosse tête du chaton
	const haloR = $derived(stage === 'chaton' ? 46 : stage === 'matou' ? 40 : 34);
	const haloY = $derived(geo.hy - (majesty ? 6 : 4));
	const crownShape = $derived(crown(geo.hx, st.top - 6));
	const ruffPuffs = $derived(ruff(geo.hx, geo.shoulderY + 2));
	// Bonnet de nuit dessiné pour la tête du matou, ramené à la tête du stade : le bord du bonnet
	// (y = 56 dans son dessin) se pose juste au-dessus des yeux fermés
	const capScale = $derived(Math.min(st.hw / 26, 1.15));
	const capTransform = $derived(
		`translate(100 ${geo.hy - st.eye * 0.6}) scale(${capScale}) translate(-100 -56)`
	);
	// « Zzz » à droite de la tête, sous le pompon
	const ZZZ_AT: Record<MathouStage, [number, number]> = {
		chaton: [156, 36],
		matou: [150, 32],
		grand_matou: [158, 30]
	};
	const zPaths = $derived(zzz(ZZZ_AT[stage][0], geo.hy + ZZZ_AT[stage][1], 0.9));
</script>

<svg
	role="img"
	aria-label={label}
	width={size}
	height={size}
	viewBox="0 0 200 200"
	class="mathou-avatar"
	data-stage={stage}
	data-asleep={sleeping ? 'true' : undefined}
	data-silhouette={silhouette ? 'true' : undefined}
>
	<defs>
		<clipPath id={cardId}>
			<rect width="200" height="200" rx="28" />
		</clipPath>
		<clipPath id={bodyClipId}>
			<path d={geo.body} />
		</clipPath>
		{#if !silhouette}
			{#each face.eyes as eye, i (i)}
				<clipPath id={eyeClipId(i)}>
					<path d={eye.shape} />
				</clipPath>
			{/each}
			{#if sleeping}
				<clipPath id={capClipId}>
					<path d={NIGHTCAP.cap} />
				</clipPath>
			{/if}
			{#if dr.smoke}
				<!-- Fumé : sous-poil clair au cœur de la panse, pointes sombres au bord -->
				<radialGradient id={smokeId} cx="0.5" cy="0.62" r="0.55">
					<stop offset="0" stop-color={dr.smoke} stop-opacity="0.9" />
					<stop offset="0.75" stop-color={dr.smoke} stop-opacity="0" />
				</radialGradient>
			{/if}
		{/if}
	</defs>

	<!-- L'affiche : fond jaune, auréole ou gloire, lune de la sieste -->
	<g clip-path={`url(#${cardId})`}>
		<rect width="200" height="200" rx="28" fill={YELLOW} />
		{#if silhouette}
			<circle
				cx="100"
				cy={haloY}
				r={haloR}
				fill="none"
				stroke={SILHOUETTE_LINE}
				stroke-width="3"
				stroke-dasharray="7 6"
				opacity="0.8"
			/>
		{:else if sleeping}
			<path d={MOON} fill={race.halo} />
		{:else if majesty}
			<path d={rays(100, haloY)} fill={race.halo} />
			<circle cx="100" cy={haloY} r={haloR} fill={race.halo} stroke={YELLOW} stroke-width="2.5" />
		{:else}
			<circle cx="100" cy={haloY} r={haloR} fill={race.halo} />
		{/if}
	</g>
	<ellipse
		cx="100"
		cy={sleeping ? 184 : st.bot + 6}
		rx={sleeping ? st.bw + 16 : st.bw + 14}
		ry="5"
		fill={INK}
		opacity="0.18"
	/>

	{#if silhouette}
		<!-- Silhouette : une seule couleur, aucun détail de race -->
		<g data-part="silhouette" fill={SILHOUETTE_FILL}>
			<path d={geo.ears} />
			<path
				d={geo.tail}
				fill="none"
				stroke={SILHOUETTE_FILL}
				stroke-width="7"
				stroke-linecap="round"
			/>
			{#each geo.feet as foot, i (i)}
				<ellipse
					cx={foot.cx}
					cy={foot.cy}
					rx={foot.rx}
					ry={foot.ry}
					transform={`rotate(${foot.rotate} ${foot.cx} ${foot.cy})`}
				/>
			{/each}
			<path d={geo.body} />
			<path
				d={geo.gidouille}
				fill="none"
				stroke={SILHOUETTE_LINE}
				stroke-width="3"
				stroke-dasharray="2 5"
				stroke-linecap="round"
			/>
		</g>
	{:else}
		{#if majesty}
			<!-- Bâton du grand matou, derrière la panse -->
			<path
				d={`M26 ${st.top + 6}Q31 120 38 186`}
				fill="none"
				stroke={INK}
				stroke-width="5"
				stroke-linecap="round"
			/>
			<circle cx="26" cy={st.top + 4} r="7" fill={RED} stroke={INK} stroke-width="2.6" />
		{/if}

		<g
			transform={sleeping ? 'rotate(5 100 180)' : undefined}
			stroke-linejoin="round"
			data-part="mathou"
		>
			<!-- Oreilles -->
			{#each geo.earsOuter as ear, i (i)}
				<path d={ear} fill={dr.ears[i]} stroke={INK} stroke-width={STROKE} />
			{/each}
			{#each geo.earsInner as ear, i (i)}
				<path d={ear} fill={dr.earsInner[i]} />
			{/each}

			<!-- Queue en tire-bouchon -->
			<g data-part="queue" fill="none" stroke-linecap="round">
				<path d={geo.tail} stroke={INK} stroke-width="9" />
				<path d={geo.tail} stroke={dr.tail} stroke-width="5" />
				{#if dr.tailRings}
					<path d={geo.tail} stroke={dr.tailRings} stroke-width="5" stroke-dasharray="3 5" />
				{/if}
				{#if dr.tailTip}
					<path
						d={geo.tail}
						stroke={dr.tailTip}
						stroke-width="5"
						pathLength="100"
						stroke-dasharray="0 78 22"
					/>
				{/if}
			</g>

			<!-- Pieds -->
			{#each geo.feet as foot, i (i)}
				<ellipse
					cx={foot.cx}
					cy={foot.cy}
					rx={foot.rx}
					ry={foot.ry}
					transform={`rotate(${foot.rotate} ${foot.cx} ${foot.cy})`}
					fill={dr.feet[i]}
					stroke={INK}
					stroke-width={STROKE}
				/>
			{/each}

			<!-- Corps en poire, motif découpé dedans, ombre propre, contour -->
			<path d={geo.body} fill={race.primary} />
			<g clip-path={`url(#${bodyClipId})`} data-part="motif">
				{#if dr.smoke}
					<path d={geo.body} fill={`url(#${smokeId})`} />
				{/if}
				{#each dr.layers as layer, i (i)}
					<path
						d={layer.d}
						fill={layer.fill}
						opacity={layer.opacity}
						stroke={layer.stroke}
						stroke-width={layer.width}
						stroke-linecap="round"
					/>
				{/each}
				<path d={geo.shade} fill={dr.shadeFill} opacity={dr.shadeOpacity} data-part="ombre" />
			</g>
			<path d={geo.body} fill="none" stroke={INK} stroke-width={STROKE} />

			<!-- La gidouille -->
			<path
				d={geo.gidouille}
				fill="none"
				stroke={dr.gidouille.color}
				stroke-width={dr.gidouille.width}
				stroke-linecap="round"
				data-part="gidouille"
			/>

			<!-- Yeux -->
			<g data-part="yeux">
				{#each face.closedEyes as closed, i (i)}
					<path
						d={closed.d}
						fill="none"
						stroke={closed.color}
						stroke-width="2.4"
						stroke-linecap="round"
					/>
				{/each}
				{#each face.eyes as eye, i (i)}
					<path d={eye.shape} fill={race.eyes} />
					<g clip-path={`url(#${eyeClipId(i)})`}>
						<ellipse
							cx={eye.pupil.cx}
							cy={eye.pupil.cy}
							rx={eye.pupil.rx}
							ry={eye.pupil.ry}
							fill={INK}
						/>
						{#if eye.glint}
							<circle
								cx={eye.glint.cx}
								cy={eye.glint.cy}
								r={eye.glint.r}
								fill={CREAM}
								opacity="0.85"
							/>
						{/if}
						{#if eye.lid}
							<rect
								x={eye.lid.x}
								y={eye.lid.y}
								width={eye.lid.width}
								height={eye.lid.height}
								fill={eye.fur}
							/>
							<path d={eye.lid.line} stroke={INK} stroke-width="2.6" />
						{/if}
					</g>
					{#if eye.outline}
						<path d={eye.shape} fill="none" stroke={INK} stroke-width="1.5" />
					{/if}
				{/each}
			</g>

			<!-- Sourcils, truffe, bouche, moustaches -->
			<g fill="none" stroke-linecap="round" stroke-width={face.browWidth}>
				{#each face.brows as brow, i (i)}
					<path d={brow.d} stroke={brow.color} />
				{/each}
			</g>
			<path d={face.nose} fill={face.noseFill} />
			<path
				d={face.mouth}
				fill="none"
				stroke={face.mouthColor}
				stroke-width="1.6"
				stroke-linecap="round"
			/>
			<path d={face.whiskers} fill="none" stroke={INK} stroke-width="1.4" stroke-linecap="round" />
			{#if face.innerWhiskers}
				<path
					d={face.innerWhiskers}
					fill="none"
					stroke={CREAM}
					stroke-width="1.4"
					stroke-linecap="round"
				/>
			{/if}

			{#if stage === 'grand_matou'}
				<!-- Attribut du grand matou : la fraise -->
				<g data-part="collerette" fill={CREAM} stroke={INK} stroke-width="2.2">
					{#each ruffPuffs as puff, i (i)}
						<circle cx={puff.cx} cy={puff.cy} r="6" />
					{/each}
				</g>
			{/if}

			{#if majesty}
				<!-- Couronne -->
				<g data-part="couronne">
					<path d={crownShape.d} fill={RED} stroke={INK} stroke-width="2.6" />
					{#each crownShape.pearls as pearl, i (i)}
						<circle
							cx={pearl.cx}
							cy={pearl.cy}
							r={pearl.r}
							fill={YELLOW}
							stroke={INK}
							stroke-width="1.5"
						/>
					{/each}
				</g>
			{/if}

			{#if sleeping}
				<!-- Bonnet de nuit rayé -->
				<g transform={capTransform} data-part="bonnet">
					<path d={NIGHTCAP.cap} fill={CREAM} stroke={INK} stroke-width="3.2" />
					<path
						d={NIGHTCAP.stripes}
						clip-path={`url(#${capClipId})`}
						fill="none"
						stroke={RED}
						stroke-width="5"
					/>
					<path d={NIGHTCAP.band} fill={CREAM} stroke={INK} stroke-width="3" />
					<circle
						cx={NIGHTCAP.pompom.cx}
						cy={NIGHTCAP.pompom.cy}
						r={NIGHTCAP.pompom.r}
						fill={CREAM}
						stroke={INK}
						stroke-width="3"
					/>
				</g>
			{/if}
		</g>
	{/if}

	{#if sleeping}
		<!-- « Zzz » dessiné en traits (pas de texte) -->
		<g
			data-part="zzz"
			fill="none"
			stroke={INK}
			stroke-width="2.4"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			{#each zPaths as d, i (i)}
				<path {d} />
			{/each}
		</g>
	{/if}
</svg>

<style>
	.mathou-avatar {
		display: inline-block;
		flex-shrink: 0;
	}
</style>
