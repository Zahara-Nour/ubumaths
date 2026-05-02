<script lang="ts">
	import DslDemo from '../DslDemo.svelte';

	// Polar curves (V2) — courbe("r = f(theta)", theta_min=..., theta_max=...)
	// The polar branch internally rewrites r = f(θ) as (f(θ)·cos(θ), f(θ)·sin(θ))
	// and always works in radians regardless of the active angle mode.
	// theta can be written as ASCII (`theta`) or LaTeX (`\theta`).

	const circleDsl = `c = courbe("r = 2*cos(theta)", theta_min=0, theta_max=\\pi, couleur="bleu")`;

	const constantCircleDsl = `c = courbe("r = 2", theta_min=0, theta_max=2*\\pi, couleur="bleu", remplissage="bleu")`;

	const cardioidDsl = `c = courbe("r = 1 - cos(theta)", theta_min=0, theta_max=2*\\pi, couleur="violet", remplissage="violet")`;

	const limaconLoopDsl = `c = courbe("r = 1 + 2*cos(theta)", theta_min=0, theta_max=2*\\pi, couleur="rouge")`;

	const limaconDimpledDsl = `c = courbe("r = 3 + 2*cos(theta)", theta_min=0, theta_max=2*\\pi, couleur="orange")`;

	const rose2Dsl = `c = courbe("r = sin(2*theta)", theta_min=0, theta_max=2*\\pi, couleur="orange")`;

	const rose3Dsl = `c = courbe("r = sin(3*theta)", theta_min=0, theta_max=\\pi, couleur="vert")`;

	const spiralDsl = `c = courbe("r = theta", theta_min=0, theta_max=6*\\pi, couleur="cyan")`;

	const lemniscateDsl = `c = courbe("r = sqrt(abs(cos(2*theta)))", theta_min=0, theta_max=2*\\pi, couleur="magenta")`;

	// Reactive examples

	const sliderRoseDsl = `n = slider(min=2, max=8, valeur=3)
c = courbe("r = sin(n*theta)", theta_min=0, theta_max=2*\\pi, couleur="vert")`;

	const sliderLimaconDsl = `b = slider(min=0.5, max=3, valeur=2)
c = courbe("r = 1 + b*cos(theta)", theta_min=0, theta_max=2*\\pi, couleur="rouge")`;

	const sliderThetaMaxDsl = `s = slider(min=0.5, max=2*\\pi, valeur=\\pi)
c = courbe("r = 1 - cos(theta)", theta_min=0, theta_max=s, couleur="violet")`;

	const latexThetaDsl = `c = courbe("r = \\theta", theta_min=0, theta_max=4*\\pi, couleur="cyan")`;

	// Tangente sur courbes polaires
	const tangenteCardioidDsl = `c = courbe("r = 1 - cos(theta)", theta_min=0, theta_max=2*\\pi, couleur="violet")
(d, v) = tangente(c, \\pi/2)`;

	const tangenteRoseDsl = `c = courbe("r = sin(2*theta)", theta_min=0, theta_max=2*\\pi, couleur="orange")
(d, v) = tangente(c, \\pi/8)`;

	const tangenteSliderPolarDsl = `c = courbe("r = 1 + 0.5*cos(theta)", theta_min=0, theta_max=2*\\pi, couleur="rouge")
t0 = slider(min=0, max=2*\\pi, valeur=\\pi/3)
(d, v) = tangente(c, t0)`;
</script>

