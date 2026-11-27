---
couvre:
  - 'scripts/nuit/**'
---

# La tâche de nuit : `pnpm nuit`

> **Une seule** tâche de nuit sur le Mac mini (décision de David du 2026-11-24). Elle rejoue ce
> que personne ne rejoue le jour : les preuves des écarts, les vérifications à l'écran sur les six
> navigateurs, les gardes de doc. C'est un **script** lancé par launchd, pas une session Claude
> (David, 2026-11-25) : il ne merge rien, n'ouvre aucune PR, n'analyse pas un rouge, il le signale.

```bash
pnpm nuit                    # le bilan de la dernière nuit
pnpm nuit --lancer           # joue la nuit (ce que launchd lance à 2 h) ; refusé si celle du jour est jouée
pnpm nuit --lancer --essai   # joue tout, sans barrer, commiter, garder comme veille ni notifier
```

Un second `--lancer` le même jour s'arrête (code 1, « déjà jouée ») : le bilan de 2 h sert de
veille à la nuit suivante, il ne s'écrase pas. Pour rejouer : `--essai`.

Installation : `pnpm surveillance:installer` (avec la surveillance du Mac mini et le relevé des
durées ; `--desinstaller` retire les trois). Journal de launchd : `~/.local/state/nuit/launchd.log`.
Le plist passe le chemin du dépôt en argument de `bash -c 'cd "$1" && …'`, échappé pour le XML :
un chemin à `&` ou à guillemet ne casse rien.

## Ce qu'elle joue

Elle part du dépôt principal mais **travaille dans un worktree à elle**, `../ubumaths-wt-nuit`,
détaché sur `origin/main` et remis à jour chaque nuit (créé à la première nuit ; `.env` et
`.env.local` recopiés du dépôt principal). Ce worktree n'est le chantier de personne : ne rien y
écrire, ne pas le retirer.

| Étape                      | Commande                                                                         | Besoin                      |
| -------------------------- | -------------------------------------------------------------------------------- | --------------------------- |
| 1. Preuves des écarts      | `pnpm ecarts rejouer --barrer --json=…`                                          | les fichiers seulement      |
| 2. Vérifications à l'écran | `pnpm test:verifs:tout` (six navigateurs), puis ses rouges une seconde fois      | serveur de dev, base locale |
| 3. Gardes de doc           | `docs:check-links`, `docs:check-refs --strict`, `docs:check-a-jour --couverture` | les fichiers seulement      |

