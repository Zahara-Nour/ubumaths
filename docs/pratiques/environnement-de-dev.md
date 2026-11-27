---
couvre:
  - src/lib/server/email/capture.ts
  - src/lib/server/email/capture-index.ts
  - '.github/workflows/**'
  - .github/dependabot.yml
  - '.husky/*'
  - .lintstagedrc.js
  - vercel.json
  - src/env.ts
  - vite.config.ts
  - .nvmrc
  - .claude/settings.json
  - '.claude/hooks/**'
  - scripts/gros-process.sh
  - scripts/check-incremental.sh
  - scripts/cliquet-types-tests.ts
  - scripts/deploy-prod.sh
  - scripts/release.ts
  - scripts/lint-fast.sh
  - scripts/lint-fast-fichiers.sh
  - scripts/with-db-lock.sh
  - scripts/pile-de-dev.sh
  - scripts/pile-de-test.sh
  - 'scripts/pile-de-test/**'
  - scripts/ci-nature-changement.sh
  - scripts/ci-tests-contenu.sh
  - scripts/garde-migrations-horodatage.sh
  - scripts/vercel-ignore-build.sh
  - scripts/releve-web-vitals.ts
  - scripts/check-production-health.ts
  - scripts/side-effect-modules.ts
  - scripts/find-top-level-effects.ts
  - scripts/garde-dev-depot-principal.sh
  - scripts/surveillance-machine.sh
  - scripts/surveillance-machine-installer.sh
  - scripts/menage-machine.sh
  - scripts/machine-commun.sh
  - scripts/bilan-machine.sh
  - scripts/liberer-disque.sh
  - 'scripts/durees/**'
---

# Environnement de dev : la carte

> Ce qui est en place autour du code, pourquoi, et où lire le détail. C'est une **carte** : elle
> renvoie aux docs qui font foi au lieu de les recopier. Écrite le 2026-10-11.
> Tenue à jour par la garde `pnpm docs:check-a-jour` : modifier un fichier de l'en-tête `couvre:`
> réclame une mise à jour de cette page (liste dans `scripts/doc-a-jour.config.ts`).

## En une minute

```
worktree frère ──► commit ──► push ──► PR ──► CI (quality.yml) ──► merge sur main ──► … ──► pnpm deploy:prod ──► Vercel
                  pre-commit   pre-push         « CI Summary » vert     (ne déploie rien)    (David seul décide)   branche production
```

1. **Un chantier = un worktree frère** (`../ubumaths-wt-<sujet>`), une branche, une session.
2. **Commit** : husky lance `lint-staged` (oxlint + prettier sur les fichiers indexés, ~2 s) puis
   commitlint (header ≤ 100 caractères, conventional commits). Fichiers suivis sous `data/` (dossier
   du `.gitignore`) : lint-staged affiche « paths are ignored » mais le commit passe ; les indexer par
   `git add -u data/…`.
3. **Push** : le hook pre-push vérifie le formatage, `lint:fast`, les liens et renvois de la doc, la
   couverture doc, « code modifié ⇒ doc modifiée » et le filtre de chemins de l'intégration.
4. **PR → CI 100 % verte → `pnpm pr:merger <n>` (attend la CI, merge, range ; à la main : `gh pr merge --merge`) → branche supprimée.** Un merge sur `main` ne
   déploie **rien**.
5. **Mise en prod** : `pnpm deploy:prod`, **uniquement sur demande de David** (ADR 0021). Il crée la
   version, attend sa CI, puis avance la branche `production`, que Vercel construit.

Détail : [git-workflow.md](git-workflow.md) · [worktrees.md](worktrees.md) ·
[ADR 0021](../adr/0021-branche-production-mise-en-prod-manuelle.md).

## Local : Mac mini M6, 24 Go

**Un gros process à la fois.** `pnpm check`, `pnpm build`, `pnpm lint` et `check:incremental`
passent sous le même verrou noyau (`flock`, nom `typecheck`) via `scripts/gros-process.sh` ; tous les
`db:*` de la base de dev passent sous le verrou `supabase` (`scripts/with-db-lock.sh`), et
`test:integration` sous le verrou `supabase-test` (`scripts/pile-de-test.sh`). Les
trois sont partagés entre worktrees ; un second lanceur sort en **exit 2** en nommant le détenteur. Pas
de verrou en CI ni sur Vercel. Pourquoi et mesures : [worktrees.md](worktrees.md),
[mesures-mac-mini.md](mesures-mac-mini.md).

