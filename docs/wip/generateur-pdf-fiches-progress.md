# Un seul générateur PDF de fiches, piloté par les gabarits — journal

> Chantier ouvert le 2026-10-13 (demande de David). Worktree `../ubumaths-wt-pdf-fiches`,
> branche `refactor/generateur-pdf-fiches-unique`. **Plan validé le 2026-10-13 (ADR 0028) ; lots 0 et 1 faits (lot 1 non poussé), lot 2 à venir.**

## Constat (exploration du 2026-10-13)

Deux générateurs Typst produisent les PDF de fiches :

- `src/lib/typst/generators/worksheet-generator.ts` (1 054 lignes) : aperçu et PDF du prof,
  corrigé du serveur, pages publiques cahier / cours, scripts `scripts/fiches/` ; gabarits ;
- `src/lib/worksheets/student-worksheet-typst.ts` (354 lignes) : PDF téléchargé par l'élève et
  aperçu « vue élève » du prof ; mise en page figée (2 colonnes), **aucun gabarit**.

7 fonctionnalités ont été posées deux fois (sens de AB, correction concise / détaillée, figures,
point décimal anglais, fonctions déclarées, tableaux de signes, fiches en anglais) : toutes sur le
rendu **d'un exercice**. Le générateur prof a lui-même deux chemins jumeaux (avec / sans gabarit).

Écarts de comportement (bugs d'un côté ou de l'autre) :

1. titre d'exercice : formules rendues côté élève, texte brut côté prof ;
2. setup prof par défaut : `lang: "fr"` en dur, même pour une fiche anglaise ;
3. élève : ordre des exercices (`exercise_order`) et style de numérotation ignorés ;
4. élève : « point(s) » en français en dur ;
5. opérateurs à limites (∑, lim) réglés côté élève seulement.

Gabarits inaccessibles :

- le PDF élève les ignore ; le corrigé du serveur (`api/worksheets/assignments/[id]/correction`)
  aussi (toujours la mise en page par défaut) ;
- RLS de `worksheet_templates` : lecture par le créateur ou l'admin seulement → un élève ne peut pas
  lire un gabarit créé par le prof (les gabarits système ont une copie dans le code,
  `getDefaultTemplate`).
- Le corrigé prof réutilise le gabarit de la fiche en y injectant un bandeau « CORRECTION ».

## Décisions de David (2026-10-13)

- **D0** — La différence se fait entre **types de documents**, pas entre prof et élève : un seul
  générateur, piloté par le gabarit.
- **D1** — Question d'accès : un élève pourra lire **le gabarit de la fiche qui lui est affectée**
  (code de mise en page Typst, aucune donnée d'élève), y compris un gabarit créé par le prof, **via
  le serveur** (seulement ce gabarit, seulement pour un élève à qui la fiche est affectée).
  → tests d'intégration (rouges sans le changement) + `security-auditor`.
- **D2** — **1 forme = 1 gabarit**. Un **style** regroupe ses gabarits, un par forme ; le prof
  choisit un style pour la fiche, les formes suivent ; il peut changer le gabarit d'une forme. Les
  éléments communs d'un style (couleurs, en-tête, rendu d'un exercice) sont écrits une fois, dans
  un fichier partagé importé par ses gabarits. Forme absente d'un style → celle du style par défaut.

- **D3** — Base : **table `worksheet_styles`** (nom, description, propriétaire, code Typst commun) ;
  `worksheet_templates` porte son style et sa forme (un gabarit par couple) ; la fiche pointe vers
  un style ; remplacement d'une forme par fiche dans une table dédiée (clés étrangères). « L'élève
  passe par le serveur » expliqué et validé : aucune policy RLS ouverte aux élèves.
- **D4** — Comportements : exercice hors section après des sections → « **Autres exercices** » ;
  correction non écrite → « **Exercice N : correction non écrite** » ; « afficher les points »
  s'applique **à tous les PDF**.

- **D5** (2026-10-13) — **« Mélanger les exercices » refonctionne**, dans l'esprit de l'ADR 0023 :
  l'ordre est tiré comme les valeurs (case « individualisés » décochée → un ordre pour la classe ;
  cochée → un par élève), à l'intérieur de chaque section (sections dans leur ordre, hors section
  après), déterministe, recalculé par la même fonction pour tous les chemins ; hors affectation, pas
  de mélange ; réaffecter → autre tirage ; fiche sans l'option : rien ne change.

