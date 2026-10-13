# Un seul générateur PDF de fiches, piloté par les gabarits — journal

> Chantier ouvert le 2026-10-13 (demande de David). Worktree `../ubumaths-wt-pdf-fiches`,
> branche `refactor/generateur-pdf-fiches-unique`. **Phase 0 : plan à valider, aucun code.**

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

**Question ouverte Q1 (base de données)** — comment ranger styles et formes :

- (a) deux colonnes sur `worksheet_templates` : `style` (clé) et `forme` ; la fiche garde
  `template_id` (gabarit de la forme « fiche ») et en déduit son style ; remplacements par forme
  dans `worksheets.config` ;
- (b) une table `worksheet_styles` + `worksheet_templates.style_id` + `worksheets.style_id`.

Recommandation : (a), plus léger, migration additive ; (b) si les styles doivent avoir leur propre
nom / description / propriétaire.

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

- exercice sans section après des sections : même regroupement des deux côtés (choix à acter :
  « Autres exercices » côté élève aujourd'hui, en fin sans titre côté prof) ;
- solution vide : même traitement des deux côtés (aujourd'hui : en-tête seul côté prof, exercice
  omis côté élève) — **proposition : omis** ;
- `show_points` décoché : points masqués des deux côtés (aujourd'hui toujours affichés côté élève).

Erreur / garde :

- corrections non visibles pour l'élève : jamais dans son PDF, quelle que soit la forme ;
- langue inconnue → repli `fr`, comme aujourd'hui.

## Journal

- 2026-10-13 — exploration (carte des deux générateurs), décisions D0-D2, plan proposé.
