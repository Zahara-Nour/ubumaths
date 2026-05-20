<script lang="ts">
	import DslDemo from '../DslDemo.svelte';

	const distanceDsl = `A = point(-3, -1, couleur="bleu")
B = point(3, 2, couleur="bleu")
segment(A, B)
mesure(A, B)`;

	const angleDsl = `A = point(3, 0, couleur="bleu")
O = point(0, 0, couleur="rouge")
B = point(1, 3, couleur="bleu")
segment(O, A)
segment(O, B)
angle(A, O, B)
mesure(A, O, B)`;

	const aireDsl = `A = point(-2, -1, couleur="bleu")
B = point(3, -1, couleur="bleu")
C = point(1, 3, couleur="bleu")
D = point(-3, 2, couleur="bleu")
polygone(A, B, C, D)
mesure(A, B, C, D)`;

	const scalarComposeDsl = `A = point(-3, 0, couleur="bleu")
B = point(3, 0, couleur="bleu")
C = point(0, 4, couleur="bleu")
segment(A, B)
segment(B, C)
segment(C, A)
mesure(A, B)
mesure(B, C)
mesure(C, A)
mesure(A, B, C)`;

	const distancePointDroiteDsl = `A = point(-3, -1, couleur="bleu")
B = point(3, 1, couleur="bleu")
d = droite(A, B)
P = point(1, 4, couleur="rouge")
h = distance(P, d)
texte(4, 4, "d(P,d) = {h:.2f}")
style(d, couleur="gris")`;

	const aireScalarDsl = `A = point(0, 0, couleur="bleu")
B = point(4, 0, couleur="bleu")
C = point(4, 3, couleur="bleu")
polygone(A, B, C)
s = aire(A, B, C)
d = s * 2
c = cercle(A, rayon=s, couleur="gris", trait="tirets")`;

	const mathTextDsl = `A = point(-3, -1, couleur="bleu")
B = point(3, 1, couleur="bleu")
segment(A, B)
d = distance(A, B)
mtexte(-5, 4, "d = {d:.2f}")`;

	const richTextDsl = `A = point(-3, -1, couleur="bleu")
B = point(3, 2, couleur="bleu")
segment(A, B)
d = distance(A, B)
rtexte(-5, 4, "**Distance** AB = $d = {d:.2f}$")`;
</script>

<div class="container mx-auto max-w-6xl space-y-10 p-4">
	<div>
		<a href="/geometry-demo" class="text-sm text-muted-foreground hover:underline">
			&larr; Geometry Demos
		</a>
		<h1 class="mt-2 text-2xl font-bold">Mesures et texte</h1>
		<p class="text-muted-foreground">
			Affichage de mesures sur les figures : distances, angles, aires. Les valeurs se mettent a jour
			quand on deplace les points.
		</p>
	</div>

	<DslDemo
		dsl={distanceDsl}
		title="Distance entre deux points"
		description="mesure(A, B) affiche la distance au milieu du segment."
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={angleDsl}
		title="Angle entre trois points"
		description="mesure(A, O, B) affiche l'angle au sommet O, sur la bissectrice."
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={aireDsl}
		title="Aire d'un polygone"
		description="mesure(A, B, C, D) affiche l'aire au centroide du polygone."
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={scalarComposeDsl}
		title="Mesures multiples sur un triangle"
		description="On peut combiner plusieurs mesure() sur la meme figure : cotes et aire."
		width={600}
		height={450}
	/>

	<DslDemo
		dsl={distancePointDroiteDsl}
		title="Distance point-droite"
		description="distance(P, d) calcule la distance perpendiculaire d'un point a une droite (scalar invisible)."
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={aireScalarDsl}
		title="Aire comme scalaire composable"
		description="aire(A, B, C) cree un scalaire reutilisable — ici comme rayon d'un cercle."
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={mathTextDsl}
		title="Texte math (mtexte) — formule LaTeX"
		description="mtexte() affiche une formule LaTeX rendue par MathLive. Draggable !"
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={richTextDsl}
		title="Texte riche (rtexte) — gras + math inline"
		description="rtexte() affiche du texte avec **gras**, *italique* et $math$ via InlineRenderer."
		width={600}
		height={400}
	/>
</div>
