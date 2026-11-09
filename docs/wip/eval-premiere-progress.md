# Chantier `eval-premiere` — évaluation de rattrapage « second degré », 1re spé

## Reprendre ici

_Mis à jour le 2026-11-09, après la publication en prod._

- **État** : fiche publiée en prod (`f337aa82-b020-4348-bf05-f99f4782f99b`, 3 exercices, vérifiée en base) ; aucun code applicatif, donc rien à déployer.
- **Prochaine action** : quand David a regardé la fiche (ligne dans `verifications-manuelles.md`) et fixé son barème → fin de chantier : archiver ce journal (`docs/archive/`).
- **En attente de David** : coup d'œil à la fiche et à l'aperçu PDF ; barème (il le fixe dans l'appli).
- **Pièges en cours** : `data/` est dans `.gitignore` → `git add -f` ; heredoc non quoté = `$…` mangés.
- **Worktree / branche** : supprimés après le merge ; tout se fait depuis le dépôt principal.

## Contexte

Les élèves ont échoué à « Le parc aquatique » (`730867c2`, script `create-evaluation-second-degre-1spe.ts`),
trois parties : jet d'eau (sommet → forme canonique), aire de pique-nique (corde sur 3 côtés), prix du billet (recette).
Rattrapage voulu par David : un sujet de la longueur d'une partie, l'élève **choisit un seul exercice** ; sa note
remplace celle de sa plus mauvaise partie. Mêmes thèmes, situations et méthodes différentes de l'évaluation et de la
fiche d'applications `d6c03510`.

## Décisions de David (2026-11-09)

- 3 exercices **séparés** (non liés) + 1 fiche de type `assessment` qui les regroupe.
- **Pas de barème** (il le fera) : `points` et `total_points` nuls, points non affichés.
- Durée **40 min**. **Avec anglais**.

## Contenu

`data/fiches/eval-rattrapage-second-degre-1spe/` : `md/ sol/ en/ sol-en/`, `plan.json`, `generic.txt`,
`svg/` → `png/` (Chromium de Playwright, 1 200 px), `verif/assert_all.py` (sympy, une assertion par résultat).

- **Le saut du dauphin** : racines 0 et 6, h(1) = 2,5 → h(x) = −0,5x(x − 6) = −0,5(x − 3)² + 4,5 ; cerceau à 4 m → x = 2 ou 4 ; h ⩾ 2,5 → [1 ; 5].
- **Le massif de fleurs** : carré de 10 m, AM = BN = CP = DQ = x ; S(x) = 2x² − 20x + 100, minimum 50 m² en x = 5 ; fleurs ⩾ 42 m² → [3 ; 7].
- **L'atelier de bougies** : C(x) = 0,5x² + 6x + 160, prix 30 € ; B(x) = −0,5(x − 8)(x − 40) ; bénéfice pour 8 < x < 40 ; maximum 128 € pour 24 bougies.

## Journal

- 2026-11-09 : rédaction, vérifications, figures, script (`scripts/create-evaluation-rattrapage-second-degre-1spe.ts`), simulation OK. `data/fiches/` ajouté à `.prettierignore` (prettier abîme l'ubumark).
- 2026-11-09 : #2509 mergée ; `--publier` lancé par David (refusé au classifieur du mode auto) → fiche `f337aa82` en prod, contrôlée par SQL (3 exercices dans l'ordre).
