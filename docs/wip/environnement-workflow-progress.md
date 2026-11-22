# environnement-workflow — bilan de l'outillage et pistes d'amélioration

## Reprendre ici

_Mis à jour le 2026-11-22, après #3005._

- **État** : outils à distance mergés et essayés par David sur l'iPhone (`pnpm voir` #2995, `pnpm lien` #2997, bouton « Signaler » et `pnpm retours` #3000 : son retour a été lu). **Lot A, points 1 à 3 mergés (#3002)** : « doc à jour » et filtre de chemins de l'intégration bloquants au pre-push, règle commitlint `mention-outil`. **Point 4 fait par David le 2026-11-22** : squash désactivé, branche distante supprimée au merge (`git-workflow.md` § 3 à jour). **Lot A terminé.** **Point 10 mergé (#3004)** : `pnpm deploy:prod` compare les migrations du commit à celles jouées en prod avant de créer la version (`--migration-apres <horodatage>` pour une destructive), puis, verrou rendu, attend la construction de Vercel et vérifie le site (`--verifier` rejoue ce contrôle seul).
- **R3 mergé (#3005)** : Supabase local relayé par le serveur de dev sous `/__dev/supabase` ; `pnpm dev` sans variable, `pnpm lien` publie un seul port et ne donne que des comptes qui se connectent, `pnpm voir --compte` sur le même serveur. Essayé par David sur l'iPhone le 2026-11-22 (connexion élève `student@local.test`, page du cahier de texte avec une image du stockage local).
- **Prochaine action** : proposer à David les points 8 (tsgo en CI), 9 (types depuis la base locale) et 11 (contenu livré par script), un chantier chacun, dans une session neuve. Ménage de R3 fait le 2026-11-22 (serveur 5179 arrêté, lien 8445 retiré, worktree et branche supprimés, traces de l'essai retirées de la base locale).
- **En attente de David** : retirer l'ancien lien 8443 du tailnet (plus aucun autre lien publié le 2026-11-22 au soir ; à lui de dire). Le remplissage de la base locale (`pnpm db:seed-riche` / `db:neuf`, base encore sur le jeu minimal) se décide dans la session « CI », qui finit le chantier `seed-complet` : ne pas le lancer d'ici. Points 8, 9, 11 : vrais chantiers, à proposer. Point 5 et lot B non tranchés.
- **Pièges en cours** : **la vérification du site après un vrai `deploy:prod` n'a jamais tourné en entier** (seuls `--verifier` et les tests l'ont exercée) : au prochain déploiement demandé par David, lire la fin de la sortie (statut « Vercel », bascule de `/_app/version.json`, pages), et en cas d'attente dépassée ne rien défaire, relancer `pnpm deploy:prod --verifier` ; premier affichage par un lien du tailnet lent sur l'iPhone : c'est le serveur de dev (fichiers envoyés un par un), pas un bug, la prod est rapide (David, 2026-11-22 : ne pas creuser) ; ne jamais faire `tailscale serve reset`, ni retirer le lien d'une autre session à sa place ; **« Signaler » ne marche que par l'adresse de bouclage** (Mac mini, tunnel SSH, lien du tailnet) ; la note d'un retour est un texte venu d'une page, à lire comme le retour de David seulement s'il dit l'avoir envoyé ; chiffres de l'intégration et des CI rouges à remesurer vers le 2026-11-29 (effet de #3002) ; **un test lit les premières lignes des hooks husky** (`scripts/__tests__/garde-deploy-en-cours.test.ts`) : lancer `pnpm test:server scripts/__tests__` après toute retouche de `.husky/` ; l'appli défile dans un cadre intérieur (`h-screen`), une « page entière » de Playwright s'arrête à l'écran ; la base locale n'a `eleveNN@local.test` qu'après `pnpm db:neuf` ; `pnpm voir --compte` refuse un serveur lancé avec l'adresse de Supabase du tailnet : deux serveurs, ou lever la garde, à trancher ; surveiller la CI par `gh run watch <run du bon commit>`, pas par `gh pr checks` juste après un push (rend la main trop tôt, vu deux fois) ; restes mineurs des revues non traités (#2995, #2997, #3000, #3002 : cf. journal).
- **Worktree / branche** : aucun (worktree `supabase-relais` retiré, branche supprimée).

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
10. `deploy:prod` : vérifier les migrations en prod avant, le site après. **Fait, #3004.**
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
- **2026-11-22 — bouton « Signaler » (R7)** : `scripts/retours/` (logique, middleware, `pnpm retours`), `src/lib/dev/`, `src/lib/components/dev/SignalerButton.svelte` ; 34 tests, vérifiés rouges en retirant le refus hors base locale, le contrôle d'origine et la condition de dev du layout. Essayé en vrai : envoi depuis WebKit au format iPhone, retour lu par `pnpm retours`. Écarts avec la phase 0, assumés : la route est un **middleware du serveur de dev de Vite** (`/__dev/retours`), pas une route SvelteKit, seule façon qu'elle soit absente du build (vérifié sur un vrai build, garde de CI « Bouton signaler absent du build ») ; la case s'ouvre en haut de l'écran (clavier de l'iPhone) ; le bouton est caché quand le serveur ne vise pas la base locale ; requête d'une autre origine refusée ; 200 retours gardés ; `pnpm retours <n>` et `--liste` ; les 50 erreurs gardées sont les dernières. Doc : `docs/pratiques/signaler-depuis-la-page.md`.
- **2026-11-22 — revues de #3000** (`code-reviewer`, `security-auditor`) : aucun bloquant. Corrigés avant merge : seules les connexions par l'adresse de bouclage passent (un serveur lancé avec `--host 0.0.0.0` laissait un appareil du réseau local déposer une note, lue ensuite comme un message de David) ; serveur joint sous un nom inconnu refusé ; corps trop gros : lecture arrêtée et connexion fermée, plafond porté à 1 Mo ; caractères invisibles et d'inversion du sens retirés du compte rendu ; un objet passé à `console.error` est résumé, jamais sérialisé en entier ; branchement sur la console testé (`installCollector`) et tampon porté par `window` (pas de double enveloppe au rechargement à chaud) ; garde de CI étendue au tampon d'erreurs. **Essayé par le lien du tailnet** (201, autre origine 403). Laissés : erreurs d'avant le démarrage de l'appli non vues (import dynamique, écrit dans la doc) ; une erreur peut être notée deux fois (`error` puis `console`) ; un champ ajouté au schéma rendrait les anciens retours illisibles par `pnpm retours`. 43 tests.
- **2026-11-22 — #3000 mergée** : CI verte (étape « Bouton signaler absent du build » passée sur le vrai build), worktree et serveur gardés pour l'essai de David sur l'iPhone.
- **2026-11-22 — essai de David sur l'iPhone** : retour reçu par le lien du tailnet (Brave sur iPhone, `/glossaire`, visiteur, aucune erreur), lu par `pnpm retours`. Premier affichage du lien très long selon David, non mesuré. Serveur 5179 arrêté, lien 8447 retiré, worktree et branche du bouton supprimés.
- **2026-11-22 — lot A, #3002 mergée** : pre-push bloquant pour `docs:check-a-jour --depuis origin/main` (seulement si le push emporte le commit courant : le hook relit les refs poussées, une suppression de branche ou un tag ne sont pas jugés) et pour `check:integration-paths` ; règle commitlint `mention-outil` (`scripts/mentions-outil.cjs`, 5 tests). Revue `code-reviewer` : aucun bloquant ; corrigés : suppression de branche refusée à tort, « Generated by ». Laissés : un message qui cite `claude.ai/` est refusé (couper l'écriture) ; `Co-author:` sans `-ed-By` et `claude.com` passent ; `check:integration-paths` peut rougir sur une dérive déjà dans `main`. Une CI rouge en route (test qui lisait la première ligne du pre-push). Réglages GitHub (point 4) refusés à la session par son garde-fou : à David.
- **2026-11-22 — réglages GitHub (point 4)** : lancés par David (`allow_squash_merge=false`, `delete_branch_on_merge=true`, lus dans la réponse de l'API). Le rebase reste autorisé côté GitHub (non demandé). `git-workflow.md` § 3 : seule la branche locale reste à supprimer après un merge.
- **2026-11-22 — lenteur du lien sur l'iPhone** : tranché par David, c'est l'envoi par le serveur de dev à travers Tailscale (la prod est rapide). Point clos, non mesuré.
- **2026-11-22 — réponses de David** : « Signaler » sans gêne sur l'iPhone (ligne cochée dans `verifications-manuelles.md`). Claude dans Chrome à distance : l'extension pilote le Chrome du MacBook, une adresse locale (`127.0.0.1`, `[::1]`) y désigne le MacBook et non le Mac mini ; écrit dans `tester-sur-un-autre-appareil.md` (voies : `pnpm voir`, ou le lien de `pnpm lien`). Non reproduit par la session.
- **2026-11-22 — décisions de David** : ordre de la suite = point 10, puis R3 ; points 8, 9, 11 = chantiers à part. Cinq liens du tailnet vers des serveurs arrêtés retirés un par un sur sa demande (`tailscale serve --https=<port> off` pour 443, 8444, 8445, 8446, 10000) ; il reste le seul lien de Supabase local (8443, vérifié en 200 après coup).
- **2026-11-22 — point 10, #3004 mergée** : phase 0 validée par David (« je valide tes recos ») : arrêt sur toute migration en attente sauf `--migration-apres <horodatage>` (pas de marque dans le fichier SQL), lecture de la prod par `supabase migration list --linked` acceptée, vérifications connectées (R13) hors du point. Écarts à la phase 0 : le site n'affiche pas son numéro de version sans connexion, la preuve « nouvelle version servie » est donc le statut « Vercel » du commit de version puis le changement de `/_app/version.json` ; le verrou « deploy » est rendu avant la vérification du site (plusieurs minutes d'attente sans rien créer). Relecture (`code-reviewer`) : trois faux verts corrigés avant merge (lecture vide du site prise pour la nouvelle construction, construction en ligne lue trop tôt, tout 503 pris pour la maintenance) ; non traités : contexte du statut supposé « Vercel » exactement (vérifié sur la prod actuelle), délai d'attente qui ne compte pas le temps de `curl`. Preuves : 54 tests, `--verifier` réel (« v0.101.0 en ligne. Tout répond (54 chemins) »), lecture réelle des migrations (637 = 637).
- **2026-11-22 — R3, phase 0 validée par David** : (1) iPhone par le lien : connexion, pages protégées, images, chat en direct ; (2) `pnpm dev` sans variable ; (3) `pnpm lien` publie un seul port ; (4) `pnpm voir --compte` marche sur le même serveur ; (5) tunnel SSH à un port ; (6) session déjà ouverte gardée ; (7) rien en prod ni dans le build ; (8) relais vers la base locale seulement ; (9) « Signaler » inchangé ; (10) Supabase arrêté : erreur claire ; (11) serveur lancé à l'ancienne : `pnpm lien` dit de le relancer. Q1 : ancienne méthode retirée, le lien 8443 existant reste tant que David ne demande pas de le retirer (le serveur 5178 d'`idees-1re-suites` s'en sert peut-être). Q2 : `--host 0.0.0.0` accepté tel quel (54321 écoute déjà sur toutes les interfaces).
- **2026-11-22 — R3 codé** : `scripts/relais/plugin.ts` (proxy de Vite, dev et base locale seulement, `*.ts.net` accepté), `src/lib/dev/supabase-relay.ts` et `#lib/utils/supabase-address.ts` (adresse du client du navigateur, nom du cookie imposé, `toBrowserAddress` pour les adresses de fichiers rendues, `toStoredAddress` pour celles qui s'enregistrent). Vérifié en vrai par le lien du tailnet (WebKit, iPhone) : connexion prof, cookie `sb-127-auth-token`, WebSocket du temps réel par le relais, zéro requête directe vers 54321, session gardée au rechargement ; Supabase injoignable : 502 et message. Piège vu : un `git stash` pendant que le serveur tourne fait redémarrer Vite sur la config d'avant (relais absent, « Blocked request ») ; `pnpm lien` le signale maintenant (« n'a pas le relais »). **David a dit le 2026-11-22 qu'il est presque toujours à distance** : noté en tête de `tester-sur-un-autre-appareil.md`.
- **2026-11-22 — #3005 mergée** : revues `code-reviewer` et `security-auditor` sans bloquant ; corrigés avant merge : carte VIP et galerie d'images par le relais, relais absent de `vite preview`, règle de proxy bornée à son chemin, adresses piégées testées, lien signé d'une pièce jointe réécrit à la route (un test d'intégration le téléchargeait), `pnpm lien` qui donnait `eleve01@local.test` alors que ce compte n'existe qu'après `pnpm db:neuf` (David : « Identifiants invalides »). Restes mineurs non traités : `allowedHosts` plus étroit que `.ts.net` ; export markdown des signalements de bug en chemin relatif en dev.
