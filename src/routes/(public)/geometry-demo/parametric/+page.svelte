<script lang="ts">
	import DslDemo from '../DslDemo.svelte';

	// Note: \\pi and e (Euler) are now first-class DSL constants thanks to the
	// mathAST routing. Math functions (sqrt, exp, ln, log, …) and arithmetic
	// expressions in the RHS are also routed to mathAST automatically.
	//
	// The DSL angle mode defaults to degrees. These trigonometric demos opt
	// into radians via `unite_angle("radians")` so cos(t)/sin(t) on intervals
	// relative to π behave as expected.

	const circleDsl = `unite_angle("radians")
c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=2*\\pi, couleur="bleu")`;

	const parabolaDsl = `c = courbe("x = t", "y = t^2", t_min=-2, t_max=2, couleur="rouge")`;

	const cardioidDsl = `unite_angle("radians")
c = courbe("x = (1 - cos(t)) * cos(t)", "y = (1 - cos(t)) * sin(t)", t_min=0, t_max=2*\\pi, couleur="violet")`;

	const lissajousDsl = `unite_angle("radians")
c1 = courbe("x = sin(3*t)", "y = sin(2*t)", t_min=0, t_max=2*\\pi, couleur="bleu")
c2 = courbe("x = sin(4*t)", "y = sin(3*t)", t_min=0, t_max=2*\\pi, couleur="rouge")
c3 = courbe("x = sin(5*t)", "y = sin(4*t)", t_min=0, t_max=2*\\pi, couleur="vert")`;

	const cycloidDsl = `unite_angle("radians")
c = courbe("x = t - sin(t)", "y = 1 - cos(t)", t_min=0, t_max=4*\\pi, couleur="orange")`;

	const archimedeanSpiralDsl = `unite_angle("radians")
c = courbe("x = t * cos(t)", "y = t * sin(t)", t_min=0, t_max=6*\\pi, couleur="cyan")`;

	const sliderTmaxDsl = `unite_angle("radians")
s = slider(min=0.1, max=2*\\pi, valeur=\\pi)
c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=s, couleur="bleu")`;

	const sliderRadiusDsl = `unite_angle("radians")
r = slider(min=0.5, max=4, valeur=2)
c = courbe("x = r * cos(t)", "y = r * sin(t)", t_min=0, t_max=2*\\pi, param="t", couleur="rouge")`;

	const closedFillDsl = `unite_angle("radians")
c = courbe("x = 2 * cos(t)", "y = sin(t)", t_min=0, t_max=2*\\pi, couleur="violet", remplissage="violet")`;

	// New: variables and constants — math-pure RHS routed through mathAST.
	// Note: inside the equation strings we write \phi (Greek-letter command);
	// mathAST would otherwise split the bare word `phi` into p·h·i.
	const variablesDsl = `unite_angle("radians")
phi = (1 + sqrt(5)) / 2
c = courbe("x = \\phi*cos(t)", "y = sin(t)", t_min=0, t_max=2*\\pi, couleur="orange")`;

	// New: derived reactive scalar — k follows s, the curve follows k.
	const reactiveDsl = `unite_angle("radians")
s = slider(min=0.5, max=4, valeur=2)
k = 2 * s
c = courbe("x = k*cos(t)", "y = k*sin(t)", t_min=0, t_max=2*\\pi, couleur="rouge")`;

	// =========================================================================
	// Polar curves (V2) — courbe("r = f(theta)", theta_min=..., theta_max=...)
	// The polar branch internally rewrites r = f(θ) as (f(θ)·cos(θ), f(θ)·sin(θ))
	// and always works in radians regardless of the active angle mode.
	// =========================================================================

	const polarCircleDsl = `c = courbe("r = 2*cos(theta)", theta_min=0, theta_max=\\pi, couleur="bleu")`;

	const polarCardioidDsl = `c = courbe("r = 1 - cos(theta)", theta_min=0, theta_max=2*\\pi, couleur="violet", remplissage="violet")`;

	const polarLimaconDsl = `c = courbe("r = 1 + 2*cos(theta)", theta_min=0, theta_max=2*\\pi, couleur="rouge")`;

	const polarRoseDsl = `c = courbe("r = sin(2*theta)", theta_min=0, theta_max=2*\\pi, couleur="orange")`;

	const polarSpiralDsl = `c = courbe("r = theta", theta_min=0, theta_max=6*\\pi, couleur="cyan")`;

	const polarSliderDsl = `n = slider(min=2, max=8, valeur=3)
c = courbe("r = sin(n*theta)", theta_min=0, theta_max=2*\\pi, couleur="vert")`;
</script>

