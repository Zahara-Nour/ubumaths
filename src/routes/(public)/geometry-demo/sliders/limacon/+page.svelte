<script lang="ts">
	import DslDemo from '../../DslDemo.svelte';

	const c1Dsl = `K = point(0, 0, couleur="bleu")
c = cercle(K, rayon=2, couleur="bleu")
O = point(2, 0, couleur="vert")
A = point_sur(c, 90, couleur="rouge")
n = distance(O, A)
d = slider(min=0, max=8, valeur=3, pas=0.1)
r = 1 + d/n
P = homothetie(A, centre=O, rapport=r, couleur="orange")
L = lieu(P, A, couleur="violet")`;

	const c2Dsl = `K = point(0, 0, couleur="bleu")
c = cercle(K, rayon=2, couleur="bleu")
O = point(2, 0, couleur="vert")
A = point_sur(c, 90, couleur="rouge")
n = distance(O, A)
d = slider(min=0, max=8, valeur=3, pas=0.1)
r1 = 1 + d/n
r2 = 1 - d/n
P1 = homothetie(A, centre=O, rapport=r1, couleur="orange")
P2 = homothetie(A, centre=O, rapport=r2, couleur="cyan")
L1 = lieu(P1, A, couleur="violet")
L2 = lieu(P2, A, couleur="cyan")`;

	const c3Dsl = `K = point(0, 0, couleur="bleu")
c = cercle(K, rayon=2, couleur="bleu")
O = point(2, 0, couleur="vert")
A = point_sur(c, 90, couleur="rouge")
d = slider(min=0, max=8, valeur=3, pas=0.1)
l = droite(O, A, couleur="gris")
c2 = cercle(A, rayon=d, couleur="gris")
P1 = intersection(l, c2, choix=1, couleur="orange")
P2 = intersection(l, c2, choix=2, couleur="cyan")
L1 = lieu(P1, A, couleur="violet")
L2 = lieu(P2, A, couleur="cyan")`;

	const c4Dsl = `O = point(0, 0, couleur="vert")
c = cercle(point(2, 0, couleur="bleu"), rayon=2, couleur="bleu")
f = courbe("(x^2+y^2-4*x)^2 = 9*(x^2+y^2)", couleur="violet")`;

	const c5Dsl = `K = point(0, 0, couleur="bleu")
c = cercle(K, rayon=2, couleur="bleu")
O = point(4, 0, couleur="vert")
A = point_sur(c, 90, couleur="rouge")
n = distance(O, A)
d = slider(min=0, max=8, valeur=3, pas=0.1)
r = 1 + d/n
P = homothetie(A, centre=O, rapport=r, couleur="orange")
L = lieu(P, A, couleur="violet")`;

	const c7Dsl = `K = point(0, 0, couleur="bleu")
c = cercle(K, rayon=2, couleur="bleu")
O = point(2, 0, couleur="vert")
A = point_sur(c, 120, couleur="rouge")
d = slider(min=0.5, max=6, valeur=3, pas=0.1)
c_roll = cercle(A, rayon=d, couleur="orange")
segment(O, A, couleur="gris")
n = distance(O, A)
r1 = 1 + d/n
r2 = 1 - d/n
P1 = homothetie(A, centre=O, rapport=r1, couleur="violet")
P2 = homothetie(A, centre=O, rapport=r2, couleur="cyan")
segment(A, P1, couleur="violet")
segment(A, P2, couleur="cyan")
L1 = lieu(P1, A, couleur="violet")
L2 = lieu(P2, A, couleur="cyan")`;

	const c6Dsl = `K = point(0, 0, couleur="bleu")
c = cercle(K, rayon=2, couleur="bleu")
O = point(2, 0, couleur="vert")
A = point_sur(c, 90, couleur="rouge")
segment(O, A, couleur="gris")
n = distance(O, A)
d = slider(min=0, max=8, valeur=4, pas=0.1)
r1 = 1 + d/n
r2 = 1 - d/n
P1 = homothetie(A, centre=O, rapport=r1, couleur="orange")
P2 = homothetie(A, centre=O, rapport=r2, couleur="cyan")
segment(P2, P1, couleur="gris")
L1 = lieu(P1, A, couleur="violet")
L2 = lieu(P2, A, couleur="cyan")`;
</script>

<svelte:head>
	<title>Limacon de Pascal — Constructions</title>
</svelte:head>

