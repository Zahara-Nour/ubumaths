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
	import {
		getMathouRace,
		normalizeRaceIndex,
		type MathouReaction,
		type MathouStage
	} from './mathou-races';
	import {
		CREAM,
		INK,
		MOON,
		CELEBRATION_ORIGIN,
		NIGHTCAP,
		RED,
		SPARKLE,
		SILHOUETTE_FILL,
		SILHOUETTE_LINE,
		YELLOW,
		celebration,
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
		/** Animation au repos (respiration, clignement, queue…) ; coupée par « réduire les animations » */
		animated?: boolean;
		/** Réaction ponctuelle, rejouée à chaque changement de `reactionKey` */
		reaction?: MathouReaction;
		reactionKey?: number;
	}

	// Constantes
	const STROKE = 3;

	// Variables
	let {
		raceIndex,
		stage,
		asleep = false,
		silhouette = false,
		size = 96,
		label,
		animated = true,
		reaction,
		reactionKey = 0
	}: Props = $props();

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
	// Chaque race a son décalage : dans la Chatterie, les Mathoux ne respirent pas en chœur
	const party = $derived(reaction === 'apparition' && !silhouette ? celebration(race.halo) : null);
	const phase = $derived(`--mathou-phase: -${((normalizeRaceIndex(raceIndex) * 7) % 19) * 0.37}s`);
</script>

