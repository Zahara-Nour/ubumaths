# Mathoux — annonce du réveil — journal

> Branche `feat/mathoux-reveil`, worktree `../ubumaths-wt-mathoux-reveil`. Démarré le 2026-10-21.
> Suite de [mathoux-anim-progress.md](mathoux-anim-progress.md) (PR 1 #1582 : animations + colonne
> `student_mathoux.asleep`, migrée en prod).

## Reprendre ici

_Mis à jour le 2026-10-21, après #1587._

- **État** : **chantier clos.** #1587 mergée (après #1582). Rien en prod tant que David n'a pas
  lancé `pnpm deploy:prod` ; la colonne `asleep` y est déjà.
- **Prochaine action** : aucune. Vérifications manuelles #1582 et #1587 notées.
- **En attente de David** : `deploy:prod` (à sa demande), puis les vérifications manuelles.
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