<div class="container mx-auto max-w-6xl space-y-10 p-4">
	<div>
		<a href="/geometry-demo/sliders" class="text-sm text-muted-foreground hover:underline"
			>&larr; Sliders</a
		>
		<h1 class="mt-2 text-2xl font-bold">Limacon de Pascal</h1>
		<p class="text-muted-foreground">
			Exploration de toutes les constructions possibles du limacon avec le DSL geometry-core. Cercle
			c de centre K, rayon a=2, pole O sur ou hors du cercle.
		</p>
	</div>

	<DslDemo
		dsl={c1Dsl}
		title="C1. Homothetie — branche exterieure"
		description="r = 1 + d/n donne |OP| = |OA| + d. Comme O est sur le cercle, seule la branche exterieure est tracee."
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={c2Dsl}
		title="C2. Double homothetie — deux branches"
		description="r1 = 1+d/n (violet, exterieur) et r2 = 1-d/n (cyan, interieur). Quand |OA| < d, r2 < 0 et P2 passe de l'autre cote de O : c'est la boucle interieure."
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={c3Dsl}
		title="C3. Conchoide — intersection droite/cercle"
		description="Droite (OA) et cercle(A, d) : les 2 intersections sont les points a distance d de A sur la droite. Le choix d'intersection peut sauter quand A traverse certaines positions."
		width={600}
		height={500}
	/>

	<DslDemo
		dsl={c4Dsl}
		title="C4. Courbe implicite — limacon complet"
		description="Equation polaire p = 3 + 4cos(t) convertie en implicite : (x²+y²-4x)² = 9(x²+y²). Donne le limacon complet en une seule courbe (pas de slider)."
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={c5Dsl}
		title="C5. Pole HORS du cercle"
		description="Quand O=(4,0) n'est pas sur le cercle, la direction O→A couvre tout le plan. Une seule homothetie r = 1+d/n trace le limacon complet."
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={c7Dsl}
		title="C7. Cercle roulant (animation)"
		description="Deplacez A (rouge) autour du cercle pour voir le cercle roulant (orange). P1 et P2 sont a distance d de A sur la droite (OA), exactement sur le cercle roulant."
		width={600}
		height={450}
	/>

	<DslDemo
		dsl={c6Dsl}
		title="C6. Cas particuliers (slider d)"
		description="Double homothetie avec segment [P2,P1] visible. d=0 : point O. d<4 : limacon avec boucle. d=4 (=2a) : cardioide. d>4 : convexe."
		width={600}
		height={400}
	/>

	<!-- Synthese -->
	<section class="space-y-2 rounded-lg border p-4">
		<h2 class="text-lg font-semibold">Synthese</h2>
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b">
					<th class="py-1 text-left">Construction</th>
					<th class="py-1 text-left">Branches</th>
					<th class="py-1 text-left">Slider</th>
					<th class="py-1 text-left">Limites</th>
				</tr>
			</thead>
			<tbody>
				<tr class="border-b">
					<td class="py-1">C1. Homothetie simple</td>
					<td>1 (ext.)</td>
					<td>d</td>
					<td>Demi-limacon seulement</td>
				</tr>
				<tr class="border-b">
					<td class="py-1">C2. Double homothetie</td>
					<td>2</td>
					<td>d</td>
					<td>Complet, 2 lieux separes</td>
				</tr>
				<tr class="border-b">
					<td class="py-1">C3. Conchoide</td>
					<td>2 (instable)</td>
					<td>d</td>
					<td>Saut de branche possible</td>
				</tr>
				<tr class="border-b">
					<td class="py-1">C4. Implicite</td>
					<td>complete</td>
					<td>non</td>
					<td>Equation fixe, pas de slider</td>
				</tr>
				<tr class="border-b">
					<td class="py-1">C5. Pole hors cercle</td>
					<td>1 (complete)</td>
					<td>d</td>
					<td>Le meilleur compromis</td>
				</tr>
				<tr class="border-b">
					<td class="py-1">C6. Cas particuliers</td>
					<td>2</td>
					<td>d</td>
					<td>Pedagogique, montre la transition</td>
				</tr>
				<tr>
					<td class="py-1 font-semibold">C7. Cercle roulant</td>
					<td>2</td>
					<td>d</td>
					<td>Animation interactive, conchoide visuelle</td>
				</tr>
			</tbody>
		</table>
	</section>
</div>
