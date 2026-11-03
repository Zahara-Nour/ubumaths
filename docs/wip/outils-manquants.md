# Outils et gestes manquants — liste unique

> **Le seul endroit** où sont tenus les outils (blocs, gestes de réponse, contrôles de figure)
> que demandent des points du programme et qui n'existent pas encore. Les journaux `questions-*`,
> `couvrir-un-niveau.md` § 3 bis et les chantiers d'outils **renvoient ici** au lieu de tenir leur
> propre liste.
>
> **Tenir à jour** : une session qui classe un point en C (ou D sans décision) l'ajoute ici, au
> geste qui le couvre ; un chantier d'outil qui merge passe sa ligne dans « Livré » avec sa PR.
> Un geste n'est « fait » que mergé ; les modèles qui s'en servent restent aux sessions
> « questions ».

_Relevé du 2026-11-02 : sections de classement de tous les journaux `questions-*` (wip et archive),
`points-repere`, `couvrir-un-niveau.md`, `questions.md` § Écarts connus, transcriptions et bornes du
BO ; vérifié dans le code (`construction.ts`, `collection-parser.ts`, `courbe-parser.ts`)._

## 1. À faire

| #   | Outil / geste                                                                                                                                                                           | Points                                                                                 | Où c'est écrit                                                   | État                                                                                                                                                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Contrôles de la figure à compléter** (`verifier:` : symétrique, angle, triangle, cercle circonscrit, bissectrice, médiatrice, 4e sommet, point)                                       | symétrie § 2 ; 6-170, 172, 173, 207, 166 ; 5-131, 132, 068, 133 ; 4-038 ; CM1-167, 168 | `questions-6` § 3 (l. 128-132, 1044), `questions-5` l. 86-89     | **Chantier `controles-figure` ouvert le 2026-11-02** (journal `controles-figure-progress.md`) — aujourd'hui `droite_par`, `carre`, `rectangle` seulement ; outils élève `droite`, `segment`. Le plus transversal. |
| 3   | **Somme de deux vecteurs** à tracer (le vecteur seul est livré, § 4)                                                                                                                    | 2-297                                                                                  | `points-repere` § 4 (archivé)                                    | **À faire**                                                                                                                                                                                                       |
| 4   | **Rapporteur** posé sur une figure (lire, puis construire un angle)                                                                                                                     | 6-169, 6-170                                                                           | `questions-6` l. 124-127                                         | À faire                                                                                                                                                                                                           |
| 5   | **Plaques de cent, milliers** (`centaines:` du bloc ` ```collection `)                                                                                                                  | CE1-001, 002, 003 ; CE2-001, 002, 005                                                  | `questions-ce1` l. 112, `questions-ce2` l. 100                   | À faire — clé réservée dans `collection-parser.ts`                                                                                                                                                                |
| 6   | **Relier des points** (courbe de données)                                                                                                                                               | CM2-125, CM2-159                                                                       | `questions-cm2` l. 91                                            | À faire                                                                                                                                                                                                           |
| 7   | **Demi-droite ou intervalle avec crochet** sur ` ```line `                                                                                                                              | 3-014, 2-251 (intervalles)                                                             | `questions-3` l. 334-342, `questions-2de` l. 985                 | **Chantier `demi-droite` ouvert le 2026-11-03** (journal `demi-droite-progress.md`) — affichage livré (#2294 : `segments: [2, +inf[`, crochets) ; reste le geste de l'élève (`representer:`, PR 2)                |
| 9   | **Suite de flèches à produire** (glisser-déposer `StructureField`)                                                                                                                      | CE1-080                                                                                | `questions-ce1` l. 117-119                                       | Plus tard, QCM en attendant                                                                                                                                                                                       |
| 10  | **Programme à écrire** (Blockly, vraie fonctionnalité)                                                                                                                                  | 6-197, 6-210, 5-100, 5-102, 4-068, 4-069, 3-051                                        | `questions-6` l. 1045, `questions-4` l. 129, `questions-3` l. 99 | En attente de Blockly                                                                                                                                                                                             |
| 11  | **Étiquette de ` ```probtree ` sans `\` rendue en maths** (aujourd'hui `wrapTextLabel` l'écrit en texte : « G_1 » sort brut, sans indice)                                               | TSPE-506, 617 (arbres du lot 5a)                                                       | `couvrir-un-niveau.md` § 9 (Rendu, suite)                        | À faire — contournement : `\mathrm{G}_1` ; défaut de `ProbabilityTree.svelte`                                                                                                                                     |
| 12  | **Domaine `]a[, +inf` du bloc ` ```variation `** : le parseur n'en lit qu'un point (`a[, +inf`), avec ou sans `?` (vu le 2026-11-03, PR #2297) ; aucun modèle réel ne l'écrit à ce jour | —                                                                                      | `tableau-signes` § PR 4                                          | à corriger quand un modèle en aura besoin                                                                                                                                                                         |

## 2. Transformations géométriques

Le BO en vigueur n'a **ni rotation, ni homothétie, ni agrandissement de figure** au collège
(`docs/systeme/programmes/bornes/cycle4.md`, bornes générales) ; l'échelle (6-193, 5-087, 088) est
de la proportionnalité. Ce qui reste : **construire une image**. Reconnaître ou choisir une image se
fait déjà (` ```figure ` + ` ```choix `, B).

| Niveau     | Points                                                                                     | L'élève doit                            | Outil                                           | État                                                                 |
| ---------- | ------------------------------------------------------------------------------------------ | --------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------- |
| CE2        | 072 (axes) ; **073** (compléter une figure symétrique, quadrillage, axe H / V)             | reconnaître ; **compléter**             | B ; **§ 1 n° 1** (contrôle « symétrique »)      | 072 B ; 073 à faire                                                  |
| CM1        | 106 (axes) ; **107, 108** (compléter, construire le symétrique sur quadrillage, axe H / V) | reconnaître ; **construire**            | B ; **§ 1 n° 1**                                | 106 B ; 107, 108 à faire                                             |
| CM2        | **097** (symétrique, axe vertical, horizontal ou diagonale du quadrillage)                 | **construire**                          | **§ 1 n° 1**                                    | À faire                                                              |
| 6e         | 179 (définition) ; **180** (construire, papier uni aussi)                                  | énoncer ; **construire**                | case / choix ; **§ 1 n° 1**                     | 179 à vérifier (aucun modèle relevé) ; 180 à faire (lot 11 de la 6e) |
| 5e         | 054, 055 (demi-tour : définir, propriétés) ; tracé du symétrique central                   | reconnaître, appliquer ; **construire** | B ; **§ 1 n° 1** (symétrique par un point)      | 054, 055 B ; tracé à faire                                           |
| 4e         | 030, 031, 032 (translation) ; symétrie centrale en 4e (sans code relevé)                   | choisir l'image, calculer               | ` ```figure grille:` + `translation()` + choix  | 030-032 faits (lot 6) ; 4e symétrie centrale à vérifier en base      |
| 3e         | 024, 025, 026 (translation, vecteurs, enchaînements)                                       | choisir le point image ; tracer         | quadrillage + choix ; `tracer: vecteur` (#2274) | En cours (`questions-3` lot 6)                                       |
| 1re techno | 015, 109, 016, 110, 018, 019 (frises, pavages, motif, transformations du plan)             | analyser une frise, créer une figure    | à concevoir                                     | Aucun journal ne le traite (1TECHNO en second tag seulement)         |

## 3. À trancher par David

| Points                                                        | Question                                                           | Où                                        |
| ------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------- |
| 5-113                                                         | diagramme circulaire à construire : geste, ou calcul d'angle (A) ? | `questions-5` l. 90                       |
| 3-032                                                         | tableur : formule écrite en texte, ou D ?                          | `questions-3` l. 127                      |
| 4-026 ; 3-017, 3-050 ; CP-002                                 | classés D, sans décision « hors appli » relevée                    | `questions-4` l. 129, `questions-3` l. 99 |
| CE1, CE2, CM1, CM2 (D : manipuler, soupeser, plier, enquêter) | hors appli ? (décision explicite seulement en 6e et en 5e)         | § 3 de chaque journal                     |

Tranchés hors appli : 5-011, 040, 130, 065, 042, 043, 059, 075, 084 (David, `questions-5` l. 127) ;
2-452, 454, 351 (Q6, `questions-2de` l. 222) ; CP-053, 063-066, 074 ; 6e (« non évaluable », `questions-6` l. 173).

## 4. Livré (pour mémoire)

Droite graduée à placer (` ```line placer:`), horloge à placer et trotteuse (#2179), barres à
construire et échelle à choisir, boîte à moustaches à construire, étiquettes à ranger
(` ```ranger `), figure à colorier (` ```partage colorier:`), cubes `dessiner:` / `retrouver:`,
patron `designer:` / `completer:`, collection et monnaie `construire:`, opération posée à
compléter, case « figure » (` ```figure-a-completer `, 3 contrôles) et figure de travail, case
choix (` ```choix `), repère à points à placer (` ```courbe placer:`, #2096), point sur le cercle
trigonométrique (` ```trig placer:`, #2189), droite à tracer (` ```courbe tracer:`, #2265, en prod depuis la
0.65.0 du 2026-11-03 ; ex-ligne 2 du § 1, numéros des autres lignes gardés), vecteur à tracer (` ```courbe tracer:
vecteur`, `depuis A`, #2274, pas en prod au 2026-11-03 ; la ligne 3 du § 1 ne garde que la somme), tableau de signes à compléter (` ```variation ` à `?`, #2267, #2273, #2287, #2297 ; ex-ligne 8 du § 1 ; modèles 2-330 et 2-446 à réécrire, chantier `tableau-signes`). Détail : `docs/systeme/questions.md`, `ubumark.md`.

**Contenu restant aux sessions « questions »** (l'outil existe) : vecteur à tracer : 2-298 (modèles en case choix à réécrire au geste), 3-025, 3-026 en tracé ; modèles « ranger » encore en case
à réécrire en ` ```ranger ` (6e 06, 07 ; CP, CE1, CM2) ; aucun modèle n'utilise `axe: à choisir`
(CE2-082) ; CM2-082 à 084, 153 attendent leurs modèles (1SPE-306 : fait, `questions-1spe-analyse`).

**Journaux à corriger** à leur prochaine reprise : `questions-6` l. 1042 (6-142 « outil neuf », couvert par
` ```partage `).
