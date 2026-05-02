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

	// Tangente paramétrique : (d, v) = tangente(c, t0)
	// d = droite tangente (pointillés), v = vecteur tangent γ'(t0)
	const tangenteParabolaDsl = `c = courbe("x = t", "y = t^2", t_min=-2, t_max=2, couleur="bleu")
(d, v) = tangente(c, 1)`;

	const tangenteLissajousDsl = `unite_angle("radians")
c = courbe("x = sin(3*t)", "y = sin(2*t)", t_min=0, t_max=2*\\pi, couleur="violet")
(d, v) = tangente(c, 0.6)`;

	const tangenteSliderDsl = `unite_angle("radians")
c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=2*\\pi, couleur="bleu")
t0 = slider(min=0, max=2*\\pi, valeur=\\pi/4)
(d, v) = tangente(c, t0)`;
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

	<h2 class="mt-12 mb-4 text-xl font-bold">Tangente à une courbe paramétrique</h2>

	<p class="mb-6 text-muted-foreground">
		Le builtin <code>tangente(c, t0)</code> appliqué à une courbe paramétrique retourne deux
		éléments : la <strong>droite tangente</strong> (pointillés par défaut) et le
		<strong>vecteur tangent</strong> <code>γ'(t0)</code> ancré en <code>γ(t0)</code>. La syntaxe
		impose le destructuring <code>(d, v) = tangente(c, t0)</code>.
	</p>

	<DslDemo
		dsl={tangenteParabolaDsl}
		title="Tangente sur parabole — (t, t²) à t = 1"
		description="γ(1) = (1, 1), γ'(1) = (1, 2). Pente 2 = dérivée de y = x² en x = 1."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={tangenteLissajousDsl}
		title="Tangente sur Lissajous (3:2) à t ≈ 0.6"
		description="La direction et la magnitude du vecteur tangent varient le long du chemin — particulièrement marqué près des points de rebroussement."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={tangenteSliderDsl}
		title="Tangente animée — slider sur t0"
		description="Déplace le slider pour faire glisser le point de tangence sur le cercle. Le vecteur tangent (cos t pi/2 + 1, sin t pi/2 + 1) reste de norme 1 (vitesse constante)."
		width={700}
		height={500}
	/>
</div>
