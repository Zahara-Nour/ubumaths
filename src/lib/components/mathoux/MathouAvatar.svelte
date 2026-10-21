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
		blendStages,
		celebration,
		crown,
		dressing,
		faceDrawing,
		pearGeometry,
		rays,
		ruff,
		stageTemplate,
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
		/** Avec `reaction="bond"` : le stade d'avant ; le dessin se transforme de l'un à l'autre */
		growFrom?: MathouStage;
	}

	// Constantes
	const STROKE = 3;
	/** Durée de la transformation d'un stade à l'autre (ms) */
	const MORPH_MS = 1400;
	// Auréole derrière la tête : plus large pour la grosse tête du chaton
	const HALO_R: Record<MathouStage, number> = { chaton: 46, matou: 40, grand_matou: 34 };

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
		reactionKey = 0,
		growFrom
	}: Props = $props();

	const uid = $props.id();
	const cardId = `${uid}-mathou-carte`;
	const bodyClipId = `${uid}-mathou-corps`;
	const capClipId = `${uid}-mathou-bonnet`;
	const smokeId = `${uid}-mathou-fume`;
	const eyeClipId = (i: number): string => `${uid}-mathou-oeil-${i}`;

	const morphing = $derived(reaction === 'bond' && growFrom !== undefined && growFrom !== stage);
	// Avancement de la transformation, 0 → 1 ; à 0 au premier rendu (côté serveur aussi)
	let morphT = $state(0);

	const race = $derived(getMathouRace(raceIndex));
	const eased = $derived(morphing ? easeInOut(morphT) : 1);
	const geo = $derived(
		morphing && growFrom && eased < 1
			? pearGeometry(blendStages(stageTemplate(growFrom), stageTemplate(stage), eased))
			: pearGeometry(stage)
	);
	const dr = $derived(dressing(race, geo));
	const sleeping = $derived(asleep && !silhouette);
	// Réveil : le dessin éveillé, avec ce qui reste de la sieste (lune, bonnet, « Zzz », yeux
	// fermés) qui s'en va
	const waking = $derived(reaction === 'reveil' && !asleep && !silhouette);
	// Couronne, fraise, bâton et gloire arrivent quand la transformation est finie
	const majesty = $derived(stage === 'grand_matou' && !sleeping && eased === 1);
	const crowning = $derived(morphing && stage === 'grand_matou');
	const mode = $derived<FaceMode>(sleeping ? 'closed' : majesty ? 'proud' : 'open');
	const face = $derived(faceDrawing(geo, dr, mode));
	const sleepyEyes = $derived(waking ? faceDrawing(geo, dr, 'closed').closedEyes : []);
	const st = $derived(geo.stage);
	const haloR = $derived(
		morphing && growFrom
			? HALO_R[growFrom] + (HALO_R[stage] - HALO_R[growFrom]) * eased
			: HALO_R[stage]
	);
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
	// Naissance : étoiles ; naissance ou croissance : auréole qui s'allume, ondes, confettis
	const birth = $derived(reaction === 'apparition' && !silhouette);
	const glow = $derived(birth || morphing);
	const party = $derived(birth || morphing ? celebration(race.halo) : null);
	const confettiStart = $derived(birth ? 0.35 : 0.2);
	// Chaque race a son décalage : dans la Chatterie, les Mathoux ne respirent pas en chœur
	const phase = $derived(`--mathou-phase: -${((normalizeRaceIndex(raceIndex) * 7) % 19) * 0.37}s`);

	// Functions
	function easeInOut(t: number): number {
		return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
	}

	// Transformation image par image ; « réduire les animations » : directement le nouveau stade
	$effect(() => {
		void reactionKey;
		if (!morphing) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			morphT = 1;
			return;
		}
		morphT = 0;
		const start = performance.now();
		let frame = requestAnimationFrame(function step(now) {
			morphT = Math.min(1, (now - start) / MORPH_MS);
			if (morphT < 1) frame = requestAnimationFrame(step);
		});
		return () => cancelAnimationFrame(frame);
	});
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
			{#if sleeping || waking}
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
			<g class:apparait={crowning} class:revient={waking}>
				<g class="gloire"><path d={rays(100, haloY)} fill={race.halo} /></g>
				<circle cx="100" cy={haloY} r={haloR} fill={race.halo} stroke={YELLOW} stroke-width="2.5" />
			</g>
		{:else}
			{#key reactionKey}
				<circle
					cx="100"
					cy={haloY}
					r={haloR}
					fill={race.halo}
					class:aureole-naissance={glow}
					class:revient={waking}
				/>
			{/key}
		{/if}
		{#if waking}
			{#key reactionKey}
				<path d={MOON} fill={race.halo} class="lune-part" />
			{/key}
		{/if}
		{#if glow}
			{#key reactionKey}
				<!-- Naissance ou croissance : l'auréole s'allume et lance deux ondes de lumière -->
				{#each [0, 1] as wave (wave)}
					<circle
						class="onde"
						cx="100"
						cy={haloY}
						r={haloR}
						fill="none"
						stroke={CREAM}
						stroke-width="5"
						style={`animation-delay: ${0.2 + wave * 0.35}s`}
					/>
				{/each}
			{/key}
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
			<g class:apparait={crowning}>
				<path
					d={`M26 ${st.top + 6}Q31 120 38 186`}
					fill="none"
					stroke={INK}
					stroke-width="5"
					stroke-linecap="round"
				/>
				<circle cx="26" cy={st.top + 4} r="7" fill={RED} stroke={INK} stroke-width="2.6" />
			</g>
		{/if}

		{#key reactionKey}
			<g class="reaction" data-reaction={reaction} data-morph={morphing ? 'true' : undefined}>
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
						<g class:ouverture={waking}>
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
						</g>
						{#if waking}
							<!-- Les yeux fermés de la sieste, qui s'effacent quand il les ouvre -->
							<g class="yeux-clos" fill="none" stroke-width="2.4" stroke-linecap="round">
								{#each sleepyEyes as closed, i (i)}
									<path d={closed.d} stroke={closed.color} />
								{/each}
							</g>
						{/if}

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

						{#if stage === 'grand_matou' && eased === 1}
							<!-- Attribut du grand matou : la fraise (après la transformation) -->
							<g
								data-part="collerette"
								class:apparait={crowning}
								fill={CREAM}
								stroke={INK}
								stroke-width="2.2"
							>
								{#each ruffPuffs as puff, i (i)}
									<circle cx={puff.cx} cy={puff.cy} r="6" />
								{/each}
							</g>
						{/if}

						{#if majesty}
							<!-- Couronne -->
							<g data-part="couronne" class:apparait={crowning}>
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

						{#if sleeping || waking}
							<!-- Bonnet de nuit rayé ; au réveil, il s'envole -->
							<g class:bonnet-part={waking}>
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
							</g>
						{/if}
					</g>
				</g>
			</g>
		{/key}
	{/if}

	{#if sleeping || waking}
		<!-- « Zzz » dessiné en traits (pas de texte) ; au réveil, ils s'envolent -->
		<g
			class:zzz-part={waking}
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
			<!-- Fête : confettis (naissance et croissance), puis étoiles à la naissance -->
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
						style={`--dx: ${c.dx}px; --dy: ${c.dy}px; --rot: ${c.rotate}deg; animation-delay: ${confettiStart + c.delay}s`}
					/>
				{/each}
				{#each birth ? party.sparkles : [] as sp, i (i)}
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
	.aureole-naissance {
		transform-box: fill-box;
		transform-origin: 50% 50%;
		animation: aureole 1.4s ease-out both;
	}
	.onde {
		transform-box: fill-box;
		transform-origin: 50% 50%;
		opacity: 0;
		animation: onde 1.3s ease-out both;
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
	/* Il grandit : il bondit pendant que le dessin se transforme */
	.reaction[data-reaction='bond'][data-morph] {
		animation: croissance 1.4s ease-in-out;
	}
	.apparait {
		animation: apparait 0.6s ease-out both;
	}
	/* Réveil : il se redresse, ouvre les yeux en deux temps, le bonnet s'envole, il s'étire */
	.reaction[data-reaction='reveil'] {
		animation: reveil 2.6s ease-in-out both;
	}
	.lune-part {
		animation: s-efface 0.9s ease-in 0.2s both;
	}
	.revient {
		transform-box: fill-box;
		transform-origin: 50% 50%;
		animation: revient 0.9s ease-out 0.4s both;
	}
	.zzz-part {
		transform-box: fill-box;
		animation: zzz-part 0.7s ease-in both;
	}
	.ouverture {
		transform-box: fill-box;
		transform-origin: 50% 50%;
		animation: ouverture 1.2s ease-in-out 0.3s both;
	}
	.yeux-clos {
		animation: yeux-clos 1.2s ease-in-out 0.3s both;
	}
	.bonnet-part {
		transform-box: fill-box;
		transform-origin: 50% 100%;
		animation: bonnet-part 0.9s ease-in 1.2s both;
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
	@keyframes aureole {
		0% {
			transform: scale(0.3);
			filter: brightness(1);
		}
		35% {
			transform: scale(1.12);
			filter: brightness(1.6);
		}
		100% {
			transform: scale(1);
			filter: brightness(1);
		}
	}
	@keyframes onde {
		0% {
			opacity: 0.9;
			transform: scale(0.9);
		}
		100% {
			opacity: 0;
			transform: scale(1.9);
		}
	}
	@keyframes apparait {
		from {
			opacity: 0;
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
	@keyframes croissance {
		0%,
		100% {
			transform: translateY(0) scale(1, 1);
		}
		12% {
			transform: translateY(0) scale(1.08, 0.9);
		}
		42% {
			transform: translateY(-20px) scale(0.95, 1.07);
		}
		68% {
			transform: translateY(0) scale(1.07, 0.92);
		}
		82% {
			transform: translateY(-5px) scale(0.99, 1.02);
		}
		92% {
			transform: translateY(0) scale(1.02, 0.98);
		}
	}
	@keyframes reveil {
		0% {
			transform: rotate(5deg);
		}
		30%,
		62% {
			transform: rotate(0) scale(1, 1);
		}
		76% {
			transform: scale(0.94, 1.1);
		}
		88% {
			transform: scale(1.05, 0.96);
		}
		100% {
			transform: scale(1, 1);
		}
	}
	@keyframes s-efface {
		to {
			opacity: 0;
		}
	}
	@keyframes revient {
		from {
			opacity: 0;
			transform: scale(0.6);
		}
	}
	@keyframes zzz-part {
		to {
			opacity: 0;
			transform: translate(8px, -18px);
		}
	}
	/* Les paupières : fermées, entrouvertes, refermées, ouvertes */
	@keyframes ouverture {
		0%,
		20% {
			transform: scaleY(0.05);
		}
		40% {
			transform: scaleY(0.55);
		}
		58% {
			transform: scaleY(0.1);
		}
		100% {
			transform: scaleY(1);
		}
	}
	@keyframes yeux-clos {
		0%,
		22% {
			opacity: 1;
		}
		34%,
		100% {
			opacity: 0;
		}
	}
	@keyframes bonnet-part {
		0% {
			transform: translate(0, 0) rotate(0);
			opacity: 1;
		}
		25% {
			transform: translate(0, 4px) rotate(-6deg);
		}
		100% {
			transform: translate(26px, -70px) rotate(40deg);
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.mathou-avatar *,
		.mathou-avatar {
			animation: none !important;
		}
		/* Naissance : pas de confettis, les étoiles restent posées */
		.confetto,
		.onde,
		.lune-part,
		.zzz-part,
		.yeux-clos,
		.bonnet-part {
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
