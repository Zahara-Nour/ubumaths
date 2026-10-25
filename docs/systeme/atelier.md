---
couvre:
  - 'src/lib/atelier/**'
  - 'src/lib/components/atelier/**'
  - src/lib/mathAST/cli/web/web-repl-engine.ts
  - 'src/routes/(public)/atelier/**'
  - 'src/routes/(public)/grapheur/**'
---

# L'atelier (et `/grapheur`)

> Synthèse des journaux archivés `docs/archive/wip/atelier-*`. Syntaxe des commandes de Calcul :
> [atelier-syntaxe.md](atelier-syntaxe.md) (cité par le code). Vérifié contre le code le 2026-10-19 (outils de construction de la géométrie, lot 3, PR 3 ; valeur exacte à afficher commune, ligne d'un calcul et `S = …` de `.résoudre`, 2026-10-24 ; relecture des virgules rangées, 2026-10-21 ; test d'égalité `a = b`, 2026-10-22 ; cartes de la figure, point de couleur, défilement de la console et noms en couleur du texte, 2026-10-23 ; panneau Propriétés, 2026-10-23 ; π au numérateur d'un périmètre, #1634, 2026-10-24 ; espaces de groupement dès 5 chiffres, 2026-10-23 ; étapes de `.résoudre` écrites comme la réponse, lot 5f-4, 2026-10-25 ; inéquations aussi, Q50, 2026-10-25 ; ouvrir dans l'atelier depuis Python, 2026-10-25).

## À quoi ça sert

L'outil de **recherche de l'élève** : l'endroit où il calcule, trace, saisit des données,
conjecture et garde ce qu'il trouve — du 6ᵉ à la terminale. Cadrage :
[atelier-recherche-eleve.md](../archive/wip/atelier-recherche-eleve.md) (intention, trois
décisions, décisions figées §9, versions v1/v2/v3).

Trois décisions de cadrage (David, 2026-09-15) :

1. **Public : l'élève**, pas le prof en préparation.
2. **Sans compte** : page publique, **rien ne quitte le navigateur** — pas de base, pas de RLS,
   pas de RGPD à gérer. La mémoire est le `localStorage` ; le partage passe par l'URL.
3. **Du collège au lycée, sans sélecteur de niveau** : la progressivité vient des actions
   attachées au _type_ de l'objet (un atelier qui ne contient que des nombres n'affiche jamais
   « Dériver »).

Et une règle de fond (décision figée n° 2) : **l'atelier ne valide pas.** Il calcule, il ne dit
jamais à l'élève si sa conjecture est juste.

Deux adresses, un seul outil :

| Route       | Fichier                                     | Ouvre                                                                        |
| ----------- | ------------------------------------------- | ---------------------------------------------------------------------------- |
| `/atelier`  | `src/routes/(public)/atelier/+page.svelte`  | l'atelier personnel, vue Graphe, console ouverte par-dessus                  |
| `/grapheur` | `src/routes/(public)/grapheur/+page.svelte` | le même atelier, vue Graphe, console fermée ; atelier vide → carte `f` prête |

L'atelier est l'**entrée unique** : la barre latérale (`src/lib/components/Sidebar.svelte`) n'a
plus d'entrée « Grapheur », `/grapheur` survit pour les favoris et les liens de projection
(décisions G1/G2 de [atelier-grapheur-phase0.md](../archive/wip/atelier-grapheur-phase0.md)).

**Vocabulaire.** [CONTEXT.md](../../CONTEXT.md) ne définit pas encore les termes de l'atelier.
Ceux du code et de l'interface :

- **objet** : un nom + une définition, de quatre types (valeur, fonction, suite, liste) ;
- **carte** : la présentation d'un objet dans « Mes objets » (`ObjectCard.svelte`). ⚠️ Rien à
  voir avec la **Carte de cours** de CONTEXT.md ni avec les cartes du SRS ;
- **vue** : Graphe, Géométrie ou Données — une _projection_ des objets, sans état propre ;
- **console** : le volet déroulant où l'on tape (l'ancienne vue Calcul, `CalculView.svelte`) ;
  dans le code et les messages, « Calcul » la désigne encore souvent ;
- **historique** : les lignes de la console (saisies et réponses) ;
- **mode éphémère** : un atelier reçu par lien, qui ne lit ni n'écrit l'atelier personnel.
- anciennes pages remplacées par l'atelier : `/calc` (calculatrice) est **retirée** depuis le
  2026-10-25 ; l'adresse mène à `/atelier` en 308, sans sa query (ses liens `?share=` n'ont pas
  d'équivalent) ; son historique (`chiphre-calc-history`) n'est pas repris.
  `/cas` (ancien REPL web) est **retirée** depuis le 2026-10-13 : l'adresse mène à `/atelier` en
  308 (`redirectHandle`, `src/lib/server/redirectHandle.ts`).

---

## Carte du code

### Modèle — `src/lib/atelier/` (65 fichiers hors tests)

