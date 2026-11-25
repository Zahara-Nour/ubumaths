# Alertes du Mac mini : que faire

Guide pratique des notifications « Mac mini » reçues sur l'iPhone (ntfy). Le fonctionnement
détaillé de la surveillance est dans [environnement-de-dev.md](environnement-de-dev.md) (§ « Surveillance du Mac mini »).

**À distance**, chaque geste ci-dessous se demande en une phrase à n'importe quelle session Claude
ouverte sur le Mac (« fais le ménage », « relance Brave », « fais le bilan de la machine »).

## Premier réflexe

```bash
pnpm machine:bilan        # l'état du Mac en une page : mémoire, swap, programmes, processus emballés,
                          # sessions Claude, serveurs de dev, disque, sauvegarde, tendance 24 h
```

Il ne touche à rien. Il dit presque toujours qui est le coupable.

## Alerte par alerte

| Notification                                                               | Ce que ça veut dire                                                                        | Quoi faire                                                                                                                                                |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RAS : surveillance active · …** (chaque matin)                           | Tout va bien, la surveillance tourne.                                                      | Rien. Pas de RAS un matin = surveillance arrêtée → `pnpm surveillance:installer`.                                                                         |
| **… · N worktrees en danger** (dans le RAS)                                | Des worktrees gardent du travail jamais commité ou jamais poussé, intouché depuis 7 jours. | `pnpm surveillance:worktrees` pour les noms, puis reprendre ou clore ces chantiers.                                                                       |
| **Serveur de dev :PORT arrêté (dépôt principal…)**                         | Un `pnpm dev` tournait dans le dépôt principal (interdit) : déjà arrêté.                   | Rien. Le relancer dans un worktree s'il servait.                                                                                                          |
| **Serveur de dev :PORT : N Mo, N h.**                                      | Serveur de dev trop gros (> 1,5 Go) ou trop vieux (> 6 h).                                 | S'il ne sert plus : `pnpm menage`. Sinon, ignorer.                                                                                                        |
| **Orphelins de test fermés : …**                                           | Tests ou navigateurs Playwright abandonnés : déjà fermés.                                  | Rien.                                                                                                                                                     |
| **Chrome : N % CPU, N onglets…**                                           | Chrome trop gourmand.                                                                      | Fermer des onglets, ou `pnpm menage` (ferme les onglets au-delà de 20 % de CPU).                                                                          |
| **X emballé : 99 % CPU, N h de CPU cumulées.**                             | Un processus tourne au plafond depuis longtemps (extension, processus graphique, autre).   | Le bilan donne son pid. Navigateur : le relancer (ou `kill <pid>`, il relance son processus). Autre programme : regarder ce que c'est avant de l'arrêter. |
| **X ne répond plus (N processus morts non ramassés) : le relancer.**       | Le programme est bloqué ; « Quitter » ne marchera sans doute pas.                          | Le relancer, de force s'il le faut (Moniteur d'activité → Forcer à quitter). Les onglets se restaurent à la réouverture.                                  |
| **Sessions Claude : N ouvertes depuis plus de 7 jours…** (1 fois par jour) | De vieilles sessions gardent leur contexte en mémoire et remplissent le swap.              | Fermer les sessions des chantiers finis ou en pause (`/relancer` avant, si le journal doit suivre).                                                       |
| **Swap : N % … En tête : …**                                               | La mémoire déborde sur le disque ; la machine ralentit.                                    | Agir sur le premier programme cité : sessions Claude, onglets, serveurs de dev. À 95 %, le ménage part seul.                                              |
| **Ménage : …**                                                             | Swap au-delà de 95 % : le ménage automatique a tourné.                                     | Lire ce qu'il a fermé ; agir sur la cause (bilan).                                                                                                        |
| **Charge N (12 cœurs). En tête : …**                                       | Processeur saturé deux passages de suite.                                                  | Regarder le premier programme cité ; `pnpm menage` si ce sont des onglets ou des serveurs.                                                                |
| **Mémoire tendue / critique. En tête : …**                                 | macOS manque de mémoire.                                                                   | Comme le swap. Critique = agir tout de suite.                                                                                                             |
| **Disque : N Go libres sur 228 Go.**                                       | Moins de 15 Go libres.                                                                     | `pnpm disque:liberer --essai` pour voir, puis `pnpm disque:liberer` ; suivre sa liste « À faire à la main » (section « Libérer de la place » plus bas).   |
| **Disque : N Go perdus en 24 h…** (1 fois par jour)                        | Le disque fond vite.                                                                       | Chercher ce qui a grossi : nouveaux worktrees, images Docker, caches. Demander « cherche ce qui a grossi ».                                               |
| **Le Mac a redémarré le … (plantage du système)**                          | Redémarrage ; « plantage » si macOS a laissé un rapport de panique.                        | Après un plantage : `pnpm surveillance:historique` pour voir ce qui montait avant.                                                                        |