- **D6** (2026-10-13) — **suites du mélange** (écart 9 de `fiches-et-pdf.md`) :
  1. case « Mélanger dans les sections » (`shuffle_within_sections`) **retirée** de l'interface ;
     la donnée reste en base, plus lue. Le mélange sert l'anti-triche des évaluations ; sans
     section, toute la fiche est mélangée (déjà le cas).
  2. **Signalements** : côté élève, la notification cite le numéro de SA copie (même calcul que la
     copie) et pointe vers sa fiche, ancrée sur l'exercice (ancre fondée sur l'identifiant de
     l'exercice de fiche, pas sur le numéro) ; la page défile jusqu'à l'exercice et le met en
     évidence. Côté prof, page du signalement : « Voir la copie de <prénom> » (aperçu « vue
     élève » présélectionné, même ancre) et « Corriger l'exercice » (éditeur de l'exercice) ;
     numéro de la copie de l'élève dans la carte et la page. Aucune règle d'accès ne change ; un
     élève n'obtient jamais l'ordre ni le numéro d'un autre.
  3. **Corrigé de classe d'une affectation individualisée** (valeurs ou ordre propres à chaque
     élève) : la copie d'un élève choisi par le prof dans une liste au moment de le produire
     (premier par défaut, nom non imprimé), exercices identifiés au moins par leur titre,
     avertissement imprimé en tête, localisé (« Chaque élève a sa propre version : consulte ta
     correction personnelle. »). Non individualisée : rien ne change.
  4. (décisions du 2026-10-14) Signalements de l'élève (onglet, « Mes signalements », envoi) : le
     numéro de SA copie, aucun numéro s'il est inconnu. Aperçu ouvert depuis un signalement :
     `?depuis=signalement`, retour au signalement. **Aperçu « vue prof » d'une affectation
     individualisée** : même règle que le corrigé de classe (copie d'un élève choisi, premier par
     défaut, nom non imprimé, titres, avertissement imprimé en tête) ; non individualisée : rien ne
     change.

## Vocabulaire proposé (à verser dans CONTEXT.md, lot 0)

| Terme       | Sens                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Gabarit** | Mise en page Typst d'**une** forme de document (`worksheet_templates`). « Modèle » reste aux chapitres et questions.     |
| **Style**   | Famille de gabarits qui se ressemblent (« Moderne », « Fiche élève »…), un par forme ; choisi par le prof pour la fiche. |
| **Forme**   | Ce que contient le PDF : **fiche** · **réponses** · **corrigé** · **fiche + corrections** (corrections en fin).          |

## Architecture cible (à valider)

1. **Un modèle de document unique**, `DocumentFiche` : titre, type, langue, exercices (numéro,
   titre, énoncé, réponses ?, corrigé ?, points, consigne, section, indispensable ★), sections,
   affectation ? (consignes), cartouche (élève, classe, date), options d'affichage. **Deux
   adaptateurs** le remplissent : depuis la copie recalculée (`buildWorksheetCopy`, côté prof) et
   depuis `StudentWorksheetView` (côté élève, corrections déjà filtrées par le serveur).
2. **Un rendu d'exercice unique** (titre avec formules, numérotation, points localisés, consigne,
   énoncé, réponses / corrigé concis ou détaillé), utilisé par toutes les formes.
