# Mathoux — annonce du réveil — journal

> Branche `feat/mathoux-reveil`, worktree `../ubumaths-wt-mathoux-reveil`. Démarré le 2026-10-21.
> Suite de [mathoux-anim-progress.md](mathoux-anim-progress.md) (PR 1 #1582 : animations + colonne
> `student_mathoux.asleep`, migrée en prod).

## Reprendre ici

_Mis à jour le 2026-10-21, PR prête (revues faites)._

- **État** : code + tests (unitaires, intégration : endormi sans annonce puis réveil annoncé une
  fois) + doc ; `code-reviewer` (important corrigé : siestes concurrentes testées) et
  `security-auditor` : **aucun bloquant**.
- **Prochaine action** : PR → CI verte → merge → vérification manuelle notée → nettoyage worktree.
  Aucune migration dans cette PR.
- **En attente de David** : rien.
- **Pièges en cours** : limites acceptées et documentées (sieste du dernier écrivain en
  concurrence ; Mathou qui perd puis retrouve ses points) ; réveil + étoile → seul le réveil est
  dit (comme croissance + étoile).
- **Worktree / branche** : `../ubumaths-wt-mathoux-reveil` · `feat/mathoux-reveil`.

## Comportements (validés par David le 2026-10-21)

1. La mémoire retient la sieste écrite par le dernier calcul ; elle s'écrit quand elle change
   (endormissement comme réveil), sans annonce à l'endormissement.
2. Un Mathou qui dormait au calcul précédent et ne dort plus : « <Nom> s'est réveillé ! », avec la
   scène du réveil (`reaction="reveil"`).
3. Genre, un par Mathou : naissance > croissance > réveil > étoile (un Mathou qui grandit et se
   réveille à la fois : croissance).
4. Lignes existantes à `false` : aucun faux réveil au déploiement.
5. Mathou de la seule mémoire (aucun point travaillable) : jamais annoncé réveillé.
6. Export RGPD : `asleep` exporté.