- **Preuve verte** : la ligne est barrée dans le [registre](../ecarts/registre.md), commitée et
  poussée sur `main` (`docs(ecarts): preuves vertes de la nuit…`). C'est le **seul** commit de la
  tâche. `main` a bougé pendant la nuit : une reprise, une seule. Push toujours refusé : le bilan
  dit « pas poussés sur main », les lignes seront barrées de nouveau la nuit suivante (le commit
  resté local est abandonné au `git checkout` de la nuit d'après). Commit refusé par un hook : le
  registre est remis comme il était, pour que le worktree reste propre.
- **Vérifications à l'écran** : le serveur de dev du worktree, port 5190, **lancé et arrêté par la
  tâche elle-même** (pas par Playwright, qui ne sait pas arrêter celui qu'il lance par pnpm) ; la
  **base locale**, dont des décors sont remis à zéro pendant la suite. Un test à `test.fail()`
  (écart connu) qui échoue comme prévu est **vert**. Les fichiers qui partagent des élèves se
  passent un verrou rangé pour toute la machine (`~/.local/state/verifs/verrous/`) : une session
  qui joue `test:verifs` dans un autre worktree au même moment attend son tour, et la nuit aussi.
- **Second essai des rouges** : après la suite, ses seuls rouges sont rejoués une fois, deux à la
  fois (`--last-failed --workers=2`, délai de 2 h). Un test vert au second essai est **instable** :
  listé à part dans le bilan, il ne compte pas comme rouge et ne notifie pas (la suite sur six
  navigateurs en une fois fait des rouges de charge). Rouge deux fois : rouge. Second essai qui ne
  peut pas tourner : les rouges restent rouges et le bilan le dit. Pas de second essai quand
  les seuls rouges sont des fichiers qui ne se chargent pas.
- Une étape qui échoue n'arrête pas les suivantes.

## Le bilan

Un fichier par nuit, **hors dépôt** : `~/.local/state/nuit/AAAA-MM-JJ.json` (60 nuits gardées).
`pnpm nuit` affiche la dernière :

```
Nuit du 2026-11-26 (main abc1234)

Rouges nouveaux (1)
  test rouge : iphone › atelier.spec.ts › barre de l'Atelier

Écarts : 268 ouverts
  clos cette nuit (2) : L9, M41
  entrés au registre depuis la veille (1) : E83

Vérifications à l'écran : 812 verts, 1 rouge, 2 instables, 40 sautés
  rouge : iphone › atelier.spec.ts › barre de l'Atelier
  instable (vert au second essai) : android › carnet.spec.ts › première page
  instable (vert au second essai) : ordi-firefox › tortue.spec.ts › répéter 360 fois

Gardes de doc : 3 vertes
```

La première nuit (aucune nuit d'avant), le bilan l'écrit en tête : « Première nuit : tout rouge
compte comme nouveau. »

Traces et captures des tests rouges : `~/.local/state/nuit/sorties/verifs/`, celles du second
essai dans `sorties/verifs-second-essai/` (de la dernière nuit seulement).

## Quand David est prévenu

Seulement d'un **rouge nouveau**, par `pnpm prevenir geste "bilan de la nuit à lire (3 rouges
nouveaux)" --session tache-de-nuit` ([prevenir-david.md](prevenir-david.md)) ; le message dit
combien, rien du contenu (ntfy est un service extérieur).

| Cette nuit                                                     | Notification                         |
| -------------------------------------------------------------- | ------------------------------------ |
| un test vert la veille est rouge, ou un test neuf arrive rouge | oui                                  |
| un test déjà rouge la veille                                   | non                                  |
| un test instable (vert au second essai)                        | non (il est dans le bilan)           |
| une preuve cassée, une garde de doc rouge                      | oui la première nuit, non ensuite    |
| une preuve verte barrée                                        | non (elle est dans le bilan)         |
| des lignes barrées mais pas poussées                           | oui, puis un rappel tous les 7 jours |
| une étape n'a pas pu tourner                                   | oui, puis un rappel tous les 7 jours |
| première nuit                                                  | oui s'il y a un rouge                |

« La veille » d'une étape = la dernière nuit où elle a tourné : une nuit en panne ne fait pas
oublier ce qui était rouge avant elle.

**Rappel d'une panne qui dure** (David, 2026-11-25) : une panne notifiée le 1er qui dure encore
renotifie le 8, puis le 15 (`rappel (panne depuis le …) : …`), Mac éteint entre-temps compris (le
rappel part dès que 7 jours sont passés). Chaque bilan garde les pannes notifiées cette nuit-là
(`outages`). Une nuit saine entre deux : la panne suivante est neuve. Pour le registre pas poussé,
une nuit sans ligne à pousser ne coupe pas la panne (on ne sait pas si le push passerait). Une panne
déjà longue de 7 jours quand la règle est arrivée (bilans sans `outages`) rappelle dès la première
nuit qui la lit : son début compte comme notifié.

## Pannes

Une étape qui n'a pas pu tourner est dite avec sa cause dans le bilan (« pas jouées : … ») :

- **préparation** (les trois étapes) : `.env.local` absent du dépôt principal (le serveur de dev
  parlerait à la base distante : la tâche n'y va pas), `git fetch` en échec, `pnpm install` en
  échec, ou worktree de la nuit **pas propre** : la tâche ne fait jamais le ménage à l'aveugle,
  regarder `git -C ../ubumaths-wt-nuit status` ;
- **vérifications à l'écran** : port 5190 déjà pris (un serveur déjà là serait réutilisé par
  Playwright, ce ne serait pas le code de `main`), serveur qui ne démarre pas (base locale
  arrêtée : `pnpm db:start`), suite arrêtée au bout de 4 heures (la commande et toute sa
  descendance sont arrêtées, navigateurs compris ; le serveur de dev l'est par la tâche), fichier
  de test qui ne se charge pas (une ligne « erreur de chargement », rouge) ;
- **panne réparée dans la journée** (`.env.local` remis, port libéré…) : le bilan de 2 h existe,
  `--lancer` est refusé jusqu'au lendemain ; `--lancer --essai` vérifie la réparation sans rien
  barrer ni notifier ;
- **une autre nuit tourne déjà** (`~/.local/state/nuit/verrou`) : la seconde s'arrête, code 1. Un
  verrou dont le processus a disparu, ou vieux de plus de 8 heures, est repris. La nuit n'attend
  aucun autre verrou (ni `supabase`, ni `typecheck`) : seuls les verrous d'élèves partagés entre
  fichiers de vérifications la font attendre ;
- **erreur imprévue** : les trois étapes sont dites en panne avec le message, jamais un silence ;
- **notification pas partie** (réseau coupé) : `pnpm nuit` le dit, et les mêmes rouges sont
  renvoyés la nuit suivante ;
- **Mac éteint à 2 h** : launchd rejoue la tâche au réveil. Aucune nuit depuis plus d'un jour :
  `pnpm nuit` l'écrit en tête (« Aucune nuit jouée depuis le … »).

## Essayer

```bash
NUIT_REF=feat/ma-branche NUIT_VERIFS="carnet.spec.ts" pnpm nuit --lancer --essai
```

`--essai` joue les trois étapes sans rien barrer, commiter ni notifier, et écrit `essai.json`, qui
ne sert jamais de veille. `NUIT_REF` : le commit joué (`origin/main` par défaut). `NUIT_VERIFS` :
arguments de Playwright en plus, pour ne jouer qu'un fichier. Aussi `NUIT_ETAT` (dossier des
bilans), `NUIT_WORKTREE`, `NUIT_PORT`.

Code : `scripts/nuit/` (`logique.ts` décide, `index.ts` lance ; lus par le typecheck, `tsconfig.json`),
tests `scripts/__tests__/nuit.test.ts` (règles, et le script lui-même : bilan affiché, second
lancement refusé). Plist : `scripts/surveillance-machine-installer.sh`, testé par
`scripts/__tests__/surveillance-installer.test.ts` (`SURVEILLANCE_SANS_LAUNCHCTL=1` écrit les
plists sans les charger).
