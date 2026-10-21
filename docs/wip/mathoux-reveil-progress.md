# Mathoux — annonce du réveil — journal

> Branche `feat/mathoux-reveil`, worktree `../ubumaths-wt-mathoux-reveil`. Démarré le 2026-10-21.
> Suite de [mathoux-anim-progress.md](mathoux-anim-progress.md) (PR 1 #1582 : animations + colonne
> `student_mathoux.asleep`, migrée en prod).

## Reprendre ici

_Mis à jour le 2026-10-21, au démarrage._

- **État** : `db:types` fait (colonne `asleep`). Code à écrire.
- **Prochaine action** : tests rouges puis code (mémoire qui retient la sieste, nouveauté `wake`,
  export RGPD), revues, PR.
- **En attente de David** : rien (validé le 2026-10-21 : « je valide tout »).
- **Pièges en cours** : un Mathou « de la seule mémoire » s'affiche sans sieste : ne jamais
  l'annoncer réveillé.
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
