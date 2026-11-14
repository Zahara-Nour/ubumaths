# Console de l'Atelier sans bouton « Calculer »

## Reprendre ici

_Mis à jour le 2026-11-14, après #2640._

- **État** : #2635 et #2640 mergées (fond bleu des `\text` retiré ; bouton « Calculer » retiré, Entrée ou ↵ valide). Rien en prod tant que David n'a pas lancé `deploy:prod`.
- **Prochaine action** : quand David a fini d'essayer : arrêter le serveur 5178, `tailscale serve reset`, `git worktree remove ../ubumaths-wt-bouton-calculer`, `git branch -d feat/atelier-sans-bouton-calculer`, puis verser ce journal dans `docs/archive/wip/`.
- **En attente de David** : essai sur https://serveur.tail99357e.ts.net/atelier. Deux idées proposées, NON demandées : ligne « Modèle : … » dans le champ mathématique ; commandes proposées sans point dans le champ texte (`der` → `.dériver`, Entrée calcule toujours).
- **Pièges en cours** : lien de test en `http://100.79.226.105:<port>` = page non sécurisée, `crypto.randomUUID` absent → l'Atelier plante dans un `$effect` (rien ne se trace, l'expression d'une fonction disparaît de sa carte). Pas un bug de prod (HTTPS). Toujours tester l'Atelier en HTTPS (Tailscale Serve) ou par tunnel SSH.
- **Worktree / branche** : `../ubumaths-wt-bouton-calculer`, `feat/atelier-sans-bouton-calculer` ; serveur 5178 publié par `tailscale serve` (443).

## Historique

- 2026-11-14 : fond bleu des `\text` (consigne puis texte tapé) retiré dans `NaturalField.svelte` (#2635). Bouton « Calculer » retiré, décision de David : redondant avec Entrée et les touches ↵ des claviers (#2640).
