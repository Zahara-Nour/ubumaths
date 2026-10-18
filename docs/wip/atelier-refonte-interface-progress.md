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

## Lots suivants

Lot 4 (autres objets), lot 5 (annuler / rétablir) : pas commencés.