<svg
	role="img"
	aria-label={label}
	width={size}
	height={size}
	viewBox="0 0 200 200"
	class="mathou-avatar"
	class:anime={animated && !silhouette}
	style={phase}
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
			<g class="gloire"><path d={rays(100, haloY)} fill={race.halo} /></g>
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

		{#key reactionKey}
			<g class="reaction" data-reaction={reaction}>
				<g class="souffle">
					<g
						transform={sleeping ? 'rotate(5 100 180)' : undefined}
						stroke-linejoin="round"
						data-part="mathou"
					>
						<!-- Oreilles (la droite frémit) -->
						{#each geo.earsOuter as ear, i (i)}
							<g class={i === 0 ? 'oreille-g' : 'oreille-d'}>
								<path d={ear} fill={dr.ears[i]} stroke={INK} stroke-width={STROKE} />
								<path d={geo.earsInner[i]} fill={dr.earsInner[i]} />
							</g>
						{/each}

						<!-- Queue en tire-bouchon -->
						<g data-part="queue" class="queue" fill="none" stroke-linecap="round">
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
						<g data-part="yeux" class:paupieres={!sleeping}>
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
						<path
							d={face.whiskers}
							fill="none"
							stroke={INK}
							stroke-width="1.4"
							stroke-linecap="round"
						/>
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
				</g>
			</g>
		{/key}
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
				<path {d} class="z" style={`animation-delay: ${i * 0.9}s`} />
			{/each}
		</g>
	{/if}

	{#if party}
		{#key reactionKey}
			<!-- Fête de naissance : confettis puis étoiles qui scintillent -->
			<g class="fete" aria-hidden="true">
				{#each party.confetti as c, i (i)}
					<rect
						class="confetto"
						x={CELEBRATION_ORIGIN.x - c.width / 2}
						y={CELEBRATION_ORIGIN.y - c.height / 2}
						width={c.width}
						height={c.height}
						rx="1"
						fill={c.color}
						stroke={INK}
						stroke-width="0.8"
						style={`--dx: ${c.dx}px; --dy: ${c.dy}px; --rot: ${c.rotate}deg; animation-delay: ${0.35 + c.delay}s`}
					/>
				{/each}
				{#each party.sparkles as sp, i (i)}
					<g transform={`translate(${sp.x} ${sp.y}) scale(${sp.scale})`}>
						<path
							class="etincelle"
							d={SPARKLE}
							fill={CREAM}
							stroke={INK}
							stroke-width="1.6"
							style={`animation-delay: ${sp.delay}s`}
						/>
					</g>
				{/each}
			</g>
		{/key}
	{/if}
</svg>

<style>
	.mathou-avatar {
		display: inline-block;
		flex-shrink: 0;
	}

	/* Toutes les pièces animées tournent autour de leur propre boîte */
	.souffle,
	.reaction,
	.queue,
	.oreille-g,
	.oreille-d,
	.paupieres,
	.gloire,
	.z {
		transform-box: fill-box;
	}

	/* --- Au repos --- */
	.anime .souffle {
		transform-origin: 50% 100%;
		animation: souffle 3.6s ease-in-out infinite var(--mathou-phase);
	}
	.anime[data-stage='chaton'] .souffle {
		animation-duration: 2.8s;
	}
	.anime[data-stage='grand_matou'] .souffle {
		animation-duration: 5s;
	}
	.anime[data-asleep] .souffle {
		animation: sommeil 5.5s ease-in-out infinite var(--mathou-phase);
	}

	.anime .paupieres {
		transform-origin: 50% 50%;
		animation: cligne 6s infinite var(--mathou-phase);
	}
	.anime[data-stage='chaton'] .paupieres {
		animation-duration: 4.2s;
	}
	.anime[data-stage='grand_matou'] .paupieres {
		animation: cligne-lent 9s infinite var(--mathou-phase);
	}

	.anime .queue {
		transform-origin: 0% 100%;
		animation: queue 4s ease-in-out infinite var(--mathou-phase);
	}
	.anime[data-stage='chaton'] .queue {
		animation-duration: 1.6s;
	}
	.anime[data-asleep] .queue {
		animation: none;
	}

	.anime .oreille-d {
		transform-origin: 0% 100%;
		animation: fremit 7s infinite var(--mathou-phase);
	}
	.anime[data-stage='chaton'] .oreille-d {
		animation-duration: 3.5s;
	}
	.anime[data-asleep] .oreille-d,
	.anime[data-stage='grand_matou'] .oreille-d {
		animation: none;
	}

	.anime .gloire {
		transform-origin: 50% 50%;
		animation: gloire 60s linear infinite;
	}

	.anime .z {
		transform-origin: 50% 50%;
		animation: z 2.7s ease-out infinite;
		opacity: 0;
	}

	/* --- Réactions --- */
	.reaction {
		transform-origin: 50% 100%;
	}
	.reaction[data-reaction='apparition'] {
		animation: apparition 1.5s ease-out 0.15s both;
	}
	.confetto {
		transform-box: view-box;
		transform-origin: 100px 105px;
		opacity: 0;
		animation: confetto 1.9s cubic-bezier(0.2, 0.7, 0.4, 1) both;
	}
	.etincelle {
		transform-box: fill-box;
		transform-origin: 50% 50%;
		opacity: 0;
		animation: etincelle 1.1s ease-in-out 2 both;
	}
	.reaction[data-reaction='bond'] {
		animation: bond 0.8s ease-out;
	}
	.reaction[data-reaction='etirement'] {
		animation: etirement 1.2s ease-in-out;
	}

	@keyframes souffle {
		0%,
		100% {
			transform: scale(1, 1);
		}
		50% {
			transform: scale(1.012, 1.025);
		}
	}
	@keyframes sommeil {
		0%,
		100% {
			transform: scale(1, 1);
		}
		45% {
			transform: scale(1.03, 1.045);
		}
	}
	@keyframes cligne {
		0%,
		92%,
		100% {
			transform: scaleY(1);
		}
		95% {
			transform: scaleY(0.1);
		}
	}
	@keyframes cligne-lent {
		0%,
		90%,
		100% {
			transform: scaleY(1);
		}
		94% {
			transform: scaleY(0.4);
		}
	}
	@keyframes queue {
		0%,
		100% {
			transform: rotate(-4deg);
		}
		50% {
			transform: rotate(8deg);
		}
	}
	@keyframes fremit {
		0%,
		88%,
		100% {
			transform: rotate(0);
		}
		91% {
			transform: rotate(9deg);
		}
		94% {
			transform: rotate(-3deg);
		}
		97% {
			transform: rotate(5deg);
		}
	}
	@keyframes gloire {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes z {
		0% {
			opacity: 0;
			transform: translate(0, 4px) scale(0.7);
		}
		25% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translate(6px, -14px) scale(1.1);
		}
	}
	@keyframes apparition {
		0% {
			transform: scale(0.15);
			opacity: 0;
		}
		20% {
			opacity: 1;
		}
		55% {
			transform: scale(1.1, 1.06);
		}
		72% {
			transform: scale(0.96, 1.02);
		}
		86% {
			transform: scale(1.02, 0.99);
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}
	@keyframes confetto {
		0% {
			opacity: 0;
			transform: translate(0, 0) rotate(0) scale(0.4);
		}
		10% {
			opacity: 1;
		}
		55% {
			opacity: 1;
			transform: translate(var(--dx), var(--dy)) rotate(var(--rot)) scale(1);
		}
		100% {
			opacity: 0;
			transform: translate(var(--dx), calc(var(--dy) + 26px)) rotate(calc(var(--rot) * 1.6))
				scale(1);
		}
	}
	@keyframes etincelle {
		0%,
		100% {
			opacity: 0;
			transform: scale(0.3) rotate(0);
		}
		50% {
			opacity: 1;
			transform: scale(1) rotate(45deg);
		}
	}
	@keyframes bond {
		0%,
		100% {
			transform: translateY(0) scale(1, 1);
		}
		15% {
			transform: translateY(0) scale(1.08, 0.9);
		}
		45% {
			transform: translateY(-16px) scale(0.95, 1.06);
		}
		75% {
			transform: translateY(0) scale(1.05, 0.94);
		}
	}
	@keyframes etirement {
		0%,
		100% {
			transform: scale(1, 1);
		}
		35% {
			transform: scale(0.94, 1.1);
		}
		60% {
			transform: scale(1.06, 0.96);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.mathou-avatar *,
		.mathou-avatar {
			animation: none !important;
		}
		/* Naissance : pas de confettis, les étoiles restent posées */
		.confetto {
			display: none;
		}
		.etincelle {
			opacity: 1;
		}
		/* Les « Zzz » restent visibles, immobiles */
		.anime .z {
			opacity: 1;
		}
	}
</style>
