# Guides calculatrices — journal de chantier

> Worktree `../ubumaths-wt-calculatrices`, branche `feat/guides-calculatrices`. Ouvert le 2026-10-12.

## Le besoin (David)

Les élèves ont des calculatrices différentes. Pour chaque niveau et chaque modèle courant, un petit
guide : savoir s'en servir correctement, et savoir où chercher chaque outil.

## Décisions (2026-10-12, toutes tranchées par David)

| Sujet               | Décision                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Support             | **Les deux** : page dans Chiphre ET fiche PDF (Typst), depuis un même contenu source                                                       |
| Niveaux             | 6e, cycle 4, 2de, 1re spé, Tle spé — chaque guide reprend les niveaux précédents                                                           |
| Modèles             | Collège : Casio fx-92+ Spéciale Collège, TI-Collège Plus. Lycée : Casio Graph 35+E II et 90+E, TI-83 Premium CE, TI-82 Advanced, NumWorks  |
| Stockage du contenu | **Fichiers typés dans le dépôt** (pas de table) — on passera en base si les corrections deviennent fréquentes                              |
| Visibilité          | **Page publique** (parents, SEO), aucune donnée personnelle                                                                                |
| Pilote              | **NumWorks**, tous niveaux, de bout en bout (contenu, page, PDF, relecture) avant les autres modèles                                       |
| Rendu des touches   | **Touches dessinées** ; captures d'écran seulement au cas par cas, sur NumWorks (émulateur)                                                |
| Exactitude          | Chaque séquence tirée de la **doc officielle** du constructeur (URL citée) ; relecture de David sur la vraie machine via une page à cocher |
| Stats au collège    | Le programme dit « tableur » (4-045, 3-032) → moyenne/médiane/étendue rangées en **« vérifier »**                                          |
| Blocs sur la fx-92+ | Module « Algorithmique » ajouté au cycle 4, **facultatif** (programme : langage par blocs, 5-102/5-103)                                    |
| Solveurs, d/dx, ∫   | Le programme attend la méthode algébrique/graphique → rangés sous **« Vérifier un résultat »**, jamais « Résoudre »                        |
| Loi normale         | **Absente** du programme de Tle spé (vérifié dans le seed) → non traitée                                                                   |
| Mode examen         | Gardé, rubrique à part : règle d'examen, pas point de programme                                                                            |

## Liste des tâches, vérifiée contre les programmes

Source : seeds de l'arbre des notions (`docs/wip/arbre-notions/seed-*.md`, transcription ligne à
ligne des BO). Statut : **P** = demandé par le programme · **V** = vérifier un résultat · **E** = règle
d'examen / pratique.

- **6e** : effacer/corriger (E) · 4 opérations et priorités · division euclidienne (6-123) ·
  fraction → décimal (6-125) · `Ans` (E) · pourcentages (6-140, 6-141) · arrondi (6-111)
- **Cycle 4** : opposé vs soustraction (5-012…) · fractions, forme irréductible (4-005, 3-001) ·
  puissances, exposants négatifs (3-004), notation scientifique (3-006) · racine carrée (4-019), π ·
  trigonométrie en degrés (3-023) · tableau de valeurs dès la 5e (5-093) · simulation (4-050, 3-034)
  · stats moyenne/médiane/étendue (V) · blocs fx-92+ (facultatif)
- **2de** : mode examen (E) · réglages, chiffres significatifs (2-254) · fonction : tableau, graphique,
  fenêtre · image, zéro, intersection f(x) = g(x) (2-338), extremums, variations (2-351, calculatrice
  citée) · stats : écart-type, quartiles (2-370, 2-382) · Python, y compris la simulation (2-226…2-234,
  2-392)
- **1re spé** : suites, tableau et nuage de points (1SPE-221) · seuil en Python (1SPE-237) · nombre
  dérivé, tangente (V, 1SPE-270) · racines du trinôme (V, 1SPE-248) · espérance, écart-type
  (1SPE-356/357) · exp (1SPE-291), radians (1SPE-303) · listes Python (1SPE-206…210)
- **Tle spé** : ln (TSPE-438) · n!, k parmi n (TSPE-310/313) · binomiale P(X = k), P(X ≤ k),
  P(k ≤ X ≤ m) (TSPE-510) · plus petit k (TSPE-511/514) · seuil (TSPE-392) · intégrale (V, TSPE-485)
- **Pièges** (chaque guide) : degrés/radians · `-2²` · fraction sans parenthèses · arrondi ou
  troncature · affichage `1ᴇ-3`
- **Gardé, décision de David** (2026-10-12) : « conjecturer une limite au tableau de valeurs », que
  j'avais retiré faute de point de Tle spé explicite
- ⚠️ **Tous les niveaux de `GradeCode`** (décision de David, 2026-10-12) : CP → CM2, 5e/4e/3e séparés,
  1re ens. sci., maths expertes, maths complémentaires, 1re/Tle techno. **Liste par niveau :
  [guides-calculatrices-taches.md](guides-calculatrices-taches.md)** (lue dans les seeds et les BO,
  introductions comprises). CP-CE2 : pas de calculatrice (BO cycle 2). T_GEN : aucune source.

