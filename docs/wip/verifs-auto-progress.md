# Chantier `verifs-auto` — automatiser les vérifications manuelles

## Reprendre ici

_Mis à jour le 2026-11-26, après #3201 (`base-locale-paquet9`) et la PR du défaut 9 (`fix/verifs-serveur`)._

- **État** : tri des vérifications manuelles TERMINÉ : paquets 1 à 8 mergés (#3061, #3064, #3065, #3066, #3074, #3085, #3093, #3105), paquet 9 mergé (#3118) : **391 → 76 lignes**. Ce qui reste dans la liste ne se joue pas par un test (vrai doigt, vidéoprojecteur, prod, contenu, décisions de David). #3096 mergée, pas encore en prod. Stash « verifs-tri-7 » inutile, encore dans `git stash list`.
- **Prochaine action** : première nuit jouée le 2026-11-26 (2 h 00 → 4 h 25, 184 rouges sur 5 880, détail § « Première nuit »). #3187 mergée : décor des fiches (68 rouges), presse-papiers, graduations au téléphone (E63), bruit Firefox des navigations (≈ 40). **Ordre validé par David le 2026-11-26 (« je valide », recos)** : (1) FAIT : inscrit sous **E85** (E83 et E84 pris entre-temps par d'autres sessions) : liste des modèles `/api/questions/templates/all` resservie périmée par le cache du NAVIGATEUR jusqu'à 5 min (`stale-while-revalidate=300` vaut aussi pour lui) → un prof ne voit pas tout de suite un modèle qu'il vient de créer ; 10 rouges `operations` sous Firefox ; (2) FAIT (#3197, mergée) : `Cache-Control: public, max-age=0` pour le navigateur, `Vercel-CDN-Cache-Control: max-age=300, stale-while-revalidate=300` pour Vercel, `enforcePrivacy` du hook retire les consignes de CDN d'une réponse privée ; `operations` 12/12 sous Firefox. **E85 reste ouvert** (après le `deploy:prod` du 2026-11-26 au soir : `cache-control: public, max-age=0` au navigateur, `x-vercel-cache` MISS puis HIT au second appel ; le registre dit la question reposée à David par une autre session, ligne non barrée) : pas d'aperçu Vercel dans ce dépôt, `x-vercel-cache: HIT` au second `curl -sI https://www.chiph.re/api/questions/templates/all` à vérifier après le prochain `deploy:prod` de David, puis barrer E85 (si MISS à chaque appel : Vercel n'honore pas l'en-tête, la liste est relue en base à chaque visite, à corriger) ; (3) FAIT (#3201, mergée) : `base-locale-paquet9` compare la page à la base (tuteur sur « Tout », consentements recomptés avec la règle de la page, modération : seul le mute de l'élève 12 du seed, test sauté en le disant s'il a expiré), bruit Firefox « ws … interrupted while the page was loading » écarté ; fichier entier : 204 verts, 1 rouge = **E86** (case à cocher dans un bouton, carte de signalement de bug, page admin ; à trancher par David, rouge laissé tel quel) ; (4) FAIT (PR `fix/verifs-serveur`) : défaut 9, § « Défaut 9 » ; **prochaine action : (5) les ~25 rouges isolés un par un (liste § « Première nuit ») ; (6) défauts 1 à 8 ; puis R13, puis clôture. Les corrections d'écarts avancent dans le chantier `ecarts-verifs`. ⛔ ne jamais jouer la déconnexion du prof local (elle révoque toutes ses sessions).
- **Défauts de la tâche de nuit à corriger (David, 2026-11-25 : « on note les défauts à corriger »)**, détail dans § « Tâche de nuit unique » : (1) une panne qui dure ne renotifie pas (push refusé chaque nuit, port pris, worktree pas propre, serveur qui ne démarre plus) : **tranché par David le 2026-11-25 (« je suis tes recos ») : un rappel tous les 7 jours tant que la panne dure** ; (2) un lancement à la main sans `--essai` le même jour écrase le bilan de 2 h ; (3) le verrou des vérifs (`e2e/verifs/helpers/verrou.ts`) est relatif au worktree : deux worktrees qui jouent `test:verifs` sur la même base locale ne sont pas protégés l'un de l'autre, tâche de nuit comprise ; (4) chemin du dépôt non échappé dans le plist ; (5) `scripts/nuit/index.ts` sans test, et aucun typecheck ne lit `scripts/` ; (6) `docs/pratiques/tache-de-nuit.md` à relire contre le code (la phase 0 annonçait une attente de verrou partagé qui n'existe pas). Ajoutés après la première nuit (2026-11-26) : (7) la première nuit compte tous ses rouges comme « nouveaux » et la notification ne dit pas combien ; (8) la suite sur cinq navigateurs en une fois fait des rouges de charge (23 reverdis rejoués deux à la fois) : décider si la nuit rejoue un rouge avant de le compter ; (9) FAIT : `pnpm test:verifs` qui lance lui-même le serveur de dev ne rendait pas la main à la fin (2 h 30 bloqué le 2026-11-26).
- **Tâche de nuit (#3131), phase 0 validée par David le 2026-11-25 (« go », puis trois choix répondus un par un)** : un **script** lancé par launchd (pas une session Claude), à **2 h**, bilan **hors dépôt** (`~/.local/state/nuit/`, lu par `pnpm nuit`). Elle joue dans son worktree `../ubumaths-wt-nuit` (détaché sur `origin/main`, à ne pas retirer) : `pnpm ecarts rejouer --barrer` (lignes vertes barrées, commitées et poussées sur `main`), `pnpm test:verifs:tout`, trois gardes de doc. Notification seulement d'un rouge nouveau. Doc : `docs/pratiques/tache-de-nuit.md`. Session `ecarts-a-trier` d'accord (elle n'avait rien commencé).
- **R12 livré (#3123), phase 0 validée par David le 2026-11-25 (« je te suis »)** : `pnpm prevenir lien | question | geste "…"`, lancée par la session quand elle s'arrête pour un geste de lui ; ni le lien ni le texte de la question dans le message (ntfy.sh est un service extérieur) ; David a bien reçu les notifications d'essai. Doc : `docs/pratiques/prevenir-david.md`. Laissé : le transcript est lu en entier pour trouver le `/rename`.

- **Tranché par David le 2026-11-24 (« je suis tes recos », paquet 9)** : E76 à E81 tous à corriger (E78 : question d'accès avant toute migration ; E80 : essai sur un build d'abord). États au [registre](../ecarts/registre.md) et dans [ecarts-verifs-progress.md](../archive/wip/ecarts-verifs/ecarts-verifs-progress.md).
- **Tranché par David le 2026-11-25 (« je suis tes recos »)** : E82 à corriger avec E63 (même correctif, PR « téléphone » du chantier `ecarts-verifs`). Plus rien du tri n'attend David.
- **#2825, question (a) résolue par le code (David, 2026-11-24 : « il faut analyser le code »)** : le « créneau » est celui de l'emploi du temps d'une classe (page Classes du prof, `ScheduleEntryModal`, envoyé par `submitAction`), pas du cahier de texte. Non jouable en local : le prof local n'a pas d'école à emploi du temps (noté dans `outils-manquants.md`) ; test prêt mais sauté en le disant, `e2e/verifs/creneau-paquet9.spec.ts` ; ligne #2825 réécrite, la clause reste à David en prod.
- **Tranché par David le 2026-11-24 (« je suis tes recos », paquet 8)** : E73 à corriger ; E74 et E75 : laisser, formulation (retirer les `test.fail`). États au [registre](../ecarts/registre.md) et dans [ecarts-verifs-progress.md](../archive/wip/ecarts-verifs/ecarts-verifs-progress.md).
- **Tranché par David le 2026-11-24 (« je valide », recos du paquet 7)** : à corriger : E66 en premier avec E67 (consentement : Marché en 500, « Acheter » non grisé), E68 (onglet « Lot »), E69 (PDF, courbe et numéro séparés), E70 (courbes à 130 px au moins, dans la PR « téléphone » avec E63) ; pas de correctif : E65 et E71 (formulation des lignes, retirer les `test.fail` et asserter le comportement gardé), E72 (vrai iPhone, ligne #2634 gardée). (a) #2599 : carte de gain sans réplique en révision = voulu, ligne sortie ; (b) #2621 : « Partiel » = forme non optimale seulement, déjà tranché le 2026-11-14, rien à changer ; (c) #2627 périmée : d'accord. États au [registre](../ecarts/registre.md) et dans [ecarts-verifs-progress.md](../archive/wip/ecarts-verifs/ecarts-verifs-progress.md).
- **Tranché par David le 2026-11-24 (« je valide tout »)** : écarts E18-E49 selon les recos (état dans [ecarts-verifs-progress.md](../archive/wip/ecarts-verifs/ecarts-verifs-progress.md)) ; barre de #1469 : stabiliser (place réservée) ; #1738 : laisser, clause retirée de la ligne ; tâche de nuit : oui, après R12 ; `tsconfig` pour `e2e/` dans la CI : oui ; `locale: 'fr-FR'` pour `test:verifs` : oui ; `../ubumaths-wt-verifs-webkit` effacé. **Ordre** : finir le tri (paquet 6 et suivants), puis les corrections en PR par thème (accessibilité et contrastes E22 E32 E44 E45 E48 E49 ; téléphone E18 E23 E24 E41 ; corrections générées E25 E34 E35 ; le reste), puis R12, R13.
- **Tranché par David le 2026-11-24 (soir)** : recos des écarts E54 à E62 validées (états dans [ecarts-verifs-progress.md](../archive/wip/ecarts-verifs/ecarts-verifs-progress.md) : E56 en premier ; E58 à E60 : retirer la page des modèles de message, usage à lui faire confirmer). **Réétudiés à sa demande** : E33 = faux écart (artefact des captures WebKit, preuve par la vidéo) ; E42 = faux écart (le modèle publié porte le réglage dans `shared`) ; E21 confirmé en prod (contenu, à lui) ; #2346 : reco donnée (pas un doublon, garder les deux ; les nombres sous la droite se chevauchent à 390 px), réponse attendue.
- **Tranché par David le 2026-11-24 (après #3085, « je valide »)** : #2346 : garder la droite ET la courbe (pas un doublon), ligne sortie de la liste ; E63 : à corriger, une graduation étiquetée sur deux à 390 px, dans la PR « téléphone » ; E58 à E60 : retirer la page des modèles de message (il ne s'en sert pas), la table et ses règles d'accès restent, question à part ; E21 : rien dans le code, la ligne reste ouverte tant qu'aucune énigme n'est publiée.
- **En attente de David** : E21 (publier des énigmes, contenu). À regarder par la session : ce que l'élève voit à la place de l'énigme du jour (encart vide → écart à part).
- **Registre des écarts** : `docs/ecarts/registre.md` (mode d'emploi : `docs/pratiques/registre-des-ecarts.md`). Écarts suivants : `pnpm ecarts ajouter E …` depuis le dépôt principal, après `git pull --rebase`, commit aussitôt (suivant : E87).
- **Pièges en cours** : `--output=<dossier>` par lancement ; `networkidle` avant un clic après `goto` ; `locator('visible=true')` et navigation par `href` quand un lien est redessiné ; lire des éléments d'un seul coup (`evaluateAll`) après un changement de thème ; gestes à deux doigts = `Fingers` (CDP, Android) ; présence notée une fois par jour et par processus du serveur ; décor partagé en `serial`, élèves partagés sous verrou ; **brouillons d'un fichier parallèle : préfixe de titre avec le projet et `parallelIndex`, sinon l'`afterAll` d'un worker efface ceux des autres** ; `test.fail()` juste avant l'assertion de l'écart ; un agent qui a livré mais garde des lancements en fond : l'arrêter (TaskStop) ; ne JAMAIS changer l'attendu seul ; un modèle `published` sans nœud de l'arbre s'affiche dans `/automaths` sous « Non classés » : ceux que créent `questions-paquet5` et `blocs-geometrie-5` y passent le temps de leur test ; le worktree d'un paquet ne s'appelle pas `…-verifs-auto` : avant un `/reprendre`, chercher aussi `ubumaths-wt-verifs-tri-*`. Paquet 6 : `--output` efface les captures du dossier (un dossier par lancement ET par projet) ; trois agents sur le même serveur le font recharger des pages en plein test (rouges de charge, verts rejoués seuls) ; `goto` juste après une connexion → attendre `networkidle`.
- **Worktree / branche** : `../ubumaths-wt-verifs-auto-serveur` · `fix/verifs-serveur` (défaut 9), retiré au merge ; `../ubumaths-wt-nuit` est celui de la tâche de nuit, il reste.

## Défaut 9 : `test:verifs` ne rendait pas la main (2026-11-26)

Reproduit : `VERIFS_PORT=5186 pnpm test:verifs connexion.spec.ts`, aucun serveur sur le port → les tests passent, Playwright attend encore 2 min plus tard. Playwright arrête le groupe de processus de sa commande ; `pnpm dev` met `sh -c "… && vite dev"` dans un groupe à lui (ppid 1 une fois pnpm tué), le serveur garde le port.

Correctif : `e2e/verifs/serveur-de-dev.ts` tire la commande du script `dev` de `package.json` (gardes comprises) et lance `exec ./node_modules/.bin/vite dev --port … --strictPort` sans pnpm, pour `playwright.verifs.config.ts` et `playwright.captures.config.ts`. Test : `scripts/__tests__/verifs-serveur-de-dev.test.ts` (refuse un script `dev` qui ne finit pas par `vite dev`). Rejoué : 6 verts, rend la main en 25 s, port libéré, aucun processus restant. La tâche de nuit lance toujours son serveur elle-même (inchangé).

## Première nuit (2026-11-26)

Bilan (`pnpm nuit`, sorties `~/.local/state/nuit/`) : 2 h 00 → 4 h 25 ; 4 791 verts, **184 rouges**, 905 sautés ; 262 écarts ouverts, aucune preuve verte (le push du registre sous launchd n'a donc pas encore été essayé) ; trois gardes de doc vertes ; notification reçue.

Rejeu des 184 navigateur par navigateur, deux tests à la fois (serveur 5183 du worktree, une autre session jouait aussi sur la base locale) : **91 verts, 93 rouges (67 tests)**.

- **68 : décor des fiches** — `worksheet_exercises.exercise_version_id` NOT NULL depuis les versions d'exercices (ADR 0044) ; le décor créait des exercices sans version. `withFirstVersion` / `LATEST_VERSION_OF` (`helpers/carnet.ts`). Verts.
- **23 : charge** (tortue à 21 s, délais) : verts rejoués deux à la fois.
- **8 : presse-papiers** (`grantPermissions` refusé par Firefox et WebKit) : `allowClipboard` / `readClipboard`. Verts sur les quatre projets.
- **4 : graduations au téléphone** (#2346, #2370) : test d'avant E63 (#3146 : un nombre sur deux quand ils se touchent). Attendu : toutes, ou une sur `stride` depuis 0. Verts.
- **≈ 40 : Firefox, erreurs de console à chaque navigation** — Firefox coupe les requêtes de la page quittée et l'appli les écrit (`NetworkError when attempting to fetch resource.`, canal temps réel fermé) ; les tests ne lisaient que « JSHandle@object ». Rien de tel en prod (journal d'erreurs, 30 jours, relevé par le MCP en lecture). `collectErrors` lit le texte, `isNavigationAbortNoise` l'écarte. `base-locale-paquet9` et « En classe » : 70 verts sur Chrome + Firefox.
- **10 : `operations` sous Firefox** — la série dit « modèle absent » : la 2ᵉ lecture de `/api/questions/templates/all` est servie **périmée par le cache du navigateur** (sa date est celle de la 1ʳᵉ ; `cache-control: public, max-age=0, s-maxage=300, stale-while-revalidate=300`). Écart possible de l'appli (un modèle créé n'apparaît pas tout de suite ailleurs que dans l'onglet qui l'a créé) : **à proposer à David** avant tout correctif.
- **6 : `base-locale-paquet9` qui compte des lignes** (« 13 Galopins concernés » : la page en montre 15 ; « Conversations 4 » ; modération : le `test.fail` du mute expiré passe, une autre vérification a posé un mute) : la base locale a bougé depuis sa remise à neuf. Pas un défaut de l'appli ; à réécrire sur les seuls élèves du seed.
- **Restent à lire un par un (~25)** : étiquettes sur un trait sous Firefox (`blocs-divers` #2027 #2037 #2046, `blocs-paquet5` #2331 #2347 #2400), carte du Royaume #2138 (Firefox), glossaire #2978 (`<mover/>` refusé par Firefox), #1411 Atelier données (Firefox), #1385 console (Chrome), #1640 correction de dérivée (tous : « 9×3e^{3x} » au lieu de « a·e^{ax} »), Mathoux d'élèves partagés (`gamification`, `mathoux-decorations`), carnet #2731, chapitres #1390 #1394, constructions #1653, figures #1341, QR public, éditeur de démo #1723, programme #1581, #2492.

## Tâche de nuit unique (2026-11-25)

**Phase 0 (validée par David)** : nominal : chaque nuit à 2 h, un script joue les preuves des écarts, les vérifications à l'écran sur les six navigateurs et les gardes de doc, dans un worktree à lui ; `pnpm nuit` affiche le bilan. Limites : un test déjà rouge la veille, une preuve verte barrée ne notifient pas. Erreur : une étape qui ne peut pas tourner ne commite rien et prévient une fois.

**Livré** : `scripts/nuit/` (`logique.ts`, `index.ts`), `pnpm nuit [--lancer [--essai]]`, `pnpm ecarts rejouer --json=<fichier>`, lancement de 2 h dans `scripts/surveillance-machine-installer.sh`, doc `docs/pratiques/tache-de-nuit.md`.

**Essais réels (`--essai`, un seul fichier de vérifications, `connexion.spec.ts`)** :

1. Premier essai : preuves des écarts jouées en 2 min (161 rouges, 116 à la main, aucune verte ni cassée), gardes vertes, mais **vérifications à l'écran bloquées 32 min** : Playwright n'arrête pas le serveur de dev qu'il lance par `pnpm dev` (pnpm met chaque script dans son propre groupe de processus ; le serveur survit, Playwright attend sans fin, aucun compte rendu). Le jour, personne ne le voit : un serveur déjà lancé est réutilisé.
2. Correctif : la tâche lance et arrête elle-même le serveur (parenté suivie par `ps`, plus ce qui écoute sur le port), et un délai dépassé arrête toute la descendance d'une commande.
3. Second essai : 1 min 55, « 30 verts, 0 rouge, 0 sauté » (5 tests × 6 navigateurs), port 5190 libéré, aucun processus restant, worktree de la nuit propre.

**Revue `code-reviewer` (Sonnet)** : corrigés : arrêt de la descendance au délai, verrou périmé (processus disparu ou plus de 8 h) repris, erreur imprévue = nuit « tout en panne » et non un silence, notification pas partie reprise la nuit suivante, commit refusé = registre remis en état (worktree propre), fichier de test qui ne se charge pas = rouge, deux tests de même nom = pire verdict, verdict inconnu du rejeu = panne. `pnpm nuit` écrit en tête quand aucune nuit n'a tourné depuis plus d'un jour.

**Laissé, à dire à David** :

- **jamais essayés** : la suite complète sur six navigateurs (durée inconnue, délai de 4 h), le commit et le push du registre barré (aucune preuve verte aujourd'hui), le lancement par launchd (PATH, droits de push) ;
- **une panne qui dure ne renotifie pas** (« prévient une fois », validé) : push refusé chaque nuit, port pris, worktree pas propre restent visibles par `pnpm nuit` seulement ;
- un lancement à la main sans `--essai` le même jour écrase le bilan de 2 h ;
- le chemin du dépôt n'est pas échappé dans le plist (sans effet avec le chemin actuel) ;
- `index.ts` n'a pas de test (il lance des commandes) : seuls les essais réels le couvrent ; aucun typecheck ne lit `scripts/` ;
- vu en passant : le verrou des vérifs entre fichiers (`e2e/verifs/helpers/verrou.ts`) est un dossier **relatif au worktree** : il ne protège pas deux worktrees qui jouent `test:verifs` sur la même base locale.

## Tri — paquet 9 : lignes du 19 au 22 novembre (2026-11-24)

35 lignes (32 annoncées, 3 du 22 novembre ajoutées depuis), plus la clause « créneau » de #2825 restée du paquet 8. Cinq agents `test-automator` (base locale remplie, élève 02 en lecture seule ; séries et contrôles, élèves 16-20 ; fiches et lecture facilitée, élèves 21-25 ; pages et Automaths, élève 10 ; modèles de questions) ; la session : Atelier (#3007) et les lignes de terminal (#2966, #2967). Fichiers : `atelier-paquet9`, `automaths-paquet9`, `base-locale-paquet9`, `blocs-geometrie-9`, `fiches-paquet9`, `lecture-facilitee-paquet9`, `modeles-paquet9`, `pages-paquet9`, `series-paquet9`, `creneau-paquet9` (#2825, sauté en le disant). Aucun helper modifié.

**Rejeu de la session après corrections**, serveur calme, trois workers, tout vert (les ✘ sont des `test.fail` d'écart) : ordinateur 165 (3 sautés : 2 du menu du téléphone, le créneau de #2825), iPhone 160 et Android 160 (1 sauté chacun : le créneau). Un rouge au rejeu iPhone, révélé par un durcissement de la revue (chevauchement des étiquettes) : devenu l'écart E82. Types de `e2e/verifs` (`tsgo -p` d'un tsconfig limité) : 0 erreur dans `e2e/` (une corrigée, `getByRole('textarea')`). Un rejeu sur ordinateur avant les corrections avait donné 165 verts aussi.

**Vu par la session, sans test** : #2966, `pnpm dev --port 5176 --strictPort` prêt en 3 s, `pnpm db:a-jour --essai` → « Rien à jouer. » (la ligne « N migration(s) jouée(s) » lue dans `scripts/db-a-jour/index.ts`, pas vue : aucune migration en attente) ; #2967, `pnpm test:integration tests/integration/admin-elevation.test.ts` 3/3, base de dev lue avant et après : 13 classes, 34 comptes, aucune session du prof perdue. Contre la prod en lecture (`VERIFS_URL`) : #2971 et #2978, 12 verts (ordinateur et iPhone).

**Corrections de la revue `code-reviewer`** (aucun bloquant ; aucune déconnexion du prof, aucun mot de passe changé, `test.fail` tous posés après le symptôme) :

1. `automaths-paquet9` efface tout modèle « Verifs9 <projet> … », donc celui de `series-paquet9` : préfixe propre.
2. `fiches-paquet9`, `afterAll` : `resetStudents()` seulement si le verrou est tenu.
3. `fiches-paquet9` : le compte de 50 fiches exclut toute fiche « Verifs… ».
4. `fiches-paquet9` : chapitre et jeton du dernier test balayés au démarrage.
5. `pages-paquet9`, chat : balayage au démarrage (messages « Verifs9 », participant, `last_message_*`).
6. `pages-paquet9`, verdict de `/dev/modeles` : fichier de reprise écrit avant le clic.
7. `lecture-facilitee-paquet9` : la formule orange du PDF doit être trouvée (plus de saut silencieux).
8. `pages-paquet9`, #2978 : le niveau de l'exemple comparé à la base (liste fermée contre la prod).
9. `blocs-geometrie-9` : le toucher à 1 cm renommé en observation hors verdict, la pose à 3 cm assertée.

Mineurs : compteurs de `base-locale-paquet9` épinglés seulement quand la ligne les donne ; « sans chevauchement » asserté ou retiré du titre (`modeles-paquet9`) ; lien court enregistré avant l'`expect` et balayé (`series-paquet9`). **État : en cours d'application par un agent au moment de cette mise à jour : à vérifier.**

**Écarts** (registre ; tranchés par David le 2026-11-24, « je suis tes recos » : tous à corriger) :

- **E76** (#3007) : dans une question, `(n+2)5^n` (nombre collé derrière une parenthèse) est compté « Faux » sans un mot ; l'Atelier, lui, dit « Nombre « 5 » écrit après un facteur… » (règle du 2026-10-08). Reco : corriger, afficher le message. Le bogue que soupçonnait la ligne n'existe pas : `4^{n+1}(n+1)` est lu.
- **E77** (#3007) : « Sens de variation par le quotient » (cdb5a1cf) compte « Juste » le quotient non simplifié alors que l'énoncé demande « un seul quotient simplifié ». Reco : corriger le modèle.
- **E78** (#3012) : un élève ne peut pas ouvrir un exercice assigné directement (404) : `student_has_exercise_access` ne regarde que les fiches. Reco : corriger, question d'accès d'abord.
- **E79** (#2980) : Analytics, onglet Surveillance en 500 (`first_name` / `last_name` au lieu de `firstname` / `lastname`). Reco : corriger.
- **E80** (#3012) : premier chargement de `/games/2048` sur la page d'erreur (`appendChild`), Chromium et WebKit, serveur de dev ; revu par la session avec `pnpm voir`. Reco : vérifier sur un build, corriger.
- **E81** (#2898) : menu du téléphone, bloc « Préférences » sous le bas de l'écran, la liste ne défile pas (`MobileNavDrawer.svelte`). Reco : corriger.
- **E82** (#2946, tranché le 2026-11-25 : à corriger avec E63) : iPhone, « Inégalités et intervalles » v4, les nombres négatifs sous la droite se touchent (« −6 » déborde de 1,2 px sur « −5 ») ; Android passe. Même défaut que E63. Reco : corriger avec E63.

**Sort de chaque ligne** (appliqué à `verifications-manuelles.md` : 27 sorties dont 1 regroupée, 7 réduites, 1 telle quelle ; 103 → 76 lignes) :

- **Sorties (couvertes, ou écart suivi)** : #3007 (E76, E77), #2989, #3011, #2986, #2981, #2980 (E79), #2949, #2948, #2984, #2988, #2929, #2922, #2912, #2914, #2908, #2900, #2866, #2875, #2937 (les deux modèles portent la retouche en local), #2954/#2955, #2966, #2967, #2971 (verte en prod), #2977, #2978 (verte en prod), #3000 (cochée par David).
- **Regroupée dans la ligne « Au VRAI doigt »** : #2896 (règle graduée du lot 13 du CE2 ; toucher de direction à 1 cm du 0 ignoré sans rien dire sur téléphone).
- **Réduites** : #3012 (images des pouvoirs en pleine partie de démineur et de 2048) ; #2944/#2945/#2946 (« Placer un réel » v1 : 11 px entre deux graduations sur iPhone, étiquettes à 12 px) ; #2938/#2939 (liste en prod après `--appliquer`, lien du cahier de texte) ; #2936 (vidéoprojecteur, son, plein écran du téléphone) ; #2898 (formules en Luciole Math après une navigation sans recharger) ; #2869 (bouton « Voir la correction » de la forme Flash-cards) ; #2976 (table `web_vital_samples` de prod : en local l'envoi est coupé exprès).
- **Reste telle quelle** : #2970 (`pnpm db:neuf` efface la base de dev de toutes les sessions : à David).
- **Périmé** (décisions écrites) : #2984 « contrôle assigné → inchangé » (#2988 a ajouté la page d'attente) ; #2912 « Applications avec deux notions → Enregistrer refusé », « évaluation → notions sous le titre », « Suites · Dérivation » (ADR 0041, amendements des 19 et 20 novembre : garde retirée, titre de l'évaluation seul, catégorie ajoutée au titre composé) ; #2954 « N questions différentes » pour N = 1 (le texte voulu est « n'a qu'une question », `726d4ea48e`).
- **Limites notées** : clauses « la sortie du seed affiche… » non rejouées (seed déjà joué ; lues dans `scripts/db-seed-riche/`) ; #3011, l'élève muet du seed n'est muet que 24 h (`expires_at` = t0 + 1 jour), le test redevient vert dès qu'une restriction non expirée existe ; #2986, décorations des Mathoux vues en base, pas à l'écran ; #2908, « justifié avant » non asserté (seul l'alignement à gauche de la version Luciole l'est) ; #2898, « sans passer par Inter » prouve la règle CSS dès le premier rendu, pas la peinture des glyphes ; #2936, plein écran vérifié sur ordinateur seulement.
- **Vu en passant, non vérifié par la session** : tournois du prof, onglet « Terminés » à 4 alors que la base compte 3 terminés et 1 planifié ; `/api/errors/log` répond 429 quand plusieurs pages signalent d'un coup ; un clic avant l'hydratation envoie le formulaire en natif (cahier de texte, profil) ; sous WebKit, des centaines d'erreurs « access control checks » sur `/api/teacher/classes` par page du prof ; sous la charge de cinq agents, `/automaths/test` resté sur « Préparation du test… » et une erreur 500 en fin de Contrôle blanc (rien de tel au rejeu sur serveur calme) ; « réponse fausse » sans précision à chaque erreur des cinq modèles du lot 13 du CE2 ; `/demo/questions` monte tous ses onglets à la fois.

## Tri — paquet 8 : lignes du 15 au 18 novembre (2026-11-24)

30 lignes. Cinq agents `test-automator` (Automaths et pages, élève 10 ; Blockly et tortue ; géométrie à geste ; modèles de questions ; suivi, élèves 16-20) ; la session : Atelier (#2678, #2691) et carnet (`pnpm test:verifs carnet`, 3/3). Rejeu de la session après corrections, tout vert (les ✘ sont des `test.fail` d'écart) : ordinateur 127, iPhone 123, Android 123. Fichiers : `atelier-paquet8`, `automaths-paquet8`, `blockly-paquet8`, `blocs-geometrie-8`, `modeles-paquet8`, `pages-paquet8`, `suivi-paquet8` ; `helpers/blockly.ts` étendu (`etatTortue` avec niveau, `creerVariable`, `nomsDeVariables`). Types de `e2e/verifs` : 0 erreur (`tsgo -p` d'un tsconfig limité).

**Corrections de la revue `code-reviewer`**, toutes faites :

1. `pages-paquet8` jouait la déconnexion du prof local : `/auth/logout` appelle `signOut()` sans portée, donc toutes les sessions du compte sont révoquées, celles des autres fichiers de vérifs et des autres sessions comprises. Seule la déconnexion de l'élève (sous verrou) est jouée ; celle du prof reste à David.
2. Arrêt brutal : `pages-paquet8` balaie au démarrage les notifications « Verifs8 notif <projet> » et retire les liens du cahier de texte créés (fichier de reprise par projet, écrit avant la création) ; `suivi-paquet8` écrit son fichier de reprise à côté puis le renomme.
3. En-tête de `pages-paquet8` remis d'accord avec ce qui est joué (créneau et combat Navadra non joués).
4. Lignes « prod (données en base) » jouées sur la base locale : la session a lu la prod (lecture seule) : les 16 modèles cités sont `published`, 10 modèles masses et contenances et 4 de périmètres au CM1, comme en local.
5. Rouge de charge au rejeu : `blocs-geometrie-8`, flash-cards, comptait les dessins avant leur montage (4 au lieu de 7) : le test attend que le nombre ne bouge plus et asserte 7 (graine fixée).

**Écarts** (registre, en attente de David) :

- **E73** (#2854) : sous Chromium à largeur téléphone, la dernière pastille d'une grosse notion descend environ 1 200 px trop bas ; correct sous WebKit. Vu en local seulement. Reco : corriger (`goToSection`, `CatalogueNotionSections.svelte`).
- **E74** (#2716) : `X` après `x` refusé par la boîte de Blockly, pas par le message rouge. Reco : laisser, corriger la formulation.
- **E75** (#2831) : le milieu I n'est pas écrit sur la figure (caché exprès dans `lot-6-mediatrice.py`). Reco : laisser, corriger la formulation.

**Question à David** : (a) #2825, « un formulaire (créneau du cahier de texte) » : aucun formulaire de créneau dans le cahier de texte, et l'emploi du temps du prof local n'a pas de période ; le test joue le lien de consultation du cahier de texte. Quel formulaire ?

**Sort de chaque ligne** (appliqué à `verifications-manuelles.md` : 26 sorties dont 2 regroupées en partie, 3 réduites, 1 telle quelle ; 129 → 103 lignes) :

- **Sorties (couvertes, ou écart suivi)** : #2847, #2854 (E73), #2842, #2829/#2831 (E75 ; figures vues sur les captures), #2771 (cochée par David), #2137 (le texte n'arrive que dans la case visée, ordinateur et téléphone : ce n'était pas l'appli), #2726/#2729, #2724, #2706, #2716/#2719 (E74), #2720, #2703/#2705/#2708/#2709, #2698, #2695 (la phrase à l'écran), #2686, #2683/#2684, #2673, #2661/#2665, #2678, #2691, #2700/#2704, #2742, #2764, #2746/#2755, #2761, #2801/#2805.
- **Regroupées dans la ligne « Au VRAI doigt »** : #2661 (compas sur la graduation, rapporteur), #2742 (glisser un bloc au doigt).
- **Réduites** : #2825 (connexion Google, déconnexion du prof, créneau, combat Navadra) ; #2736/#2737 et #2731 (réception des courriels à une vraie adresse en prod, message trimestriel du 28 novembre).
- **Reste telle quelle** : #2695, relecture des 7 phrases du type d'erreur (David).
- **Limites notées** : clauses à valeurs figées de Blockly jouées sur des brouillons en aperçu admin (pas en compte élève) ; #2720, le test du recto ne distingue pas le correctif (celui du verso oui) ; « panier » s'appelle désormais « Ma série » (`921719ffa3`).
- **Vu en passant, non vérifié par la session** : énoncé de « Construire un triangle » v6, « et le côté [AC] 4 cm » (un mot ou un signe semble manquer entre [AC] et 4 cm, capture `2661-v6-supplementaire-sombre-android`) ; combat Navadra en erreur 500 en local pour l'élève 10 (deck absent ?) ; deux `<main>` imbriqués sur le tableau de bord du prof ; catalogue Automaths de 12 Mo ; MathLive perd parfois la première frappe après la mise au point (Android surtout) ; une notification « Annonce ZZ » de 3 jours traîne dans la base locale (pas de ce chantier).

## Tri — paquet 7 : lignes du 12 au 14 novembre (2026-11-24)

32 lignes. Cinq agents `test-automator` (résultats d'un contrôle, élèves 21-25 ; suivi et analytique, élèves 10-15 ; blocs et géométrie ; Palotin et boutique, élèves 16-20 ; Blockly et pages) ; la session : Atelier (#2641). Rejeu de la session après corrections, tout vert (les ✘ sont des `test.fail` d'écart) : ordinateur 119 (7 sautés voulus), iPhone 116, Android 116 (4 sautés voulus chacun : PDF et clavier). Fichiers : `atelier-paquet7`, `blockly-paquet7`, `blocs-geometrie-7`, `blocs-paquet7`, `controles-paquet7`, `pages-paquet7`, `palotin-paquet7`, `suivi-paquet7` ; helpers neufs `blockly.ts` et `themes-lisibles.ts` (que `blocs-divers` importe désormais). Types de `e2e/verifs` : 0 erreur (`tsgo -p` d'un tsconfig limité, 78 fichiers lus).

**Corrections de la revue `code-reviewer`** (trois bloquants, tous sur la base locale partagée), toutes faites :

1. `controles-paquet7` et `palotin-paquet7` : l'état d'origine (élèves de test, mode test du prof ; dates des traces et profils des élèves 16-20) est écrit sur disque AVANT toute modification (`.captures/verifs/<fichier>-reprise.json`) et rejoué au passage suivant ; remise des états partagés en premier, chaque étape isolée. Essayé pour de vrai par un `kill -9` en plein passage (309 traces reculées de 3 ans retrouvées à l'identique).
2. Verrou commun `compte-prof-mode-test` pour `controles-paquet7` et `suivi-paquet7` (le premier passe le prof en mode test, « Mes classes » montre alors les élèves de test).
3. Mesures qui passaient à vide (`Math.min()` d'une liste vide, contraste `Infinity`) : le nombre de courbes mesurées est asserté, `themes-lisibles.ts` échoue si rien n'est mesuré.
4. #2626 : assertions sur l'élément de la réponse, plus sur un chiffre seul ; #2621 : une copie à demi-point pour voir « Partiel » non nul ; #2643 : plus d'exigence « au moins une semaine de vacances » (dépendait de la date).
5. Taille des courbes : un test par lieu (aide, 2de, 3e), au téléphone seulement, seuil 130 px.

**Écarts** (registre, tous en attente de David) :

- **E65** (#2641) : « Modèle : » au-dessus du champ de la console, la ligne dit « sous ». Reco : laisser, corriger la formulation (c'est la place du modèle des commandes, et au téléphone le clavier le cacherait).
- **E66** (#2574) : Marché en erreur 500 pour un élève sans consentement parental (`ConsentButton.svelte`, infobulle sans `Tooltip.Provider`). Reco : corriger en premier. Aucune occurrence dans `error_logs` de la prod.
- **E67** (#2574) : « Acheter » non grisé sur « Mon profil » sans consentement (le serveur refuse). Reco : corriger.
- **E68** (#2581, #2582) : onglet « Lot » toujours « Aucun eleve disponible » (`worksheets/[id]/+page.svelte` ne passe pas `students` à `PdfPreview`). Reco : corriger.
- **E69** (#2637) : PDF, la courbe 3 d'un « associer » passe page 2, son numéro reste page 1. Reco : corriger.
- **E70** (#2637, #2644) : courbes d'« associer » de 107 à 126 px au téléphone, 130 attendus. À David : agrandir ou accepter.
- **E71** (#2586) : pas de message « Un envoi est déjà en cours… » au double-clic (le bouton se désactive, un seul courriel). Reco : laisser, corriger la ligne.
- **E72** (#2634) : 360 pas en 15,5 s sous WebKit de Playwright, 12,4 s sous Chrome. À chronométrer sur un vrai iPhone.

**Questions à David** : (a) #2599, « rien en révision » : la carte de gain s'affiche sans réplique de victoire, est-ce le « rien » voulu ? (b) #2621 : « Partiel » ne compte que le demi-point (bonne valeur, mauvaise forme), une case fausse sur deux tombe en « Faux » : voulu ? (c) #2627 classée périmée (ADR 0039, `/dev/blockly` retirée) : d'accord ?

**Réponses de David (2026-11-24, « je valide »)** : recos des écarts validées (E66, E67, E68, E69, E70 à corriger ; E65, E71 : laisser, formulation ; E72 : vrai iPhone) ; (a) voulu (réussite déclarée en révision, pas de réplique ; la révision rapporte un gain, donc la carte), ligne #2599 sortie (130 → 129) ; (b) voulu, tranché le 2026-11-14 (Q2 du journal `bilan-controle`) ; (c) d'accord.

**Sort de chaque ligne** (appliqué à `verifications-manuelles.md` : 18 sorties, 2 regroupées, 10 réduites dont PR 4b et PR 5b en une seule ligne, 1 telle quelle ; 151 → 130 lignes) :

- **Sorties (couvertes, ou écart suivi)** : #2666, #2639, #2643, #2631, #2621, #2626, #2652, #2655, #2641 (E65), #2597, #2619, #2596, #2632, #2581/#2582 (E68), #2586 (E71), #2637 (E69, E70), #2644 (mêmes modèles que la ligne #2644/#2646, gardée), #2627 (périmée pour l'exécution JavaScript / Python ; le reste joué sur `/tortue`).
- **Regroupées dans la ligne « Au VRAI doigt »** : #2658, #2606 (et le geste de #2637).
- **Réduites** : #2599 (question (a)) ; #2595 (un Contrôle blanc ne compte pas dans les 5 réponses) ; #2589 (fête du retour après une énigme) ; #2574 (vraies images du premier lot) ; #2575 (en prod : supprimer le brouillon `3a7a5711`) ; #2577 (vrai lecteur d'écran) ; #2611 (vraie imprimante, vraie règle) ; #2644/#2646 (relire et publier `27ac630c` et `5eec6d7d`, encore brouillons en prod) ; #2634 (chronomètre et glisser au doigt sur un vrai iPhone) ; PR 4b et PR 5b (cadre et copie corrigée en séance d'élève).
- **Périmé** (décisions écrites) : `/dev/blockly`, « Exécuter », « Délai d'exécution dépassé », « mode Programme » (#2627, #2632 : ADR 0039, `144e47da19`).
- **Reste telle quelle** : #2609 (deux fiches « Fonctions affines » encore brouillons : relecture et publication par David).
- **Vu en passant, non vérifié par la session** : « Aucun eleve disponible » et « Telecharger » sans accent dans l'aperçu PDF ; sur iPhone, le bloc de départ d'un programme de calcul déborde de l'espace de blocs et la table des réglages de `/aide-ecriture/blocs/tortue` paraît coupée à droite ; champ « répéter » : « 2,5 » devient 25 ; corrigé écrit de 3e : un point final seul à la ligne après la formule ; page Résultats : l'interrupteur « Mode Test » s'affiche éteint quand le mode est forcé en base ; pastille du bouton « Signaler » à 10 px au téléphone ; aucun autre fichier de vérifs n'est protégé d'un passage du prof en mode test.
- **Régression trouvée au rejeu** (hors paquet) : les deux tests #1943 de `blocs-divers` sont rouges parce que `/aide-ecriture/blocs/ranger` rend une erreur 500 au chargement direct : `MathInline.svelte` appelle `convertLatexToSpeakableText` (MathLive) au rendu serveur dès qu'une formule est découpée (`f1ff772ad4`, E52). Pas en prod (`origin/production` = 0.106.0). À corriger avant le prochain déploiement.

## Tri — paquet 6 : lignes du 6 au 11 novembre (2026-11-24)

41 lignes. Quatre agents `test-automator` (géométrie à geste ; blocs et modèles ; séances d'élève, élèves 16-20 ; pages diverses) ; la session : Atelier. Rejeu de la session, tout vert (les ✘ sont des `test.fail` d'écart) : `atelier-paquet6` 6 + 6 (et 9 contre la prod), `blocs-geometrie-6` 48 + 96, `blocs-paquet6` 14 + 16, `modeles-paquet6` 7 + 6, `pages-paquet6` 15 + 2, `seances-paquet6` 30 (1 sauté voulu) + 62, `automaths-niveau` 5 (`@bureau` ; 5 contre la prod selon l'agent, à rejouer) ; `chapitres` et `constructions` 31 verts (pour #2545).

**Corrections de la revue `code-reviewer`** (aucun bloquant), toutes faites :

1. `test.fail()` trop tôt : `modeles-paquet6.spec.ts` (#2509, le poser juste avant `expect(textEn).toContain(english)`) ; `blocs-paquet6.spec.ts` (#2462 « ÉCART », le poser après `openRepereExercise`).
2. `pages-paquet6.spec.ts` (#2482, trois tests) : asserter le symptôme en positif avant le `test.fail()` (« Erreur 500 » visible, toast « Erreur lors de la création »), pour qu'un sélecteur cassé ne passe pas pour l'écart.
3. `seances-paquet6.spec.ts` (`stubNapping`, sieste du Mathoux) : dire « réponse simulée » dans le titre, ou poser l'état en base.
4. `helpers/verrou.ts` : un verrou est repris après 30 min sans être rafraîchi, or `seances-paquet6` dure 12 min sur deux téléphones et ses tests ont des délais de 4 à 5 min → rafraîchir sa date à chaque test, ou porter `STALE_MS` à 2 h.
5. Sauts silencieux : `blocs-geometrie-6.spec.ts` (`test.skip(modele === null)` pour les six modèles de #2475/#2477 → échouer si absent) ; `automaths-niveau.spec.ts` (`if (toggle.count() > 0)` et `test.skip(emptyGrade === undefined)` → asserter).
6. `atelier-paquet6.spec.ts` (#2540) : plafond de 3 s sur 12 crans de molette, fragile sous charge → 6 s.
7. `questions-paquet4.spec.ts` (#1877) : jouer le VRAI modèle publié (`ac9579d6`, variation 4, graines 1 et 2 → x² = 24 et 48) au lieu d'une copie qui perd `shared` (c'est ce qui a créé le faux écart E42).
8. `seances-paquet6` ne remet que `gidouilles` dans `profiles` : vérifié, les lignes `profiles` d'eleve16 à eleve20 (hors `updated_at`) sont identiques avant et après trois passages du fichier (ordinateur, iPhone, Android).

Ce qui a été retenu : point 2, le symptôme est asserté avant le `test.fail()` (« Erreur 500 » visible, bouton « Insérer variable/filtre » seul, toast « Erreur lors de la création ») ; point 4, `refreshLock` appelé en `beforeEach` (le délai de 30 min reste) ; point 5, un modèle absent fait échouer le test, et la bascule « Programme / Notions » est attendue pour `T_EXP`, absente pour `T_GEN` (pas de programme de maths) ; point 7, le test lit a = k²·m dans l'énoncé du modèle publié (variation trouvée par son `(k)^2*(m)`, graines 1 et 2).

**Rejeu après corrections**, tout vert (les ✘ sont des `test.fail` d'écart) : ordinateur, `modeles-paquet6`, `pages-paquet6`, `automaths-niveau`, `atelier-paquet6`, `questions-paquet4` 56 ; `blocs-paquet6` et `blocs-geometrie-6` 62 ; `seances-paquet6` 30 (1 sauté voulu : clavier du téléphone). iPhone 113 et Android 113 (4 sautés voulus chacun : éditeur du prof). Types de `e2e/verifs` : 0 erreur.

**Sort de chaque ligne** (appliqué à `verifications-manuelles.md` : 28 sorties, 2 regroupées, 10 réduites dont #2565 et #2554 en une seule ligne, 1 telle quelle ; 179 → 148 lignes) :

- **Sorties (couvertes, ou écart suivi)** : #2501 (E54), #2553, #2555, #2540, #2566, #2559, #2550, #2568, #2560/#2562, #2481, #2564 (Chromium), #2536/#2538, #2518, #2489, #2492 (les nombres 11 et 42 sont ceux de la prod), #2456, #2491, #2420 (cubes, plaques et taille vus sur la capture iPhone), #2494, #2499, #2508, #2475/#2477 (les six modèles joués), #2473, #2472, #2439/#2430 (E55), #2463 (E62), #2462 (PDF vert ; écran = E56), #2482 (E58, E59, E60).
- **Regroupées dans la ligne « Au VRAI doigt »** (celle de #2358… du 2026-11-05) : #2485 (chiffres de la règle retournée, graduations au millimètre), #2490 (poser la règle près de la demi-droite sans viser).
- **Réduites** : #2545 → « une page de cours ou de notion affiche ses formules, figures et tableaux » (Atelier testé, instruments par `constructions` ; relu : `chapitres` ne regarde pas le rendu d'une page de cours, la ligne reste donc pour cette phrase) ; #2565 et #2554 → nouvelles de la Chatterie en fin de séance, « Contrôle blanc » dans les séries de chapitre et dans le formulaire d'un contrôle ; #2551 → révision d'un chapitre, badge « Réussi / Pas réussi » du corrigé d'une carte de cours (E61 pour la légende) ; #2544 → pièce Cotice, bulles de la maison, sieste avec de vraies données ; #2488 → un carnet importé de Jupyter qui porte `text/plain` ET `text/html` affiche le texte brut (`CellOutputs.svelte` teste `text/plain` d'abord) : voulu ? ; #2505 → « dans un cours, rien ne change » ; #2427 → la cote au PDF ; #2467 → le nom de A chevauche la flèche v : gênant ? (capture `2467-correction-*`) ; #2509 → « Fixer le barème » (David ; E57 pour le titre anglais).
- **Périmé** (décisions écrites) : « carte de cours en Entraînement → Noté : réussi. » (#2551 : cartes de cours retirées, `031aa258f0`) ; « Devoirs » (#2544 : redirigée tant que Google Classroom est désactivé, `devoirs/+page.server.ts`) ; « 40 min » (#2509 : la fiche dit 30 min, durée imprimée seulement pour un examen, ADR 0030).
- **Reste telle quelle** : #2572 (onglet ouvert pendant un vrai `deploy:prod`).
- **Vu en passant, non vérifié par la session** : dans une tuile de « Ma série », le choix `>` de « Comparer deux nombres entiers » n'est dessiné qu'après défilement ; sur téléphone, titres d'axes d'une courbe à 7,6 px (lisibles sur la capture iPhone).

## Tri — paquet 5 : lignes du 3 au 5 novembre (2026-11-24)

39 lignes. Worktree `ubumaths-wt-verifs-tri-5`, branche `test/verifs-tri-5`, serveur 5179. Fait en deux sessions : trois agents arrêtés à un `/clear`, leurs fichiers rejoués puis finis par la session suivante (deux agents : rouges de `blocs-paquet5`, quatre lignes sans test). Les modèles publiés cités (2-330 `f0163416`, 2-446 `9c7ab1c7`, `320f5ac7`, `80a87e34`, `06601c87`, `8d4bd94d`, `2cfae58d`, `22e8272e`, `dd286c93`) existent dans la base locale.

- **Automaths et séries** (`automaths-series.spec.ts`, 42 verts sur 3 navigateurs ; public vert contre la prod) : #2385 (ancien lien `?categories=`, ancienne série vidée avec « Série d'une ancienne version vidée. », message guetté dès `commit` car passager), #2380 (lien `?modeles=` copié remplit « Ma série » d'un autre contexte ; séries du prof sans « Modèle retiré » : une série de brouillons l'affiche, voulu), #2378 (sous-notions dans l'ordre `position` de l'arbre ; au téléphone, menu « Notion : … »), #2369 (aperçus de la série des limites, 10 questions jouées), #2377 (un clic lance En classe / Contrôle blanc / Flash-cards / Saisie ; Course : temps puis « Commencer le test »), #2376 (prod : première tuile jouable en 2,5 à 3,7 s ; retour sans relire `/api/questions/templates/all`), #2382 (modèle sous Matrices : AB = produit enregistré et relu ; le reste de la ligne est réduit). Couverts ailleurs : « un contrôle se lance et se corrige » (`questions-paquet4`), « Mes révisions » (`chapter-deck.test.ts`) ; « branche seule → refus » : API seulement (`put-publication-check.test.ts`).
- **Géométrie** (`blocs-geometrie-5.spec.ts` + `helpers/modele-brouillon.ts`, 29 verts ordi, 52 iPhone et Android) : #2348, #2359, #2305, #2327, #2301, #2288, #2268, #2271. Écart E50.
- **Autres blocs** (`blocs-paquet5.spec.ts`, 82 verts, 2 sautés voulus) : solides #2356, #2347, #2339, #2331, #2400 ; droite graduée #2309, #2294, #2328 ; repère #2274, #2304/#2306, #2296 ; arbre pondéré #2398 ; PDF d'une fiche (indice w₁, flèches, « Pile » en texte droit). Les 36 rouges du premier rejeu étaient des erreurs de test : brouillons effacés par l'`afterAll` d'un autre worker, une flèche nommée dessine deux pointes (la sienne et celle de son nom), page d'aide `droite-graduee` et non `line`, connexion déjà ouverte, sélecteurs.
- **Questions** (`questions-paquet5.spec.ts`, 35 verts, 10 sautés voulus ; `questions-paquet5-suite.spec.ts`, 36 verts) : tableau de signes #2358, #2353, #2308, #2297, #2287, #2338 (l'étape des racines n'existe pas dans toutes les variations : cherchée par son « ⟺ ») ; droite au corrigé #2370 (8 tirages, sens recalculé depuis l'énoncé), #2346 ; unités #2276 ; démonstrations #2341/#2349 (les 14 modèles du lot 4 à 360 px). Écarts E51, E52.
- **Périmé** (décisions écrites) : « Panier » → « Ma série » (`921719ffa3`), « Entraînement » remplacé par Contrôle blanc / Saisie, onglets de notion → colonne et sections (`364e64fb88`) ; « seule Extrémité est proposée » avec `depuis A` (#2274, #2306 : `ea5fd701b0`, plus aucun bouton) ; `.simplifier 1 h + 30 min` (#2276 : `docs/pratiques/notation-unites.md`, pas de « nombre espace unité » dans une commande ; `.simplifier 1[h]+30[min]` asserté).
- **Sorties (34)**, **réduites (3)** : gestes et lisibilité au VRAI doigt (13 PR regroupées) ; question à David sur #2346 (droite 120 px + courbe 213 px, corrigé de 661 à 686 px à 390 px) ; restes faisables par la session (#2382 : ancien modèle « déclaré dans le modèle », Dupliquer, liste admin, cahier de texte, paquets de révision ; #2297 : PDF d'une série et page à cocher ; #2341/#2349 : fiche PDF). **Restent** : #2232/#2486 (relance de la CI pendant un vrai `deploy:prod`), C13 (récits du chiffrement). 213 → 179 lignes.
- **Revue `code-reviewer` (Sonnet)** : aucun défaut de décor ni de données ; huit tests passaient sans vérifier tout leur titre, corrigés par un agent puis rejoués par la session (276 verts, 15 sautés voulus, 3 navigateurs, les cinq fichiers) : #2328 sortait en vert sans corrigé affiché (réponse fausse par construction, corrigé attendu) ; #2276 `toContain` s/min/h vert même dans l'état de E51 (retiré, reste le test strict) ; PDF : indice « 1 » plus petit et plus bas que « w », corrigé lu (les flèches se jugent sur les captures) ; #2271 : intersections comptées avant la branche, l'écart soupçonné n'existe pas (l'autre intersection est dans la figure) ; #2274 : glisser et clavier en tests à part, sautés visiblement ; #2309 : phrase « Les solutions sont de l'autre côté de 2. » assertée ; #2287 : bordures lues, juste = `--color-success`, fausse = `--color-destructive`, clair et sombre ; #2369 : les 10 cartes jouées jusqu'à « Série terminée ». Laissés : attentes fixes avant la frappe au clavier MathLive, plafond de 5 s de #2376.
- **Types** : `tsgo -p` d'un tsconfig limité à `e2e/verifs` : 0 erreur dans `e2e/` (6 corrigées dans les fichiers des agents).
- **Vu en passant** : le miroir de E33 aussi dans « Ma série » sous WebKit (iPhone) ; `/automaths/panier` met plus de 15 s à finir de charger quand 4 suites tournent sur le serveur → `--workers=2` ; au téléphone, les formules d'une page ne se composent que lorsqu'elles défilent à l'écran (les tests lisent alors l'énoncé dans la réponse de l'API).

## Tri — paquet 4 : lignes du 26 octobre au 2 novembre (2026-11-24)

43 lignes. Worktree `ubumaths-wt-verifs-tri-4`, branche `test/verifs-tri-4`, serveur 5179. Trois agents : blocs à geste de géométrie ; autres blocs (stats, horloge, cercle trigo, Scratch, cubes, solides, patrons) ; questions, modèles, évaluations (élèves 16-20, verrou `eleves-16-20`). La session : Atelier, Shtam, Royaume.

- **Atelier** (`atelier-paquet4.spec.ts`, ordi, iPhone, Android) : #2118 (conditions de √ et ln), #1862 (valeurs remarquables, degré collé), #1827 (graphe agrandi, Échap sur le menu Exporter), #1813 (grille immobile ; écart E41 sur écran court), #1828 (« ou » en texte droit ; le bouton « Simplifier pour x ≠ −√2 et x ≠ √2 » est celui du mode par défaut), #1835 (composée ; écart E40) ; #1807, #1811 déjà couverts.
- **Shtam et Royaume** (`shtam-royaume.spec.ts`, pages publiques, jouable contre la prod) : #1991 (bandeau, une, liens vers les pages, ≤ 2 articles par page avec leur vrai du faux, une seule colonne au téléphone, sombre lisible), #2138 (noms de la carte sans chevauchement à 3 px près, lieu d'une ville entouré au toucher).
- **Écarts** : E40 (ensemble hérité absent de la carte g), E41 (grille repoussée pendant la frappe sur un écran court).
- **Agents, rejoués par la session** : blocs à geste de géométrie 84 verts (3 navigateurs, aperçus admin de brouillons « Verifs4 … ») ; questions et modèles 42 ; autres blocs 105 (un test #2189 instable corrigé : étiquettes lues d'un seul coup, le changement de thème les redessine). Le miroir de E33 se voit aussi sous Safari d'ordinateur.
- **Sorties (39)**, **réduites (4)** regroupant les restes : PDF des blocs à geste (#2226), gestes au VRAI doigt (#1846…), bloc dans un item (#2065), QCM migrés (#1855). 252 → 213 lignes.
- **Revue `code-reviewer` (Sonnet)** : corrigés (agent, puis la session) : six `test.fail` déplacés juste avant l'assertion de l'écart (deux tests passaient à vide : E45 sans le nom du trait, E47 mesurait hors de la fenêtre) ; parité (#1843) asserte le corrigé ; attente du verrou portée à 30 min ; compagnon de l'élève 16 rendu en premier ; Shtam : pages suivies par leur adresse (lien redessiné pendant le clic) ; éditeur de modèles `@bureau` de fait (au téléphone, la barre collante couvre ses boutons) ; #1827 : attendre que le menu Exporter ait disparu avant le second Échap (course du test, 4 verts sur 4).
- **Écarts** : E42 (modèle x² = a sans `answerKind: 'intervalles'`), E43 (clause probablement mal recopiée de #1820), E44 à E49 (contrastes de l'horloge et de la boîte à moustaches, texte de 7-8 px dans les pages d'aide, palette de Scratch, lettres D et F traversées).

## Tri — paquet 3 : lignes du 23 au 25 octobre (2026-11-24)

77 lignes. Worktree `ubumaths-wt-verifs-tri-3`, branche `test/verifs-tri-3`, serveur 5179. Cinq agents : opérations posées (élèves 21-25) ; constructions (01-03) ; pages démo / aide / dev / programme ; Mathoux (10-15) ; modèles de questions (16-20). La session : Atelier et prod.

- **Contre la prod** (`VERIFS_URL=https://chiph.re`, pages publiques, 2 workers) : `atelier-calcul` 70 verts, #1674, #1703, #1620 compris → la ligne « verifs-auto » et les lignes « test rouge » #1674, #1703, #1620 sortent.
- **Atelier** (`atelier-paquet3.spec.ts`, ordi, iPhone, Android) : #1663 (ordonnées exactes du tableau, minimum −1,5 ; l'exercice `fonctions/597` n'existe pas en local), #1656 (carte « Dériver » = `.dériver`, quotient réduit, signe devant), #1709 (infobulle « Les touches de calcul » du clavier de la console), #1710 (rien ne déborde au téléphone), #1684 (tracée pour x > 0, vu) ; #1673, #1624 déjà couverts.
- **Écart** : E32 (formules lues en anglais par les lecteurs d'écran, balises SSML comprises).
- **Remarque outillage** : les projets de `pnpm test:verifs` tournent en `en-US` (défaut de Playwright) ; MathLive suit la langue du navigateur (infobulles en anglais dans les tests, en français chez un élève). À proposer : `locale: 'fr-FR'` dans `e2e/verifs/projets.ts`.
- **Agents, rejoués par la session** : constructions 27 (#1626 fragile sous charge, vert seul deux fois), opérations posées 12, modèles de questions 19 (dont 2 `test.fail` : E34, E35), décorations des Mathoux 21, pages démo / aide / dev / programme 215 sur 4 navigateurs (15 sautés voulus).
- **Sorties (61)** : verifs-auto, #1764/#1767, #1750, #1742, #1737, #1731, #1729, #1725, #1710, #1709, #1708, #1707, #1704, #1703, #1702, #1701, #1700, #1698, #1696, #1695, #1693, #1691, #1688, #1687, #1686, #1684, #1680, #1677, #1676, #1675, #1674, #1673, #1670, #1665/#1666, #1664, #1656, #1653, #1650, #1649, #1646, #1640, #1637/#1638, #1647, #1636, #1633, #1631, #1629, #1628, #1626, #1624, #1623, #1621, #1620, #1619, #1766, #1758, #1754, #1748, #1740, #1726, #1723. **Périmé** (décision écrite) : `/construction-demo` réservée au prof (#1750 ; #1619 et la part admin de #1665) ; type QCM disparu (#1726) ; multiplication et division à remplir refusées à l'aperçu (#1745 les a rendues saisissables) ; « aire » et « carré » non soulignés en 6e (`bb5e8691a5`, #1700) ; nombres de cartes et de pages des vitrines et de `/dev` (11 cartes, 25 pages) ; `/dev/blockly` retirée.
- **Réduites (10)** : #1747, #1685/#1689, #1681, #1642, #1635, #1716 (états ou rendus faisables par la session plus tard) ; #1738 (à trancher par David : la grille « 1,0 » au retour) ; #1745 (virgule au vrai clavier d'un téléphone) ; #1663 et #1659/#1662 (contenu de la prod).
- **Écarts** : E33 (miroir de la carte sous WebKit, à voir sur un vrai iPhone), E34, E35 (modèles), E36 à E39 (diaporama, carnet présenté, lexique sur tablette, erreurs de console de `/automaths` sous WebKit).
- **Revue `code-reviewer` (Sonnet)** : corrigés (par un agent, rejoués par la session) : `constructions` et `modeles-corrections` en série (config `fullyParallel`, chaque `afterAll` efface « Verifs3 % ») ; **verrou entre fichiers** qui partagent des élèves (`helpers/verrou.ts`, dossier `.captures/verifs/verrous/<nom>` : `eleves-10-15` pour gamification et Mathoux, `eleves-21-25` pour opérations, QR, connexion) ; `test.fail()` déplacé juste avant l'assertion de l'écart (une panne de mise en place redevient un échec) ; compteurs `ratelimit:login:%` rendus seulement s'ils ont été lus ; #1684 asserte le tracé (aucun point d'abscisse négative) ; nettoyages par identifiant et par préfixe « Verifs3 ». Rejeux : 9 fichiers verts, gamification 21 verts après redémarrage du serveur.
- **Restent tels quels** : #1784 (question à David : les réponses « domaine gardé » de `.développer`), #1682 et #1625 (mis de côté par David), #1692 (proposer la suppression de la table du tableur V4 : migration destructive, à David), #1594 (Brevo), #1712 (relecture du lot A1 du CP).

## Tri — paquet 2 : lignes du 17 au 22 octobre (2026-11-24)

44 lignes. Worktree `ubumaths-wt-verifs-tri-2`, branche `test/verifs-tri-2`, serveur 5179. Trois agents (gamification ; connexion, QR, constructions ; programme, fiches, unités) sur des élèves distincts ; la session fait les lignes Atelier.

- **Suite Atelier sur 4 navigateurs** (ordi Chrome, ordi Safari, iPhone, Android) : 556 verts, 4 rouges sous la charge des agents (#1368, #1369, #1374, #1404), verts rejoués seuls.
- **Gestes à plusieurs doigts** : `Fingers` (`atelier-tactile.spec.ts`) envoie de vrais événements tactiles par le protocole de Chromium (Android seulement ; WebKit n'en a pas) : pincement (AB passe de 45 à 141 px), glisser à deux doigts, Déplacer à un doigt.
- **Sorties Atelier** : #1540 (toile, barre dessous qui défile, deux doigts avec un outil sans rien écrire, Déplacer, Segment et Milieu par appuis, téléphone couché), #1546, #1536, #1538 (outils au doigt : Segment, Milieu ; le reste vert en émulation téléphone), #1472 (≥ et “ ” dans ET), barre d'icônes (Safari, iPhone : téléchargement et choix de fichier, au doigt), console (touche sous Échap : `IntlBackslash` si le navigateur se dit Mac, `Backquote` ailleurs ; poignée glissée ; « --> » orange ; boutons au survol ; téléphone : plein écran, « Tracer » du menu la referme — l'œil de la carte trace sans changer de vue, voulu C3), cartes lot 3 (phrase de f′ au toucher), lecture graphique (losange au doigt ; sombre lisible, sauf E28), Annuler / Rétablir lot 5 PR 1, 2, 3 (`atelier-annuler.spec.ts`, 4 navigateurs ; PR 3 aussi par `atelier-barre` et les tests de composant `remplacer`, `rejeu`).
- **Réduite** : #1473 → vrais fichiers sortis d'Excel (Windows) et de LibreOffice (aucun des deux sur le Mac mini ; le test reproduit leurs octets) ; le choix de fichier au doigt est testé.
- **Écart** : E28 (étiquettes de la lecture graphique superposées quand f(x) ≈ 0).
- **Agents, rejoués par la session** : QR, connexion, constructions (38 verts) ; gamification (19 verts, 2 sautés voulus : la présence n'est notée qu'une fois par jour et par serveur) ; programme, fiches, unités, modèles (37 verts).
- **Sorties (31)** : #1615, #1599/#1600, #1588, #1587, #1579, #1578, #1577, #1581, #1583, #1573/#1574, #1568/#1569, #1563, #1546, #1540, #1539, #1472, #1460-#1462, #1465, barre d'icônes, console, cartes lot 3, #1490, lecture graphique, Annuler/Rétablir PR 1-3, QR lots 1 et 2, #1536, #1538, #1589. **Périmé** : Palotin triste et « tu m'as manqué » (`3620df136c`, R2 du 2026-11-12, retour joyeux après un jour travaillé) ; « Constance Royale : 0 semaine » (R1) ; « plus de lien » sous les cartes du deck (#1589 l'a remis) ; « Ce lien est trop long » (#1539 : lien court). #1461 : « Avec réponses » de l'élève en paysage, comme le dit `docs/systeme/fiches-et-pdf.md`.
- **Réduites (13)** : pour David, #1592 (Dashboard Supabase de prod), #1585 (OVH, facultatif), #1534 (QR imprimé en noir et blanc), #1564 (modèles vus en prod, CE1 réel), numérotation (relecture des renvois du 23/09 au 18/10), #1473 (vrais fichiers Excel / LibreOffice) ; faisables par la session plus tard : #1582, #1580, #1575, #1471, #1484, #1493/#1494, #1498 (états de jeu à poser).
- **Écarts** : E29 (« Sa panse est pleine » jamais affiché), E30 (« Enonce » sans accents), E31 (message de `36, mm`).
- **Types des tests e2e** : `e2e/` n'est pas dans le `tsconfig` du projet : ni `check:incremental` ni la CI ne vérifient les types de `e2e/verifs` (Playwright transpile sans contrôle). Vérifié à part (`tsgo -p` d'un tsconfig limité à `e2e/verifs`, `types: ["node"]`) : 3 erreurs corrigées (une du paquet 2, deux d'avant). À proposer à David : un `tsconfig` pour `e2e/` dans la CI.
- **Revue `code-reviewer` (Sonnet)** : aucun bloquant ; corrigés : réglages d'origine rendus seulement s'ils ont été lus (classe DEVLOCAL, tailles de texte), tables non photographiées laissées, saut de #1599 seulement si CE processus du serveur a déjà noté l'élève (repère `.captures/verifs/presence/<pid>-<jour>-<élève>`), `programme` et `fiches-2` en série, profil absent dit clairement. Laissés : attentes fixes avant une absence de bulle (gamification, modèles), sélecteurs `.figure svg text`, `#classCode`.
- **Base locale** : l'agent gamification a lancé deux fois ses tests en même temps ; il a remis à la main l'état d'eleve10 à eleve15 (pansées, séries, gidouilles), un résidu possible dans `student_point_state` / `skill_attempts` de ces élèves fictifs.

## Tri — paquet 1 : lignes du 13 au 16 octobre (2026-11-23)

53 lignes. Worktree `ubumaths-wt-verifs-tri`, branche `test/verifs-tri`, serveur de dev 5178, base locale (`db:seed-riche`).

- **Sorties, par un test (nouveau ou existant), vert sur ordinateur, iPhone et Android** : #1292, #1417, #1427, #1410, #1434 (`atelier-tactile.spec.ts` : cibles ≥ 24 px, `tap`, guillemets courbes d'iOS) ; #1422 (nom lu « A4 : 2/3 », formule dans sa ligne, carte d'une liste à formules, confirmation de suppression) ; #1411 (ordi Chrome et Safari : collage d'un tableau, copie à virgule, ⌘C/⌘V garde `=1/3`, flèches après ⌘C, CSV avec BOM et « ; ») ; #1303, #1295, #1308 (`changement-de-compte.spec.ts`, Chrome et Safari, comptes élèves locaux) ; #1307 et #1674 verts depuis E10 (#3054) ; #1333, #1369, #1375, #1442 (tests R6 verts sur les téléphones).
- **Sorties par les tests unitaires de leur PR, rendu vu dans l'Atelier** : #1201, #1212, #1215, #1283, #1329, #1377 (décimal à virgule : oui) ; #1262 (cas `\ln|x|` et `2|x|` ajoutés à `answer-validator-vert.test.ts`) ; #1410 (ancien atelier : `grille.test.ts` § 7) ; #1439, #1444.
- **Sorties à l'œil de la session** : #1415 (±600 : plus aucune asymptote, étiquettes en fractions dans leur boîte), #1442 (vue Graphe au téléphone), #1375 (étapes clair et sombre, iPhone). #1421 mesuré : la case suit dès l'image suivante, aucune tâche longue.
- **Sorties avec un écart** (dans [ecarts-verifs-progress.md](../archive/wip/ecarts-verifs/ecarts-verifs-progress.md)) : #1294 → E21 (aucune énigme publiée en prod, la tâche tourne) ; #1388 → E22 (croix « Fermer » 16 px), E23 (consigne coupée au téléphone), E24 (clavier MathLive sur le champ de la console) ; #1377 → E25 (exemple fixe « 2x × 3 = 6x ») ; #1358 → E26 (cadres décalés au toucher sur `/demo/structure`).
- **Sorties par l'agent chapitres/figures, rejouées par la session (5 verts)** : #1341 (`figures.spec.ts`), #1387, #1390/#1392, #1394 (`chapitres.spec.ts`, données « Verifs … » créées puis effacées ; PDF orphelins dans le stockage local).
- **Sorties par l'agent fiches, rejouées par la session (19 verts, `fiches.spec.ts`)** : #1280→#1297 (polices du corrigé lues par poppler, image vue), #1344, #1352, #1370, #1379, #1386, #1396, #1428, #1429, #1433/#1438, #1441/#1443, #1445/#1446, #1454, #1457 (prof). **Périmé par l'ADR 0030** (`cd714d6170`, 2026-10-15) : numérotation romaine, case « afficher les points », styles Contrôle/Examen/Devoirs/Quiz ; le test suit la décision. Écart E27 : titre d'exercice à formule brut chez l'élève.
- **Réduites, faisables par la session plus tard** : #1348 (lot ZIP par élève), #1389/#1396 (cahier de texte partagé, page à jeton).
- **Restent pour David** : #1457 (PDF 18 pt imprimé) ; #1385 (vrai clavier d'iPhone) ; #1450, #1451/#1452 (fiches T_COMP toujours en brouillon en prod, retouchées le 2026-11-22 : relecture du contenu et publication = David).
- **Remarque** : iPhone 15, Atelier vide, console ouverte : l'historique n'a qu'environ 120 px de haut (une étape à la fois).

## #1469 sous Firefox (2026-11-23)

Pas un écart moteur à tolérer : un vrai bug, visible par un élève sous Firefox.

- **Cause** (sonde `pointerdown` / `pointerenter` / `pointerup`) : A1 en « Nombre » montre « Décimales » dans la barre de mise en forme ; le clic sur A2 la retire, « Effacer la mise en forme » remonte d'une ligne (barre 68 → 32 px, sous-barre 29,6 → 28 px) et la grille monte de 37,6 px sous la souris encore appuyée. Firefox envoie alors `pointerenter A3, buttons=1` sans mouvement, puis `pointerup` sur A3 : `enterCell` étendait la zone. Chrome n'envoie `pointerenter` qu'au prochain mouvement réel.
- **Correctif** (`DataView.svelte`) : le glisser ne commence qu'à 4 px (`DRAG_START`) du point d'appui (`pressedAt`), oublié ensuite. Tests unitaires : pointeur immobile → pas de zone (rouge avant) ; pointeur glissé → zone.
- **Reste, question pour David** : la barre saute toujours de 37 px au clic (désagréable aussi sous Chrome). La stabiliser (« Décimales » toujours là, grisée quand le format n'en a pas) est un choix d'interface, non fait.
- **#1424 poignée, rouge sous Firefox sur `main`** (déjà rouge sans le correctif) : `scrollIntoViewIfNeeded` centrait A8 sous Firefox, A2 et sa poignée sortaient de la grille, le pointeur appuyait sur une case. Geste du test : `scrollIntoView({ block: 'nearest' })`, attendu inchangé. Vert sur les 5 projets.

## Rouges WebKit (2026-11-23)

Gestes des tests seulement, attendus inchangés :

- **Clavier MathLive au toucher** (`waitVirtualKeyboard`) : au focus d'un champ, MathLive ouvre son clavier, et le champ perd puis reprend le focus (sonde `focusin`/`focusout` : clignement à `mathVirtualKeyboard.visible = true`). Lot 3 ligne 368 (iPhone, 2 sur 16 sous charge) : le champ déjà vidé était rangé vide à la sortie, la courbe disparaissait ; 0 sur 32 après. #1385 iPhone : « résoudre » perdait ses premières lettres (« dre »).
- **`typeMath`** : après un rechargement, MathLive perd parfois plusieurs frappes (« ex2=4 », « + » au lieu de « 2+ », ordinateur aussi) : 1er caractère seul, recommencé sur un champ vidé sans touche (sous Safari, Retour arrière hors du champ revient à la page précédente : page blanche), puis le reste.
- **`gotoRedirected`** : attend le `load` du document d'arrivée et le réseau calme. `toHaveURL(/\/atelier/)` était déjà vrai sur l'adresse d'avant, et SvelteKit relit `__data.json?…x-sveltekit-invalidated` au démarrage : la page suivante interrompait la redirection (#1340, #1692).
- **Barre d'icônes au téléphone** : les annonces empilées couvrent les cartes, et sonner arrête leur minuteur sous la souris de Playwright (écartée, WebKit iPhone ne le voit pas toujours). Le test les balaie, comme au doigt (E18).
- **Revue `code-reviewer` (Sonnet)** : cas frères corrigés (`typeInMathConsole` d'`atelier-calcul`, `3*4` de #1423 : clavier attendu), `arrived` de `gotoRedirected` sans rejet orphelin. Copie de `typeMath` dans `captures/` : clavier attendu aussi (captures iPhone). Laissé : `Alt+Tab` conditionné au moteur et non à l'OS (Mac mini seul).
- **Capture #1385 (iPhone)**, rouge avant cette PR (3 sur 3) : le bouton clavier au bout du champ d'une carte est recouvert par son contenu sous WebKit. Geste de l'élève au toucher : il touche le champ, le clavier s'ouvre seul (`focusCardField`). Image vérifiée : clavier de la carte, sans « Commandes ».
- **E16** (Tab sans focus sur un bouton sous Safari, laissé) : sous WebKit, le test fait ⌥ Tab, le geste de l'utilisateur de Safari.

## Phase 0 (validée le 2026-10-25)

- Lignes Atelier : test qui tape la commande dans `/atelier` (sans compte) et lit la réponse **affichée** ; les « pas … » deviennent des assertions ; refus → message de refus visible.
- Ligne mixte calcul + œil : le calcul passe en test, le visuel reste dans la liste.
- Test rouge : bug réel ou ligne périmée → signalé à David, attendu jamais modifié pour passer.
- Titre de test = n° de PR de la ligne. Ligne entièrement couverte → **sort** de `verifications-manuelles.md`.
- Exécution : **à la demande, en local** (`pnpm test:verifs`, Chromium, serveur de dev), pas en CI.
- Pilote : un lot d'environ 20 lignes, une PR, revue `code-reviewer` (Sonnet).

## Pilote — lignes retenues (n° de PR des lignes)

#1717, 5f-5 (#1743), M2 (#1749), #1674, #1682, #1656 (partie console), #1658/#1660, #1625, #1302, #1319, #1502, #1345, #1350, #1351, #1362/#1363, #1364, #1365, #1372, #1371, #1373, #1655 (partie console).

## Lot 2 — lignes retenues (2026-10-25)

#1253, #1278/#1279, #1282, #1300, #1321 (sans le clavier), #1483, #1326, #1329 (sans la correction générée), #1333 (sans le grapheur), #1334, #1347/#1349, #1353/#1357, #1361. Écart vu par la sonde : `.latex` seul → l'Entrée complète la commande (la ligne datait d'avant la complétion) ; David l'a vu, le test joue les deux Entrées.

## Lot 3 — lignes retenues (2026-10-25)

5f-4, Q50 (#1735), Q51-Q52 (#1741), #1710 (sans la lisibilité sur téléphone), #1709 (sans l'infobulle du clavier), #1708 (sans la correction d'un modèle d'essai), #1703 (sans la carte f′), #1663 (console seule), #1673 (console seule), #1620 (console seule), #1624 (sans le mode décimal), #1628, #1631, #1636 (console seule). Sonde : AUCUN écart avec les lignes, sauf `each_key_duplicate` sur « Comment ? » de `.dériver x/(x+1)`, `.dériver x\ln(x)` et `.dériver 2^(x^2)` (cette dernière ligne ne demande que la réponse : test vert).

Vu en passant, hors des lignes (à montrer à David, rien changé) : `.intégrer -0,6x+1,2` → la ligne dit $-0{,}3x^2 + 1{,}2x + C$, la dernière étape $1{,}2x - 0{,}3x^2 + C$ ; `.résoudre (x-0,5)/(x+1)>0` → « P(x) = 2x − 1, Q(x) = 2x + 2 » (multipliés par 2) et l'étape 1 d'une inéquation rationnelle explique « Une inéquation du second degré s'écrit… » ; `.résoudre |x/2-0,5|=1` → la branche réécrit x/2 en $0{,}5x$ dès l'étape suivante.

## Lot 4 — lignes retenues (2026-10-25)

Cartes : #1305 (sans `a = 3 sur 4`, à trancher), #1307, #1309, #1315 (thème clair ; sombre et /grapheur restent), #1328 (sans le dessin ni les 3 étapes dans Calcul), #1337, #1338 (sans le gris de y = x), carte f′ et bouton « Dériver » de #1703. Sonde étendue : `CARTES` après chaque ligne, `@Réciproque f` pour un clic de menu.

Écarts vus (rien changé, à David) : `f(1)` de `max(2,5 ; x)` → 2,5 (la ligne : 5/2) ; carte `g(x) = f(x)+1` sans intervalle affiché (le Graphe l'applique) ; `.réciproque sin` demande des parenthèses ; `a = 3 sur 4` en erreur. Nouveau cas `each_key_duplicate` : « Comment ? » de `.résoudre f(x)=4` avec f sur `[0;+∞[`. Vu en passant : la légende du tableau de variations dit « Tableau de variations de la fonction x » (au lieu de f).

## Lot 5 — vue Données et « Propriétés » (2026-10-26)

Lignes : #1410 (sans statistiques / nuage / diagramme de L, ancien atelier, tablette), #1413 (sans la note du diagramme), #1421 (sans « sans saccade » ni la carte calculée), #1422 (partie « Valeur exacte » et π), #1424 (sans poignée, copier-coller, partage), #1426 (sans Ctrl+Z), #1427 (sans tablette), #1430, #1431, #1432, #1434 (sans iPad), #1437 (sans le partage), #1444 (sans Tabuler de f_1 ni u_1), #1472 (sans iPad), #1477 ; `atelier-proprietes.spec.ts` : #1630 (sans téléphone), #1634 (sans le rendu). #1430, #1431, #1432, #1477 sortent de la liste.

Outillage : `helpers/grille.ts` (taper une case par la barre, lire son nom accessible, « Valeur exacte », la note, l'aide) ; `data-latex` posé sur la case écrite en maths, sur « Valeur exacte » (`DataView.svelte`) et sur les valeurs du panneau « Propriétés » (`ObjectProperties.svelte`) — la phrase du lecteur d'écran est en anglais (« one quarter ») ; sonde : `#A1 =…`, `?A1`, `~A1 =…`, `!Données`.

Écarts (à David, rien changé côté appli) :

1. **#1413, test rouge** : « Ajustement avec M » crée une carte f qui montre `2 × x + 1` ; la console dit `f(x) = 2x + 1`.
2. **#1422** : `=2/3` s'écrit en texte « 2/3 », pas en fraction — voulu par une PR suivante (`latexOf`, `formula.ts` : « une fraction en maths débordait de la ligne ») : ligne périmée ? Pas testé.
3. **#1410** : « « Annuler » du message remet L » — plus de message ; ↶ « Annuler : retirer le nom de la colonne A » remet L. Le test passe par ↶.

**Écarts tranchés par David (2026-10-26)** : les 3 recos acceptées — #1413 = bug à corriger (PR à part) ; #1422 et #1410 = lignes périmées, à récrire. « Valeur exacte » en anglais : futur petit chantier d'accessibilité (langue de la lecture vocale MathLive, console probablement aussi — non vérifié), pas maintenant.

Vu en passant : « Valeur exacte » est lue en anglais par un lecteur d'écran (`convertLatexToSpeakableText` de MathLive, « the square root of 2 ») ; #1427 parlait d'un formulaire dans la carte, c'est une fenêtre (Dialog) et la phrase « colonnes A et B (11 lignes) » est bien dans la carte.

## Lot 6 — écarts (b) et (c), Graphe, Géométrie, reste de Calcul (2026-10-26)

Lignes : #1422 (`=2/3` en texte, testé) et #1410 (↶ et Ctrl+Z remettent L) récrites ; Graphe #1400, #1401, #1402, #1405 (`atelier-graphe.spec.ts`, ligne sortie) ; Géométrie #1536, #1538 sans la tablette (`atelier-geometrie.spec.ts`) ; Calcul #1784 (sans « domaine gardé » à l'écran), #1684 (sans le tracé x > 0), #1617 (sans la cohérence du résumé), #1375 (sans thèmes ni téléphone), #1366, #1503 (sans le × du champ), #1535 (sans le rejeu de fichier), #1342, #1367, #1368 et #1369 (sans le clavier MathLive), #1374, #1404, #1417 (sans le collage ni la flèche au doigt). #1342, #1366, #1374 sortent. La ligne #1366 était cassée en deux dans le tableau (`\f` de `$\frac00$` lu comme saut de page).

Outillage : Graphe = 10 clics « Zoom arrière » (±577), asymptotes comptées par leur `stroke-dasharray` (5,5 verticale, 8,4 horizontale ; un trait horizontal est « caché » pour `toBeVisible`, on compte), une asymptote horizontale attendue avant de compter « 0 verticale » ; Géométrie = clic en coordonnées du repère (origine au centre, `min(l, h)/13` px par unité), lignes lues dans l'historique console FERMÉE ; presse-papiers par `grantPermissions`.

Écarts (à David, rien changé côté appli) :

1. **#1367** : « Dériver » sur `f(x) = a x`, `a` non défini → carte f′ « En attente de « a » », sans formule (la ligne : f′(x) = a) ; avec `a = 2`, f′ = 2. Alors que `.intégrer` de `e^{a x}` calcule avec `a` symbolique.
2. **#1369** : `sinus` n'est pas refusé mais lu i·n·s²·u : « lu normalement » ?
3. **#1404** : « l'image de 2 sur la carte f′ » : plus de champ d'image sur la carte (décision du 2026-10-18) — ligne périmée ?
4. **#1617 et #1620 rouges depuis #1807** (tidy-conditions, mergée pendant le lot) : `.simplifier (x^2-1)/(x+1)` et `.simplifier x/x` laissent la fraction (bouton « Simplifier pour x ≠ … ») ; les lignes demandaient `x − 1` et `1` avec leurs étapes. Attendus non changés, à David.
5. **Bug, #1422 rouge par intermittence (suite complète)** : la grille saute de 32 px selon que la case choisie a une « Valeur exacte » ou non (A1 = √8 : A1.y 376 ; A2 = 5 : 344). Pendant un clic, la grille bouge sous le pointeur enfoncé → zone A2:A3 au lieu de A2. Un élève qui appuie un peu longtemps l'aurait aussi. Correctif probable : réserver la ligne sous la barre (comme la consigne de la Géométrie). Test non masqué.

Vu en passant : le menu « Options » d'une carte k dit « Résoudre f(x) = 0 » (pas k) ; les 6 premiers tests d'une suite complète lancée juste après un commit expirent dans `openAtelier` (serveur de dev à froid) — relancer.

## Écarts du lot 6 tranchés par David (2026-10-26)

Mes recos acceptées : (1) #1367 ligne périmée : f′ attend `a` comme f ; `.dériver a x` → `a` en console ; (2) #1369 `sinus` : seul le non-refus est testé, pas de chantier ; (3) #1404 périmée : `f'(2)` → 12 en console ; (4) grille qui saute → PR de correctif à part, test rouge d'abord ; (5) #1617/#1620 récrits selon #1807 (bouton « Simplifier pour x ≠ … » → résultat, sa condition, ses étapes ; `.factoriser (x^2-1)/(x+1)` et `(x^2-1)/(x+1)+1` aussi) ; libellé « Résoudre f(x) = 0 » de la carte k → même PR que (4). Lot 7 = (1), (3), (5) ; #1367 et #1404 sortent de la liste.

## Écarts tranchés par David (2026-10-26)

L'Atelier a raison, les lignes étaient périmées ou imprécises : #1305 `a = 3 sur 4` → carte rangée en erreur, sans refus d'intervalle ; #1309 `f(1)` → 2,5 (décimal tapé → décimal) ; #1337 l'héritage se lit par `.domaine g` (« ensemble hérité »), le champ ne montre que l'ensemble propre (décision d) ; #1338 `.réciproque sin(x)` (`sin` seul refusé depuis le 2026-10-06) ; #1620 `.dériver x^x` → `x^x(ln(x)+1)`, ordre de l'Atelier. #1305, #1309, #1337 sortent de la liste.

## Lot 8 — console, réglages, historique, cartes valeur (2026-10-26)

Lignes (`atelier-console.spec.ts`) : #1289 (sans `1/2 m`), #1296 (sans la durée), #1301, #1292 et #1313/#1318 (sans la lisibilité), #1340, #1356 (sans « Repartir de zéro »), #1385 et #1388 (sans téléphone, clavier virtuel, thèmes, VoiceOver), #1423, #1425, #1442 (sans la lisibilité du Graphe à 390 px), #1692 (sans le rappel de la table `spreadsheets`), #1807, #1811 (sans téléphone), « console de l'Atelier » (sans Safari, Mac AZERTY, PC, glisser, téléphone, couleurs). #1301, #1340, #1423, #1425 sortent de la liste.

Outillage : `typeInCard` passe dans `helpers/atelier.ts` ; « Écriture mathématique » choisie par la fenêtre Réglages ; MathLive perd la première frappe juste après un rechargement ou un changement de réglage → `typeMath` recommence tant que le champ reste vide ; « pas de menu au clic droit » vérifié contre un témoin (un `math-field` ordinaire posé dans la page, dont le menu s'ouvre — en dernier : il ne se referme pas à Échap) ; la pastille de la console est la description du bouton (« 1 nouveau résultat »), hors du bouton.

Écarts (à David, rien changé côté appli) :

1. **#1296** : `d = 1 h 30 min * 2` refusé depuis #1562 (« Durée composée collée à × ou ÷ ») ; dans une définition le refus est générique (« n'est pas une expression valide »), sur une ligne de calcul il dit d'écrire `2*(1 h 30 min)`. Ligne périmée ; le message générique de la définition, à corriger ?
2. **#1289** : au vrai clavier, `1/2 m` dans une carte valeur → $\frac{1}{2\,m}$ = 0,5 m⁻¹ (MathLive met « 2 m » au dénominateur).
3. **#1356** : « Repartir de zéro vide tout » — la console garde ses lignes depuis le 2026-10-19 (#1530) : ligne périmée.

Vu en passant : `n = 1` → « n est réservé » (variable des suites) ; `.exporter` n'écrit pas de ligne, il le dit sous la console (« Historique exporté : … ») ; au téléphone, la barre d'icônes est passée SOUS « Mes objets » (la ligne #1442 parlait de « Partager… / Réglages » en haut).

## Écarts du lot 8 corrigés (2026-10-26, David : « corrige les écarts »)

1. **#1296** : la carte refusée dit maintenant l'aide du parseur, comme la ligne de calcul (`invalidExpressionMessage`, `parse.ts` ; `knownFrench`, `french-errors.ts`) : `« 1[h] 30[min] * 2 » n'est pas une expression valide. Durée composée collée à × ou ÷ : écris 2*(1 h 30 min)…`. Vaut pour toute aide précise (`x^^2` → « Il manque l'exposant après ^. »), pas pour une position seule (`a = 3 sur 4` → « « 4 » inattendu ici », trompeur : #1305 inchangé) ; « Unexpected token in atom: EOF » se traduisait « « EOF » inattendu ici » → « Expression incomplète ». Ligne récrite : `(1 h 30 min) * 2` retouchée reste 3 h.
2. **#1289** : un VRAI bug, masqué par mon geste. Tapé `1/2`, →, ` m`, MathLive écrit `\frac12\,m` (forme compacte, sans accolades) : la carte le lisait 1/2 × m, « En attente de m ». `naturalQuantityLatex` (`mathfield.ts`) lit aussi `\frac12`. Reste connu, d'avant : `2\frac12\,m` et `\frac12\,3\,m` se recollent (21/2 m, 1/23 m), avec ou sans accolades.
3. **#1356** : ligne périmée, récrite : « Repartir de zéro » vide les cartes, la console garde ses lignes, après rechargement aussi.

#1289, #1296, #1356 sortent de la liste.

## Lot 9 — cartes, lecture graphique, barre d'icônes, Données, Grapheur, Python (2026-10-26)

Lignes : cartes de fonction (lot 3, sans le toucher iPad), cartes valeur / suite / liste (lot 4a), cartes point et courbe (lot 4b, sans ce qui est passé dans Propriétés), lecture graphique (sans iPad ni thème sombre), barre d'icônes (sans Safari ni iPad), #1530, #1412, #1439 (sans VoiceOver), #1469 (sans la lisibilité des couleurs ni le téléphone), #1473 (fichiers fabriqués, sans iPad), #1415-#1419 (sans « plus de trait isolé »), #1627, #1546 (390 px émulés), #1697, #1746. Sortent : #1746, #1627, #1412, lot 4a, #1530. #1417 non traitée (coller dans un message, flèche au doigt : à la main).

Outillage : `retypeCard` / `fieldValue` (vider le champ jusqu'à ce qu'il le soit, MathLive perd le premier geste) et `chooseSetting`, `mathConsole`, `mathValue` passent dans `helpers/atelier.ts` ; `nameColumn` dans `helpers/grille.ts` ; nouveaux `atelier-barre.spec.ts` (fichiers téléchargés puis rechoisis par la fenêtre du système) et `python.spec.ts` (un nouvel onglet = une nouvelle page du contexte). « Rien de rangé pendant la frappe » se prouve par Échap (la valeur d'avant revient) : un clic dans la console range la carte. Thème sombre : `emulateMedia` (ModeWatcher suit le système).

Écarts (à David, rien changé côté appli) :

1. **Bug probable, `/python`** : sans compte, le code tapé n'est rangé qu'à Ctrl+S (`bind:value={pythonStore.code}` ne passe pas par `setCode`, donc pas de `saveToStorage`). Perdu au rechargement, et Q1 de #1697 (« Remplacer ton code ? ») ne se déclenche jamais avec du code tapé. Vérifié : après Ctrl+S, la question apparaît. Test Q1 rouge.
2. **Bug probable, Partager** : un atelier qui n'a que la grille ne se partage pas (« Ton atelier est vide », `atelier.objects.length === 0`), alors que Repartir de zéro et Enregistrer comptent la grille. Les tests #1469 et #1439 posent une carte `k = 1` avant le lien.
3. **Message faux** : « Charger cet atelier ? » dit « ton objet sera remplacé, et l'historique effacé » ; la console garde ses lignes (décision du 2026-10-19, testée).
4. **Lot 4b, ligne périmée ?** : nature au bout, valeur en gris, équation de `d = (AB)`, ⋮ → Étiquette : passés dans Propriétés (5490181c2, 5c46e243c).
5. **Lot 3, ligne périmée** : « Image d'un nombre » retirée du menu exprès (0a099ddb6).
6. **#1530, ligne imprécise** : `X suit B(10;0,5)` est la réponse de la console ; tapé, il est refusé par « Il manque « ) » » (message trompeur). Le test tape `.binomiale X 10 0,5`.
7. **#1439** : sur Mac, ⌘Y ne rétablit pas (le code lit `ctrlKey` seul) ; Ctrl+Y et ⌘⇧Z, oui.
8. **Grapheur** : l'asymptote de `1/(ln(x)−1)` est étiquetée « x=2.718 » (point décimal ; « y = e », lui, est écrit « e »).

Vu en passant : un CSV se pose à partir de la case choisie (« posées à partir de A1 » seulement si A1 l'est) ; des décimaux à point (Google Sheets) restent affichés « 2.25 » dans la case (calculés comme nombres) ; `.exporter` puis rejeu d'un historique qui contient un chargement : le rejeu s'arrête à la « rupture » sans le dire ; `u(0) = 3` tapé dans la console répond « false » (une comparaison), le premier terme se règle dans la carte ; une suite qui se cite elle-même ne passe pas en Explicite (refus avec sa raison).

## Écarts du lot 9 tranchés et corrigés (2026-10-26, David : « je suis tes recos »)

1. **`/python`** : `code` devient un accesseur du store ; chaque écriture (dont `bind:value` de l'éditeur) range un BROUILLON dans le navigateur après 500 ms, sans toucher `_lastSavedCode` (`isModified` garde son sens pour « Charger un exemple »). Le code survit au rechargement, Q1 se pose : test Q1 vert, rechargement testé.
2. **Partager / Enregistrer** : une grille seule n'est plus « vide » (`atelier.isBlank`, comme Repartir de zéro). Enregistrer avait le même défaut, corrigé avec. Le `k = 1` des tests #1469 et #1439 est retiré.
3. **Confirmation de Charger** : « Ton objet sera remplacé. La console garde ses lignes ; celles du fichier s'ajoutent. » (`replacementLoss`, au lieu de la phrase du REJEU).
4. **Lot 4b** : ligne récrite, testée dans `atelier-proprietes.spec.ts` (nature, coordonnées de `I = milieu(A, B)`, équation réduite de `d = (AB)`, étiquette) ; elle sort.
5. **Lot 3** : « Image d'un nombre » retiré de la ligne.
6. **`X suit B(10;0,5)` tapé** : la console dit la commande (`typedLawRefusal`, `law-commands.ts`) : `.binomiale X 10 0,5`, `.geometrique`, `.exponentielle` ; pour N, l'écart type et non la variance.
7. **⌘Y** : laissé tel quel (⌘⇧Z sur Mac), ligne corrigée.
8. **Étiquettes d'asymptotes** : `valueLatex` (`asymptote-labels.ts`) reconnaît e et les multiples simples de π (`x = \frac{\pi}{2}`), sinon 4 chiffres avec la virgule décimale (`2{,}5`), verticales comme horizontales numériques.

#1697 et lot 4b sortent de la liste.

Revue (`code-reviewer`) : le brouillon venait de TOUTE affectation de `code` (exemple, fichier du cloud : il écrasait le code local que lit la migration) → accesseur dédié `editorCode`, lié à l'éditeur ; `destroy()` range le brouillon au lieu de le jeter ; le rejeu d'un historique vidait une grille seule sans demander → confirmation sur `isBlank` ; « Garder » d'une grille seule disait « rien à garder » → `MergeReport.grid`. Noté, pas corrigé (d'avant la PR) : un `saveTimeout` de `saveToStorage` en attente marque « enregistré » un code tapé juste après (`_lastSavedCode`), et un réglage (taille, thème) aussi ; `B(10,0,5)` sans séparateur lisible donne un conseil faux (rare).

## Lot 10 — captures « à l'œil » (2026-10-26)

Outillage : `playwright.captures.config.ts` (projet `comptes` : connexion par le formulaire aux comptes locaux de `dev_accounts.sql`, refusée hors localhost), `helpers/captures.ts` (`shoot`, `shootBothThemes`, `around`), `scripts/verifs-captures-page.ts` (page HTML autonome, images en data URI, verdicts dans la capacité `db`, file d'écriture avec nouvel essai). Pages déménagées : `/construction-demo` → `/constructions/essais` (prof), `/test-font` → `/dev/polices`, `/test-structure` → `/dev/structure` (admin).

Captures : Atelier (#1315, #1328, #1338, #1634, #1630, #1617, #1313/#1318, #1362/#1363, #1364, #1385, #1413, #1415-#1419, #1424, #1442, #1469), constructions (#1621 → #1653), `/dev` (#1793, #1798, #1312/#1322, #1346). Tests de restes : #1658/#1660 (bouton Variations), #1319, #1503, #1535, #1333 (grapheur), #1368, #1369 (mode maths), #1421, #1424, #1426, #1437.

## Lot 10 rejoué sur le code du 2026-11-23

David : « les captures et résultats du 26 octobre sont périmés », « juge les captures toi-même », « les lignes peuvent être anciennes, la vérif n'a peut-être plus lieu d'être ». L'ancienne page à cocher n'est plus utilisée.

- **Attendus changés, chacun par une décision écrite** : `.résoudre` répond par S (`S = {2}`, `S = ]-∞ ; 5]`, #2360, Q2 du 2026-11-03), 4e étape « ensemble des solutions » ; `.simplifier 0.5/x` → `1/(2x)` (Q9, 2026-11-02) ; `.simplifier ln(x^2)` a son bouton « Simplifier pour x > 0 » (#1819). Tests seuls réparés : étapes chargées à la demande, `combobox` des formats, bouton « Signaler » du serveur de dev masqué au téléphone.
- **Sorties de la liste (27)** : par les captures #1313/#1318, #1315 (et `/grapheur`), #1328 (+ test des 3 étapes), #1338, #1362/#1363, #1364, #1413, #1424, #1469, #1617, #1630, #1634, #1643, #1312/#1322 (formule grossie), #1346 ; par les tests #1658/#1660, #1319, #1503, #1535, #1368, #1426, #1437 ; #1466 (relecture d'une grille sans `formats` : `persistence.ts` `salvageFormats`) ; #1321, #1502, #1655, #1359 rejouées en local (composants réels, modèle local pour #1655). #1793/#1798 : vues par David sur iPad le 2026-11-09, captures retirées. #1385 réduite au vrai clavier d'iPhone.
- **Écarts à présenter à David** : déplacés le 2026-11-23 dans [ecarts-verifs-progress.md](../archive/wip/ecarts-verifs/ecarts-verifs-progress.md) (E1 à E11, mêmes numéros).
- **Restent dans la liste, faisables par la session plus tard** : #1421 (« sans saccade »), #1649 (lecture continue, construction publique sur chiph.re), reste de #1621/#1626/#1629.

## R6 — navigateurs du téléphone (David, 2026-11-23)

David : « tu parles de Safari mais pas des autres navigateurs », puis « pars sur les trois projets ». Sur iPhone, tous les navigateurs utilisent WebKit ; sur Android, Chrome / Samsung / Edge utilisent Chromium, Firefox utilise Gecko (Playwright ne simule pas le toucher de Firefox Android).

- **Décision (révisée, David « et le cas du desktop ? » puis « je valide »)** : cinq projets, toute la suite : **ordinateur Chrome/Edge** (Chromium, l'actuel), **ordinateur Safari** (WebKit), **ordinateur Firefox** (Gecko), **iPhone** (WebKit), **Android** (Chromium) ; plus **Firefox à 390 px** sur un sous-ensemble (clavier MathLive, graphiques, constructions).
- **Comportements validés (phase 0)** : `--project <nom>` pour un seul navigateur ; test sans sens au téléphone (`Ctrl+D`, survol) marqué « bureau seulement », sauté ailleurs, attendu jamais changé ; rouge propre à un moteur = écart soumis à David (candidat : verso de carte retournée en miroir sous WebKit, vu par `pnpm voir`) ; moteur absent → arrêt avec la ligne d'installation ; durées avant / après dans la PR ; R6 ne sort aucune ligne de la liste, le tri s'en servira.
- **Jour / nuit (David : « lancer la suite complète la nuit »)** : le jour, `pnpm test:verifs` = ordinateur Chrome seul (ou `--project`) ; `pnpm test:verifs:tout` = tous les projets. Tâche de nuit sur le Mac mini (`test:verifs:tout` sur `main`, base locale, notification seulement d'un rouge nouveau) : après R12, dont elle prend le filtre — à confirmer par David.
- **Ordre du découpage validé** (David, 2026-11-23, « je valide ») : R6 → tri des 391 lignes par paquets d'environ 50 (les plus anciennes d'abord) → R12 → R13.

## R6 — premier passage (2026-11-23)

- **Avant** (Chrome seul, ancienne config) : 150 tests, **2,9 min**, 5 rouges : #1674, #1703, #1620 (bug `each_key_duplicate` de « Comment ? », mis de côté), #1369 (écart 1/10), carnet #2731 (vert rejoué seul sous `with-db-lock.sh`).
- **`test:verifs:tout`** : 769 tests, **15,4 min**, 424 verts, 341 rouges.
  - **Firefox (172)** : ne démarre pas. `Could not find profile folder`, même lancé à la main hors bac à sable, même après `playwright install --force firefox` (Firefox 159, build 1572, macOS 27.0).
  - **Ordinateur Safari (14)** : les 4 rouges connus ; 7 × `grantPermissions: clipboard-write` inconnu de WebKit (réglage du test) ; #1709 / redirections « navigation interrompue » (course de redirection sous WebKit) ; cartes lot 3 `toBeFocused` après Tab (Safari ne met pas le focus sur un bouton au Tab : candidat écart moteur) ; #1425 délai.
  - **Firefox réglé** (David : « cherche une solution maintenant ») : macOS 27 refuse à Firefox `~/Library/Application Support/Firefox` (confidentialité) ; `CFFIXED_USER_HOME` vers un dossier à lui (`projets.ts`). Ordinateur Firefox ensuite : 4 rouges connus + presse-papiers ; `allowClipboard` / `readClipboard` (permissions Chromium seulement, coller ⌘V ailleurs) → tous verts sauf **#1469 sous Firefox, écart moteur** : après « Format de nombre », le 1er clic sur A2 étend la sélection en zone A1:A2 au lieu de choisir A2 (2e clic : A2 choisie) ; Chrome : A2 dès le 1er clic. Firefox 390 px : mêmes rouges de mise en page que le téléphone.
  - **iPhone (78) et Android (72)** : presque les mêmes tests → la **mise en page téléphone**, pas le moteur. Causes : la console couvre la vue Données et la sous-barre recouvre A1 au défilement (~39) ; cartes de « Mes objets » attendues dans le panneau d'ordinateur (~30) ; grapheur : dézoom attendu > 400, l'écran étroit s'arrête à 400 (14).

## R6 — rouges restants (2026-11-23, `test:verifs:tout` après les gestes du téléphone)

- **Connus, tous projets** : #1674, #1703, #1620 (`each_key_duplicate`, mis de côté), #1369 (écart 1/10). Carnet : rouge en suite complète, vert seul.
- **Grille de Données invisible au téléphone** (~22 rouges par projet téléphone, dont barre d'icônes, #1442, #1692, #1697) : à 393 px de large, la zone de la grille fait 2 px ; barre, mise en forme, consigne et boutons prennent toute la hauteur. Mesuré à 659, 750 et 844 px de haut ; à 700 px de large : 222 px, 30 cases. **Même chose en prod (chiph.re).** Correctif proposé : `DataView.svelte`, hauteur minimale de la grille au téléphone et défilement de la vue. Pas fait : à trancher par David.
- **Écarts moteur** : déplacés le 2026-11-23 dans [ecarts-verifs-progress.md](../archive/wip/ecarts-verifs/ecarts-verifs-progress.md) (E12 à E17) ; #1536 tranché (test, #3040, écart E11) ; #1337 reste ici, prochaine étape.
- **#1337 tranché : le test** (2026-11-23). iPhone 15 (393 × 659) : au chargement du lien, « Mes objets » est replié, la console a 329 px (historique 191 px), la réponse se lit. Le test déplie « Mes objets » pour voir la carte `f` (`showCards`), puis `calc` le garde déplié : avec le bandeau « Tu regardes un atelier partagé » (~130 px, deux boutons), la console n'a plus que son en-tête (75 px, historique 0 px) et `innerText` de la réponse rend `""`. Geste ajouté : replier « Mes objets » (`leavePanelAlone`) avant `.domaine g` ; attendu inchangé. Remarque, pas écart : déplié + bandeau, la console est inutilisable au téléphone ; l'élève replie.
- **Revue `code-reviewer` (Sonnet)** : corrigés : seuil du dézoom > 400 gardé sur ordinateur, tests « 390 px » (#1442, #1546) rendus aux téléphones, `readClipboard` qui attend le collage (`try/finally`), « Signaler » masqué sur tout le contexte, `VERIFS_PROJETS` recalculé par le processus principal. Laissés : Échap sans équivalent au téléphone (noté ci-dessus), `showCards({ afterLoad })` attend 5 s sans objet, `calc` déplie toujours « Mes objets » (le repli n'est vérifié que par #1442 / #1546), motif `ordi-*` exige les trois moteurs, `--ui` ne voit qu'`ordi-chrome`, captures iPhone sans `openAtelier` (bouton Signaler et panneau replié visibles).
- **Adaptations des tests (gestes, jamais l'attendu)** : `showCards` / `leavePanelAlone`, `allowClipboard` / `readClipboard`, `gotoRedirected`, `ownTexts` (rendu MathLive en shadow DOM sous Chromium mobile), pas de la sous-grille au téléphone, dézoom ≥ 400, `@bureau` (raccourcis, clic droit, poignée, tests « ordinateur » ou qui posent eux-mêmes 390 px).

## Plan d'ensemble

1. Pilote Atelier (~20 lignes) → puis le reste des ~126 lignes Atelier.
2. Page à cocher avec captures (clair, sombre, téléphone) pour les ~73 lignes « à l'œil ».
3. Lignes prof / élève : en local, comptes de test (`db:seed-riche`) — jamais de mot de passe saisi en prod.
4. Ce qui reste vraiment manuel.

## Pilote — ce qui s'est passé (2026-10-25)

- **Lignes périmées, tranchées par David** : #1625 « `0.5*sqrt(2)` inchangé » (#1663 le veut `√2/2`) ; écritures de #1302 (`(ln(a) − 1)/2`, `S = {√a ; −√a}`) ; #1372 « pas de Comment ? » (la PR 2 l'a livré). Le test suit l'appli.
- **`.simplifier` (#1682, #1625)** : `ln(x)-ln(x)`, `1/x-1/x` → 0, `(0.5x+1)/(x+1)` → `(x+2)/(2x+2)`. Rejoué au commit de #1682 : déjà ainsi (`pedagogical-simplify` rend `null`, repli sur `simplify()`, inchangés depuis #1625). Les PR ont corrigé `tidy` = ligne de calcul, où tout reste écrit. Mis de côté par David.
- **Bug trouvé** : « Comment ? » de `.dériver (e^x)^2` (et `.dériver x*e^x` seul) ne s'ouvre pas, `each_key_duplicate` (deux étapes de même `id`) dans `GeneratedStepsCorrection`. Chantier à part (David) ; test #1674 laissé rouge.
- **Prod** : la suite tourne contre chiph.re (`VERIFS_URL`), mais la prod n'a pas encore `data-latex` → 19 rouges « réponse en texte », textes visibles conformes. Ligne ajoutée en tête de `verifications-manuelles.md`.
- `playwright.config.ts` ignore `verifs/**` (`pnpm test:e2e` ne les lance pas) ; la CI ne lance aucun e2e.

## Recommandations venues d'`environnement-workflow` (2026-11-23)

Écrites à la demande de David (« oui fais le ») à la clôture du chantier `environnement-workflow`
([journal archivé](../archive/environnement-workflow-progress.md)). Ce sont des recommandations de
cette session-là, que David a acceptées d'y voir notées ; le découpage reste à valider par lui à la
reprise.

- **Consigne de David du 2026-11-23** : limiter le plus possible les vérifications à la main ; la
  session vérifie elle-même ([tests.md](../pratiques/tests.md#vérifier-à-lécran-soi-même-avant-de-demander-à-david)).
  `docs/wip/verifications-manuelles.md` compte 418 lignes non cochées ce jour-là.
- **R6 — format iPhone et moteur de Safari dans `pnpm test:verifs`** : aujourd'hui un seul projet,
  Chrome sur grand écran (`playwright.verifs.config.ts`). Beaucoup de lignes disent « téléphone puis
  ordinateur » : sans ce format, leur moitié « téléphone » reste à David. WebKit est déjà installé
  (`pnpm voir` s'en sert).
- **R13 — vérifier la prod après chaque `pnpm deploy:prod`** : rejouer les tests sur `chiph.re`
  (`VERIFS_URL` existe déjà), résultat envoyé à David. Pages publiques seulement : une session
  n'entre aucun mot de passe réel.
- **R12 — notifications** (petite, peut se faire à part) : seulement ce qui demande un geste de
  David (« lien prêt », « question en attente ») ; pas « CI verte », la session merge seule.
- **Essayé à distance le 2026-11-23** : `VERIFS_PORT=<port> pnpm test:verifs` (barre de l'Atelier et
  carnet, 5 verts) depuis un worktree neuf, base locale remplie par `pnpm db:seed-riche`.