3. **Un générateur sans « mode »** : `générer(document, gabarit) → Typst`. Le gabarit décide quoi
   afficher ; les placeholders (consignes d'affectation, ★, cartouche…) sont disponibles pour tous.
4. **Résolution du gabarit** : style de la fiche + forme demandée (+ remplacement éventuel par le
   prof) → gabarit ; repli sur le style par défaut. Côté élève, le serveur renvoie le gabarit (D1).
5. Tous les chemins passent par là : aperçu prof, PDF par élève (ZIP), corrigé du serveur,
   téléchargement élève, aperçu « vue élève », cahier / cours publics, scripts `scripts/fiches/`.

**Q1 (base de données)** — tranchée : D3 (table des styles).

## Lots (proposés)

| Lot | Contenu                                                                                                                                                                   | Change le rendu ?           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| 0   | ADR (D0-D2) + vocabulaire CONTEXT.md                                                                                                                                      | non                         |
| 1   | `DocumentFiche` + 2 adaptateurs + rendu d'exercice unique, branchés dans les deux générateurs actuels ; écarts 1-5 corrigés                                               | oui : écarts 1-5 seulement  |
| 2   | Formes = gabarits : pour chaque style intégré, gabarits réponses / corrigé / fiche + corrections ; fichier commun du style ; plus de bandeau injecté ni de `mode`         | oui : corrigés (à montrer)  |
| 3   | Base : styles et formes (Q1), migration additive ; choix du style (+ remplacement d'une forme) dans l'écran de la fiche                                                   | écran prof (à montrer)      |
| 4   | Élève : le serveur fournit le gabarit (D1, tests d'intégration + `security-auditor`) ; PDF élève, aperçu vue élève et corrigé du serveur passent par le générateur unique | oui : PDF élève (à montrer) |
| 5   | Retrait de `student-worksheet-typst.ts` et des chemins morts (`generateBatchTypst`) ; doc versée dans `docs/systeme/fiches-et-pdf.md`, journal archivé                    | non                         |

Chaque lot : tests d'abord (rouges), empreinte Typst avant / après sur un jeu de fiches réelles
(rien ne bouge hors de ce que le lot veut changer), rendu montré à David avant la PR quand
l'esthétique change.

## Comportements attendus du lot 1 (spécification TDD, à valider)

Nominal :

- une même fiche, rendue depuis la copie prof et depuis la vue élève (corrections toutes visibles),
  donne **le même Typst d'exercice** (titre, numéro, points, consigne, énoncé, corrigé) ;
- un titre `Dériver $f(x)=x^2$` s'affiche avec la formule, dans les deux PDF ;
- fiche en anglais : `lang: "en"`, « pt » / « points » en anglais, des deux côtés ;
- `numbering_style` romain et un `exercise_order` personnalisé : mêmes numéros, même ordre côté
  élève que côté prof ;
- ∑ et lim ont leurs bornes dessous dans les deux PDF.

Limites :

- exercice sans section après des sections : même regroupement des deux côtés (D4 : « Autres exercices ») ;
- solution vide : même traitement des deux côtés (aujourd'hui : en-tête seul côté prof, exercice
  omis côté élève) — **D4 : « Exercice N : correction non écrite »** ;
- `show_points` décoché : points masqués des deux côtés (aujourd'hui toujours affichés côté élève).

Erreur / garde :

- corrections non visibles pour l'élève : jamais dans son PDF, quelle que soit la forme ;
- langue inconnue → repli `fr`, comme aujourd'hui.

## Journal

- 2026-10-14 — **D6 fait** (branche `feat/fiches-melange-suites`, commits locaux). (1) Case
  retirée de `MetadataCards` et du formulaire de création ; `asWorksheetConfig` ne lit plus la clé,
  `DEFAULT_WORKSHEET_CONFIG` ne l'écrit plus ; le schéma Zod serveur l'accepte encore (sinon la
  config renvoyée telle quelle l'effacerait de la base). (2) `copyDisplayNumbers` +
  `fetchCopyNumbering` : numéro de la copie de chaque élève dans les deux listes du prof, la page
  du signalement (l'ancien `+ 1` sur `position` corrigé) et la notification (numéro inconnu → aucun
  numéro) ; lien `#exercice-<id>` (`exercise-anchor.ts`), défilement + mise en évidence sur la fiche
  de l'élève et l'aperçu ; aperçu lit `?studentId=` (élève de l'affectation seulement) ; liens
  « Voir la copie de <prénom> » et « Corriger l'exercice ». (3) `hasPerStudentCopies` ; route
  `.../correction` : `needs_student` sans élève, `studentId` contrôlé (`isStudentOfAssignment`,
  mis en commun avec l'aperçu), avertissement `individualCopyNotice` ; `CorrectionManager` : liste
  des élèves (premier par défaut). `per_student_values_notice` retiré. (4) Suites : signalements
  de l'élève sur le numéro de sa copie (`null` → rien d'affiché ; ancien membre : fiche illisible,
  donc `null` — le test d'intégration `archived-student-error-reports` attendait la position 3,
  corrigé) ; `assignmentPreviewHref` / `assignmentPreviewReturn` (`?depuis=signalement`) ; vue
  prof de l'aperçu : `copyOf`, `per_student_copies`, « Copie de référence », avertissement du PDF
  élève (`individualCopyNotice`).

- 2026-10-13 — **D5 fait** (branche `feat/fiches-melange-exercices`, commits locaux).
  `copyExerciseOrder` (`worksheet-copy.ts`) et `copyOrderSeed` (`student-copy.ts`, graine dédiée
  `…:ordre:<section>`, une par section : pas de corrélation avec les valeurs, et ajouter un
  exercice à une section ne rebat pas les autres). Copie du prof : `exercise_order` ; API élève et
  aperçu d'affectation : `exercises` dans l'ordre de la copie + `shuffled: true` (dans le schéma de
  réponse) ; écran élève (`preserveExerciseOrder`) et PDF élève (`documentFromStudentView`) le
  suivent ; l'aperçu « vue élève » du prof suivait déjà l'ordre du tableau. Interprétation : les
  exercices hors section se mélangent entre eux (sinon l'option ne ferait rien sur une fiche sans
  section), leur bloc reste après les sections. Mesure prod : 0 fiche sur 32 avec
  `shuffle_exercises` ou `shuffle_within_sections`. **ADR 0023 non révisé** : le README des ADR
  interdit de réécrire un ADR accepté (sa section « Révision » date d'avant l'implémentation) ; si
  David veut la trace en ADR, ce serait un nouvel ADR. Ouverts (doc, écart 9) :
  `shuffle_within_sections` mort, numéros des signalements, corrigé de classe individualisé.

- 2026-10-13 — **lot 1 fait** (commits locaux, non poussés). `src/lib/worksheets/document/` :
  `WorksheetDocument`, adaptateurs prof / élève, ordre et numéros, rendu d'exercice unique
  (habillages `classic` / `heading` / `badge` / `student`, qui disparaissent au lot 2) ; les deux
  chemins jumeaux du prof fusionnés. Écarts corrigés : titre en formule côté prof ; `lang` du setup
  prof selon la fiche (+ `region: "FR"` en français seulement) ; ∑ / lim dans le setup prof ;
  élève : `numbering_style`, « pt / pts » de `documentLabels`, `show_points` (API élève et aperçu :
  `numbering_style`, `show_points`, et `asWorksheetConfig` lit enfin `numbering_style`) ; D4 :
  « Autres exercices » des deux côtés, « Correction non écrite. » (Corrigé ; Réponses sans réponses
  ni corrigé). Empreinte avant / après (3 fiches × 13 mises en page × 3 formes + élève × 3 fins,
  126 fichiers) : 54 changent, uniquement ces écarts. Mesure prod (2026-10-13) : 27 fiches sur 32
  ont `show_points` faux, mais aucune n'a d'exercice à points → le PDF élève ne perd rien.
  Restent ouverts : la copie élève n'a pas d'`exercise_order` (jamais tirée, ADR 0023) alors que
  `shuffle_exercises` existe dans la config ; mots « pt / pts » identiques en anglais (décision
  de David : « pt / pts » aussi en anglais).
- 2026-10-13 — revue du lot 1 : titre avec les fonctions déclarées et le sens de AB de
  l'exercice ; `points-badge` du prof sans gabarit sur `documentLabels` (« 1 pt », plus « 1 pts »).
  **À faire au lot 2** : l'aperçu markdown à l'écran de `PdfPreview.svelte` (l. 244-256) garde sa
  propre numérotation `i + 1`, « Réponses non rédigées » en français en dur et pas de « Correction
  non écrite » : le faire passer par le rendu commun.

- 2026-10-13 — plan validé ; D3, D4 ; lot 0 : ADR 0028, vocabulaire dans CONTEXT.md (style, gabarit, forme).

- 2026-10-13 — exploration (carte des deux générateurs), décisions D0-D2, plan proposé.
