# environnement-workflow — bilan de l'outillage et pistes d'amélioration

## Reprendre ici

_Mis à jour le 2026-11-22, après #2997._

- **État** : phase 0 des outils à distance validée par David (« oui à tout », 2026-11-22). **`pnpm voir` (R4) mergé (#2995)**, **`pnpm lien` (R1) mergé (#2997)**, doc `docs/pratiques/tester-sur-un-autre-appareil.md`. **Lot A validé aussi** (points 1 à 4, une petite PR, plus les deux réglages GitHub), pas commencé.
- **Prochaine action** : le bouton « signaler » (R7), tests d'abord, nouveau worktree `outils-a-distance-signaler` (`feat/outils-a-distance-signaler`). Lot A : worktree à part `ci-rouges-evitables`, une session à part.
- **En attente de David** : ce qui échoue exactement avec Claude dans Chrome à distance (non diagnostiqué, non bloquant) ; les points 8 à 11 et R3 restent à trancher, rien n'est lancé dessus ; essayer `pnpm lien` depuis l'iPhone (pas fait : vérifié seulement depuis le Mac mini) ; quatre liens d'autres sessions mènent à un serveur arrêté (8444, 8445, 8446, 10000, `pnpm lien --liste`) : les retirer ou non, à lui de dire.
- **Pièges en cours** : ne jamais faire `tailscale serve reset`, ni retirer le lien d'une autre session à sa place ; réglages GitHub du lot A = écriture hors du dépôt, les annoncer avant de les faire ; R7 touche une route d'API (Zod, revue `code-reviewer` + `security-auditor`) ; chiffres de l'intégration à remesurer vers le 2026-11-29 ; l'appli défile dans un cadre intérieur (`h-screen`), une « page entière » de Playwright s'arrête à l'écran ; la base locale n'a `eleveNN@local.test` qu'après `pnpm db:neuf` ; **`pnpm voir --compte` refuse un serveur lancé avec l'adresse de Supabase du tailnet**, celui que demande `pnpm lien` : pour les deux à la fois, deux serveurs (ou lever la garde de `voir` pour cette adresse, à trancher) ; l'avertissement « serveur périmé » de `pnpm lien` n'est vérifié que par ses tests ; `gh pr checks --watch` lancé juste après un push rend la main avant que les jobs soient inscrits : boucler sur l'absence de `pending` ; restes mineurs des revues non traités (#2995 : hauteur non remesurée après agrandissement, Ctrl-C laisse le navigateur, pas de refus d'office dans le dépôt principal ; #2997 : registre des liens écrit sans verrou).
- **Worktree / branche** : aucun (celui de #2997 retiré après le merge).

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

## Phase 0 — outils à distance (2026-11-22, validée : « oui à tout »)

Briques déjà là : Playwright avec Chromium et WebKit installés ; `pnpm test:verifs` et ses aides (`e2e/verifs/helpers/`) ; Tailscale Serve activé, publié en « tailnet only » ; courriels capturés dans `.captures/` ; comptes fictifs de la base locale.

### R4 — `pnpm voir` : Claude regarde une page sans écran

- **Nominal** : `pnpm voir /demo/atelier` ouvre la page du serveur du worktree dans un navigateur sans écran, attend qu'elle soit chargée, et écrit dans `.captures/voir/` une image de la page entière, la liste des erreurs de console et celle des requêtes en échec. Par défaut : format iPhone, moteur de Safari (WebKit). `--ordi` pour un grand écran, `--chrome` pour Chromium, `--compte prof` (ou `eleve`, `admin`) pour arriver connecté avec un compte fictif.
- **Exemple** : « regarde la page du carnet côté prof sur téléphone » → `pnpm voir /carnet --compte prof` → Claude lit l'image et les erreurs, et envoie l'image à David.
- **Limite** : aucun serveur sur le port du worktree → il le dit et s'arrête (il n'en lance pas) ; page qui redirige vers la connexion → il le dit ; page très longue → image coupée à une hauteur fixe, signalée.
- **Erreur** : adresse d'un autre site que le serveur local → refus ; `--compte` quand le serveur pointe sur une base qui n'est pas locale → refus (jamais de connexion automatique sur la prod).

### R1 — `pnpm lien` : un lien de test en une commande

- **Nominal** : dans un worktree dont le serveur tourne, `pnpm lien` trouve le port de CE worktree, le publie en HTTPS sur le tailnet sur un port libre, vérifie « tailnet only », et rend le lien, un QR code dans le terminal et le rappel des comptes fictifs. `pnpm lien --stop` retire ce lien-là seulement ; `pnpm lien --liste` montre tous les liens et le chantier de chacun.
- **Exemple** : « donne-moi un lien pour tester sur mon téléphone » → `pnpm lien` → `https://serveur…:8445/` + QR code.
- **Limite** : lien déjà publié pour ce worktree → il le redonne ; serveur lancé avant le dernier pull ou merge de la branche → avertissement « serveur périmé, le relancer » ; Supabase local pas encore publié → il le publie (port 8443, partagé, jamais retiré par `--stop`).
- **Erreur** : aucun serveur pour ce worktree → il donne la commande à lancer ; dépôt principal → refus ; serveur qui pointe sur la prod (`.env.local` absent) → refus ; jamais `funnel`, jamais `serve reset`.
- **Hors périmètre** : la connexion depuis l'iPhone demande que le serveur ait été lancé avec l'adresse de Supabase du tailnet (cf. `tester-sur-un-autre-appareil.md`) ; `pnpm lien` le vérifie et le dit, il ne relance pas le serveur. R3 supprimerait cette contrainte.

### R7 — bouton « signaler » en dev

- **Nominal** : sur le serveur de dev seulement, un petit bouton flottant dans un coin. Un appui ouvre une case de texte ; « Envoyer » écrit sur le Mac mini, dans `.captures/retours/`, un fichier avec la note, l'adresse de la page, la taille de l'écran, le navigateur, le compte fictif connecté et les erreurs de console vues depuis le chargement. Claude lit le dernier retour par `pnpm retours`.
- **Exemple** : sur l'iPhone, David appuie, écrit « le bouton Valider est caché par le clavier », envoie ; il dit à Claude « regarde mon retour ».
- **Limite** : note vide acceptée (les erreurs seules sont utiles) ; note plafonnée à 2 000 caractères, 50 erreurs gardées au plus ; pas d'image de l'écran dans cette première version (Safari ne sait pas se photographier) : Claude refait la page avec `pnpm voir` à la même adresse et au même format.
- **Erreur** : en prod, le bouton et sa route n'existent pas (absents du build, test à l'appui) ; base non locale → route refusée ; entrée validée par Zod.

### Questions

- **Q1 — R4, moteur par défaut** : Safari au format iPhone (reco : oui, c'est l'appareil des élèves et la source de nos bugs propres) ou Chrome ?
- **Q2 — R7, où est le bouton** : sur toutes les pages en dev (reco), ou seulement quand la page est ouverte par un lien du tailnet (invisible sur le Mac mini) ?
- **Q3 — R7, image de l'écran** : s'en passer en première version (reco), ou essayer tout de suite une capture faite par la page (lourde, infidèle sur les formules) ?
- **Q4 — ordre** : R4, puis R1, puis R7 (reco : R4 sert à vérifier les deux autres) ?

## Journal

- **2026-11-22 — `pnpm voir` (R4)** : `scripts/voir/` (logique testée, 17 tests ; pilotage vérifié en vrai sur `/atelier`, `/shtam`, `/glossaire`, `/dashboard` avec les trois comptes, WebKit et Chromium, téléphone et grand écran). Écarts avec la phase 0, assumés : image en tranches de 1 600 px en plus de l'image entière (une image haute est illisible une fois réduite) ; fenêtre agrandie pour capturer le cadre qui défile ; `--port` ajouté ; élève = `eleve01`, à défaut `student@local.test`. WebKit de Playwright réinstallé (2388, la version installée ne suivait plus Playwright 1.65). Doc : `docs/pratiques/voir-une-page.md`.
- **2026-11-22 — #2995 mergée** : revue `code-reviewer`, un finding important corrigé avant merge (la garde de `--compte` ne lisait que la première ligne `PUBLIC_SUPABASE_URL` de `.env.local` ; elle exige maintenant toutes les adresses locales, fichiers `.env` de dev et environnement du process serveur) ; navigation hors du serveur local coupée. 20 tests.
- **2026-11-22 — `pnpm lien` (R1)** : `scripts/lien/` (logique testée, 37 tests ; commandes vérifiées en vrai : publication sur 8447, lien et Supabase en 200 depuis le tailnet, lien redonné au deuxième appel, avertissement « Blocked request » sur un serveur lancé sans les variables du tailnet, `--stop` serveur arrêté, les 6 liens des autres sessions intacts). Écarts avec la phase 0, assumés : `--port` ajouté (comme `voir`) ; registre dans `.git/liens-tailnet.json` du dépôt principal ; le chantier d'un lien fait à la main se lit sur le serveur qui écoute derrière ; un serveur lancé sans les variables du tailnet est publié quand même, avec l'avertissement et la commande pour le relancer. `scripts/voir/serveurs.ts` extrait de `voir/index.ts` (partagé) ; `isLocalEnv` accepte en plus l'adresse de Supabase du tailnet, pour `lien` seulement.
- **2026-11-22 — revue de #2997** (`code-reviewer`) : aucun bloquant. Corrigés avant merge : un état de Serve d'une forme inconnue arrête la commande au lieu d'être lu comme « aucun lien » (elle aurait publié par-dessus les liens des autres) ; l'état est relu juste avant chaque publication (port pris entre-temps par une autre session → erreur) ; les ports TCP bruts et les chemins autres que `/` comptent comme occupés ; un `reset` compte pour le serveur périmé ; adresse de Supabase juste même sur 443. Laissés : registre écrit sans verrou (une entrée perdue ne se voit que serveur arrêté) ; `--stop` retire aussi un lien fait à la main qui mène au serveur du worktree (voulu, écrit dans la doc) ; `index.ts` sans test (vérifié en vrai).
- **2026-11-22 — #2997 mergée** : CI verte, worktree et branche retirés.
