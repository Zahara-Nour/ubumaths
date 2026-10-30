# Chantier `illustrations` — mise en images du lore

## Reprendre ici

_Mis à jour le 2026-10-30, plan de Turingrad validé ; pas de PR : chantier 100 % doc._

- **État** : casting, gouverneurs et Palotins versés au Compendium (§ XI) ; plans des sept capitales au Compendium. **Grande carte terminée** : sept villes, noms, frontières, cartouche et encart de la Réunion (bas-droite). **Fond de la grande carte FIGÉ** : `carte/fond-carte-hd.webp` (4356×3904, WebP q92 ; PNG maître de 32 Mo chez David, `~/Downloads/fond-carte-hd-2026-10-29.png`, hors dépôt). Chaîne : Nano Banana (style carte de conte / carte marine, référence `carte/plan-reference-ia.png`) → retouches une à une (`carte/fond-retouche-2026-10-29.jpeg`, 1089×976) → Upscayl ×4, modèle High Fidelity (Digital Art durcit les traits en BD, Standard floute). Pas de clairière à Sinusborg (sa vignette couvrira le delta). Leçon : chaque retouche Nano Banana dégrade l'image ; nouvelle conversation, une retouche par demande.
- **Prochaine action** : **Turingrad**, plan schématique VALIDÉ (2026-10-30) : `villes/turingrad/plan-schematique.py` ; référence sans texte `plan-reference-ia.png` copiée dans `~/Downloads/turingrad-plan-reference-ia.png` ; prompt dans la section « Cartes des capitales ». David lance Nano Banana → image de la ville à valider → surcouche `carte-turingrad.py` (modèle : `villes/sandomir/carte-sandomir.py`) → rendu WebP. Rendu SVG → PNG par `chrome-headless-shell` de Playwright, puis `magick -quality 92` → WebP. **Sandomir terminée** (`villes/sandomir/carte-sandomir.svg` + `.webp`).
- **En attente de David** : l'image de Turingrad tirée par Nano Banana.
- **Pièges en cours** : **fichiers pour l'IA copiés dans `~/Downloads`** ; une retouche Nano Banana redessine toute l'image (couleurs, netteté) : corriger à la main sur l'original (`effacer-ponts.sh`, `coller-arene.sh`) ; image de style en 2e pièce jointe = copiée telle quelle, ne pas la joindre. **pas de formes géométriques plaquées sur le paysage** (David, 2026-10-29) : la discipline de chaque province ne se montre que dans sa ville. Ubu sans chapeau pointu ni longue robe blanche ; joindre l'image d'Ubu comme référence à chaque nouveau personnage ; noms de couleurs en anglais courant ; références sans texte ; jamais de personne réelle nommée. Le Lexique décrit encore Turingrad « brutaliste soviétique » : ne pas y toucher sans demande.
- **Worktree / branche** : aucun, commits doc directs sur `main`.

## Décisions de David