<div class="container mx-auto max-w-6xl px-4 py-8">
	<a href="/geometry-demo" class="text-sm text-muted-foreground hover:underline"
		>← Retour aux demos</a
	>

	<h1 class="mt-4 mb-8 text-2xl font-bold">Courbes paramétriques — geometry-core</h1>

	<p class="mb-6 text-muted-foreground">
		Tracé d'une courbe t → (x(t), y(t)) via le builtin <code>courbe()</code> avec deux équations
		<code>"x = ..."</code> et <code>"y = ..."</code>. Le paramètre est auto-détecté ; les bornes
		<code>t_min</code> et <code>t_max</code> peuvent référencer un slider pour animer le tracé.
	</p>

	<hr class="my-8" />

	<DslDemo
		dsl={circleDsl}
		title="Cercle — (cos t, sin t)"
		description="La courbe paramétrique la plus classique. Détection automatique de courbe fermée."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={parabolaDsl}
		title="Parabole — (t, t²)"
		description="Forme paramétrique de y = x². Sampling adaptatif via ‖vitesse‖."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={cardioidDsl}
		title="Cardioïde — (1 − cos t)·(cos t, sin t)"
		description="Forme polaire r = 1 − cos θ exprimée en paramétrique."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={lissajousDsl}
		title="Courbes de Lissajous — (sin nt, sin mt)"
		description="Trois ratios de fréquences (3:2, 4:3, 5:4). Densité d'échantillonnage plus élevée dans les régions à forte courbure."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={cycloidDsl}
		title="Cycloïde — (t − sin t, 1 − cos t)"
		description="Trajectoire d'un point d'un cercle qui roule sans glisser sur une droite."
		width={700}
		height={500}
		center={{ x: 6, y: 1 }}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={archimedeanSpiralDsl}
		title="Spirale d'Archimède — (t cos t, t sin t)"
		description="r = t en polaire. Sampling dense près de l'origine, plus large vers l'extérieur."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={sliderTmaxDsl}
		title="Tracé animé — slider sur t_max"
		description="Déplace le slider pour faire varier t_max de 0 à 2π : la courbe se construit progressivement et bascule en courbe fermée à 2π."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={sliderRadiusDsl}
		title="Coefficient dynamique — slider dans x(t), y(t)"
		description="Le rayon r est contrôlé par un slider ; toutes les courbes paramétriques se redessinent quand le slider bouge."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={closedFillDsl}
		title="Courbe fermée — remplissage"
		description="Ellipse paramétrique avec fond. Le sampler détecte la fermeture et le rendu SVG ferme le path (Z) pour permettre le fill."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={variablesDsl}
		title="Variables et constantes — phi = (1 + √5) / 2"
		description="Les RHS math-pures sont routées vers mathAST : sqrt(), \pi, e et toutes les fonctions math sont disponibles. La variable phi est substituée dans les équations avant compilation."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={reactiveDsl}
		title="Variable réactive — k = 2·s"
		description="La variable k dépend du slider s. Toute expression contenant un slider/scalar produit un GeoScalar réactif ; la courbe se redessine quand s bouge."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<h2 class="mt-12 mb-4 text-xl font-bold">Courbes polaires</h2>

	<p class="mb-6 text-muted-foreground">
		Forme polaire <code>r = f(θ)</code> via
		<code>courbe("r = ...", theta_min=..., theta_max=...)</code>. En interne, la courbe est réécrite
		en paramétrique
		<code>(f(θ)·cos(θ), f(θ)·sin(θ))</code>. Le mode angle est toujours en
		<strong>radians</strong> pour la branche polaire. Le paramètre <code>theta</code> peut s'écrire
		en ASCII ou en LaTeX <code>\theta</code>.
	</p>

	<DslDemo
		dsl={polarCircleDsl}
		title="Cercle polaire — r = 2·cos(θ)"
		description="Cercle de diamètre 2 centré en (1, 0). La forme polaire la plus simple non triviale."
		width={700}
		height={500}
		center={{ x: 1, y: 0 }}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={polarCardioidDsl}
		title="Cardioïde — r = 1 − cos(θ)"
		description="Courbe fermée en forme de cœur. Détection automatique de fermeture sur [0, 2π] avec remplissage."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={polarLimaconDsl}
		title="Limaçon avec boucle — r = 1 + 2·cos(θ)"
		description="Limaçon de Pascal avec boucle interne (car a < b dans r = a + b·cos(θ))."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={polarRoseDsl}
		title="Rosace 4 pétales — r = sin(2·θ)"
		description="Rosace polaire. Pour r = sin(n·θ), on obtient n pétales si n impair, 2n pétales si n pair."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={polarSpiralDsl}
		title="Spirale d'Archimède — r = θ"
		description="Forme polaire native (la version paramétrique r·(cos θ, sin θ) est plus haut). Non fermée."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={polarSliderDsl}
		title="Rosace dynamique — slider sur n"
		description="Déplace le slider pour faire varier le nombre de pétales : valeurs impaires → n pétales, valeurs paires → 2n pétales."
		width={700}
		height={500}
	/>
</div>
