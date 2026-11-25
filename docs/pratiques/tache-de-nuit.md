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
pnpm nuit --lancer           # joue la nuit (ce que launchd lance à 2 h)
pnpm nuit --lancer --essai   # joue tout, sans barrer, commiter, garder comme veille ni notifier
```

Installation : `pnpm surveillance:installer` (avec la surveillance du Mac mini et le relevé des
durées ; `--desinstaller` retire les trois). Journal de launchd : `~/.local/state/nuit/launchd.log`.

## Ce qu'elle joue

Elle part du dépôt principal mais **travaille dans un worktree à elle**, `../ubumaths-wt-nuit`,
détaché sur `origin/main` et remis à jour chaque nuit (créé à la première nuit ; `.env` et
`.env.local` recopiés du dépôt principal). Ce worktree n'est le chantier de personne : ne rien y
écrire, ne pas le retirer.

| Étape                      | Commande                                                                         | Besoin                      |
| -------------------------- | -------------------------------------------------------------------------------- | --------------------------- |
| 1. Preuves des écarts      | `pnpm ecarts rejouer --barrer --json=…`                                          | les fichiers seulement      |
| 2. Vérifications à l'écran | `pnpm test:verifs:tout` (six navigateurs)                                        | serveur de dev, base locale |
| 3. Gardes de doc           | `docs:check-links`, `docs:check-refs --strict`, `docs:check-a-jour --couverture` | les fichiers seulement      |

- **Preuve verte** : la ligne est barrée dans le [registre](../ecarts/registre.md), commitée et
  poussée sur `main` (`docs(ecarts): preuves vertes de la nuit…`). C'est le **seul** commit de la
  tâche. `main` a bougé pendant la nuit : une reprise, une seule. Push toujours refusé : le bilan
  dit « pas poussés sur main », les lignes seront barrées de nouveau la nuit suivante.
- **Vérifications à l'écran** : le serveur de dev du worktree, port 5190, lancé et arrêté par
  Playwright ; la **base locale**, dont des décors sont remis à zéro pendant la suite. Un test à
  `test.fail()` (écart connu) qui échoue comme prévu est **vert**.
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

Vérifications à l'écran : 812 verts, 1 rouge, 40 sautés
  rouge : iphone › atelier.spec.ts › barre de l'Atelier

Gardes de doc : 3 vertes
```

Traces et captures des tests rouges : `~/.local/state/nuit/sorties/verifs/` (celles de la dernière
nuit seulement).

## Quand David est prévenu

Seulement d'un **rouge nouveau**, par `pnpm prevenir geste "bilan de la nuit à lire" --session
tache-de-nuit` ([prevenir-david.md](prevenir-david.md)) ; le message ne dit rien du contenu.

| Cette nuit                                                     | Notification                         |
| -------------------------------------------------------------- | ------------------------------------ |
| un test vert la veille est rouge, ou un test neuf arrive rouge | oui                                  |
| un test déjà rouge la veille                                   | non                                  |
| une preuve cassée, une garde de doc rouge                      | oui la première nuit, non ensuite    |
| une preuve verte barrée                                        | non (elle est dans le bilan)         |
| des lignes barrées mais pas poussées                           | oui la première nuit                 |
| une étape n'a pas pu tourner                                   | oui, sauf si la veille déjà en panne |
| première nuit                                                  | oui s'il y a un rouge                |

« La veille » d'une étape = la dernière nuit où elle a tourné : une nuit en panne ne fait pas
oublier ce qui était rouge avant elle.

## Pannes

Une étape qui n'a pas pu tourner est dite avec sa cause dans le bilan (« pas jouées : … ») :

- **préparation** (les trois étapes) : `.env.local` absent du dépôt principal (le serveur de dev
  parlerait à la base distante : la tâche n'y va pas), `git fetch` en échec, `pnpm install` en
  échec, ou worktree de la nuit **pas propre** : la tâche ne fait jamais le ménage à l'aveugle,
  regarder `git -C ../ubumaths-wt-nuit status` ;
- **vérifications à l'écran** : port 5190 déjà pris (un serveur déjà là serait réutilisé par
  Playwright, ce ne serait pas le code de `main`), serveur qui ne démarre pas (base locale
  arrêtée : `pnpm db:start`), suite arrêtée au bout de 4 heures ;
- **une autre nuit tourne déjà** (`~/.local/state/nuit/verrou`) : la seconde s'arrête, code 1.

⚠️ Une panne qui dure ne renotifie pas : le lendemain d'une notification « pas jouées », lire
`pnpm nuit` jusqu'à ce que l'étape rejoue.

## Essayer

```bash
NUIT_REF=feat/ma-branche NUIT_VERIFS="carnet.spec.ts" pnpm nuit --lancer --essai
```

`--essai` joue les trois étapes sans rien barrer, commiter ni notifier, et écrit `essai.json`, qui
ne sert jamais de veille. `NUIT_REF` : le commit joué (`origin/main` par défaut). `NUIT_VERIFS` :
arguments de Playwright en plus, pour ne jouer qu'un fichier. Aussi `NUIT_ETAT` (dossier des
bilans), `NUIT_WORKTREE`, `NUIT_PORT`.

Code : `scripts/nuit/` (`logique.ts` décide, `index.ts` lance), tests
`scripts/__tests__/nuit.test.ts`. Plist : `scripts/surveillance-machine-installer.sh`.