- 2026-10-29 — **Cartes des capitales, méthode** : celle de la grande carte (plan schématique SVG validé → référence sans texte pour Nano Banana, même style de carte de conte → noms des lieux en vrai texte SVG, un `id` par lieu, cliquables sur le site). On commence par Sandomir. Sandomir : **deux tours de spirale** (lisible sur téléphone ; Nano Banana compte mal), lac au nord-ouest (comme la vignette), lieux dans l'ordre du Compendium, espacés régulièrement ; **Gare** à l'est, hors des douves (rails venus du Glitchistan, ne franchissent pas les douves), versée au Compendium. Fichiers : `docs/Chiphres/illustrations/villes/sandomir/` (`plan-schematique.py`, `--reference-ia`).
- 2026-10-29 — **Carte, encart de la Réunion** validé : en bas à droite, « Empire du Czar » remonté dans la plaine de neige (3960, 2000) ; taille voisine du cartouche (la 1re version, moitié du cartouche, jugée trop petite) ; île détaillée (volcan, savane et lagon à l'ouest, forêt à l'est, observatoire, port aux six drapeaux).
- 2026-10-29 — **Carte, plan schématique validé** (`docs/Chiphres/illustrations/carte/`) : contour de la Pologne réelle ; Sandomir à Varsovie ; Yoyolande N (Sinusborg = Gdańsk), Bedonstan NE, Glitchistan E, Patatovie S (Cracovenn = Cracovie), Nombrilie SO, Pifométrie O ; frontières irrégulières ; Vistule par le sud, à travers les six provinces, jusqu'à Sinusborg, sans passer par Sandomir ; bleu de mer = bleu de Pile éclairci ; plus de flèche de l'ordre digestif. Versé au Compendium (§ II « Carte du Royaume », Vistule).
- 2026-10-29 — **Carte, style** : celui des cartes de conte à l'ancienne, façon vieille carte marine (référence : Bernard Sleigh, _An Anciente Mappe of Fairyland_, 1918, domaine public), plutôt que l'affiche Steinlen des personnages ; David aime aussi la carte des mondes lunaires de la BD _De cape et de crocs_ (à décrire par ses traits dans les prompts, jamais nommée). Outil : Nano Banana, avec `plan-schematique-sans-texte.png` en référence. Couleurs du plan mises d'accord avec le Compendium. Premier essai (2026-10-29) apprécié dans l'ensemble ; corrigé ensuite : pas de couleur par province (paysage naturel, transitions douces), terres voisines grises (la mer s'étendait à l'ouest), Vistule sinueuse, frontière Lithuanie / Czar irrégulière, clairières visibles pour les capitales ; référence `plan-reference-ia.png`.
- 2026-10-28 — **Pile** : rêveur philosophe, un brin roublard (comme dans l'appli) ; rôle : « pourquoi ça marche ? » ; « fourbe, opportuniste » et « trades douteux » abandonnés.
- 2026-10-28 — **Quatrezoneilles** : valet de pied 1890 cérémonieux et obséquieux, qui entend tout ; rôle : « relis bien l'énoncé ! » (le mot sauté, la donnée oubliée) ; échos et rumeurs du Shtam ; pas de quatre oreilles dessinées (cornets acoustiques refusés) : deux grandes oreilles décollées, toujours dressées, le nom reste un jeu de mots ; couleur d'identité or phynance `#F3C025`.
- 2026-10-28 — **Mousched-Gogh** : l'artiste de la bande (« Gogh » évoque le peintre, jamais cité ni dessiné), exalté et distrait, voit des formes partout ; rôle : pousse l'élève à faire une figure, un schéma, un tableau ; illustrateur du Shtam ; couleur d'identité glace du Czar `#66AACC`.
- 2026-10-28 — **Palotins** : version Steinlen en plus pour le lore ; les SVG de l'appli restent tels quels ; captures de référence dans `docs/Chiphres/illustrations/personnages/palotins-appli/`.

- 2026-10-25 — **Style** : celui des Mathoux (`docs/systeme/mathoux.md` § Les dessins, direction AB3), c'est-à-dire l'affiche lithographiée de Steinlen (1896, domaine public). Pas d'image d'Épinal.
- 2026-10-25 — **Pas de halo partout** : réservé, au plus, aux portraits au format carte.
- 2026-10-25 — **Palette Chat Noir abandonnée pour les illustrations** (le Compendium § XI la réserve aux écrans culturels) ; palette du Royaume à 7 couleurs, par image une base de 4 (encre, parchemin, vert, or) + 1 ou 2 accents.
- 2026-10-25 — **Glitchistan entièrement steampunk victorien** (Compendium mis à jour).
- 2026-10-26 — **Deux versions du nuancier, chacune son usage** : _imprimerie_ pour les objets imprimés du Royaume (grande carte, Shtam, Almanach, Édits Royaux et Sceau Secret, diplômes et certificats, affiches d'événements) ; _numérique_ (palette du Compendium § XI) pour tout ce qui vit dans l'interface (personnages qui parlent à l'élève, icônes, vignettes, bannières, lieux en pleine page, cartes à collectionner).
- 2026-10-26 — **Mathoux et Palotins gardent leurs couleurs** : le nuancier vaut pour les nouvelles illustrations. Les Palotins (`static/images/buddies/`) sont déjà de la famille (encre `#16181F`, papier `#F6E9D2`, or `#F2B83B`, pourpre `#8E2C4F`, vert `#2E8B57`) avec deux couleurs d'identité en plus (orange `#E0612F`, bleu de Pile `#2F62B0`).
- 2026-10-26 — **Outil** : Nano Banana testé, résultat apprécié ; prompts de Père Ubu (sans moustache, sans chapeau, couronne, crâne légèrement en poire, pourpoint blanc, cape verte à dorures, sceptre d'or, chaussures pourpres) et de Mère Ubu (ronde en sablier corseté, robe à tournure pourpre) validés, au Compendium § XI.
- ⚠️ La palette du Compendium § XI n'est PAS celle de l'interface du site (`src/app.css` : orange `#fc8f1b`, ambre `#ffa000`…) ; David a choisi la palette du Compendium pour les illustrations, en connaissance de cause.

## Le nuancier

| Couleur        | Numérique | Nom pour l'IA        | Imprimerie | Nom pour l'IA      |
| -------------- | --------- | -------------------- | ---------- | ------------------ |
| Encre          | `#1B2232` | navy ink             | `#292E38`  | soft ink black     |
| Polonais pâle  | `#F1EDE4` | cream parchment      | `#F3EBD9`  | warm cream paper   |
| Vert chandelle | `#1F9346` | emerald green        | `#2C7F49`  | muted bottle green |
| Or phynance    | `#F3C025` | marigold yellow      | `#DEAB31`  | mustard yellow     |
| Pourpre royal  | `#8F2447` | deep crimson         | `#8C3147`  | faded crimson      |
| Brun merdre    | `#593B26` | dark chocolate brown | `#61442D`  | sepia brown        |
| Glace du Czar  | `#66AACC` | ice blue             | `#739EAF`  | dusty ice blue     |

Imprimerie = saturation réduite puis mélange à 50 % avec le papier `#F3EBD9`. Fichiers et scripts : `docs/Chiphres/illustrations/nuancier/` (`nuanciers.py`, `demo.py` ; rendu SVG → PNG par le Chromium de Playwright, `magick` ne trouve pas les polices).

Démo (`demo-palettes.png`) : il manque un bleu de mer pour la carte ; six provinces imposent des teintes éclaircies (trames d'imprimeur), ce qui fonctionne.

## Choix de l'outil (recommandation, à confirmer par le test)

Midjourney V8 pour fixer le style (lieux, objets), Nano Banana 2 pour les personnages récurrents et les retouches. Test : Père Ubu en pied, port de Sinusborg, gidouille de bronze d'Empoche-les-Bains, puis Ubu au banquet avec l'image d'Ubu en référence, et un Mathou (capture) en référence de style.

Bloc de style (palette du Royaume, version numérique ; adapter les noms pour l'imprimerie) :

```
style: 1896 Montmartre lithographic poster in the manner of Théophile-Alexandre Steinlen, bold black contours, flat color areas, limited palette: navy ink, cream parchment, emerald green, marigold yellow, with deep crimson accents, no text
```

## À préciser dans le lore avant de générer

- ~~**Carte**~~ : tranché le 2026-10-29 (plan schématique validé).
- **Personnages** : fiches visuelles (silhouette, costume, couleurs, accessoire) pour le casting, les gouverneurs (Achras, Faustroll, Bosse-de-Nage, Cheval à Phynances) et les Palotins.
- **Patatovie** : trait anatomique encore en TODO dans le Compendium.

## Méthode prévue pour la carte

Plan schématique SVG validé par David → fond par l'IA sans texte, guidé par le plan → vignettes de villes générées une à une → décor (cartouche, rose des vents, encart) → noms en SVG posés à la main (orthographe sûre, carte cliquable sur le site).

**Vignettes des villes** (validé par David, 2026-10-29) : carré de 768 px découpé dans `fond-carte-hd.webp` autour de chaque clairière (coins dans `carte/vignettes/recoller.sh`) → Nano Banana, nouvelle conversation par ville, le carré seul en pièce jointe, « draw a small town in the pale round clearing… keep everything outside exactly as it is » → image rangée sous `vignettes/<ville>-ia.webp` → `bash vignettes/recoller.sh` recolle tout sur le fond (masque = différence avec le carré d’origine) et produit `carte-villes-hd.webp`. Empoche-les-Bains : 1er essai retenu, l’IA n’a rien bougé hors de la ville. Sandomir : 2e essai retenu (le 1er redessinait tout le carré et agrandissait la ville) ; réserves acceptées par David : les rails franchissent les douves, anneaux plus que spirale. Turingrad : la Vistule ne traverse pas la ville (canal à écluses), gardé. Lobatchevsk : 2e essai, dodécaèdre juste mais enceinte à 8 tours (Nano Banana ne compte pas), gardé. Cracovenn : 1er essai, trois enceintes et Vistule à travers. Bonneteau : 1er essai, maisons sur la rive est seulement, gardé. Sinusborg (carré redescendu sur le delta, y = 400) : 1er essai, toits droits (pas de sinusoïdes), gardé. ⚠️ `recoller.sh` colle sur la carte EN COURS (les carrés de Sandomir et Turingrad se chevauchent).

**Encart de la Réunion** (2026-10-29) : carré de 1024 px au coin bas-droit (3262, 2816) → Nano Banana dessine le cadre seul (référence : le cartouche), intérieur bleu uni ; l'île est demandée à part, en grand (référence de style : le haut de la carte, Baltique et côte), car dessinée directement dans le cadre elle sortait pauvre en détail. Nano Banana ne suit pas les proportions demandées (cadre « de 15 à 97 % » rendu à 60 %) : cadre agrandi ×1,5 à la main (ancré bas-droite), île collée à pleine résolution dans le masque de l'intérieur (remplissage depuis le centre), le tout posé dans le carré → `vignettes/reunion-ia.webp`, recollé par `recoller.sh` (côté du carré en 4e champ). Île seule : `vignettes/reunion-ile-ia.webp`.

**Surcouche** (2026-10-29) : un seul `carte-royaume.svg` qui intègre `carte-villes-hd.webp` (`<image>`, chemin relatif) et pose par-dessus, en coordonnées du fond, les frontières des provinces (choix de David : frontières, pas le contour) et les noms. Frontières relevées sur les pointillés peints par l'IA, pas reprises du plan schématique (l'IA a déplacé le tracé de 20 à 60 px) ; laissées transparentes (David : les pointillés peints suffisent), elles ne servent que de cibles sur le site. Cartouche : « Royaume de Pologne » seul. Noms recalés puis **validés par David le 2026-10-29** (Lithuanie sans sous-titre ; « Empire du Czar » = nom du Compendium). Chaque frontière, province et ville a un `id` (`frontiere-…`, `province-…`, `ville-…`) pour la rendre cliquable sur le site. Police Georgia (pas de police web dans le SVG).

## Cartes des capitales

**Sandomir** : plan validé par David (2026-10-29). Prompt Nano Banana (nouvelle conversation, `villes/sandomir/plan-reference-ia.png` seul en pièce jointe) :

```
Redraw the attached plan as a hand-drawn bird's-eye map of an imaginary capital city, keeping every element exactly where it is, with the same shapes and proportions. Square format.
Layout to keep: a round moat fed by a small canal from the lake in the top-left corner; a single drawbridge at the bottom, the only way into the city; one single street that spirals inward in exactly two turns, from the drawbridge to the round palace in the center, lined on both sides with tightly packed little houses; outside the moat, a ring road with six straight country roads leaving toward the edges; at the top right, just outside the ring road, a small steam railway station, its rails leaving to the right edge (the rails never cross the moat).
Places along the street, where the houses open onto small squares: a market square with green-canopied stalls (left), U-shaped barracks around a courtyard (upper right), a small round arena (lower right), a long printing house with a chimney (inner left), a library with a colonnade (inner top).
Center: a round, pot-bellied palace with a big golden dome topped by a golden spiral, green banners all around. Gaudy, over-the-top luxury: lots of gold, green banners, deliberately in bad taste. No statues, no onion domes.
Style: an antique storybook map, like an early 20th-century fairy-tale map or an old sea chart: fine ink outlines, soft watercolor washes on aged cream parchment, meadows in soft greens around the city. Colors: navy ink, cream parchment, emerald green, marigold yellow, soft blue water.
No text, no labels, no letters, no compass rose, no frame, no border.
```

Essais Sandomir (2026-10-29) : avec la 1re proposition en 2e pièce jointe (référence de style), Nano Banana l'a recopiée telle quelle (deux arènes, palais en tour) et n'a enrichi que la campagne → **plan seul** en pièce jointe. Prompt retenu : celui ci-dessus, enrichi (une seule arène, palais « single plump round body (not a tiered tower) », rue « continuous pale cobbled lane », maisons toutes différentes « drawn in slight perspective », campagne détaillée). Résultat gardé : `villes/sandomir/carte-ia-original.jpeg`. Défauts : deux ponts en trop (nord, nord-est), arène réduite à un disque de sable. La retouche Nano Banana des ponts a redessiné toute l'image (douves turquoise, traits mous) : ponts effacés à la main sur l'original par `effacer-ponts.sh` (eau des douves recopiée 25° plus loin, les douves étant un cercle) → `carte-ia-sans-ponts.png`.
Arène : retouche Nano Banana (`arene-ia.jpeg`) très belle mais trop grosse, elle coupait la rue ; seule l'arène est gardée, réduite au plus grand rayon qui tient entre les deux tours de rue (42 px, demandé par David) et collée par `coller-arene.sh` → **`villes/sandomir/carte-ia.png`** (image de la ville, à faire valider par David).
Route circulaire (oubliée par Nano Banana, les six routes butaient sur l'eau) : la retouche « add a ring road » (`route-ia.jpeg`) l'a mise à la place des douves, Pont-Levis et canal par-dessus. On n'en garde que la route, agrandie ×1,08 autour du centre pour tomber hors de nos douves ; Pont-Levis qui s'arrête au bord de la route ; petit pont du canal déplacé sur la route → `ajouter-route.sh` → **`villes/sandomir/carte-ville.png`** (à faire valider par David).
Route, 2e essai : ma greffe (`ajouter-route.sh`) refusée par David. Nouvelle retouche Nano Banana sur `carte-ia.png`, prompt précis (route sur l'herbe hors de la berge, douves intactes, Pont-Levis qui s'arrête à la route, petit pont de pierre sur le canal) → `carte-route-ia.jpeg`, gardée telle quelle (douves un peu rétrécies, acceptées) sauf le Pont-Levis qui enjambait encore la route : raccourci par `raccourcir-pont-levis.sh` → **`carte-ville.png`** (remplace la version de `ajouter-route.sh`).

**Sandomir : image VALIDÉE par David (2026-10-30)** : `villes/sandomir/carte-ville.png`. `ajouter-route.sh` et `route-ia.jpeg` restent pour mémoire (greffe refusée).

**Sandomir : carte VALIDÉE par David (2026-10-30)** : `villes/sandomir/carte-sandomir.py` → `carte-sandomir.svg` (fond `carte-ville.png`, noms en Georgia gras italique à halo papier, un groupe `lieu-<id>` par lieu avec une ellipse invisible = cible de clic) et rendu `carte-sandomir.webp` (1024×1024, q92). Noms courts sur la carte (« La Caserne »…), nom complet du Compendium en `<title>` (info-bulle), pour rester lisible sur téléphone. Lieux identifiés d'après la référence : marché = étals verts à l'ouest, caserne = bâtiment en U au nord-est, gazette = bâtiment à cheminée, bibliothèque = temple à colonnes. Le bâtiment gris en L dessiné par l'IA entre la bibliothèque et la caserne n'a pas de nom.

**Turingrad : plan schématique VALIDÉ par David (2026-10-30)** : `villes/turingrad/plan-schematique.py` (`--reference-ia` → `plan-reference-ia.png`). Choix proposés et acceptés : le canal **contourne la place par l'est** ; le plan suit le Compendium (ville coupée du nord au sud) et **non la vignette** de la grande carte (ville à l'ouest du fleuve, écluses dehors) ; **pas d'enceinte**, la ville se fond dans les prés. Gare au sud, rive ouest, rails venus de l'ouest (Sandomir). Prompt Nano Banana (nouvelle conversation, `plan-reference-ia.png` seul en pièce jointe) :

```
Redraw the attached plan as a hand-drawn bird's-eye map of an imaginary Victorian steampunk capital city, keeping every element exactly where it is, with the same shapes and proportions. Square format.
Layout to keep: a river comes in from the bottom edge, becomes a straight stone-lined canal through the whole city from south to north, bends around the east side of the big round central square, and leaves by the top edge as a natural winding river. Five small iron bridges cross the canal. A grid of straight streets on both banks, a ring street around the central square, rows of tightly packed red-brick houses, every house slightly different, drawn in slight perspective. No city wall: the city fades into green meadows.
Places to keep: in the center, a big round cobbled square with a giant brass and cast-iron machine reading an endless punched paper tape that loops across the square, and a small brick bell tower with a golden bell. West bank (upper left): factories with tall smoking chimneys and a long glass-roofed iron hall. East bank (right): three long weaving workshops with saw-tooth roofs, and a small brass mechanical snake on the street below them. North: a round brass pneumatic-tube station with a brick archive building next to it; thin brass tubes run from it over the rooftops to every district. South of the square, on the canal: a flight of three locks, and a big black coal heap on the east quay. South-west: a red-brick railway station with a clock, its steam railway leaving toward the left edge.
Style: an antique storybook map, like an early 20th-century fairy-tale map or an old sea chart: fine ink outlines, soft watercolor washes on aged cream parchment, a few puffs of white steam above the chimneys. Colors: navy ink, cream parchment, brick red, soot black, brass gold, soft blue water, meadows in soft greens.
No text, no labels, no letters, no numbers, no compass rose, no frame, no border.
```
