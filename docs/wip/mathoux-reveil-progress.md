# Mathoux — annonce du réveil — journal

> Branche `feat/mathoux-reveil`, worktree `../ubumaths-wt-mathoux-reveil`. Démarré le 2026-10-21.
> Suite de [mathoux-anim-progress.md](mathoux-anim-progress.md) (PR 1 #1582 : animations + colonne
> `student_mathoux.asleep`, migrée en prod).

## Reprendre ici

_Mis à jour le 2026-10-22, après le deploy:prod v0.44.0._

- **État** : **chantier clos, en prod.** #1575, #1579, #1582 et #1587 livrées par la v0.44.0
  (2026-10-21, déploiement Vercel `success`) ; colonne `asleep` et policy prof vérifiées en base.
  Rythme des animations validé par David le 2026-10-22.
- **Prochaine action** : aucune ; archiver les journaux `mathoux-*` une fois les vérifications faites.
- **En attente de David** : vérifications manuelles #1575, #1579, #1582, #1587 (sur chiph.re) ;
  relecture des 59 noms (`mathoux-noms.md`).
- **Pièges en cours** : limites acceptées documentées dans `docs/systeme/mathoux.md` § Mémoire.
- **Worktree / branche** : supprimés.

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