| Fichier                                     | Rôle                                                                                                                                                                                                              |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/atelier/types.ts`                  | Les six types d'objets, `ObjectStatus`, `CurveDisplay`, `SequenceDisplay`, plafonds D8, gardes de type                                                                                                            |
| `src/lib/atelier/geometry.ts`               | Points et courbes (v2) : couple découpé, forme d'une équation, messages, refus d'un point cité (P9)                                                                                                               |
| `src/lib/atelier/atelier.svelte.ts`         | **La classe `Atelier`** : création, renommage, mise à jour, suppression, états, `serialize`/`restore`                                                                                                             |
| `src/lib/atelier/formula.ts`                | Les formules de la grille : lecture des références (`ω_k`), ordre de calcul, cycles, repli ≈, refus                                                                                                               |
| `src/lib/atelier/grid.ts`                   | La grille de la vue Données : adresses (`B3`), entrées d'une colonne nommée, répartition P2, plafonds                                                                                                             |
| `src/lib/atelier/grid-functions.ts`         | Les fonctions du tableur (SOMME, ARRONDI…) : appels, plages, calcul en arbre équilibré, aide de la barre                                                                                                          |
| `src/lib/atelier/cell-format.ts`            | La mise en forme des cases (reprise de V4) : zones, styles résolus, formats de nombre, rangement                                                                                                                  |
| `src/lib/atelier/cell-colors.ts`            | Les couleurs de la mise en forme : CSS du texte et du fond, réglages de contraste mesurés                                                                                                                         |
| `src/lib/atelier/tabulate.ts`               | Tabuler une fonction dans la grille : le tableau en formules, ses refus, `.tabuler`, valeurs par défaut                                                                                                           |
| `src/lib/atelier/to-python.ts`              | « Ouvrir dans Python » : `pythonOf` traduit un objet (et ce qu'il cite) en code Python, `pythonPageOf` en fait l'adresse `/python?code=`                                                                          |
| `src/lib/atelier/from-python.ts`            | « Ouvrir dans l'atelier » depuis `/python` : `offerOf` dit ce que le menu propose pour une liste rapportée par le worker (liste, ses effectifs, ou refus nommé)                                                   |
| `src/lib/atelier/python-mailbox.ts`         | La boîte aux lettres à usage unique de ce pont : `postToAtelier` dépose dans `localStorage`, `takeFromPython` relit (Zod) et efface                                                                               |
| `src/lib/atelier/names.ts`                  | Validation des noms, nommage automatique (`nextName`), noms de dérivées et de réciproques (`f^-1`)                                                                                                                |
| `src/lib/atelier/parse.ts`                  | Lecture d'une définition (`parseDefinition`), dépendances (`referencesOf`), provenance (`Provenance`)                                                                                                             |
| `src/lib/atelier/letter.ts`                 | `f(t) = t^2` : la lettre de l'élève à l'affichage, la définition rangée en x                                                                                                                                      |
| `src/lib/atelier/interval.ts`               | `f(x) = x^2 sur [0;+∞[` : coupe au mot « sur », lit l'ensemble, juge I3 (domaine) et I4 (`f(5)`)                                                                                                                  |
| `src/lib/atelier/reciprocal.ts`             | La carte `f⁻¹` et `.réciproque` : f passée au moteur, paramètres gardés en lettres, refus en français                                                                                                             |
| `src/lib/atelier/limit.ts`                  | `.limite EXPR en POINT` : point lu (côté, infini, `en x=1`), `evaluateLimit`, réponse en formule                                                                                                                  |
| `src/lib/atelier/limit-steps.ts`            | `.limite` : « Comment ? » (`limitSteps`), garde de concordance dans `limit-steps-check.ts`                                                                                                                        |
| `src/lib/atelier/constant.ts`               | La valeur d'une constante (curseurs, premier terme d'une suite)                                                                                                                                                   |
| `src/lib/atelier/list-cited.ts`             | Refus d'une liste citée comme un nombre (`listCitedMessage`)                                                                                                                                                      |
| `src/lib/atelier/actions.ts`                | Les actions d'une carte selon le type et l'état (`actionsFor`), listes partenaires                                                                                                                                |
| `src/lib/atelier/context.ts`                | L'instance d'atelier passée par contexte (`provideAtelier`, `useAtelier`)                                                                                                                                         |
| `src/lib/atelier/engine.ts`                 | Remet `WebReplEngine` en accord avec les objets (`syncEngine`), expansion des noms dans une saisie ; la carte `f′` (`derivativeAstOf`) prend la forme finale de `.dériver` (`finalDerivative`) après substitution |
| `src/lib/atelier/plot-sync.ts`              | Reporte les objets tracés vers le `GrapheurStore` (`syncPlots`), à sens unique                                                                                                                                    |
| `src/lib/atelier/figure-sync.ts`            | Reporte points, courbes et 𝒞f affichées vers une `Figure` de `geometry-core` (`syncFigure`)                                                                                                                       |
| `src/lib/atelier/curve-nature.ts`           | La nature d'une courbe pour sa carte (« droite », « cercle »…) et le constat d'une courbe vide (C6)                                                                                                               |
| `src/lib/atelier/properties.ts`             | Les lignes du panneau « Propriétés » (`propertiesOf`) : valeur, ensemble, suite, liste, dépendances ; la figure par `figure-properties.ts`                                                                        |
| `src/lib/atelier/figure-properties.ts`      | Les mesures exactes d'un point ou d'une courbe (`figurePropertiesOf`) : coordonnées, longueur, équations, coefficient directeur, centre, rayon, périmètre, aire                                                   |
| `src/lib/atelier/construction-read.ts`      | Lecture d'une construction (lot 2) : mots du DSL, raccourcis `(AB)` `[AB]` `[AB)`, séparateurs, accents                                                                                                           |
| `src/lib/atelier/construction-spec.ts`      | Typage d'une construction lue : point, droite ou nombre attendu ; refus du mauvais type (L8)                                                                                                                      |
| `src/lib/atelier/construction.ts`           | Calcul EXACT d'une construction (fonctions pures de `geometry-core`), équations, longueur, carte                                                                                                                  |
| `src/lib/atelier/point-drag.ts`             | Glisser un point à la souris (lot 3, PR 1) : ce qui se glisse (`dragHoldOf`), couple écrit, position sur un support                                                                                               |
| `src/lib/atelier/figure-tools.svelte.ts`    | Barre d'outils de la vue Géométrie (lot 3, PR 2 et 3) : outil choisi, construction en cours, noms automatiques, M5 (intersection, `point_sur`), lignes écrites                                                    |
| `src/lib/atelier/construction-intersect.ts` | `intersection` et `point_sur` (PR 3) : calcul pur sur des supports résolus, numérotation `k`, attente et refus                                                                                                    |
| `src/lib/atelier/measures.ts`               | Mesures (lot 2, PR 2) : `AM`, `distance`, `aire`, `perimetre`, `angle`, calculées exactes et remplacées par leur valeur                                                                                           |
| `src/lib/atelier/measures-read.ts`          | Repérage des mesures dans un texte, sans atelier (pour `parse.ts`)                                                                                                                                                |
| `src/lib/atelier/survey.ts`                 | `.relever` (PR 4) : lecture, pas exacts, ce qui varie, relevé (`Atelier.sweep`), deux listes et la ligne de réponse                                                                                               |
| `src/lib/atelier/perf-switches.ts`          | Les raccourcis du recalcul (mémo des lectures, liaisons limitées, mémo `#refsOf`) et leur compteur, pour les tests                                                                                                |
| `src/lib/atelier/display.ts`                | Schémas Zod des réglages de courbe et de suite (carte, sauvegarde, lien : une seule règle)                                                                                                                        |
| `src/lib/atelier/reading.ts`                | Lecture graphique : les `f(a)` de la console qui se lisent sur le graphe (`consoleReadings`)                                                                                                                      |
| `src/lib/atelier/mathfield.ts`              | Passage texte ↔ LaTeX pour le champ MathLive d'une carte                                                                                                                                                          |
| `src/lib/atelier/paste.ts`                  | Collage réécrit en LaTeX, annulable (`insertPasted`)                                                                                                                                                              |

**Vue Calcul** (saisie, commandes, historique) :

| Fichier                                 | Rôle                                                                                                       |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `src/lib/atelier/calcul.ts`             | **Aiguillage de la saisie** (`runInput`) : définition, calcul ou commande ; actions de carte (`runAction`) |
| `src/lib/atelier/desk.svelte.ts`        | `CalcDesk`, le pupitre : historique, actions venues du panneau, garder une ligne, rejeu                    |
| `src/lib/atelier/commands.ts`           | Catalogue français des commandes (`commandCatalog`, `resolveCommand`, `suggestFor`)                        |
| `src/lib/atelier/help.ts`               | `.aide` pour l'élève (`studentHelpText`) ; l'aide du moteur derrière `.aide dev`                           |
| `src/lib/atelier/listing.ts`            | `.valeurs` et `.fonctions` : les cartes du panneau, en français (`valuesListing`, `functionsListing`)      |
| `src/lib/atelier/render.ts`             | Rendu d'un résultat du moteur en LaTeX, sans jamais reparser la sortie texte                               |
| `src/lib/atelier/decimal-comma.ts`      | Virgule décimale à l'affichage, refus des virgules ambiguës à la saisie                                    |
| `src/lib/atelier/simplify-steps.ts`     | `.simplifier` par étapes (`simplifySteps`)                                                                 |
| `src/lib/atelier/factor-steps.ts`       | `.factoriser` par étapes (`factorSteps`)                                                                   |
| `src/lib/atelier/expand.ts`             | `.développer` : refus et messages (`expandExpression`) ; réponse et « Comment ? » par `explainExpansion`   |
| `src/lib/atelier/derive-steps.ts`       | `.dériver` et « Dériver » expliqués (`deriveSteps`)                                                        |
| `src/lib/atelier/solve-steps.ts`        | `.résoudre` par étapes (`solveSteps`)                                                                      |
| `src/lib/atelier/solve-steps-check.ts`  | Garde-fou : une conclusion d'étapes que les nombres démentent n'est pas montrée                            |
| `src/lib/atelier/variations-steps.ts`   | `.variations` et « Variations » : tableau et détail (`variationsRendering`)                                |
| `src/lib/atelier/steps-summary.ts`      | Interrupteur « Résumé / Détaillé » : `summaryOf`, choix retenu dans le navigateur                          |
| `src/lib/atelier/copy-text.ts`          | « Copier » d'une ligne : la réponse en texte lisible depuis son LaTeX (`readableText`, `answerToCopy`)     |
| `src/lib/atelier/point-drag-mode.ts`    | Réglage « Déplacement des points » (aimanté / fluide), retenu dans le navigateur                           |
| `src/lib/atelier/input-mode.ts`         | Réglage « Saisie dans Calcul » (texte / écriture mathématique), retenu dans le navigateur                  |
| `src/lib/atelier/console-key.ts`        | Raccourcis de la console : touche sous Échap (par `event.code`, hors d'un champ), Ctrl+Entrée              |
| `src/lib/atelier/natural-input.ts`      | Écriture mathématique : règles des mots, complétion, LaTeX du champ ↔ texte de Calcul (`calcTextOf`)       |
| `src/lib/atelier/virtual-keyboard.ts`   | Clavier virtuel de l'écriture mathématique : onglets « Calcul » et « Commandes »                           |
| `src/lib/atelier/domain-steps.ts`       | `.domaine` : réponse `D = …` et « Comment ? » (`domainLine`)                                               |
| `src/lib/atelier/domain-steps-check.ts` | Garde-fou : l'ensemble conclu par les étapes est, par valeur, le domaine du moteur (`sameDomainByValue`)   |
| `src/lib/atelier/tidy-terms.ts`         | Ré-export de `tidyTerms` (vit dans `src/lib/mathAST/tidy/terms.ts`)                                        |

**Statistiques et probabilités** (commandes servies par l'atelier, pas par le moteur) :

| Fichier                           | Commandes / rôle                                                                         |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/lib/atelier/simulate.ts`     | `.simuler`, `.fréquence`, `.échantillons` ; `lawFractions` (loi à partir de deux listes) |
| `src/lib/atelier/cross.ts`        | `.croiser` (tableau croisé de deux listes qualitatives)                                  |
| `src/lib/atelier/filter.ts`       | `.filtrer` (critère `=`, `≠`, `<`… avec `et`, `ou`, `non`)                               |
| `src/lib/atelier/compare.ts`      | `.comparer` (indicateurs de deux séries, sans phrase de conclusion)                      |
| `src/lib/atelier/binomial.ts`     | `.binomiale`                                                                             |
| `src/lib/atelier/law-commands.ts` | `.géométrique`, `.uniforme`, `.exponentielle`, `.normale` ; `P(X ⩽ 3)` seul (`lawEvent`) |
| `src/lib/atelier/chart.ts`        | Diagramme en bâtons / barres d'une liste (vue Données)                                   |
| `src/lib/atelier/pairs.ts`        | Deux listes appariées par LIGNE (P1) : `commonRows`, `valuesOn`, `lawMismatchMessage`    |

**Session, partage, export** :

| Fichier                              | Rôle                                                                                                                              |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/atelier/persistence.ts`     | Ranger / relire le `localStorage` (`loadAtelier`, `saveAtelier`, `readForeignWrite`), schéma Zod                                  |
| `src/lib/atelier/session.ts`         | Cycle de vie (`openSession`) : chargement, sauvegarde différée, autres onglets ; `keepCalcHistory`                                |
| `src/lib/atelier/history-storage.ts` | Les lignes de Calcul gardées au rechargement (`loadCalcHistory`, `saveCalcHistory`), Zod, plafonds                                |
| `src/lib/atelier/safe-latex.ts`      | Liste blanche des commandes LaTeX d'une formule relue du stockage (`isSafeLatex`)                                                 |
| `src/lib/atelier/url.ts`             | Atelier ↔ charge d'URL compressée (`encodeAtelier`, `decodeAtelier`)                                                              |
| `src/lib/atelier/grapheur-link.ts`   | Porte unique des liens `?a=`, `?f=` et `?depuis-python=` (`openLink`), pour `/atelier` et `/grapheur`                             |
| `src/lib/atelier/merge.ts`           | « Garder dans mon atelier » ce qu'on a reçu (`keepReceived`, `mergeInto`)                                                         |
| `src/lib/atelier/replace.ts`         | « Remplacer mon atelier » : la copie mise de côté (`replacePersonal`, `swapWithSetAside`, `keepAside`, `readSetAside`)            |
| `src/lib/atelier/rename.ts`          | Réécrire une définition qui cite un objet renommé (`renameInObject`) : `Atelier.rename` et la fusion                              |
| `src/lib/atelier/history-export.ts`  | Export de l'historique de Calcul : JSON rejouable, ubumark lisible, `downloadHistory`                                             |
| `src/lib/atelier/history-stack.ts`   | Pile Annuler / Rétablir (lot 5) : étapes à photos avant / après, plafond 100 étapes et 5 Mo ; un geste continu fondu en une étape |
| `src/lib/atelier/gesture.ts`         | Fin d'un geste de curseur (relâchement, touche relâchée, focus perdu) : une étape d'Annuler par geste                             |
| `src/lib/atelier/history-import.ts`  | Relecture d'un JSON exporté, validée par Zod et bornée (`readHistory`)                                                            |
| `src/lib/atelier/atelier-file.ts`    | Enregistrer / Charger l'atelier entier dans un `.atelier.json` (`atelierFileToJson`, `readAtelierFile`)                           |
| `src/lib/atelier/removal.ts`         | Les phrases de la suppression en cascade (`cascadeMessage`, `removedMessage`)                                                     |

### Composants — `src/lib/components/atelier/`

| Composant                    | Rôle                                                                                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AtelierContainer.svelte`    | Le conteneur : barre d'icônes, panneau + vues, console déroulante, session, `CalcDesk`, `GrapheurStore` propre                                                 |
| `roving-toolbar.ts`          | Motif ARIA « barre d'outils » de la barre d'icônes : un arrêt de tabulation, flèches, Début / Fin                                                              |
| `ToolButton.svelte`          | Un bouton de la barre : icône seule, nom en `aria-label` et en infobulle, indisponible mais focalisable ; compteur (A3)                                        |
| `ObjectPanel.svelte`         | « Mes objets » : création, liste des cartes ; replié par défaut sur téléphone                                                                                  |
| `ObjectCard.svelte`          | L'aiguillage : confie chaque objet à la carte de son type ; déplie son panneau « Propriétés » (état dans `ObjectPanel`)                                        |
| `ObjectProperties.svelte`    | Le panneau « Propriétés » sous la carte : nom (`rename`), lignes de `propertiesOf`, style, étiquette, curseur                                                  |
| `FigureCard.svelte`          | La carte d'un point ou d'une courbe, sur une ligne : `A = [champ]`, `d : [champ]` ; constat C6, menu                                                           |
| `FigureStylePopover.svelte`  | Le point de couleur d'un point (couleur, taille) ou d'une courbe de la figure (couleur, trait) : `setFigureDisplay`                                            |
| `FigureStyleSettings.svelte` | Ses réglages, repris dans le panneau « Propriétés »                                                                                                            |
| `ValueCard.svelte`           | La carte d'une valeur, sur une ligne : `a = [champ]`, menu ; curseur sous la ligne d'un paramètre ; fenêtre des bornes                                         |
| `SequenceCard.svelte`        | La carte d'une suite, sur une ligne : point, `u(n) = [champ]`, œil, menu ; premier terme et marches sous la ligne                                              |
| `ListCard.svelte`            | La carte d'une liste : aperçu non éditable, nombre de valeurs ; menu avec le sous-menu « Avec une autre liste »                                                |
| `CardActionItems.svelte`     | Les actions d'un menu de carte, indisponibles annoncées (`aria-disabled`, raison décrite), jamais `disabled`                                                   |
| `UnavailableItem.svelte`     | Un réglage de menu qui ne s'applique pas ici (« Curseur » d'une grandeur, « Escalier » d'une suite explicite)                                                  |
| `FunctionCard.svelte`        | La carte d'une fonction, sur une ligne : point, `f(x) = [champ]`, œil, menu Affichage / Actions ; fenêtre de « Tabuler »                                       |
| `CurveStylePopover.svelte`   | Le point de couleur d'une fonction ou d'une suite : couleur, épaisseur, style du trait (ou « Tracer » si jamais tracée)                                        |
| `CurveStyleSettings.svelte`  | Ses réglages, repris dans le panneau « Propriétés »                                                                                                            |
| `DefinitionField.svelte`     | Champ MathLive d'une définition ; toutes les cartes le rangent à Entrée / sortie du champ (`commit="validate"`)                                                |
| `ValueSlider.svelte`         | Le curseur d'une valeur, sous la ligne de sa carte                                                                                                             |
| `SliderSettings.svelte`      | Les bornes et le pas du curseur, refusés avec leur raison (fenêtre ouverte depuis le menu de la valeur)                                                        |
| `CurveSettings.svelte`       | « Sur le graphique » : couleur, trait, tangente, aire ; `compact` : le point de tangence, les bornes et les nombres seuls                                      |
| `CalculView.svelte`          | Le contenu de la console : champ (texte ou écriture mathématique), historique (`>` / `-->`), « Garder »                                                        |
| `NaturalField.svelte`        | Le champ MathLive de l'écriture mathématique (en essai) : mots finis en texte, complétion, ↑ / ↓, clavier virtuel                                              |
| `AtelierSettings.svelte`     | Le bouton « Réglages » (icône seule) et sa fenêtre : saisie dans Calcul, angles, déplacement des points                                                        |
| `FormulaText.svelte`         | Un message de l'atelier dont les formules `$…$` sont composées (refus de `.réciproque`, valeur interdite de `.évaluer`)                                        |
| `FigureView.svelte`          | Vue Géométrie : `GeometryCanvas` sur la figure de `syncFigure`, barre d'outils, case « Repère », glisser des points, flèches, message d'un atelier sans figure |
| `DataView.svelte`            | Vue Données : la grille (barre de cellule, mise en forme, clavier, nommer une colonne), aperçus, diagrammes                                                    |
| `ShareBar.svelte`            | Sous la barre : `share()` (lien `?a=`, appelé par l'icône Partager), retour, lien ; bandeau et « Garder dans mon atelier »                                     |

La vue **Graphe** n'a pas de composant à elle : `AtelierContainer.svelte` monte
`src/lib/components/grapheur/GrapheurContainer.svelte` (sans panneau de saisie) sur un
`GrapheurStore` propre, fourni par contexte (`provideGrapheurStore`). Tout réglage passe par les
cartes (décision G3).

---

## Le modèle

### Objets

`AtelierObject` = `ValueObject` | `FunctionObject` | `SequenceObject` | `ListObject` |
`PointObject` | `CurveObject` (`src/lib/atelier/types.ts`). Les deux derniers sont ceux de la
géométrie (v2, lot 1 : le modèle en PR 1, la vue Géométrie en PR 2, 𝒞f en PR 3 — phase 0
[atelier-geometrie-phase0.md](../archive/wip/atelier-geometrie-phase0.md)).

| Type       | Exemple                               | Particularités                                                                                                                                |
| ---------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`    | `a = 2`, `d = 12[km]`                 | curseur (bornes `[-10 ; 10]` par défaut, D3) ; une grandeur à unité n'en a pas (D4)                                                           |
| `function` | `f(x) = x^2`, `f(t) = t^2`            | rangée **en x** ; `letter` garde la lettre de l'élève pour l'affichage ; `interval` l'ensemble écrit après « sur » ; `display` du tracé       |
| `sequence` | `u(n) = 2n+1`, `u = 2u+1`             | `mode` explicite / récurrence, `firstIndex`, `firstTerm` (nombre ou nom d'une valeur)                                                         |
| `list`     | `L = 12 ; 15 ; 9`                     | `values` numériques, ou `categories` (liste qualitative) ; `plottedWith` pour le nuage ; `column`, sa colonne dans la grille                  |
| `point`    | `A = (1 ; 2)`, `M = (a ; 2a)`         | `definition` = le couple tel qu'écrit, parenthèses comprises ; coordonnées calculées comme des valeurs, exactes d'abord ; ni curseur ni tracé |
| `curve`    | `d : y = 3x - 2`, `C : x^2 + y^2 = 1` | `definition` = l'équation telle qu'écrite, sans le nom ni « : » (jamais réduite, C7) ; jamais dans Graphe (G0)                                |

**Point et courbe** (géométrie v2, décisions G0-G7 et Q1-Q5 du 2026-10-18) : **la forme écrite
donne le type** (G0) — `f(x) = 3x − 2` est une **fonction** (Graphe, dériver…), `d : y = 3x − 2`
une **courbe** (vue Géométrie). Dans Calcul, `defineCurve` (`calcul.ts`) ne prend `<nom> :
<reste>` pour une courbe que si le reste porte une relation (`hasRelation`) : `6 : 3` et `a : b`
restent la division (C15) ; sur une valeur existante, `a : b = 2` reste une comparaison, `d : y =
3x` est refusé (« « d » est déjà une valeur. », V62). La lecture (`parseCurve`, `parse.ts`) refuse
une inégalité (C9), deux « = » (C10), une unité (C11, D4), une équation sans x ni y (C8) — dans
Calcul ces refus ne créent rien. Un point se tape `A = (1 ; 2)` (G3) : `looksLikePoint` le trie
(un « ; » de premier niveau, ou une virgule qui sépare : `(1, 2)` est refusé par P6, `(1,2)` reste
le décimal 1,2 de #983) ; `parsePoint` lit chaque coordonnée comme une valeur (virgule décimale,
fractions, P3), sans unité (P8), sans x ni y. `A(1 ; 2)` répond « Pour définir un point, écris
A = (1 ; 2). » (P5). Taper `A` répond `A(1 ; 2)`, chaque coordonnée calculée comme une ligne de
Calcul (`pointLine`) ; taper `d` répond son équation. Un point ou une courbe cité dans un calcul
(`A + 1`, `2A`) ou une définition (`a = A + 1`) est refusé (« On ne calcule pas encore avec des
points. », `figureCitedMessage`, P9), y compris en argument d'une commande de calcul (`.dériver A` répondait `d/dA(A) = 1` ; lu dans le texte par `citesName`, les commandes de données lisant des modalités ne sont pas touchées). `(1 ; 2)` tapé seul répond « Pour définir un point, nomme-le : A = (1 ; 2). » (nom libre) ; un triplet ou un couple dans un calcul (`(1;2)+(3;4)`) garde le refus des couples, et la carte d'une valeur aussi. Ils citent des valeurs et des fonctions comme tout objet :
`M = (a ; 2a)` attend a avec l'offre de curseur (D9), `T : y = f'(2)(x − 2) + f(2)` suit f, et la
suppression en cascade les emporte (M3). Ni le moteur (`syncEngine`) ni le grapheur ne les
reçoivent ; `setPlotted` les ignore. Actions de carte : modifier (le champ, préfixe `d :`) et
supprimer, rien d'autre au lot 1. Plafond `MAX_FIGURE_OBJECTS` (50, points et courbes, Q3). La
**nature** d'une courbe (droite, cercle) et la courbe vide (C6) attendent la PR 2 :
`geometry-core` ne l'expose pas encore hors de `courbe()`.

**Constructions** (géométrie, lot 2, PR 1 — phase 0
[atelier-geometrie-lot2-phase0.md](../archive/wip/atelier-geometrie-lot2-phase0.md), L1-L3, L7, L8) : un
point ou une courbe peut aussi être **construit** — mots du DSL de géométrie, mêmes arguments
(nommés compris), et trois raccourcis de manuel, en définition comme dans un argument :

| Écrit                                                                            | Crée                                                                          |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `P = point(1 ; 2)`, `I = milieu(A, B)`, `milieu([AB])`                           | un point                                                                      |
| `H = projection(M, axe=d)`                                                       | un point                                                                      |
| `d = (AB)` = `droite(A, B)`, `s = [AB]`, `r = [AB)`                              | droite, segment, demi-droite                                                  |
| `parallele(P, d)`, `parallele(P, A, B)`, `perpendiculaire(…)`                    | une droite (d : droite, segment, demi-droite, ou équation de droite du lot 1) |
| `cercle(O, 3)`, `cercle(O ; rayon=r)`, `cercle(O, passant=A)`, `cercle(A, B, C)` | un cercle                                                                     |

Une construction se nomme avec « = » (une équation avec « : ») ; elle est un `PointObject` ou un
`CurveObject` dont la `definition` est la construction **telle qu'écrite** — aucun champ, aucun type
nouveau, donc ni schéma ni `ATELIER_STATE_VERSION` changés : sauvegarde, lien, fichier et fusion
la relisent. Lecture : `construction-read.ts` (sa propre grammaire, pas celle du DSL : voir son
en-tête), `construction-spec.ts` (types), `parseConstruction` (`parse.ts`). Calcul :
`construction.ts`, **exact** (`geo-arithmetic.ts`, `projectOnLine`), relu à chaque passage — L1 :
l'atelier calcule, jamais la `Figure`. Règles :

- **Séparateurs** : `;` toujours, `,` quand rien ne peut être un décimal (`milieu(A, B)`,
  `point(1, 2)`) ; `point(1,5, 2)` et `point(1,2)` sont refusés (« Sépare les arguments de point
  avec « ; » »), comme `max(1,2)`. **Accents** acceptés (`parallèle`, `demi-droite`).
- **`(AB)` : le TYPE de A et B tranche** (décision de David, 2026-10-18, option a) : deux points →
  la droite ; deux valeurs → le produit, comme avant ; un point et une valeur → refus avec la
  raison ; un nom encore absent → l'objet attend (D9). Le type suit après coup (A supprimé puis
  recréé en valeur : `#shortcutKinds`, au début de `recomputeAll`, fait de d une valeur).
  `[AB]`, `[AB)` n'ont pas d'autre sens qu'une construction (deux valeurs : « « a » n'est pas un
  point. »).
- **Refus** (rien n'est créé) : un mot du DSL hors catalogue (« « médiatrice » n'est pas encore
  dans l'atelier. », aussi dans un calcul : `2·bissectrice(A, B, C)` ; les mesures, elles, se calculent) ; un objet du mauvais type
  (« « d » n'est pas un point. », « « A » n'est pas une droite. ») ; `cercle(O, A)` avec un point
  (« … écris cercle(O, passant=A). ») ; une construction circulaire (`K = milieu(K, B)`, ou qui
  citerait un de ses dépendants) ; un changement de type (V62). Une construction prise dans un
  calcul (`2·milieu(A, B)`) est refusée.
- **D9, L8** : un objet cité absent met la construction en attente ; supprimer A propose la
  cascade (I, puis ce qui cite I) ; redéfinir A recalcule. Ce qui ne se construit pas **avec les
  valeurs du moment** — deux points confondus, trois points alignés, une parallèle à un cercle, un
  rayon ≤ 0 — est en **erreur** avec sa raison (`#constructions`, après la propagation de
  `recomputeAll`, jusqu'au point fixe). Même principe pour une valeur dont les grandeurs ne se
  combinent pas (`3[min] + 2[km]`) : `#quantityChecks`, juste après. Chaque construction se calcule **une fois par passe** :
  mémo par révision (`Atelier.constructionMemo`, partagé par le recalcul, les cartes et Calcul),
  un mémo par passage pour la vue Géométrie (curseurs gardés en lettres) — sans lui, une chaîne
  de 12 milieux coûtait 46 s. Renommer réécrit aussi les raccourcis écrits en LaTeX par la carte
  (`\left(AB\right)`, `\left\lbrack AB\right\rbrack`, `A_{1}`). Un nom hors forme (`m2 = …`)
  est refusé comme nom d'abord.
- **Tapée seule, c'est un calcul** : `(AB)` répond `(AB) : y=2x+1` (équation réduite ; `x = …`
  verticale), `[AB]` `segment de longueur sqrt(5)`, `[AB)` `demi-droite portée par …`,
  `milieu(A, B)` `(1/2 ; 2)`, `cercle(O, 3)` son équation `x^2+y^2=9`. Rien n'est créé ;
  « Garder » (D5) crée l'objet avec la définition tapée (`CalcResult.construction`). Nommé, `I`
  répond `I(1/2 ; 2)`, `d` son équation.
- **Carte** (L7, contenu seulement) : la construction telle qu'écrite (régénérée par
  `constructionLatex`, jamais le texte saisi). Sa nature (« point », « droite », « segment »,
  « demi-droite », « cercle » : `figureNatureOf`) et ce qu'elle vaut — coordonnées exactes,
  longueur, équation (`constructionSummaryOf`) — ne sont plus montrées sur la carte depuis le
  2026-10-23 (#1627) : elles iront dans les Propriétés de l'objet. Le champ de la carte relit le LaTeX de MathLive
  (`\operatorname{milieu}\left(A,B\right)`, `\left(AB\right)`) ; préfixe `d =`.
- **Vue Géométrie** : `syncFigure` reçoit les arbres calculés (curseurs gardés en lettres) et pose
  des éléments existants (droite, segment, demi-droite, cercle par rayon) ; un curseur cité suit
  par `moveSlider`, sans reconstruire. Le nom d'un cercle est un texte de la figure (de sa
  couleur ; la vue Géométrie l'écrit en couleur du texte, `neutralLabels`), accroché à un point caché du cercle (aucune surface de `geometry-core` n'écrit le nom
  d'un cercle) : rien n'est désigné au survol, rien de plus à l'export.

**Mesures** (géométrie, lot 2, PR 2 — L4) : des **valeurs** calculées par l'atelier, exactes
d'abord, citables partout où une valeur l'est (Calcul, définition d'une valeur ou d'une fonction,
moteur, Graphe par la substitution) :

| Écrit                                   | Vaut                                                                                                                                                                                                                                                        |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AM` (deux points de l'atelier, collés) | la longueur AM (`AE` → `sqrt(5)`) ; `ab` de deux valeurs reste a·b                                                                                                                                                                                          |
| `distance(A, B)`, `distance(A, d)`      | longueur, ou distance à une DROITE (`d` droite, `(AB)`) ; à un segment ou une demi-droite (`[AB]`, `[AB)`, `s = [AB]`) : refus « … écris distance(N, (AB)) » (décision de David, 2026-10-18 — le DSL, lui, mesure `distance(A, s)` à la droite qui porte s) |
| `aire(A, M, N, P)`                      | aire du polygone (≥ 3 points) ; croisé → refus « … est croisé »                                                                                                                                                                                             |
| `perimetre(…)`, `périmètre(…)`          | périmètre du polygone fermé (≥ 3 points)                                                                                                                                                                                                                    |
| `angle(A, B, C)`                        | l'angle en B, une **grandeur** dans l'unité du réglage « Angles » : `90°`, `45°`, sinon `≈ 36,8699°` (4 décimales à l'affichage, pleine précision au calcul) ; en radians `π/2 rad`, `≈ 0,6435 rad`                                                         |

Lecture : `measures-read.ts` repère les appels (texte ou LaTeX de MathLive, `\operatorname{aire}`,
accents, séparateurs de `construction-read.ts`) ; `parseDefinition` lit le reste comme un nombre.
Calcul : `measures.ts` (`measuredText`) remplace chaque mesure par sa valeur exacte, avec les
points de `construction.ts` ; le moteur lit `Atelier.readableDefinition` (mémo par révision, garde
contre un objet qui se citerait). Une ligne de Calcul tapée avec une mesure est calculée sur ce
texte, l'écho restant celui de l'élève. Une **mesure nommée** (`S = aire(A, M, N, P)`, `L = AE`)
est une valeur **sans `slider`** (comme une grandeur, D4 — critère de la carte) ; `#measures`
(fin de `recomputeAll`) retire ou rend le curseur quand une valeur devient ou cesse d'être une
mesure (`S = AM` tapé avant A et M), et met en erreur ce qui ne se calcule pas (polygone croisé,
sommet d'un angle confondu avec un de ses points). Elle cite ses points (D9, cascade) ; un point cité HORS d'une mesure reste
refusé (P9). La carte de valeur en montre la valeur (`ValueCard`, ligne `.mesure`, `measureSummaryOf`).
Décisions de David (2026-10-18) : **un angle est une grandeur** (`(60[°])`, `((\pi/3)[rad])`
dans le texte lu par le moteur) — `cos(angle(…))` se calcule, `angle(…) + 1` est refusé par la
règle des grandeurs, une fonction ou une suite qui cite une mesure d'angle est en erreur (choix
prudent : « une mesure d'angle est une grandeur… ») ; **« Garder »** une ligne de mesure crée une
valeur de cette définition (`CalcResult.measure`), qui suit ses points. Revue (2026-10-18) : le moteur lit l'ARBRE d'une
définition à mesures (`Atelier.definitionAst`, `measuredAst` : marques `m_90000` remplacées par le
nœud exact, angles en grandeur) — relue en texte, `(({1/2}\pi)[rad])` passait en LaTeX et ne se
lisait plus. La carte de valeur affiche ce que Calcul répond quand on tape son nom
(`valueAnswerOf`, une seule source de vérité) ; une valeur que Calcul refuse (`W = T + 1`) est en
erreur avec son message (`quantityProblem`) ; une fonction ne refuse qu'un angle BRUT
(`hasBareAngle` : `cos(angle(…))·x` passe, `T·x` non) ; la grille dit « T est une grandeur (un
angle) » ; une ligne de mesure écrit `π`, `vrai`/`faux` sans « ≈ », et refuse une puissance d'un
angle (choix prudent) ; le champ de la carte montre `\operatorname{aire}` (`measureFieldLatex`). Dans l'arbre substitué d'un objet, un angle mesuré pris
par un sin, cos, tan devient un nombre de radians (`angle-radians.ts`) : le moteur n'évalue pas le
cosinus d'une grandeur dans une fonction (`g(x) = cos(R)·x`, R = 90°). La carte recopie le mode
de la console (`Atelier.calcMode`, posé par le pupitre après chaque saisie). Revue (2026-10-18) : une mesure se cite aussi
dans les nombres d'une construction (`cercle(A ; AM)`) et dans des coordonnées (`G = (aire(B, C, D) ;
0)`, `engine.substitutedTextOf` → `Atelier.measuredTextOf`) ; `A = (AM ; 0)` est refusé (circulaire) ;
renommer un point réécrit les `AM` (`renamePairs`, texte et LaTeX) ; seul un polygone CROISÉ (deux
côtés non voisins qui se coupent en un point intérieur, `isCrossed`) est refusé : un polygone aplati
— sommets confondus, tous alignés, côtés qui se touchent ou se recouvrent — a une aire, nulle s'il est
plat, et un périmètre calculé normalement (décision de David du 2026-10-19, qui revient sur le refus
posé à la revue de la PR 2) ; un polygone qui **repasse par un sommet** écrit deux fois à des places
non voisines (`aire(A, B, C, D, B)`) est refusé (« Le polygone repasse par B… », `revisitedVertex`,
décision de David du 2026-10-19) — on compare ce qui est ÉCRIT, pas les positions, pour qu'un relevé
ne s'arrête pas quand deux sommets se rejoignent au glisser ; une valeur APPROCHÉE (angle non remarquable) entre au moteur
en pleine précision et toute ligne qui la cite, même par un autre objet (`approximateNames`), se dit
`≈`, 4 décimales, jamais en fraction.

**Écrire un angle en degrés** (`degrees.ts`, 2026-10-19) : comme sur la copie. Un `°` collé
après un nombre, un nom ou une parenthèse fermante est l'unité degré (`60[°]`, π/180 rad) —
`cos(60°)` → `1/2`, `a = 60°`, `cos(a°)` avec a = 60, `cos((30+30)°)`, `60 °` aussi. En LaTeX,
`60^\circ`, `60^{\circ}`, `60{}^{\circ}` et `60\degree` (ce que MathLive écrit quand on tape `°`,
mesuré dans Chromium, `mathlive-degres.svelte.test.ts`) deviennent `60\unit{°}` : carte, champ
mathématique de la console (`calcTextOf` écrit `°`), ligne de Calcul, cellule de la grille (`=cos(60°)`
vaut `=cos(60[°])`), argument d'une commande de calcul (pas celui d'une commande de données, qui
lit des modalités). Lecture : `withDegreeUnits` dans `readByProvenance` (`parse.ts`), en tête de
`computeInput` et sur la ligne d'une commande (`runCommand`). Un `°` qui ne suit rien (`°`,
`cos(°60)`, `2 + °`, `^\circ` seul) est refusé : « Le signe ° s'écrit juste après un nombre ou un
nom : 60°, cos(60°), a°. » (`strayDegreeRefusal`) — plus de « Unsupported symbol … circ », en
anglais. `20 °C`, `°F` restent des températures. La réponse écrit `60°`, sans espace (règle
typographique des angles), et `60{}^{\circ}` en LaTeX (`degreeSignWritten`, appliqué à la sortie de
`runInput` : mesures d'angle comprises, `≈ 36,8699°`, la valeur approchée aussi). Un angle écrit
en degrés pris par un sin, cos, tan devient un nombre de radians exact dans l'arbre substitué
(`h(x) = cos(90°)·x` → `h(1) = 0`, `.variations h` constante, `f(x) = sin(30°) + x` → `f(0) = 1/2`)
et dans l'argument d'une commande (`radiansInText` : `.résoudre h(x)=1` → `x = 2`, `.évaluer
cos(60°)*x en x=2` → 1). **Une variable en degrés** (choix prudent, à trancher par David) :
`f(x) = cos(x°)` est acceptée — exacte, `cos(πx/180)`, et c'est l'arbre que trace le Graphe ; un
angle BRUT écrit dans une fonction ou une suite (`f(x) = 2x°`, `x[°]`, `u(n) = n°`) est en erreur
avec le message des mesures (« Une mesure d'angle est une grandeur… », `WRITTEN_ANGLE`,
`atelier.svelte.ts`) — avant, `f(x) = x[°]` passait et `f(1)` répondait `(π/180) rad`.
`cos(60)` reste en radians ; le réglage « Angles » ne change pas. Revue (2026-10-19) : le `°` CIBLE
d'une conversion ne se réécrit pas (`1[rad] en °` → `1 rad = (180/π)°`, `.convertir °`) ; une
fraction de nombres le prend entière (`1/2°` = `(1/2)[°]`, comme `1/2 m`) ; la réponse met entre
parenthèses une valeur qui n'est pas un nombre seul (`(100/3)°`, `\left(\dfrac{100}{3}\right){}^{\circ}`)
et colle `\pi°` ; les commandes d'ÉCRITURE (`.latex`, `.texte`, `.analyser`, `.arbre`, `.empreinte`,
`.forme-normale` : `WRITING_COMMANDS`) gardent l'angle en grandeur ; `.évaluer sin(x) en x=30°` →
`1/2` (`radiansInLatex` sur la réponse du moteur) ; une puissance d'un angle est refusée sur toute
ligne, comme pour une mesure (`(60°)^2`, `60°^2`) ; la grille écrit `60°` (`inDegrees`,
`formula.ts` : la case vaut le nombre de degrés, une formule écrite en `rad` reste en radians).
`.variations cos(x°)` annonçait « croissante sur ]-∞ ; 0[ » (déjà faux sur main pour
`cos(πx/180)`) : les zéros périodiques d'un domaine non borné ne sont que ceux d'une période, et
l'échantillonnage ([-100 ; 100]) ne voyait pas ±180 ; il est coupé sur un intervalle non borné
dans ce cas (`periodicUnbounded`, `mathAST/sign/helpers/zeros.ts`, `analyze.ts`) — « sens
indéterminé », comme pour `cos(x)`, dont le tableau ne change pas. `20°C` (collé) reste lu comme
avant (sans effet).

**Intersections et points sur un objet** (géométrie, lot 2, PR 3 — L5) : deux mots du DSL de
plus dans le catalogue, mêmes arguments et même numérotation que lui
(`construction-intersect.ts`, appelé par `construction.ts`) :

| Écrit                                                | Crée                                                                                                                 |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `E = intersection(d ; c)`, `intersection(d ; c ; 2)` | le point commun (`k` facultatif s'il n'y en a qu'un) ; `d`, `c` : noms ou constructions (`(AB)`, `cercle(O ; 2)`)    |
| `M = point_sur(s ; 0,3)`, `point_sur(s)`             | M sur s : segment de 0 (A) à 1 (B), 0,5 par défaut ; droite ou demi-droite, l'abscisse le long de (AB), 0 par défaut |
| `point_sur(c ; 90)`, `point_sur(f ; 2)`              | sur un cercle, l'angle depuis l'horizontale, en degrés toujours ; sur 𝒞f, (x0 ; f(x0))                               |

- **Couples** : droite × droite, × cercle, × courbe par équation (conique : `intersectLQExact`,
  exacte ; y = f(x)), × fonction ; cercle × cercle ; conique × conique (ou × cercle) en nombres
  (`intersectQQ`) ; fonction × fonction. Exact d'abord : `intersectLL`, `intersectLC`,
  `intersectCC`, et pour une courbe y = f(x) les racines EXACTES de mathAST (`exactZeros` :
  fractions, a ± b√m), sinon `intersectLF` / `intersectFF` (Newton de geometry-core, fenêtre
  [−10 ; 10] du DSL). Une coordonnée seulement approchée se dit **« ≈ »**, 4 décimales :
  `E ≈ (1,5811 ; 1,2247)` (carte, Calcul), et une mesure qui cite ce point aussi (`OE` → `≈ 1,5708`).
- **Numérotation `k`** : celle de `geometry-core` — dans le sens de la droite (de son premier
  point vers le second) pour droite × cercle et droite × conique ; à gauche de (centre 1 →
  centre 2) pour deux cercles ; abscisses croissantes pour une courbe y = f(x). Elle ne dépend
  pas de l'exactitude (`intersectLQExact` suit la formule et l'ordre d'`intersectLQ`) : un point
  ne change pas de branche quand un curseur glisse (`figure-point-sur.test.ts`).
- **Segments et demi-droites** : les solutions sont numérotées sur les droites PORTEUSES ; un
  point hors de la portion n'existe pas — avec `k`, le point **attend** (« Le point 1 de s et c
  n'est pas sur s. ») ; sans `k`, c'est le seul point commun aux portions qui compte.
- **Attente** (`pending`, sans `missing` : rien ne manque, aucun curseur n'est offert) : aucun
  point commun (« d et c ne se coupent pas. »), un `k` au-delà des solutions du moment (« t et
  c n'ont qu'un point commun. »), une position hors du segment, f non définie en x0. Le point
  revient seul quand un curseur les fait se couper (`#constructions`, raison `pending` du
  `BuiltOutcome`) ; ce qui le cite attend avec lui — une construction (`usableObject`), une
  mesure (`measuredText`, `pending`), et le reste par `#geometryWaits` (après `#measures`).
- **Refus à la saisie** (rien n'est créé, `defineConstruction` essaie la construction) : deux
  points ou plus sans `k` (« u et c se coupent en deux points : écris intersection(u, c, 1) ou
  intersection(u, c, 2). ») ; une infinité de points communs (droites confondues, cercles égaux,
  coniques proportionnelles) ; un couple pas encore dans l'atelier (fonction × cercle ou
  conique, comme le DSL ; courbe implicite ; `point_sur` d'une conique). Erreur : un `k` plus grand
  que le couple ne le permet (« Deux droites ont au plus un point commun… »), ou qui n'est pas un
  entier à partir de 1. Un support qui n'est ni ligne, ni cercle, ni courbe : « « A » n'est pas une
  ligne, un cercle ou une courbe. ».
- **Le curseur de position** : `point_sur(s ; 0,3)` — un NOMBRE écrit — a un curseur dans sa
  carte (`positionSliderOf`, bornes [0 ; 1] sur un segment, [0 ; 360] sur un cercle, [0 ; 10]
  sur une demi-droite, celles d'une valeur ailleurs) ; le glisser réécrit le nombre de la
  définition (`slidePosition`, arrondi au pas, comme `slideTo` : `1/3` glissé devient `0,33`). Une
  position écrite en LaTeX (`\frac{1}{2}`) n'a pas de curseur (il la réécrirait). Rien de
  rangé en plus : bornes lues sur la définition, ni schéma ni `ATELIER_STATE_VERSION` changés.
  `point_sur(s ; t)` suit le curseur de la valeur t ; `point_sur(s)` n'a pas de curseur.
- **Tapé seul** : un calcul (`intersection(u, c, 1)` → `(-1 ; 0)`), « Garder » le nomme (D5).
  Renommer réécrit les noms des supports (texte, et LaTeX de la carte :
  `\operatorname{point\_sur}` ; MathLive tape `point_{sur}`, relu comme `point_sur`).
- **Écarts avec le DSL** (voulus) : le DSL coupe un segment comme sa droite et ramène la position
  d'un `point_sur` au bord du segment — l'atelier met le point en attente ; le DSL calcule droite ×
  conique et droite × fonction en nombres — l'atelier en exact d'abord ; `point_sur` d'une conique
  est refusé. L'angle d'un `point_sur` sur un cercle est en **degrés toujours**, comme le DSL et
  la phase 0 (L5) : le réglage « Angles » ne gouverne que l'écriture des mesures (un lien relu
  en radians donne la même figure). Deux cercles qui deviennent égaux au glisser : le point
  ATTEND (« … une infinité de points communs. »), le refus reste à la saisie.

**`.relever` en détail** (lot 2, PR 4 : L6 ; `survey.ts`). Le relevé ferme la boucle du problème
de l'aire : `.relever AM ; S quand M va de 0 à 1 pas 0,05` fait varier M, calcule AM et S à chaque
pas et crée **deux listes** (colonnes de Données) que l'élève trace en nuage. L'atelier ne valide
rien : il relève, l'élève conjecture.

- **Ce qui varie** : une **valeur à curseur** (définition constante, sans unité) ou un
  **`point_sur` à position écrite** (sa position, comme le curseur de la carte). Refus avec la
  raison, rien de créé : nom absent ; valeur calculée (« fais varier une valeur à curseur ») ;
  grandeur ; point qui n'est pas posé sur un objet ; `point_sur(s ; t)` (« M suit la valeur « t » :
  écris … quand t va de … ») ; fonction, liste.
- **Les pas** : début, fin et pas lus EXACTS (décimaux ou fractions, `-1,5`, `0.05`, `1/3`) ;
  pas > 0, fin ⩾ début ; au plus `MAX_LIST_VALUES` (200) pas, sinon « Ce relevé ferait 1001 pas :
  200 au plus. Agrandis le pas. » Chaque pas est écrit comme l'élève l'écrirait (`0,05`, `1/3`) ; un
  pas qui ne tombe pas juste s'arrête avant la fin, et la ligne le dit (« … s'arrête à 0,9. »).
- **Le balayage** (`Atelier.sweep`) : chaque pas passe par `update` (la carte, la figure, les
  mesures qui en dépendent sont recalculées), puis E1 et E2 sont lues comme une coordonnée
  (`substitutedTextOf` : noms, fonctions, mesures) et évaluées en décimal. À la fin, le TABLEAU des
  objets d'avant est remis en place, tous objets compris : `update` élargit le curseur d'une
  valeur posée hors de ses bornes. ⚠️ Une copie du tableau (`[...items]`), pas
  `$state.snapshot` : hors navigateur, ce dernier rend le tableau lui-même, que le premier pas
  modifiait (mesuré, test rouge). Coût mesuré dans Chromium, 200 pas (après le chantier performance #1513) : 116 à 141 ms
  sur la figure de l'aire, 861 à 901 ms sur la figure de 24 objets (`fixtures/figure-24.ts`).
- **Les cases** : la valeur est calculée EXACTE d'abord, puis écrite en décimal (`sin(πt)` aux
  entiers → `0`, jamais un résidu de flottant ni `-0`) ; sinon en décimal, et un résultat sous
  10⁻¹² fois la taille des termes de premier niveau de son calcul (ou du plus grand nombre de la
  colonne) s'écrit 0 (`sin(t)² + cos(t)² − 1`). 10 chiffres significatifs, virgule décimale,
  jamais de notation scientifique (`10^(-20)` s'écrit en toutes lettres) ; une valeur ⩾ 10¹⁵ ne
  tient pas dans une case : sa ligne reste vide et la réponse le dit (« … trop grandes pour une
  case »). Un angle est relevé en nombre dans l'unité du réglage, l'unité retirée avant le calcul
  exact (qui passerait en radians) et écrite dans le TITRE de la colonne (« angle(B, A, C) (°) »,
  « T (rad) », décision de David du 2026-10-19). Un pas où une expression n'a pas de valeur (point en attente,
  polygone aplati, hors du domaine) laisse sa ligne **vide dans les deux listes** (`12 ; ; 15`),
  pour que les lignes restent appariées (P1), et la ligne de réponse le compte (« 2 pas sans
  valeur… »). Une expression sans valeur à AUCUN pas est refusée avec la raison (« « M » est un
  point ; relève une mesure… », « « x » n'est pas défini… »).
- **Les listes** : nommées par le mot-clé facultatif **`dans X ; Y`** (décision de David du
  2026-10-19 ; noms validés comme tout nom d'objet — pris, réservé, invalide ou deux fois le même :
  refus, rien n'est créé) ; sans lui, deux noms libres de `nextName('list')` (L, M, N, puis L_1…),
  jamais un nom pris ;
  la colonne de chacune reçoit pour titre l'expression relevée (« AM », « S », 40 caractères au
  plus), posé une fois les deux listes créées, sans étape propre (`setTitle(…, { recorded: false
})`) : la ligne de console est UNE étape de la pile commune (lot 5), qu'Annuler défait en
  entier, listes et titres. Refus si l'atelier n'a plus de place pour DEUX listes (`MAX_LISTS`)
  ou deux colonnes libres ; une seconde création refusée retire la première (tout ou rien).
- **La ligne de réponse** (texte, sans LaTeX) : « Relevé de AM et S quand M va de 0 à 1, pas 0,05 :
  21 lignes, dans L et L_1. », les notes, puis « Trace le nuage : sur la carte L, « Nuage avec
  L_1 ». » — le bouton de la carte (`scatter:L_1`), qui pose `plottedWith` comme aujourd'hui. Le
  geste se rejoue comme toute saisie (`ReplayStep` `saisie`). Dans `.aide`, rubrique « Géométrie : relever
  des mesures » (`HelpSection` `geometrie`, entre « Étudier une fonction » et « Statistiques »).
- **Le problème de l'aire**, testé tel quel (`relever.test.ts`) : A(0 ; 0), B(4 ; 0),
  `M = point_sur([AB] ; 0,5)`, `N = (AM ; MB)`, `P = (0 ; MB)`, `S = aire(A, M, N, P)` → 21 lignes,
  21 lignes PLEINES, maximum relevé en AM = 2 avec S = 4 ; en M = A et M = B, le rectangle est
  aplati : S = 0.
- **Le pas** est obligatoire ; s'il manque, le refus récrit la commande de l'élève avec un pas
  d'un dixième de l'étendue (« Il manque le pas : écris par exemple .relever t ; 2t quand t va de 0
  à 1 pas 0,1. »).

**Quatre états** (D9) : `error` > `pending` > `incomplete` > `ok`. Un nom cité mais absent met
l'objet **en attente** (`pending`, avec `missing`), pas en erreur ; l'attente se répare seule quand
le nom apparaît, et pour une lettre seule elle porte une **offre de curseur**
(`createFromOffer`). Un objet vide est `incomplete` ; ceux qui le citent l'attendent. Une
**fonction ou une suite citée comme un nombre** (`f(x) = ax`, `2ax`, `a^2` avec `a(x) = x^2`,
dans n'importe quel ordre de saisie ; `h(x) = a(2) + a` ; `f(x) = u x` avec u une suite) met la
définition en erreur (V58, `functionAsNumberMessage` dans `recomputeAll`). Les noms sont lus
dans l'arbre (`bareNamesOf`, `parse.ts`) : une variable seule, hors base d'un indice (`a_1` est
un autre nom, `u_n` la notation d'une suite) et hors base d'une puissance −1 (la réciproque ;
`f'(x)`, `f^{-1}(x)` sont des appels). Message de la carte, pour f : _« a » est une fonction :
« f » ne peut pas s'en servir comme d'un nombre. Écris a(x), ou donne un autre nom à la
lettre._ La suggestion suit la variable de l'objet qui cite (`a(t)`, `a(n)` pour une suite) ;
pour une valeur, _Écris une de ses valeurs, comme a(2)…_ ; une suite citée dans une fonction ou
une valeur, _Écris un de ses termes, comme u(2)…_ Les cartes `f′` et `f⁻¹` n'y passent pas
(elles suivent f). **Redéfinir un nom sous un autre type est refusé** (V62, corrigé le
2026-10-20, `defineObject`, `calcul.ts`) : `a = 3` puis `a(x) = x^2`, `a = x^2` ou `a(n) = 2n` →
_« a » est déjà un nombre : supprime-le ou choisis un autre nom pour créer une fonction._ ; de même
entre fonction et suite. Avant, l'objet gardait son type rangé avec la nouvelle définition (une
valeur a = x²), et `a = 3`, `f(x) = a x`, `a(x) = x^2` échappait au refus ci-dessus : `.dériver f`
affichait 3x². Sans parenthèses, `f = t + 1` redéfinit toujours la fonction dans sa lettre (#905).
Tests : `redefinir-autre-type.test.ts`.
**Noms indicés** (corrigé le 2026-10-19, ex-V63) : `a_1` est UN nom, jamais sa base. Le
parseur en fait un nœud `subscript` (`a`, `1`) ; la lecture des noms le voit sous son nom
entier (`variablesOf`, `parse.ts`, qui sert `referencesOf`, `bareNamesOf`, les refus x/y, les
noms d'une formule de la grille), et `substitute` (`mathAST/eval/substitute.ts`) remplace le
nœud par la liaison `a_1` sans jamais toucher à sa base (`mathAST/common/indexed-names.ts`) —
avant, avec a = 10, `a_1` devenait `10_1` (« Écriture non reconnue »), et `b = a_1 + 1`
attendait « a ». Seul un indice ENTIER fait un nom : `u_n` reste la notation d'une suite, et
`u_3` (u suite ou fonction de l'atelier, `u_3` n'en étant pas une) son terme de rang 3.
**Les suites** (décisions de David, 2026-10-19) :

- **`u_3` tapé dans Calcul** répond le terme, comme dans une définition : `indexedTermsAsCalls`
  (`calcul.ts`) récrit `u_3`, `u_{12}` en `u(3)`, `u(12)` avant tout calcul (récurrence comprise,
  par `recurrenceTermsIn`). L'écho, une réponse restée en lettres (`u_3 + w`) et un refus
  (`v_0 n'existe pas…`) citent ce qui a été tapé, jamais `u(3)` (`typedTermsIn`). Pas devant une
  parenthèse (`u_3(2)` appelle la fonction `u_3`) ni quand un objet `u_3` existe. Les commandes
  de CALCUL aussi (`indexedTermsInArgument`) : `.dériver u_3 x^2`, `.évaluer u_3`, `.évaluer x^2
en x=u_3` ; pas les commandes d'écriture (`.latex u_3` écrit ce qui est tapé), ni un nom de
  variable (après « ; », ou posé par `en u_3=…`). `u_3'` : « « u_3 » est le terme de rang 3 de la
  suite u : un nombre, il n'a pas de dérivée. » Une récurrence citée dans une DÉFINITION
  (`c = v_3`) reste refusée, comme `c = v(3)`. Renommer la suite u en v emmène ses termes :
  `b = u_3 + 1` devient `v_3 + 1` (`renameTermsInDefinition`, par `renameInObject`) ; une fonction
  `f_1` n'est pas un terme de f et reste telle quelle.
- **Une valeur `u_3` et une suite (ou fonction) `u` ne cohabitent pas** (`indexedNameClash`,
  `names.ts`, dans `create`, `rename` et le nom proposé d'office) : « u est une suite : u_3
  désigne son terme de rang 3. Choisis un autre nom. » (fonction : « f_1 désigne f(1) ») ; dans
  l'autre sens, « u_3 existe déjà : avec une suite u, u_3 désignerait son terme de rang 3.
  Renomme u_3, ou choisis un autre nom. » Une fonction ou une suite `f_1` à côté de `f` reste
  permise. Un atelier rangé (lien, sauvegarde, fichier) qui contient les deux : la VALEUR est
  renommée à la relecture (`migrateIndexedNameClashes`, `persistence.ts`, comme la migration de
  `y`) et on le dit (`renamedOnReadMessage`, `geometry.ts` : « « u_3 » se lit désormais u(3) :
  ton objet s'appelle maintenant a. ») ; les définitions qui citaient `u_3` ne sont PAS réécrites
  — elles y lisaient déjà le terme. **Versement** (`mergeInto`) : le conflit se tranche dans
  `planNames`, avant toute création, comme un nom pris — dans les deux sens. Une valeur `u_3`
  reçue à côté d'une suite u locale arrive sous un autre nom. Une suite `u` reçue à côté d'une
  valeur `u_3` locale arrive sous un autre nom (v), et `rewriteCitations` réécrit les arrivants
  qui la citent : `c = u(3) + 1` devient `v(3) + 1`, ET le terme reçu `b = u_3 + 1` devient
  `v_3 + 1` — sans quoi il lirait la valeur locale `u_3`, sans rien dire.
- **`x_1` n'est jamais x** : le pipeline de lecture du moteur (`mathAST/cli/core/pipeline.ts`)
  fait de chaque nom indicé latin une VARIABLE `x_1` (`hideIndexedNames`), que toutes les
  analyses (`.variations`, `.résoudre`, `.intégrer`, `.évaluer`, `.domaine`, le solveur) traitent
  comme une autre lettre — comme `a`. Avant : `.variations x^2 - x_1 x` ne trouvait pas de point
  critique, `.intégrer x_1 de 0 à 1` rendait 1, `.évaluer x_1^2 en x_1=3` refusait. Le LaTeX
  d'une telle variable s'écrit `x_1`, `a_{12}` (`indexedVariableLatex`), plus `\mathit{x_1}`.
  Le grec indicé (`\alpha_1`) reste un `subscript`, nommé « α » dans un refus. `.variations`
  ne conclut plus sur un sens indéterminé (`x^2 - a x`, `x^2 - x_1 x`) : « Signe de f'(x) et sens
  de variation : non déterminés », « Extrema : non déterminés », au lieu d'un ]-∞ ; +∞[ « ? » et
  d'un « Extrema : aucun » faux (`variations.command.ts`, défaut hérité de main avec `a`).
  Côté atelier, lisent aussi le nom entier : `.réciproque` (lettres et paramètres, base latine
  seulement, `reciprocal.ts`), les étapes de `.résoudre` (`solve-steps.ts`), une borne d'intervalle
  (`interval.ts`), les lettres d'une courbe (`construction.ts`), l'intégrande
  (`integrate-steps-check.ts`), et la figure (`figure-sync.ts` : un point `(a_1 ; 2a_1)` n'était
  pas dessiné, son curseur cherché sous « a »).

**Noms** (`src/lib/atelier/names.ts`) : une lettre latine, éventuellement indicée ; **un seul
espace de noms** tous types confondus (D1). Réservés : `x`, `y`, `n`, `e`, `pi`, `i` — **`y` depuis
la géométrie** (G5, 2026-10-18) : c'est la variable des équations de courbe. `y = 3x − 2` sans nom
répond « Pour une fonction, écris f(x) = 3x − 2 ; pour une droite, nomme-la : d : y = 3x − 2. »
(Q1 (a), noms libres proposés) ; `y` dans une fonction, une valeur ou une suite met la carte en
erreur (« « y » est réservé aux équations de courbe… ») ; `f(y) = y^2` reste permis (une lettre de
fonction, rangée en x). Lettres proposées aux points : A, B, C… ; aux courbes : d, C, D, T. Les dérivées s'appellent `f′` (`derivativeName`,
`isDerivativeName`) ; la réciproque se range `f^-1` et s'affiche `f⁻¹` (`reciprocalName`,
`reciprocalOf`) — une forme qu'aucun élève ne peut taper comme nom (`validateName` la refuse), donc
sans collision possible ; elle n'est pas citable (absente de `functionNames`). Le nommage automatique évite les noms cités par la définition (#329).

**Fonction définie sur un intervalle** (lot 1 de
[atelier-intervalle-phase0.md](../archive/wip/atelier-intervalle-phase0.md), I1-I6 validées le 2026-10-13) :
l'élève écrit l'ensemble dans le même champ que la définition, après le mot « sur »
(`f(x) = x^2 sur [0;+∞[`). `splitInterval` (`src/lib/atelier/interval.ts`) coupe AVANT le parseur
de l'expression : en texte (Calcul), un mot entier ; en LaTeX (carte), « sur » arrive en trois
lettres collées à ce qui précède (`x^2sur[0;1]`, mesuré dans Chromium) et se reconnaît à ce qui le
suit (`intervalWord`) : il ne coupe QUE devant le début d'un ensemble (crochet, `\left`, `\{`, ℝ,
`\R`, `\mathbb`, `R` seul) ; sinon la saisie reste entière comme avant (`a = 3 sur 4`, `x^{sur}`,
`surface`, `\text{surélevé}`) ; jamais `\surd` ; la carte l'écrit `\text{ sur }`. L'ensemble
est lu par `parseStudentDomain` (intervalles, réunions, `ℝ \ {0}`, `ℝ₊` ; pas `+oo`) et
rangé TEL QU'ÉCRIT dans `FunctionObject.interval` ; `sur ℝ` ne range rien. `Atelier.create` et
`update` le jugent (`checkInterval`) : illisible, vide, réduit à un point, posé sur une valeur, une
liste ou une suite (« Seule une fonction se définit sur un intervalle. »), ou hors du domaine de la
fonction (I3, `computeDomain` puis `difference` : « ln(x) n'est pas défini sur tout [−1 ; 2] (pas
en −1). » ; pas jugé quand la définition cite d'autres objets) → refusé, rien ne change. Une
définition retapée sans « sur » (Calcul ou carte) retire l'intervalle (I6). `f(5)` hors de
l'ensemble est refusé dans Calcul (`outsideIntervalRefusal`, argument sans variable ou fait de valeurs de l'atelier — `f(b)` avec b = 5 —, et aussi dans une définition, `a = f(5)`) et par l'image
de la carte (I4). Dans la carte, `smartFence` est coupé dès que le champ contient le « sur » d'un
intervalle — même règle `intervalWord`, « sur » en fin de saisie compris (jugé au `keydown`,
`beforeinput` et `input` en capture : l'`input` arrive trop tard) — sinon `[0;1[` s'écrit
`\left\lbrack0;1\left\lbrack\right\rbrack\right\rbrack`, illisible.

**Les calculs sur l'intervalle** (lot 2, I4) : `.résoudre` et `.variations` travaillent sur
l'ensemble des fonctions qu'ils citent SEULES ou appelées sur une lettre (`f`, `f(x)`, `f'(t)` —
`citedIntervalDomain`, intersection s'il y en a plusieurs) ; appelée sur un nombre ou une autre lettre (`f(a)`), elle vaut un nombre ; sur une expression de l'inconnue (`f(2x)`), refus en français (c'est 2x qui devrait être dans l'ensemble). Un `dans` tapé se croise avec cet ensemble (vide → refus).
L'atelier passe l'ensemble au moteur par le mot `dans` (`formatInterval`, relu par
`studyDomain` / `readSolvingDomain`) : la ligne de texte, le tableau et les étapes disent la même
chose. `.variations f` (x² sur [0 ; +∞[) : tableau de 0 (compris) à +∞, croissante ; `.résoudre
f(x)=4` : `x = 2` — les étapes résolvent sur ℝ puis une dernière « On ne garde que les solutions
qui sont dans [0 ; +∞[ » (`solveSteps(…, within)`, équations à solutions isolées seulement ; une
inéquation garde la réponse du moteur, déjà restreinte). Une famille périodique sur un ensemble non borné (`sin(x) = 0` sur [0 ; +∞[) est refusée : « Une infinité de solutions sur cet ensemble ». Mêmes règles pour les actions « Résoudre
f(x) = 0 » et « Variations » de la carte. **`f′` hérite** : `#inheritIntervals` recopie l'ensemble
de f sur ses dérivées à chaque recalcul (il suit f, disparaît avec lui, jamais sauvegardé) ; la
carte affiche `sur [0 ; +∞[`, `f'(5)` et l'image de la carte f′ hors de l'ensemble sont refusés.
Pas d'action « Tabuler » (encore désactivée), ni de commande de signe : rien à brancher. Laissés
sur tout le domaine : `.taylor … en a`, `.équivalent`.

**Les suites décidées par David le 2026-10-13** (journal de la phase 0, a-g ; c = futur chantier,
`f(2x)` reste refusé) : **a)** `.domaine f` d'une fonction à ensemble répond « f est définie sur
[0 ; +∞[ (ensemble choisi) ; sans ce choix, elle le serait sur ℝ. », sans la seconde moitié quand
l'ensemble EST le domaine, et « (ensemble hérité) … sans cet héritage » pour une fonction qui le
tient des fonctions qu'elle cite (`chosenDomainAnswer`) ; sans ensemble, rien ne change. **b)**
`.évaluer f en x=5` et `.intégrer f de a à b` hors de l'ensemble sont refusés comme `f(5)`
(`valueOutsideRefusal`, `segmentOutsideRefusal` : la borne qui sort, sinon la partie de [a ; b]
qui sort — un trou d'une réunion ; seule une partie de longueur non nulle compte : une borne
ouverte ou un point exclu ne refusent rien, une divergence est dite par `.intégrer`). `ℝ\{1}` tapé
collé se lit `ℝ \ {1}`. **d)** Une fonction qui CITE une fonction à ensemble en
**hérite** (`g(x) = f(x) + 1` → [0 ; +∞[ ; plusieurs → intersection ; en chaîne ; jusqu'à `g′`) :
`citedIntervals` (points fixes, dans `recomputeAll`) range l'héritage dans
`FunctionObject.inheritedInterval`, jamais sauvegardé, et `intervalDomainOf` le croise avec le
`sur` propre de g — calculs, refus de `g(−2)`, étiquette de la carte et tracé suivent ; le champ
de la carte garde ce que l'élève a écrit. `.résoudre g(x)=5` et `.résoudre f(x)+1=5` donnent
tous deux 2. `g(x) = f(2x)` (décision c) ou un héritage vide passent g en **erreur**, en français.
**e)** `.variations … dans [a;b]` inchangé. **f)** Dans « Sur le graphique » (`CurveSettings`),
une tangente hors de l'ensemble (une borne fermée est dedans) et une aire dont [a ; b] sort
sont refusées, le refus écrit sous le réglage (`tangentRefusal`, `areaRefusal`) ; `plot-sync`
ne les dessine pas (`allowedDisplay`). **g)** Le lien `?f=x^2 sur [0;+∞[` lit « sur »
(`atelierFromCurves`, `splitInterval`).

**Le tracé sur l'intervalle** (lot 3, I5) : `plotRestrictionOf` (`interval.ts`) convertit
l'ensemble en morceaux numériques (`π` → `3,14…`, `ℝ \ {0}` → deux morceaux ; borne non numérique
ou ensemble par conditions → courbe entière) ; `syncPlots` le pose sur la courbe
(`ExplicitFunction.restriction`, comparé par contenu pour rester idempotent). Le grapheur ne trace
que sur l'ensemble : point plein à une borne fermée, creux à une borne ouverte, rien à l'infini ni
là où f n'est pas définie (détail : [grapheur.md](grapheur.md)). `f′`, qui hérite, se trace
restreinte aussi.

**La réciproque** (lot 3 de [atelier-reciproque-phase0.md](../archive/wip/atelier-reciproque-phase0.md),
R1-R4) : le bouton « Réciproque » de la carte d'une fonction et `.réciproque f [sur I]` donnent la
MÊME ligne (`reciprocalResult`, `src/lib/atelier/reciprocal.ts`) — réponse `f⁻¹(x) = …, f⁻¹ : départ
→ arrivée` (R4), étapes de `computeReciprocal` (R3, [mathast/reciproque.md](mathast/reciproque.md))
— et créent la carte `f⁻¹` (`createReciprocal`), sans changer de vue ; déjà là, elle est mise à
jour, pas doublée. L'intervalle : celui tapé après « sur » (rangé dans `reciprocalOn`) CROISÉ avec
l'ensemble de f, recroisé à chaque recalcul (f redéfinie n'est jamais écrasée) — vide : « f n'est
définie que sur [0 ; +∞[. » ; sinon l'ensemble de f, sinon son domaine. **`f⁻¹` tapé dans
Calcul** (décision (1) de David, 2026-10-13) : `f^-1`, `f^{-1}`, `f^(-1)`, `f⁻¹` écrits après une
FONCTION de l'atelier sont réécrits `f^{-1}` (`withReciprocalNotation`, en tête de `computeInput`),
que les deux parseurs lisent comme la réciproque (`isInverse`), puis **calculés à la volée comme
`f'`** : `expandDerivatives` (`engine.ts`) remplace le nœud par la formule de
`atelier.reciprocalOutcome(f)` — `f⁻¹(5)` sa valeur, `f⁻¹` seule la fonction (`.variations f⁻¹`,
`.dériver f⁻¹`, `.résoudre f⁻¹(x)=2`), `g(x) = f⁻¹(x)` une g qui suit f. Aucune carte requise ;
si la carte existe, son intervalle tapé (`reciprocalOn`) sert aussi, pour dire la même chose.
Refus (`reciprocalRefusalIn`) : f sans réciproque → celui de `.réciproque f` ; `f⁻¹(5)` hors de
l'ensemble de départ → celui de `f(5)` hors intervalle. `.variations` et `.résoudre` étudient sur
l'ensemble de départ de f⁻¹ (`citedReciprocalInterval`). Une g qui cite `f⁻¹` passe en erreur avec
le refus quand f cesse d'être bijective (`#underivable`). ⚠️ Calculer `f⁻¹` relit les autres objets,
dont g : une réciproque redemandée en cours de calcul est indisponible (`resolving`), l'objet qui la
cite est laissé de côté ; les formules sont gardées tant que l'atelier ne change pas (`formulas`, sinon cinq réciproques citées coûtaient 11 s). L'argument de `f⁻¹(…)` est vérifié sur l'arbre (`f⁻¹(g(2))`, `\left(…\right)`). Un nom à indice (`f_1⁻¹`) est refusé (garde de l'atelier, posée quand les parseurs y lisaient une puissance ; ils lisent `f_1(…)` depuis le 2026-10-15, la réciproque d'une fonction à indice reste à ouvrir) ; `f⁻¹(x) = 5x` aussi : elle se calcule, elle ne se définit pas. `g(x) = f⁻¹(x)` hérite de l'ensemble de DÉPART de f⁻¹ (`citedIntervals` reçoit `citedReciprocalInterval`), et l'empreinte du moteur (`atelierMark`) contient les ensembles : f qui change d'ensemble change g. En erreur, `g(4)` rend le message de g. L'inverse s'écrit `1/f(x)` ou `f(x)^-1` ; `x^-1`, `2^-1`, `a^-1` restent
des puissances. `.réciproque f⁻¹` répond « La réciproque de f⁻¹, c'est f. ». La carte **suit f** (`#reciprocals`, en
dernier dans `recomputeAll`) : formule rangée en texte (provenance `text`), `interval` = son
ensemble de départ f(I) (Q5 : le tracé et les calculs suivent, `ℝ` n'est pas rangé) ; f devenue
non bijective, constante… → la carte passe en erreur avec le refus, définition vide (rien de
tracé). Elle dépend de f seule (`#refsOf`) : supprimer f l'emporte, renommer f la renomme, sa
lettre est celle de f. Pas de « Dériver » ni de « Réciproque » sur `f⁻¹`, ni de « Réciproque » sur
`f′` (raison affichée : taper la formule). L'image `f⁻¹(5)` de la carte passe par sa formule (le
moteur lirait `f^-1` comme une puissance) ; de même l'image depuis la carte `f′` (le moteur lit
`f'(1)` comme la dérivée d'une fonction qu'il n'a pas : « Impossible de calculer f′(1) » jusqu'au
2026-10-14). `.réciproque a x + b` sans carte pour a, b : le refus de toute commande à paramètres
(« Le résultat dépend de a et b… ») ; sans x et à plusieurs lettres (`a t + b`) : « je ne sais pas
quelle lettre est la variable ». `dependsOnMessage` écrit les lettres grecques en symboles (α), et
ne propose pas `α = 2`, qui ne définit rien (lu comme un test d'égalité). **Droite y = x** (décision (3)) : grise
(`--color-muted-foreground`), en pointillés, tracée d'office par `syncPlots` quand f ET sa carte
`f⁻¹` sont tracées et sans erreur ; retirée dès que l'une est masquée, supprimée ou en erreur. Pas
une carte : elle n'existe que dans le grapheur, rien n'est sauvegardé. Une **expression** (`.réciproque 2x+3`) donne la ligne
seule, sans carte. **Paramètres** (cas 1 de David) : f cite des valeurs (`a x + b`, curseurs) →
la réciproque est jugée avec leurs valeurs actuelles, puis écrite avec leurs lettres quand le
solveur résout `y = a x + b` et que sa solution coïncide, valeurs remplacées, sur des points du
départ (`(x − b)/a`) ; sinon la formule garde les nombres (`a eˣ` → `ln(x/2)`, recalculée à chaque
cran). Un refus le dit avec les valeurs (« Pour a = 0 et b = 3, f est constante : pas de
réciproque. ») ; la ligne de Calcul dit avec quelles valeurs les étapes sont faites. Les refus
`not-bijective` citent leurs formules en `$…$` : Calcul et la carte les composent
(`FormulaText.svelte`, drapeau `formulas` de la ligne). Calculs mis en cache (64 entrées) :
`recomputeAll` refait la carte à chaque mutation.

**Provenance** (D10, `Provenance` dans `src/lib/atelier/parse.ts`) : c'est _d'où vient_ la
définition (champ MathLive, clavier, URL, collage, Calcul…) qui choisit le parseur, jamais son
contenu. Elle est rangée sur l'objet, parce que `recomputeAll` relit toujours la définition.

**État d'affichage hors sauvegarde** : les diagrammes de la vue Données (`chartOf`,
`toggleChart`) et les lois retenues (`rememberLaw`, `lawOf`) vivent dans l'`Atelier` mais pas
dans `serialize()`. (La partenaire choisie, `choosePartner`, est retirée depuis le lot 4b : le
sous-menu « Avec une autre liste » propose chaque partenaire par son nom.)

**Affichage rangé sans nouvelle version** (lot 4b) : le dessin d'un point ou d'une courbe
(`figureDisplay`) et le curseur affiché depuis le menu (`sliderShown`) ne sont rangés que
lorsqu'ils s'écartent du défaut ; un ancien état se relit tel quel. Contrepartie, la même que la
lecture graphique (#1497) : un onglet resté sur l'ancien code les oublie (Zod retire la clé) —
un affichage, jamais un objet.

### La grille (vue Données)

Tableur intégré, lot 1 (phase 0 : [atelier-tableur-phase0.md](../archive/wip/atelier-tableur-phase0.md),
décisions de David du 2026-10-15 ; journal : [atelier-tableur-progress.md](../archive/wip/atelier-tableur-progress.md)).
Une cellule est du texte brut ; une cellule qui commence par `=` est une **formule** (lot 2, phase
0 : [atelier-tableur-lot2-phase0.md](../archive/wip/atelier-tableur-lot2-phase0.md), validée le
2026-10-15).

- **Formules** (`formula.ts`) : écrites comme une ligne de Calcul en texte (virgule décimale, `;`
  entre les arguments, jamais réparties vers le bas). `a2` est relu `A2` (`normalizeFormula`), mais
  `1e5` reste la notation scientifique (un `e` minuscule collé à un chiffre). Chaque référence
  (`A2`, `$A$2`) devient une marque `(ω_k)` avant la lecture — les parenthèses la gardent entière
  sous un exposant (`2^A1`, `2^-A1`) —, puis la valeur de la cellule la remplace dans l'arbre (le
  texte d'une valeur ne repasse jamais par le parseur). Les objets de
  l'atelier passent par `gridContext` (`engine.ts`), préparé une fois par recalcul : `f'`, `f⁻¹`,
  suites (`u(4)` ; une récurrence lit ses termes calculés, en décimal), valeurs et fonctions ; `f`
  hors de son ensemble donne le refus de Calcul (`outsideIntervalMessage`), contrôlé APRÈS le
  remplacement des valeurs de l'atelier (`=f(b)`), `f′` nommée avec ses primes ; rang d'une suite
  (« Le rang de u doit être un entier positif. ») ; une grandeur à unité citée est refusée (pas
  d'unités dans les cellules).
- **Calcul** (`computeGrid`) : parcours en profondeur (ordre, cycles), valeur EXACTE ; une cellule
  dont le calcul exact a pris plus de 20 ms rend ses dépendantes décimales (repli après coup : un
  calcul exact ne s'interrompt pas, mesuré) ; une valeur exacte plus longue que 24 caractères
  entre en décimal dans les formules qui la citent (`MAX_EXACT_CITED` : une colonne d'intérêts
  composés faisait grossir les fractions, et une racine de la dernière gelait l'onglet). `cellValue` rend `empty` (avec « A1 est vide. » pour
  une formule qui cite une case vide, T5), `number` (`shown` : l'écriture exacte si elle tient en
  12 caractères et n'a pas de lettres, sinon `≈` et 4 décimales — Q2 ; `latex` : l'écriture
  mathématique de la case quand elle est exacte et courte, `\frac` et non `\dfrac` ; `exactLatex` :
  l'écriture exacte complète, bornée), `word`, ou `error` (`label` « erreur » ou
  « cycle », la phrase dans `message` — Q-L2-1). Refus en français : formule illisible, mot cité,
  nombre non réel (`sqrt(-1)`, `i`), logarithme d'un nombre négatif ou nul, nom inconnu (« k n’est pas défini dans l’atelier : crée-le dans Mes objets (k = 2). », Q-L2-3),
  liste ou fonction citée comme un nombre, cellule hors de A1-Z200, division par zéro, cycle
  (« Cycle : A1 dépend d’elle-même (par B1). »), dépendance en erreur.
- **Recalcul ciblé** : à la fin de `recomputeAll` et après une saisie dans une colonne sans nom
  (`#recomputeGrid`). L'état précédent (`GridState` : valeurs, textes, empreinte de chaque objet)
  est gardé : seules les formules dont le texte, une cellule citée ou un objet cité (ou un objet
  qui en dépend) a changé sont refaites, puis celles qui les citent (`lastGridComputed` le compte).
  Un curseur glissé ne refait que les cellules qui le citent. Une colonne nommée à formules est une liste dont les valeurs
  sont celles des formules (`#formulaList` ; erreurs comptées dans `formulaErrors`, leurs lignes
  sans valeur). T2 : `update` refuse de modifier une telle liste (« L est calculée dans la grille… »),
  sauf quand c'est la grille qui écrit.
- **Vue** : la case compose `latex` en écriture mathématique (MathLive, `{@html}` après
  `isSafeLatex` — une formule peut venir d'un lien reçu ; rendu mis en cache par texte LaTeX),
  sinon `shown` (ou le mot court d'une erreur, en rouge) ; son étiquette pour lecteur d'écran est
  `shown`, en français (la lecture de MathLive est en anglais). La barre montre la formule ; sous
  la barre, la phrase de l'erreur ou de la case vide, et « Valeur exacte : … » quand la case montre
  `≈` d'une valeur exacte, ou une écriture exacte dont le texte lu est `≈` (`√2`, `π`) (Q2). La carte d'une liste à formules montre ses valeurs et « calculée
  dans la grille » (`studentDefinitionOf`). Supprimer une liste dont des cellules d'autres colonnes
  se videront (`citingCells` : en chaîne, sans celles déjà vides) demande confirmation : « 3 cellules de la grille la citent : elles
  deviendront vides. » (`citingCellsNote`). La copie vers un autre logiciel et le CSV
  emportent les VALEURS des formules ; la copie interne garde la formule.
- **Recopier** (§5) : `fillDown(zone)` recopie la première ligne de la zone sur les suivantes,
  un seul geste (T6) ; `shiftFormula` décale les références relatives, `$` les fige, une valeur se
  recopie telle quelle (pas de série devinée) ; une référence poussée hors de la grille devient
  `#HORS` (« Référence hors de la grille (après une recopie). »). Trois gestes (Q-L2-2) : Ctrl/⌘+D
  (une case seule reçoit celle du dessus), la poignée au coin de la zone (cases visées teintées),
  le bouton « Recopier vers le bas… » (« jusqu'à la ligne », pour la tablette). Le copier-coller
  DANS la grille décale aussi (Q-L2-4) : le presse-papiers propre à la grille porte la case
  d'origine (`{ origin, cells }`), et `pasteTable(…, origin)` décale sans deviner de titres ni
  refuser le « ; » d'une formule.
- **Lien** (§7) : `encodeAtelier` écrit les formules en relatif (`toRelative` :
  `=0,8*{0:-1}+$A$1`, `grid.relative`) ; `decodeAtelier` les réécrit AVANT le tri
  (`fromRelativeText`, sur les seules formules : un texte `{0:1}` tapé par l'élève reste tel
  quel), le plafond d'une cellule valant pour l'écriture rangée.
- **Atelier reçu** (T7) : `remapColumns` fait suivre à chaque référence, relative ou absolue, la
  colonne où la sienne a été placée ; une colonne non arrivée devient `#HORS`. Un objet renommé à
  l'arrivée (`f` → `g`) l'est aussi dans les formules reçues (`=f(3)` → `=g(3)`), jamais dans une
  référence de même lettre (`L2`) — sinon la formule calculait avec la `f` locale, sans rien dire.
- **Le « ; » d'une formule dans une colonne nommée** est rangé `⁏` (`FORMULA_SEMICOLON`) dans la
  définition de la liste, dont « ; » sépare les entrées — sinon `=max(1 ; A1)` était coupée en deux.
  Une cellule sans nom le range de même (`storedCellText` / `cellTextFromStored`) : une cellule
  rangée n'a jamais de « ; » (P2), et la formule était écartée au stockage et dans le lien.
- **Affichage** : une valeur exacte faite de chiffres (`3`, `2,5`, `1/3`) s'écrit en texte,
  comme un nombre tapé ; l'écriture mathématique est réservée à ce qui a des lettres (`√2`, `3π`).
  **Un décimal fini s'écrit en décimal** (lot 3, Q-L3-2) : `=-2+0,5` → `-1,5`, `=27/4` → `6,75`,
  calculé en entiers longs (`finiteDecimal`), jamais arrondi ; `1/3` et un décimal de plus de 12
  caractères (`1/1048576`) gardent leur fraction. La fraction se voit alors sous la barre (« Valeur
  exacte »), comme pour un `≈` — **seulement si le calcul contient une division** (décision de
  David du 2026-10-15, option 3). L'origine VOYAGE avec la valeur (`divided` de `CellValue`) : une
  formule exacte citée entre sous la forme de sa fraction (`=0,25` → 1/4), qu'on ne distinguerait
  plus d'une division écrite (revue). Une formule divise si son arbre AVANT injection en contient une
  (`ownDivision` ; développé seulement quand elle cite un objet, `f(x) = x/2`), si une case citée ou
  un appel divise (MOYENNE, écart type, médiane d'un nombre pair ; ARRONDI jamais ; les autres
  suivent leurs arguments). Une notation scientifique tapée (`1e-3`) s'écrit en clair
  (`plainDecimal`), pas en puissance négative :
  `=1/4`, `=6:8`, une MOYENNE, une case citée qui vient d'une division la montrent ; un décimal tapé
  (`=0,25`), une somme de décimaux, un ARRONDI (`=ARRONDI(PI();4)` ne montre plus 3927/1250), un
  `f(-1,5)` sans division la masquent. `shownExact` dit si la case montre déjà ce qui compte. Une
  valeur TAPÉE (sans `=`) s'écrit telle quelle (`1/4` reste `1/4`).
- **Tabuler** (lot 3, phase 0 : [atelier-tableur-lot3-phase0.md](../archive/wip/atelier-tableur-lot3-phase0.md),
  validée le 2026-10-15) : `Atelier.tabulate({ name, from, to, step })` écrit, dans les deux
  premières colonnes libres, les abscisses (`-2`, `=A1+0,5`, `=A2+0,5`…) et les images (`=f(A1)`…),
  titrées `x` et `f(x)` (la lettre de l'élève : `t`, `f(t)`) — un tableau **vivant**, en un seul
  geste (T6). `planTabulation` (`tabulate.ts`) prépare et refuse, tout ou rien : pas ⩽ 0, fin avant
  le début, borne illisible ou vide, plus de 200 lignes, moins de deux colonnes libres, objet qui
  n'est pas une fonction ; une fonction en attente (`f(x) = k*x` sans k : la phrase de Calcul) et une
  réciproque `f⁻¹` (la grille ne sait pas encore l'appeler) ; une fonction à indice `f_1` se tabule
  depuis que le parseur lit `f_1(…)` comme un appel (2026-10-15). Un pas
  qui ne tombe pas juste s'arrête à la dernière abscisse ⩽ fin, et une note la dit telle que la case
  la montre (`12/7`). Tabuler deux fois écrit deux nouvelles colonnes (Q-L3-4). Valeurs par défaut
  (`tabulationDefaults`, Q-L3-3) : de −5 à 5 pas 1, ou les bornes d'un intervalle fermé `[a ; b]`
  (pas 1, ou (b − a)/10 arrondi à l'entier supérieur au-delà de 20 — jamais un pas flottant). `.tabuler f de -2 à 3 pas 0,5` (ou `.tabuler f`) passe par
  `tabulateCommand`, branchée avec les commandes qui lisent des NOMS (`SIMULATIONS` de
  `calcul.ts`) ; une expression sans nom est refusée avec la façon de faire (Q-L2-3). Le décor de
  son exemple (`exampleSetup: { 'f(x)': … }`) est posé par `stageExampleSetup` (`commands.ts`).
  **Depuis la carte** (PR 2) : « Tabuler » (retiré de `NOT_YET` ; grisé avec sa raison pour `f⁻¹`,
  `tabulationNotYet`) ouvre DANS la carte un formulaire « de / à / pas » pré-rempli par
  `tabulationDefaults`, comme le champ de l'image. Valider appelle `onTabulate` →
  `handleTabulate` (`AtelierContainer`) : `atelier.tabulate`, puis la vue passe sur Données
  (Q-L3-1), recréée (`{#key}`) avec la zone du tableau sélectionnée (`initialZone` de `DataView`,
  lue à la création ; deux colonnes non voisines → la première case seule, pour ne pas englober
  une colonne de l'élève). La zone ne vaut qu'à l'arrivée : `showView` la remet à `null`, un
  retour par l'onglet ne la resélectionne pas ; à l'arrivée, le focus passe à la grille
  (`onMount`), pour que Ctrl+Z et Entrée y agissent. Réussi, le formulaire se referme (une seconde
  Entrée n'écrit pas un second tableau) ; la phrase de `tabulationReport` (ou le refus) s'écrit
  dans une région `role="status"` de la carte, toujours présente, seule annonce, et s'efface dès
  que la grille change (`atelier.revision`, comme l'image). Refermer la carte referme le
  formulaire. Aucune ligne dans Calcul.
- **Fonctions du tableur** (lot 4, phase 0 :
  [atelier-tableur-lot4-phase0.md](../archive/wip/atelier-tableur-lot4-phase0.md), validée le 2026-10-15) :
  une couche AVANT mathAST (Q-L4-1). `findCalls` (`grid-functions.ts`) repère les appels SOMME,
  MOYENNE, MEDIANE, MIN, MAX, NB, ECARTYPE (n − 1), ECARTYPEP (n) ; chacun devient une marque
  `(ψ_k)`, comme une case devient `(ω_k)`, et chaque argument est lu par la même lecture
  (`readBody`, récursive : `SOMME(MAX(A1:A4);1)`). Un argument est une plage (`A2:A21`, `A:A` = A1
  à A200, `readRange`), le nom d'une liste (sa colonne, Q-L4-3) ou une expression. Les cases vides
  et les mots d'une plage sont ignorés (Q-L4-2, exception à T5) — une case citée SEULE en argument
  (`=MIN(A1;A9)`) se lit comme une plage d'une case, comme LibreOffice ; une case en erreur la transmet
  (« A5 est en erreur. »). `computeFunction` rend l'ARBRE exact du résultat, en somme équilibrée
  (profondeur log₂ n : une somme de 200 cases écrite à la suite dépassait la garde de profondeur
  100 de mathAST et levait une exception) ; l'écart type calcule la moyenne UNE fois (recopiée dans
  chaque carré, l'arbre était en n² : 750 ms pour 200 cases). Dépendances : les cases des plages et la colonne d'une
  liste nommée (`deps`, `dependenciesOf`) entrent dans l'ordre de calcul, les cycles et le
  recalcul ciblé. Une plage hors d'une fonction est refusée (`=C1:C2` valait 0,6 en silence, `:`
  étant une division) ; mêlée à un calcul dans un argument aussi. Un nom inconnu en capitales
  (`MOYENE(`) dit les fonctions de la grille. `normalizeFormula` réécrit les noms en capitales sans
  accent (Q-L4-7) — `=max(1;2)` devient `=MAX(1;2)`. **`A:A` n'est une colonne qu'en argument
  direct d'une fonction** (`mapCallArguments`, `columnRangeOf`) : ailleurs, `=a:b` reste la
  division du collège, ni réécrite ni refusée (revue : elle devenait `=A:B`, refusée). En argument,
  `a:a` s'écrit `A:A` et suit les colonnes à la recopie et pour un atelier reçu
  (`mapColumnRanges`) ; `A2:A21` se décale comme deux
  références. `referencesIn` ne compte pas les plages (une plage qui se vide ne vide pas la
  formule). Une exception du moteur pendant le calcul d'une case devient l'erreur de cette case
  (`safely`), jamais celle de la grille. Mesuré : 600 formules à plages, 285 ms ; changer la case
  dont elles dépendent toutes, 250 ms.
- **Compter les cases** (phase 0 :
  [atelier-tableur-nbval-phase0.md](../archive/wip/atelier-tableur-nbval-phase0.md), validée le
  2026-10-18) : `NBVAL(plage ; …)` compte les cases non vides (nombres et mots, tapés ou rendus par
  une formule), `NB.VIDE(plage)` les vides (`COUNT_FUNCTIONS`, `countCells`, `formula.ts`). Une
  case est vide si elle MONTRE du vide : une formule qui rend `""` compte comme vide pour les deux
  (Q-NV-1, à l'inverse d'Excel : NBVAL + NB.VIDE = la taille de la plage). Une case en erreur
  arrête le compte (Q-NV-2, comme NB). NBVAL lit comme NB : plusieurs plages, case seule, liste
  nommée (sa colonne), colonne entière, valeur (`NBVAL(3)` = 1). NB.VIDE prend UNE plage ; une
  colonne entière est refusée (Q-NV-3 : le résultat dépendrait des 200 lignes de la grille) ; une
  liste nommée compte ses trous de sa première ligne à sa dernière valeur (Q-NV-4 : `12 ; ; 15`
  → 1, ` ; 12 ; ; 15` → 2) ; un nom qui n'est pas une liste est nommé dans le refus. Dans Calcul,
  `nbval(L)` renvoie vers `.stats L`, `nb.vide(L)` vers la grille seulement. `NB.SI(plage;"")` vaut toujours 0 (NB.SI ignore les
  vides, lot 4) : NB.VIDE y répond.
- **Fonctions de calcul** (lot 4, PR 2) : ARRONDI, ENT, RACINE, ABS, LN, EXP, PI (`CALCULATION_ARITY`,
  nombre d'arguments fixe, refus nommé). RACINE, ABS, LN, EXP et ENT deviennent l'appel de mathAST
  (`sqrt`, `abs`, `ln`, `exp`, `floor`) : mêmes refus que Calcul. ARRONDI arrondit la moitié LOIN
  DE ZÉRO (−2,5 → −3, comme LibreOffice), en entiers longs quand x est une fraction (2,675 → 2,68,
  là où les flottants donnent 2,67), et accepte n < 0 (`ARRONDI(1234;-2)` = 1200). n est borné à
  ±15 (`MAX_ROUNDING_DIGITS` : `ARRONDI(1/3;1000000)` gelait l'onglet) ; sur un flottant (π, √2),
  un résultat de plus de 15 chiffres significatifs est approché, jamais présenté comme exact. Leurs arguments
  sont des nombres : une plage est refusée, et une case vide citée laisse la formule vide (T5), à
  l'inverse des statistiques. **RESTE(n ; d)** (repris de V4, phase 0 :
  [atelier-tableur-reste-et-ou-csv-phase0.md](../archive/wip/atelier-tableur-reste-et-ou-csv-phase0.md),
  validée le 2026-10-18), du signe du diviseur comme LibreOffice (`RESTE(-7;3)` = 2, le reste
  euclidien) : deux arguments exacts → en entiers longs (`remainder`, `RESTE(10^20+1;7)` = 3,
  `RESTE(2/3;1/2)` = 1/6) ; sinon l'arbre `n − d × floor(n/d)`, approché, REFUSÉ quand le
  quotient dépasse 2⁵³ (revue : `RESTE(EXP(50);3)` rendait du bruit). Un argument approché
  (`ArgumentValue.approximate` : une case ≈, ou une écriture exacte trop longue entrée en décimal,
  `MAX_EXACT_CITED`) ne passe jamais par les entiers longs : `RESTE(10^30+1;7)` est refusé, pas
  « ≈ 5 ». `d = 0` refusé avant tout calcul ; l'aide dit que le quotient est `ENT(n/d)`. Pas de QUOTIENT
  (Q-RE-6) : `ENT(n/d)` va avec RESTE (−3 et 2), QUOTIENT de LibreOffice non. `=racine(4)`, `=exp(1)` s'écrivent `=RACINE(4)`, `=EXP(1)` ; `sqrt`
  reste lu. **L'aide sous la barre** (`functionHint`) : pendant la frappe, la forme de la fonction
  dont on écrit les arguments (la plus intérieure), ou celles dont on écrit le nom (`=ECART`, trois
  lettres au moins, ou un nom entier de deux : LN, NB, PI — `=A1*ab` n'ouvre pas ABS) ;
  liée à la barre par `aria-describedby`, jamais annoncée à chaque frappe.
- **Conditions et texte** (lot 4, PR 3, Q-L4-5) : SI et NB.SI. Un texte entre guillemets droits
  (`"fille"`) ne s'écrit qu'en branche de SI, en critère de NB.SI ou dans une condition ; ailleurs
  il est refusé (`TEXT_ALONE_MESSAGE`), et un guillemet non fermé aussi. Les comparaisons (`<`, `>`,
  `<=`, `>=`, `=`, `<>`) ne s'écrivent que dans la condition de SI (`splitComparison`) ; hors de SI,
  refus (`COMPARISON_ALONE_MESSAGE`, au lieu de « pas un nombre réel »). Un côté de la condition est
  un texte, une case (son mot se compare : `B2="fille"`) ou une expression ; un mot ne se compare
  qu'avec `=` ou `<>`, sans tenir compte des majuscules (`compare`). Une case vide dans la condition
  laisse la formule vide (T5 : recopiée sous les données, elle n'écrit rien). **ET, OU** (Q-RE-1 à
  Q-RE-3) : la condition de SI peut être `ET(comparaison ; …)` ou `OU(…)` formant TOUT l'argument
  (`logicCallOf`, `readLogic`, parenthèses englobantes ôtées) ; chaque argument est lu comme une condition (`readComparison`), au
  moins un ; toutes les comparaisons sont calculées, une case vide ou une erreur arrête la formule
  comme pour SI. Un seul niveau : ET dans OU (ou dans ET) refusé (« écris deux SI ») ; ET ou OU
  ailleurs refusé avec la bonne écriture (`logicAloneMessage` : la grille n'a pas de valeur
  VRAI/FAUX). Pas de NON (Q-RE-1). Seule la branche
  choisie est calculée ; un mot rendu par SI fait de la case une case de mots si la formule n'est
  que l'appel (`alone`), sinon refus. NB.SI compte les cases non vides d'une plage (ou d'une liste
  nommée) qui vérifient le critère : un mot, un nombre, ou une comparaison écrite en texte
  (`">=10"`, `"<>0"`, virgule décimale comprise, `criterionOf`). Les guillemets protègent leur texte
  partout (`outsideQuotes`) : ni recopie, ni capitales (`"a1"` reste `"a1"`), et un `;` ou une
  parenthèse dedans ne coupe rien. **Calcul** renvoie vers la grille (Q-L4-6,
  `gridFunctionInCalcul`) : `somme(L)` → « SOMME est une fonction de la grille… tape .stats L »,
  `racine(2)` → « …dans Calcul, écris sqrt(…) ». Le renvoi repère aussi un APPEL de fonction de la
  grille que le moteur ne signalait pas (`gridFunctionCalledIn`) : `mediane(L)` était recopié sans
  être calculé, `médiane(L)` lu « Fonction inconnue : diane » (2026-10-15) ; `max`, `min`, `abs`,
  `ln`, `exp`, que Calcul connaît, restent des calculs, comme un nom de deux lettres sans point
  (`nb(…)`, `si(…)` : des produits, la règle de `readFunctionCall`). `pi` en lettres est refusé dans la grille
  comme dans Calcul (`PI_IN_LETTERS`, `names.ts`, décision de David du 2026-10-06), et dans la
  grille en toutes casses (`=PI`, `=Pi`) hors des guillemets ; `PI()` et `π` restent lus. `plainSyntax` ramène au tableur les guillemets
  courbes ou français (`“fille”`, `«fille»` : la ponctuation intelligente de l'iPad) et `≤ ≥ ≠` ;
  la barre et les cases ont `autocorrect="off"`. Le critère de NB.SI peut être une case seule, dont
  le mot compte (`=NB.SI(B$2:B$30;B2)`).
- **Le hasard** (lot 5, phase 0 : [atelier-tableur-lot5-phase0.md](../archive/wip/atelier-tableur-lot5-phase0.md),
  validée le 2026-10-15) : `ALEA()` (dans [0 ; 1[, approché) et `ALEA.ENTRE.BORNES(a ; b)` (entier
  exact ; a ⩽ b entiers sûrs, au plus un million d’issues, sinon refus). Un tirage ne dépend que de la **graine**
  de l'atelier (`gridSeed`), de l'adresse de la case et du rang de l'appel dans sa formule
  (`drawOf`, `occurrence` fixé à la lecture) : ni de l'ordre de calcul, ni des autres cases ; écrire
  ailleurs, recharger, réécrire la case à l'identique ne le changent pas (T8, Q-L5-5).
  `Atelier.relaunch()` change la graine : les formules à hasard (`random`, même emboîté) et ce qui
  les cite se recalculent (`GridState.seed`, `spreadDirty`). La graine est rangée (`grid.seed`,
  bornée par Zod) seulement si une case tire au hasard, et voyage dans le lien (Q-L5-4). Dans Calcul,
  `alea()` renvoie vers la grille. **Le bouton « Relancer »** (PR 2, Q-L5-2) est à côté de la barre,
  seulement s'il y a des cases à hasard (`randomCells`) ; F9 fait de même tant que la vue Données
  est là (`svelte:window`), et une région `role="status"` annonce « Nouveaux tirages : N cases. ».
  « Relancer » est une étape de la pile commune (la graine est dans la photo) : Ctrl+Z retrouve les
  tirages d'avant, Ctrl+Y ceux d'après (Q-L5-3) ; après un clic, le focus revient à la grille pour
  que Ctrl+Z y agisse. F9 maintenu (répétition) ou avec Ctrl/⌘/Alt ne relance pas : la pile (100
  étapes) ne se vide pas de tirages. Garder un atelier reçu qui tirait au hasard refait ses tirages (la graine
  reste la nôtre) : le rapport le dit si des cases à hasard ont vraiment été écrites
  (`MergeReport.redrawn`, d'après `randomCells` avant et après).
- **Mise en forme** (reprise de V4, phase 0 :
  [atelier-tableur-mise-en-forme-phase0.md](../archive/wip/atelier-tableur-mise-en-forme-phase0.md), validée le
  2026-10-18) : gras, italique, alignement, couleur du texte et du fond (6 couleurs du thème), format
  de nombre (décimales 0 à 6, pourcentage, monnaie). Rangée PAR ZONE (`FormatZone`, `#formats` de
  l'`Atelier`) sous forme CANONIQUE après chaque geste (`normalizeFormats`) : des rectangles qui ne
  se chevauchent pas, chacun d'un style résolu non vide — effacer toute la grille laisse `[]`, un bloc
  collé redevient un rectangle, un geste sans effet n'est pas noté (`sameFormats`). Revue de la PR 1 :
  les zones s'empilaient (400 par collage, « Effacer » refusé au plafond, lien trop long). `false`/
  `null` d'un patch ramène au défaut (`CLEAR_PATCH`). Elle ne change que l'AFFICHAGE (`formatShown`,
  `Intl.NumberFormat` fr-FR sans groupement, puis espaces dès 5 chiffres, règle du BIPM — `1234,5`,
  `12 345,00 €` —, moitié loin de zéro, jamais `-0,00`) : une formule cite la valeur. Une
  case vide se met en forme d'avance ; la vider garde sa mise en forme. Un geste de la grille
  (une étape, Ctrl+Z) ; la recopie et le copier-coller interne l'emportent (`patchOf`,
  Q-MF-4), et sont refusés ENTIERS si elle dépasserait le plafond (jugé avant d'écrire). Rangée dans
  `grid.formats` (Zod, une forgée écartée seule, au plus 500 relues ; au-delà de 500 zones
  canoniques, la plus longue partie qui tient, signalée dans le rapport) et dans le lien (Q-MF-5).
  Un style s'écrit dans un ordre fixe (`canonicalStyle`) ; « Effacer » passe même au plafond
  (`isRemoval`). Un
  atelier reçu : ses zones suivent leurs colonnes (T7) ; une colonne qui n'a QUE de la mise en forme
  arrive s'il reste des colonnes libres (rangée avec les autres, de gauche à droite), sans jamais
  faire refuser la fusion ; la fusion est un seul
  geste (`asOneGesture`). Plafond : 500 zones canoniques. Mesuré : un style sur toute la grille, 2 ms.
  **À l'écran** (`DataView.svelte`, PR 2) : une barre « Mise en forme » sous la barre de formule
  (`role="group"`, passe à la ligne sur téléphone) pose sur la ZONE sélectionnée gras, italique
  (aussi Ctrl/⌘+B, +I), alignements (un bouton enfoncé ramène au défaut), couleurs du texte et du
  fond, format de nombre et décimales (`MySelect`, nom annonçant la valeur choisie), « Effacer la
  mise en forme ». Les boutons suivent la case active (`aria-pressed`) ; le focus revient à la
  grille après chaque geste, pour que Ctrl+Z y agisse ; les choix sont liés par fonctions
  (`bind:value={get, set}`) : un choix refusé au plafond n'est pas affiché comme posé. Rien n'est
  posé pendant une frappe refusée (le refus reste). Ctrl+Maj+B et la touche maintenue sont ignorés. La case montre `formatShown` à la place de
  l'écriture LaTeX ; sous la barre, « Valeur exacte » reste visible quand un format arrondit
  vraiment (`formatRounds` : `0,33` → 1/3 ; pas pour `2,00`). Le style passe en variables CSS (`--texte`, `--fond`) : la teinte de la
  sélection se pose PAR-DESSUS le fond. Couleurs (`cell-colors.ts`) : les `--color-fig-<nom>` du
  thème, adoucies (texte tiré vers `--color-foreground`, fond en teinte de 14 %, en sombre sur
  `#1f1f1f`) — telles quelles, rouge sur fond jaune tombait à 3,3 en sombre ; `cell-colors.test.ts`
  mesure toutes les paires des couleurs de mise en forme (≥ 4,5, sélection comprise, clair et sombre ; le texte d'une erreur garde `--color-destructive`, hors de cette mesure). Le presse-papiers interne
  (`application/x-chiphre-grille`) porte `styles` (le style résolu de chaque case, `{}` = défaut),
  validé par `stylePatchSchema` et ignoré s'il n'a pas la forme du tableau ou pas d'origine valable
  (une ligne de titres devinée les décalerait).
- **Fonction à indice** (`=f_1(3)`) : depuis le 2026-10-15, les parseurs lisent `f_1(3)` comme
  un appel de f_1 quand `f_1` est déclarée (avant : `f₁ × 3`, et la grille calculait avec f, sans
  rien dire — revue du lot 3). La grille rend donc la valeur de f_1, et Calcul l'évalue aussi ;
  `.tabuler f_1` marche. `f_1` cité sans valeur (`=2f_1`) reste l'indice `f₁` : la grille le refuse
  en donnant la bonne écriture (`indexedFunctionMessage` : « écris-la avec une valeur, par exemple
  f_1(3) »).
- **Oracle** : `formules.test.ts` compare, sur un corpus, la valeur d'une cellule `=expr` à celle de
  Calcul pour `expr`.

- **Une liste est une colonne nommée** (T1). Ses cellules sont les entrées de sa définition, une
  par ligne : `12 ;  ; 15` = la ligne 2 est vide (`entriesOf`, `definitionFrom`, `grid.ts`). Les
  colonnes **sans nom** gardent leurs cellules dans l'`Atelier` (`cells`, rangées). **Chaque
  cellule a un seul propriétaire** : la liste de sa colonne, ou la grille.
- **26 colonnes (A-Z) × 200 lignes** (`GRID_COLUMNS`, `GRID_ROWS` = `MAX_LIST_VALUES`), une
  cellule de 200 caractères au plus (`MAX_CELL_LENGTH`).
- **Une cellule se lit comme une entrée de liste** (`readListValue` : `1,5`, `1.5`, `1/6`, sinon un
  mot) ; une entrée vide n'est pas une valeur ignorée. Un texte avec « ; » se **répartit vers le
  bas** (P2, `spreadText`).
- `editCells` écrit un geste entier, tout ou rien : hors de A1-Z200, trop long, au-delà de la
  ligne 200, ou une colonne nommée dont la définition dépasserait `MAX_DEFINITION_LENGTH` (elle
  serait écartée au rechargement, cellules comprises ; `nameColumn` refuse de même) → refus, rien
  n'est écrit. Un geste sans effet ne compte pas (sinon « Annuler » une suppression deviendrait
  impossible). Une colonne nommée est réécrite par `update` (la liste garde sa colonne) ; une
  colonne sans nom fait seulement monter `revision`. Un « ; » final n'écrit rien en dessous.
- **Créer une liste** (« + Liste », `L = …` dans Calcul, `.simuler`, `.filtrer`, « Garder ») prend
  la **première colonne libre** (ni liste, ni cellule, ni titre) ; aucune → « La grille est pleine : vide une
  colonne pour créer une liste. ». `nameColumn` fait d'une colonne remplie une liste (refus de nom
  d'aujourd'hui, `MAX_LISTS`) ; `unnameColumn` supprime la liste (cascade) et **garde les
  cellules** et le titre, annulable par `undoRemoval`. Supprimer la liste depuis sa carte **vide sa
  colonne**, titre compris (T3).
- **Titres de colonnes** (T4) : texte libre de 40 caractères au plus (`MAX_TITLE_LENGTH`),
  `titleOf` / `setTitle`, de toute colonne, nommée ou non ; rangés (`grid.titles`, par lettre),
  suivent la fusion. Une colonne DEMANDÉE (relecture, fusion, nommage) peut porter un titre ; la
  recherche d'une colonne libre les évite.
- **Coller** (`pasteTable`, `readTable`) : lignes puis tabulations (LibreOffice, Excel, Google
  Sheets, page web) ; sans tabulation, des « ; » sur chaque ligne d'un texte de plusieurs lignes
  séparent des colonnes ; cases entre guillemets d'Excel comprises (un guillemet jamais fermé n'en
  est pas un) ; lignes vides en tête et en fin ignorées. Une première ligne de mots
  au-dessus de nombres devient les titres (`hasTitleRow`). Posé à partir du coin de la zone
  sélectionnée, tout ou rien ; un tableau qui déborde de A1-Z200 est refusé **entier**, avec sa
  taille (« 250 lignes à partir de la ligne 1 : la grille en garde 200. Rien n’a été collé. »).
  Une case **seule** collée avec « ; » se répartit vers le bas (P2, comme tapée) ; dans un tableau,
  une case avec « ; » refuse le collage en la citant (la relire `3,4` en ferait un faux nombre) ;
  un titre de plus de 40 caractères aussi (jamais tronqué). Les retours à la ligne d'une case
  deviennent des espaces.
- **Copier** (`tableText`) : la zone en tabulations et lignes pour les autres logiciels, et ses
  textes **exacts** sous le type `application/x-chiphre-grille`, que le collage dans la grille
  préfère (`1/3` reste `1/3`) ; **télécharger**
  (`csvText`, bouton « Télécharger en CSV », désactivé avec sa raison sur une grille vide) : « ; »
  entre les cases, titres en tête, CRLF, marque UTF-8. Les deux passent par `exportText` : un
  nombre sort en décimal à virgule (`1/4` → `0,25` ; un tableur lirait `1/4` comme une date) ; un
  mot qui commence par `=`, `+`, `-`, `@` est précédé d'une apostrophe (injection de formule : une
  grille peut venir d'un lien reçu).
- **Ouvrir un CSV** (repris de V4, phase 0 :
  [atelier-tableur-reste-et-ou-csv-phase0.md](../archive/wip/atelier-tableur-reste-et-ou-csv-phase0.md)
  §3, validée le 2026-10-18) : bouton « Ouvrir un CSV… » (champ de fichier caché). Le fichier est
  lu DANS le navigateur, rien n'est envoyé (`readCsvFile`, `grid.ts`) : plus de 1 Mo
  (`MAX_CSV_BYTES`) refusé AVANT lecture (la taille du `File`) ; un octet nul (image, `.xlsx`)
  refusé ; UTF-16 avec sa marque (« Texte Unicode » d'Excel), sinon UTF-8 (BOM retiré), sinon
  Windows-1252 (Excel sous Windows : `é` reste `é`). Séparateur, cherché HORS des guillemets :
  tabulation, sinon `;`, sinon la virgule SEULEMENT si le fichier écrit des décimaux avec un point
  (Q-RE-5 (a) : `1.52,45.5` coupé ; `1,5` ou `abs, malade` jamais). Guillemets comme au collage ;
  l'apostrophe de `exportText` devant `-`, `+`, `@` est retirée (devant `=`, gardée). En tête,
  seules les lignes vraiment vides tombent : `;;` (cases vides) reste, et une grille téléchargée
  qui commence en A3 se rouvre en A3. Avant de poser, `csvCellRefusal` dit la case et sa ligne
  dans le fichier : un « ; » hors d'une formule (il répartirait la case), plus de 200 caractères.
  Le tableau se pose comme un COLLAGE à partir de la case choisie (Q-RE-4, `pasteTable`) : tout
  ou rien, un geste, le focus rendu à la grille. Les titres se devinent comme au collage (T4) :
  des titres au-dessus de NOMBRES redeviennent des titres ; au-dessus de mots seuls, ou un titre
  qui est un nombre (`2024`), ils reviennent comme une ligne de cases — l'aller-retour n'est
  exact que dans le premier cas. V4 remplaçait la feuille et tronquait en silence à 20 × 20.
- **Annuler dans la grille** (T6) : depuis le lot 5 de la refonte, la grille n'a plus sa propre
  pile ni ses boutons. Ses gestes sont des **étapes de la pile commune** (« Annuler / Rétablir »
  plus bas) : une saisie, un collage (cases, titres et mise en forme ensemble), un effacement, un
  titre, une recopie, une mise en forme, « Relancer », nommer ou retirer le nom d'une colonne.
  Ctrl/⌘+Z sur une cellule remonte à l'atelier. Une case écrite deux fois dans un geste compte une
  fois (la dernière écriture).
- **Deux colonnes ensemble : par LIGNE** (P1, `pairs.ts`). Une liste sait la ligne de chacune de
  ses valeurs (`rows`, lu par `parseDefinition`). Nuage (carte et tracé, `plot-sync`), ajustement
  (carte et `.ajustement L : M` / `.stats` à plusieurs listes dans Calcul), effectifs (« Statistiques
  avec effectifs », diagramme) et tableau croisé (`.croiser` et son bouton) prennent les lignes où
  chaque liste a une valeur (`commonRows`) et disent « N lignes incomplètes écartées » ; refus
  seulement s'il n'en reste aucune (« L et M n’ont aucune ligne remplie en commun. », la même
  phrase au bouton désactivé et au clic, `noCommonRowsMessage`). Par rang, une case vide décalait
  toutes les paires suivantes. Dans Calcul, seule la forme `A : B` (une liste de chaque côté)
  s'apparie : `.stats L ; M` RÉUNIT deux séries, rien n'y est écarté ; l'écho reste ce qui a été
  tapé. `.croiser` qui écarte une ligne ne propose pas la piste `.filtrer` (qui la refuserait).
  Une **loi** (`.simuler`, `.fréquence`, `.échantillons`, « Loi avec probabilités ») n'écarte pas :
  une valeur sans probabilité sur sa ligne refuse, en citant la ligne (`lawMismatchMessage`).
  `.filtrer` garde son refus d'une liste trouée (« L'entrée n° 2 de L est vide… »).
- `cell`, `titleOf`, `listAt`, `columnOf`, `usedExtent` (zone utilisée), `freeColumns` : ce que
  lit la vue.
- La vue (`DataView.svelte`) : barre de cellule (adresse, contenu brut, modifiable), clavier de
  tableur (Entrée, Tab, Échap, flèches, F2, Suppr ; taper remplace), **zone** sélectionnée par Maj
  - flèche, Maj + clic ou glisser (Suppr la vide, Ctrl/⌘+C la copie, Ctrl/⌘+V colle à son coin),
    zone utilisée + 10 lignes et 3 colonnes (au moins 10 × 5), en-tête « nommer » / nom de liste
    « × » et titre, aperçu de chaque liste sous son en-tête, diagrammes sous la grille. La validation
    (pas la frappe) recalcule ; changer de cellule pendant une frappe la valide (une frappe refusée
    est abandonnée, son refus reste affiché). Coller dans la barre ou pendant une frappe un texte
    d'une seule case l'insère au curseur, comme un champ. ⚠️ Safari n'envoie `paste` (et `copy` sans texte sélectionné) qu'à un
    champ : Ctrl/⌘+V ou C sur une cellule donne le focus, le temps du geste, à un champ hors de
    l'écran (`relay`) ; une touche relâchée y rend le focus à la cellule (Ctrl sur Mac n'envoie ni
    `copy` ni `paste`).
- **Calcul ne lit pas une cellule** (Q1) : un calcul qui échoue et cite `B2` répond « B2 est une
  cellule de la grille : nomme sa colonne pour t’en servir. » (`cellCitedIn`, `calcul.ts`).

### Ce que fait la classe `Atelier`

- **créer** : `create` (+ `createDerivative` pour `f′`, `createReciprocal` pour `f⁻¹`,
  `createFromOffer` pour un curseur) ;
- **modifier** : `update`, `rename` (réécrit les définitions qui citent l'ancien nom),
  `setSlider`, `slideTo`, `setSequence`, `setDisplay`, `setSequenceDisplay`, `setPlotted` ;
- **supprimer** : `remove`, `removalOf`, `removeWithDependents`, `undoRemoval` ;
- **annuler** (lot 5) : `step`, `undo`, `redo`, `undoStep`, `redoStep`, `endGesture`,
  `lastStepId`, `inStep`, `history`, `untracked` ;
- **dépendances** : `dependents`, `citedNames` (ce que cite un objet) ; toute mutation finit par
  `recomputeAll` (relit tout — voir « Ce qui se recalcule, et ce qui est gardé ») ;
- **grille** : `cell`, `editCells`, `pasteTable`, `titleOf`, `setTitle`, `nameColumn`,
  `unnameColumn`, `listAt`, `columnOf`, `usedExtent`,
  `freeColumns` ;
- **sauvegarde** : `serialize`, `restore` ; `revision` est le **seul** signal « quelque chose a
  changé » (la session l'écoute pour enregistrer).

### Ce qui se recalcule, et ce qui est gardé (chantier perf du 2026-10-19)

**Tout se recalcule à chaque mutation** : `recomputeAll` relit chaque définition, refait chaque
construction (`#constructions`) et chaque mesure (`#measures`), puis la grille ; ensuite les
effets (`syncFigure`, `syncPlots`) et les cartes se refont sur la nouvelle révision. Pas de
recalcul ciblé : l'invariant 4 (« recomputeAll repart de la lecture ») tient tel quel. Ce qui
rend un cran de curseur rapide, ce sont trois **mémos sans invalidation**, exacts par
construction (ils ne dépendent que de ce qui leur sert de clé) :

- **les lectures** (`parseByProvenance`, `parse.ts`) : par texte + provenance + noms de
  fonctions, plafond 5 000. La lecture est pure ; l'arbre rendu est **partagé**.
  ⚠️ **Règle : un arbre rendu par la lecture ne se modifie JAMAIS en place** — y compris à
  travers `definitionAst`, `substitutedAstOf` / `substitutedTextOf` et `expandDerivatives`,
  qui rendent l'arbre lu tel quel quand il n'y a rien à remplacer ou à développer. Toute
  transformation fabrique un arbre neuf. Le gel (`deepFreeze`) n'a lieu qu'en développement et
  en test : en production, une écriture abîmerait le mémo en silence ;
- **les noms cités** (`#refsOf`, `atelier.svelte.ts`) : par objet rangé (un `WeakMap`) et noms de
  fonctions — un objet rangé n'est jamais modifié sur place ;
- **les liaisons** (`bindingsOf`, `engine.ts`) : un arbre substitué (une coordonnée, un rayon)
  ne reçoit que les définitions des noms qu'il peut citer, de proche en proche
  (`wantedNames`) ; un arbre qui ne nomme rien (`0`, `3/2`) n'en reçoit aucune
  (`namesNothing`). Un nœud dont on ne sait pas lire les noms (longueur `AB`) fait tout lier ; un nom indicé (`c_2`) se lit sous son nom entier, `v_n` par sa base (2026-10-19).
  `expandDerivatives` rend l'arbre tel quel quand il n'a ni `f'` ni `f⁻¹`.

Les mémos par révision d'avant (`constructionMemo`, `#measureMemo`, `#astMemo`) restent ; dans
`#constructions`, ils sont vidés **dès qu'un statut change** (avant : au tour suivant), et les
constructions passent dans l'**ordre de dépendance** (`#dependencyOrder` : un objet après ceux
qu'il cite), plus dans celui des cartes. Un objet qui cite une construction en échec dit donc
toujours « Dépend de « t », qui est en erreur. » (ou « En attente de « t » »), quel que soit
l'ordre des cartes et ce qu'une mesure a calculé en passant — avant, il reprenait parfois le motif
de t (« Les deux points sont confondus… »). Rien à invalider
dans `restore()`, la fusion, le chargement d'un fichier ou « Repartir de zéro » : aucune clé ne
survit à un objet remplacé. `followsOf` (`card-state.ts`) lit `citedNames` au lieu d'appeler
`dependents` pour chaque objet (O(n²) relectures).

Mesures (figure de 24 objets, Mac mini M6 ; détail et profil :
[atelier-geometrie-progress.md](../archive/wip/atelier-geometrie-progress.md#performance)) :
un cran coûtait 36 ms en node et 193 ms dans Chromium (mode dev, rendu compris) ; il coûte
3 ms et 12,6 ms. Bancs : `banc-curseur.test.ts` et `banc-curseur.svelte.test.ts` (sautés sauf
`VITE_ATELIER_BANC=1`). Garde-fous : `recalcul-performance.test.ts` (temps, borne 4× ; nombre de
définitions liées par cran : 3, contre 5 808 sans les raccourcis) et
`recalcul-equivalence.test.ts` (gestes tirés au hasard, graine fixe : raccourcis allumés ou
éteints, atelier neuf restauré, `restore(photo)` — mêmes états, réponses, cartes et dessin).
⚠️ `items` reste un `$state` **profond** : ses proxies coûtaient 4× le temps de node avant les
mémos, ~1,5× après ; un `$state.raw` ferait tomber `serialize.svelte.test.ts` (« l'état vivant
N'EST PAS clonable »), qui asserte le proxy.

### Commandes

La vue Calcul a **un seul champ**, comme l'ancienne `/cas` : ce que l'élève tape est une **définition** (crée
ou met à jour un objet), un **calcul** (une ligne d'historique) ou une **commande** (commence par
un point ; sans point en écriture mathématique, voir « Réglages et écriture mathématique »).
`runInput` (`src/lib/atelier/calcul.ts`) rend un `CalcResult` de kind `vide`,
`definition`, `calcul`, `commande` ou `refus`.

**La ligne d'une définition dit ce que dit la carte** (`definitionText`, `desk.svelte.ts`,
décision de David du 2026-10-13) : « « f » est dans tes objets. » seulement si la carte n'a pas
de message ; en erreur, « « h » est dans tes objets, mais elle est en erreur : » + le message de la
carte, et la ligne est en échec (`failed`) ; en attente, « « p » est dans tes objets, en attente
de « q », qui n'est pas encore défini. », sans échec. Au rejeu, une définition en échec n'arrête
pas (un export d'avant la disait réussie).

**Un objet en erreur ne sert à rien** (V58, décision de David du 2026-10-14). Le moteur ne lie
pas un objet en erreur (`syncEngine`) : il prenait son nom pour une lettre, et sur
`f(x) = f(x)+1` (statut `error`) `.dériver f` répondait `d/dx(f) = 0`, `.intégrer f` ½f².
Une seule garde, `brokenObjectRefusal` (`calcul.ts`), pour **toute commande** (sauf les
simulations, qui lisent des noms de listes) et **toute ligne de calcul** (`f(2)`, `f'(2)`,
`a+1`). Deux refus :

- la **ligne de l'objet** est fautive (illisible, circulaire, fonction citée comme un nombre :
  `Atelier.isMiswritten`) → _« f » est mal définie (sa ligne est en erreur) : corrige sa
  définition d'abord._ (_mal défini_ pour une valeur) ;
- l'objet est en erreur **à cause d'un autre** (`g(x) = f(x)+1`, propagation de `recomputeAll`),
  d'une `f⁻¹` impossible, ou de ce que l'atelier ne sait pas encore faire → le nom, deux-points,
  puis le message de sa carte : _g : Dépend de « f », qui est en erreur._

Les **définitions** ne passent pas par la garde : c'est en redéfinissant f qu'on la corrige.
Exceptions : les cartes `f′`, `f⁻¹` (leurs refus disent pourquoi la dérivée ou la réciproque
manque). Les **boutons de la carte** sont désactivés avec le message de la carte (`blockedBy`,
`actions.ts`), et `runAction` le rend aussi (`expressionOf` refuse un objet qui n'est pas « ok »).

**Syntaxe** : voir [atelier-syntaxe.md](atelier-syntaxe.md) — mots-clés français (`de … à`,
`pour`, `en`, `ordre`, `dans`, `et`), noms et mots-clés sans accent acceptés, ancienne écriture
acceptée quand elle est sans ambiguïté. La lecture vit dans `mathAST` :
`readCommandArguments`, `isKeywordCommand`, `guessedVariable` dans
`src/lib/mathAST/cli/core/variable-argument.ts`.

**Fonction usuelle sans parenthèses : refusée partout** (V59, 2026-10-14). `ln x`, `sin x`,
`cos x`, `tan x`, `exp x`, `sqrt x`, `log x` (et `sin^2 x`, `log_2 x`) se lisaient l·n·x, s·i·n·x :
une ligne de calcul rendait `l n x`, `.évaluer ln x en x=1` réclamait « les valeurs de l et n ».
`bareFunctionRefusal` (`variable-argument.ts`, même motif `BARE_FUNCTION` que
`bareFunctionName`) rend un refus qui CITE le fragment tapé et propose la forme parenthésée :
« « ln 2x » : écris ln(2x) avec des parenthèses. » ; l'argument est cité tel quel (`sin π` → `sin(π)`, `ln |x|` → `ln(|x|)`, `ln -x` → `ln(-x)`) et, sans argument lisible (`ln + 1`), la forme est `ln(…)`.
Trois appels : `computeInput` (ligne de calcul ET définition `f(x) = ln x`, refusée avant
qu'aucun objet ne soit créé), `runCommand` sur l'argument de toute commande sauf les simulations
(qui lisent des noms de listes) — il devance donc les refus `bareFunctionName` des commandes du CLI
et de `.limite` —, et `parseDefinition` (la carte : un `ln x` sans antislash venu de MathLive).
Une liste `L = sin; cos; ln` n'est pas concernée, ni sur la ligne ni sur la carte (`isSemicolonList`). `ln\left(x\right)`, ce qu'écrit MathLive pour `ln` tapé lettre à lettre puis une parenthèse, se lit ln(x) : `withLatexFunctionNames` (`parse.ts`) ajoute l'antislash devant `sin`, `cos`, `tan`, `ln`, `log`, `exp`, `sqrt` suivis de `\left(`, sur la ligne et sur la carte. Refusé même si les lettres sont posées (`l = 2` puis `ln x`) : c'est presque toujours une erreur.
**Fonction usuelle COLLÉE à son argument : refusée aussi** (décision de David, 2026-10-14).
`lnx`, `sinx` (s·i·n·x, i pris pour l'imaginaire), `cosx`, `expx`, `sqrtx`, `logx`, `ln2`,
`ln2x`, `sin2x`, `ln2,5`, `sinθ` se lisaient en produits de lettres. `GLUED_FUNCTION`
(`variable-argument.ts`, appelé par `bareFunctionRefusal`, donc aux trois mêmes endroits) : le
nom suivi d'une lettre ASCII seule, ou d'un nombre et d'au plus une lettre (ASCII, grecque ou π :
`sin2π`, `cos2θ`), puis d'une fin, d'une espace, d'un opérateur (`^`, `²`, `³` compris : `sinx^2`,
`sinx²`), d'un délimiteur fermant ou d'un antislash (`\cdot`, `\right`). Le refus cite le
fragment : « « sinx » : écris sin(x) avec des parenthèses. », « « ln2x » : écris ln(2x)… ». Un
nombre suivi d'une parenthèse ou d'une autre commande LaTeX (`ln2(x)`, `cos2\pi`, `ln2\sqrt{x}`)
reçoit la forme neutre « « cos2 » : écris cos(…) » : cos(2) aurait un autre sens. Une lettre
grecque collée au nom seul (`sinθ`) passe par le refus de `ln x` (`BARE_FUNCTION`), qui la cite.
`cost` est refusé (cos(t)) : voulu, même si c, o, s, t sont posées, comme `cos x`. Non visés :
`sinus`, `lnxy`, `costume` (plus d'une lettre), `sinh`, `cosh`, `tanh` (hyperboliques : `sinh(x)`
se lit bien), un nom précédé d'un MOT (`explnx`, `arcsinx` : toujours des produits) ou d'un
`\operatorname{…}` ; précédé d'une lettre seule, d'un nombre ou d'une puissance, il est refusé (`xlnx`, `2xlnx`, `x^2lnx` → « lnx ») : une lettre seule devant est lue comme un coefficient, donc `asinx`, `acosx`, `atanx` sont refusés en « sinx » (a·sin(x)), pas lus arcsin. `log` suivi de chiffres ne propose pas d'argument : « « log2 » : écris log(…) avec des parenthèses ; log est le logarithme décimal. En base 2 : log_2(…). » (sans la dernière phrase pour `log10`), aussi devant une parenthèse (`log10(100)`, `log2(8)`). Le `{` seul ne l'arrête pas : `e^{lnx}`, `\frac{lnx}{x}` sont refusés. Le
CLI (`bareFunctionName`) ne change pas : `cost + lnx` y reste lu en produit, l'atelier le devance.
Restent lus : `ln(x)`, `2 ln(x)`, `\ln x` (LaTeX du clavier MathLive), `l n` (produit écrit avec
une espace), `st` avec s et t posées, `s(3)` d'une fonction `s` de l'élève. Effet de bord :
`.taylor sin ordre 5` (le raccourci par le nom seul, que l'atelier ne lisait déjà pas — « Plusieurs
lettres ») est refusé aussi. Test : `src/lib/atelier/__tests__/fonction-sans-parentheses.test.ts`.

**Trois sources de commandes**, réunies par `commandCatalog` (`src/lib/atelier/commands.ts`) :

| Source                     | Où                            | Exemples                                                                             |
| -------------------------- | ----------------------------- | ------------------------------------------------------------------------------------ |
| registre du moteur         | `WebReplEngine.getCommands()` | `.dériver`, `.résoudre`, `.intégrer`, `.variations`, `.taylor`                       |
| branchées hors registre    | table `OFF_REGISTRY`          | `.convertir`, `.stats`, `.ajustement`, `.exact`, `.décimal`                          |
| servies par l'atelier seul | `ATELIER_ONLY_COMMANDS`       | `.factoriser`, `.développer`, `.réciproque`, `.limite`, `.simuler`, `.relever`, lois |

La table `TRANSLATIONS` donne pour chaque commande son nom français, sa description, son exemple
et sa rubrique de `.aide` (`HelpSection`) ; **son ordre est l'ordre du catalogue**. Les commandes
anglaises continuent de marcher (le registre est partagé avec le REPL de mathAST, `pnpm math`). Sept commandes du
moteur **n'existent pas dans l'atelier** (`ENGINE_COMMANDS_LEFT_OUT` : `let`, `def`, `clear`,
`unset`, `undef`, `inv`, `def'` — décision de David, 2026-10-13) : elles écriraient des noms dans le
moteur, alors que les noms se créent dans le panneau. Hors du catalogue, tapées en entier, elles
répondent comme toute commande inconnue. `.auto` (bascule du mode de saisie de l'ancienne `/cas`,
retirée du moteur le 2026-10-13) n'est pas au catalogue non plus.

Chemin d'une commande dans `runCommand` (`calcul.ts`), dans cet ordre :

1. `resolveCommand` + recherche dans le catalogue ; inconnue → refus avec au plus deux
   suggestions (`suggestFor`) ;
2. on exécute le **nom canonique**, jamais le raccourci tapé (`.s` = simplifier, pas solve) ;
3. `.aide`, `.mode`, `.exact`, `.décimal`, `.valeurs`, `.fonctions` : traités par l'atelier, en
   français (`.valeurs` et `.fonctions` listent les CARTES du panneau, `src/lib/atelier/listing.ts`,
   pas l'état du moteur) ; `.exporter` suivi d'autre chose : refus ; `.latex` et
   `.texte` sans expression : refus (garde née de la bascule du mode de saisie de `/cas`, qui
   faisait lire de travers tous les calculs suivants ; la bascule est retirée du moteur depuis le
   2026-10-13, et sans expression la commande du registre reprendrait la dernière expression du
   moteur) ;
4. commandes de données (table `SIMULATIONS`) : lisent des **noms de listes**, avant toute
   substitution ;
5. sinon : virgule décimale, `π`, `f'(x)` puis noms d'objets remplacés par leurs expressions ;
   `ATELIER_ONLY_COMMANDS` sortent ici (`runAtelierCommand`) ; le reste passe par les mots-clés,
   la variable devinée, puis `engine.execute` ;
6. la réponse du moteur est rendue (`renderResult`), et les **étapes** pédagogiques s'y ajoutent
   quand elles savent faire — elles remplacent le formateur de terminal, jamais la réponse.

**Au clavier** (`CalculView.svelte`, phase 0 [atelier-cas-phase0.md](../archive/wip/atelier-cas-phase0.md),
décisions de David du 2026-10-11) :

- après un point, la liste des commandes (8 au plus) est un **combobox** : ↑ / ↓ surlignent (la liste
  boucle), **Entrée ou Tab choisit** (`.dériver `) — sauf une
  commande marquée `runsAlone` (`.aide`, `.exact`…) tapée en entier, qu'Entrée lance —, Échap ferme
  jusqu'à la frappe suivante. Sans commande proposée (`.pose`), Entrée calcule ;
- liste fermée, **↑ / ↓ rappellent les saisies tapées** (`CalcDesk.recallPrevious` /
  `recallNext`) : jamais une ligne écrite par un bouton, même « Comparer avec M » qui passe par
  `submit` ; deux saisies identiques de suite rappelées une fois ; le brouillon d'avant le premier
  ↑ revient au bout ; une ligne rappelée puis modifiée n'est pas perdue ; une console vidée (rejeu,
  retour d'un lien reçu) vide le rappel — « Repartir de zéro » le garde ; il revient au rechargement avec les lignes (les 100 dernières saisies tapées), et rien
  n'est rappelable après un rejeu ;
- une fois la commande choisie ou tapée avec son espace, son **modèle** (l'exemple du catalogue,
  `commandBeingWritten`) reste sous le champ pendant qu'on tape la suite. Garde : toute commande
  d'élève disponible a un exemple (`commands.test.ts`).

**Valeur approchée ⇄ valeur exacte** (PR 2 de la même phase 0) : une ligne dont la réponse a une
autre écriture porte un bouton qui bascule, ligne par ligne, sans rien sauvegarder ni exporter
(`Alternative` dans `calcul.ts`, `Entry.alternative`). Règle unique, `mathAST/cli/approximation.ts`
(décisions de David du 2026-10-11) : **4 décimales, zéros compris** (`≈ 5,0990`) ; **=** sans zéros
inutiles quand l'écriture décimale tient dans l'arrondi (1/4 → `= 0,25`) — décidé sur le RATIONNEL
(`evaluateNodeToRational`), jamais à une tolérance près ; 4 chiffres significatifs sous 10⁻⁴ ; hors
de [10⁻⁶ ; 10⁹[, la **notation scientifique** du collège, 4 décimales sur la mantisse, calculée sur la
fraction exacte (`≈ 8,7700 × 10⁹` pour π²⁰, `= 1,25 × 10⁻⁷` exact, `≈ 1,3221 × 10⁻⁵²³` pour 0,3¹⁰⁰⁰ —
décisions a, b, c du 2026-10-12) ; un entier exact s'écrit en entier jusqu'à 15 chiffres (2⁴⁰), en
notation scientifique au-delà (2⁶⁴ ≈ 1,8447 × 10¹⁹) ; rien pour un nombre déjà écrit (`3`, `2,5`), une
expression littérale, une grandeur (le moteur la calcule par une autre branche). Le moteur fournit `approximateLatex` (mode exact) ou
`exactLatex` (mode décimal) pour un calcul, et `approximateLatex` pour `.solve`, intervalle compris
(`S ≈ {−1,4142 ; 1,4142}` ; rien pour une famille périodique, une inéquation, un seuil en ln qui dit
déjà sa valeur approchée). Quand les ÉTAPES donnent la réponse, le bouton approche leurs solutions
(`SolvedSteps.approximate`), dans leur ordre et leur forme — pas celles du moteur, triées. Mêmes
boutons sur l'image d'un nombre et « Résoudre f(x) = 0 » des cartes.
`.mode décimal` suit la même règle (2026-10-11) : 4 décimales, `≈` à l'écran comme dans le texte
seulement si la valeur est arrondie (`≈ 0,7071`, `0,25`) ; « Garder » range la valeur pleine
précision (`quantityAst`). Depuis le 2026-10-12, plus aucun repli sur l'écriture du flottant du
moteur (`e+30`, 15 chiffres, 2⁶⁴ écrit `18446744073709552000` faux et sans `≈`) : l'écriture se lit
toujours sur le résultat exact, le calcul décimal du moteur ne sert qu'à une valeur non réelle et à
« Garder ». Le texte d'une notation scientifique se retape dans la console, et garde sa notation
en mode exact (Q24, lot 5c : `8.7700*10^9` → `8.77*10^9`, `1.4286*10^-7` → `1.4286*10^{-7}`) ;
à l'écran, `exactValueToShow` la laisse telle quelle (`tidy` recalculerait `3 × 10²⁰`). Mêmes règles pour une grandeur (`9,4607 × 10¹⁵ m`). Le texte d'un résultat exact est mis au propre comme l'écran (`\pi/3`,
plus `{1/3}\pi`) — y compris dans le texte brut du moteur.

**Résultat exact trop long** (lot « lenteur des grandes fractions », option A de David du 2026-10-12,
`mathAST/cli/exact-size.ts`) : au-delà de **1 000 caractères**, le mode exact **garde l'écriture
tapée** (`(1+1/1000)^{1000}`, `1.01^{365}`, `2^{100000}`) — comme `1000!` le faisait déjà — avec une
note (« Valeur exacte trop longue (environ 6000 chiffres) : elle reste écrite telle quelle. », espace
fine dès 5 chiffres, règle du BIPM) ; la
valeur approchée reste au bouton ≈ et en mode décimal. Deux temps (lot « défauts des grandes
fractions », 2026-10-12) :

- la taille **prévue avant le calcul** (puissance de base a/b : environ k × (chiffres de a +
  chiffres de b) ; factorielle, coefficient binomial par Stirling ; ailleurs, les tailles
  s'ajoutent, sans compensation : le moteur calcule chaque puissance avant de simplifier ; base
  irrationnelle — racines et nombres — par sa « hauteur », à un facteur 2
  près) ne sert qu'à ne pas figer la page : au-delà de **20 000 caractères prévus**, rien n'est
  calculé (`\sqrt{2}^{40000000}` et `2^{2^{100}}` répondent « Valeur hors d'échelle » au lieu de
  bloquer 2,5 s). Exception : un **produit ou quotient de puissances** de bases rationnelles
  courtes se calcule sur ses facteurs premiers compensés (`productValue`), sans les puissances
  intermédiaires — `10^{60000}/10^{59990}` répond 10¹⁰, et
  `(1+1/100000)^{100000}×(1+1/100000)^{-100000}` répond 1 au lieu de bloquer 305 s ; Avant, `(1+1/10000)^10000` prenait 13 s pour afficher 80 003 caractères, et
  `(1+1/100000)^100000` bloquait la page plus de 200 s (maintenant ~1 ms) ;
- en deçà, le résultat est calculé (moins de 130 ms au pire mesuré), et la règle des 1 000
  caractères se lit sur sa **longueur réelle** (`exactCharacters`) : une base irrationnelle
  échappait à la prévision (`\sqrt{2}^{100000}` affichait 15 052 caractères), et la prévision
  ignore les simplifications (`10^{600}×10^{-598}` gardait son écriture pour 100). Une factorielle
  que le moteur garde (`1000!`) compte par sa valeur (2 568 chiffres) ; `1000!/999!` n'est plus
  annoncé « environ 5 000 chiffres ». L'arrondi se lit alors sur le résultat calculé (√2 tapé
  n'entre en fraction que par son flottant, dont la puissance déborde).

**Chaînes et « différent de »** (2026-10-12) : `1 < x < 3` est vraie si chaque maillon l'est
(`evaluateToBoolean`, `eval/evaluate.ts` ; elle répondait « Cannot evaluate boolean expression ») ;
Les opérateurs logiques et d'égalité se tapent comme en programmation ou en toutes lettres
(`cli/core/pipeline.ts`, `withLogicOperators`) : `&&`/`and`/`et`, `||`/`or`/`ou`,
`!`/`not`/`non`, `==`/`===` (=), `!=`/`!==` (≠) — réécrits en `\land`, `\lor`, `\lnot`, `\ne`
pour le LaTeX (qui lisait `2 != 3` comme `factorial(2) = 3`). Une factorielle reste collée à son
nombre (`3! = 6`). Un « non » sans parenthèses porte sur toute la comparaison qui le suit
(`not 2 > 1` = non(2 > 1), jusqu'au prochain « et »/« ou » ; le `\lnot` du LaTeX lie plus fort).
⚠️ Au plus près (revues) : les mots et le « non » seulement s'il y a une comparaison ou un
opérateur logique (`non + 1`, `x et y` parlent de variables ; `b && !c` de booléens) ; `||` et les mots entourés d'espaces,
`||` hors d'une valeur absolue (`||-2||`, `| 2 || 3 |`) ; un « non » seulement en tête, après `(`,
`,` ou un « et »/« ou » (`5 !`, `|-3|!` sont des factorielles), un mot `non` seulement suivi de ce
qu'il nie (`non > 1` est une variable) ; aucun mot dans `\text{…}`. `.def f(x) = x == 2` ne tente
plus de dérivée. Le message
d'une comparaison non évaluable nomme la vraie cause (relation non tranchée, « non » sans
parenthèses, variable sans valeur). Une entrée à plusieurs `=` ou dont un membre est une comparaison (`1 < 2 = 2`) est lue
en entier comme une chaîne : `executeEquality` la coupait au `=` et comparait un booléen à un
nombre. Une chaîne de grandeurs (`5[m] < 600[cm] < 7[m]`) passe maillon par maillon par le chemin
des grandeurs. Une comparaison entre parenthèses (`\lnot (2 > 1)`) s'évalue ; une relation que le
calcul ne tranche pas répond en français (« Relation « ≈ » non évaluable : seules = ≠ < > ≤ ≥ se
tranchent »), et les erreurs de la console commencent par « Erreur de calcul : » (« Evaluation
error: » avant). **Tous les messages d'erreur de la console sont traduits à sa sortie**
(`mathAST/cli/web/french-errors.ts`, `withFrenchErrors` dans `execute`) : une table pour les
fréquents (« Unexpected token: EOF » → « Expression incomplète », « Unknown command: \foo » →
« Commande inconnue : \foo », « Division by zero » → « Division par zéro »…), « Écriture non
reconnue » pour une ligne qui COMMENCE par un mot anglais (un message déjà français reste
entier ; une consigne « Use: »/« Usage: » reste, sous « Forme attendue : »). ⚠️ On traduit le
message seul, puis on le remplace dans la sortie et, échappé, dans le HTML du moteur : traduit sur
le HTML final, il avalait des balises et réécrivait la saisie recopiée (revue). Les parseurs gardent leurs messages (une cinquantaine
de tests les vérifient). Une sortie d'erreur VIDE reste vide : l'atelier y répond « Je n'ai pas
su lire… ». Les refus de `.intégrer`, eux, sont écrits en français **à la source** (intégrateurs,
`integrate.command.ts`), comme le reste du moteur d'intégration (V61) : `1/(x^2+a^2+1) de 0 à 1`
→ « Je ne sais pas factoriser le dénominateur : je ne peux pas calculer cette intégrale » (avant :
« Unable to factor denominator »), « Technique tentée : décomposition en éléments simples ».

Une comparaison ne garde jamais son écriture (elle rend vrai ou faux), mais passe par le même
plafond **membre par membre** (`mathAST/cli/bounded-comparison.ts`, aussi pour `a = b`, qui suit
son propre chemin `executeEquality`, qui compare ensuite les valeurs exactes, puis la forme
d'équivalence de l'ADR 0006 : `\sin^2(x)+\cos^2(x) = 1` et `\tan(x) = \frac{\sin(x)}{\cos(x)}` répondent
`true`, ce que `normalize` seul ne voyait pas avant le 2026-10-22) : un membre au-delà du plafond prend sa valeur exacte s'il
est un produit de puissances, sinon la relation se tranche sur des **encadrements rigoureux**
(`mathAST/cli/interval.ts` : 256 bits, arrondis vers l'extérieur à chaque opération, la valeur
exacte toujours dedans) : disjoints, le sens est sûr ; sinon refus (« Membres trop proches pour
être départagés »). Ce qui ne s'encadre pas (π, racine, fonction) est refusé ; avec une variable
libre, le refus le dit. ⚠️ Deux essais donnaient des sens FAUX (revue) : comparer les arrondis du
bouton ≈ (entre 10⁹ et 10¹⁵, entier exact et valeur approchée ne sont pas sur la même grille), puis
des intervalles à marge relative (un membre lu par le flottant, presque annulé par une
soustraction : `(1+1/20000)^{20000}×10^{16} − 27182138745278831 < 0` → `false`). Avant, `1.0001^{30000} > 20` prenait 16,7 s,
`(1+1/100000)^{100000}×(1+1/100000)^{-100000} < 1` plus de 300 s. `2^{100000} > 3^{60000}` répond toujours `true`. Le résultat porte `exactTooLong` ; le rendu ne passe pas l'écriture
gardée à `tidy`, qui la développerait. La console ne calcule plus le résultat exact deux fois (le
test du booléen le réutilise), ni l'arrondi deux fois (ligne et bouton ≈).

**Complétion des fonctions et des lettres grecques** (PR 3, `src/lib/atelier/completion.ts`) :
règle unique — la liste s'ouvre quand le mot qui finit au CURSEUR (lettres seulement, curseur relu
au moment de décider) a au moins 2 lettres et est le début d'une proposition (`si` → `sin(`,
`sinh(`, `sign(`, `σ` ; `al` → `α` ; `pi` → `π`). Propositions tirées des listes uniques du moteur :
`SHOWN_FUNCTIONS` (tokenizer) et `GREEK_LETTERS` (variantes exceptées), insérées en symbole — pas l'ancien
module de complétion de `/cas` (retiré avec elle), qui insérait `\alpha`. Rien dans le nom d'une commande (liste des
commandes), ni dans une saisie en LaTeX (`\frac{co`). Pas de nom du panneau : un nom d'objet fait une lettre. Clavier : ↑ / ↓
surlignent, **Tab ou un clic insère**, **Entrée calcule** même liste ouverte (`3ta` = 3·t·a, décision
de David), Échap ferme jusqu'à la frappe suivante. Garde : chaque proposition, tapée dans un calcul,
est acceptée par Calcul (`completion.test.ts`).

**Actions de carte** : `actionsFor` (`src/lib/atelier/actions.ts`) donne par type les actions
(fonction : Tracer, Afficher dans Géométrie, Dériver, Réciproque, Tabuler, Résoudre f(x) = 0, Variations ; suite : Premiers termes ;
liste : Statistiques, diagrammes, nuage, ajustement, loi — par liste partenaire). Une action qui a
un sens pour le type mais pas pour cet objet reste **visible, désactivée, avec sa raison**
(`disabledReason`). Le clic passe par `CalcDesk.runFromPanel` : il **écrit une ligne dans la
console sans l'ouvrir ni changer de vue** et crée **une carte par objet créé** (G7).

### La console déroulante

Lot 2 de [atelier-refonte-interface-phase0.md](../archive/wip/atelier-refonte-interface-phase0.md)
(décisions de David du 2026-10-18). Plus d'onglet Calcul : `CalculView.svelte` (+ `CalcDesk`)
vit dans un volet qui descend **par-dessus** la vue (`AtelierContainer.svelte`), environ 40 %
de la hauteur, réglable à la poignée (souris, ou flèches haut / bas), toute la scène sous
640 px. Une **région** nommée « Console », pas une `dialog` : rien n'est modal, la vue et
« Mes objets » restent utilisables. Montée en permanence (l'historique, le brouillon, les étapes
dépliées survivent à la fermeture), `inert` quand elle est fermée.

- **Ouvrir / fermer** : le bouton « Console » de la barre (`aria-expanded`) ; la **touche
  physique sous Échap** hors d'un champ ; **Ctrl+Entrée** partout, champs compris
  (`console-key.ts` : sur Mac, `IntlBackslash` ou `Backquote` — mesure du 2026-10-18 sur un Mac
  AZERTY, la touche sous Échap rend `IntlBackslash` ; ailleurs `Backquote` ; mesuré sur Chrome
  seulement, pas sur Safari). Échap dans la
  console la ferme, sauf s'il ferme d'abord une liste de propositions. À l'ouverture, le focus
  va au champ ; à la fermeture, un focus resté dedans revient au bouton.
- **Les touches restent dans la console** : le Graphe reste monté dessous, et ses raccourcis
  (`KeyboardHandler`, `+ - flèches Échap g 0`) écoutent toute la fenêtre. La région porte
  `data-own-keys`, que `KeyboardHandler` respecte, comme une touche déjà prise
  (`defaultPrevented`) : ↓ sur la poignée ne décale pas le graphe, Échap sur « Fermer » ne
  remet pas la vue à zéro (revue de #1485).
- **A3** : le bouton porte le nombre de lignes arrivées pendant que la console était fermée ;
  l'annonce dit « Nouvelle ligne dans la console ». Une commande préparée par une carte
  (`needs-argument` : « Simuler », « Tableau croisé ») OUVRE la console. Elle s'AJOUTE au
  brouillon de l'élève, jamais à sa place (`#prepare`, décision de David du 2026-10-18), et le
  curseur se place en fin de ligne (`focusInput`), en texte comme en écriture mathématique. Limite
  connue : un brouillon mathématique suivi d'une commande ne se compose pas en une seule écriture
  (rien n'est perdu).
- **A5** : une action qui montre quelque chose ailleurs (Tracer, nuage, diagramme, Tabuler,
  Afficher dans Géométrie) change de vue ; sous 640 px, elle referme la console (`revealView`).
- **Lisibilité** : invite `>` devant l'instruction (en couleur normale), réponse préfixée `-->`
  (décoratifs, `aria-hidden`) ; une commande en texte (`.dériver f`) en chasse fixe ; une
  définition réussie dit « f est correctement défini », le nom en couleur (`definedName`) ; les
  boutons d'une ligne n'apparaissent qu'au survol ou au focus (toujours au toucher :
  `any-hover: none` ou `any-pointer: coarse`, pour un portable tactile à souris). Couleur
  d'accent `#a65800` en clair (5,0:1 sur le fond `#fafafa` de la console), `#ffc400` en sombre.
- **Défilement** : une nouvelle entrée (tapée, ou écrite par une action de carte) fait descendre
  l'historique tout en bas (`CalculView`, effet sur `desk.entries.length`, 2026-10-23).
- **Menu de la console** : « Copier l'historique pour une fiche » et « Télécharger l'historique
  (ubumark) ». L'atelier s'enregistre par la barre d'icônes.

### La carte d'une fonction

Lot 3 de [atelier-refonte-interface-phase0.md](../archive/wip/atelier-refonte-interface-phase0.md)
(décisions de David du 2026-10-18). `ObjectCard` confie toute fonction à `FunctionCard.svelte` ;
valeurs, suites et listes ont la leur depuis le lot 4a, points et courbes depuis le lot 4b
(ci-dessous) : plus aucune carte n'a de vue repliée / développée.

- **Une seule ligne, plus de vue développée** : `● f(x) = [champ MathLive]`, l'œil (tracer),
  le bouton « Options de f ». Plus de libellé « fonction », plus de second `f(x) =`.
- **Le champ** (`DefinitionField`, `commit="validate"`) : rien n'est rangé pendant la frappe ;
  **Entrée** ou la **sortie du champ** rangent (valeur lue sur l'élément MathLive à cet
  instant). Une saisie illisible (`parseDefinition` en erreur) garde l'ancienne définition :
  l'erreur est sur le champ (`aria-invalid`, message relié par `aria-describedby`) ; **Échap**
  rétablit l'ancienne valeur (et ne ferme alors pas la console). La lettre (`f(t)`) et
  l'intervalle (`sur [0 ; 1]`) se règlent toujours dans le champ.
- **Le point de couleur** (`CurveStylePopover.svelte`) ouvre couleur, épaisseur et style du
  trait (`setDisplay`) ; une fonction jamais tracée propose « Tracer f ».
- **Le menu** (`DropdownMenu`) : **Affichage** — « Tangente », « Aire sous la courbe »
  (`curve-toggles.ts`, la même règle que les cases de `CurveSettings`), « Lecture graphique »
  (lot 3 bis, ci-dessous), indisponibles tant que la courbe n'est pas tracée ; **Actions** — `actionsFor`, une raison d'indisponibilité écrite
  dans l'élément (jamais `disabled` : il reste atteignable au clavier ; marqueur
  `data-indisponible`). Ce qui se LIT (point de tangence, bornes, aire, longueur) reste sous la
  ligne, seulement allumé (`CurveSettings compact`).
- **Pas d'« Image d'un nombre »** (décision de David du 2026-10-18) : `f(2)` s'écrit tout seul
  dans la console, la carte ne propose ni action ni champ. `CalcDesk.image` reste, pour rejouer
  les historiques exportés avant, qui contiennent le geste `image`.
- **« Tabuler »** : une fenêtre « de / à / pas » pré-remplie ; un refus s'y dit, un succès la
  ferme (focus dans la grille) et sa phrase s'écrit sous la carte.
- **Les cartes qui suivent** (`f′`, `f⁻¹`) : formule calculée (jamais éditable), une icône de
  lien à côté du nom dit « dérivée de f — elle suit f » (infobulle, et note dépliée au toucher).
- `selected` (panneau) ne sert plus, pour une fonction, qu'à la mettre en évidence et à donner
  le focus au champ d'une carte neuve.
- **La lecture graphique de l'image** (lot 3 bis, choix de David du 2026-10-18) : réglage de
  la courbe `showReading` (rangé compact, absent quand éteint ; un état d'avant se relit sans
  lui, pas de nouvelle `ATELIER_STATE_VERSION`). Allumée, deux sources de pointillés :
  - **la console** : chaque ligne réussie qui est un appel NU d'une fonction sur un nombre
    (`f(2)`, `f(-1/2)`, `f(√2)`, `f'(2)` sur la carte de `f′` ; pas `f(2)+1`, `f(a)`, `f(g(2))`
    ni `f⁻¹(5)`, image de la réciproque) — relue par le parseur de l'atelier (`readingCallOf`,
    jamais une expression régulière), une ligne n'étant relue qu'une fois pour les mêmes noms
    de fonctions (cache, la synchronisation relisant la console à chaque révision). Les **3
    dernières** par courbe (`MAX_READINGS`), une abscisse relue ne comptant qu'une fois ; seules
    les 100 dernières lignes sont relues. Elles suivent la définition courante de `f`.
    ⚠️ `f(π)` et `f(\pi)` se lisent, pas `f(pi)` tapé en lettres : le parseur en mode texte y voit
    `p·i` (mesuré le 2026-10-19, malgré `pi` dans `CONSTANTS`) ;
  - **le point glissant** : un par courbe lue, posé au milieu de la fenêtre puis là où l'élève
    le laisse (non rangé : rechargé, il revient au milieu). Aimanté aux entiers et aux demis au
    glissé ; ← → par pas de la sous-grille, Page ↑ / ↓ par pas de la grille.
    Le dessin vit dans le grapheur (voir [grapheur.md](grapheur.md#lecture-graphique-de-limage)).

### Les cartes d'une valeur, d'une suite, d'une liste

Lot 4a de [atelier-refonte-interface-phase0.md](../archive/wip/atelier-refonte-interface-phase0.md)
(recommandations validées par David le 2026-10-18). La grammaire de la carte de fonction : une
ligne `● nom = [définition]`, l'œil si l'objet se trace, un menu (`CardActionItems`,
`UnavailableItem`), Propriétés, Renommer et Supprimer en fin de menu (voir « Le panneau Propriétés »). Le champ est celui des fonctions
(`DefinitionField`, `commit="validate"`) : une valeur et une suite sont rangées à **Entrée** ou à
la **sortie du champ**, et non plus 0,3 s après la frappe. Chaque carte dit son état sur sa ligne
(« à compléter », « en attente », « erreur » : `stateLabelOf`, `card-state.ts`).

- **Valeur** (`ValueCard.svelte`) : `a = [3]`, une grandeur avec son unité (`v = [12 km]`). Le
  **curseur est sous la ligne** quand la valeur est un **paramètre** — un autre objet la cite
  (`Atelier.dependents`), point, courbe ou premier terme d'une suite compris. Sinon il est caché,
  et « Affichage → Curseur » l'affiche — **retenu avec l'atelier** (`sliderShown`,
  `setSliderShown`, décision de David du 2026-10-18) : il survit au rechargement, au renommage,
  au fichier et au lien. ⚠️ La règle lit
  `object.slider` : le modèle l'omet pour une grandeur (D4, `build()`) et l'omettra pour une
  mesure de la géométrie (`aire(…)`, `distance(…)`) — la carte ne juge jamais la forme de la
  définition. Seule exception, d'avant ce lot : une valeur **calculée** (`b + 1`, `constantOf`
  nul) n'a pas de curseur, il effacerait sa formule. Ces deux absences sont dites par
  « Curseur », indisponible avec sa raison ; un paramètre a « Curseur » coché et indisponible
  (« a est un paramètre (f la cite) »). « Bornes et pas du curseur… » ouvre une fenêtre
  (`SliderSettings`). Actions : Convertir (unité), indisponible « dans un prochain lot » — il
  échappait à `NOT_YET` et s'affichait actif sans effet (corrigé le 2026-10-23).
- **Suite** (`SequenceCard.svelte`) : `● u(n) = [2n+1]` ou `● u(n+1) = [2u(n)+1]`. Sous la
  ligne, en petit : `u([0]) = [3]` (rang et premier terme, deux champs) pour une récurrence,
  « à partir du rang [0] » pour une suite explicite ; rang, premier terme et marches sont rangés à
  Entrée ou à la sortie du champ (`change`), jamais à la frappe ; un refus se dit alors, relié au
  seul champ fautif (`refus-suite-u`), et le champ reprend la valeur retenue. Une suite en
  escalier qui ne peut plus l'être (passée en explicite, ou qui dépend désormais de n) revient au
  nuage (`#dropImpossibleCobweb`, revue de #1501). Le point de couleur (`CurveStylePopover`, `setSequenceDisplay`)
  ouvre couleur et trait. Menu : **Affichage** — Nuage / Escalier (choix exclusif ;
  indisponibles tant que la suite n'est pas tracée, l'escalier d'une suite explicite avec la
  raison de `cobwebRefusal`), les **marches** se réglant sous la ligne quand l'escalier est
  tracé ; **Définition** — Explicite / Récurrence (`setSequence`) ; **Actions** — Premiers
  termes. `SequenceSettings.svelte` est retiré.
- **Liste** (`ListCard.svelte`) : `L = {3 ; 5 ; 8 ; …} (12 valeurs)`, une liste de mots
  `(5 valeurs, 3 modalités)`, une colonne de formules « calculée dans la grille »
  (`list-preview.ts` : les entrées telles que la grille les montre, jamais `=A1*2`). Elle **ne
  s'édite pas sur la ligne** : « Modifier dans Données » ouvre la vue Données sur sa colonne
  (action `data`, traitée par le conteneur, hors de `actionsFor`). Les actions à deux listes
  passent par le sous-menu **« Avec une autre liste »**, un groupe par partenaire
  (`actionsFor(liste, atelier, partenaire)`), à la place du choix de la partenaire sur la carte
  (Q46) ; une partenaire renommée y paraît sous son nouveau nom (Q48). Une commande **préparée**
  (tableau croisé, simuler) part une fois le menu fermé ET retiré (`onOpenChangeComplete`) :
  lancée avant, le champ mathématique de la console n'obtenait pas le focus.
- Aucune de ces cartes n'en suit une autre (pas de lien de dépendance, à la différence de `f′`) ;
  `selected` ne sert qu'à la mise en évidence et au focus d'une carte neuve.

### Les cartes d'un point et d'une courbe

Lot 4b de [atelier-refonte-interface-phase0.md](../archive/wip/atelier-refonte-interface-phase0.md)
(validé par David le 2026-10-18, précisé avec la session de la géométrie). Une seule carte pour
les deux, `FigureCard.svelte`, avec la grammaire des autres :

- **Une ligne** : `● A = [(1 ; 2)]`, `● d : [y = 3x − 2]` (équation : « : »), `● d = [(AB)]`
  (construction : « = », L2). Le champ (`DefinitionField`, `commit="validate"`) est rangé à
  Entrée ou à la sortie du champ — il l'était 0,3 s après la frappe. Le champ d'un point montre
  ses coordonnées en LaTeX (`\left(\sqrt{2};1\right)`, `fieldLatexOf`), relisibles.
- **Ni nature ni mesure sous la ligne** (demande de David du 2026-10-23, #1627) : plus de
  « POINT », « SEGMENT », ni de longueur, de coordonnées ou d'équation d'une construction.
  Elles se lisent dans le panneau « Propriétés » (`figurePropertiesOf`). Restent sous
  la ligne les avertissements : le constat d'une courbe vide (C6), l'état, le message d'erreur.
- **Une définition trop longue pour la ligne passe dessous, en entier** (`.corps` en
  `flex-wrap`, champ en `flex: 1 0 auto`, jamais plus étroit que son contenu) — même règle pour
  les cartes de fonction, de valeur et de suite (`carte-champ-largeur.svelte.test.ts`).
- **Les boutons (œil, ⋮) restent en haut à droite, sur la ligne du nom** (`.boutons` en
  position absolue) : le champ réserve leur place derrière lui (`.membre::after`, largeur
  `--boutons`), réserve qui se replie quand il est passé à la ligne et lui laisse toute la
  largeur. L'état (« à compléter », « en attente ») passe sous la ligne. Avant (#1508), ⋮
  descendait avec le champ et se retrouvait seul dessous, à gauche (2026-10-19). Toutes les
  cartes ; celle d'une liste, dont l'aperçu est tronqué, en grille à deux colonnes.
- **Une construction** (`I = [milieu(A, B)]`, `s = [[AB]]`) : on modifie la construction, pas
  ce qu'elle vaut (un point approché vaut `E ≈ (1,5811 ; 1,2247)`, lot 2, PR 3). Un `point_sur` à position
  écrite a, sous la ligne, le **curseur de position** (`ValueSlider`, celui des valeurs : « Position
  de M », `position de M = 0,3`).
  L'icône de lien dit ce qu'elle suit (« I se construit à partir de A et B, et suit leurs
  changements », `followsOf`). En attente : « en attente » et sa raison.
- **Le point de couleur** (`FigureStylePopover`) : couleur et taille d'un point, couleur,
  épaisseur et style d'une courbe (`setFigureDisplay`). Un point de 10 px au centre d'une cible
  de 24 px : la couleur passe par `--peinte`, lue par le seul `::after` (posée sur le bouton,
  elle remplissait toute la cible, corrigé le 2026-10-23 ; de même `CurveStylePopover`). Il
  montre la couleur PEINTE : sans
  couleur réglée, celle de la figure (`figureDefaultColor`), aucune pastille cochée. **Menu** : Propriétés, Renommer et Supprimer ; l'étiquette d'un point
  se règle dans le panneau « Propriétés » (2026-10-23).
- **Le modèle** : `PointDisplay { color?, size: 'small' | 'medium' | 'large', showLabel }` et
  `StrokeDisplay { color?, lineStyle, lineWidth }` (sous-ensemble de `CurveDisplay`), sur l'objet,
  absents par défaut. **Le premier réglage part de ce qui est dessiné** (2026-10-19) : taille
  moyenne, nom affiché, trait continu d'épaisseur 2, couleur ABSENTE (celle de la figure) —
  régler la taille ou le trait seul ne repeint pas l'objet ; un réglage qui ne change rien (la
  taille déjà active) n'enregistre rien (`sameFigureDisplay` : pas de `display`, pas de
  révision) ; rangés en `figureDisplay` (sauvegarde, lien, fichier, fusion :
  `adoptFigureDisplay`, `.strict()` — le réglage d'un point posé sur une courbe est oublié) ;
  gardés quand la définition change. La vue Géométrie les **peint** (`syncFigure`, 2026-10-19) :
  un point prend sa couleur (jeton `var(--color-curve-N)`, comme K4), son rayon (petit 3 px,
  moyen 5 px — le dessin d'avant —, grand 7 px : `POINT_RADII`) et son nom masqué
  (`Figure.setLabelHidden` ; `GeometryCanvas`, exports SVG et TikZ lisent `labelHidden` pour les
  points, Typst le lisait déjà) ; une courbe — équation ou construction, y compris chaque sorte
  d'une conique à curseur — sa couleur, son trait et son épaisseur (`dashdot` → tirets). Les noms
  (étiquette d'un point ou d'une courbe, nom d'un cercle construit) restent en couleur du texte,
  comme au cahier : `GeometryCanvas` reçoit `neutralLabels` (décision de David du 2026-10-23). Le
  nom d'un cercle reste écrit (une courbe n'a pas de `showLabel`). Un
  réglage repeint sans reconstruire (`restyled`, `Figure.updateStyle`) ; sans réglage, le
  dessin reste celui d'avant ; un réglage qui disparaît refait la figure (`updateStyle`
  fusionne et ne sait pas rendre le défaut).

### Le panneau Propriétés

Chantier `docs/archive/wip/atelier-proprietes-progress.md` (validé par David le 2026-10-23). Toutes les
cartes ont, en fin de menu, **Propriétés**, **Renommer** et **Supprimer** (`ALWAYS`, `actions.ts` ;
le plafond d'actions d'une liste passe de 11 à 12, David, même jour). Propriétés et Renommer ne
sortent pas de la carte (`PROPERTIES_ACTIONS`) : ils déplient `ObjectProperties` juste sous elle,
un seul à la fois. Son état vit dans `ObjectPanel` : renommer change la clé de la carte, qui
renaît, et le panneau la suit sous son nouveau nom. Un objet supprimé (menu, console, Annuler)
emporte son panneau : un homonyme recréé ne le rouvre pas.

- **Le focus** : au panneau à l'ouverture, au champ du nom pour Renommer (`actionMovesFocus` :
  le menu ne le ramène pas sur son bouton ; chaque ouverture a son numéro, rechoisir
  « Propriétés » y remet le focus). Échap ou ✕ le referme et rend le focus au menu de la
  carte.
- **Nom ✎** : `Atelier.rename`, qui réécrit les objets qui citent l'ancien nom (`d = [AB]` devient
  `[EB]`) ; une annonce dit qui suit. Un refus (nom pris, réservé…) s'affiche sous le champ
  (`role="alert"`, `aria-describedby`), rien ne change. Le bouton est grisé tant que le nom est le
  même.
- **Ce qui se lit** (`propertiesOf`, recalculé à chaque changement, LaTeX régénéré par le calcul) :
  - point : nature (par coordonnées, milieu, intersection, sur un objet, projeté), coordonnées
    exactes (ou `≈`) ;
  - segment : longueur (et `≈`), extrémités, milieu ; demi-droite : origine, droite support,
    vecteur directeur ;
  - droite (construction ou équation) : équation réduite, équation cartésienne (entiers premiers
    entre eux, premier coefficient positif), coefficient directeur, ordonnée à l'origine
    (« aucun (droite verticale) »), vecteur directeur (entier réduit, première composante
    positive : `(1 ; 0)` pour `2y = 3`) ;
  - cercle (construction ou équation, centre et rayon tirés des coefficients) : centre, rayon,
    équation, périmètre et aire exacts (`6π`, `2π√5`) et approchés ; autre courbe : sa nature ;
  - valeur : sa valeur comme Calcul la dit (`valueAnswerOf`), approchée à côté, un décimal exact
    en décimal (`3,4`, pas `17/5`), unité écrite en clair (`√2 cm`, `m²`) ; fonction : variable, ensemble de définition (l'écrit
    croisé avec le domaine calculé par `computeDomain`) ; suite : mode, premier rang, premier
    terme (relu, jamais recopié) ; liste : nombre de valeurs ;
  - pour tous, « Dépend de » et « Utilisé par » (`citedNames`, `dependents`), dans l'ordre des
    cartes. Un objet en attente ou en erreur ne garde que ses dépendances.
- **Ce qui se règle** : le style du point de couleur (`FigureStyleSettings`, `CurveStyleSettings`,
  les mêmes composants que les fenêtres), l'étiquette d'un point (`MyCheckbox`), les bornes et le
  pas du curseur d'une valeur (`SliderSettings`).
- **Formes du cahier** (revue de #1630) : des coefficients irrationnels mais proportionnels se
  réduisent (la droite par (0 ; 0) et (√2 ; √2) : `x - y = 0`, vecteur `(1 ; 1)` ;
  `proportionalIntegers`) ; une longueur ou un rayon racine d'une fraction s'écrit sans racine au
  dénominateur, `√3/3` pour `3x² + 3y² = 1` (`withoutRootOfFraction`, `rootOverInteger`) ;
  un périmètre ou une aire à coefficient fractionnaire met π au numérateur, `2π√3/3` et `π/3`
  (et non `(2/3)π√3`), `π/4` pour un rayon 1/2 (`piTimes`, David, #1634) ; au-delà de 2^53,
  l'écriture `(n/d)π` garde les chiffres exacts.

### Vues

| Vue       | Composant           | Ce qu'elle projette                                                                                                                    |
| --------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Graphe    | `GrapheurContainer` | fonctions, suites (nuage / escalier), nuages de deux listes, tracés via `syncPlots`                                                    |
| Géométrie | `FigureView.svelte` | points, courbes et 𝒞f affichées dans un repère orthonormé (`GeometryCanvas`), via `syncFigure` ; les points se glissent (lot 3, M1-M2) |
| Données   | `DataView.svelte`   | la grille (une liste = une colonne nommée), diagrammes en bâtons / barres / circulaire                                                 |

Trois ponts à **sens unique**, tous idempotents (une empreinte évite de refaire le travail) :

- `syncEngine` (`engine.ts`) : l'atelier détient les noms, `WebReplEngine` n'est qu'un
  calculateur remis en accord avant chaque usage (Q1, option B). Une fonction liée s'y lit
  comme une fonction quel que soit son nom (`k(x) = x+1` puis `k(0)` → 1 ; avant le 2026-10-13,
  seuls f, g, h, u, v, w l'étaient) : le moteur passe son état à chaque lecture ;
- `syncPlots` (`plot-sync.ts`) : l'atelier détient l'état, le grapheur le reflète. Rien de ce qui
  se passe dans le grapheur ne remonte. ⚠️ L'effet qui l'appelle lit et écrit le store : s'il
  cessait d'être idempotent, il bouclerait. Il reçoit aussi les abscisses lues dans la console
  (`consoleReadings(desk.entries, …)`), posées sur la courbe en `reading` quand `showReading` est
  allumé ; l'effet suit donc aussi les lignes de la console. Appelé sans elles (nuage depuis le
  pupitre), il garde celles déjà posées.
- `syncFigure` (`figure-sync.ts`, géométrie v2, PR 2) : l'atelier → une `Figure` de
  `geometry-core`, tenue par `AtelierFigure` (une projection : `FigureView` la crée, un
  `$effect` la resynchronise à chaque `revision`, comme `syncPlots`). Par l'**API `Figure.create*`**, pas par le DSL :
  l'atelier a déjà les arbres (dérivées développées, fonctions remplacées par
  `substitutedAstOf` / `substitutedTextOf`), les réécrire en script reviendrait à relire une sortie
  texte (invariant 10). La forme d'une courbe est celle de `courbe()` (`curveShapeOf`,
  `geometry-core/geometry/curve-nature.ts`), lue d'abord sur l'équation **telle qu'écrite**
  (`y = 1/x` reste y = f(x), comme dans `courbe()`), puis sur l'équation **développée** si
  l'écrite ne donne qu'une implicite (`(x − 1)² + (y − 2)² = 4`, un cercle) ou si elle révèle une
  droite (`y = 4(x − 2) + 4`) : droite (exacte sans curseur), y = f(x), conique, implicite. Ce
  que l'équation décrit est **dessiné, même dégénéré** : point isolé (`x² + y² = 0`), droite
  double (`x² = 0`, `x² + 2xy + y² = 0`), deux droites par le marching squares (`x² = 4`) ; seul
  le vide ne dessine rien (la carte le dit). Une conique à curseur dont la sorte change au
  glisser (`x² = a`) porte les quatre tracés possibles, un seul dessiné à la fois. Une pose qui
  échoue retire ses aides cachées. Une valeur hors des bornes de sa carte (au-delà de ±10⁹) :
  ce qui la cite n'est pas dessiné (la figure la ramènerait dans les bornes). Un point sans curseur a ses
  coordonnées **exactes** (`GeoValue`), dessinées non déplaçables. Un objet en erreur, en attente
  ou à compléter n'est pas dessiné (F5). **Curseurs partagés (S1, S2, S4)** : chaque valeur à
  curseur citée devient un curseur **caché** de la figure, aux bornes de sa carte (sans pas : la
  valeur arrive déjà arrondie par `slideTo`) ; glisser la valeur appelle `Figure.moveSlider` et
  `recompute` — **sans reconstruire la figure**, seuls les descendants se recalculent. Une
  conique ou une courbe implicite qui cite un curseur passe par `parameterRecipe` (coefficients
  réévalués et conique reclassée, fermeture de F reliée aux valeurs courantes). Seul un
  changement de structure (objet, arbre, bornes) refait la figure. Mesuré (S2, 2026-10-18) : 10
  courbes dont 3 implicites, glisser `a` coûte ~11 ms par cran dans Chromium (toile 800 × 600,
  `slideTo` + synchronisation + rendu Svelte). **Intersections et `point_sur`** (lot 2, PR 3) : une
  intersection qui cite un curseur a pour coordonnées deux lettres (`intersection_1_x`), posées
  par deux `createScalarExpression` dont le calcul est `intersectionPoint` sur les supports où
  les valeurs des curseurs sont substituées — le calcul même de la carte, racines exactes
  comprises (revue : un Newton sur [−10 ; 10] dessinait un autre point), donc son point et sa
  numérotation (`FigurePlan.derived`, `FigureRecipes`) ; une position
  écrite de `point_sur` est un curseur caché (`position_M`) réglé par `moveSlider`. Ni l'un ni
  l'autre ne refait la figure ; un point sans solution n'est pas dessiné (NaN), et l'atelier,
  qui le met en attente, refait la figure à l'entrée et à la sortie de l'attente.

**Vue Géométrie** (`FigureView.svelte` ; l'onglet s'appelle « Géométrie » depuis la Q5 révisée, le
code garde ses identifiants `Figure*` et `ViewId` `'figure'`) : repère **orthonormé** par construction, `GeometryCanvas`
n'ayant qu'un `pixelsPerUnit` (F2 ; 13 unités sur le plus petit côté à l'ouverture) ;
`objectsMovable={false}` (étiquettes, double-clic figés) mais **les points se glissent** (lot 3,
PR 1, M1, M2, M7) : la toile ne touche pas la figure, elle DÉLÈGUE le geste (`pointDrag`, au plus un
mouvement par image ; rien n'est écrit sous 4 px de chemin, un clic qui tremble laisse `(1/3 ; 2,25)`
tel quel ; l'écart point − curseur de la saisie est gardé, le point ne saute pas ; un seul pointeur,
les autres sont ignorés ; la classe `dragging` est demandée à `FigureView` (`holds`), la figure
refaite en plein geste changeant les ids) ; `FigureView` retrouve le nom du point (`AtelierFigure.nameOf`) et appelle
`atelier.dragPoint(nom, x, y, aimantation, pixel)`, qui réécrit sa définition — tout se recalcule
pendant le geste (mesures, cartes), la figure suit par `syncFigure`. Un point par coordonnées
NOMBRES reçoit `(x ; y)`, chaque coordonnée aimantée à l'entier à moins de 8 px, sinon arrondie au
dixième (`(2,3 ; -0,7)`) ; un `point_sur` à position écrite reçoit sa position lue sur son support
(`supportOfPointOn` puis `positionAt` : paramètre projeté sur une ligne, angle en degrés dans
[0 ; 360[ sur un cercle, abscisse sur 𝒞f), par `slidePosition` (bornes et pas de son curseur).
En déplacement **fluide** (réglage, 2026-10-22, `atelier.fluidPixel`) : aucune aimantation, les
coordonnées au pixel près (`pixel` = `1 / ppu`, le moins de décimales qui garde l'arrondi sous un
pixel : 2 au zoom habituel, 6 au plus) ; la position d'un `point_sur` part du pas de son curseur
et s'affine (`positionWithin`, 3 décimales de plus au plus) jusqu'à retomber à moins d'un pixel —
un petit cercle reste au degré, un grand passe au dixième. Les flèches (pas de 0,1) et le curseur
de la carte n'en dépendent pas.
Ne se glissent pas (`dragRefusal`, phrase sous la barre, `role="status"`) : un point construit
(« déplace les points dont il dépend »), des coordonnées ou une position qui citent une valeur
(« glisse son curseur »), un `point_sur` sans position écrite. Coût mesuré (banc
`banc-glisser.svelte.test.ts`, figure de 24 objets, A dont tout dépend, Chromium) : médiane
15,9 ms, p90 17,6 ms par mouvement, figure refaite comprise. La toile suit la largeur
de son conteneur (téléphone). La case « Repère » (`MyCheckbox`) montre ou masque grille, axes et
graduations : l'état vit dans l'`Atelier` (`figureFrame`, `setFigureFrame`), **hors
`serialize()`** comme `charts`, rendu à son défaut (affiché) par `restore()` (G4, F3). Sans point
ni courbe ni fonction affichée, la vue dit « Écris un point A = (1 ; 2) ou une courbe d : y = 3x − 2,
ou affiche une fonction depuis sa carte. » (F1).

**Barre d'outils** (lot 3, PR 2 et 3, M3, M4, M5, M7, M8 de
`docs/archive/wip/atelier-geometrie-lot3-phase0.md`) : Déplacer (par défaut) · Point · Segment · Droite ·
Demi-droite · Cercle · Milieu · Intersection · Point sur un objet · Parallèle · Perpendiculaire, en icônes (`aria-label`, `aria-pressed`, motif de barre d'outils
`rovingToolbar`). Un outil **écrit la ligne qu'on aurait tapée** (G2) : `FigureToolbox`
(`figure-tools.svelte.ts`) ne crée rien, il passe ses lignes à `write` — `desk.write`, par le
conteneur (`writeFromFigure`) : une ligne de console rejouable (geste `saisie`), une étape, jamais
rappelée par ↑, brouillon intact, console fermée (G7) mais la ligne et sa réponse annoncées. Lignes
écrites : `A = (1,5 ; 2)` (aimanté aux entiers à 8 px, sinon au dixième, comme le glisser ; au
pixel près en déplacement fluide, et un `point_sur` posé aussi),
`d = [AB]`, `d_1 = (AB)`, `d_2 = [BA)`, `c = cercle(A ; passant=B)` ; la construction n'avance que
si sa ligne a réussi. Noms (M4, `nextPointName`, `nextLineName`, `nextCircleName`) : première
majuscule libre puis `A_1`… ; `d`, `d_1`… pour droites, segments, demi-droites ; `c`, `c_1`… pour
les cercles — jamais un nom pris ni refusé par `indexedNameClash` (une fonction `d` fait passer
à `D`). Un clic près d'un point existant le réutilise (8 px souris, 20 px doigt), le même point
deux fois est refusé (« Choisis un autre point que A. »). Avec un outil, la toile ne glisse plus
rien : elle délègue le clic (`canvasTool`), le fantôme (`overlay`) suit le pointeur, la consigne
(« Clique sur un deuxième point. ») est dite sous la barre (ligne réservée : la toile ne saute pas).
Échap ou un second appui sur l'outil abandonne la construction (le premier point posé reste). Les
flèches déplacent le point choisi (le dernier saisi ou posé, entouré) par `dragPoint` : pas de 0,1,
Maj : 1, une flèche tenue = une étape (`endGesture` au relâcher). Un appui sur la toile lui donne
le focus (`focusCanvas`, en capture) : la toile annule le `pointerdown`, et sans lui les flèches
restaient à la barre d'outils ou faisaient défiler la vue (2026-10-22).

**M5 complet et outils de construction** (lot 3, PR 3). La toile dit au clic ce qui est proche :
le point (`findPointNear`), et les autres éléments à la même distance, le plus proche d'abord
(`findElementsNear` de `geometry-core/interaction/hit-testing.ts`) ; `FigureView` les traduit en
noms (`projection.nameOf`). Au survol, avec un outil, le point visé, sinon l'objet le plus proche,
est mis en évidence. La boîte calcule sur l'atelier (`supportNamed` de `construction.ts` : le
support résolu d'un objet nommé ; `commonPoints` de `construction-intersect.ts` : les points
communs sur les portions, avec le `k` qui les écrit, `null` pour deux lignes). Un outil qui attend
un point, là où aucun point n'est visé, écrit : l'**intersection** de deux objets proches si l'un
de leurs points communs est sous le clic (`C = intersection(d ; c ; 2)`, le plus proche ; sans `k`
pour deux lignes) ; sinon un **`point_sur`** de l'objet le plus proche, à la position du clic
arrondie au pas de son curseur (segment au centième, ramené dans [0 ; 1] ; demi-droite et droite
au dixième, une demi-droite pas sous 0 ; cercle en degrés entiers ; courbe y = f(x) au dixième —, affinée d'une décimale à la fois (trois au plus) tant que le
point écrit est à plus d'une demi-tolérance du clic (droite longue, courbe raide) —
`point_sur(d ; 0,63)`, donc glissable) ; sinon un point par coordonnées. Outils : **Milieu** —
deux points (`C = milieu(A ; B)`), ou un clic sur un segment (`C = milieu(d)`) ; **Intersection** —
un clic où deux objets se coupent, ou un objet par clic et le point commun le plus proche du
second clic (« c et d_1 ne se coupent pas. », « … ont une infinité de points communs. », la raison
d'un couple que l'atelier ne coupe pas — fonction × cercle —, « Choisis un autre objet que c. ») ; **Point sur un
objet** — un clic sur l'objet, jamais une intersection ; **Parallèle**, **Perpendiculaire** — la
droite (droite, segment, demi-droite, droite par équation) puis le point (M5), ou un point
existant puis la droite : `d_1 = parallele(C ; d)`, `d_1 = perpendiculaire(C ; d)` ; un cercle ne
donne pas de direction (« Clique sur une droite, un segment ou une demi-droite. »). Fantômes : le
milieu (segment et point) ; la parallèle ou la perpendiculaire par le pointeur, une fois la droite
choisie. Limite connue : seul le premier morceau d'une fonction à plusieurs morceaux porte son nom
dans la figure, les autres ne se visent pas.

**Téléphone et tablette** (lot 3, PR 4, M6). La vue se déplace et se zoome sans rien écrire (ni
ligne, ni étape) : deux doigts la déplacent et la zooment, quel que soit l'outil (un appui d'outil
interrompu par un second doigt ne pose rien) ; avec Déplacer, un glisser sur le fond, au doigt ou
à la souris, la déplace — un point se glisse toujours, le second doigt d'un glisser est ignoré
(prop `viewGestures` de `GeometryCanvas`). Au doigt (`pointer: coarse`), boutons d'outils de
44 px. Sous 640 px (le seuil de la console pleine page), la toile prend la vue (plancher de
10rem), la barre d'outils passe **dessous**, sur une rangée qui défile de côté (ombre du côté où
il reste des outils, case Repère au bout), consigne et invite de la vue vide se posent sur le haut
de la toile (fond translucide, sans capter le doigt ; vide, la région `role="status"` reste
rendue). Même disposition sur un écran bas (`max-height: 480px`, téléphone couché), plancher
6rem : la barre d'outils reste à l'écran. Sans outil, le doigt resté posé après un pincement
continue de déplacer la vue. Mesuré sur iPhone 13 (390 × 664) : toile de 234 px de haut,
« Mes objets » vide au-dessus ; couché (750 × 342) : 117 px. ⚠️ La page des tests navigateur
(414 px de large) prend cette disposition (toile de 10rem) : un test qui suppose une échelle en
pixels y casse.

**« Mes objets » sur téléphone** (décision du 2026-10-19, journal
[atelier-mes-objets-telephone-progress.md](../archive/wip/atelier-mes-objets-telephone-progress.md)) : en
une colonne (≤ 720 px), le panneau ouvert ramenait la vue à son plancher (toile de 160 px avec deux
points). Il s'ouvre donc **replié** : une barre « Mes objets · N objets » et un bouton
(nommé par le titre, `aria-expanded`, `aria-controls` ; absent quand l'atelier est vide) qui
déplie cartes et boutons « + ». Le repli est tranché en CSS
(classe `replie`, pas de `matchMedia`) : au-dessus de 720 px le bouton est caché et le panneau
toujours déplié, sans flash au chargement. Il se **déplie** seul quand l'atelier est vide (les « + »
sont la seule entrée), quand on crée depuis un « + » (le premier objet ne le referme pas), et quand
une carte prend la main (`selected` non nul : la carte prête à taper de `/grapheur`, f′ après
« Dériver »). Un objet créé ailleurs (barre d'outils de Géométrie, console) le laisse replié ; le
compte suit. Le choix n'est pas retenu d'un chargement à l'autre. ⚠️ Les tests des cartes, qui
tournent à 414 px, se jouent sur bureau (`harness/desktop-screen.ts`) ; le repli a ses propres
tests (`mes-objets-telephone.svelte.test.ts`).

**𝒞f dans la vue Géométrie** (PR 3, K1-K3) : l'action de carte « Afficher dans Géométrie » /
« Retirer de Géométrie » (`figure` dans `BY_KIND`, bascule comme « Tracer ») pose `inFigure` sur
la fonction (`setInFigure`, un état d'affichage **rangé** comme `plotted` : sauvegarde, lien,
fichier `.atelier.json`, fusion ; version 4). Elle passe par `CalcDesk.runFromPanel` : une ligne
dans Calcul (« La courbe de f est affichée dans Géométrie. »), rejouable ; `AtelierContainer`
ouvre l'onglet Géométrie quand elle affiche (A5, comme « Tracer » ouvre le Graphe). Désactivée
avec la raison de l'objet si la fonction n'est pas `ok` (invariant 9) ; « Retirer » reste
possible. `syncFigure` trace la fonction par `createFunction` (l'arbre de `substitutedAstOf`,
curseurs gardés en lettres et liés par nom : `f(x) = a x²` suit `a` sans reconstruire), une
`GeoFunction` par morceau de son ensemble (`plotRestrictionOf`, hérité compris : K2), nommée
comme sur sa carte (`f`, `f′`, `f⁻¹`), et **peinte du trait de sa carte** (K4, 2026-10-18) :
couleur (`display.color`, la `CurveColor` du Graphe, peinte par son jeton `var(--color-curve-N)`,
le même en clair et en sombre), pointillés et épaisseur (`dashdot` devient des tirets, la figure
n'en a pas) ; un changement dans la carte repeint par `Figure.updateStyle`, sans reconstruire
(`syncFigure` rend `restyled`) ; une fonction jamais tracée garde la couleur par défaut. Le
même chemin (`Look`, hors empreinte, posé par `paint` sur tout ce qui est visible et posé pour
l'objet) sert aux points et aux courbes depuis le lot 4b.
`f′` et `f⁻¹` ont la même action, leur propre couleur de carte, et suivent `f` (K3) ;
une carte `f′` ou `f⁻¹` créée depuis une `f` affichée naît affichée, comme pour le tracé.

**Nature d'une courbe** (`curve-nature.ts`, C1, C2, C6) : la carte remplace le type « courbe »
par la nature, **recalculée** à chaque lecture (jamais rangée) avec les valeurs citées
remplacées — « droite », « cercle », « ellipse », « parabole », « hyperbole », « deux droites »,
« point », sinon « courbe ». Une courbe vide reste acceptée et la carte constate « Aucun point
ne vérifie cette équation. » (C6) ; une conique réduite à un point dit « point » et constate
« Un seul point vérifie cette équation. ». Même classification que `courbe()`
(`curveNatureOf`, `degenerateConic`). La carte d'un point ou d'une courbe se lit comme celle
d'une fonction, sur une ligne : le nom, le « : » ou le « = », puis le champ (lot 4b).

### Copier une réponse

Chaque ligne qui a une réponse porte **« Copier »** (phase 0
[atelier-copier-phase0.md](../archive/wip/atelier-copier-phase0.md), décisions de David du 2026-10-15) : la
**réponse seule**, en **texte lisible** (`2√2`, `2x² + 5x − 3`, `S = ]−∞ ; −2[ ∪ ]2 ; +∞[`,
`12,3 km`, `lim x→+∞ (1 + 1/x)ˣ = e`) ; la flèche ▾ propose **« Copier en LaTeX »**. La valeur
approchée quand le bouton ≈ l'affiche (le « = » de tête tombe). Pas de bouton sur un refus ni sur
une définition ; une ligne sans formule (`.stats`) copie son texte.

- Le texte vient du **LaTeX** de la ligne (`readableText`, `copy-text.ts`), jamais de `Entry.text`,
  souvent la sortie du terminal (`.résoudre` y met toute sa trace) ; la conversion de MathLive
  (`convertLatexToAsciiMath`) écrit `(1)/(2)`, `k m`. Elle ne connaît que les commandes que
  l'atelier écrit : une autre (tableau, environnement) → le LaTeX est copié, et le retour le dit.
  Garde : l'exemple de chaque commande du catalogue s'écrit en texte (`copie-texte.test.ts`).
- Le retour (« Copié. », « Copié en LaTeX. », « Ton navigateur a refusé la copie. ») va dans la
  ligne de retour de Calcul, annoncée.

### Réglages et écriture mathématique

Le bouton **« Réglages »** de la barre du haut (`AtelierSettings.svelte`, 2026-10-14) ouvre une
fenêtre à trois réglages. **« Déplacement des points »** (2026-10-22, `point-drag-mode.ts`) :
**Aimanté** (le défaut) ou **Fluide** — voir le glisser des points dans « Vue Géométrie » ; retenu
dans ce navigateur (`chiphre-atelier-deplacement`), posé par `setPointDragMode` (hors `serialize()`,
rien à recalculer). **« Angles »** (2026-10-18, `angle-unit.ts`) : **Degrés** (le défaut,
comme `unite_angle` du DSL) ou **Radians** — l'unité des seules mesures d'angle (`angle(A, B, C)`) ;
un nombre seul reste en radians (`cos(60)`, dérivées, tracés inchangés). Retenu dans ce navigateur
(`chiphre-atelier-angles`), posé sur l'atelier par `setAngleUnit` (hors `serialize()`, qui
recalcule), jamais dans un lien. **« Saisie dans Calcul »** : **Texte** (le champ de toujours, un point
devant les commandes ; le défaut) ou **Écriture mathématique** (MathLive, sans point, marquée « en
essai »). Le choix prend effet tout de suite et reste dans le navigateur (`chiphre-atelier-saisie`,
à part de l'atelier) : ni dans un lien, ni dans un export ; présent aussi sur un atelier reçu.
Phase 0 : [atelier-reglages-phase0.md](../archive/wip/atelier-reglages-phase0.md) ; journal des règles de
frappe : [atelier-saisie-naturelle.md](../archive/wip/atelier-saisie-naturelle.md).

**Règles de frappe** (décisions de David du 2026-10-13, `natural-input.ts`) :

- **Le premier mot décide** : une ligne qui commence par un mot du vocabulaire des commandes
  (résoudre, dériver, factoriser, développer, simplifier, variations, limite, intégrer, réciproque,
  domaine, aide… ; accents facultatifs ; formes conjuguées « résous », « dérive ») est une commande ;
  sinon un calcul ou une définition. Aucun point à taper ; un point tapé reste accepté sans bruit.
- **Les petits mots** (de, à, en, sur, pour, dans, et, ordre, par) ne sont des mots **que** dans une
  commande (et « sur » après le `=` d'une définition), jamais dans un calcul.
- **Un mot devient texte quand il est fini** (espace, caractère mathématique, ou choix dans la
  liste), pas dès que ses lettres correspondent (sinon « de » dans « deriver ») ; retour aux maths
  automatique.
- **Texte libre** (modalités `fille ; garçon`) : reste dans Données et les cartes.
- **Modèles à trous** : choisir une commande insère « intégrer ▢ de ▢ à ▢ » (`\placeholder{}`) ;
  onglet « Commandes » du clavier virtuel.
- **Unités** : « un nombre, une espace, une unité » (même `mathModeSpace` que les cartes) ; une
  unité reconnue s'affiche en romain (5 km).
- **Complétion** : commandes dès les premières lettres d'une ligne, unités après « nombre +
  espace » ; fonctions et lettres grecques par les raccourcis de MathLive ; déclenchée sur `input`
  (clavier virtuel compris). Liste ouverte : **Entrée calcule, Tab choisit**.
- Une fraction ne se quitte pas toute seule quand on tape un opérateur : on en sort par → ou Tab,
  comme partout dans MathLive (2026-10-14).

- **Les mêmes réponses** : le champ mathématique envoie au moteur le texte que lit `runInput`
  (`calcTextOf`) ; une case vide d'un modèle est refusée avant (la ligne reste, la raison s'affiche).
- **`desk.draft` reste la ligne en cours, en texte, quel que soit le champ** : le champ
  mathématique l'écrit à chaque frappe (`draftTextOf`, cases vides retirées) et la reprend quand
  elle change du dehors — bascule depuis le mode texte, commande préparée par une carte, ligne
  vidée après un calcul (`fieldLatexFromText`). Son LaTeX est tenu par le **conteneur** : la vue
  Calcul est démontée au passage par le Graphe, et la reconstruire depuis le texte perdait les
  cases d'un modèle.
- **`fieldLatexFromText`** fait tomber le point d'une commande ; dans une commande, il coupe aux
  espaces hors parenthèses et joint les morceaux par `\,` — une espace simple ne se voit pas en
  mathématiques (`.simuler L M 100` s'affichait « simuler LM100 ») ; les mots de commande, petits
  mots et mots de plusieurs lettres restent des mots (`.mode décimal`, `G = fille`). Le test
  `natural-input-champ.svelte.test.ts` passe chaque exemple du catalogue par le VRAI champ.
- **↑ / ↓** rappellent les saisies tapées dans l'un ou l'autre mode, réécrites pour le champ ;
  le rappel compare à ce que MathLive a rangé (`{2 x}` devient `{2x}`), pas à l'historique.
- **Le clavier virtuel est un seul pour la page** : les onglets « Calcul » et « Commandes » sont
  posés quand le champ prend le focus et retirés quand il le perd (les cartes ont leurs champs
  MathLive), comme `FillBlanksInput.svelte`.
- En écriture mathématique, la liste des commandes et le « Modèle : » du mode texte ne s'ouvrent
  pas : le champ a sa propre liste. Le focus réel est dans le shadow DOM de MathLive, où
  `aria-controls` de l'hôte ne porte pas : une région `status` annonce la proposition surlignée
  (« résoudre, 1 sur 2 »). La liste s'ouvre au-dessus du mot quand le champ est dans la moitié
  basse de l'écran, et défile.
- **L'historique montre la saisie écrite** (`Entry.inputLatex`, composée par MathLive) au lieu du
  texte envoyé (`.dériver x^3`, avec un point jamais tapé) ; un lecteur d'écran lit ce texte sans
  le point (la lecture de MathLive est en anglais). `label` reste le texte envoyé : l'export et le
  rejeu l'utilisent, et une ligne rejouée revient en texte. Gardée au rechargement, relue par la
  liste blanche comme une réponse — et la vue la refiltre AVANT de la composer, quelle que soit sa
  provenance : ↑ rappelle des saisies relues du stockage, filtrées en longueur seulement (audit du
  2026-10-14 : `\htmlStyle{…}` rappelé puis validé posait un calque dans la page). Le champ vide a sa consigne (`placeholder` de MathLive, en
  LaTeX).

### Session, persistance, URL

- **Stockage local** (`persistence.ts`) : clé `ATELIER_STORAGE_KEY` (`chiphre-atelier`),
  version `ATELIER_STATE_VERSION`. On range de quoi **reconstruire** (nom, type, définition,
  tracé, lettre, intervalle, réglages), jamais l'état ni le message — ils se recalculent. La carte
  `f⁻¹` est rangée sans sa formule ni son ensemble (recalculés depuis f, comme `f′`), avec
  l'intervalle tapé (`reciprocalOn`) ; un lien ou une fusion la recrée, et une f renommée à
  l'arrivée (`g`) emmène sa réciproque (`g⁻¹`, `mergeInto`). Un objet abîmé est
  écarté seul (`salvageObjects`), un réglage abîmé est oublié, l'objet gardé ; un intervalle refusé à la relecture (lien, fusion) aussi, la fonction gardée sur son domaine. Un état d'une version
  **plus récente** n'est ni relu ni écrasé. **Version 2** (2026-10-15) : la colonne de chaque liste
  (`column`, `A`-`Z`), les titres des colonnes (`grid.titles`) et les cellules des colonnes sans nom
  (`grid.cells`, sans « ; », triés un par un par
  `salvageGrid`, réunies par `salvageState`) ; une version 1 se relit, ses listes placées en A, B…
  dans l'ordre des cartes. Sans la version 2, un onglet resté sur l'ancien code relirait l'état en
  jetant la grille, puis l'enregistrerait. **Version 4** (2026-10-18, PR 3 de la géométrie) :
  `inFigure` (𝒞f affichée dans la vue Géométrie) ; une version 3 se relit, rien n'y est
  affiché. **Version 3** (2026-10-18, géométrie) : les types
  `point` et `curve`, et `y` réservé — `migrateReservedNames` renomme un objet `y` à la première
  lettre libre de son type (ses cartes `y′`, `y⁻¹` avec lui), réécrit ce qui le cite (définitions
  sauf celles des courbes, premier terme d'une suite, formules de la grille, `renameInFormula`) et
  rend le renommage : `restore` le met dans son rapport (`renamed`), la session et `openLink` le
  disent (« « y » est désormais réservé aux équations : ton objet s'appelle maintenant k. »), la
  fusion le compte parmi les arrivants renommés en évitant aussi les noms de l'atelier qui reçoit. « Garder dans mon atelier » dit aussi le renommage d'un `y` de l'atelier personnel, relu à cette occasion (`MergeReport.migrated`, `ShareBar.svelte`).
  Appliquée à toute relecture, quelle que soit la version. Chaque issue est nommée (`LoadOutcome`,
  `SaveOutcome` : stockage indisponible, quota, trop volumineux…).
- **Session** (`session.ts`) : sauvegarde différée de 500 ms sur `revision`, écrite aussi au
  `pagehide` ; l'événement `storage` signale une écriture d'un autre onglet. Tout ce qui doit être
  dit passe par `onNotice`. Une visite de `/grapheur` sans geste n'enregistre rien.
- **URL** (`url.ts`) : `?a=<charge>`, l'état sérialisé compressé en `deflate-raw` puis base64url ;
  un préfixe d'un caractère dit compressé / brut (repli sans `CompressionStream`). Limite
  `MAX_URL_PAYLOAD` (1 800 caractères), dite **avant** de copier.
- **Liens de projection** (`grapheur-link.ts`) : `/grapheur?f=x^2-3x+1&f=…`, 1 à
  `MAX_LINK_CURVES` (8) courbes validées par Zod ; « sur » s'y lit comme ailleurs
  (`?f=x^2 sur [0;+∞[`, décision g du 2026-10-13).
- **Mode éphémère** : `?a=` comme `?f=` ouvrent un atelier qui **ne lit ni n'écrit** l'atelier
  personnel ; un lien abîmé le dit et ouvre l'atelier personnel. « Garder dans mon atelier »
  (`keepReceived`) verse dans l'atelier personnel ; en cas de collision, **l'arrivant est
  renommé** et on le dit (Q2, `mergeInto`). Ses colonnes (listes et cellules sans nom) vont dans
  les **premières colonnes libres**, dans leur ordre ; pas assez de colonnes libres → refus,
  rien n'est versé (T7, `mergeRefusal`). Les noms des arrivants sont choisis **avant** toute
  création, et une lettre libre évite aussi les noms des autres arrivants (pas de renommage en
  chaîne) ; puis les arrivants qui citent un renommé sont réécrits (B9 de
  `atelier-remplacer-phase0.md`, `renameInObject` : texte et LaTeX de carte, `a_1` / `a_{1}`,
  longueurs `AM`, constructions, premier terme d'une suite) — reçu `a = 3` et `f(x) = a x` dans un
  atelier qui a `a = 5`, `f` suit le `a` reçu devenu `b`, plus le `a` local.
- **Remplacer mon atelier** (`docs/archive/wip/atelier-remplacer-phase0.md`, R1-R5 et B1-B9, validée
  par David le 2026-10-19) : l'autre geste d'un atelier reçu, à côté de « Garder »
  (`ShareBar.svelte`, `onReplace`). Confirmation qui compte (« Tes 6 objets et ta grille seront
  remplacés. Ton atelier est mis de côté : tu pourras le retrouver. », `replacementLoss`), sans
  confirmation ni copie si l'atelier personnel est vide (B1). L'atelier personnel est **mis de
  côté** sous sa propre clé, `SET_ASIDE_STORAGE_KEY` (`chiphre-atelier-de-cote`), une seule copie,
  écrite **avant** l'atelier reçu (`replacePersonal`) ; une écriture refusée (quota, stockage
  indisponible) défait la précédente et rien ne change (B5) ; un atelier personnel plus récent ou
  abîmé n'est pas remplacé, comme la fusion (B6). Ce qui devient l'atelier personnel est l'atelier
  **affiché** (le lien, avec ce que l'élève y a fait). Le conteneur quitte alors le lien **sans
  recharger** : l'ancien atelier est remis à l'écran puis remplacé en une étape
  (`replaceWith`, « remplacer mon atelier » : un Ctrl+Z le rend), la session s'ouvre sur
  l'atelier affiché sans le relire (`openSession(…, { adopt: true })`, qui garderait sinon la
  pile vide), la console de l'élève revient (R4 : celle du lien est oubliée, la sienne relue), et
  la page retire `?a=` / `?f=` de l'adresse (`onLinkLeft`, `replaceState`). Avis « Ton atelier
  précédent est mis de côté. » avec le geste **Retrouver mon atelier précédent** (B4).
- **Retrouver mon atelier précédent** : dans l'avis qui suit un remplacement, et dans la barre
  d'icônes après Charger (`ArchiveRestore`) **seulement quand une copie existe** (B4). C'est un
  **échange** (B3, `swapWithSetAside`) : la copie devient l'atelier personnel, l'atelier quitté
  devient la copie (un atelier vide efface la copie au lieu d'en laisser une vide), les deux
  écritures ou aucune ; à l'écran, `replaceWith` (« retrouver mon atelier précédent »,
  annulable). La copie est relue par les mêmes schémas que l'atelier personnel (`loadAtelier(…,
SET_ASIDE_STORAGE_KEY)`) et les migrations à sa relecture par l'atelier (`y` renommé, dit) ;
  abîmée, elle est oubliée avec un message (B7) ; d'une version plus récente, ni relue ni oubliée.
  **Annuler / Rétablir gardent la copie d'accord avec l'écran** : l'atelier qu'ils quittent devient
  la copie (`onLeave` de `replaceWith` → `keepLeftAside`, qui range d'abord l'atelier affiché
  tout de suite, `session.saveNow()`, puis la copie) — rien n'est jamais perdu. Le Annuler /
  Rétablir d'un remplacement s'écrit dans la console **sans geste rejouable**
  (règle générale `#replayable` du pupitre, #1521 : le remplacement n'a pas de ligne de
  console) — au rejeu, « annuler » aurait défait l'étape d'avant. Le bouton cliqué disparu, le focus va à « Mes objets ».
- **Lignes de Calcul** (`history-storage.ts`, décision de David du 2026-10-13, « option 1 ») :
  clé **à part**, `CALC_HISTORY_STORAGE_KEY` (`chiphre-atelier-historique`), version
  `CALC_HISTORY_VERSION`. Rangées 500 ms après la dernière ligne (et au `pagehide`, au démontage)
  par `keepCalcHistory` (`session.ts`), relues au montage : les `MAX_KEPT_LINES` (100) dernières
  et les saisies tapées pour ↑ / ↓. On range ce que l'écran **montre** — saisie, réponse, échec,
  note, bouton ≈ (`alternative`), formules d'un refus (`formulas`) — et le geste (`replay`, un
  « Garder » recalé sur les lignes gardées) ; **jamais l'arbre du résultat** : une ligne restaurée
  n'a ni « Garder », ni « Comment ? », ni tableau, ni graphique (retaper la saisie par ↑ les
  redonne). **Rien n'est refait** : une définition restaurée ne crée ni ne change aucune carte.
  Plafonds : `MAX_KEPT_HISTORY_LENGTH` (200 000 caractères, à côté des 500 000 des cartes), dont
  40 000 pour les saisies ; saisie et libellé 4 000 (`MAX_DEFINITION_LENGTH`), texte 10 000
  (raccourci « … »), formule 5 000 (au-delà, oubliée : la ligne reste en texte), note 1 000. Trop gros ou stockage plein : les
  lignes les plus récentes, en silence, jamais d'échec — la clé à part ne coûte jamais les cartes.
  Une version plus récente n'est ni relue ni écrasée ; un état illisible ou une chaîne plus longue
  que le plafond : Calcul repart vide. Le lien `?a=` n'encode que `Atelier.serialize()`, sans
  l'historique ; le mode éphémère ne lit ni n'écrit cette clé. **Deux onglets** : aucune écoute
  `storage` pour cette clé, le dernier qui range écrase les lignes de l'autre (et un « Repartir
  de zéro » fait dans l'un revient si l'autre ajoute une ligne) — des lignes d'affichage, jamais
  les cartes.
- ⚠️ **Sécurité de la relecture** : ce qui revient du `localStorage` est une entrée **non
  fiable**, et la vue compose les formules en `{@html}` (`convertLatexToMarkup`). Mesuré le
  2026-10-14 (MathLive 0.111.1) : `\htmlStyle{…}{x}` rend un `style`, `\class`, `\cssId`,
  `\htmlData` des attributs, `\href` un lien. Une formule (`latex`, `alternative.latex`, chaque
  `$…$` d'un refus, `inputLatex`) n'est gardée que si **chacune de ses commandes** est sur la liste blanche de
  `safe-latex.ts` (commandes lues comme le `Tokenizer` de MathLive : lettres et `*` ; notation
  `^^5c` refusée ; environnements `\begin{…}` nommés ; **caractères ASCII et Latin-1 seulement** :
  au-delà de U+00FF, MathLive regroupe les caractères avant de lire les commandes, avec des bornes
  fausses — un ZWJ devant `\\htmlStyle` lui faisait lire `\htmlStyle`, audit du 2026-10-14 ;
  40 niveaux d'accolades au plus : MathLive épuise sa pile vers 400) — sinon elle est oubliée et
  la ligne se montre en texte, échappé par Svelte. Relire par `parseLatex` puis `toLatex` a été
  écarté : 15 réponses ordinaires sur 43 ne se relisent pas (`\approx`, `\left\{`, intervalles,
  `\mathrm`, `\mathbb{R}`). Gardes : `historique-garde.test.ts` (états forgés),
  `historique-garde-sonde.test.ts` (chaque commande permise composée par MathLive avec des
  arguments piégés : aucun ne finit dans un attribut), `historique-garde.svelte.test.ts` (le DOM
  rendu).
- **Repartir de zéro** : confirmation, vide les objets et la grille, **garde la console** (décision
  de David du 2026-10-19, qui remplace C3 : l'historique était vidé) et y écrit la ligne « Atelier
  vidé. » ; actif dès qu'il y a un objet ou une grille (`atelier.isBlank` faux) — des lignes de
  console seules ne suffisent plus ; absent d'un atelier reçu. Annulable depuis le lot 5 (voir
  « Annuler / Rétablir »).

### Annuler / Rétablir (lot 5)

Phase 0 : `docs/archive/wip/atelier-annuler-retablir-phase0.md` (validée par David le 2026-10-19). Une
**pile de photos** (`history-stack.ts`, pur) : avant et après chaque étape, l'atelier tel que
`serialize()` le range, plus les diagrammes affichés et la graine des tirages. Annuler remet la
photo d'avant, Rétablir celle d'après, par la même voie que la relecture (`restore`) — sauf ce
qu'une relecture remet à zéro et qu'une annulation garde : les lois des variables aléatoires et le
repère de la vue Géométrie. Hors photo, donc jamais annulés : le réglage des angles, le mode de la
console, le zoom du graphe, l'ouverture de la console, l'onglet.

- **Une étape** = `atelier.step(nom, geste)`. Les étapes s'emboîtent : seule la plus externe
  enregistre (une ligne de console qui fait cent mises à jour puis crée deux listes = une étape).
  Une étape qui ne change rien (un calcul, `f(2)`) n'est pas gardée.
- **Qui ouvre une étape** : une ligne de console (`#submit`, nom « « f(x)=x^2 » », y compris une
  ligne écrite par un outil de la vue Géométrie, `write`), une action de
  carte (`runFromPanel`), « Garder », une validation de carte (`DefinitionField`), et les méthodes
  du modèle qui sont toujours un geste : `create`, `createDerivative`, `createReciprocal`,
  `createFromOffer`, `rename`, `removeWithDependents`, `setPlotted`, `setInFigure`, `setDisplay`,
  `setSequenceDisplay`, `setFigureDisplay`, `setSequence`, `setSlider`, `setSliderShown`,
  `toggleChart`, `slideTo`, `slidePosition`, `dragPoint`, et tous les gestes de la grille. `update` n'en ouvre
  PAS.
- **Un geste continu = UNE étape** (PR 2, décision de David : « tout un glissé = une étape » ;
  revue de #1517 : 150 crans de tangente faisaient 100 étapes et chassaient une suppression).
  `step(nom, geste, clé)` : tant que le geste n'est pas fermé (`endGesture()`), ses écritures se
  fondent dans une seule étape, dont la photo d'avant reste celle du début ; un geste revenu à son
  point de départ ne laisse rien ; un autre geste, Annuler ou Rétablir le ferment aussi
  (`HistoryStack.push(…, clé)` / `seal`). Clés : `curseur:a` (`slideTo`), `position:M`
  (`slidePosition`, le curseur d'un `point_sur` ou son glisser), `glisser:A` (`dragPoint`, un
  point par coordonnées glissé à la souris, fermé au relâcher ; tant qu'il est ouvert,
  `atelier.draggingPoint` est vrai et Ctrl+Z / Ctrl+Y de `AtelierContainer` ne font rien), `tangente:f` (`CurveSettings`),
  `borne-from:f` / `borne-to:f` (bornes de l'aire), `curseur-min:a`… (`SliderSettings`).
  **Fin du geste** (`gesture.ts`) : souris ou doigt → au relâchement (`onValueCommit` de bits-ui) ;
  clavier → au relâchement de la touche, donc **un appui = une étape et une flèche tenue = une
  étape** (bits-ui rappelle `onValueCommit` à chaque `keydown`, répétitions comprises : le
  conteneur écoute `keydown` en capture pour ne pas fermer à la première répétition) ; perte du
  focus, par sûreté ; `pointercancel` (le navigateur reprend le geste au doigt : bits-ui ne ferme
  rien, et le glissé suivant se fondait dans la même étape, revue de #1518). Un champ tapé à chaque frappe (bornes, réglages du curseur) se ferme quand on
  le quitte (`change`). Les points de lecture graphique (`ReadingSliders`) ne sont pas rangés : ils
  ne font aucune étape.
- **Un changement fait hors étape** n'est jamais perdu : à la prochaine étape ou annulation,
  l'écart avec la dernière photo devient sa propre étape, « modifier l'atelier »
  (`OUTSIDE_STEP_LABEL`). La barre le dit tout de suite (le setter de `revision` publie « Annuler :
  modifier l'atelier ») ; si l'écart s'est annulé de lui-même, le libellé ment jusqu'au clic.
- **La provenance** de chaque définition est dans la photo : Annuler relit une définition comme
  elle avait été écrite (`keyboard`, `text`…), pas comme un lien (`url`) — le curseur d'une
  valeur lit sa constante selon la provenance.
- **Remplacer tout l'atelier en une étape** : `atelier.replaceWith(état, nom, { onLeave })`
  (objets, grille, réglages rangés), par la voie interne de restauration qui **garde la pile** :
  un Ctrl+Z rend l'atelier d'avant, les étapes d'avant restent annulables. La console n'en fait
  pas partie (R4). `onLeave(atelier quitté)` est appelé quand Annuler ou Rétablir quitte un côté
  de l'étape. Servent : « Remplacer mon atelier » et « Retrouver mon atelier précédent ».
  Le remplacement remet les lois des variables aléatoires et le repère de Géométrie à leur défaut,
  comme une relecture ; hors des photos, ils sont gardés à part (`#settingsAcross`) et Annuler /
  Rétablir échangent ceux de l'écran contre ceux de l'autre côté (revue de #1524 : Annuler les
  perdait).
- **Jamais une étape** : une relecture (`restore` : chargement, autre onglet, lien reçu, qui
  **vide la pile**), un atelier ouvert par un lien `?f=` (`atelierFromCurves`, sous `untracked`),
  et ce qu'on passe à `untracked` (la carte prête à taper d'un atelier vide, B3).
- **Plafond** : 100 étapes et 5 Mo de photos, la plus ancienne oubliée au-delà. Perdue au
  rechargement.
- **La barre** : Annuler (`Undo2`) et Rétablir (`Redo2`) à gauche ; le nom du bouton dit l'étape
  (« Annuler : supprimer f »), indisponible avec sa raison quand la pile est vide. Ctrl/⌘+Z annule,
  Ctrl+Y ou Ctrl/⌘+Maj+Z rétablit — **jamais dans un champ** (`FIELD_SELECTOR` : le champ annule sa
  frappe), ni dans une fenêtre, un menu ou une liste ouverts (`dialog`, `alertdialog`, `menu`,
  `menubar`, `listbox`) ; le raccourci consommé (`preventDefault`) ne remonte pas au graphe.
  Chaque geste est annoncé (« Annulé : supprimer f. »).
- **La console garde la trace** (PR 2) : la barre et Ctrl+Z passent par le pupitre
  (`desk.undo` / `desk.redo`), qui écrit une ligne « Annuler » / « Rétablir ». Elle est
  **rejouable** (`ReplayStep` `annuler` / `rétablir`) — sinon le rejeu d'un export refaisait ce
  qui avait été annulé (revue de #1517) — **seulement si l'étape défaite ou refaite vient d'une
  ligne rejouable** de la console (`#replayable`). Une étape sans ligne (curseur glissé, réglage
  d'affichage, carte, tableur, « modifier l'atelier ») n'existe pas au rejeu : son `annuler`
  rejoué déferait l'étape de console d'avant et détruirait des objets (revue de #1518, mesuré).
  Sa ligne s'affiche, et s'exporte en simple `ligne`, sans geste. Chaque ligne garde l'étape qu'elle a produite (`Entry.stepId`, jamais
  rangé) : **annuler l'étape barre la ligne** (`Entry.undone`, classe `annulee`, « Annulée : » dit
  aux lecteurs d'écran), Rétablir la débarre ; une ligne « Annuler » ou « Rétablir » ne se barre
  jamais ; après une nouvelle étape, les lignes barrées le restent, et le restent au rechargement
  (`undone` est rangé). Une ligne barrée ne dessine plus de lecture graphique (`consoleReadings`).
  Au rejeu, un `annuler` qui suit une suppression défait cette suppression (ligne « Annuler la
  suppression », comme le toast et les fichiers d'avant) — et elle seule : si elle ne s'annule
  pas, le rejeu s'arrête plutôt que de défaire une étape sans rapport. Ailleurs, il défait la
  dernière étape.
- **Le toast d'une suppression** reste (il fait découvrir le geste) ; son bouton défait cette
  suppression si elle est encore la dernière étape, et barre sa ligne « Supprimer ». Il se ferme au
  bout de 10 s, la suppression reste annulable par la barre.
- **Charger et Repartir de zéro** (PR 3) passent par `replaceWith` : UNE étape, pile gardée, que
  Ctrl+Z défait (objets, grille, réglages). Leur toast propose « Annuler », qui ne défait que
  leur étape si elle est encore la dernière (`atelier.isTopStep(id)`, qui range d'abord une
  modification faite hors étape : c'est elle qu'Annuler déferait, revue de #1524), comme celui
  d'une suppression.
  - **Charger** ne remplace pas la console (décision de David du 2026-10-19, comme R4) : la ligne
    « Atelier chargé depuis <fichier>. » s'ajoute (`desk.loaded`), elle porte l'étape et se barre
    si on annule, puis les lignes du fichier, à la suite (les `garder` décalés). La copie mise de
    côté suit Annuler / Rétablir (`onLeave: keepLeftAside`), seulement si l'atelier a été mis de
    côté.
  - **Repartir de zéro** garde la console, comme Charger (décision de David du 2026-10-19) :
    `desk.reset()` écrit « Atelier vidé. », qui porte l'étape. **Pas de copie mise de côté**, ni de `onLeave` : l'atelier vide
    quitté par Annuler effacerait la copie (`keepAside` d'un atelier vide l'oublie, B1).
  - **Au rejeu** : la ligne d'un chargement porte `{ kind: 'rupture', reason }` — le rejeu
    s'arrête là et dit pourquoi (le contenu du fichier n'est pas dans l'historique). « Repartir de
    zéro » porte `{ kind: 'vider' }` et se rejoue, son annuler et son rétablir aussi : la console a
    gardé les lignes de l'atelier d'avant. (Un historique d'avant la revue de #1524 porte encore
    une `rupture` sur ces annuler / rétablir : il s'y arrête.)
- **Le rejeu d'un ancien historique** (`replayNow`) vide encore la pile (`restore`) : il contient
  lui-même des annulations, qu'une étape englobante ne saurait pas refaire.

### La barre d'icônes, Enregistrer et Charger

Lot 1 de la refonte de l'interface (`docs/archive/wip/atelier-refonte-interface-phase0.md`, validé par
David le 2026-10-18). Une seule barre (`role="toolbar"`) au-dessus des onglets, en icônes seules
(`ToolButton.svelte`) : à gauche **Repartir de zéro**, **Charger un atelier**, **Enregistrer
l'atelier**, précédés d'**Annuler** et **Rétablir** (lot 5, voir « Annuler / Rétablir ») ; à
droite **Console**, **Partager** et **Réglages**.
Un bouton indisponible garde le focus (`aria-disabled`, pas `disabled`) et dit pourquoi, dans son
infobulle et à l'aide technique (« Ton atelier est vide : il n'y a rien à enregistrer. »). Sur un
atelier reçu par lien : ni Repartir de zéro, ni Charger, ni Partager. La barre suit le motif ARIA
« barre d'outils » (`roving-toolbar.ts`, revue de #1479) : un seul arrêt de tabulation, flèches
gauche / droite (en boucle), Début et Fin pour aller d'un bouton à l'autre.

**Enregistrer n'est pas l'ancien export JSON.** Le JSON « pour rejouer » ne garde que les gestes
de Calcul : une définition changée sur une carte, une couleur, le tableur s'y perdaient. Le
fichier `atelier-AAAA-MM-JJ.atelier.json` (`atelier-file.ts`, format `chiphre-atelier`) porte
l'état complet (`Atelier.serialize()`, celui que `persistence.ts` range) et la console telle que
`history-storage.ts` la range (`keptHistoryOf`).

**Charger** lit le fichier choisi (`readAtelierFile`). Taille bornée deux fois : la page refuse
AVANT lecture au-delà de `MAX_ATELIER_FILE_BYTES` (en octets, 4 × la limite en caractères : un
atelier riche en accents pèse plus d'octets que de caractères), puis `readAtelierFile` applique la
limite exacte en caractères (`MAX_ATELIER_FILE_LENGTH`). Ensuite les **mêmes** schémas que le
navigateur — objets et cellules triés un par un (`salvageState`), console par `readKeptHistory`
(liste blanche de `safe-latex.ts`). Un atelier qui a des objets ou une grille demande
confirmation (« Charger remplace l'atelier actuel ») ; la console seule ne compte pas, elle n'est
pas remplacée (2026-10-19). Comme « Remplacer mon atelier » (R5, B8), l'atelier remplacé est **mis de
côté** avant (`keepAside`), la confirmation le dit, et l'avis propose « Retrouver mon atelier
précédent » ; s'il ne peut pas l'être, rien n'est chargé (B5). Sans stockage (navigateur qui
n'enregistre rien), Charger reste ce qu'il était, sans copie. Un fichier refusé ne remplace rien, et la raison s'affiche dans les avis
(« Ce fichier n'est pas un atelier Chiphre. ») ; un objet écarté ou un `y` renommé se dit aussi,
et ce que la console a perdu (illisible, version plus récente, lignes écartées : `consoleNotice`). Un **ancien historique JSON**
(`chiphre-calcul`) est reconnu et rejoué comme avant (même confirmation).

### Ouvrir dans Python (2026-10-24)

Pont à sens unique vers `/python` (voir Décisions ; phase 0
[atelier-python-phase0.md](../archive/wip/atelier-python-phase0.md), Q1-Q4 validées par David). Le
menu d'une fonction, d'une suite ou d'une liste propose « Ouvrir dans Python » (`actions.ts`,
`pythonAction`) ; le clic ouvre un **nouvel onglet** `/python?code=…`, l'atelier ne bouge pas.

`pythonOf` (`to-python.ts`) traduit depuis l'**arbre** (`definitionAst`), jamais le texte :

- fonction → `def f(x): return …` (la lettre de l'élève gardée : `def f(t)`), `**`, produits
  écrits, parenthèses selon la priorité Python (`(-x)**2`) ; `e^u` → `exp(u)`, `ln` → `log`,
  `log` → `log10`, `arccos` → `acos`, `|x|` → `abs` ; `from math import …` des seuls noms
  utilisés ;
- suite explicite → `def u(n)` ; récurrence → la boucle des sujets (`u = u₀`,
  `for k in range(n0, n)`, `u_n` → `u`, `n` → `k` ; `i`, `j`… si un objet s'appelle déjà `k`) ;
- liste → `L = [12, 15, 9]`, écritures exactes gardées (`1/4`), virgule → point, cases vides
  retirées avec un commentaire, `1{,}5` et `−3` lus ; une case à formule : les valeurs calculées, avec
  un commentaire (et le nombre d'entrées ignorées) ;
- ce que l'objet cite part avec lui, une fois, avant lui : curseur (`a = 3  # curseur de
l’atelier`), valeur calculée, fonction, suite, premier terme donné par un curseur.

**Refus** (bouton grisé, raison au survol) : objet incomplet, en attente ou en erreur,
fonction sur un intervalle, par morceaux, grandeur à unité, liste de mots, carte `f′` ou
`f⁻¹`, racine n-ième, adresse compressée > 2 000 caractères (`pythonPageOf`).

`pythonOf` est mémorisée par révision de l'atelier : `actionsFor` l'appelle à chaque rendu.

Écarts connus : `u(n)` avant le premier rang rend u₀ en Python (l'atelier : rien) ; `x**(1/2)`
d'un négatif donne un complexe en Python (l'atelier : non défini).

Côté `/python` (Q1) : si l'éditeur contient du code de l'élève (`pythonStore.hasOwnCode`),
« Remplacer ton code ? » avant de charger ; « Garder mon code » le laisse intact.

La carte d'une liste de nombres passe à **13 actions au plus** (David, 2026-10-24).

### Ouvrir dans l'atelier, depuis Python (2026-10-25)

Le sens inverse, à sens unique lui aussi (phase 0
[python-vers-atelier-phase0.md](../wip/python-vers-atelier-phase0.md), Q1-Q6 validées par David).
Après une exécution réussie, `/python` propose « Ouvrir dans l'atelier » pour chaque **liste**
affectée par le programme (détection : [worker.md](python/worker.md#les-listes-pour-latelier-_chiphre_atelier_lists)).
`offerOf` (`from-python.ts`) applique les règles de l'atelier : au plus `MAX_LIST_VALUES` valeurs ;
au-delà, **ses effectifs** (deux listes, valeurs croissantes ou mots dans l'ordre d'apparition) s'il
y a au plus `MAX_CATEGORIES` valeurs différentes ; sinon refus. Refus nommés aussi : liste vide,
booléens, entier au-delà de 2⁵³, `nan`/`inf`, autre type (nommé), texte avec « ; » ou retour à la
ligne, définition de plus de `MAX_DEFINITION_LENGTH` caractères (« arrondis-les en Python »). Les
nombres passent par `String(x)`, qui écrit comme le `repr` de Python : `0.30000000000000004`
revient exact, sans arrondi caché.

Transport (Q4) : un `?a=` ne tient pas 200 flottants. `postToAtelier` (`python-mailbox.ts`) dépose
les listes dans `localStorage` sous `chiphre-python-vers-atelier:<uuid>` (et balaie les dépôts de
plus d'un jour) ; la page ouvre `/atelier?depuis-python=<uuid>` dans un nouvel onglet. `openLink`
relit par `takeFromPython` — UUID et contenu validés par Zod aux plafonds de l'atelier, clé effacée
à la lecture — et construit un atelier **éphémère**, hors pile d'annulation (`untracked`), qu'on
garde par « Garder dans mon atelier ». Rouvrir l'adresse (rechargement) ne retrouve rien et le dit.

Noms (Q6) : un nom Python qui est un nom d'atelier valide (`L`) est gardé ; sinon la liste prend la
lettre libre suivante (`L`, `M`…) et sa colonne a pour **titre** le nom Python (« lancers »,
« lancers (effectifs) », borné à `MAX_TITLE_LENGTH`).

### Export et rejeu de l'historique

Le JSON « pour rejouer » ne se télécharge plus que par `.exporter` tapé ; la barre « Exporter
l'historique » a quitté la vue Calcul (lot 1), et il se relit par **Charger**. Les deux formats
(`history-export.ts`) :

- **JSON** (`historyToJson`, format `HISTORY_FORMAT` = `chiphre-calcul`) pour rejouer : chaque
  entrée garde son **geste** (`ReplayStep` : `saisie`, `action`, `supprimer`, `annuler`, `rétablir`, `garder`)
  et sa réponse ;
- **ubumark** (`historyToUbumark`), par le menu « ⋮ » de la console (copier ou télécharger
  l'historique pour une fiche ; le lien sous l'historique est retiré au lot 2), pour recopier
  dans une fiche, formules en `$…$` LaTeX. Le
  titre d'une étape garde ses formules `$…$` (V25 : les pipelines pédagogiques y écrivent leurs
  maths) ; le texte autour est neutralisé (`*` → `×`, `\$`, `\~`).

**`.exporter` tapé dans Calcul** (retrait de `/cas`, 2026-10-13) : le pupitre l'intercepte
(`isExportCommand`, avant `runInput` — le moteur n'a jamais eu l'historique) et lance le
téléchargement JSON (`downloadHistory`, appelé par `CalcDesk.download`). Aucune ligne
n'est ajoutée ; la réponse va dans la zone de retour (« Historique exporté : calcul-….json. »).
Historique vide : rien ne part (`NOTHING_TO_EXPORT`, « Rien à exporter pour l'instant. »). Un argument (`.exporter ubumark`) est
refusé. Un rejeu saute une saisie `.exporter` et ne télécharge rien.

Rejeu (`CalcDesk.replay`) : le fichier vient de dehors, donc `readHistory` le valide (Zod) et le
borne (`MAX_HISTORY_BYTES`, `MAX_HISTORY_ENTRIES`) avant tout. Chaque geste est refait **par le
même chemin** que l'élève (`submit`, `runFromPanel`, `keep`…) ; rien n'est injecté. Le rejeu
s'arrête à la première ligne qui échoue et dit laquelle (`ReplayReport`) — sauf l'algèbre écrite
avec des espaces d'un historique d'avant la lecture des grandeurs (`5 s + 1`), refaite avec son
ancien sens ([grandeurs.md](grandeurs.md)). Désactivé en mode
éphémère. Une ligne restaurée au rechargement garde son geste : un export fait après
un rechargement se rejoue comme avant.

### Suppression en cascade

Supprimer un objet supprime **aussi ses dépendants**, directs ou en chaîne (décision du
2026-10-05, lot B de [atelier-suppression-export-phase0.md](../archive/wip/atelier-suppression-export-phase0.md)) :

- `removalOf` les nomme (dans l'ordre des cartes, sans compter deux fois un cycle) ; la
  confirmation en cite trois puis « et N autres » (`cascadeMessage`) ;
- `removeWithDependents` est UNE étape de la pile (« supprimer f ») et rend un reçu ;
  `undoRemoval(reçu)` (le bouton du toast) la défait **seulement si elle est encore la dernière
  étape** — sinon refus, rien ne bouge, et Annuler dans la barre remonte jusqu'à elle. La photo
  remet tout à l'identique : définitions, réglages, tracés, diagrammes, cellules et titres
  (retirer le nom d'une colonne puis annuler rend la colonne à sa liste, sans copie).

L'état « en attente » reste pour un nom cité _avant_ d'être défini ; seule la suppression a changé.

---

## Liens avec `mathAST` et `statistics`

L'atelier ne calcule presque rien lui-même : il choisit le bon module et met la réponse en forme.
Doc du moteur : [mathast/README.md](mathast/README.md).

| Geste de l'élève                        | Module appelé                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| calculs, commandes du registre          | `WebReplEngine` (`src/lib/mathAST/cli/web/web-repl-engine.ts`)                                                                                                                                                                                                                                                                                                                                                                                                                              |
| écrire une grandeur (`5 km`)            | `readNaturalQuantities` (`src/lib/atelier/natural-quantities.ts`) : « un nombre, une espace, une unité », puis tout terme de nombres (`10^3 m`, `2π m` ; une lettre reste de l'algèbre), calculs et valeurs seulement ; une durée composée reste juxtaposée (`2[h] 30[min]`, refusée collée à `*` ou `/`), [grandeurs.md](grandeurs.md)                                                                                                                                                     |
| grandeur dans le champ d'une carte      | `definitionFromField` / `fieldLatexOf` (`src/lib/atelier/mathfield.ts`) : la même lecture sur le LaTeX de MathLive (`2\,h\,30\,\min`) ; une durée composée est rangée juxtaposée (`2\unit{h}30\unit{min}`, lue en bloc par le parseur) et revient `2 h 30 min` (l'ancien rangement `(2[h]+30[min])` aussi ; dans un calcul : `(1 h + 30 min) × 2`, relu aussi, le × gardé) ; virgule de l'élève (`2{,}5`, valeurs et fonctions) ; une unité montrée par le champ reste une unité (`10^3 m`) |
| conversion d'un trait (`2,5 h en min`)  | `naturalConversion` / `convertNaturally` (`calcul.ts`) : un calcul sans `=`, « en », une unité du module → la grandeur calculée puis `.convertir`, même réponse ; la gauche est d'abord ESSAYÉE sur un moteur à part (`probeEngine`) : une ligne refusée ne change pas la dernière grandeur de l'élève ; gauche en erreur → son erreur, pas une grandeur → refus qui la cite. Avant le 2026-10-14 : un produit de lettres (« 2,5 h e n m i n »). Pas dans une définition (`d = … en min`)   |
| calcul avec des grandeurs, `.convertir` | `computeQuantity` / `convertQuantity` (`src/lib/mathAST/cli/quantities.ts`) : `tidy`, unité écrite d'abord — comme `{{eval}}` ; contrat : [grandeurs.md](grandeurs.md)                                                                                                                                                                                                                                                                                                                      |
| `.simplifier`                           | `generatePedagogicalSimplifySteps`, intention `auto` (ADR 0007) : réduit, simplifie une fraction de polynômes en montrant la factorisation et la condition (`x ≠ −1`), développe seulement si c'est plus court, ne factorise jamais le résultat (`2(x+3)`, `x²+2x+1` restent ; simplify-carte § 33). Rien à simplifier : la ligne montre l'expression en LaTeX, sans étapes (avant : le bloc du terminal, « Hash: … »)                                                                      |
| `.factoriser`                           | même pipeline, intention `factoriser`, niveau lycée (stratégies de l'ADR 0024 : identités à coefficients, Δ, racine évidente) ; aucun repli moteur : « je n'ai pas su » se dit                                                                                                                                                                                                                                                                                                              |
| `.développer`                           | même pipeline, intention `developper`, niveau lycée, pour la réponse ; le « Comment ? » rédigé à part (`pedagogical-simplify/expand-steps.ts`, voir « `.développer` en détail ») ; aucun repli moteur : « rien à développer » se dit                                                                                                                                                                                                                                                        |
| `.dériver`, « Dériver », `f′`           | `src/lib/mathAST/pedagogical-differentiation/` (règle nommée, sous-étapes)                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `.réciproque`, « Réciproque », `f⁻¹`    | `computeReciprocal` (`src/lib/mathAST/reciprocal/`, [mathast/reciproque.md](mathast/reciproque.md)) ; lettres des paramètres : `solve` puis `textbookWriting`                                                                                                                                                                                                                                                                                                                               |
| `.résoudre`, « Résoudre »               | `src/lib/mathAST/pedagogical-solve/`, vérifié par `solve-steps-check.ts`                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `.intégrer`                             | réponse : `integration` (`integrate.command.ts`) ; « Comment ? » : `src/lib/mathAST/pedagogical-integration/` niveau lycée, vérifié par `integrate-steps-check.ts`                                                                                                                                                                                                                                                                                                                          |
| `.domaine`                              | réponse : `computeDomain` (`domain.command.ts` refuse ce qu'il ne résout pas), écrite par `domainToLatex` ; « Comment ? » : `src/lib/mathAST/pedagogical-domain/` niveau lycée, vérifié par `domain-steps-check.ts`                                                                                                                                                                                                                                                                         |
| `.évaluer`                              | réponse : `eval.command.ts` — `substitute`, refus d'une valeur interdite (`forbiddenValue`, `mathAST/eval/forbidden-value.ts`, exact), puis `evaluate` ; la ligne est une formule (`evaluatedLine`, voir ci-dessous) ; « Comment ? » : `src/lib/mathAST/pedagogical-arithmetic/` niveau collège, vérifié par `evaluate-steps-check.ts`                                                                                                                                                      |
| `.limite`                               | réponse : `evaluateLimit` (`mathAST/limits`) ; « Comment ? » : `generatePedagogicalLimitSteps` (`src/lib/mathAST/pedagogical-limits/`) niveau lycée, vérifié par `limit-steps-check.ts`                                                                                                                                                                                                                                                                                                     |
| `.variations`, « Variations »           | `computeVariations` (`src/lib/mathAST/variations/`) — le même calcul que le tableau ; f′ en deux étapes, « Dérivée » (forme de `.dériver`) puis « On factorise pour étudier le signe » si l'écriture change, la ligne de réponse montrant la forme factorisée (`displayedDerivatives`, lot 5b)                                                                                                                                                                                              |
| syntaxe des commandes                   | `src/lib/mathAST/cli/core/variable-argument.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                             |

**`.résoudre` en détail** (`solve-steps.ts`). `generateEquationSteps` (niveau `college`) choisit
le pipeline — premier degré, second degré, ou **valeur absolue** (`|2x+1|=5`, `3\left|x-1\right|=6`,
`|x-1|=|x+3|` : pipeline `absolute-value`, dont chaque branche du premier degré se rédige comme
l'équation seule). Le renderer se lit dans la première étape (`identify-equation.equationType`)
par `rendererFor`, un `switch` **exhaustif** gardé par `never` : `linear` → premier degré au
collège, `quadratic` et `rational` → second degré au lycée, `absolute-value` → renderer de la valeur
absolue au collège. L'ancien `linear ? Linear : Quadratic` envoyait tout type nouveau au renderer
du second degré (`|2x+1|=5` s'annonçait « Équation du second degré ») ; un type ajouté sans sa
ligne ne compile plus. Conclusions acceptées pour la ligne : `read-solution`, `read-solutions`,
`no-real-solution`, les conclusions d'inéquation, et `read-all-reals` (`S = ℝ`,
`|x-1|=|1-x|`).

**Étapes écrites comme la réponse** (lot 5f-4 de `simplify-carte`, Q46, 2026-10-25). Les étapes
d'une équation ou d'une inéquation passent par `stepsAsShown` avant le rendu ; le garde-fou et
la ligne `S = …` d'une équation lisent les étapes du calcul. Décimaux tapés gardés (`2x = 0,6` : « Solution : x = 0,3 » ;
`0,5x + 1 = 2` : `0,5x = 1`, « On divise les deux membres par 0,5 »), solutions écrites comme la
réponse (`2x² = 1` : `S = {−√2/2 ; √2/2}` ; `x² − x − 1 = 0` : « On simplifie les solutions »
donne `(1 − √5)/2`). Une inéquation s'écrit de même (Q50, 2026-10-25) : `2x < 0,6` répond
`x < 0,3` (ligne lue sur les étapes montrées), `x² < 0,5` conclut `S = ]−√2/2 ; √2/2[`,
`1/(2x − 1) > 0` conclut `]1/2 ; +∞[` en vraie fraction, les racines du tableau de signes
s'écrivent comme des solutions. Détail : `docs/systeme/mathast/README.md`, `pedagogical-solve` ;
tests `__tests__/resoudre-etapes-5f4.test.ts`, `__tests__/resoudre-inequations-q50.test.ts`.

Une inéquation dont l'écriture a une valeur interdite que la forme canonique efface
(`\frac{3x^2}{2x}\geq 0`, `\frac{2x^3}{x}<2`) n'a pas d'étapes : les pipelines du premier et du
second degré la refusent (`rejectForbiddenValues`, V47 puis V48), `solveSteps` rend `null` et
l'atelier affiche la réponse du moteur sans « Comment ? ».

**« Résumé / Détaillé »** (`steps-summary.ts`, 2026-10-13). Les commandes qui rédigent
(simplifier, factoriser, dériver, résoudre, intégrer, domaine — tapées, ou Résoudre / Dériver sur une carte ; `.évaluer` construit le sien, voir plus bas) rendent le même
calcul DEUX fois : `steps` en `verbosity: 'detailed'`, `summary` en `'summarized'`. Le moteur
tourne une fois ; seul `renderAll` est rappelé, et la réponse de la ligne vient du calcul, jamais
de la rédaction. `summaryOf` compare les deux rendus et rend `undefined` s'ils sont identiques :
la ligne n'a alors pas d'interrupteur. Mesuré : dans les cinq renderers branchés, la verbosité ne
gouverne que l'`explanation` de chaque étape — le résumé garde toutes les étapes (valeur interdite
comprise), titres et calculs, sans le « pourquoi ». `summary` suit `steps` partout (virgule
décimale, `Entry`) ; l'export de l'historique ne garde que `steps`. `.variations` a sa propre
rédaction, sans verbosité : pas de `summary`. Dans `CalculView`, l'interrupteur est DANS le
« Comment ? » déplié (choix segmenté, `aria-pressed` et coche ✓, comme l'ancien nuage / escalier des suites), réglé
**ligne par ligne** (décision de David, 2026-10-13) : basculer une ligne ne change pas les autres
lignes dépliées. Le dernier choix fait, sur n'importe quelle ligne, est retenu sous
`chiphre-atelier-etapes` dans `localStorage` (lecture et écriture dans un `try` : la vue marche
sans) ; il sert de niveau d'OUVERTURE aux lignes dépliées ensuite, « Détaillé » si rien n'est
retenu. Le niveau d'une ligne est figé quand on la déplie (`toggleSteps`) : un choix fait ensuite
ailleurs ne la change pas sous les yeux. Une ligne réglée à la main garde son niveau si on la
replie puis la redéplie ; une ligne seulement ouverte reprend le dernier choix. Ces niveaux par
ligne vivent dans une `SvelteMap` du composant, par `entry.id`, et ne survivent pas à un
rechargement (une ligne restaurée n'a d'ailleurs plus d'étapes). Chaque groupe s'annonce « Rédaction des étapes de la ligne
N », `aria-describedby` vers la saisie de la ligne. Une préférence d'affichage, pas un objet :
elle ne voyage ni dans un lien ni dans une fusion.

**Le garde-fou** (`solve-steps-check.ts`) vérifie la conclusion contre les nombres et le moteur
avant de la montrer ; un désaccord rend `null` (repli sur la réponse du moteur). `S = ℝ` est
accepté seulement si l'équation tient sur toute une grille ET si `solve` répond `infinite`. Un
**échec du moteur** porte le statut `no-solution` : `engineSolutions` le détecte par
`isSolverFailure` et rend `null`, sinon « type non supporté » confirmait une conclusion `S = ∅`
(`x\left|x\right|=4`, qui a la solution 2).

**`.évaluer` en détail** (`calcul.ts`, `eval.command.ts`, décisions de David du 2026-10-14). La
ligne est une **formule**, plus le texte du terminal (« Result: 9 (exact) Mode: exact », en
anglais) : `f(3) = 9` quand l'expression tapée est une fonction de l'atelier (`f` ou `f(x)`, dans
sa lettre : `f(t) = t^2`, `en t=2` → `f(2) = 4` ; une valeur non entière entre `\left(…\right)`,
une division tapée écrite en fraction ; l'appel est écrit par `evaluatedCallLatex`), sinon la
valeur seule — l'écho montre déjà l'expression, le remplacement est la première étape. Une comparaison répond « vrai » / « faux ».
**E5** : une saisie décimale (dans la valeur, l'expression, la formule de f ou une variable posée,
`hasDecimalLiteral` sur l'expression remplacée) donne une réponse décimale, comme le mode décimal,
écrite par la règle du bouton ≈ (`approximation.ts` : 4 décimales, `\approx` seulement si
arrondi) : `en x=1,5` → 2,25, `f(0{,}5) \approx 1{,}4142` ; une saisie exacte, une réponse exacte
(`\sqrt{2}`, `\dfrac{1}{9}`), avec sa valeur approchée au bouton ≈. **Valeur interdite** : avant
le calcul, `forbiddenValue` lit l'expression remplacée, **exactement** (rationnel nul, jamais une
tolérance : `getDomainViolations` compare des flottants à 10⁻¹⁰ près et refuserait `1/x` en
`x = 10⁻¹¹`) ; la cause la plus intérieure l'emporte. Refus `VALUE_FORBIDDEN`, formules
composées : « $x = 1$ est une valeur interdite : le dénominateur s'annule. », « … le nombre sous
la racine carrée est négatif. », « … le logarithme ne s'applique qu'à un nombre strictement
positif. », « … 0 n'a pas de puissance négative. », racine d'indice pair (`\sqrt[4]{x}`), tangente
où le cosinus s'annule (`\tan` en π/2, lu exactement), arc sinus / arc cosinus hors de [−1 ; 1],
puissance d'exposant non entier d'un négatif (`x^{1/2}`, `x^{0.5}`, `x^{1/3}` en −8 : convention du
lycée, $x^a$ défini pour $x > 0$ ; `\sqrt[3]{x}` en −8 = −2 reste accepté) ; sans lettre, « Ce
calcul n'a pas de valeur : … ». La valeur citée s'écrit comme dans la ligne (`typedValueLatex` :
`\dfrac{\pi}{2}`, `-\dfrac{1}{2}`). Avant : un dénominateur nul finissait en « Je n'ai pas su
lire », `\sqrt{-1}`, `\ln 0`, `\tan(\pi/2)`, `\arcsin(2)` passaient pour des résultats. La console
(`repl.ts`) garde son texte. **Plusieurs lettres** (E6, décision de David du 2026-10-14) :
séparées par « ; », `.évaluer 2a+3b en a=1,5 ; b=2` → `9` (la valeur seule, même pour une
fonction de l'atelier) ; `CommandArguments.assignments`, dans l'ordre tapé
(`variable-argument.ts`). La virgule entre deux valeurs (`en a=1,5, b=2`, `en a=1, b=2`, ou
`en … pour …`) est refusée, même sans ambiguïté : « Sépare les valeurs avec « ; » : .évaluer
2a+3b en a=1,5 ; b=2, par exemple. » Refus (`eval.command.ts`) : lettre donnée deux fois (« La
valeur de a est donnée deux fois. »), lettre absente de l'expression (« « c » n'apparaît pas dans
… »), valeur déjà posée dans l'atelier, redonnée, à une ou plusieurs lettres (`calcul.ts`, avant
le moteur : « a vaut déjà 5 dans l'atelier : retire « a=1 », ou efface a avant. »), lettre sans valeur (« Il manque la valeur de b : .évaluer 2a+3b en a=1 ; b=3, par
exemple. », aussi à une seule valeur donnée), valeur interdite (« Pour $a = 1$ et $b = 0$, ce
calcul n'a pas de valeur : … »). Un « ; » final sans valeur (`en a=1 ; b`) : « Il manque la
valeur de b : … » (« x a déjà sa valeur : retire « ; x ». » si la lettre en a une). Une
**fonction en attente d'un paramètre** (`f(x) = a x`, `a` non posé) est remplacée
(`substituteNames(…, pendingFunctions)` : pour `.évaluer`, toute fonction en attente ; appels par
`pendingCall`) : `.évaluer f en x=1 ; a=2` → `2` avec ses étapes, `.évaluer f en x=1` → « Il
manque la valeur de a : .évaluer f en x=1 ; a=3, par exemple. » (la commande citée telle que
tapée). Les autres commandes : voir « Fonction à paramètre » plus bas.

**Fonction à paramètre** (V56, 2026-10-14). Une fonction en attente de **valeurs** seulement
(`parametersOf`, `types.ts` : `missing` tout en `as: 'value'`, `f(x) = a x`) se comporte comme son
expression, le paramètre restant une lettre. Avant, `substituteNames` la sautait : le moteur
recevait le symbole f, une constante, et `.dériver f` répondait 0, `.intégrer f` ½f² + C.

- **Commandes qui concluent** : `.dériver f` → `a`, `.intégrer f` → ½ax² + C, `.intégrer f de 0
à 1` → a/2 (une intégrale bornée est réduite par `simplify` quand une fonction à paramètre est
  citée : `(e^a − 1)/a`, et non `e^{a * 0}`), `.simplifier`, `.factoriser`, `.taylor`,
  `.équivalent`.
- **Commandes refusées** (`PARAMETER_BLOCKED` : `.résoudre`, `.variations`, `.limite`,
  `.domaine`, `.réciproque`, y compris par `f'`) : « Le résultat dépend de a : donne-lui une
  valeur (a = 2) pour l'étudier. » (« de a et b : donne-leur … » à plusieurs). Mesuré avant :
  `.résoudre a x = 0` → x = 0, `.limite e^{a x} en +∞` → +∞, faux pour a ≤ 0. Le refus est large
  (`.résoudre g(x)=0` de `g(x) = x^2 + k` y passe aussi). `.évaluer` n'y passe pas (E6).
- **Ligne de calcul** (`parameterizedLine`, avant `expandInput`) : `f(2)` → `2a`, `f` seul →
  `a x`, `f'(2)` de `a x^2` → `4a`, `g(f(2))` → `4a²` avec g prête ; appels réduits par
  `simplify` dans l'arbre (le moteur rend tel quel un calcul qui garde des lettres ; avant :
  « Fonction inconnue : f — définis-la d'abord »). Une égalité ou une comparaison (`f(2)=4`,
  qui répondait `false`) est refusée (« Le résultat dépend de a… ») ; un dénominateur nul après
  substitution (`a/x` en 0) rend « Erreur de calcul : Division par zéro », comme sans paramètre.
- **Substitution** (`expandedCalls`) : de l'intérieur vers l'extérieur (`f(f(x))` → a²x), puis
  une seule passe (`maxIterations: 1`) : `f(2x)` itéré donnait `a·2¹⁰x`.
- **Fonction qui en cite une à paramètre** (`g(x) = f(x)+1`) : `substitutedAstOf(…,
{ forDerivation })` remplace aussi les fonctions en attente (`engine.ts`) → `.dériver g` = a.
- Une fonction en attente d'une **fonction** (`as: 'function'`) : la commande est refusée avec
  le message de la carte (`pendingFunctionRefusal`). ⚠️ `p(x) = q(x)+1`, q inconnu, est lu
  q·x par l'atelier (`as: 'value'`) : `.dériver p` répond q.
- **Boutons de la carte** (Q4, David, 2026-10-14) : ils disent ce que dit la commande.
  « Dériver » répond f′(x) = a et crée la carte f′, à paramètre comme f (`createDerivative`
  accepte une base à paramètre ; `.dériver f` aussi, sans la note « En attente de a ») ;
  « Résoudre f(x) = 0 », « Variations », « Réciproque » sont désactivés avec « Le résultat dépend
  de a… » (`parameterReason`, `actions.ts`) ; « Tracer » garde le message de la carte. Le champ
  « image » rend `2a` pour f(2), comme la ligne tapée (`runAction` → `parameterizedLine`).
- **Condition d'une primitive** (Q3) : `.intégrer` affiche « (a ≠ 0) » quand la réponse a un
  dénominateur fait d'un paramètre que l'expression de départ n'avait pas
  (`introducedConditions`) : `e^{ax}` → $\dfrac{e^{ax}}{a} + C \quad (a \neq 0)$, `x^a` →
  « (a ≠ −1) », `e^{(a-1)x}` → « (a ≠ 1) » (forme lisible : `conditionOf`). Rien pour
  `1/(a x)` (la division est dans le départ, comme `.dériver`), ni pour `e^{2x}`. Le texte de
  la ligne porte la même condition. Une intégrale **bornée** dit aussi les conditions de
  l'intégrande (V61) : `1/(a x) de 1 à 2` → $\dfrac{\ln(2)}{a} \quad (a \neq 0)$. Une
  intégrale bornée est aussi réduite quand l'intégrande tapée contient un paramètre
  (`.intégrer e^{a x} de 0 à 1` → $\dfrac{e^a - 1}{a}$), et `1^{a+1}` vaut 1 (`x^a de 1 à 2` →
  $\dfrac{2^{a+1} - 1}{a+1} \quad (a \neq -1)$, réduit par `integrateDefinite`).
- **`.résoudre` tapé avec une lettre non posée** (V57, Q5 — `parameterSolveRefusal`, après le
  moteur, ses refus d'abord) : refus « Le résultat dépend de a… » quand la résolution DIVISE par
  le paramètre — polynôme dont le coefficient dominant en contient un (`a x = 0`, `a x + b = 0`,
  `x/a = 1`, `a x^2 = 1`, `a x > 1`) ; sinon l'inconnue multipliée par un paramètre
  (`e^{a x} = 1`) ou un paramètre au dénominateur de la réponse (`1/x = a`), sauf si le moteur
  a écrit la condition (`u_0 \cdot 0{,}5^n = 1` : « si u₀ > 0 »). Restent résolus : `x + a = 0`,
  `2x = a`, `(x-a)(x-1) = 0` ({a ; 1}, juste même si a = 1), `\ln x = a`, et `x^2 = a`, que le
  moteur conditionne déjà (« si a ⩾ 0 »). `x + a > 0` garde le refus du moteur (« Je ne sais pas
  encore résoudre cette inéquation »). Un refus n'a pas de « Comment ? ».
- **Équations rationnelles** (`forbiddenSolutions`) : refus quand une solution peut tomber sur
  une valeur interdite — chaque solution du solveur est remplacée dans les dénominateurs en x de
  l'entrée, et un paramètre qui y reste refuse : `x/(x-a)=0` (x = 0, interdite si a = 0),
  `a/x = 1`, `\dfrac{a}{x} = 2`, `(x-a)/(x-1)=0` (x = a, interdite si a = 1). Gardée :
  `1/(x-a)=1` → x = a + 1. Le refus du moteur « La solution dépend de q, u_0 : je ne sais pas
  encore résoudre avec un paramètre » est reformulé en « Le résultat dépend de q et u_0 : … ».
- **Primitive non trouvée** (`.intégrer e^(x^2)`, `1/(x^2-2)`) : le refus du moteur en français,
  « Je ne sais pas calculer cette intégrale » — la ligne montrait sa sortie de terminal (« ∫ … : Non
  résolu / Technique tentée … ») jusqu'au 2026-10-14.
- **Bornes à paramètre** (`parameterBoundsRefusal`) : `.intégrer` refuse (« dépend de a ») quand
  une borne contient un paramètre et que l'intégrande n'est pas définie partout (`1/x de 1 à a`
  → ln|a|, `1/x^2 de 1 à a`), ou qu'une puissance de x a un exposant à paramètre sur un segment
  qui touche 0 ou a une borne à paramètre (`x^a de 0 à 1` diverge pour a ⩽ −1). Aussi, bornes en nombres, quand un dénominateur en x contient un paramètre et peut s'annuler sur le segment (`1/(x-a) de 0 à 1`, `1/(x^2-a) de 0 à 1`, `1/(x^2+a^2) de -1 à 1`). Gardés (V61, `nonZeroOnSegment`) : un dénominateur toujours positif (`1/(x^2+a^2+1)`), et, facteurs faits de paramètres seuls mis à part (leur condition « a ≠ 0 » est affichée), chaque facteur en x sans paramètre non nul sur le segment (`1/(a x) de 1 à 2`) ou somme P(x) + Q, P sans paramètre > 0 sur le segment et Q ⩾ 0 (`1/(x^2+a^2) de 1 à 2` → arctan, « (a ≠ 0) »). Même logique hors des divisions (`domainParameters`, revue de V61) : une puissance d'une base en x à paramètre — exposant entier négatif, base non nulle sur le segment (`(x-a)^(-1) de 0 à 1`, qui rendait ln|1 − a| − ln|a|, refusé) ; exposant non entier ou à paramètre, base positive (`(x-a)^{1/2}`, `(x-1)^a de 0 à 2` refusés) — et une fonction d'un argument en x à paramètre : ln, log, √ exigent un argument positif sur le segment (`\ln(x+a^2) de 1 à 2` gardé, `\ln(x-a)`, `\ln(a x)`, `\sqrt{x-a}` refusés) ; sin, cos, exp, arctan, sinh, cosh, tanh, |·| n'exigent rien ; toute autre (tan, arcsin…) refuse. Gardé aussi :
  `x^2 de 0 à a` → a³/3. Une condition toujours vraie ne s'affiche pas (`a^2 + 1 ≠ 0`,
  `isPositive`) ; l'exposant d'une puissance de x est réduit (`x^{a-1+1}` → `x^a`).

**« Comment ? » d'une ligne de Calcul** (`calculationSteps` dans `evaluate-steps.ts`, branché par
`typedCalculationSteps` dans `calcul.ts` ; phase 0 du retrait de `/calc`, validée par David le
2026-10-24). Un calcul **sans lettre** (`2+3*4`, `1/2+1/3`, `5-(-3)`) porte les opérations de
`.évaluer` (même cœur, `explainedOperations`, mêmes gardes E4-E5), sans « On remplace » ni résumé
(il redirait la ligne). Seule une division de deux entiers s'écrit en fraction
(`numberSlashesAsFractions` : `1/2` → $\frac{1}{2}$ ; `2:0,5` reste `2 \div 0{,}5`). Pas d'étapes : une lettre (valeur de l'atelier, `x`), une fonction de l'atelier (`f(2)`), un terme
de suite (`u_3`, `u(5)` récrit), une mesure (`AE`), une grandeur ou un angle en degrés (`hasUnit` : `2*30°` concluait en radians),
un produit de fractions sans parenthèses (`hasSlashChain` : `3/4*2/9` se lit `((3/4)·2)/9`, des
étapes écriraient `× 2 ÷ 9`), un résultat exact trop long, une réponse arrondie. Les lignes récrites (`u_3`, mesures) perdent les étapes de leur calcul
intérieur (`withoutSteps`). `Entry.steps` vient de tout résultat qui en porte (`entryOf`).

**« Comment ? » de `.évaluer`** (`evaluate-steps.ts`, PR 3, décisions de David du 2026-10-14).
**E2** : `generatePedagogicalArithmeticSteps` niveau `college`, une opération par étape (pièges du
négatif compris : `(-3)^2 = (-3) \times (-3) = 9`, « Soustraire $-3$, c'est ajouter $3$ »).
**E3** : la première étape est rédigée par l'atelier, « On remplace $x$ par $-3$ » (règle
`atelier-substitute`) : l'expression où `typedValueNode(valeur)` (la valeur tapée, divisions en
fractions, partagée avec `typedValueLatex`) a pris la place de la lettre, négatifs entre
parenthèses (`substitute` + `toLatex`), produit d'un nombre écrit `\times` (`crossProducts` :
`3x` en −2 sortait `3 * (-2)`), négatif en tête de produit entre parenthèses dès le remplacement
(`parenthesizeLeadingNegatives` : `(-2)(-2-1)`, pas `-2(-2-1)`), parenthèses que l'atelier ajoute
autour d'une fonction citée retirées quand elles ne servent à rien (`dropUselessParentheses` :
`g(x)+1` → `2^2 + 1`, développé en `2 \times 2`) ; pour une fonction de l'atelier, `f(2) = 2^2 + 1` (parenthèses
extérieures de la définition retirées). Le pipeline part de cette même expression. **Résumé** :
le pipeline ne distingue pas ses étapes par verbosité (seules les explications changent) ; le
résumé est donc CONSTRUIT : le remplacement, puis « On effectue les calculs »
(`atelier-evaluate-result`, `expression = valeur` ou `f(2) = 5` d'un trait) ; offert seulement
si le détaillé compte au moins deux opérations. **Gardes** (`evaluate-steps-check.ts`, toute
exception → pas d'étapes) : valeur conclue = réponse du moteur **en calcul exact**
(`evaluate(a − b)` nul) ; réponse arrondie (`\approx`) → rien ; **E4** pas de « Comment ? » si
l'expression contient une fonction autre que racine et valeur absolue, ou une puissance de e
(`e^0`, `\ln 1`, `\sin 0`), ni si le pipeline ne rend aucune étape ou « On calcule » seul
(`(1/2)^2`, `x` en 3) ; aucun `*` dans le LaTeX ; **E5** une réponse décimale garde ses
décimaux (virgule par `resultWithDecimalComma`, `2 \times 1{,}5 = 3`), mais des étapes qui
passent par une fraction sous une réponse décimale (le pipeline récrit `1{,}5^2` en 9/4 et
`1 + 0{,}5` en 3/2) → pas d'étapes. **Plusieurs lettres** (E6) : toutes remplacées d'un coup,
« On remplace $a$ par $1$ et $b$ par $2$ » (trois : « $a$ par $1$, $b$ par $2$ et $c$ par $3$ »,
ordre tapé, `substitutionTitle`), mêmes gardes ; une division tapée `x/4` s'écrit en fraction
dès le remplacement (`slashesAsFractions`, `\dfrac{2}{4}`, à une lettre aussi) ; les lettres de l'expression doivent être
exactement celles qui ont une valeur. Une saisie qui cite une autre lettre
qu'une fonction de l'atelier (`a x` avec `a` posé, que l'atelier remplace avant le moteur) n'a
pas d'étapes (`citesOtherLetters`) ; de même une valeur posée tapée après `en`
(`en x=a`), dont la ligne s'écrit `f(3) = 10` (`typedValueOf` ôte les parenthèses de
remplacement). Les refus (`VALUE_FORBIDDEN`) sortent avant,
sans étapes.

**`.intégrer` en détail** (`integrate-steps.ts`, 2026-10-13). La réponse de la ligne est celle
du moteur `integration`, inchangée (`+ C` compris) — sauf le registre des coefficients d'une
primitive à décimaux, réécrit comme dans les corrections (`withUniformCoefficients`, simplify-carte
R5/Q42 b, 2026-10-24 : `.intégrer 0,6x+1,2` → $0{,}3x^2 + 1{,}2x + C$, et non
$\dfrac{3}{10}x^2 + \dfrac{6}{5}x$) ; la valeur d'une intégrale bornée suit le même registre
(Q49, 2026-10-25 : `.intégrer 0,5x de 0 à 1` → $0{,}25$, `0,5x^2 de 0 à 1` → $\dfrac{1}{6}$,
`0,5e^x de 0 à 1` → $\dfrac{e - 1}{2}$ : une valeur irrationnelle n'a pas d'écriture décimale
finie, elle s'écrit par la valeur exacte à afficher, Q22). La valeur d'une intégrale bornée à paramètre est réduite par
`tidy` (R1). Le « Comment ? » vient de
`generatePedagogicalIntegrationSteps` (niveau `lycee`, détaillé + résumé), et ne s'affiche que si
deux gardes passent (`integrate-steps-check.ts`) :

- **concordance avec le moteur** : en définie, la valeur des étapes est numériquement celle du
  moteur ; en primitive, F_étapes − F_moteur est constante sur une grille (là où les deux
  existent, au moins 2 points). Un refus rédigé (`undefinedAt`) alors que le moteur a une valeur
  est un désaccord : `\ln x` de 0 à 1 (impropre, −1) n'a pas d'étapes ;
- **aucun coefficient caché** : une forme composée (`apply-composite-exp`, `-ln`, `-sin`, `-cos`,
  `-power`) doit écrire exactement G(u) (e^u, ln|u|, −cos u, sin u, u^(n+1)/(n+1)), comparé
  numériquement sur la grille — ou k·G(u) quand elle déclare un coefficient `k`. Depuis la PR 2
  (décisions de David du 2026-10-13), le pipeline n'écrit plus de coefficient sans le dire :
  l'étape `reveal-derivative` (« On fait apparaître $u'$ ») réécrit `e^{2x} = \dfrac12 \times 2e^{2x}`
  et sort ½, puis la forme composée intègre `2e^{2x}` ; quand u′ = 1 (`\frac3x`), la même règle
  s'intitule « On sort la constante $3$ » et la garde la reconnaît pareil ; le signe − devant
  l'intégrande (`-e^x`, étape `extract-constant`) s'intitule « On sort le signe $-$ », comme
  `\frac{-1}{x}`, sans coefficient à contrôler. La garde (`revealExplains`) n'accepte un `k`
  que si l'étape **immédiatement précédente** est cette réécriture, au même k, juste en valeurs
  (f = k × u′g(u), et la forme composée intègre bien u′g(u)). Un ½ glissé dans la primitive sans
  cette étape reste refusé. Le contrôle porte aussi sur les sous-étapes (IPP : v = ½e^{2x} est
  rédigé sous « Choix de u et dv », puis ∫ ½e^{2x} dx sous la formule).
  Les **éléments simples** (`apply-partial-fractions`) doivent écrire A·ln|x − r₁| + B·ln|x − r₂|
  à une constante près, comme le promet leur titre : un facteur non unitaire intègre A/(2x − 1)
  en (A/2)·ln|2x − 1| sans le dire (`\frac{1}{(2x-1)(x+1)}`, `\frac{1}{4x^2-1}`), refusé.
  Détection par les règles et leurs `bindings`, pas par une liste d'exemples.

Refusés aussi : bornes non numériques (`de 0 à a`), toute exception (`\frac{1}{x^2}` :
`PedagogicalIntegrationNotImplemented`). Montrés : polynômes, eˣ, 1/x, cos/sin, composées
exactes (`2e^{2x}`, `\frac{2x}{x^2+1}`) et, depuis la PR 2, à coefficient expliqué (`e^{2x}`,
`\sin(2x)`, `e^{-x}`, `\frac3x`, `\frac{x}{x^2+1}`, `(2x+1)^3`, `xe^{2x}`), IPP, et hors terminale l'IPP cyclique et les éléments
simples à facteurs x − r (`\frac{1}{x^2-1}`, `\frac{1}{x(x-1)}` de 2 à 3) ; à facteur non unitaire,
coefficient caché, refusés.

Un **pôle dans [a ; b]** (`\frac1x` de −1 à 1, `\frac{1}{x-2}` de 1 à 3, et aussi une borne,
`\frac1x` de 0 à 1) sort en **refus du moteur** (`INTEGRAL_UNDEFINED`), message inchangé. Ce
refus porte en plus `steps` et `summary` (champs optionnels du `CalcResult` `refus`, posés par
`integrateRefusalSteps` seulement pour `.intégrer`) : « Comment ? » et l'interrupteur Résumé /
Détaillé apparaissent sur la ligne de refus comme sur une réponse, et déplient « La fonction n'est
pas définie en x = 0, qui appartient à [−1 ; 1] ». Garde (`citesForbiddenPoint`) : les étapes
concluent `undefinedAt` par l'étape `integrand-undefined-on-interval`, qui cite la même valeur ;
cette valeur est un nombre, dans [min(a, b) ; max(a, b)] bornes comprises, et f n'y a pas de
valeur finie (f sans autre lettre que la variable). Sinon pas d'étapes. Les refus des autres
commandes n'en portent jamais. Les étapes sont au niveau lycée : l'IPP s'y rédige en notation de
terminale (« On pose $u(x) = x$ et $v'(x) = e^x$, donc $u'(x) = 1$ et $v(x) = e^x$ », PR 3 du
2026-10-13), sans changer ce que la garde reconnaît.

**`.domaine` en détail** (`domain-steps.ts`, PR 2 de `.domaine`, décisions de David du
2026-10-13). La réponse de la ligne est une **formule**, `D = …`, écrite par `domainToLatex`
(`pedagogical-domain/renderer.ts`) — le même écrivain que la conclusion « Domaine : … » des
étapes ; le texte du terminal (« Expression », « Contraintes », « Condition ») n'est plus montré.
`output` porte la même réponse en texte (`D = ]0 ; +∞[ \ {2}`, `formatDomainInterval`) : repli
de la vue, export JSON. Le domaine est recalculé par `computeDomain` sur `result.ast` (la fonction
même de `domain.command.ts`), dans la variable de la ligne (`; t`, `pour t`, devinée). Les refus
du moteur (`DOMAIN_UNRESOLVED` : `\sqrt{\sin x}`) sortent plus haut, inchangés, sans étapes ;
`.domaine f` d'une fonction à ensemble garde sa phrase (décision a).

- **Valeur connue seulement en décimal** (plus de 6 décimales, même critère que le pipeline :
  `\frac{1}{x^3-2}`) : pas d'étapes, et la valeur est NOMMÉE dans l'ensemble puis arrondie —
  `D = ℝ \ {α} avec α ≈ 1,26` (écriture validée par David ; lettres α, β, γ, δ par valeurs
  croissantes ; au-delà de quatre, ou hors réunion d'intervalles, la ligne garde le texte du
  moteur). Deux décimales, deux chiffres significatifs sous 1 (`α ≈ 0,046`, jamais « α ≈ 0 ») ;
  deux arrondis égaux reçoivent des décimales jusqu'à se distinguer (`1,260` et `1,261`).
  `]0 ; α[ ∪ ]α ; +∞[` est réécrit `]0 ; +∞[ \ {α}` avant les deux écrivains : texte et LaTeX
  disent le même ensemble.
- **« Comment ? »** : `generatePedagogicalDomainSteps` (niveau `lycee`, détaillé + résumé),
  montré seulement si l'ensemble que conclut la dernière étape est, **par valeur**, le domaine du
  moteur (`sameDomainByValue` : appartenance testée en chaque borne, chaque point exclu, leurs
  voisins à 10⁻⁶ près et une grille, valeurs lues par les évaluateurs mêmes de `containsValue`
  — avec `compile`, [√2 et ]√2 passaient pour égaux ; une exclusion périodique est sondée sur
  ±4 périodes ; une valeur non évaluable, un domaine par conditions → désaccord). Toute exception (`PedagogicalDomainNotImplemented`) → pas d'étapes, la formule
  reste. Quand les étapes sont montrées, la réponse s'écrit avec l'ensemble qu'elles concluent :
  les deux écritures sont identiques. Branché aussi sans la résolution rédigée d'une contrainte
  (`\sqrt{x^2-5x+6}`, Q4) et pour le domaine universel (Q6). Tests :
  `domaine-etapes.test.ts`, `domaine-etapes-affichage.svelte.test.ts`.

**`.développer` en détail** (`expand.ts`, phase 0 [atelier-developper-phase0.md](../archive/wip/atelier-developper-phase0.md),
décisions de David du 2026-10-14). Servie par l'atelier (`ATELIER_ONLY_COMMANDS` : le registre
n'a pas d'`expand`), après la substitution des noms (`.développer f`, `.développer f(x)`).
Développer, c'est aussi réduire. La réponse est le résultat de l'intention `developper`, remis
dans l'ordre du manuel : puissances décroissantes de x, les autres lettres traitées comme des
coefficients, sinon l'ordre alphabétique, les lettres indicées comptant comme des lettres
(`a(x+b)` → `ax + ab`, `(a−b)²` → `a² − 2ab + b²`, `(x_1+x_2)²` → `x_1² + 2x_1x_2 + x_2²` ; un
coefficient négatif déplacé s'écrit `− 2ab`, jamais `+ (−2ab)`). **Une somme de monômes
seulement** (revue de la PR 2, 2026-10-14) : dès qu'un terme n'a pas de degré (eˣ, √x, sin x), on
garde l'ordre du module (`(2√x+1)²` → `4x + 4√x + 1`, `(eˣ+e⁻ˣ)²` → `e²ˣ + e⁻²ˣ + 2`,
`(x+1)²+√(1+x)` → `x² + 2x + √(x+1) + 1` — la PR 1 rangeait ce terme après les monômes). `-(x+1)` part au module écrit `-1(x+1)` : seul, il
n'était pas développé (0 étape). La réponse s'écrit comme l'élève a écrit, comme `.limite`
(décision de David du 2026-10-06, étendue le 2026-10-14) : un décimal tapé, ou le mode décimal,
donne des décimaux (`(0,5x+1)²` → `0,25x² + x + 1`, même en mode exact) ; sinon des fractions
(`(x/2+1)²` → `¼x² + x + 1`) ; une fraction sans écriture décimale finie reste une fraction
(`⅑x²`). Rien n'a bougé (aucune étape, ou un résultat égal à l'entrée aux parenthèses près) : trois
phrases, sans ligne rouge, qui citent l'expression TAPÉE — « « x^2+1 » est déjà développée et
réduite. » (une somme de monômes : fractions et racines de nombres, lettres indicées comprises),
« Je ne sais pas développer « (x+1)^n » : l'exposant n'est pas un nombre. », sinon « Il n'y a rien
à développer dans « 1/(x+1) ». ». Deux autres « je ne sais pas », sans ligne rouge : un
développement de plus de 500 termes (`MAX_TERMS`, estimé AVANT le calcul, qui est synchrone :
`(x+1)^2000` figeait la page 5 s) ; une réponse que le module n'a pas su finir (deux nombres dans un
produit, une puissance de nombres : `e^{(x+1)^2}` rendait `e^{x^2 + 2 x 1 + 1^2}`) — jamais une
réponse mal écrite. Refus : sans expression (avec l'exemple), une équation ou une inéquation
(« On développe une expression, pas une équation. Pour la résoudre : .résoudre (x+1)^2=4 »,
expression TAPÉE citée), tout ce qui n'est pas une expression (liste, saisie illisible).

**Le « Comment ? » de `.développer`** (PR 2, section E de la phase 0) : rédigé par
`writeExpandSteps` (`mathAST/pedagogical-simplify/expand-steps.ts`), qui part de l'expression
tapée et finit sur la réponse de la ligne. Réponse et étapes viennent d'`explainExpansion`
(`pedagogical-simplify/expand-explained.ts`), que les corrections d'exercices générées
(`intent: 'developper'`) appellent aussi : une intention, une seule rédaction (option B de David,
2026-10-14) ; restent dans `expand.ts` les refus, les messages, le plafond de termes et le mode
décimal (`decimal: true`). La trace de l'intention `developper` n'est pas montrée
(produits collés « 2x1 », la même ligne jusqu'à 13 fois, distribution cachée). Une ligne par geste,
appliqué à tous les termes où il vaut : un cube s'écrit carré × parenthèse (« On écrit (x + 1)³ =
(x + 1)²(x + 1) ») ; une identité remarquable nomme a et b (« On reconnaît (a + b)² = a² + 2ab +
b², avec a = x et b = 1 ») — seule, elle a sa ligne à × (`x² + 2 × x × 1 + 1²`) puis « On calcule
chaque terme » ; plusieurs s'écrivent calculées (« On développe chaque carré avec son identité
remarquable ») ; une parenthèse d'un produit qu'on peut réduire l'est (« On réduit dans la
parenthèse ») ; la double distribution a sa ligne à × puis « On calcule chaque produit » ; un
facteur se distribue calculé (« On distribue 3, et le signe − devant la parenthèse change le signe
de chaque terme », « On enlève la parenthèse précédée d'un − », « deux signes − se compensent ») ;
un facteur simple devant les parenthèses fait dire « chaque terme de la première parenthèse » au
lieu de « du premier facteur ». La dernière ligne dit ce qu'elle fait : « On réduit » si des termes
semblables se regroupent ; « On ordonne les termes » si seul l'ordre change dans une somme de
monômes (« pourquoi » : puissances décroissantes de x, sinon l'ordre alphabétique) — l'ordre du
module, lui, se fond dans la ligne précédente ; « On écrit chaque terme avec son coefficient »
(`y/2` → `½y`) ou « On calcule chaque terme » (`(2x)²` → `4x²`) si un terme change d'écriture. Le
titre d'identité ne nomme a et b que si l'expression n'écrit ni `a` ni `b` (`(a−2b)²` : la formule
seule) ; a et b y sont mis en forme comme les images (`b = 0,5` en mode décimal). `0(x+1)` : la
réponse 0, sans étapes. Exposant 4 ou plus : une seule ligne, « On développe la
puissance ». Jamais deux images identiques de suite ; un × dès qu'un nombre suit une lettre ou un
nombre ; chaque image est vérifiée égale à l'entrée (`areEquivalent`) ; la dernière image est la
réponse, décimaux compris (l'atelier passe sa mise en forme à chaque image). Version résumée : la
ligne à × fondue dans le calcul qui la suit, sans les « pourquoi ». Pas de « Comment ? » — la
réponse reste — pour une somme sous une fonction, une racine, dans un exposant ou une fraction
(`(x+1)(x-1)/(x+2)` se lit `(x+1)·((x-1)/(x+2))`), ni au-delà de 16 produits sur une ligne.
L'ordre du manuel vit dans `pedagogical-simplify/expand-order.ts` (`orderExpanded`), partagé par
la réponse et les étapes. Tests : `developper-commande.test.ts`,
`pedagogical-simplify/__tests__/expand-steps.test.ts`, `expand-explained.test.ts`.

**`.limite` en détail** (`limit.ts`, PR 2 de `.limite`, syntaxe tranchée par David le
2026-10-14, L1-L6). Servie par l'atelier (`ATELIER_ONLY_COMMANDS`), lue **avant** la substitution
des noms : `en 0 à droite` n'est pas une expression, et `a` y serait le mot `à`. Le point
(`readPoint`) : un nombre ou une valeur de l'atelier (`en 0,5`, `en a`, `en 1/2` écrit
`\frac{1}{2}`), `en x=1` toléré ; le côté `0+`, `0^+`, `0^{+}`, `0 à droite` (et `-`,
`à gauche`) ; l'infini `+∞`, `+inf`, `-∞`, `-inf`, `\infty`, et `∞` / `inf` seuls = +∞ (pas de
côté à l'infini : refus). Un côté sur un point qui n'est pas un nombre seul s'écrit
`x\to {\tfrac{3}{4}}^-`. La lettre est celle de l'expression, comme `.évaluer` ; une lettre tapée absente d'une expression qui en a d'autres est refusée (`.limite t^2 en x=1` → « L'expression s'écrit avec t : .limite t^2 en t=1. »), une constante reste acceptée (plusieurs sans
x : refus, « écris la variable après « en » »). Le calcul est `evaluateLimit` (`mathAST/limits`).
La réponse est une **formule**, `\lim\limits_{x\to 1}\dfrac{x^2-1}{x-1} = 2` (expression TAPÉE,
parenthèses de la barre de fraction retirées, une somme entre `\left(…\right)`).
**Citée seule** (`citedObject`) : une fonction de l'atelier `f`, `f'` ou `f(<sa lettre>)` garde
son nom et sa lettre — son expression RANGÉE (en x) est calculée en x, montrée
`\lim\limits_{t\to 0^+} f(t)` pour f(t) = 1/t, `f'(x)` pour une dérivée. Tout autre argument
(`f(t)` quand f s'écrit en x, `f(2x)`, `f(2x)+1`) est une expression : calculée substituée, dans
la lettre de l'expression substituée, affichée telle que tapée (`\lim\limits_{x\to 1}
f\left(2x\right) = 5`) ; la composée d'une fonction À ENSEMBLE choisi reste refusée
(`composedMessage`, faute de domaine de f(u(x))). Une suite `u`, `u_n` ou `u(n)` se calcule en n et
s'écrit `\lim\limits_{n\to+\infty} u_n` ; dans une expression, `u_n`, `u_k` se lisent `u(n)`, `u(k)` (`withSequenceCalls` : `.limite u_n + 1 en +∞` → 1) ; seul +∞ est accepté, que la suite soit citée seule ou dans une expression (`citedSequence`), et une suite récurrente est refusée.
**Gardes de l'atelier** (le branchement saute celles du chemin commun) : une liste citée →
`listCitedMessage` ; l'ensemble choisi d'une fonction (`f(x) = x^2 sur [0;+∞[`, I4) — un point
loin de l'ensemble est refusé comme `.évaluer` (« -1 n'est pas dans l'ensemble de définition de
f, [0 ; +∞[. »), un bord est pris du côté intérieur (`en 0` → `0^+`), un côté extérieur ou un
infini hors de l'ensemble est refusé ; une composée d'une fonction à ensemble → `composedMessage`.
`exp(1)` s'écrit `e`. **Jamais de valeur approchée** : statut `indeterminate`, `unsupported`,
`approximate`, ou un nombre à plus de 6 décimales → « Je ne sais pas calculer cette limite. »
(une réponse, pas un refus, comme `.factoriser`). Sans côté tapé, une fonction définie d'un seul
côté du point (`definedSide` du moteur) l'écrit : `.limite ln(x) en 0` →
`\lim\limits_{x\to 0^+} \ln(x) = -\infty` (aussi `sqrt(x)` en 0, `sqrt(-x)` en `0^-`, `ln(x-1)`
en 1 ; `f(x)` garde son nom). `does-not-exist` sans côté TAPÉ par l'élève (un côté imposé par l'ensemble choisi, I4, garde la
raison : f(x) = sin(1/x) sur ]0 ; +∞[, `.limite f en 0` → « Pas de limite en 0+ : f oscille… »),
selon `noLimitReason` ; le nom de la fonction s'écrit hors de `\text` (`f_1` en indice) :
`outside-domain` → « Pas de limite en -1 : l'expression n'est pas définie au voisinage de -1. »
(« f n'est pas définie… » pour une fonction citée seule ; `ln(x)` en −∞) ; `oscillation` → « Pas
de limite en +∞ : l'expression oscille sans se rapprocher d'aucune valeur. » (« f oscille… » ;
`3sin(2x)+1` en −∞, `sin(1/x)` en 0) ; sinon (L4, `sides-differ` compris) les deux limites
latérales quand le moteur les connaît, « Pas de limite en 0 : à gauche −∞, à droite +∞. », sinon
« Pas de limite en … ». **Avec un côté tapé** (Q1, David, 2026-10-14), la raison s'écrit aussi
(le moteur rend `noLimitReason` pour un côté demandé) : `.limite sqrt(-x) en 0+` → « Pas de
limite en 0+ : l'expression n'est pas définie à droite de 0. » (« à gauche de » pour `0-`, « f »
en maths pour une fonction citée) ; `sin(1/x)` en `0+` → « … oscille sans se rapprocher d'aucune
valeur. ». Une fonction usuelle sans parenthèses (`ln x`, `sin x`, `cos x`, `sqrt x`, `exp x`,
lue l·n·x par le parseur) est refusée comme dans les autres commandes (`bareFunctionRefusal`, en amont dans
`runCommand` : « « ln x » : écris ln(x) avec des parenthèses. ») ; `e^x` se lit bien. Le texte de la ligne (copie, export)
est lisible (`readableText`) : divisions en `/`, exposant long entre parenthèses (`e^(1/x)`,
jamais le `e^{1:/x}` de `toCustom`), sans accolades : `1/(x-1)^2`, `e^x/x^2`, `(x+2)/x^2`, des
parenthèses seulement où le sens l'exige (`1/(2x)`). Test :
`limite-commande.test.ts`.

**« Comment ? » de `.limite`** (`limit-steps.ts`, PR 3, décisions de David du 2026-10-14).
Depuis le lot 5f-3 de `simplify-carte` (Q45, 2026-10-25), les étapes gardent les décimaux tapés
comme la réponse de la ligne (`.limite (0,5x^2+1)/x^2 en +inf` : `x²(0,5 + 1/x²)`, « La limite
vaut 0,5 ») et « Simplification du facteur commun » écrit le quotient développé puis factorisé
avant de simplifier (détail : `docs/systeme/mathast/README.md`, `pedagogical-limits` ; tests
`__tests__/limite-etapes-5f3.test.ts`).
Les étapes sont celles de `generatePedagogicalLimitSteps` (niveau `lycee` : forme indéterminée,
factorisation, conjugué, terme prépondérant, limites de référence et croissances comparées,
composée `e^u`, côtés d'un pôle, côté implicite) — jamais `dispatchPedagogicalLimit`,
qui lit une syntaxe maison. Elles portent sur l'expression calculée, dans la lettre de l'élève
(f(t) = 1/t : t, pas le x de rangement ; une lettre déjà prise par un paramètre → pas d'étapes),
divisions écrites en fractions sans les parenthèses tapées pour la barre (`\dfrac{\sqrt{x+4}-2}{x}`),
un point non entier avec un côté écrit comme sur la ligne (`{\tfrac{1}{2}}^+`). **Gendarmes
exclus** : le moteur juge l'encadrement sur des sondes numériques (`SQUEEZE_PROBES`) sans en
rendre les bornes ; des étapes `identify-bounds` / `apply-squeeze` → pas de « Comment ? »
(`x^2 sin(1/x)` en 0) tant que le moteur n'écrit pas l'inégalité. **Fonctions en escalier
exclues** (`floor`, `ceil`, `round`, `sign`, V60) : le moteur pédagogique substitue sans voir
le saut — pas de « Comment ? » (`containsPiecewiseFunction`). **Garde de concordance** (`concludesLimitAnswer`) : la valeur
conclue est celle de la ligne par valeur exacte (`concludesEngineValue`), un infini du même signe,
le même côté implicite (l'étape qui porte `domainBoundary` ↔ `definedSide`) ; « pas de limite »
n'est expliqué que dans le cas L4 (les deux limites latérales écrites par la ligne), avec les
mêmes valeurs à gauche et à droite (`bindings` de `conclude-does-not-exist`) — `outside-domain`,
`oscillation` et « Pas de limite en … » seul n'ont pas de « Comment ? ». **Rien à montrer**
(`showsNothing`, comme E4 de `.évaluer`) : une substitution directe seule (`x^2+1` en 2,
`sqrt(x)` en 0) → pas d'étapes. Le moteur pédagogique qui lève
(`PedagogicalLimitNotImplemented` : `sqrt(x+1)-sqrt(x)` en +∞, `sin x` en +∞), un `*` dans le
LaTeX → pas d'étapes. **Résumé construit** : les étapes sans l'annonce, la forme indéterminée
(masquée comme dans le résumé du renderer, décision de David du 2026-10-12), les limites des
termes, la limite d'une somme / d'un produit / d'un quotient ni la substitution qui suit une
simplification, sans explications — la technique, la conclusion. Une fonction ou une
suite citée seule garde son nom : l'annonce écrit `\lim g(x) = \lim \dfrac{x^2-1}{x-1}` (« la
limite de $g(x)$ »), la conclusion `\lim g(x) = 2`, `u_n` pour une suite. Tests :
`limite-etapes.test.ts`, `limite-etapes-garde.test.ts`, `limite-etapes-affichage.svelte.test.ts`.

Statistiques : `summarizeList` / `summarizeTable` (`src/lib/statistics/describe.ts`), et
`src/lib/statistics/` pour l'ajustement (`fit.ts`), le bivarié, la simulation, les fractions et
les variables aléatoires. Les **scènes** (diagrammes, lois, comparaisons) passent par les mêmes
constructeurs que les blocs ubumark d'une fiche (`src/lib/ubumark/utils/stat-chart-scene.ts`,
`src/lib/ubumark/parser/stat-chart-parser.ts`…) : mêmes textes, mêmes valeurs exactes, aucun code
de calcul en double. `.binomiale` et les autres lois **ne créent aucune liste** (les listes
stockent des décimaux, une loi B(20 ; 0,3) n'y serait plus exacte — Q142).

---

## Invariants

1. **L'atelier possède l'état ; les vues sont des projections** (décision figée n° 1). Un réglage
   écrit ailleurs que dans l'`Atelier` (dans le grapheur, dans une carte) serait écrasé à la
   synchronisation suivante.
2. **Ponts à sens unique** : atelier → moteur (`syncEngine`), atelier → grapheur (`syncPlots`),
   atelier → figure (`syncFigure`). Points et courbes n'entrent que dans le troisième (avec les
   fonctions marquées `inFigure`) ; rien de
   la figure ne remonte : le glisser d'un point (lot 3) est délégué par la toile à l'atelier, qui
   réécrit la définition. Une **construction** est calculée par
   l'atelier (`construction.ts`, L1), jamais lue dans la `Figure`.
3. **Un seul espace de noms** (D1) ; jamais d'écrasement silencieux d'un nom (création, renommage,
   fusion d'un atelier reçu).
4. **Tout contrôle sur une définition vit dans sa lecture** (`parseDefinition`), jamais dans
   `build()` : `recomputeAll` repart toujours de la lecture et écraserait le reste.
5. **Une fonction est rangée en x** ; la lettre de l'élève n'est que de l'affichage. Une
   définition en t qui contient déjà x est refusée (`letterRejection`).
6. **Rien ne quitte le navigateur.** Ni requête, ni compte : stockage local et URL seulement.
7. **Toute entrée venue de dehors passe par Zod** : sauvegarde (`atelierShellSchema`), lien
   (`decodeAtelier`, `curvesFromLink`), historique importé (`readHistory`), lignes de Calcul
   rangées (`loadCalcHistory`, formules par la liste blanche `isSafeLatex`), réglages
   (`curveDisplaySchema`).
8. **Plafonds D8** : `MAX_LIST_VALUES` (200) par liste, `MAX_LISTS` (8) listes,
   `MAX_FIGURE_OBJECTS` (50 points et courbes, M2), `MAX_DEFINITION_LENGTH` à la saisie — pour
   qu'un atelier tienne dans une URL. La grille :
   26 × 200, 200 caractères par cellule.
9. **Visible et désactivé avec sa raison**, jamais caché : actions de carte et commandes.
10. **On ne reparse jamais la sortie texte du moteur** (`render.ts`). Un **calcul** s'écrit depuis
    son arbre, écrit par la valeur exacte à afficher commune (`exactValueToShow`,
    `mathAST/eval/exact-value.ts`, lot 5c — la même que `{{eval}}`, le tableau de variations, le
    grapheur et les limites). Le moteur (`readableExact`, `web-repl-engine.ts`) la calcule avec la
    saisie pour source : registre décimal gardé (`0,1+0,2 → 0,3`, `2,50 → 2,5`, `1/3+0,5 → 5/6`,
    `0,5√2 → √2/2`), `cos(π/6)` calculé, une seule fraction sur un dénominateur commun
    (`(1+√5)/2`), notation scientifique tapée gardée (`3 × 10²⁰`) ; un nombre
    seul — la valeur approchée `≈ 5,0990`, zéro final compris — est laissé tel quel. Une
    **expression littérale** est mise au propre par `tidy` dans l'ordre de l'élève
    (`order: 'kept'`, lot 5d) : `2x+3x → 5x`, `x*2 → 2x`, `2(1+x)+3(x+1) → 5(1+x)`,
    `x/2+x/3 → 5x/6`, `eˣ·eˣ → e^{2x}` ; `3−2x+x²` n'est pas réordonnée, `x/x` ne devient
    pas 1 (S3), rien n'est développé (`2(x+1)`) ni réduit par une identité (`ln(eˣ)`, S4).
    Les facteurs suivent l'ordre de `tidy` (`x m → m x`, `sin²(x) → sin(x)²`). **« Garder »
    range l'écriture affichée** (Q27 : `RenderedResult.ast`, `2x+3x` se garde `5x`), sauf une
    grandeur, gardée par `quantityAst`. La ligne `S = …` de `.résoudre`
    (`solve-steps.ts`, `shownAnswer`) s'écrit de même depuis les solutions conclues (`−√2/2`,
    `(1 − √5)/2`, `2x = 0,6` → `x = 0,3`) ; les étapes d'une équation suivent la même écriture (`stepsAsShown`, lot 5f-4, voir « `.résoudre` en détail »), unités traduites par `displayUnitsInLatex` ; seule une **commande** peut encore montrer
    son texte s'il ne contient que du LaTeX sûr (lot B des grandeurs, 2026-10-11).
    La constante d'Euler y arrive écrite `e` : `toCustom` l'écrit ainsi et tous les
    parseurs la relisent comme Euler (depuis le 2026-10-10 ; `withPlainEuler` et le
    remplacement de `\euler` dans `render.ts` sont retirés). `e` n'est jamais une variable :
    `.dériver 3e^2 ; e` est refusé (« e est la constante d'Euler, pas une variable »).
11. **Seul l'affichage passe à la virgule décimale** : le moteur, l'arbre gardé et le rejeu
    restent en `0.5` (`decimal-comma.ts`). Dans le titre ou l'explication d'une étape,
    `decimalCommaProse` écrit `0,5` dans la phrase et `0{,}5` dans une formule `$…$` (V25).
    À la **lecture d'une définition** (`parseByProvenance`, `parse.ts`), la virgule décimale et
    le « ; » qui sépare les arguments de `max`, `min`, `gcd`, `mod` sont traduits comme pour un
    calcul (`decimalCommaInput` en texte, `argumentSemicolonsLatex` en LaTeX) : `f(x) =
max(2,5 ; x)` puis `f(1)` répond `5/2` (avant le 2026-10-13 : « Écriture non reconnue »).
    ⚠️ La saisie de l'élève seulement (`'text'`, `'paste'`, `'command'`) : `'url'` relit aussi le
    texte du moteur (`toCustom` écrit `max(2,3)`), dont la virgule sépare. Comme sur une ligne de
    calcul, `f(x) = max(1,2)+x` est refusée (« Sépare les valeurs avec « ; » »). Le
    champ de la carte montre `\max\left(2{,}5;x\right)` (`argumentSeparatorsShown`).
    Le parseur maison ne lit plus la virgule décimale depuis le 2026-10-21 (lecture-grandeurs,
    PR 6) ; or un objet rangé (lien, sauvegarde) est relu SANS provenance, donc en `'url'`, et
    l'atelier en range avec une virgule (`formatSliderValue` pose `0,3`, une commande range le
    texte de l'élève). Hors saisie de l'élève, `readByProvenance` passe donc le texte par
    `legacyDecimalCommas` (`mathAST/parser/custom/legacy-decimal-commas.ts`), la règle exacte de
    l'ancien tokenizer : `0,3` → `0.3`, `max(2,3)` inchangé. Tout atelier rangé se relit comme
    avant (`atelier/__tests__/virgule-rangee.test.ts`, `recalcul-equivalence.test.ts`).
12. **On ne valide pas** les réponses de l'élève (décision figée n° 2).
13. **Une cellule de la grille a un seul propriétaire** : la liste de sa colonne (dans sa
    définition) ou la grille (`cells`), jamais les deux.

---

## Comment étendre

### Une commande `.xxx`

1. **Le moteur la connaît déjà** (registre `WebReplEngine`) : ajouter son entrée dans
   `TRANSLATIONS` (`commands.ts`) — nom français, description pour un élève, **exemple qui
   marche**, `section` de l'aide. Sans `section`, elle n'apparaît que dans `.aide dev`.
2. **L'atelier la sert seul** : l'ajouter aussi à `ATELIER_ONLY_COMMANDS`, puis la brancher dans
   `calcul.ts` — dans `SIMULATIONS` si elle lit des **noms de listes**, sinon dans
   `runAtelierCommand`. Le module de la commande rend `{ ok, text, chart? }` ou un message de refus
   en français.
3. **Arguments à mots-clés** : déclarer la commande dans `COMMAND_KEYWORDS` et `COMMAND_LABELS`
   (`src/lib/mathAST/cli/core/variable-argument.ts`) et tenir
   [atelier-syntaxe.md](atelier-syntaxe.md) à jour.
4. Les tests du catalogue rejouent **chaque exemple** (`commands.test.ts`, `aide-calcul.test.ts`) :
   un exemple qui refuse ou rend une ligne vide fait échouer la suite. Un exemple qui cite des
   objets déclare son décor dans `exampleSetup` (`stageExampleSetup`) : `L` → une liste, `f(x)` →
   une fonction, `point:A` et `value:S` → un point et une valeur écrits comme dans Calcul
   (`.relever`, dont l'exemple est le problème de l'aire).

**Une action de carte** — ajouter l'action au type dans `BY_KIND` (`actions.ts`), puis son traitement dans
`CalcDesk.runFromPanel` (`desk.svelte.ts`) — elle doit écrire une ligne dans Calcul, et une carte
par objet créé. Le geste devient alors rejouable (`ReplayStep` `action`).

**Une vue** — (1) un composant sous `src/lib/components/atelier/` qui lit l'atelier par `useAtelier()` et n'a
**aucun état de modèle** à lui ; un état d'affichage qui doit survivre au changement de vue
vit dans l'`Atelier`, hors `serialize()` (comme `charts`, ou `figureFrame` de la vue Géométrie) ; (2) l'ajouter au type `ViewId` et au rendu de `AtelierContainer.svelte` ; (3) s'il faut un nouveau moteur, un pont à sens unique sur le modèle de
`syncPlots`, idempotent — fait pour la vue Géométrie (`syncFigure`, `figure-sync.ts`).

**Un mot de construction** (lot 2) — l'ajouter à `ConstructionWord` / `CONSTRUCTION_WORDS` et
`NAMED_KEYS` (`construction-read.ts`), le typer (`construction-spec.ts` : `typed`, `FORMS`,
`natureOf`, `partsOf`), le calculer exact (`construction.ts`), le poser dans `figure-sync.ts` s'il
dessine un nouveau genre d'élément ; tant qu'il manque, `isLaterWord` le refuse avec sa raison.
Le mot doit exister dans le DSL (L2 : aucun mot inventé), et `dsl-builtins.md` le décrire.

**Un type d'objet** — le plus coûteux : `ObjectKind` et l'union dans `types.ts`, lecture dans `parse.ts`, schéma de
`persistence.ts` (et **incrémenter `ATELIER_STATE_VERSION`** si la forme rangée change), actions,
carte, fusion — et la migration si un nom devient réservé (`migrateReservedNames`). Fait pour la
v2 (`point`, `curve`, 2026-10-18) : `types.ts`, `names.ts` (`PREFERRED_NAMES`), `parse.ts`
(`parseDefinition`), `atelier.svelte.ts` (`build`, `#cited`, plafond), `actions.ts` (`BY_KIND`),
`calcul.ts`, `persistence.ts`, `ObjectCard.svelte`, `ObjectPanel.svelte` ; les `Record` indexés
par le type (`KIND_WORDS`, `KIND_NAMES`) sont signalés par le typecheck.

---

## Tests

- **Modèle et commandes** : `src/lib/atelier/__tests__/` (128 fichiers, dont 24 en
  `*.svelte.test.ts` qui tournent dans un vrai navigateur). Les autres tournent en node malgré les
  runes : c'est le **nom du fichier** qui choisit le projet, pas les runes.
- **Composants** : `src/lib/components/atelier/__tests__/`, harnais
  `src/lib/components/atelier/__tests__/harness/WithAtelier.svelte`.
- Fichiers repères : `atelier.test.ts` et `names.test.ts` (modèle), `calcul.test.ts`,
  `commands.test.ts`, `syntaxe-mots-cles.test.ts`, `persistence.test.ts`, `url.svelte.test.ts`,
  `suppression-cascade.test.ts`, `rejeu-calcul.svelte.test.ts`, `solve-steps-oracle.test.ts`
  (oracle du garde-fou), `paste.svelte.test.ts` (la pile d'annulation dans Chromium),
  `figure-sync.test.ts` (le pont de la vue Géométrie, assertions sur le dessin), `figure-fonctions.test.ts` (𝒞f, K1-K3),
  `construction-lecture.test.ts` (la lecture, comparée au lecteur du DSL), `construction-modele.test.ts`
  (L2, L3, L8, sauvegarde), `figure-constructions.test.ts`, `point-sur-intersections.test.ts` et
  `figure-point-sur.test.ts` (PR 3 : modèle, numérotation stable au glisser), `relever.test.ts`
  (PR 4 : `.relever`, le problème de l'aire de bout en bout),
  `components/atelier/__tests__/point-sur.svelte.test.ts`, `components/atelier/__tests__/construction.svelte.test.ts` et
  `components/atelier/__tests__/FigureView.svelte.test.ts` (harnais `WithFigure.svelte`),
  `outils-figure.test.ts` et `components/atelier/__tests__/outils-figure.svelte.test.ts` (barre
  d'outils de la géométrie, lot 3, PR 2),
  `recalcul-equivalence.test.ts` et `recalcul-performance.test.ts` (raccourcis du recalcul, sur
  les figures `__tests__/fixtures/figure-24.ts` et `figure-fonctions.ts` — dérivée, réciproque, suites, noms indicés).

Lancer : `pnpm test:server <fichier>.test.ts`, `pnpm test:client <fichier>.svelte.test.ts`. Aucun
test d'intégration : l'atelier ne touche pas la base.

---

## Décisions

Aucun ADR propre à l'atelier ; [ADR 0007](../adr/0007-un-moteur-quatre-intentions.md) régit
`.simplifier` / `.factoriser`. Les décisions vivent dans les phases 0 archivées :

**Cadrage** ([atelier-recherche-eleve.md](../archive/wip/atelier-recherche-eleve.md) §9,
décisions figées) : 1 l'atelier possède l'état · 2 on ne valide pas · 3 pas de fusion grapheur /
`geometry-core` · 4 pas de sélecteur de niveau · 5 remplacée par G1/G2 (atelier = entrée unique,
`/grapheur` ouvre l'atelier).

**v3 Python remplacée (David, 2026-10-24, après un conseil à cinq voix)** : **pas d'onglet Python
ni d'état partagé** entre l'atelier et l'espace de noms Python. Raisons : deux sémantiques (exact
de `mathAST` contre flottants, `e` = Euler, `^` / `**`) donneraient deux résultats pour le même
objet ; `a = 3` dans une cellule laisserait croire que le curseur bouge ; le playground valide et
note, l'atelier ne valide pas (décision 2). À la place, des **ponts à sens unique, visibles** :

1. **« Ouvrir dans Python »** (livré, voir la section du même nom) : une fonction, une suite ou une liste s'ouvre dans
   `/python` comme du code lisible (`def f(x): return …`, `L = [12, 15, 9]`), par l'entrée
   `?code=` qui existe déjà (`routes/(public)/python/+page.svelte`). Seul travail : la traduction
   `mathAST` → Python, refusée avec un message pour ce qui ne se traduit pas sans perte.
2. **« Ouvrir dans l'atelier »** (livré le 2026-10-25, voir la section du même nom) : le sens
   inverse, une liste produite par un programme (simulation, seuil d'une suite) copiée dans un
   atelier éphémère, puis gardée si l'élève le veut.

Blockly reste l'entrée vers Python au cycle 4 ; ce n'est pas un argument pour fusionner.

**Phase 0 v1** ([atelier-recherche-eleve-phase0.md](../archive/wip/atelier-recherche-eleve-phase0.md) §9), état au 2026-10-10 :

| #   | Décision                                                     | Toujours vraie ?                                                                   |
| --- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| D1  | Un seul espace de noms                                       | ✅                                                                                 |
| D2  | `x` seulement pour les fonctions, `n` pour les suites        | ⚠️ **Assouplie** (2026-10-06) : `f(t) = t^2` accepté, rangé en x (`letter.ts`)     |
| D3  | Toute valeur numérique a un curseur, `[-10 ; 10]` par défaut | ✅ (bornes réglables dans la carte)                                                |
| D4  | Grandeur à unité : sans curseur, non traçable                | ✅                                                                                 |
| D5  | L'historique reste, une ligne se promeut en objet            | ✅ (« Garder », `promote`)                                                         |
| D6  | Pas d'annulation globale                                     | ❌ levée au lot 5 de la refonte (2026-10-19) : une pile commune Annuler / Rétablir |
| D7  | « Afficher la dérivée » et « garder `f′` », deux gestes      | ⚠️ **Remplacée par G6** : « Dériver » crée la carte `f′`, qui suit `f`             |
| D8  | 200 valeurs par liste, 8 listes                              | ✅ (`MAX_LIST_VALUES`, `MAX_LISTS`)                                                |
| D9  | Nom inconnu → en attente, pas en erreur                      | ✅                                                                                 |
| D10 | Le parseur suit la provenance                                | ✅ (en partie : le panneau et les données appellent `create` sans provenance)      |

**Autres** : option B (moteur et grapheur reflètent l'atelier, Q1 du 2026-09-16) · commandes
traduites côté atelier, pas dans `mathAST` (Q3) · arrivant renommé à la fusion (Q2) · G1 à G8
(`/grapheur`) · suppression en cascade et export JSON / ubumark (2026-10-05) · syntaxe par
mots-clés (2026-10-08) · virgule décimale, `.aide` élève, lois retenues (2026-10-09).

---

## État

**Livré** (v1, en production) : `/atelier` et `/grapheur` (l'atelier ouvert sur le Graphe, liens
`?f=`), cartes modifiables en MathLive, `f′` vivante, curseurs, suites (nuage, escalier),
partage par URL et mode éphémère, persistance locale, suppression en cascade, export et rejeu,
résolution / dérivation / simplification / factorisation / variations par étapes, statistiques
(`.stats`, `.ajustement`, listes qualitatives, `.croiser`, `.filtrer`, `.comparer`, `.simuler`),
lois (`.binomiale`, `.géométrique`, `.uniforme`, `.exponentielle`, `.normale`).

**Livré aussi, en production** (vérifié le 2026-10-24 sur la branche `production`) :

- **v2 géométrie** (v0.41.0) : lot 1 (modèle, vue Géométrie, 𝒞f), lot 2 (constructions au
  clavier, mesures, `point_sur`, intersections, `.relever`), lot 3 (barre d'outils, glisser,
  outils de construction, téléphone et tablette) ; chantier clos le 2026-10-19, journal :
  [atelier-geometrie-progress.md](../archive/wip/atelier-geometrie-progress.md) ;
- **tableur intégré** (option C) : lots 1 à 5 (#1410 → #1439 : grille, formules, `.tabuler`,
  fonctions, hasard à graine) en v0.36.0, mise en forme, RESTE / ET / OU, ouvrir un CSV (v0.37.0),
  NBVAL et NB.VIDE (v0.39.0). Journal : [atelier-tableur-progress.md](../archive/wip/atelier-tableur-progress.md).

**À venir** (suivi : [docs/wip/atelier-progress.md](../wip/atelier-progress.md)) :

- dettes connues : action « Renommer » encore désactivée (« prochain lot »), saisie des unités
  sans palette. `recomputeAll` réassigne tout le tableau : mesuré le 2026-10-19, ce n'est pas un
  poste (< 0,1 ms ; voir « Ce qui se recalcule, et ce qui est gardé »).
  `.relever` sur une figure chargée (intersections, perpendiculaire, périmètre, angle, deux
  mesures composées) : 19 à 23 s pour le balayage, ~8 ms puis ~95 ms de recalcul par pas — le
  même coût que chaque cran du curseur, ou chaque mouvement d'un point glissé, sur cette figure
  (mesuré le 2026-10-19). Pas d'optimisation sûre et évidente côté `.relever` ;

⚠️ La section « Ce qui reste pour clore la v1 » de `atelier-progress.md` (2026-10-04) dit encore
les garanties `/grapheur` non faites : elles le sont (lots 2 à 6, #779 → #809,
[atelier-grapheur-progress.md](../archive/wip/atelier-grapheur-progress.md)).

---

Vérifié contre le code le 2026-10-19 (outils de construction de la géométrie, lot 3, PR 3).
