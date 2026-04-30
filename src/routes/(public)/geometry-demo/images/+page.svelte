<script lang="ts">
	import DslDemo from '../DslDemo.svelte';

	const freePositionDsl = `A = point(-3, -1, couleur="bleu")
B = point(3, -1, couleur="bleu")
C = point(0, 3, couleur="bleu")
segment(A, B)
segment(B, C)
segment(C, A)
image("/game/monsters/dragon_tete.png", -0.5, 1.5, largeur=3)`;

	const anchoredDsl = `A = point(0, 0, couleur="rouge")
B = point(4, 2, couleur="bleu")
segment(A, B)
mesure(A, B)
image("/game/monsters/griffon_tete.png", A, largeur=2, dx=0.5, dy=0.5)
image("/game/monsters/lion_tete.png", B, largeur=2, dx=0.5, dy=0.5)`;

	const withHeightDsl = `A = point(-4, -2, couleur="bleu")
B = point(4, -2, couleur="bleu")
C = point(4, 3, couleur="bleu")
D = point(-4, 3, couleur="bleu")
segment(A, B)
segment(B, C)
segment(C, D)
segment(D, A)
image("/game/monsters/hydre_tete.png", 0, 0.5, largeur=7, hauteur=4)`;

	const draggableDsl = `image("/game/monsters/cyclope_tete.png", -1.5, 2.5, largeur=3)
image("/game/monsters/jaguar_tete.png", 2.5, 2.5, largeur=3)
A = point(0, -2, couleur="rouge")
texte(A, "Deplacez les images !", dx=0.5, dy=0.5)`;

	const constructionDsl = `O = point(0, 0, couleur="bleu")
r = slider(min=1, max=5, valeur=3, pas=0.5)
c = cercle(O, rayon=r, couleur="gris", trait="tirets")
P = point_sur(c, 45, couleur="rouge")
image("/game/monsters/aigle_tete.png", P, largeur=1.5, dx=-0.7, dy=0.3)
texte(P, "P", dx=0.5, dy=-0.5)`;

	const fondDsl = `image("/game/monsters/hydre_tete.png", 0, 0, largeur=10, hauteur=6, couche="fond")
A = point(-3, -1, couleur="rouge")
B = point(3, 1, couleur="rouge")
segment(A, B, couleur="jaune", epaisseur=3)
mesure(A, B)
C = point(0, 3, couleur="vert")
segment(A, C, couleur="jaune", epaisseur=3)
segment(B, C, couleur="jaune", epaisseur=3)`;

	const twoPointDsl = `A = point(-3, -2, couleur="bleu")
B = point(3, 2, couleur="bleu")
image("/game/monsters/dragon_tete.png", A, B)
segment(A, B, couleur="gris", trait="tirets")
texte(-4, 3, "Deplacez A et B !")`;

	const rotationDsl = `A = point(2, -1, couleur="vert")
B = point(4, 1, couleur="vert")
rect = polygone(A, point(B.x, A.y), B, point(A.x, B.y), couleur="vert")
img = image("/game/monsters/griffon_tete.png", A, B)
O = point(0, 0, couleur="bleu")
r1 = rotation(centre=O, angle=45)
transforme(r1, img)
transforme(r1, rect)
r2 = rotation(centre=O, angle=90)
transforme(r2, img)
transforme(r2, rect)
r3 = rotation(centre=O, angle=135)
transforme(r3, img)
transforme(r3, rect)
r4 = rotation(centre=O, angle=180)
transforme(r4, img)
transforme(r4, rect)
r5 = rotation(centre=O, angle=225)
transforme(r5, img)
transforme(r5, rect)
r6 = rotation(centre=O, angle=270)
transforme(r6, img)
transforme(r6, rect)
r7 = rotation(centre=O, angle=315)
transforme(r7, img)
transforme(r7, rect)
cercle(O, rayon=3, couleur="gris", trait="tirets")`;

	const rotationAnchoredDsl = `A = point(3, 0, couleur="rouge")
img = image("/game/monsters/lion_tete.png", A, largeur=2, dx=-1, dy=-1)
O = point(0, 0, couleur="bleu")
r1 = rotation(centre=O, angle=45)
transforme(r1, img)
r2 = rotation(centre=O, angle=90)
transforme(r2, img)
r3 = rotation(centre=O, angle=135)
transforme(r3, img)
r4 = rotation(centre=O, angle=180)
transforme(r4, img)
r5 = rotation(centre=O, angle=225)
transforme(r5, img)
r6 = rotation(centre=O, angle=270)
transforme(r6, img)
r7 = rotation(centre=O, angle=315)
transforme(r7, img)
cercle(O, rayon=3, couleur="gris", trait="tirets")`;

	const rotationFreeDsl = `img = image("/game/monsters/cobra_tete.png", 3, 0, largeur=2, hauteur=2)
O = point(0, 0, couleur="bleu")
r1 = rotation(centre=O, angle=45)
transforme(r1, img)
r2 = rotation(centre=O, angle=90)
transforme(r2, img)
r3 = rotation(centre=O, angle=135)
transforme(r3, img)
r4 = rotation(centre=O, angle=180)
transforme(r4, img)
r5 = rotation(centre=O, angle=225)
transforme(r5, img)
r6 = rotation(centre=O, angle=270)
transforme(r6, img)
r7 = rotation(centre=O, angle=315)
transforme(r7, img)
cercle(O, rayon=3, couleur="gris", trait="tirets")`;

	// ── Translation ──────────────────────────────────────────

	const translation2PointDsl = `A = point(-4, -1, couleur="bleu")
B = point(-1, 1, couleur="bleu")
img = image("/game/monsters/griffon_tete.png", A, B)
U = point(0, 0, couleur="vert")
V = point(3, 2, couleur="vert")
v = vecteur(U, V, couleur="vert")
t = translation(vecteur=v)
img2 = transforme(t, img)`;

	const translationAnchoredDsl = `A = point(-3, 0, couleur="rouge")
img = image("/game/monsters/lion_tete.png", A, largeur=2, dx=-1, dy=-1)
U = point(0, 0, couleur="vert")
V = point(4, 1, couleur="vert")
v = vecteur(U, V, couleur="vert")
t = translation(vecteur=v)
img2 = transforme(t, img)`;

	const translationFreeDsl = `img = image("/game/monsters/cobra_tete.png", -3, 0, largeur=2, hauteur=2)
U = point(0, 0, couleur="vert")
V = point(4, 1, couleur="vert")
v = vecteur(U, V, couleur="vert")
t = translation(vecteur=v)
img2 = transforme(t, img)`;

	// ── Symetrie centrale ────────────────────────────────────

	const symCentrale2PointDsl = `A = point(-4, -1, couleur="bleu")
B = point(-1, 1, couleur="bleu")
img = image("/game/monsters/dragon_tete.png", A, B)
O = point(0, 0, couleur="rouge")
s = symetrie(centre=O)
img2 = transforme(s, img)
segment(A, O, couleur="gris", trait="tirets")`;

	const symCentraleAnchoredDsl = `A = point(-3, 1, couleur="rouge")
img = image("/game/monsters/griffon_tete.png", A, largeur=2, dx=-1, dy=-1)
O = point(0, 0, couleur="bleu")
s = symetrie(centre=O)
img2 = transforme(s, img)
segment(A, O, couleur="gris", trait="tirets")`;

	const symCentraleFreeDsl = `img = image("/game/monsters/lion_tete.png", -3, 1, largeur=2, hauteur=2)
O = point(0, 0, couleur="bleu")
s = symetrie(centre=O)
img2 = transforme(s, img)`;

	// ── Homothetie ───────────────────────────────────────────

	const homothetie2PointDsl = `A = point(-3, -1, couleur="bleu")
B = point(-1, 1, couleur="bleu")
img = image("/game/monsters/cobra_tete.png", A, B)
O = point(0, 0, couleur="rouge")
h = homothetie(centre=O, rapport=1.5)
img2 = transforme(h, img)
segment(O, A, couleur="gris", trait="tirets")`;

	const homothetieAnchoredDsl = `A = point(1, 1, couleur="rouge")
img = image("/game/monsters/lion_tete.png", A, largeur=1.5, dx=-0.75, dy=-0.75)
O = point(0, 0, couleur="bleu")
h = homothetie(centre=O, rapport=2)
img2 = transforme(h, img)
segment(O, A, couleur="gris", trait="tirets")`;

	const homothetieFreeDsl = `img = image("/game/monsters/dragon_tete.png", 1, 1, largeur=1.5, hauteur=1.5)
O = point(0, 0, couleur="bleu")
h = homothetie(centre=O, rapport=2)
img2 = transforme(h, img)`;

	const symetrie2PointDsl = `A = point(-4, -1, couleur="bleu")
B = point(-1, 1, couleur="bleu")
img = image("/game/monsters/cobra_tete.png", A, B)
P1 = point(0, -3, couleur="rouge")
P2 = point(0, 3, couleur="rouge")
d = droite(P1, P2, couleur="gris", trait="tirets")
s = symetrie(axe=d)
img2 = transforme(s, img)`;

	const symetrieAnchoredDsl = `A = point(-3, 0, couleur="rouge")
img = image("/game/monsters/lion_tete.png", A, largeur=2, dx=-1, dy=-1)
P1 = point(0, -3, couleur="rouge")
P2 = point(0, 3, couleur="rouge")
d = droite(P1, P2, couleur="gris", trait="tirets")
s = symetrie(axe=d)
img2 = transforme(s, img)`;

	const symetrieFreeDsl = `img = image("/game/monsters/dragon_tete.png", -3, 0, largeur=2, hauteur=2)
P1 = point(0, -3, couleur="rouge")
P2 = point(0, 3, couleur="rouge")
d = droite(P1, P2, couleur="gris", trait="tirets")
s = symetrie(axe=d)
img2 = transforme(s, img)`;
</script>

