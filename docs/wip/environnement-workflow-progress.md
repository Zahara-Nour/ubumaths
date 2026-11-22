# environnement-workflow — bilan de l'outillage et pistes d'amélioration

## Reprendre ici

_Mis à jour le 2026-11-22, avant toute PR._

- **État** : bilan mesuré le 2026-11-22 (ci-dessous), rien de modifié dans le code. Deux listes de pistes : workflow (A à D) et travail à distance (R1 à R14).
- **Prochaine action** : attendre le choix de David, puis phase 0 de ce qu'il retient. Proposé en premier : lot A (une petite PR) et, pour le travail à distance, R1 + R4 + R7.
- **En attente de David** : quels points lancer ; ce qui échoue exactement avec Claude dans Chrome quand il est à distance (non diagnostiqué) ; décisions d'architecture des points 8 à 11 et R3.
- **Pièges en cours** : les chiffres de l'intégration datent surtout d'avant la refonte du 2026-11-21, à remesurer vers le 2026-11-29 ; zsh ne découpe pas `$ids` (boucle `while read`).
- **Worktree / branche** : aucun (dépôt principal, doc seule).

## Mesures du 2026-11-22

300 dernières PR mergées (2026-11-15 → 22), 400 derniers runs de `quality.yml` (4 jours) et de `nightly-integration.yml` (10 jours).

- ~45 PR mergées par jour (pic 69), 76 % de `feat`. Ouverture → merge : médiane 17 min, p75 22, p90 35.
- CI principale sur PR (238 runs) : 69 % verts, 19 % annulés, 12 % rouges ; médiane 7 min, p90 9.
  - Rouges (29) : « Guard doc à jour » 18, tests client 7, tests serveur 5, ESLint 1, barils 1.
  - Durée moyenne par job : Type Check 395 s (svelte-check 371 s), tests client 343 et 369 s, tests serveur 210 à 308 s, Lint 171 s (couverture de doc 72 s, Prettier 30 s, ESLint 18 s), Build 106 s, garde SECURITY DEFINER 110 s, cliquet 114 s.
- Intégration sur PR (390 runs) : 74 % verts, 21 % annulés, 5 % rouges ; médiane 16 min (surtout avant le 2026-11-21) ; morceaux récents ~200 à 245 s.
  - Rouges (20) : contrôle du filtre de chemins 13, tests 6.
- Local : `check:integration-paths` 2,3 s ; `docs:check-a-jour --couverture` 36 s ; `--depuis` 0,5 s ; liens 0,5 s ; renvois 0,2 s ; `format:check` 0,1 s ; `check:migrations` 1,8 s ; barils 1,9 s. Le pre-push prend donc ~40 s, pas « quelques secondes ».
- Base : 631 migrations dans le dépôt, sur `main` et sur `production` ; dernière migration jouée en prod = dernière du dépôt (`20261121234509`) ; base locale : rien à jouer. 282 migrations de contenu ou de rangement ; 96 migrations ajoutées en 7 jours.
- GitHub : protection de `main` sans « branche à jour » ; checks exigés : Lint, Type Check, Build, tests serveur 1-4, CI Summary ; squash autorisé ; suppression de branche au merge désactivée ; compte de type utilisateur (pas de file de merge).
- `scripts/deploy-prod.sh` ne vérifie ni les migrations jouées en prod ni la réponse du site après la mise en ligne.
- Les 20 worktrees ont tous leur `.env.local`.

## Pistes — workflow

A. Rouges évitables (une petite PR) :

1. « Doc à jour » bloquant au pre-push (aujourd'hui avertissement).
2. `check:integration-paths` au pre-push.
3. Mentions Claude/Anthropic refusées par le hook `commit-msg`.
4. Réglages GitHub : squash désactivé, branche supprimée au merge.
5. Profiler la couverture de doc (36 s en local, 72 s en CI).

B. Moins de gestes :

6. `pnpm pret` : tout ce qui peut faire rougir la CI, en une commande.
7. Commande de merge : checks verts, `check:migrations --pr`, verrou de mise en prod, merge, `MERGED`, nettoyage.

C. Écarts local / CI / prod (à trancher par David) :

8. tsgo en CI, moteur classique la nuit et sur le commit de version.
9. Types de la base générés depuis la pile locale + garde CI + contrôle nocturne prod = dépôt.
10. `deploy:prod` : vérifier les migrations en prod avant, le site après.
11. Contenu livré par un script plutôt que par des migrations (ligne 41 de `outils-manquants.md`).

D. Risques : worktrees non sauvegardés et Time Machine absent ; pas de staging (`base-staging-progress.md`).

## Pistes — travail à distance (demande du 2026-11-22)

Constat : trois méthodes selon l'appareil (`docs/pratiques/tester-sur-un-autre-appareil.md`), montées à la main ; Claude dans Chrome ne marche pas quand David est à distance (cause non diagnostiquée).

- R1. `pnpm lien` : publie le serveur du worktree en HTTPS sur le tailnet (port libre, vérifie que c'est le bon serveur), rend le lien et un QR code ; `pnpm lien --stop`. Registre des liens par chantier.
- R2. Page « mes serveurs » à une adresse fixe du tailnet : un lien par chantier en cours.
- R3. Supabase local joint par la même adresse que l'appli (proxy du serveur de dev) : un seul port à publier, même lien sur tous les appareils. Touche la config de dev : à trancher.
- R4. Navigateur sans écran piloté par Claude (Playwright) à la place de Claude dans Chrome : `pnpm voir <page>` → capture (format iPhone, moteur WebKit), erreurs de console, requêtes en échec ; capture envoyée à David.
- R5. Vidéo ou trace d'un scénario rejoué, consultable depuis le téléphone.
- R6. Moteur WebKit et format iPhone dans `pnpm test:verifs`.
- R7. Bouton « signaler » en dev : capture, adresse, erreurs de console et note, écrits sur le Mac mini pour la session.
- R8. Erreurs du navigateur de l'iPhone renvoyées au journal du serveur de dev.
- R9. Connexion en un geste aux comptes fictifs (base locale seulement).
- R10. Page de dev des courriels capturés.
- R11. `pnpm lien --build` : version construite, plus rapide à charger à distance et plus proche de la prod.
- R12. Notifications (canal ntfy existant) : lien prêt, CI verte, question en attente.
- R13. Vérifications sur la prod après `deploy:prod` (`VERIFS_URL`), résultat notifié.
- R14. Une seule méthode (Tailscale Serve) pour MacBook et iPhone, le tunnel SSH en secours.