**Shell = zsh, pas bash.** Le shell de la machine, et donc celui des sessions Claude Code et de leurs
agents, est zsh : une variable non guillemetée n'est **jamais découpée en mots**. `F="a.sql b.ts";
git add $F` passe UN seul chemin, « a.sql b.ts », et le commit échoue (« pathspec did not match »).
Une liste de fichiers se met dans un tableau, `F=(a.sql b.ts); git add "${F[@]}"`, ou s'écrit en
entier ; pour découper une sortie de commande, `${=var}` ou `while read`. Pour attendre une CI,
`gh pr checks <n> --watch`, jamais une boucle maison qui découpe une chaîne (une boucle
`set -- $r` n'est jamais sortie, 2026-11-09).

**Typecheck du quotidien : `pnpm check:incremental`**, moteur **tsgo** (TypeScript 7) depuis le
2026-10-10 : ~18 s, ~20 s à froid (`FRESH=1`), au lieu de ~45 s / ~80 s. **La CI garde le moteur
classique** (`pnpm check`), qui fait foi : sur 1 812 erreurs comparées, les deux moteurs concordent
à 2 près, dont un vrai angle mort de tsgo (type des fonctions exposées d'un composant Svelte passé
à `render`). Rejoue le dernier verdict si rien n'a changé dans `src/`, `scripts/nuit/` (seul
dossier de `scripts/` lu par le `tsconfig.json`) ou les configs de la racine (`FORCE=1` pour
forcer). En-tête de `scripts/check-incremental.sh`.

**Cliquet des types des tests : `pnpm types:cliquet`.** `pnpm check` exclut les tests ; ce cliquet
les vérifie (tsgo), fichier par fichier, contre `tests/cliquet-types-tests.json`. **À 0 depuis le
2026-10-10** (#1047) : toute erreur de type dans un test fait échouer la CI (job « Types des tests »).
Un fichier qui perd des erreurs fait aussi échouer : `pnpm types:cliquet --maj` abaisse le cliquet.

**`pnpm lint:fast`** (~2,5 s) rejoue toutes les règles de niveau erreur d'eslint sans le service
TypeScript (`eslint.fast.config.js`), plus oxlint, la parité des variables d'environnement avec
`.github/ci.env` et la garde des `render` attendus. Eslint complet : 530 s en local.

**ESLint en CI** : sur une PR, le job Lint ne relit que les fichiers de code de la PR, plus les
`.svelte` qui importent un module qu'elle modifie ou supprime (`scripts/ci-lint-fichiers.sh`) ; tout
l'arbre prenait 19 à 24 min par PR. Les règles d'erreur ne lisent qu'un fichier, sauf
`svelte/no-unused-props`, qui lit le type des props, d'où ces importeurs. Il relit tout l'arbre quand
la PR touche la config ESLint, une règle maison, les dépendances, `.gitignore`, `vite.config`, un
`tsconfig`, un `.d.ts` ou `.nvmrc`, ou plus de 300 fichiers de code. Le filet :
`lint-nocturne.yml` relit tout l'arbre chaque nuit sur `main` et y enregistre le cache ESLint que
les PR restaurent (`main` ne lance pas le Lint sur push).

**Cache Prettier** : `prettier --check .` revérifie tout l'arbre en ~270 s sans cache, ~30 s avec. Une
PR ne restaure que son propre cache ou celui de `main`, et `main` ne lance pas le Lint sur push :
`lint-nocturne.yml` enregistre donc aussi ce cache sur `main` chaque nuit (comme la CI complète du
commit de version de `pnpm deploy:prod`). La clé porte les versions installées de Prettier, de ses
deux plugins et de Tailwind (`scripts/ci-cle-prettier.sh`), plus `.prettierrc` et `.prettierignore`.
Elle ne porte pas l'empreinte du lockfile entier, qu'une mise à jour de n'importe quelle dépendance
changeait : jusqu'à la mise en prod suivante, la première CI de chaque PR repartait à froid
(2026-11-23). Les quatre versions sont nécessaires : le cache de Prettier ne s'invalide de lui-même
que sur sa version, celle de Node et ses options, pas sur celle d'un plugin. Après une montée de l'un
des quatre, la première CI de chaque PR est froide jusqu'au nocturne suivant.

**Cache ESLint et config Svelte** : `eslint.config.js` retire `version` de la config Svelte qu'il
passe au parseur. SvelteKit y met `Date.now()` à chaque chargement ; ESLint compte la config dans
l'empreinte de son cache, qui changeait donc à chaque lancement : les ~1 300 fichiers Svelte étaient
relus à chaque fois, cache restauré ou non (Lint de la CI de version : 25 min le 2026-11-18). Une
valeur qui varie d'un lancement à l'autre ne doit pas entrer dans la config ESLint.

**Cache ESLint et version de Node** : l'empreinte compte aussi la version exacte de Node
(`process.version`). Avec `22` dans `.nvmrc`, chaque runner prenait le Node 22 de son image, et les
images de GitHub ne changent pas toutes en même temps : 22.23.4 sur l'une, 22.23.5 sur l'autre, et
tout l'arbre relu (nocturne du 2026-11-18 : 31 min, cache pourtant restauré). `.nvmrc` porte donc
la version exacte, montée à la main (Dependabot ne la lit pas) ; la monter vide le cache une fois,
jusqu'au nocturne suivant. `pnpm deploy:prod` attend jusqu'à 45 min la CI de version.

**Variables d'environnement lues par l'appli : `src/env.ts`.** Depuis SvelteKit 3, `$app/env/*` (et
`$env/*`, qui le réexporte) n'expose que les variables déclarées là (`defineEnvVars`) ; une
variable absente de la liste vaut `undefined`. Déclarée sans `schema`, elle est obligatoire : la
génération des modules échoue si elle manque, d'où la parité avec `.github/ci.env` ci-dessus.
`process.env` n'est pas concerné.

Ses fichiers (`scripts/lint-fast-fichiers.sh`) : à la main, ce qui diffère d'`origin/main` **plus
les fichiers non suivis** (un fichier tout neuf est relu avant son premier commit) ; au pre-push
(`--push`), **seulement les fichiers des commits qui partent**. Le dépôt principal est partagé : le
brouillon `.ts` non suivi d'une session y bloquait le push de doc de toutes les autres
(2026-10-18), alors qu'un fichier non suivi ne part pas et que la CI ne le voit pas.

**Hooks husky** (`.husky/`) :

| Hook         | Ce qu'il fait                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pre-commit` | `scripts/garde-deploy-en-cours.sh commit` : sur `main`, refuse le commit pendant un `deploy:prod` (verrou « deploy » tenu ; le script lui-même passe, par `DEPLOY_PROD_SOUS_VERROU`). Puis `scripts/garde-main-a-jour.sh` : sur `main`, refuse le commit si `origin/main` a des commits que le `main` local n'a pas (`git fetch` d'abord, laisse passer hors ligne). Puis `pnpm garde:donnees --staged` (`scripts/garde-donnees-sensibles.ts`) : refuse un secret ou une adresse courriel réelle dans les lignes indexées. Puis `pnpm lint-staged` (`.lintstagedrc.js`) : oxlint (`--fix` sur JS/TS, sans `--fix` sur `.svelte`) + prettier ; prettier seul sur json/md/css/html. Bloque sur une _erreur_ oxlint seulement. |
| `commit-msg` | commitlint, sur **toutes** les branches (les commits de branche arrivent tels quels sur main) ; règles locales `nom-interdit` (`scripts/noms-interdits.cjs`, noms lus hors du dépôt : [git-workflow.md](git-workflow.md#noms-interdits)) et `mention-outil` (`scripts/mentions-outil.cjs` : signature de co-auteur, trailer et lien de session).                                                                                                                                                                                                                                                                                                                                                                            |
| `pre-push`   | `scripts/garde-deploy-en-cours.sh push` (push vers `main` refusé pendant un `deploy:prod`) → `pnpm check:migrations` (horodatages des migrations neuves contre `origin/main`) → `pnpm format:check` (fichiers suivis seulement) → `lint:fast --push` (fichiers des commits poussés seulement) → `docs:check-links` → `docs:check-refs --strict` → `docs:check-a-jour --couverture` → `docs:check-a-jour --depuis origin/main` (seulement si le push emporte le commit courant : pas pour une suppression de branche, un tag ou une autre branche) → `check:integration-paths`. Tous bloquants.                                                                                                                              |

Le pre-push est le seul filet des commits de doc poussés directement sur `main`, que la CI de push
ignore. « Code modifié ⇒ doc modifiée » y bloque depuis le 2026-11-22, comme en CI depuis le 2026-10-26
(`docs:check-a-jour --depuis` ; 18 des 29 CI rouges d'une semaine en venaient) : modifier la doc, ou écrire la raison dans
un commit (`Doc-inchangée: …` / `Doc-reportée: …`). `--no-verify` n'a plus de raison d'être (le hook Claude le refuse).

⚠️ **Un worktree sans `pnpm install` n'a AUCUN hook** : husky s'installe par le script `prepare`.
`.env` et `node_modules` ne suivent pas non plus le worktree ([worktrees.md](worktrees.md)).

**Ports.** 5173 = le serveur de David, jamais touché · 5176 et suivants = worktrees. ⛔ **Aucun serveur de dev
dans le dépôt principal** (cf. [claude-md-pourquoi.md](claude-md-pourquoi.md#commandes)). Toujours `pnpm dev --port <n> --strictPort` (sans `--` : il ferait ignorer le port).
`pnpm kill:servers` est interdit depuis un worktree (il tue 5173 et Supabase).

**Garde de `pnpm dev`** : `scripts/garde-dev-depot-principal.sh` passe devant `vite dev` et refuse de
démarrer dans le dépôt principal (pas en CI). Un `pnpm dev` qui sort en ⛔ = se mettre dans un worktree.

**Surveillance du Mac mini** (après le gel du 2026-11-19) : `scripts/surveillance-machine.sh`, lancé
toutes les 5 min par launchd (`pnpm surveillance:installer`, `--desinstaller` pour la retirer). Que faire à chaque
alerte, et toutes les commandes : [alertes-machine.md](alertes-machine.md). Les plists écrits par l'installation échappent leurs chemins
(XML) et passent le dépôt en argument de `bash -c` ; `SURVEILLANCE_SANS_LAUNCHCTL=1` les écrit sans
les charger (test : `scripts/__tests__/surveillance-installer.test.ts`).

- serveur de dev dans le dépôt principal de Chiphre → **arrêté**, et signalé (jamais celui d'un worktree ni d'un autre projet) ;
- processus de test **orphelins** (vitest, svelte-check, tsgo, navigateur de Playwright dont le
  parent est mort depuis plus de 30 min : session fermée, terminal quitté) → **fermés**, et signalés
  par programme (« Playwright × 3 (le plus vieux : 10 j) »). Personne ne lira plus leur résultat ;
  un test dont la session vit encore n'est jamais touché ;
- serveur de dev de plus de 1,5 Go ou de plus de 6 h, Chrome au-delà de 600 % de CPU ou de 60
  onglets, swap au-delà de 85 % → **signalés seulement** (seuils en tête du script) ;
- **processus emballé, quel qu'il soit** (plus de 90 % de CPU et plus d'une heure de CPU cumulée :
  extension, processus graphique de Chrome — 12 jours à 100 % le 2026-11-22 —, autre programme),
  deux passages de suite → **signalé seulement**, nommé par son rôle (« Chrome (processus graphique) emballé ») ; un
  programme hors de la liste des programmes connus devient « un processus » (jamais le nom d'un
  projet) ; pid au journal, `kill <pid>` (un navigateur relance son processus) ;
- **programme bloqué** : au moins 3 processus morts depuis plus de 10 min qu'il ne ramasse plus
  (Chrome le 2026-11-22, Brave le 24 : « Quitter » sans réponse), deux passages de suite → **signalé** (« Brave ne
  répond plus ») ; le relancer, de force s'il le faut ;
- **vieilles sessions Claude** : 10 ou plus ouvertes depuis plus de 7 jours → **signalé**, au
  plus une fois par jour (elles gardent leur contexte en mémoire et remplissent le swap) ;
- signalement = notification ntfy.sh sur l'iPhone (canal aléatoire dans
  `~/.config/surveillance-machine/ntfy-topic`, message sans chemin ni nom de projet) + journal
  `~/.local/state/surveillance-machine/journal.log` ; même alerte renvoyée au plus une fois par heure.
- swap au-delà de 95 % (gel proche) → **ménage automatique** (au plus une fois par quart d'heure),
  résumé dans la notification ;
- moins de **15 Go libres** sur le volume des données (`/System/Volumes/Data`, pas `/` qui ne
  montre que le système) → **signalé** ;
- **disque qui fond** : plus de 5 Go perdus en 24 h (Go libres d'il y a 20 à 24 h dans
  l'historique, face à maintenant ; Mac éteint ou endormi dans cette fenêtre : rien ce jour-là) →
  **signalé**, au plus une fois par jour ;
- **« RAS » quotidien** : au premier passage après 9 h, une notification (charge, swap, disque) qui
  prouve que la surveillance tourne, même un jour d'alertes ; Mac endormi à 9 h → au réveil. Il
  ajoute « · N worktrees en danger » quand des worktrees portent des fichiers non commités ou des
  commits poussés nulle part, intouchés depuis 7 jours (dépôt principal exclu) ; les noms :
  `pnpm surveillance:worktrees` (jamais dans la notification) ;
- **redémarrage** du Mac → **signalé** (« Le Mac a redémarré le 20/11 à 3 h 12 »), avec « (plantage
  du système) » si un rapport de plantage de macOS est apparu depuis le démarrage précédent. La
  surveillance ne tourne qu'une fois la session ouverte : l'heure donnée est celle du redémarrage ;
- charge au-delà de 36 (3 × 12 cœurs) deux passages de suite, pression mémoire de macOS « tendue »
  ou « critique » → **signalées**, avec les 3 programmes qui prennent le plus (CPU pour la charge,
  mémoire pour la pression et le swap ; noms de programmes seulement, jamais de chemin) ;
- **historique** : une ligne par passage dans `~/.local/state/surveillance-machine/historique.csv`
  (charge, pression, swap, CPU de Chrome et Brave, serveurs de dev, processus Claude, Go libres du
  disque), 14 jours gardés ; colonnes changées → l'ancien fichier devient `historique-ancien.csv`. Après un gel : `pnpm surveillance:historique` (2 dernières heures) ;
- `pnpm surveillance:essai` : ce qu'elle ferait maintenant, sans rien arrêter, envoyer ni écrire.

**Bilan du Mac mini** : `pnpm machine:bilan` (`scripts/bilan-machine.sh`) affiche l'état de la
machine en une page, à la demande, sans rien arrêter, envoyer ni écrire : charge, mémoire
(pression, compressée, swap), programmes qui prennent le plus de mémoire et de CPU, **processus
emballés** (n'importe quel processus à plus de 90 % de CPU avec plus d'une heure de CPU cumulée,
nommé par son rôle : « Chrome (processus graphique) »), **parent qui ne ramasse plus ses processus
morts** (3 ou plus : le programme ne répond sans doute plus — Chrome le 2026-11-22), navigateur
ouvert depuis plus de 7 jours, sessions Claude par âge, serveurs de dev (port, worktree, âge,
mémoire), processus de test orphelins, disque libre, volume Preboot au-delà de 10 Go (mise à jour de
macOS préparée), nombre de worktrees, Time Machine, et la tendance des 24 dernières heures tirée de
l'historique de la surveillance. Affichage local : les noms de worktree y figurent.

**Durées de la CI, des PR, de la mise en prod et du Mac mini** : `pnpm durees` (`scripts/durees/`),
pour voir une phase devenue nettement plus lente que la normale.

- **référence** : `scripts/durees/reference.json`, la durée normale de chaque phase en secondes (CI
  entière d'une PR de code, ouverture → merge d'une PR à un seul push, chaque job de `quality.yml`,
  les étapes svelte-check et Prettier, la suite d'intégration entière, les étapes de la mise en
  prod, les commandes du Mac mini) et la date `depuis` avant
  laquelle aucune mesure n'est lue. **David seul la change**, par `pnpm durees --reference
[--depuis AAAA-MM-JJ]` après un changement voulu, puis une PR ; jamais d'ajustement automatique
  (une lenteur installée deviendrait la normale). Une phase n'y entre qu'avec 5 mesures et 20 s
  (5 s pour une commande du Mac mini : `check:incremental` en dure 18). `pnpm pr:merger` et
  `test:integration` du Mac mini n'y entrent jamais : le tableau les montre en « simple
  information », sans alerte (l'attente de la CI et la suite d'intégration sont déjà surveillées
  côté CI) ;
- **mesures** : jobs et étapes des exécutions de `quality.yml` sur les PR, lus chez GitHub (une
  exécution finie est gardée dans `~/.local/state/durees/runs-v1/`, seules les nouvelles sont lues).
  Une exécution où un job est sauté (PR de contenu) ne compte pas : elle ferait baisser la médiane.
  Mise en prod : `pnpm deploy:prod` note la CI de la version, la construction Vercel et la bascule
  du site dans `~/.local/state/durees/mises-en-prod.csv` (rien avec `--verifier`, ni pour une CI
  relancée) ;
- **tests d'intégration** (`nightly-integration.yml`, lus chez GitHub) : seule une **suite entière**
  compte, c'est-à-dire 4 morceaux qui ont tous joué leurs tests, sans liste de tests retenus (étape
  « Tests de migration de données laissés de côté » jouée dans le job de portée), première
  tentative verte. Une PR
  qui ne joue que les tests touchés (un morceau), ou aucun (passage déjà vert, aucun test atteint),
  n'est pas une mesure ; une exécution lancée à la main non plus. Deux phases : la nuit (tous les
  tests) et sur une PR (sans les tests de migration de données) ;
- **Mac mini** : `check:incremental`, `test:server`, `test:client`, `test:integration`, le pre-push
  et `pnpm pr:merger` notent leur durée dans `~/.local/state/durees/local.csv`
  (`date;commande;secondes`, par `scripts/durees/noter.sh`), seulement quand ils sont **verts et
  ont tout joué** : pas un rejeu de `check:incremental`, pas un test lancé avec un chemin ou une
  option (`scripts/durees/chrono.mjs` lance alors la commande telle quelle), pas un pre-push qui
  n'emporte pas le commit courant (suppression de branche, tag), pas un `pr:merger` qui ne fait
  que ranger. `pr:merger` compte l'attente de la CI. Rien n'est noté en CI, sur Vercel, ni
  depuis un test ; une note impossible à écrire n'arrête jamais la commande. Ces durées dépendent
  de la charge de la machine ;
- `pnpm durees` : le tableau, référence, médiane des dernières 24 heures et des 7 derniers jours ;
- **tâche de nuit** : chaque nuit à 2 h, launchd lance `pnpm nuit --lancer` (même installation) :
  preuves des écarts, `test:verifs:tout`, gardes de doc, dans son propre worktree →
  [tache-de-nuit.md](tache-de-nuit.md) ;
- **alerte** : chaque matin à 6 h 40, launchd lance `pnpm durees --releve` depuis le dépôt principal
  (installé par `pnpm surveillance:installer`, journal `~/.local/state/durees/launchd.log`).
  Médiane du jour d'au moins 1,5 fois la référence sur au moins 5 mesures → notification par le
  canal de la surveillance ; rien sinon. Une seule PR lente ne déclenche rien. Mise en prod et
  suite d'intégration de la nuit (une par jour au plus) : les 5 dernières, et seulement s'il y en
  a eu une dans la journée. `--releve --essai` : affiche sans
  envoyer.

**Libérer de la place sur le disque** (sans redémarrer) : `pnpm disque:liberer` (`--essai` pour voir
sans rien supprimer), `scripts/liberer-disque.sh`. Supprime seul les images Docker sans conteneur (seulement si la pile Supabase tourne : arrêtée, ses images
seraient effacées), le cache et les anciennes versions de Homebrew, les restes de mises à jour de VS Code, les versions de Claude Code ni actuelle, ni la plus récente, ni
utilisées par une session ouverte (lien de `claude` illisible : aucune), les paquets du magasin pnpm qu'aucun projet n'utilise ; affiche
la commande de chaque étape et ce qu'elle a rapporté. Liste seulement, avec la commande à taper :
les worktrees finis (branche qui a reçu des commits, tous dans `origin/main`, rien de modifié, aucun
processus dedans ; un worktree tout neuf n'est jamais « fini »), le cache
de Brave, la mise à jour de macOS préparée (redémarrage), les sessions Claude de plus de 7 jours.
Jamais lancée par la surveillance : l'alerte disque la propose.

**Ménage quand la charge est trop grande** : `pnpm menage` (`--essai` pour voir sans rien fermer),
`scripts/menage-machine.sh`. Ferme les onglets Chrome et Brave au-delà de 20 % de CPU (le navigateur
reste ouvert, l'onglet se recharge d'un clic ; épargnés : les extensions et le Chrome for Testing de
Playwright) et arrête les serveurs de dev de Chiphre lancés depuis plus de 6 h ou dans le dépôt
principal (jamais ceux d'un autre projet, ni le serveur de test de David sur le port 5173), et ferme
les processus de test orphelins (même règle que la surveillance). À distance : demander
« fais le ménage » à n'importe quelle session.

**Tester depuis le MacBook ou l'iPhone (Tailscale)** : [tester-sur-un-autre-appareil.md](tester-sur-un-autre-appareil.md)
(`pnpm lien` : lien HTTPS du tailnet et QR code en une commande ; tunnel SSH et `--host` en secours ;
cookie `Secure`, Supabase local, limiteur de connexion). En dev sur la base locale, le serveur de dev
relaie Supabase local sous `/__dev/supabase` (plugin `supabaseRelay` de `vite.config.ts`) et accepte
les noms du tailnet : `pnpm dev` se lance sans variable, un seul port se publie.

**Voir une page sans écran** : [voir-une-page.md](voir-une-page.md) (`pnpm voir <page>` : image au
format iPhone, erreurs de console, requêtes en échec, dans `.captures/voir/`).

**Prévenir David qu'une session l'attend** : [prevenir-david.md](prevenir-david.md) (`pnpm prevenir lien | question | geste "…"`,
notification sur l'iPhone ; seulement quand la session s'arrête pour un geste de lui).

**Retour envoyé depuis la page** : [signaler-depuis-la-page.md](signaler-depuis-la-page.md) (bouton
« Signaler » du serveur de dev, lu par `pnpm retours` : note, page, écran, compte, erreurs de console).

**Supabase local.** Deux piles pour tout le dépôt : celle de **dev** (ports 54321-54329, `project_id`
`ubumaths`, verrou `supabase`) et celle de **test** (ports 5532x, `project_id` `ubumaths-test`, verrou
`supabase-test`). `pnpm test:integration [fichier]`, `test:integration:watch` et `test:definer-guard`
tournent sur la pile de test, jamais sur la base de dev : la commande la démarre si elle est arrêtée,
joue les migrations de la branche qui lui manquent, et la **reconstruit de zéro** (environ 35 s) si
elle porte la migration d'une autre branche, une migration modifiée depuis son passage, ou si le seed,
`config.toml` ou la version de la CLI ont changé ; une migration en échec arrête tout avant les tests.
Elle est construite comme celle de la CI (migrations + seed simple, mêmes services) et reste allumée
après les tests (environ 0,7 Go) : `pnpm db:test:stop` l'arrête, `pnpm db:test:reset` la reconstruit.
Lancée sans ce lanceur (`vitest --config vitest.integration.config.ts`), la suite refuse de tourner. En
CI (`GITHUB_ACTIONS`), une seule pile, celle du workflow (`scripts/pile-de-test/`). CLI = devDependency exacte, lancée par `pnpm db:*` ou `pnpm exec supabase`.
**Versions des services : celles de la CI, partout.** `pnpm db:start`, `db:stop` et `db:reset` lancent
la CLI par `scripts/pile-de-dev.sh`, sur un dossier miroir (`node_modules/.cache/pile-de-dev`, des
liens vers tout `supabase/` sauf `.temp`). Sans lui, la CLI imposerait à la pile de dev les versions
de la prod que `supabase link` écrit dans le dossier `.temp` de `supabase/` (`postgres-version`, `rest-version`,
`storage-version`…) : le dépôt principal, seul à avoir ce dossier, tournait sur d'autres images que
la CI et les worktrees, et ne se reconstruisait plus avec le Postgres de la prod. Ce dossier `.temp`
n'est pas touché (`db:migrate` y lit `project-ref`), et un nouveau `pnpm db:link` ne change rien à la
pile de dev. Le hook refuse `pnpm exec supabase start`, `stop` et `db reset` lancés à la main (sauf
avec `--workdir`, copie isolée). Une pile déjà démarrée garde ses images : `pnpm db:stop` puis
`pnpm db:start` pour en changer (les données restent).
**Remise à neuf : `pnpm db:neuf`** (rare, environ une minute et demie). Elle efface la base de dev, la
reconstruit, puis la remplit avec le contenu de la prod (lu en lecture seule) et **30 élèves fictifs** :
aucune ligne d'un utilisateur autre que le prof ou l'admin n'est copiée, **jamais de données d'élèves
en local** (`scripts/db-seed-riche/index.ts`). Un seul verrou `supabase` du début à la fin
(`scripts/db-neuf.sh`) ; elle vérifie que la prod répond **avant** d'effacer, démarre la pile si elle
est arrêtée, et demande de taper « oui » (la base est partagée par toutes les sessions ; `--oui` pour
un script, refus sans terminal ni `--oui`). Si le remplissage échoue après l'effacement, la base est
reconstruite sans le contenu de la prod : `pnpm db:seed-riche` le remet. `db:reset` et `db:seed-riche`
restent utilisables seuls. La pile de test n'est pas concernée.
**Chaque table du schéma est classée** dans une des trois listes de `scripts/db-seed-riche/regles.ts` :
`COPIE` (contenu, copié depuis la prod), `INVENTE` (ce qui touche un élève : jamais copié, inventé
pour les élèves fictifs) ou `JAMAIS` (traces, secrets, liens vers l'extérieur : laissé vide). Le test
`scripts/__tests__/db-seed-riche.test.ts` lit `src/lib/types/database.ts` et échoue quand une table
n'est dans aucune liste, ou quand une table copiée pointe vers une table qui ne l'est pas : **après un
`pnpm db:types` qui amène une table nouvelle, la classer** (dans le doute : `JAMAIS`). Après la copie,
le seed vérifie lui-même chaque lien des tables copiées : une ligne orpheline annule toute la copie.

**Images du contenu** (`scripts/db-seed-riche/images.ts`) : les fichiers des 4 compartiments publics
du contenu (`question-images`, `exercise-images`, `vip-card-images`, `parody-evaluations`, ~15 Mo)
sont copiés dans le stockage local, et l'adresse de la prod écrite dans le contenu copié (exercices,
cartes VIP) devient l'adresse locale : aucune page locale ne lit une image sur la prod. Le dossier du
prof de la prod devient celui du prof local ; un chemin qui garderait un identifiant de la prod n'est
pas copié. Une relance ne retélécharge que les fichiers absents ou de taille différente. Les pièces
jointes, captures de signalements et documents de chapitre (`COMPARTIMENTS_JAMAIS`) restent vides ;
`scripts/__tests__/db-seed-images.test.ts` échoue quand un compartiment créé par le dépôt n'est dans
aucune des deux listes. Copie isolée de la pile : `SEED_RICHE_API_URL` (adresse de son API) à côté de
`SEED_RICHE_PG_URL`.

**Ce que font les élèves fictifs** : ils sont rangés dans les classes de l'année en cours (6 par
classe), avec le niveau de leur classe sur leur profil, et leur activité est inventée par quatre plans
purs, testés sans base : `activite.ts` (fiches assignées, Gidouilles, discussion, amitiés),
`suivi.ts` (évaluations passées, entraînement, révisions, Python, devinettes, signalements,
exercices, compétences), `jeux.ts` (démineur et son tournoi en cours, 2048, Mathémo, succès,
Palotins, cartes VIP dont une demande d'activation qui attend le prof) et `echanges.ts` (messagerie
du prof, réactions et modération de la discussion, tuteur aux réponses écrites à l'avance, annonces
du prof, marché ouvert aux classes actives, consentements parentaux, carnet de liaison de la première
classe avec de faux parents en `@example.test`, élèves en attente d'activation, cahier de texte,
liens de partage dont un expiré, tableau de tâches du prof, signalements de bug). Rien n'est envoyé :
aucune fonction de courriel n'est appelée. Un consentement accordé passe par `grant_parental_consent`,
un échange entre amis conclu par `execute_trade` (qui déplace les cartes). Le seed publie aussi une
devinette inventée au nom du prof local. Les points, gains et succès des jeux suivent les règles
recopiées des fonctions de l'appli ; le journal des récompenses se remplit seul (déclencheurs). La
mémoire des Mathoux est écrite par la vraie règle de l'appli sur les points acquis (`mathoux.ts`) :
la liste d'une classe, côté prof, n'en compte pas d'autre ; quelques décorations sont achetées par la
fonction d'achat de l'appli. Les copies d'évaluation et les
réponses saisies sont de **vraies questions**, tirées et corrigées par le moteur de l'appli
(`moteur.ts`). L'état des points du programme et la maîtrise Python ne sont pas écrits : la base les
calcule à l'insertion, comme en vrai. Trois élèves servent de repères : le premier de la classe la
plus remplie réussit tout, le dernier de cette classe n'a rien fait (dernière visite il y a plus de
trois semaines), et l'élève hors classe n'a qu'une fiche à son nom. Relancer le seed remplace tout ce
que le prof local a assigné (fiches, exercices, Python, devinettes) ; ses paquets de révision faits à
la main restent. Rien n'est inventé pour Navadra (entrée masquée), la Descente de la Vistule (pas
encore branchée) ni la boutique d'avatars (catalogue vide).
`pnpm db:a-jour` joue les migrations qui manquent à la base locale **sans rien effacer** ; `pnpm dev`
le fait tout seul avant de démarrer (`scripts/db-a-jour-auto.sh` : migrations d'`origin/main`
seulement, jamais bloquant). `db:seed-riche` met la base à jour avant de copier et la marque
« contenu de la prod » (`base_locale.etat`, local seulement) : `db:a-jour` note alors comme faites,
sans les jouer, les migrations de contenu déjà passées en prod (`scripts/db-a-jour/`).

**Claude Code** ([.claude/README.md](../../.claude/README.md)) :

- `.claude/settings.json` : liste `ask` (commandes qui perdent du travail : `git reset`, `rebase`,
  `clean`, `restore`, push forcé, `rm`, `mv`…), **seule source** de ces confirmations. Revue le
  2026-10-10 et gardée en entier.
- `.claude/hooks/garde-commandes.py` (PreToolUse sur Bash) : refuse les interdits qui dépendent des
  arguments ou du dossier (port 5173, `pnpm dev` sans `--strictPort`, `kill:servers` depuis un
  worktree, CLI Supabase directe, `--no-verify` au commit comme au push, `pnpm release` seul,
  `tsc --noEmit`, `svelte-check` nu, `git -C ""`, `2>/dev/null` sur `git add`, suppression de
  branche chaînée à `gh pr merge`, `pull --rebase` d'une autre branche sur une branche déjà
  poussée, merge par `gh api` — `…/pulls/<n>/merge` en écriture, `…/merges`, mutation GraphQL
  `mergePullRequest`) et demande confirmation pour un `--force` ou un `-D` placé n'importe où.
  Sur `main` (partagé par toutes les sessions) : refuse un pull qui fusionne, un merge non
  fast-forward, `git add -A` / `.`, `git commit -a` ; pendant un `deploy:prod` (verrou « deploy »),
  refuse `gh pr merge` et les commits ou pushes vers `main`
  ([git-workflow.md § 2](git-workflow.md#2-le-dépôt-principal-partagé)). Il ne juge qu'une commande
  écrite, à son lancement : les hooks git `pre-commit` et `pre-push`
  (`scripts/garde-deploy-en-cours.sh`) refusent aussi, au moment même, tout commit sur `main` et
  tout push vers `main` pendant le `deploy:prod`, quelle qu'en soit la forme.
  `deploy:prod` n'y est plus soumis (décision de David, 2026-10-10) : la règle vit dans CLAUDE.md.
- Agents : [.claude/agents/README.md](../../.claude/agents/README.md). Skills du projet
  (`.claude/skills/`) et skills personnels (`~/.claude/skills/`) : [skills-claude.md](skills-claude.md).

### Courriels en local : capturés, jamais envoyés

`.env` porte la clé Brevo de prod. Sur la **base locale** (adresse Supabase `localhost`,
`127.0.0.1` ou le Mac mini par le tailnet `*.ts.net`, hors Vercel), `sendEmail` n'appelle pas Brevo : chaque courriel est écrit dans
`.captures/courriels/` (ignoré par git), un `.html` à ouvrir dans le navigateur (et un `.txt`),
plus une ligne dans `index.jsonl` (date, destinataire, sujet, fichier, en-têtes). Les tests
Playwright lisent l'index par `readCaptureIndex` (`src/lib/server/email/capture-index.ts`, sans
`$env`, donc importable hors SvelteKit) et suivent les liens des courriels :
`e2e/verifs/carnet.spec.ts` rejoue ainsi les vérifications manuelles du carnet de liaison. Les
gabarits écrivent l'adresse de la prod (`https://www.chiph.re/...`) : le test n'en garde que le
chemin. L'appli voit un envoi réussi, et le service
de courriel compte comme configuré même sans clé. `EMAIL_ENVOI_REEL=1` dans `.env.local` envoie
pour de vrai ; `EMAIL_CAPTURE_DIR` change le dossier. Base distante (worktree sans `.env.local`)
→ envoi réel. Le dossier ne se vide jamais seul. Code : `src/lib/server/email/capture.ts`,
`src/lib/server/email/capture-index.ts`.

## GitHub

| Workflow                    | Déclencheur                                                           | Rôle                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `quality.yml`               | toute PR sur main ; push sur main hors doc pure ; manuel              | **La CI** : lint (+ gardes CSS, barils, doc, données sensibles, `render`), typecheck classique, types des tests, build (+ garde chunk < 100 Ko, Safari ; garde `light-dark()` intact ; outils du serveur de dev absents du build : bouton « Signaler », comptes fictifs), tests serveur (4 shards) et client (2 shards), audit, garde SECURITY DEFINER → **CI Summary**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `nightly-integration.yml`   | chaque nuit 02:17 UTC ; PR touchant la base ou ce qu'atteint la suite | `test:integration` contre un Supabase local ; job `paths-filter` qui vérifie que le filtre suit les imports. PR qui n'ajoute qu'une migration de rangement (`*rangement*.sql`) avec son test, ou une migration de contenu de publiés (`*_contenu.sql`) avec sa fixture `contenu-publie/`, des JSON de modèles et de la doc : seuls ses tests tournent (`scripts/ci-integration-ciblee.sh`). PR qui ne modifie que du code (`src/`), de la doc et des tests d'intégration : seuls tournent les tests dont les imports atteignent un fichier modifié (fichiers chargés en lot par `import.meta.glob` compris, même sous `docs/`), plus les tests de la PR ; aucun atteint → morceau vert sans démarrer la stack ; une seule stack jusqu'à 40 tests (`scripts/ci-integration-touches.ts`, fermeture par test de `check-integration-paths.ts`) ; fichier atteint par le global-setup, `src/env.ts`, fichier supprimé ou outillage → suite complète. Autres PR : les tests marqués `@migration-de-donnees` sont laissés de côté, sauf ceux que la PR touche (`scripts/ci-integration-exclusions.sh`, garde `pnpm check:migrations-de-donnees`). Push d'une PR dont l'empreinte (fichiers du filtre sur le commit de merge + portée) a déjà eu un passage entièrement vert : morceaux verts sans relancer les tests (`scripts/ci-integration-empreinte.sh`, job `memoriser`, cache de la PR) ; jamais la nuit ni à la main. « Re-run all jobs » d'un tel passage saute aussi les tests : pour les forcer, lancement à la main (sur la branche, pas le commit de merge) ; un test instable vert une fois reste gardé, la nocturne est le filet. Jamais check obligatoire. |
| `nightly-pyodide.yml`       | chaque nuit 03:00 UTC ; manuel                                        | tests Pyodide réels (`*-real.svelte.test.ts`), exclus de la CI.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `codeql.yml`                | push sur main hors doc et hors commit de version ; lundi 04:00 UTC    | analyse de sécurité `security-extended`. Pas sur les PR : il bloquait l'auto-merge sans être requis.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `production-health.yml`     | chaque jour 06:00 UTC ; manuel                                        | appelle les pages publiques du sitemap lu sur la branche `production`, celle qui est en ligne (`scripts/check-production-health.ts`), ouvre / commente / referme l'issue « Pages publiques en échec ».                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `web-vitals.yml`            | le 1er du mois 06:00 UTC ; manuel                                     | relevé de nos mesures de performance sur 28 j (`scripts/releve-web-vitals.ts`, qui appelle `GET /api/web-vitals/releve`) publié en issue « Core Web Vitals — relevé AAAA-MM ».                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `release.yml`               | push d'un tag `v*`                                                    | publie la GitHub Release, notes tirées du CHANGELOG.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `dependabot-auto-merge.yml` | PR de Dependabot (`pull_request_target`)                              | active l'auto-merge (merge commit) des montées patch et mineures ; les majeures restent à relire. Durci le 2026-10-11 : auteur de la PR et dépôt d'origine vérifiés, `fetch-metadata` épinglé par SHA.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `bundle-analyze.yml`        | manuel                                                                | build `ANALYZE=1`, treemap du bundle en artefact.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

- **CI allégée sur main** (2026-11-01) : sur un push de main, seuls Type Check et Build tournent ;
  le reste a tourné sur la PR (« skipped » compte comme réussi). Le passage complet a lieu sur le
  commit de version `chore(release): …` de `pnpm deploy:prod`, que le script attend avant d'avancer
  `production`. Avant : 89 merges en un jour relançaient chacun ~15 jobs, pour 20 jobs simultanés au
  plus sur le dépôt ; main occupait les trois quarts des runners et les PR attendaient.
- **Porte de la CI** (2026-11-01) : le job « Porte de la CI » vérifie d'abord les horodatages des
  migrations (aucun doublon ; `scripts/garde-migrations-horodatage.sh` contre `origin/main`). S'il
  échoue, tous les jobs lourds sont sautés et « CI Summary » rougit en ~20 s, au lieu de 15 jobs
  pour un rouge certain (main cassée par `20261101215000` en double avait saturé la file des runners).
- **PR de contenu seul** : modèles de questions (`scripts/questions/**/*.json`), doc, `.md` hors
  `src/`, `static/`, `data/` (`scripts/ci-nature-changement.sh`) → typecheck, types des tests, build,
  audit, garde SECURITY DEFINER et tests client sautés (« skipped » compte comme réussi pour les
  checks exigés). Le Lint tourne sans ESLint. Les 4 jobs de tests serveur (checks exigés) restent,
  mais le shard 1 ne lance que les tests qui lisent `scripts/questions` (liste calculée par
  `scripts/ci-tests-contenu.sh` d'après le chemin écrit dans leur source ; liste vide = échec), et
  les shards 2-4 s'arrêtent aussitôt. ~6 min de runner au lieu de ~30 par PR de contenu (2026-11-02).
  Un test qui lirait les modèles sans écrire `scripts/questions` dans sa source échapperait au tri :
  garder ce chemin en clair.
- **CI de main jamais annulée** (chaque commit de main doit avoir son verdict, `deploy:prod` cherche
  le dernier vert) ; sur une branche, un
  run périmé est annulé par le suivant.
- **Règle de merge** : CI 100 % verte (« CI Summary » et les checks exigés par la protection de
  `main`), merge commit (`--merge`), branche supprimée seulement une fois l'état `MERGED` vérifié.
  La branche `production` est protégée : ni force-push, ni suppression.
- **Dependabot** (`.github/dependabot.yml`) : npm et GitHub Actions, **mensuel** (lundi 06:00 Paris),
  5 PR au plus ; patch + mineures groupées en une PR, chaque majeure à part.
- **Délai de 3 jours avant toute nouvelle version** (2026-10-11) : `cooldown` de Dependabot et
  `minimumReleaseAge` de pnpm (`pnpm-workspace.yaml`). Une version piégée est presque toujours
  retirée en quelques heures. Correctif urgent plus récent : `minimumReleaseAgeExclude`.
  ⚠️ pnpm 12 vérifie **aussi le lockfile** contre ce délai, même avec `--frozen-lockfile` : une
  version de moins de 3 jours entrée dans `pnpm-lock.yaml` fait échouer l'installation partout
  (CI, worktrees, Vercel). Mesuré le 2026-10-11 : `mathlive@0.111.1` (#1081) a cassé
  l'installation de `main`, débloquée par une exception datée.
- **Versions retenues exprès** (2026-10-12) — ne pas les monter sans relire la raison :
  `prettier` 3.9.9 et
  `prettier-plugin-svelte` 4.1.1 **exactes** (#1179) : une montée reformate des centaines de
  fichiers, elle se fait dans sa propre PR. `typst` reste en 0.6.1-rc5 tant qu'aucune nouveauté
  n'est nécessaire. Une PR Dependabot qui touche l'une d'elles échoue en CI ou se ferme.
- **Paquets de la config ESLint** (`typescript-eslint`, `eslint-plugin-svelte`, `globals`) : leur
  montée invalide tout le cache ESLint, donc relecture de tout l'arbre à froid en CI (au-delà de 30 min sur #2537 et
  #2577) ; le job Lint a 60 min. `typescript-eslint` n'est plus épinglé depuis la 8.72.1 : le faux
  positif `$bindable` de la 8.71.1 (sveltejs/eslint-plugin-svelte#1607) est corrigé dans
  `svelte-eslint-parser` 1.10.
- **Routines cloud claude.ai** (agents sur cron, gérées sur claude.ai/code/routines) : tri des CI
  échouées chaque nuit (03:30 UTC, PR `ci-fix/*` ou issue), audit sécurité / dépendances le lundi (PR
  `deps/security-audit-<date>`), scan de secrets quotidien (issue sans valeur en clair), hygiène des
  PR et branches le vendredi (lecture seule, une issue). Jamais de push sur `main`. **Limite : pas de
  secrets en cloud**, ni connecteurs MCP : tout ce qui demande un jeton (base, Vercel) reste en local
  ou en GitHub Action.
- **Jeton `gh` local** : il lui faut le droit `workflow` pour merger une PR qui touche
  `.github/workflows/`.
- **Secret `WEB_VITALS_RELEVE_TOKEN`** (Action `web-vitals.yml`) : même valeur que la variable
  d'environnement de production du même nom sur Vercel ; il n'ouvre que
  `GET /api/web-vitals/releve` ([core-web-vitals.md](core-web-vitals.md#le-relevé-mensuel)).
  L'ancien secret `VERCEL_TOKEN` ne sert plus à ce workflow.

## Vercel et Supabase

**Vercel, plan Hobby.**

- Seule la branche `production` déploie (`git.deploymentEnabled` de `vercel.json`), avancée par
  `pnpm deploy:prod` (`scripts/deploy-prod.sh`) : dernier commit de main vert → `pnpm release`
  (numéro, CHANGELOG, tag, via `commit-and-tag-version`) → CI de la version → avance rapide de
  `production`. Jamais de mise en prod automatique (ADR 0021). `--essai` montre ce qui partirait.
- **Avant de créer la version** (et avec `--essai`) : le script lit les migrations jouées en prod
  (`supabase migration list --linked`, lecture seule) et les compare à celles du commit à livrer.
  Une migration pas encore jouée arrête tout, en nommant le fichier : le code livré pourrait dépendre
  d'une colonne que la prod n'a pas. Une migration destructive, qui se joue après la mise en prod,
  passe par `--migration-apres <horodatage>` (répétable ; un horodatage qui n'est pas en attente
  arrête aussi) et le script rappelle de la jouer à la fin. Prod illisible : arrêt, rien n'est créé.
  Migration jouée en prod mais absente du commit : signalée, la livraison continue. Aucune migration
  lue dans le commit : arrêt aussi (le contrôle ne contrôlerait rien).
- **Puis « prod = dépôt »** (`scripts/db-types/prod.ts --commit <sha>`, lecture seule) : le schéma
  `public` de la prod doit être celui du `database.ts` du commit à livrer. Écart ou types de la prod
  illisibles : arrêt, rien n'est créé. Sauté, en le disant, avec `--migration-apres` (la prod garde
  ce que la migration retire) et avec `--sans-controle-types` (sortie de secours si le générateur
  de Supabase change de forme). Détail : [base-de-donnees.md](base-de-donnees.md#la-prod-est-elle-la-base-que-le-dépôt-décrit-).
- **Après le push de `production`**, verrou « deploy » rendu : le script attend le statut « Vercel »
  du commit de version (au plus 20 min, `DEPLOY_PROD_ATTENTE_SITE_MAX`), puis que
  `/_app/version.json` du site change (la nouvelle construction est servie), puis lance
  `scripts/check-production-health.ts` (les pages du plan du site). Construction en échec, attente
  dépassée ou page qui ne répond pas 200 : sortie en erreur, **sans retour arrière** (`production`
  reste avancée, David décide). Mode maintenance actif (accueil en 503 avec la page de maintenance ; un 503 sans elle est une panne) : dit, pages non vérifiées,
  pas une erreur. `pnpm deploy:prod --verifier` rejoue ce contrôle seul, sans rien livrer.
- CI allégée encore en cours sur main (typecheck et build, juste après un merge) : `deploy:prod`
  **ne l'attend pas** (décision de David du 2026-11-23) ; il crée la version tout de suite, et la
  CI complète de la version la couvre. `quality.yml` donne au commit de version son propre groupe de
  concurrence : sa CI tourne à côté de celle du merge au lieu d'attendre derrière elle (~6 min
  gagnées). Une CI de main rouge arrête toujours tout. `main` local qui diffère d'`origin/main` : arrêt, en nommant les commits en cause
  (le commit local d'une autre session ne peut plus être poussé sous le verrou).
- CI rouge (version, ou dernier commit de code de main) : si **tous** les jobs rouges, hors
  « CI Summary », sont tombés sur le plantage connu des tests navigateur (« Browser connection was
  closed » dans `gh run view --log-failed` ; pas `wrapDynamicImport`, présent aussi dans les logs
  verts du job client ; rare depuis le GC forcé du 2026-11-08), le
  script relance lui-même les jobs rouges
  (`gh run rerun --failed`), **sous le verrou**, au plus 2 fois par commit, puis attend.
  `--relancer-ci` relance aussi, une fois, un échec qu'il ne reconnaît pas. Autrement : arrêt et
  verrou rendu (la correction passe par une PR). Avant, relancer à la main se faisait hors verrou
  et les merges annulaient la relance en attente (2026-11-02, v0.63.0 restée hors prod).
- `scripts/vercel-ignore-build.sh` (`ignoreCommand`) saute la doc seule et les commits dépassés par
  la pointe ; un redéploiement se construit toujours (`pnpm maintenance:on|off`).
- Quotas qui ont dicté ces choix : 100 déploiements par jour (un déploiement annulé **compte**),
  10 Go de stockage de déploiements, un build à la fois. Rétention des déploiements passée à
  **1 jour** le 2026-10-10 (réglage du tableau de bord).
- **Mémoire du build** : le conteneur de build Vercel a **8 Go en tout**. Sous Vite 7 (Rollup), le
  build montait à ~7,7 Go (graphes serveur et client gardés jusqu'à la fin) : deux builds de v0.52.0
  tués en OOM, rustine de heap à 6144 (#1892). Vite 8 (Rolldown, #1899) : pic **~4,9 Go**, heap
  vivant ~0,25 Go, build Vercel ~3 min au lieu de ~5 ; plus de plafond de heap (#1900).
  Mesurer **dans Docker** (`--memory=8g --memory-swap=8g --cpus=2 node:22-bookworm`, pic lu dans
  `memory.peak` du cgroup), jamais sur le Mac, qui sous-estime Linux.
- ⚠️ **Une montée de l'outil de build se vérifie sur le rendu**, pas seulement sur les statuts et la
  console : un CSS invalide ne fait aucune erreur (couleurs perdues en v0.54.0, cf. décision du
  2026-10-28).
- Région des fonctions : **`cdg1`**, imposée par l'adaptateur dans `vite.config.ts` (options de
  `sveltekit()` depuis SvelteKit 3 : `regions: ['cdg1']`, runtime `nodejs22.x`) ; le `iad1` des réglages du projet n'est qu'un défaut remplacé. Fluid Compute actif.
- `vercel.json` pose les en-têtes de cache : 30 jours pour `/fonts/` et `/upsilon-simulator/`, 1 jour
  (+ `stale-while-revalidate` 7 jours) pour les images, sons et CSS de `static/`.
- `vercel.json` déclare **quatre crons** : `/api/cron/riddle-of-the-day`, chaque jour à 00:05 UTC
  (énigme du jour), `/api/cron/deleted-account-files`, le dimanche à 04:00 UTC (fichiers des
  comptes supprimés), `/api/cron/carnet-de-liaison`, chaque jour à 16:00 UTC (courriels du
  carnet de liaison), et `/api/cron/invitations-cours-particulier`, chaque jour à 03:30 UTC
  (invitations de cours particulier finies depuis 30 jours) — voir [serveur.md](../systeme/serveur.md). Vercel les appelle en GET
  avec `Bearer CRON_SECRET` (variable définie en Production) ; ils ne tournent que sur le
  déploiement de production.
- Speed Insights est branché dans `src/routes/+layout.svelte` ; relevé mensuel et diagnostic :
  [core-web-vitals.md](core-web-vitals.md). Erreurs de prod : [observabilite-erreurs-prod.md](observabilite-erreurs-prod.md).

**Supabase** : projet EU (eu-west-3, ADR 0003).

- Migrations dans `supabase/migrations/`, poussées par `pnpm db:migrate` aux **quatre conditions** de
  CLAUDE.md ; une migration destructive ne passe **jamais** sans David. Additive : au merge ;
  destructive : après le `deploy:prod` qui livre le code qui n'en dépend plus.
- `pnpm db:types` génère `database.ts` **depuis les migrations de la branche** (pile de test, jamais
  la prod) : une fonction SQL et le code qui l'appelle tiennent dans la même PR.
- Interroger la prod : MCP Supabase en **lecture seule**.
- Détail : [base-de-donnees.md](base-de-donnees.md), [rls-echecs-silencieux.md](rls-echecs-silencieux.md),
  [procedure-restauration.md](procedure-restauration.md).

## Décisions d'outillage

| Date       | Décision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Pourquoi                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-09-14 | CodeQL ne tourne plus sur un commit 100 % doc                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | analyse d'un arbre de code identique ; le cron du lundi rescanne tout.                                                                                                                                                                                                                                                                                                                                                               |
| 2026-11-24 | CodeQL ne tourne plus sur un commit de version (`chore(release)`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | il ne change que `package.json` (numéro) et le CHANGELOG : code identique au merge analysé juste avant (~15 min de runner).                                                                                                                                                                                                                                                                                                          |
| 2026-09-29 | pnpm 12, CLI Supabase en devDependency exacte (#512)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | une seule version de la CLI, la même en CI et sur les postes.                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-09-29 | intégration chaque nuit et sur les PR concernées, filtre `paths` vérifié (#515, #516)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | la suite exige un vrai Supabase ; le filtre évite de la lancer sur toutes les PR.                                                                                                                                                                                                                                                                                                                                                    |
| 2026-09-30 | images Docker de Supabase en cache dans la CI (#563)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | quota de téléchargement par IP partagé entre runners (`toomanyrequests`).                                                                                                                                                                                                                                                                                                                                                            |
| 2026-10-01 | plus d'aperçus Vercel pour les branches (#569)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | chaque déploiement, même annulé, mangeait le quota quotidien.                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-10-03 | garde SECURITY DEFINER bloquante, en job court (#723)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | une fonction qui contourne la RLS doit être justifiée avant le merge.                                                                                                                                                                                                                                                                                                                                                                |
| 2026-10-10 | ignore step : pointe seule, doc sautée (#1003)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | ~45 builds de prod par jour, stockage à 100 %.                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-10-10 | CI de main jamais annulée, cache prettier (#1004)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | des runs de main annulés laissaient des commits sans verdict ; prettier prenait 162 s sur 220.                                                                                                                                                                                                                                                                                                                                       |
| 2026-10-10 | **prod manuelle par la branche `production`** (ADR 0021, #1005 → #1007)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | quotas du plan gratuit, et David veut décider de chaque mise à jour du site.                                                                                                                                                                                                                                                                                                                                                         |
| 2026-10-10 | rétention des déploiements Vercel à 1 jour                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | le stock de 10 Go se remplissait en 3 jours.                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-10-10 | tests client sur deux navigateurs (#1012)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Chromium tombait sous 234 fichiers (« Browser connection was closed »).                                                                                                                                                                                                                                                                                                                                                              |
| 2026-10-10 | **`check`, `build`, `lint` sous le verrou des gros process** (#1013)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | un seul gros process à la fois, y compris entre worktrees.                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-10-10 | commitlint sur toutes les branches, `.nvmrc` en CI (#1016)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | des titres trop longs arrivaient sur main par les branches.                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-10-10 | **`commit-and-tag-version` 12 remplace `standard-version`** (#1017)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `standard-version` abandonné depuis 2022 ; la 13 plante sur notre configuration.                                                                                                                                                                                                                                                                                                                                                     |
| 2026-10-10 | **tsgo en local, moteur classique en CI** (#1023)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | 18 s au lieu de ~45 s ; la CI garde le moteur sans angle mort connu.                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-10-10 | **cliquet des types des tests** (#1023), ramené à 0 (#1047)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | 1 819 erreurs dans les tests, invisibles à `pnpm check` : un test pouvait fabriquer une forme que l'app ne produit jamais.                                                                                                                                                                                                                                                                                                           |
| 2026-10-10 | liste `ask` seule source des confirmations, hook pour le reste (#1045)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | deux sources divergeaient ; `ask` ne voit qu'un début de commande.                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-10-10 | garde « code modifié ⇒ doc modifiée » et couverture (#1049)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | une doc n'est revue que si un changement la réclame.                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-10-10 | `db:seed-riche` : base locale = contenu de prod + élèves fictifs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | travailler sur des données réalistes sans aucune donnée d'élève.                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-10-11 | **préchargement réservé au CSS** (#1073)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | 94 modulepreload volaient la bande passante aux CSS : FCP p75 de l'accueil à 3,4 s pour un TTFB de 0,5 s.                                                                                                                                                                                                                                                                                                                            |
| 2026-10-11 | **relevé Core Web Vitals mensuel en GitHub Action, pas en routine cloud** (#1074)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | il faut `VERCEL_TOKEN`, et l'environnement cloud n'a pas de secrets.                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-10-11 | **auto-merge Dependabot durci, 3 jours d'âge minimal des versions**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | le workflow tourne avec un jeton en écriture : `github.actor` se contourne depuis un fork, et un tag d'action se déplace.                                                                                                                                                                                                                                                                                                            |
| 2026-10-28 | **Vite 8 (Rolldown), plus de plafond de heap au build** (#1899, #1900)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | pic du build 7,7 → 4,9 Go dans le conteneur Vercel de 8 Go ; la rustine à 6144 (#1892) ne laissait que ~1 Go de marge.                                                                                                                                                                                                                                                                                                               |
| 2026-10-28 | **Lightning CSS ne touche pas à `light-dark()`** (`css.lightningcss.exclude` de `vite.config.ts`, garde au build)                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | sous Vite 8, la compression CSS passe par Lightning CSS (SvelteKit impose `cssMinify: true`) ; il récrivait `light-dark()` en variables jamais posées (`color-scheme` vient de mode-watcher) : couleurs perdues en v0.54.0.                                                                                                                                                                                                          |
| 2026-11-08 | **GC de Chromium forcé après chaque fichier des tests client**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | ~1 shard sur 10 tombait (« Browser connection was closed », tests verts) : les iframes retirées s'accumulent, l'orchestrateur se décharge ; ~+50 s par job.                                                                                                                                                                                                                                                                          |
| 2026-11-09 | **`date-fns` embarqué dans la build serveur** (`ssr.noExternal` de `vite.config.ts`, #2515)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | externe, Node chargeait ses barrels entiers (826 fichiers) au démarrage à froid : ~0,6 s en local pour la simple redirection de `/dashboard`.                                                                                                                                                                                                                                                                                        |
| 2026-11-11 | **build client : les modules `.ts` de `src/lib` déclarés sans effet de bord**, sauf la liste de `scripts/side-effect-modules.ts` (`treeshake.moduleSideEffects`) ; garde : `scripts/__tests__/side-effect-modules.test.ts` relit `src/lib` (instruction de niveau module, import nu) et les imports nus de tout `src` (`.svelte` et routes compris) et échoue sur un module qui agit au chargement hors liste                                                                                                                                                                      | une constante construite par un appel (`P.add(…)`, `new Set(…)`) gardait son module entier : `$lib/ubumark` embarquait intégration, `tidy`, générateurs Typst… −210 Ko gzip sur 67 pages à markdown, −58 Ko sur l'atelier. ⚠️ Un module oublié disparaît du build EN SILENCE (vitest n'élague pas) : `mathlive-styles.ts`, simple `import` de CSS, a fait perdre les polices de MathLive avant que la garde ne voie les imports nus. |
| 2026-11-20 | **intégration ciblée** : une PR qui n'ajoute qu'une migration de rangement (`*rangement*.sql`) avec son test d'intégration, des JSON de `scripts/questions/` et de la doc ne lance que ses tests (`scripts/ci-integration-ciblee.sh`) ; la stack applique toutes les migrations ; toute autre migration ou tout autre fichier → suite complète                                                                                                                                                                                                                                     | une PR de rangement de 3 brouillons attendait ~19 min la suite complète (~120 fichiers) ; le cron nocturne reste le filet.                                                                                                                                                                                                                                                                                                           |
| 2026-11-20 | **intégration ciblée, migrations de contenu** : une migration de contenu de publiés ajoutée (`*_contenu.sql`, générée par `scripts/questions/migration-contenu.ts`) et sa fixture ajoutée (`tests/integration/fixtures/contenu-publie/`) ne lancent que `migrations-contenu-publie.test.ts`                                                                                                                                                                                                                                                                                        | le gros lot de Seconde corrige une douzaine de modèles publiés : sans cela, chaque PR de contenu relançait la suite complète (~19 min).                                                                                                                                                                                                                                                                                              |
| 2026-11-21 | **intégration en 4 morceaux** : job `portee` (intégration ciblée + nombre de morceaux), puis une matrice de 4 jobs `vitest --shard=N/4`, une pile Supabase chacun ; 1 seul morceau quand la portée ne garde que quelques tests ; seul le morceau 1 enregistre le cache des images Docker                                                                                                                                                                                                                                                                                           | suite en série, impossible à paralléliser dans une pile (purge globale, un seul prof) ; elle a grossi de 132 à 584 fichiers en sept semaines : job de 17,5 min (run 44889439723). Après (run 44891964659, #2956) : **7,5 min** de bout en bout ; morceaux de 212 à 318 s de tests (146 fichiers chacun, répartis par nombre, pas par durée).                                                                                         |
| 2026-11-21 | **tests de migration de données hors des PR** : les 297 tests marqués `@migration-de-donnees` (rejeu d'une migration qui ne fait que ranger, taguer, corriger du contenu) sont laissés de côté sur les PR, sauf ceux que la PR touche (le test, sa migration) ; tous si la PR touche `tests/helpers/**` ; tous la nuit et à la main (`scripts/ci-integration-exclusions.sh`). Garde `pnpm check:migrations-de-donnees` : aucun test marqué ne rejoue une migration de schéma ou de règles d'accès                                                                                  | ils ne prouvent quelque chose qu'avant le `db:migrate` de leur migration ; 229 s de tests + surcoût par fichier (mesuré, run 44889439723) ; suite d'une PR 584 → 287 fichiers ; mesuré (run 44900263857, #2959) : **5,9 min** de bout en bout (avant 7,5), 72 fichiers et 110 à 200 s de tests par morceau (avant 146 fichiers, 212 à 318 s).                                                                                        |
| 2026-11-21 | **passage déjà vert non relancé** : le job `portee` calcule une empreinte (fichiers couverts par le filtre `paths`, lus sur le commit de merge, plus les tests retenus, laissés de côté et le nombre de morceaux) ; un passage entièrement vert la garde (job `memoriser`, cache de la PR) ; un push suivant de la même PR qui la retrouve saute les étapes des morceaux, qui passent en ✅ (pas « skipped »)                                                                                                                                                                      | sur 37 pushes de correction mesurés, 20 ne touchaient aucun fichier de la suite et relançaient 16 à 20 min pour un résultat identique ; `main` qui avance sur un fichier couvert change l'empreinte ; gain à mesurer sur le premier push concerné.                                                                                                                                                                                   |
| 2026-11-21 | **tests touchés par une PR de code** : sur une PR qui ne modifie que `src/`, de la doc et des tests d'intégration, le job `portee` ne retient que les tests dont la fermeture des imports (ou d'un chargeur `import.meta.glob`) atteint un fichier modifié, plus les tests de la PR ; aucun → morceau ✅ sans stack ; ≤ 40 tests → 1 stack ; tout le reste → suite complète                                                                                                                                                                                                        | rejoué sur les 60 dernières PR mergées : 13 des 39 qui lancent la suite passent en sélection (0 à 20 tests au lieu de 287) ; gain à mesurer sur la première PR de code concernée.                                                                                                                                                                                                                                                    |
| 2026-11-21 | **`pnpm db:a-jour`** (#2966) : la base locale de dev reçoit les migrations en attente sans être effacée, toute seule avant `pnpm dev`                                                                                                                                                                                                                                                                                                                                                                                                                                              | la base locale avait 96 migrations de retard, 218 fichiers d'intégration échouaient pour cette seule raison ; `supabase migration up --local` refuse une base qui porte la migration d'une autre branche.                                                                                                                                                                                                                            |
| 2026-11-21 | **pile Supabase de test à part** (#2967) : `test:integration` démarre et met à jour sa pile (`ubumaths-test`, ports `5532x`, verrou `supabase-test`), reconstruite quand elle ne correspond plus à la branche                                                                                                                                                                                                                                                                                                                                                                      | la suite supprimait le prof de dev et les classes du seed-riche, et les données de dev la faisaient échouer ; les tests ne bloquent plus `pnpm dev` ni les `db:*`.                                                                                                                                                                                                                                                                   |
| 2026-11-21 | **`pnpm db:neuf`** : remise à neuf de la base de dev en une commande (prod vérifiée avant d'effacer, reset, contenu de la prod, élèves fictifs), sous un seul verrou, avec confirmation                                                                                                                                                                                                                                                                                                                                                                                            | `db:reset && db:seed-riche` relâchait le verrou entre les deux et effaçait la base avant de savoir si la prod répondait.                                                                                                                                                                                                                                                                                                             |
| 2026-11-21 | **base locale : toutes les tables classées** (chantier `seed-complet`) : trois listes `COPIE` / `INVENTE` / `JAMAIS`, un test refuse une table non classée ; 21 tables de contenu de plus copiées (dictionnaire, relectures, styles de fiches, tournois, réglages du prof…)                                                                                                                                                                                                                                                                                                        |
| 2026-11-22 | **intégration ciblée, migrations de rangement générées** : une migration « nœud et tag » ajoutée, générée par `scripts/questions/migration-rangement.ts`, et sa fixture ajoutée du même nom (`tests/integration/fixtures/rangement-tags/`) ne lancent que `migrations-rangement-tags.test.ts` ; fixture sans sa migration, fixture existante modifiée, ou migration de rangement sans fixture dans une PR qui n'apporte aucun test → suite complète ; `scripts/lib/migration-rangement.ts` est dans le filtre `paths` de `nightly-integration.yml` (la suite rejoue le générateur) | chaque lot demandait une migration d'environ 200 lignes et un test d'environ 300 lignes recopiés d'un gabarit (265 migrations de ce type) ; une migration écrite à la main garde son test propre.                                                                                                                                                                                                                                    |
| 2026-11-23 | **cache Prettier de la CI** : clé sur les versions de Prettier, de ses plugins et de Tailwind (`scripts/ci-cle-prettier.sh`) au lieu du lockfile entier, et cache enregistré chaque nuit sur `main` par `lint-nocturne.yml` ; la première CI d'une PR ne revérifie plus tout l'arbre (~270 s → ~30 s)                                                                                                                                                                                                                                                                              |

## Écarts connus

- `CLAUDE.md` §Gros process, ligne « Machine » : `check:incremental` 44 s à chaud / 82 s à froid
  (mesure du 2026-09-29, moteur `--incremental`), alors que la puce suivante donne ~18 s / ~20 s
  (tsgo, 2026-10-10).
- `CLAUDE.md` §Worktrees : le verrou `typecheck` est attribué au seul `check:incremental` ; il couvre
  aussi `check`, `build`, `lint` et `types:cliquet` depuis le 2026-10-10.
- `.versionrc.json` : l'en-tête du CHANGELOG renvoie encore à `standard-version`.
- `scripts/check-incremental.sh` : les commentaires parlent tour à tour de « guard 2 » et
  « guard 3 » pour le rejeu du verdict.
- Routines cloud : la mémoire de Claude notait au 2026-09-30 que les droits d'écriture GitHub de
  l'environnement cloud restaient à confirmer.
