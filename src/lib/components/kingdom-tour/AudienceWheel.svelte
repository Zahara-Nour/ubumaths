<script lang="ts">
	/**
	 * La roue des publics : la chandelle verte du Père Ubu, sans fond ni bord, dans sa lumière.
	 * Ouverte, elle déroule trois choix (élève, parent, professeur) qui mènent chacun à sa vue
	 * de présentation. Sur les vues, elle est
	 * fixée en bas à droite ; sur l'accueil, elle dérive autour de Père Ubu comme sur l'eau
	 * (`placement="orbit"`, `drift.ts`), et s'immobilise dès qu'on la survole ou la touche.
	 *
	 * Un bouton qui ouvre et ferme (`aria-expanded`), trois liens ordinaires. Échap ou un clic
	 * ailleurs la referment ; fermée, ses liens sont inertes. Sans JavaScript, le bouton ne
	 * s'ouvre pas : chaque vue garde aussi ses liens dans la page.
	 */
	import { resolve } from '$app/paths';
	import { Backpack, HeartHandshake, Presentation } from '@lucide/svelte';
	import { AUDIENCES, type AudienceId } from '$lib/kingdom-tour/audiences';
	import { driftAt, driftGeometry, type DriftGeometry } from '$lib/kingdom-tour/drift';

	// Types

	interface Props {
		/** La vue où l'on se trouve : son choix est marqué */
		current?: AudienceId;
		/** Accueil : une bulle invite à ouvrir la roue (à l'arrivée, puis à chaque escale) */
		invite?: boolean;
		/** `corner` : fixée en bas à droite ; `orbit` : dérive autour de l'élément `around` */
		placement?: 'corner' | 'orbit';
		/** `orbit` : l'élément autour duquel dériver (positionné, il contient la roue) */
		around?: HTMLElement;
		/** `orbit` : largeur du dessin rapportée à celle de `around` */
		bodyRatio?: number;
	}

	// Constantes

	const ICONS = { student: Backpack, parent: HeartHandshake, teacher: Presentation };

	/**
	 * Au bout d'une minute, tout se pose pour de bon : la dérive s'arrête, la flamme cesse de
	 * vaciller (WCAG 2.2.2 : pas de mouvement sans fin de plus de 5 s ; décision de David,
	 * 2026-10-11). Les effets de survol restent : c'est le visiteur qui les déclenche.
	 */
	const SETTLE_AFTER_S = 60;

	/** Décalages des trois choix : un arc qui s'enroule vers la gauche en montant */
	const OFFSETS = [
		{ x: 0, y: 4.25 },
		{ x: 0.9, y: 7.5 },
		{ x: 2.5, y: 10.75 }
	];

	// Variables

	let { current, invite = false, placement = 'corner', around, bodyRatio = 1 }: Props = $props();
	let open = $state(false);
	let held = $state(false);
	/** Le choix se déroule du côté où il y a de la place */
	let flipX = $state(false);
	let flipY = $state(false);
	/** Écran trop bas pour dérouler en hauteur : les choix se rangent en colonne, à côté */
	let sideways: 'left' | 'right' | null = $state(null);
	/** Posée : elle a cessé de dériver d'elle-même (l'invitation revient) */
	let landed = $state(false);
	/** Au bout d'une minute : plus rien ne bouge de lui-même */
	let still = $state(false);

	/** Identifiants uniques des dégradés de la chandelle */
	const uid = $props.id();
	let touched = $state(false);
	let root: HTMLElement | undefined = $state();
	let toggle: HTMLButtonElement | undefined = $state();

	// Functions

	/** À la souris, le survol ouvre déjà : un clic ne doit pas refermer sous le pointeur */
	function onToggle(event: MouseEvent) {
		const mouse = event instanceof PointerEvent && event.pointerType === 'mouse';
		if (!open) chooseSide();
		open = mouse ? true : !open;
		touched = true;
	}

	/** Hauteur des choix déroulés (le plus haut, 10,75rem, plus un lien et la marge) */
	const CHOICES_HEIGHT_REM = 14;

	/**
	 * À l'ouverture, autour de Père Ubu : vers le haut s'il y a la place, sinon vers le bas ;
	 * si ni l'un ni l'autre (écran bas, téléphone en paysage), en colonne du côté le plus
	 * large. La zone de l'accueil coupe ce qui dépasse.
	 */
	function chooseSide() {
		if (placement !== 'orbit' || !root || !around?.parentElement) return;
		const wheel = root.getBoundingClientRect();
		const bounds = around.parentElement.getBoundingClientRect();
		const need = CHOICES_HEIGHT_REM * parseFloat(getComputedStyle(root).fontSize);
		const above = wheel.top - bounds.top;
		const below = bounds.bottom - wheel.bottom;
		flipY = above < need && below >= need;
		sideways =
			above >= need || below >= need
				? null
				: wheel.left - bounds.left > bounds.right - wheel.right
					? 'left'
					: 'right';
	}

	// À la souris, le survol suffit : la roue s'ouvre en entrant, se referme peu après la
	// sortie (le temps de passer du bouton aux choix). Au doigt et au clavier, on clique.
	let closing: ReturnType<typeof setTimeout> | undefined;
	/** Pendant qu'elle se dérobe, elle ne se laisse pas ouvrir au passage */
	let dodging = false;
	function hoverOpen(event: PointerEvent) {
		if (event.pointerType !== 'mouse' || dodging) return;
		clearTimeout(closing);
		if (!open) chooseSide();
		open = true;
		touched = true;
	}
	$effect(() => {
		const wheel = root;
		if (!wheel) return;
		const enter = (event: PointerEvent) => {
			if (event.pointerType === 'mouse') clearTimeout(closing);
		};
		const leave = (event: PointerEvent) => {
			if (event.pointerType !== 'mouse') return;
			closing = setTimeout(() => {
				if (!wheel.querySelector(':focus-visible')) open = false;
			}, 350);
		};
		wheel.addEventListener('pointerenter', enter);
		wheel.addEventListener('pointerleave', leave);
		return () => {
			clearTimeout(closing);
			wheel.removeEventListener('pointerenter', enter);
			wheel.removeEventListener('pointerleave', leave);
		};
	});

	function onkeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape' || !open) return;
		open = false;
		toggle?.focus();
	}

	function onpointerdown(event: PointerEvent) {
		if (open && root && !root.contains(event.target as Node)) open = false;
	}

	/** La place libre autour de `around`, jusqu'à ses voisins (titre, dépêche) ou au bord */
	function measure(box: HTMLElement): DriftGeometry {
		const rect = box.getBoundingClientRect();
		const bounds = (box.parentElement ?? document.body).getBoundingClientRect();
		const above = box.previousElementSibling?.getBoundingClientRect().bottom ?? bounds.top;
		const below = box.nextElementSibling?.getBoundingClientRect().top ?? bounds.bottom;
		return driftGeometry({
			boxWidth: rect.width,
			boxHeight: rect.height,
			bodyRatio,
			roomLeft: rect.left - bounds.left,
			roomRight: bounds.right - rect.right,
			roomAbove: rect.top - above,
			roomBelow: below - rect.bottom,
			button: toggle?.offsetWidth ?? 56
		});
	}

	// La flamme et sa lumière cessent de vaciller au bout d'une minute
	$effect(() => {
		const timer = setTimeout(() => (still = true), SETTLE_AFTER_S * 1000);
		return () => clearTimeout(timer);
	});

	// La dérive : une horloge qui ralentit jusqu'à l'arrêt quand on tient la roue
	$effect(() => {
		if (placement !== 'orbit' || !around || !root) return;
		const box = around;
		const wheel = root;
		let geometry = measure(box);
		const observer = new ResizeObserver(() => (geometry = measure(box)));
		observer.observe(box);
		if (box.parentElement) observer.observe(box.parentElement);

		const place = (time: number, offset = { x: 0, y: 0 }) => {
			const drift = driftAt(time, geometry);
			const x = drift.x + offset.x;
			const y = drift.y + offset.y;
			const tilt = drift.tilt;
			wheel.style.translate = `${x}px ${y}px`;
			if (toggle) toggle.style.rotate = `${tilt}deg`;
			flipX = x < 0;
		};

		if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
			place(0);
			return () => observer.disconnect();
		}

		// Une seule fois : quand la souris approche pour l'attraper, elle se dérobe d'un bond,
		// puis revient doucement sur sa route. Ensuite, elle se laisse prendre.
		const DODGE = { reach: 90, jump: 85, out: 0.6, hold: 0.4, back: 2.8 };
		let dodge: { x: number; y: number; t: number } | null = null;
		let dodged = false;
		const onpointermove = (event: PointerEvent) => {
			if (dodged || open || event.pointerType !== 'mouse' || !toggle) return;
			const rect = toggle.getBoundingClientRect();
			const dx = rect.left + rect.width / 2 - event.clientX;
			const dy = rect.top + rect.height / 2 - event.clientY;
			const distance = Math.hypot(dx, dy);
			if (distance > DODGE.reach || distance < 1) return;
			dodged = true;
			dodge = { x: dx / distance, y: dy / distance, t: 0 };
		};
		window.addEventListener('pointermove', onpointermove);
		/** Démarre et s'arrête en douceur (vitesse et accélération nulles aux deux bouts) */
		const ease = (u: number) => u * u * u * (u * (6 * u - 15) + 10);
		/** Le décalage du bond à l'instant `t` : un glissement, un temps d'arrêt, un retour lent */
		const dodgeOffset = (t: number) => {
			if (t < DODGE.out) return ease(t / DODGE.out);
			if (t < DODGE.out + DODGE.hold) return 1;
			return 1 - ease(Math.min(1, (t - DODGE.out - DODGE.hold) / DODGE.back));
		};

		// De temps en temps, elle se pose : des escales de durée irrégulière
		const leg = (resting: boolean) => (resting ? 5 + Math.random() * 7 : 18 + Math.random() * 20);
		let resting = false;
		let elapsed = 0;
		let legEnd = 12 + Math.random() * 8;
		let time = 0;
		let speed = 1;
		let last = performance.now();
		let frame = requestAnimationFrame(function tick(now) {
			const dt = Math.min(0.1, (now - last) / 1000);
			last = now;
			elapsed += dt;
			// Au bout d'une minute, une dernière escale, définitive ; elle ne se dérobe plus
			if (elapsed > SETTLE_AFTER_S && legEnd !== Infinity) {
				resting = true;
				legEnd = Infinity;
				dodged = true;
			}
			if (elapsed > legEnd) {
				resting = !resting;
				legEnd = elapsed + leg(resting);
			}
			// Tenue (survol, focus, ouverte) : arrêt net ; escale : elle glisse jusqu'à l'arrêt
			const stopped = held || open || resting;
			const rate = held || open ? 5 : 1.2;
			speed += ((stopped ? 0 : 1) - speed) * Math.min(1, dt * rate);
			time += dt * speed;
			let offset = { x: 0, y: 0 };
			if (dodge) {
				dodge.t += dt;
				const k = DODGE.jump * dodgeOffset(dodge.t);
				offset = { x: dodge.x * k, y: dodge.y * k };
				dodging = dodge.t < DODGE.out + DODGE.hold;
				if (dodge.t > DODGE.out + DODGE.hold + DODGE.back) dodge = null;
			}
			place(time, offset);
			const isLanded = resting && !held && !open && speed < 0.05;
			if (isLanded !== landed) landed = isLanded;
			// Posée pour de bon et immobile : l'horloge s'arrête
			if (legEnd === Infinity && speed < 0.001 && !dodge) return;
			frame = requestAnimationFrame(tick);
		});
		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener('pointermove', onpointermove);
			observer.disconnect();
		};
	});