<svelte:head>
	<title>Geometry Demo — Images</title>
</svelte:head>

<div class="container mx-auto max-w-6xl space-y-10 p-4">
	<div>
		<a href="/geometry-demo" class="text-sm text-muted-foreground hover:underline">
			&larr; Geometry Demos
		</a>
		<h1 class="mt-2 text-2xl font-bold">Images dans les figures</h1>
		<p class="text-muted-foreground">
			Placement d'images sur les figures geometriques avec image(). Position libre ou ancree a un
			point, avec largeur et hauteur configurables.
		</p>
	</div>

	<DslDemo
		dsl={freePositionDsl}
		title="Image en position libre"
		description="image(url, x, y, largeur=W) place une image centree aux coordonnees (x, y) avec une largeur en unites mathematiques."
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={anchoredDsl}
		title="Images ancrees a des points"
		description="image(url, point, largeur=W, dx=D, dy=E) ancre l'image a un point. L'image suit le point quand on le deplace."
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={withHeightDsl}
		title="Largeur et hauteur explicites"
		description="Avec largeur et hauteur, l'image occupe exactement le rectangle specifie. Sans hauteur, le ratio naturel est preserve."
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={draggableDsl}
		title="Images deplacables"
		description="Les images en position libre sont deplacables a la souris, comme les elements texte."
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={constructionDsl}
		title="Image sur un point contraint"
		description="L'image suit un point_sur(cercle). Combinez avec un slider pour varier le rayon du cercle."
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={fondDsl}
		title="Image de fond (couche=&quot;fond&quot;)"
		description="Avec couche=&quot;fond&quot;, l'image est rendue derriere toutes les constructions geometriques. Ideal pour les supports visuels."
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={twoPointDsl}
		title="Image entre 2 points"
		description="image(&quot;url&quot;, A, B) remplit le rectangle defini par les deux points. L'image se redimensionne quand les points bougent."
		width={600}
		height={400}
	/>

	<h2 class="mt-8 text-xl font-bold">Rotation</h2>

	<DslDemo
		dsl={rotationDsl}
		title="Rotation — image 2 points"
		description="Image definie par 2 coins draggables. Les rotations preservent les dimensions et l'orientation visuelle."
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={rotationAnchoredDsl}
		title="Rotation — image ancree"
		description="Image ancree au point A avec offset de centrage. Le point A tourne sur le cercle, l'image suit et tourne visuellement."
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={rotationFreeDsl}
		title="Rotation — image libre"
		description="Image en position libre (x, y). Le centre de l'image est transforme et l'image tourne visuellement."
		width={600}
		height={400}
	/>

	<h2 class="mt-8 text-xl font-bold">Translation</h2>

	<DslDemo
		dsl={translation2PointDsl}
		title="Translation — image 2 points"
		description="Les deux coins sont translatees par le vecteur. Deplacez U ou V pour changer le vecteur."
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={translationAnchoredDsl}
		title="Translation — image ancree"
		description="L'image ancree au point A est translatee. Deplacez A ou le vecteur."
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={translationFreeDsl}
		title="Translation — image libre"
		description="L'image libre est translatee. Deplacez l'image ou le vecteur."
		width={600}
		height={400}
	/>

	<h2 class="mt-8 text-xl font-bold">Symetrie centrale</h2>

	<DslDemo
		dsl={symCentrale2PointDsl}
		title="Symetrie centrale — image 2 points"
		description="Les deux coins sont reflechis par rapport au centre O. Equivalent a une rotation de 180°."
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={symCentraleAnchoredDsl}
		title="Symetrie centrale — image ancree"
		description="L'image ancree est reflechie par rapport a O. Deplacez A ou O."
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={symCentraleFreeDsl}
		title="Symetrie centrale — image libre"
		description="L'image libre est reflechie par rapport a O."
		width={600}
		height={400}
	/>

	<h2 class="mt-8 text-xl font-bold">Homothetie</h2>

	<DslDemo
		dsl={homothetie2PointDsl}
		title="Homothetie — image 2 points"
		description="Les deux coins sont dilates par rapport a O avec rapport 1.5. L'image grandit et s'eloigne."
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={homothetieAnchoredDsl}
		title="Homothetie — image ancree"
		description="L'homothetie de rapport 2 deplace l'ancrage et double les dimensions de l'image."
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={homothetieFreeDsl}
		title="Homothetie — image libre"
		description="L'image libre est agrandie par rapport a O avec rapport 2."
		width={600}
		height={400}
	/>

	<h2 class="mt-8 text-xl font-bold">Symetrie axiale</h2>

	<DslDemo
		dsl={symetrie2PointDsl}
		title="Symetrie axiale — image 2 points"
		description="Les deux coins A et B sont reflechis par la symetrie. Deplacez A, B ou l'axe pour voir la mise a jour reactive."
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={symetrieAnchoredDsl}
		title="Symetrie axiale — image ancree"
		description="L'image ancree au point A est reflechie. Deplacez A ou l'axe pour verifier la reactivite."
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={symetrieFreeDsl}
		title="Symetrie axiale — image libre"
		description="L'image en position libre est reflechie. Deplacez l'image ou l'axe."
		width={600}
		height={400}
	/>
</div>