## Avancement

- [x] Périmètre, décisions, liste vérifiée contre les programmes
- [x] Séquences NumWorks sourcées : [guides-calculatrices-numworks.md](guides-calculatrices-numworks.md)
      (manuel v20 + notes de version + **code d'Epsilon cloné dans `extern/numworks-epsilon`**, branches
      `version-NN`) — reste la relecture sur machine
- [x] Phase 0 **validée par David le 2026-10-12** (13 comportements, voir § Phase 0) :
      séquence non relue sur machine = **masquée en prod** ; guides **à partir de la 6e** (CM reporté,
      CP-CE2 sans guide) ; niveaux en **noms lisibles** dans l'adresse (`seconde`, `maths-complementaires`)
- [x] Code du pilote, tests d'abord (2026-10-12) : `src/lib/calculatrices/` (types, levels, tasks,
      guide, routing, typst, models/), `src/lib/components/calculatrices/`, pages
      `src/routes/(public)/calculatrices/`. Tests serveur + rendu (GuideTaskCard). PDF = bouton
      « Télécharger la fiche PDF » (typst.ts, chargé au clic)
- [x] Contenu NumWorks dans `models/numworks.ts` : 84 séquences + 13 pièges, 81 + 13 rejoués au simulateur
- [x] Les 12 guides NumWorks compilent avec le compilateur de prod (typst.ts 0.6.1-rc5) : harnais
      `compile.mjs` + `generate-guides.mts` (scratchpad de session, à recréer si perdu : voir
      mémoire `reference_pdf-compilateur-production`)
- [x] Revue code-reviewer : contenu non relu dans le JS client → `load` serveur (`page-data.ts`,
      mesuré absent du bundle client), Typst en chaînes littérales, rappels T_EXP dans l'ordre, contenu
- [ ] **Page à cocher publiée** : https://claude.ai/artifact/FwwkUtt4t6nRwdbwFcELLJ (collection
      `relecture`, doc par fiche `seq-<taskId>` / `piege-<id>`, `{statut: 'ok'|'a-revoir',
commentaire}`) — David relit sur sa NumWorks ; ensuite `verifiedOnDevice: true` dans une 2ᵉ PR
- [ ] PR pilote
- [ ] Modèles suivants

## Phase 0 (validée le 2026-10-12)

Contenu : `src/lib/calculatrices/` (`taches.ts` commun, `modeles/<modele>.ts`) ; filiation des niveaux
= `grade_predecessors`. Pages publiques `/calculatrices` et `/calculatrices/<modele>/<niveau>` ; PDF
Typst depuis les mêmes données, compilé dans le navigateur.

1. `/calculatrices` : modèles par Collège / Lycée, « bientôt » si non rédigé
2. guide d'un niveau : ses tâches d'abord, celles des niveaux hérités en « Rappels » repliés
3. tâche = titre, application, étapes avec touches dessinées
4. tâche « vérifier » : bandeau « Pour contrôler ton résultat, pas pour le remplacer »
5. pièges en fin de guide
6. PDF = mêmes tâches, même ordre que la page
7. tâche impossible sur le modèle : jamais omise, « Pas de fonction dédiée » + contournement
8. séquence non relue sur machine : invisible en prod, visible en local
9. fonction apparue dans une version du système : « à partir de la vNN »
10. modèle sans guide pour ce niveau : renvoi vers les niveaux disponibles
11. CP-CE2 (BO : pas de calculatrice) et CM (reporté) : page d'explication, pas de page vide
12. modèle ou niveau inconnu : 404
13. tests : tâche inexistante, étape vide, séquence sans source, niveau hors `GradeCode` → refusés

## Simulateur NumWorks (2026-10-12, accord de David pour Homebrew et la compilation)

- Dépôt `extern/numworks-epsilon` (dépôt principal), SDK installé par `tools/setup.sh --only-simulator`.
- Compilation : `export PATH="$(brew --prefix make)/libexec/gnubin:$PATH"; source .venv/bin/activate;
make -j6 PLATFORM=simulator epsilon.app` (≈ 50 s).
- Binaire : `epsilon/output/release/macos/arm64/epsilon.bin --headless --load-state-file s.nwt
--take-screenshot s.png` (ou `--take-all-screenshots dossier/`).
- Scénario texte : `NWST` / `**.**.**` / `epsilon` / `fr` / `light`, puis un événement par ligne
  (`events_names.inc`). ⚠️ Événements DÉJÀ traduits : `Alpha`+`Backspace` n'est pas rejoué en `%`,
  écrire `Percent`. Le simulateur vérifie ce que FAIT la machine, pas les libellés imprimés.
- Constats : unité d'angle par défaut « rad » ; `80+20%` → `80↗20%` = 96 ; ligne vide : `[+]`
  reprend le résultat, `[−]` commence un négatif ; `-2²` = -4 affiché `-(2²)` ; après `[÷]`, `→`
  pour sortir du dénominateur.
- Licence : aucun fichier de licence dans le dépôt actuel (historiquement CC BY-NC-SA) → captures
  pour VÉRIFIER seulement ; publication à trancher avec David.