<div class="container mx-auto max-w-6xl px-4 py-8">
	<a href="/geometry-demo" class="text-sm text-muted-foreground hover:underline"
		>← Retour aux demos</a
	>

	<h1 class="mt-4 mb-8 text-2xl font-bold">Courbes polaires — geometry-core</h1>

	<p class="mb-6 text-muted-foreground">
		Tracé d'une courbe polaire <code>r = f(θ)</code> via le builtin
		<code>courbe("r = ...", theta_min=..., theta_max=...)</code>. En interne, la courbe est réécrite
		en paramétrique <code>(f(θ)·cos(θ), f(θ)·sin(θ))</code> et traitée par le même pipeline que les courbes
		paramétriques.
	</p>

	<p class="mb-6 text-muted-foreground">
		Le mode angle est toujours en <strong>radians</strong> pour la branche polaire, indépendamment
		de
		<code>unite_angle("degrees")</code>. Le paramètre <code>theta</code> peut s'écrire en ASCII ou
		en LaTeX <code>\theta</code>.
	</p>

	<hr class="my-8" />

	<DslDemo
		dsl={circleDsl}
		title="Cercle polaire — r = 2·cos(θ)"
		description="Cercle de diamètre 2 centré en (1, 0), tracé sur [0, π]. La forme polaire la plus simple non triviale."
		width={700}
		height={500}
		center={{ x: 1, y: 0 }}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={constantCircleDsl}
		title="Cercle de rayon constant — r = 2"
		description="Quand r est constant, on obtient un cercle centré à l'origine. Détection automatique de fermeture sur [0, 2π]."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={cardioidDsl}
		title="Cardioïde — r = 1 − cos(θ)"
		description="Courbe fermée en forme de cœur. Cas particulier du limaçon de Pascal où a = b."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={limaconLoopDsl}
		title="Limaçon avec boucle — r = 1 + 2·cos(θ)"
		description="Limaçon de Pascal avec boucle interne (car |a| < |b| dans r = a + b·cos(θ))."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={limaconDimpledDsl}
		title="Limaçon avec creux — r = 3 + 2·cos(θ)"
		description="Limaçon convexe avec creux mais sans boucle (car |a| > |b|)."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={rose2Dsl}
		title="Rosace 4 pétales — r = sin(2·θ)"
		description="Pour r = sin(n·θ) avec n pair, on obtient 2n pétales sur [0, 2π]."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={rose3Dsl}
		title="Rosace 3 pétales — r = sin(3·θ)"
		description="Pour r = sin(n·θ) avec n impair, on obtient n pétales sur [0, π]."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={spiralDsl}
		title="Spirale d'Archimède — r = θ"
		description="Spirale dont la distance à l'origine croît linéairement avec l'angle. Non fermée."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={lemniscateDsl}
		title="Lemniscate-like — r = √|cos(2·θ)|"
		description="Approximation de la lemniscate de Bernoulli (avec abs pour éviter les valeurs négatives sous la racine)."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<h2 class="mt-12 mb-4 text-xl font-bold">Exemples réactifs</h2>

	<p class="mb-6 text-muted-foreground">
		Les courbes polaires participent au système réactif : sliders et scalaires dans les équations ou
		dans les bornes <code>theta_min</code> / <code>theta_max</code> redessinent la courbe.
	</p>

	<DslDemo
		dsl={sliderRoseDsl}
		title="Rosace dynamique — slider sur n"
		description="Déplace le slider pour faire varier le nombre de pétales : valeurs impaires → n pétales, valeurs paires → 2n pétales."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={sliderLimaconDsl}
		title="Limaçon dynamique — slider sur b"
		description="Quand b > 1 le limaçon a une boucle, quand b < 1 il a un creux, quand b = 1 c'est une cardioïde."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={sliderThetaMaxDsl}
		title="Tracé animé — slider sur theta_max"
		description="Déplace le slider pour faire varier theta_max : la cardioïde se construit progressivement et bascule en courbe fermée à 2π."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={latexThetaDsl}
		title="Notation LaTeX — r = \theta"
		description="Le paramètre angulaire peut s'écrire en LaTeX \theta (équivalent à `theta` ASCII). Spirale d'Archimède sur [0, 4π]."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<h2 class="mt-12 mb-4 text-xl font-bold">Tangente à une courbe polaire</h2>

	<p class="mb-6 text-muted-foreground">
		<code>tangente(c, theta0)</code> sur une courbe polaire retourne la
		<strong>droite tangente</strong> (pointillés) + le <strong>vecteur tangent</strong>. La syntaxe
		<code>(d, v) = tangente(c, theta0)</code> est obligatoire (destructuring).
	</p>

	<p class="mb-6 text-muted-foreground">
		<strong>Note pédagogique :</strong> sur une cardioïde
		<code>r = 1 − cos(θ)</code>, le point de rebroussement à θ = 0 est une
		<strong>singularité</strong> (γ'(0) = (0,0)) — appeler
		<code>tangente(c, 0)</code> lève une erreur DSL "tangente non définie — vitesse nulle".
	</p>

	<DslDemo
		dsl={tangenteCardioidDsl}
		title="Tangente sur cardioïde à θ = π/2"
		description="La cardioïde a un point de rebroussement à θ=0 ; à θ=π/2 le point est régulier."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={tangenteRoseDsl}
		title="Tangente sur rosace à θ = π/8"
		description="Vecteur tangent à la rosace 4 pétales pendant qu'elle s'enroule autour du premier pétale."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={tangenteSliderPolarDsl}
		title="Tangente animée sur limaçon — slider sur theta0"
		description="Déplace le slider pour suivre la tangente le long du limaçon. La magnitude du vecteur tangent varie avec la vitesse instantanée."
		width={700}
		height={500}
	/>
</div>