</script>

<svelte:window {onkeydown} {onpointerdown} />

<div
	class="wheel {placement}"
	class:open
	class:held
	class:landed
	class:still
	class:flip-x={flipX}
	class:flip-y={flipY}
	class:side-left={sideways === 'left'}
	class:side-right={sideways === 'right'}
	bind:this={root}
	data-testid="audience-wheel"
>
	<nav id="{uid}-choices" class="choices" aria-label="Choisir sa visite" inert={!open}>
		<ul>
			{#each AUDIENCES as audience, i (audience.id)}
				{@const Icon = ICONS[audience.id]}
				<li style:--x="{OFFSETS[i].x}rem" style:--y="{OFFSETS[i].y}rem" style:--i={i}>
					<a
						href={resolve(audience.href)}
						class="choice"
						aria-current={current === audience.id ? 'page' : undefined}
						onclick={() => (open = false)}
					>
						<span class="badge" aria-hidden="true"><Icon size={18} /></span>
						{audience.label}
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	<!-- L'invitation : à l'arrivée, puis de nouveau à chaque escale, tant que la roue est fermée -->
	{#if invite && !open && (!touched || landed)}
		<span class="invite" aria-hidden="true">Tu es… ?</span>
	{/if}

	<!-- La lumière de la chandelle, qui éclaire la page (et Père Ubu quand elle passe) -->
	<span class="light" aria-hidden="true"></span>

	<button
		bind:this={toggle}
		type="button"
		class="toggle"
		aria-expanded={open}
		aria-controls="{uid}-choices"
		aria-label={open
			? 'Fermer le choix de la visite'
			: 'Choisir sa visite : élève, parent ou professeur'}
		onclick={onToggle}
		onpointerenter={(event) => {
			held = true;
			hoverOpen(event);
		}}
		onpointerleave={() => (held = false)}
		onfocus={() => (held = toggle?.matches(':focus-visible') ?? false)}
		onblur={() => (held = false)}
	>
		<!-- La chandelle verte (« De par ma chandelle verte ! ») : la flamme est verte, comme
		     brûle le cuivre, à la façon de « Viridis Candela », la revue du Collège de
		     'Pataphysique. Un bougeoir à main de laiton noirci, cerné d'encre et hachuré comme
		     le dessin de Père Ubu. La flamme vacille, et grandit au survol. -->
		<svg class="chandelle" viewBox="0 0 100 100" aria-hidden="true">
			<defs>
				<radialGradient id="{uid}-aura">
					<stop offset="0" stop-color="#c8ffb0" stop-opacity="0.9" />
					<stop offset="1" stop-color="#3fd06a" stop-opacity="0" />
				</radialGradient>
				<linearGradient id="{uid}-flamme-verte" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stop-color="#eaffb0" />
					<stop offset="0.55" stop-color="#6fe07a" />
					<stop offset="1" stop-color="#159a4a" />
				</linearGradient>
				<linearGradient id="{uid}-cire" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0" stop-color="#cdb98a" />
					<stop offset="0.4" stop-color="#f4e8c8" />
					<stop offset="1" stop-color="#b9a370" />
				</linearGradient>
				<linearGradient id="{uid}-laiton" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0" stop-color="#3e301c" />
					<stop offset="0.3" stop-color="#8a6d3b" />
					<stop offset="0.45" stop-color="#d8b46a" />
					<stop offset="0.6" stop-color="#8a6d3b" />
					<stop offset="1" stop-color="#2e2414" />
				</linearGradient>
				<linearGradient id="{uid}-laiton-fond" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stop-color="#b38f4f" />
					<stop offset="0.5" stop-color="#6b5330" />
					<stop offset="1" stop-color="#2a2012" />
				</linearGradient>
			</defs>
			<circle class="aura" cx="50" cy="22" r="22" fill="url(#{uid}-aura)" />
			<g stroke="#1a140c" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
				<path d="M80 76C88 74 93 67 90 61C87 56 80 58 79 64" fill="none" stroke-width="7" />
				<path
					d="M80 76C88 74 93 67 90 61C87 56 80 58 79 64"
					fill="none"
					stroke="url(#{uid}-laiton)"
					stroke-width="4"
				/>
				<path d="M15 76Q16 90 50 90Q84 90 85 76Z" fill="url(#{uid}-laiton-fond)" />
				<ellipse cx="50" cy="76" rx="35" ry="8" fill="url(#{uid}-laiton)" />
				<ellipse cx="50" cy="76" rx="28" ry="5" fill="#4a3920" stroke-width="1" />
				<path d="M40 64H60L58 75H42Z" fill="url(#{uid}-laiton)" />
				<ellipse cx="50" cy="64" rx="10" ry="2.6" fill="#e2c37f" />
				<path d="M43 37H57V64H43Z" fill="url(#{uid}-cire)" />
				<path
					d="M43 39Q43 36 46 36H54Q57 36 57 39V45Q55.5 49 54.5 44L53.5 41Q52 52 50.5 42L48.5 41Q47 47 45.5 41.5L43 42Z"
					fill="#fbf3dc"
				/>
			</g>
			<g stroke="#1a140c" stroke-width="0.9" stroke-linecap="round" opacity="0.7">
				<path d="M22 82L26 86M28 84L31 87M70 84L73 81M76 82L79 79" />
			</g>
			<line
				x1="50"
				y1="29"
				x2="50"
				y2="37"
				stroke="#2b1f12"
				stroke-width="2.2"
				stroke-linecap="round"
			/>
			<g class="flamme">
				<path
					d="M50 4C56 13 59.5 19.5 58.5 25C57.5 29.5 54.2 32 50 32C45.8 32 42.5 29.5 41.5 25C40.5 19.5 44 13 50 4Z"
					fill="url(#{uid}-flamme-verte)"
				/>
				<path
					d="M50 15C53 20 54 23 53.3 26C52.6 28.4 51.5 29.6 50 29.6C48.5 29.6 47.4 28.4 46.7 26C46 23 47 20 50 15Z"
					fill="#f4ffe0"
				/>
			</g>
		</svg>
	</button>
</div>

<style lang="postcss">
	@reference "../../../app.css";

	.corner {
		@apply fixed z-40;
		right: max(1rem, env(safe-area-inset-right));
		bottom: max(1rem, env(safe-area-inset-bottom));
	}
	.toggle {
		@apply relative grid h-14 w-14 place-items-center rounded-full focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:outline-none;
		transition: scale 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	.toggle:is(:hover, :focus-visible) {
		scale: 1.1;
	}
	/* Le halo de la flamme, derrière la chandelle (et devant celui de Père Ubu : la roue est
	   au-dessus de lui, z-20). Au repos, il luit déjà et scintille ; le survol l'avive. */
	.toggle::before {
		@apply absolute inset-0 -z-10 rounded-full;
		content: '';
		background: radial-gradient(circle, rgb(var(--flame)) 0%, transparent 70%);
		opacity: 0.45;
		scale: 1.8;
		animation: scintille 1.3s linear infinite;
		transition:
			opacity 0.3s ease,
			scale 0.45s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.toggle:is(:hover, :focus-visible)::before {
		opacity: 0.85;
		scale: 2.4;
	}

	/* Les choix partent du centre du bouton et se déroulent en tournant : vers le haut et la
	   gauche, ou en miroir (flip-x, flip-y) quand la roue dérive à gauche ou en haut */
	.wheel {
		--sx: 1;
		--sy: 1;
	}
	.flip-x {
		--sx: -1;
	}
	.flip-y {
		--sy: -1;
	}
	.choices li {
		@apply absolute;
		right: calc(0.25rem + var(--x));
		bottom: calc(0.5rem + var(--y));
		opacity: 0;
		scale: 0.4;
		translate: calc(var(--sx) * (var(--x) + 1.5rem)) calc(var(--sy) * (var(--y) - 0.5rem));
		rotate: calc(var(--sx) * var(--sy) * -40deg);
		transform-origin: right center;
		pointer-events: none;
		transition:
			opacity 0.2s ease,
			scale 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
			translate 0.35s cubic-bezier(0.22, 1, 0.36, 1),
			rotate 0.35s cubic-bezier(0.22, 1, 0.36, 1);
		transition-delay: calc(var(--i) * 50ms);
	}
	.open .choices li {
		opacity: 1;
		scale: 1;
		translate: 0 0;
		rotate: 0deg;
		pointer-events: auto;
	}
	.flip-x .choices li {
		right: auto;
		left: calc(0.25rem + var(--x));
		transform-origin: left center;
	}
	.flip-y .choices li {
		bottom: auto;
		top: calc(0.5rem + var(--y));
	}
	/* En colonne, à côté de la roue (écran bas) : centrée sur elle, du côté le plus large */
	.side-left .choices li,
	.side-right .choices li {
		top: calc(50% - 1.375rem + (var(--i) - 1) * 3.25rem);
		bottom: auto;
		rotate: 0deg;
	}
	.side-left .choices li {
		right: calc(100% + 0.5rem);
		left: auto;
		transform-origin: right center;
		translate: 2rem 0;
	}
	.side-right .choices li {
		left: calc(100% + 0.5rem);
		right: auto;
		transform-origin: left center;
		translate: -2rem 0;
	}
	.open.side-left .choices li,
	.open.side-right .choices li {
		translate: 0 0;
	}
	.choice {
		@apply flex min-h-11 items-center gap-2 rounded-full border-2 border-foreground/50 bg-card py-1 pr-4 pl-1 font-semibold whitespace-nowrap text-foreground shadow-md transition-colors hover:border-foreground focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:outline-none;
		font-size: calc(1rem * var(--font-scale, 1));
	}
	.badge {
		@apply grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground;
	}
	.choice[aria-current='page'] {
		@apply border-foreground bg-primary text-primary-foreground;
	}
	.choice[aria-current='page'] .badge {
		@apply bg-card text-foreground;
	}

	/* L'invitation de l'accueil : à gauche du bouton, elle se balance deux fois puis se tait */
	.invite {
		@apply absolute top-1/2 right-[4.25rem] -translate-y-1/2 rounded-full bg-foreground px-3 py-1 font-semibold whitespace-nowrap text-background shadow-md;
		font-size: calc(0.875rem * var(--font-scale, 1));
		animation: appel 1.2s ease-in-out 0.8s 2;
	}
	.open .invite {
		@apply hidden;
	}
	@keyframes appel {
		50% {
			translate: -0.375rem 0;
		}
	}

	/* Autour de Père Ubu : ancrée au centre de `around`, la dérive la déplace (translate) */
	.orbit {
		@apply absolute top-1/2 left-1/2 z-20 -mt-7 -ml-7;
	}
	.orbit .invite {
		top: auto;
		right: 50%;
		bottom: calc(100% + 0.5rem);
		translate: 50% 0;
		animation: none;
	}

	/* La chandelle : la flamme vacille sur un rythme irrégulier, l'aura respire */
	.chandelle {
		@apply h-14 w-14;
		overflow: visible;
	}
	.chandelle .flamme {
		transform-box: fill-box;
		transform-origin: 50% 95%;
		animation: vacille 2.3s ease-in-out infinite;
		transition: scale 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	.chandelle .aura {
		transform-box: fill-box;
		transform-origin: center;
		animation: respire 3.7s ease-in-out infinite;
		transition: scale 0.4s ease;
	}
	.held .chandelle .flamme,
	.open .chandelle .flamme {
		scale: 1.22;
	}
	.held .chandelle .aura,
	.open .chandelle .aura {
		scale: 1.5;
	}
	@keyframes vacille {
		0%,
		100% {
			transform: scale(1, 1) rotate(0deg);
		}
		13% {
			transform: scale(0.95, 1.07) rotate(-3deg);
		}
		27% {
			transform: scale(1.03, 0.96) rotate(2deg);
		}
		41% {
			transform: scale(0.97, 1.09) rotate(-1deg);
		}
		58% {
			transform: scale(1.02, 0.95) rotate(3deg);
		}
		74% {
			transform: scale(0.96, 1.05) rotate(-2deg);
		}
		88% {
			transform: scale(1.01, 1.02) rotate(1deg);
		}
	}
	@keyframes respire {
		0%,
		100% {
			opacity: 0.75;
		}
		21% {
			opacity: 1;
		}
		37% {
			opacity: 0.6;
		}
		62% {
			opacity: 0.95;
		}
		81% {
			opacity: 0.7;
		}
	}

	/* L'éclairage, propre à la chandelle (indépendant du halo de Père Ubu, qui suit le mois) :
	   une lumière de bougie naturelle, autour de 1 900 K. Elle part de la flamme, pas du
	   centre du bouton ; très vive tout près, elle décroît vite puis s'étire en une longue
	   traîne faible, comme une source ponctuelle. Elle scintille vite et respire lentement,
	   sur deux rythmes qui ne coïncident pas. */
	.wheel {
		--flame: 90 220 110;
		--flame-core: 222 255 205;
	}
	.light {
		@apply pointer-events-none absolute left-1/2 -z-10 rounded-full;
		top: calc(50% - 0.9rem);
		width: 22rem;
		height: 22rem;
		margin: -11rem 0 0 -11rem;
		background: radial-gradient(
			circle closest-side,
			rgb(var(--flame-core) / 0.8) 0%,
			rgb(var(--flame) / 0.55) 4%,
			rgb(var(--flame) / 0.32) 11%,
			rgb(var(--flame) / 0.17) 24%,
			rgb(var(--flame) / 0.075) 45%,
			rgb(var(--flame) / 0.028) 72%,
			transparent 100%
		);
		animation:
			respire 3.7s ease-in-out infinite,
			scintille 1.3s linear infinite;
		transition: scale 0.6s cubic-bezier(0.22, 1, 0.36, 1);
	}
	/* Dans le noir, la lumière s'ajoute à ce qu'elle éclaire */
	:global(.dark) .light {
		mix-blend-mode: screen;
	}
	.held .light,
	.open .light {
		scale: 1.35;
	}
	@keyframes scintille {
		0%,
		100% {
			transform: scale(1) translate(0, 0);
		}
		9% {
			transform: scale(0.98) translate(0.5px, 0);
		}
		22% {
			transform: scale(1.03) translate(-0.5px, -1px);
		}
		31% {
			transform: scale(0.99) translate(0, 0);
		}
		47% {
			transform: scale(1.02) translate(1px, -0.5px);
		}
		63% {
			transform: scale(0.97) translate(-1px, 0);
		}
		78% {
			transform: scale(1.025) translate(0.5px, -1px);
		}
		90% {
			transform: scale(0.995) translate(0, 0.5px);
		}
	}
	/* Au bout d'une minute, la flamme ne vacille plus et la lumière ne scintille plus */
	.still .chandelle .flamme,
	.still .chandelle .aura,
	.still .light,
	.still .toggle::before {
		animation: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.chandelle .flamme,
		.chandelle .aura,
		.light,
		.toggle::before {
			animation: none;
		}
		.toggle,
		.choices li {
			transition: none;
		}
		.choices li {
			rotate: 0deg;
			scale: 1;
			translate: 0 0;
		}
		.invite {
			animation: none;
		}
	}
</style>
