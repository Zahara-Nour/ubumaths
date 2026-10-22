# Garde `git -C ""` — journal

## Reprendre ici

_Mis à jour le 2026-10-22, avant la PR._

- **État** : PR en cours — le refus de `git -C ""` passe du texte brut de la commande aux options
  `-C` lues sur la commande exécutée (heredoc et messages qui le citent ne sont plus refusés).
- **Prochaine action** : merge, puis archiver ce journal.
- **En attente de David** : rien (retrait de l'ancienne vérification autorisé le 2026-10-22).
- **Pièges en cours** : le hook ACTIF est celui du dépôt principal ; jusqu'au merge, il refuse
  encore toute commande qui cite la chaîne.
- **Worktree / branche** : `../ubumaths-wt-garde-git-c-vide` · `fix/garde-git-c-vide`.
