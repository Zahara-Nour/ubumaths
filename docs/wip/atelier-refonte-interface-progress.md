# Atelier — refonte de l'interface : journal

Phase 0 : `docs/wip/atelier-refonte-interface-phase0.md` (validée par David le 2026-10-18, deux passes).

## Lot 1 — barre d'icônes, Enregistrer / Charger

Branche `feat/atelier-barre-icones`.

- [x] Module pur `atelier-file.ts` : fichier `.atelier.json` = état complet (`persistence.ts`) + historique de la console ; relecture bornée et validée (Zod), ancien JSON « pour rejouer » accepté. Tests : `atelier-fichier.test.ts`.
- [x] Barre d'icônes : Repartir de zéro, Charger, Enregistrer à gauche ; Partager, Réglages à droite. Icônes seules, infobulle (`title`, comme la mise en forme du tableur) et `aria-label`. Pas d'Annuler / Rétablir (lot 5). Tests : `barre-icones.svelte.test.ts` (11 rouges sur l'ancien conteneur).
- [x] Barre « Exporter l'historique » retirée de la vue Calcul ; l'export ubumark reste, en lien discret (le lot 2 le range dans le menu de la console).
- [x] Doc système (`docs/systeme/atelier.md`), vérification manuelle notée.

Choix faits en codant (à signaler à David) :

- Charger est absent d'un atelier reçu par lien, comme Repartir de zéro : on y regarde l'atelier d'un autre. Enregistrer y reste.
- Un fichier refusé se dit dans la zone des avis de l'atelier (lue à voix haute), pas dans un toast qui disparaît.

## Lot 2 — console déroulante

Branche `feat/atelier-console-deroulante`, partie d'origin/main après #1482 (onglet Géométrie).

- [x] `console-key.ts` (module pur) : touche sous Échap par `event.code` (Mac : `IntlBackslash` ou `Backquote` ; ailleurs `Backquote`), sans effet dans un champ ; Ctrl+Entrée partout (pas Cmd, pas avec Maj / Alt). Tests : `console-key.test.ts` (13, rouges d'abord).
- [x] Plus d'onglet Calcul : Graphe · Géométrie · Données. Volet « Console » par-dessus la vue (région nommée, non modale, `inert` fermée, montée en permanence), ~40 %, poignée (souris + flèches), toute la scène sous 640 px. Bouton « Console » dans la barre (groupe de droite, avant Partager), `aria-expanded`, infobulle avec les deux raccourcis, compteur A3. Tests : `console-deroulante.svelte.test.ts` (14, rouges d'abord).
- [x] Lisibilité : invite `>` (hors du paragraphe de la saisie, qui décrit les étapes), `-->` devant la réponse (`aria-hidden`), commande en texte en chasse fixe, « f est correctement défini » avec le nom en couleur (`definedName`, `desk.svelte.ts`), boutons de ligne au survol / focus / toujours au toucher. Couleur d'accent : `#b25f00` en clair (4,6:1), `#ffc400` en sombre — pas `--color-primary` (2,3:1).
- [x] Export ubumark dans le menu « ⋮ » de la console (copier ou télécharger) ; le lien sous l'historique est retiré.
- [x] `FigureView` : « Dans la console, écris… ».

Règles de bascule relues (toutes dans `AtelierContainer.svelte`) :

| Règle                                                           | Avant                                    | Après                                                                                                 |
| --------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Vue de départ                                                   | Calcul                                   | Graphe ; console ouverte sauf vue demandée (`/grapheur` : fermée) ; prop `consoleAtStart` pour forcer |
| G7 : une action écrit sa ligne                                  | dans Calcul, sans y aller                | dans la console, sans l'ouvrir                                                                        |
| A3 : repère d'un résultat qui attend                            | nombre sur l'onglet Calcul               | nombre sur le bouton Console ; `seen` mis à jour à l'ouverture et à la fermeture                      |
| Annonce d'une ligne hors de vue                                 | « Nouvelle ligne dans l'onglet Calcul. » | « Nouvelle ligne dans la console. » (console fermée seulement)                                        |
| Commande préparée (`needs-argument`)                            | bascule sur Calcul                       | ouvre la console, focus au champ                                                                      |
| A5 : Tracer, nuage, diagramme, Tabuler, Afficher dans Géométrie | change de vue                            | change de vue (`revealView`) ; sous 640 px, referme aussi la console qui couvrirait tout              |
| Échap                                                           | —                                        | dans la console : la ferme (une liste de propositions ouverte le garde pour elle)                     |

Choix faits en codant (à signaler à David) :

- Le bouton Console est dans le groupe de DROITE (Console, Partager, Réglages) : ce n'est pas une action sur le fichier.
- Les tests qui cliquaient l'onglet Calcul ouvrent maintenant la console (ou lisent son historique, monté en permanence) ; ceux qui voulaient « sur le Graphe, console fermée » montent l'atelier avec `view: 'graphe'`.

## Lot 3 — cartes de fonction

Branche `feat/atelier-cartes-fonction`.

- [x] `FunctionCard.svelte` : une ligne `● f(x) = [champ]` + œil + menu « Options de f » ; plus de vue développée ni de libellé de type. `ObjectCard` lui confie les fonctions (code de l'image, de Tabuler et de « Sur le graphique » retiré d'`ObjectCard`).
- [x] `DefinitionField` : `commit="validate"` (Entrée / sortie du champ, valeur lue sur l'élément ; saisie illisible refusée, erreur reliée au champ ; Échap rétablit), `showPrefix`, `autofocus`.
- [x] `CurveStylePopover.svelte` : couleur, épaisseur, style en une fenêtre ; « Tracer f » si jamais tracée.
- [x] Menu : Affichage (Tangente, Aire — `curve-toggles.ts`, partagé avec `CurveSettings`) ; Actions (`actionsFor`, raisons écrites, `data-indisponible`). `CurveSettings compact` sous la ligne quand tangente ou aire sont allumées.
- [x] Action `image` (« Image d'un nombre ») : `f(` préparé dans la console (`needs-argument`). Tabuler : fenêtre `Dialog`.
- [x] `f′` / `f⁻¹` : formule non éditable, icône `Link2` (infobulle + note au toucher).
- [x] Tests : `carte-fonction.svelte.test.ts` (12 rouges d'abord), `image-console.test.ts` (4 rouges d'abord) ; 15 fichiers de tests adaptés (harnais commun `harness/function-card.ts`). 417 tests client de l'atelier, 4509 serveur verts.

Ce qui dépendait de `selected` (relu) :

- `ObjectPanel` : ouvrir / refermer une carte au clic sur l'en-tête — reste pour les objets autres que les fonctions.
- `AtelierContainer` : sélection après « + Fonction », après une seconde « Dériver » (L1 : la carte `f′` existante), désélection après suppression — gardées ; pour une fonction, `selected` ne fait plus que la mettre en évidence et donner le focus au champ d'une carte neuve (C9).

Choix faits en codant (à signaler à David) :

- L'œil reste sur la ligne ET « Tracer / Retirer du graphe » reste dans le menu (l'action change de vue vers le Graphe, l'œil non — comme avant).
- Tangente et Aire sont dans le menu ; le cercle osculateur et la longueur restent des cases sous la ligne, dans le bloc de la tangente ou de l'aire (ils n'ont de sens qu'avec eux).
- « Image d'un nombre » remplace le brouillon de la console par `f(` (comme « Simuler » ou « Tableau croisé ») : le test « ne touche pas à ce que l'élève tapait dans Calcul » est retiré.
- Une action indisponible du menu n'est pas `aria-disabled` (bits-ui le pose lui-même d'après `disabled`) : sa raison est dans le nom de l'élément, le choisir ne fait rien.

## Lot 3 bis — lecture graphique de l'image

Branche `feat/atelier-lecture-graphique` (choix c de David + réglages recommandés, 2026-10-18).

- [x] Réglage de courbe `showReading` (`display.ts`, compact, ancien état relu sans lui : pas de nouvelle `ATELIER_STATE_VERSION`) ; « Lecture graphique » dans le menu Affichage de `FunctionCard` (indisponible courbe non tracée).
- [x] Console : `reading.ts` (`readingCallOf` par le parseur de l'atelier, `consoleReadings` : 3 dernières par courbe, 100 dernières lignes relues) ; `syncPlots(atelier, graph, readings)` pose `reading` sur la courbe ; l'effet d'`AtelierContainer` suit aussi `desk.entries`.
- [x] Grapheur : `ExplicitFunction.reading` (jamais sauvegardé) + clé dans `updateFunction` ; `image-reading.ts` (pur) ; couches `ImageReadings` (SVG) et `ReadingSliders` (curseur ARIA HTML hors de `role="img"`, cadre `.graph-frame` dans `GraphSVG`).
- [x] Tests : `lecture-graphique.test.ts` (8), `lecture-graphique-reglage.test.ts` (10, 6 rouges d'abord), `image-reading.test.ts` (15), `grapheur/…/lecture-graphique.svelte.test.ts` (5), `atelier/…/lecture-graphique.svelte.test.ts` (5 ; sans le branchement console, 2 rouges — mesuré).

Choix faits en codant (à signaler à David) :

- Le point glissant n'est pas rangé : rechargé, il revient au milieu de la fenêtre (comme le zoom). Tant qu'il n'a pas été déplacé, il suit le milieu de la fenêtre.
- Plusieurs courbes lues : un point glissant chacune, posés au même endroit au départ.
- `aria-label` fixe (« Lecture graphique de f »), la phrase « Lecture de f en x = 2 : f(2) = 4 » en `aria-valuetext` (lue à chaque flèche) et annoncée au relâchement d'un glissé.
- `pi` tapé en lettres dans la console n'est pas relu comme π par la lecture (le parseur en mode texte y voit `p·i`) : `f(π)` se lit, `f(pi)` non.

## Lot 4a — cartes d'une valeur, d'une suite, d'une liste

Branche `feat/atelier-cartes-valeur-suite-liste` (recommandations validées par David le 2026-10-18, « je suis tes recos »). Points et courbes : lot 4b, après #1500 (session atelier-geometry).

- [x] `ValueCard.svelte` : `a = [champ]` (Entrée / sortie du champ), menu ; curseur sous la ligne d'un paramètre (`Atelier.dependents`), caché sinon, affichable par « Affichage → Curseur » ; bornes et pas dans une fenêtre (`SliderSettings.svelte`, séparé de `ValueSlider.svelte`).
- [x] `SequenceCard.svelte` : point de couleur (`CurveStylePopover` généralisé aux suites), `u(n) =` / `u(n+1) =`, œil, menu Affichage (Nuage / Escalier), Définition (Explicite / Récurrence), Actions ; premier terme et rang sous la ligne, marches sous la ligne quand l'escalier est tracé. `SequenceSettings.svelte` et son test retirés, leurs cas repris.
- [x] `ListCard.svelte` : aperçu `{3 ; 5 ; 8 ; …}` (12 valeurs) non éditable (`list-preview.ts`, `listEntriesOf` partagé avec `studentDefinitionOf`), « Modifier dans Données » (action `data` du conteneur), sous-menu « Avec une autre liste » (un groupe par partenaire), Renommer / Supprimer en fin.
- [x] `CardActionItems.svelte` (actions de menu, aussi utilisé par `FunctionCard`) et `UnavailableItem.svelte` (réglage indisponible).
- [x] Tests : `cartes-valeur-suite-liste.svelte.test.ts` (28 + 1, les 27 premiers rouges d'abord : 27/27), `list-preview.test.ts` (7) ; adaptés : `ObjectCard`, `ObjectPanel`, `ValueSlider`, `DataView`, `CalculView`, `reglages`, `brouillon-garde`, `actions-sans-bascule`, `intervalle-champ`, `liste-dans-calcul`.

Choix faits en codant (à signaler à David) :

- **Curseur : la règle lit `object.slider`** (précision de la coordination, 2026-10-18) — aucun critère sur la forme de la définition, aucun nouveau drapeau ; le modèle omettra `slider` pour les mesures de la géométrie. Gardée, d'avant ce lot : une valeur CALCULÉE (`b + 1`) n'a pas de curseur. Le curseur affiché depuis le menu pour une valeur non paramètre était un état de la carte, non rangé — **retenu depuis le lot 4b** (décision de David).
- Une valeur se range maintenant à Entrée ou à la sortie du champ (plus 0,3 s après la frappe), comme une fonction.
- Une liste de mots compte ses valeurs ET ses modalités : « (5 valeurs, 3 modalités) » ; une colonne de formules ajoute « calculée dans la grille ».
- Une suite explicite montre son premier rang sous la ligne (« à partir du rang [0] ») : il compte pour ses termes.
- Le mode (explicite / récurrence) est dans le menu, groupe « Définition » (il était une liste déroulante de la carte).
- Le choix de la partenaire (Q46) n'est plus sur la carte : chaque partenaire a son groupe dans le sous-menu ; la partenaire choisie reste retenue (`choosePartner`), pour Q48.
- Tableau croisé et Simuler partent une fois le menu fermé et retiré (`onOpenChangeComplete`) : lancés avant, le champ mathématique de la console n'obtenait pas le focus (mesuré).

## Lot 4b — cartes d'un point et d'une courbe (+ suivi de la revue de #1501)

Branche `feat/atelier-cartes-point-courbe`, partie d'origin/main après #1500 (constructions) et #1501 (lot 4a).

- [x] `FigureCard.svelte` (une carte pour les deux, ils ne diffèrent que par la fenêtre du point de couleur et l'étiquette) : ligne `● A = [champ]` / `● d : [champ]` / `● d = [(AB)]`, champ `commit="validate"` (il était rangé 0,3 s après la frappe), nature en étiquette, construction en gris (contenu de #1500 repris tel quel), lien « se construit à partir de A et B », état. `ObjectCard` ne garde que l'aiguillage ; `ObjectPanel` ne passe plus `onSelect` aux cartes (plus de vue à replier).
- [x] `FigureStylePopover.svelte` : couleur + taille (point), couleur + épaisseur + style (courbe) ; Affichage → Étiquette (point).
- [x] Champ d'un point : coordonnées en LaTeX (`fieldLatexOf`), relisibles.
- [x] Suivi de la revue de #1501 (commit à part) : escalier impossible → nuage (`#dropImpossibleCobweb`, après `setSequence` et `update`) ; état « à compléter » / « en attente » rétabli sur les cartes valeur, suite, liste (`stateLabelOf`, `card-state.ts`) ; `choosePartner` / `partnerChoiceOf` retirés (écrits, jamais lus ; ni rangés ni rejoués) ; tests : zone sélectionnée par « Modifier dans Données », aucune action perdue avec diagramme et qualitative partenaire, « Tableau croisé » → console + focus. Rang, premier terme et marches d'une suite : rangés à Entrée / sortie du champ.
- [x] Curseur affiché depuis le menu **retenu** (décision de David du 2026-10-18) : `ValueObject.sliderShown`, `setSliderShown`, rangé seulement quand il est affiché.

**Pour la session atelier-geometry — champs à câbler dans `syncFigure`** (rien de câblé ici) :

- point : `object.display?: PointDisplay` = `{ color?: CurveColor ('curve-1' … 'curve-4', absente tant que l'élève n'a pas choisi de couleur — revue de #1504), size: 'small' | 'medium' | 'large', showLabel: boolean }` ; absent = dessin par défaut de la figure, étiquette affichée ;
- courbe : `object.display?: StrokeDisplay` = `{ color?: CurveColor, lineStyle: LineStyle, lineWidth: number }` (couleur absente = couleur de la figure, revue de #1504 ; `strokeOf` de `figure-sync.ts` demande alors un repli de couleur) ;
- modifiés par `atelier.setFigureDisplay(name, patch)` (fait avancer `revision`) ; rangés en `figureDisplay` ; **pas de nouvelle `ATELIER_STATE_VERSION`** (absents par défaut).

Choix faits en codant (à signaler à David) :

- Pas de version d'état neuve : réglage du dessin et curseur retenu sont absents quand ils valent le défaut. Contrepartie (la même que la lecture graphique) : un onglet resté sur l'ancien code les oublie.
- Une couleur choisie la première fois prend la première couleur libre de la figure ; une taille par défaut « moyenne », l'étiquette affichée.
- « Refermer une carte » (retour de David du 2026-10-04) n'a plus d'objet : plus aucune carte n'a de vue développée.

## Lots suivants

Lot 5 (annuler / rétablir) : pas commencé.
