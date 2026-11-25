# Chantier `idees-3e-puissances` — journal

Idées reprises d'ailleurs, rubrique « Puissances » de 3e (3C1, 5 exercices), selon le skill
`idees-rubrique`. Relevé : [idees-3e-puissances-releve.md](idees-3e-puissances-releve.md) · fiches :
[idees-3e-puissances-fiches.md](idees-3e-puissances-fiches.md) · page à cocher :
https://claude.ai/artifact/LGpQYL1RscgPbBHoZRCUFA

## Reprendre ici

_Mis à jour le 2026-11-25, après #3148._

- **État** : #3148 mergée (N5, N6 en fichiers ; 7 variations sur 4 publiés + migration de contenu
  `20261125153849_…_publies_contenu`, PAS encore jouée en prod). · **Prochaine action** :
  `db:migrate` de cette migration quand `migration list --linked` ne montre qu'elle (le
  2026-11-25, deux migrations de modération du chat, 20261125145621 et 20261125152013, d'une
  autre session, attendaient aussi → pas lancé) ; puis migration de rangement (nœud + point) de
  N5, N6 dans un nouveau worktree · **En attente de David** : `create-questions --publier` sur
  `scripts/questions/idees-3e-puissances-neufs` (N5, N6 en brouillons en prod) ; dire si les
  migrations du chat peuvent partir avec la mienne · **Pièges en cours** : options de 3fe98dd9
  changées (`signs: off`, `allowBracketsInFirstNegativeTerm`), voir § Lot ; `--publier` en
  local réécrit les ids → les retirer · **Worktree / branche** : aucun (retiré après #3148).

## Phase 0 (2026-11-25)

Rubrique prise le 2026-11-25 (tableau de répartition). Les 5 exercices chez eux reprennent quatre
exercices de 4e (4C30-3, 4C33-1, 4C33-0, 4C30-5) avec un réglage de 3e, plus un exercice de lecture
(3C10-4). Détail dans le relevé, recommandations dans les fiches.

Question d'accès de la migration : **personne** ne gagne de lecture (on range et on tague des
modèles de questions).

**Validée par David le 2026-11-25** (« je valide », après mes recommandations) : F1 à F6 oui, F7
laissée, Q1 refuser 3 × 3 × 3 × 3 pour (−3)⁴, Q2 faire F5. Les 4 modèles publiés sont réservés
dans le tableau de répartition.

## Lot (2026-11-25)

Scripts `docs/wip/questions/idees-3e-puissances-publies.py` (variations F1 à F4) et
`idees-3e-puissances-neufs.py` (N5 = F5, N6 = F6) ; JSON dans
`scripts/questions/idees-3e-puissances-{publies,neufs}/`. Simulation `create-questions` verte sur
les 6 modèles.

Écarts et décisions d'écriture :

- **Q1 tenue par la forme, pas par une erreur prévue** : une erreur prévue de même valeur que la
  réponse est ignorée. 3 × 3 × 3 × 3 pour (−3)⁴ est refusé (`bad_form`) par un motif
  `requiredForm` qui exige n facteurs négatifs ; le message est celui de la forme, pas le message
  sur mesure de la fiche.
- **Options de 3fe98dd9 changées** (elles jugent aussi ses 6 variations en prod, sans signe ni
  base négative : leurs 10 specs d'origine restent vertes) : `signs: off` (sinon
  (−3)×(−3)×(−3)×(−3) est « à simplifier » en 3×3×3×3) et `allowBracketsInFirstNegativeTerm`
  (sinon (−3) en tête est une « parenthèse inutile »).
- Un `{{if:}}` écrit dans `requiredForm.pattern` n'est pas résolu : le motif passe par une
  variable (`motif`).
- F3 et N6 : la base est écrite dans l'énoncé, l'élève tape l'exposant (`(-3)^{?}`).
- F2 : deux erreurs prévues seulement (aⁿ, −aⁿ) ; 1/aⁿ et 1/125 sont refusés par la forme.
- N5 : un texte à trous ne porte pas d'erreurs prévues ; base et exposant échangés, double et
  triple sont des intrus, et le corrigé dit pourquoi. V2 sans base 2 (2² = 2 × 2 est aussi le
  double de 2). Les réponses des specs sont des positions affichées, lues sur l'instance.
- Les messages s'écrivent sous leur forme réécrite : `(-5)^2` devient `\left( -5 \right)^2`.

## Aperçu et migration de contenu (2026-11-25)

- N5 (bc9702b5) et N6 (cd4ae32f) joués en base locale dans l'aperçu admin (serveur sur 5177, 5176
  pris par une autre session), sans erreur de console : N5 seed 877494, « cube » → Juste,
  « triple » → Faux ; N6 seed 71013, 3 → Juste, 11 (6 + 5) → Faux. Les variations ajoutées aux
  4 publiés ne sont pas jouées en local (la base locale a l'ancien contenu) : leurs specs passent
  en simulation et dans le test de la migration.
- `migration-contenu.ts` : 15368b02 +3 variations, 18761148 +1, 3fe98dd9 +2 et options,
  bb9cff7b +1 ; `migrations-contenu-publie` vert (193 tests).
