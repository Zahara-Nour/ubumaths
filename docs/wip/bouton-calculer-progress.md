# Console de l'Atelier sans bouton « Calculer »

## Reprendre ici

_Mis à jour le 2026-11-14, PR #2640 ouverte (CI en cours)._

- **État** : #2635 mergée (plus de fond bleu sur les `\text` du champ mathématique). #2640 ouverte : bouton « Calculer » retiré, Entrée ou ↵ valide.
- **Prochaine action** : CI de #2640 verte → merger, nettoyer le worktree, `tailscale serve reset`.
- **En attente de David** : essai de #2640 sur https://serveur.tail99357e.ts.net/atelier.
- **Pièges en cours** : lien de test en `http://100.79.226.105:<port>` = page non sécurisée, `crypto.randomUUID` absent → l'Atelier plante dans un `$effect` (rien ne se trace, l'expression d'une fonction disparaît de sa carte). Pas un bug de prod (HTTPS). Toujours tester l'Atelier en HTTPS (Tailscale Serve) ou par tunnel SSH.
- **Worktree / branche** : `../ubumaths-wt-bouton-calculer`, `feat/atelier-sans-bouton-calculer` ; serveur 5178 publié par `tailscale serve` (443).

## Historique

- 2026-11-14 : fond bleu des `\text` (consigne puis texte tapé) retiré dans `NaturalField.svelte` (#2635). Bouton « Calculer » retiré, décision de David : redondant avec Entrée et les touches ↵ des claviers (#2640).
