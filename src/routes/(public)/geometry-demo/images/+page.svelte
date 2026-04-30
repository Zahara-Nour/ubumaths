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
r = rotation(centre=O, angle=90)
img2 = transforme(r, img)
transforme(r, rect)
r2 = rotation(centre=O, angle=180)
img3 = transforme(r2, img)
transforme(r2, rect)
r3 = rotation(centre=O, angle=270)
img4 = transforme(r3, img)
transforme(r3, rect)
cercle(O, rayon=3, couleur="gris", trait="tirets")`;

	const rotationAnchoredDsl = `A = point(3, 0, couleur="rouge")
img = image("/game/monsters/lion_tete.png", A, largeur=2, dx=-1, dy=-1)
O = point(0, 0, couleur="bleu")
r = rotation(centre=O, angle=90)
img2 = transforme(r, img)
r2 = rotation(centre=O, angle=180)
img3 = transforme(r2, img)
r3 = rotation(centre=O, angle=270)
img4 = transforme(r3, img)
cercle(O, rayon=3, couleur="gris", trait="tirets")`;

	const rotationFreeDsl = `img = image("/game/monsters/cobra_tete.png", 3, 0, largeur=2, hauteur=2)
O = point(0, 0, couleur="bleu")
r = rotation(centre=O, angle=90)
img2 = transforme(r, img)
r2 = rotation(centre=O, angle=180)
img3 = transforme(r2, img)
r3 = rotation(centre=O, angle=270)
img4 = transforme(r3, img)
cercle(O, rayon=3, couleur="gris", trait="tirets")`;

	const homothetieDsl = `A = point(1, 1, couleur="rouge")
img = image("/game/monsters/lion_tete.png", A, largeur=1.5, dx=-0.75, dy=-0.75)
O = point(0, 0, couleur="bleu")
h = homothetie(centre=O, rapport=2)
img2 = transforme(h, img)
segment(O, A, couleur="gris", trait="tirets")`;

	const symetrieDsl = `A = point(-2, -1, couleur="bleu")
B = point(2, 1, couleur="bleu")
img = image("/game/monsters/cobra_tete.png", A, B)
C = point(0, 3, couleur="rouge")
D = point(0, -3, couleur="rouge")
d = droite(C, D, couleur="gris", trait="tirets")
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

	<DslDemo
		dsl={rotationDsl}
		title="Rotation d'images (2 points)"
		description="Image definie par 2 coins draggables. Les rotations preservent les dimensions et l'orientation visuelle."
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={rotationAnchoredDsl}
		title="Rotation d'images (ancree)"
		description="Image ancree au point A avec offset de centrage. Le point A tourne sur le cercle, l'image suit et tourne visuellement."
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={rotationFreeDsl}
		title="Rotation d'images (position libre)"
		description="Image en position libre (x, y). Le centre de l'image est transforme et l'image tourne visuellement."
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={homothetieDsl}
		title="Homothetie (agrandissement)"
		description="L'homothetie de rapport 2 deplace l'ancrage et double les dimensions de l'image."
		width={600}
		height={400}
	/>

	<DslDemo
		dsl={symetrieDsl}
		title="Symetrie axiale d'une image 2 points"
		description="Le reflet d'une image 2 points par symetrie axiale transforme les deux coins du rectangle."
		width={600}
		height={400}
	/>
</div>