## Les autres notifications (pas le Mac mini)

- **« Claude a besoin de toi »** : une session s'est arrêtée et attend un geste (lien à essayer,
  question, page à relire). Le message donne le nom de la session : l'ouvrir. →
  [prevenir-david.md](prevenir-david.md)
- **« Claude attend ton accord »** : une session attend la réponse à une demande d'autorisation.

## Les commandes

| Commande                       | Ce qu'elle fait                                                                                                                                                          | Touche à quelque chose ? |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| `pnpm machine:bilan`           | L'état du Mac en une page.                                                                                                                                               | Non                      |
| `pnpm surveillance:essai`      | Ce que la surveillance enverrait ou fermerait maintenant.                                                                                                                | Non                      |
| `pnpm surveillance:historique` | Les 2 dernières heures (charge, swap, navigateurs, disque…), après un gel.                                                                                               | Non                      |
| `pnpm surveillance:worktrees`  | Les worktrees en danger, par nom.                                                                                                                                        | Non                      |
| `pnpm disque:liberer --essai`  | Ce que le nettoyage du disque supprimerait, et la liste à faire à la main.                                                                                               | Non                      |
| `pnpm disque:liberer`          | Supprime ce qui est sûr (Docker, Homebrew, VS Code, versions de Claude inutilisées, magasin pnpm) et liste le reste.                                                     | **Oui**                  |
| `pnpm menage --essai`          | Ce que le ménage fermerait.                                                                                                                                              | Non                      |
| `pnpm menage`                  | Ferme les onglets Chrome et Brave au-delà de 20 % de CPU, arrête les serveurs de dev de plus de 6 h ou du dépôt principal (jamais le 5173), ferme les orphelins de test. | **Oui**                  |
| `pnpm surveillance:installer`  | (Ré)installe la surveillance dans launchd (`--desinstaller` pour la retirer).                                                                                            | Oui                      |
| `pnpm durees`                  | Durées de la CI, des PR, de la mise en prod et du Mac face à la référence.                                                                                               | Non                      |

`pnpm menage` épargne toujours les extensions, le navigateur de Playwright, le serveur 5173 et les
projets autres que Chiphre. Il ne ferme ni les sessions Claude ni les navigateurs bloqués : ceux-là
se ferment à la main.

## Libérer de la place sur le disque, à la main

`pnpm disque:liberer` affiche la commande de chaque étape : on peut toutes les relancer seules.

| Geste                                          | Commande                                                                                                     | Risque                                                                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Images Docker qu'aucun conteneur n'utilise     | `docker image prune -a -f`                                                                                   | Seulement pile Supabase démarrée (`pnpm db:start`) : arrêtée, ses images seraient effacées et re-téléchargées |
| Cache et anciennes versions de Homebrew        | `brew cleanup --prune=all`                                                                                   | Aucun en pratique                                                                                             |
| Paquets pnpm qu'aucun projet n'utilise         | `pnpm store prune`                                                                                           | Aucun ; un `pnpm install` les retélécharge si besoin                                                          |
| Restes de mises à jour de VS Code              | `rm -rf ~/Library/Caches/com.microsoft.VSCode.ShipIt/*`                                                      | Aucun                                                                                                         |
| Anciennes versions de Claude Code              | `ls ~/.local/share/claude/versions`, puis `rm` de celles qu'aucune session n'utilise (`lsof <fichier>` vide) | Aucun ; une version en usage ne libère rien avant la fin de sa session                                        |
| Worktree fini                                  | `git -C ~/Coding/js/ubumaths worktree remove <dossier> && git -C ~/Coding/js/ubumaths branch -d <branche>`   | `branch -d` refuse une branche non mergée ; vérifier qu'aucune session n'y travaille                          |
| Savoir ce qui pèse                             | `pnpm machine:bilan` · Réglages → Général → Stockage                                                         | —                                                                                                             |
| Cache de Brave                                 | Brave → Réglages → Confidentialité → Effacer les données de navigation → Images et fichiers en cache         | Pages plus lentes la première fois                                                                            |
| Mise à jour de macOS préparée (Preboot ~20 Go) | Réglages → Général → Mise à jour de logiciels                                                                | **Redémarre le Mac**                                                                                          |

## Seuils

Ils sont en tête de `scripts/surveillance-machine.sh` et de `scripts/machine-commun.sh`. Une alerte
qui sonne à tort : le dire à une session, on ajuste le seuil.
