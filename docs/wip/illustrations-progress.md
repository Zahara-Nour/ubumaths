# Chantier `illustrations` — mise en images du lore

## Reprendre ici

_Mis à jour le 2026-10-28, après le prompt de Mousched-Gogh (pas de PR : chantier 100 % doc pour l'instant)._

- **État** : style, nuanciers et règle d'usage fixés ; test Nano Banana concluant ; **prompts de référence de Père Ubu, Mère Ubu, du Capitaine Bordure, de Bougrelas, de Conscience, du Czar Alexis, de Monsieur Prudhomme, du Flegmatique (Tristan Bernard), du Professeur Achras, du Docteur Faustroll, de Bosse-de-Nage et du Cheval à Phynances validés (casting et quatre gouverneurs complets) ; Palotins redessinés au trait Steinlen pour le lore (SVG de l'appli inchangés) : Giron, Pile, Cotice, Merdranpo (sans SVG, brun merdre, casserole, bas dépareillés) et Mousched-Gogh (sans SVG, artiste, glace du Czar, mouche sur le nez) validés et versés au Compendium** (§ XI « Illustrations », fiches § III mises à jour).
- **Prochaine action** : **Quatrezoneilles**, dernier Palotin : caractère et rôle validés le 2026-10-28 ; prompt proposé, pas encore validé. Ranger les images obtenues dans `docs/Chiphres/illustrations/personnages/` quand David les fournit.
- **En attente de David** : les quinze images de référence · caractère de Pile : « fourbe » (Compendium) ou « rêveur philosophe » (`buddy-palotins.md`) ? · bleu de mer (proposé : bleu de Pile `#2F62B0`) · géographie (position des six provinces).
- **Pièges en cours** : Ubu sans chapeau pointu ni longue robe blanche (aucune ressemblance avec une cagoule) ; joindre l'image d'Ubu comme référence à chaque nouveau personnage ; noms de couleurs en anglais courant ; références sans texte ; jamais de personne réelle nommée (Nano Banana refuse : personnage inventé à la place). Le Lexique décrit encore Turingrad « brutaliste soviétique » : ne pas y toucher sans demande.
- **Worktree / branche** : aucun, commits doc directs sur `main`.

## Décisions de David

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

- **Carte** : position des six provinces (seuls indices : Sandomir au point de jonction, Sinusborg port, Bedonstan et Glitchistan à l'est) ; cours de la Vistule (« traverse toutes » contre trois provinces ; « d'est en ouest » mais se jette dans la Baltique) ; Empire du Czar, Lithuanie, Pythagoriades ; Isle de la Réunion en encart ?
- **Personnages** : fiches visuelles (silhouette, costume, couleurs, accessoire) pour le casting, les gouverneurs (Achras, Faustroll, Bosse-de-Nage, Cheval à Phynances) et les Palotins.
- **Patatovie** : trait anatomique encore en TODO dans le Compendium.

## Méthode prévue pour la carte

Plan schématique SVG validé par David → fond par l'IA sans texte, guidé par le plan → vignettes de villes générées une à une → décor (cartouche, rose des vents, encart) → noms en SVG posés à la main (orthographe sûre, carte cliquable sur le site).
