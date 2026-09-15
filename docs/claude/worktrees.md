# Worktrees — règles de travail

> Résumé impératif : [CLAUDE.md](../../CLAUDE.md) §Worktrees. Ici : le pourquoi,
> la mise en place mesurée, les verrous et le dépannage.

---

## Le problème

Un worktree isole le **répertoire de travail**. Il n'isole ni la RAM, ni Docker,
ni les ports. Et deux sessions travaillant dans deux worktrees ne voient **rien**
l'une de l'autre — c'est précisément le but.

Conséquence : **aucune discipline ne peut arbitrer entre elles**, puisqu'aucune
ne sait ce que fait l'autre. Là où le conflit est silencieux et coûteux, il faut
donc une garde mécanique ; ailleurs, une règle courte suffit.

## Ce qui est isolé, ce qui ne l'est pas

| Ressource                                   | Isolée ?                        | Conséquence                                                                               |
| ------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------- |
| Répertoire de travail, fichiers non suivis  | ✅                              | Le piège « un fichier untracked suit la branche » disparaît                               |
| Cache `.svelte-kit`, `node_modules`, `.env` | ✅                              | Changer de chantier n'invalide plus le cache du typecheck                                 |
| Branche courante                            | ✅ (git refuse le doublon)      | Garde-fou gratuit                                                                         |
| `git stash`, refs, hooks                    | ❌ (`.git` commun)              | Un stash de hook n'est pas attribuable à un chantier                                      |
| **RAM (8 Go)**                              | ❌                              | Deux `check:incremental` concurrents rendent la machine inutilisable → verrou `typecheck` |
| **Supabase local**                          | ❌ (`project_id` + ports figés) | Une seule base pour tout le dépôt → verrou `supabase`                                     |
| **Ports dev (5173-5180)**                   | ❌                              | Collision, et `kill:servers` tue tout                                                     |

---

## Les règles

1. **Le dépôt principal reste sur `main`.** Il sert aux commits 100 % doc, au
   `release`, au `db:migrate` d'après-merge et à la lecture. **Jamais de chantier
   dedans** — c'est ce qui garantit qu'il est toujours propre et à jour.
2. **Un worktree = un chantier = une branche = une session.** Je ne travaille
   jamais dans deux worktrees dans la même session, et j'annonce où je suis
   (`git worktree list` + `pwd`) au premier message.
3. **Emplacement : frère du dépôt**, `../ubumaths-wt-<sujet>`. ⚠️ Pas dans le
   dépôt (voir « Pourquoi pas `EnterWorktree` » plus bas).
4. **`docs/wip/<sujet>-progress.md` commité au premier commit.** Laissé non
   suivi, il est invisible des autres sessions et meurt avec un
   `worktree remove --force`. C'est le seul point de rendez-vous entre sessions.
5. **Ports** : 5175 pour le worktree actif, +1 par worktree supplémentaire.
   ⛔ **`pnpm kill:servers` est interdit depuis un worktree** : il tue les ports
   5173→5180 **et** Supabase (54321), donc le serveur de l'utilisateur et la base
   d'une autre session.
6. **Fin de vie** dès la PR mergée (voir plus bas). Un worktree fantôme, c'est
   696 Mo et une branche morte de plus.

**Convention Supabase** : un seul chantier « base » à la fois. Le verrou n'est
qu'un filet, pas un ordonnanceur.

---

## Mise en place d'un worktree neuf

```bash
git fetch origin
git worktree add -b <type>/<sujet> ../ubumaths-wt-<sujet> origin/main
cd ../ubumaths-wt-<sujet>
cp ../ubumaths/.env ../ubumaths/.env.local .
pnpm install --prefer-offline
```

- La base est **`origin/main`**, jamais le HEAD local : `main` est la production.
- ⚠️ `.env`, `.env.local` et `node_modules` sont gitignorés : ils **ne suivent
  pas** le worktree. Sans eux, le hook pre-commit (oxlint + prettier) échoue.
- Coût réel mesuré le 2026-09-15 : `pnpm install --prefer-offline` = **5,2 s**
  (store pnpm + clone copy-on-write APFS). Le disque n'est pas le facteur
  limitant — la RAM l'est.

---

## Les deux verrous

Implémentation : `scripts/lib/lock.sh`, posés par `scripts/check-incremental.sh`
et `scripts/with-db-lock.sh`.

| Verrou      | Pris par                                                                                            | Ce qu'il évite                                    |
| ----------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `typecheck` | `pnpm check:incremental`                                                                            | Deux typechecks concurrents sur 8 Go              |
| `supabase`  | `db:start`, `db:stop`, `db:reset`, `db:dev-accounts`, `db:fix-profiles`, `test:integration(:watch)` | Un `db:reset` au milieu d'une suite d'intégration |

**Où ils vivent** : `<répertoire git commun>/.locks/<nom>`, c'est-à-dire
`.git/.locks/` du dépôt principal — le seul endroit que tous les worktrees
partagent. Un verrou posé dans le worktree ne verrouille rien.

⚠️ `git rev-parse --git-common-dir` rend un chemin **relatif** (`.git`) depuis le
dépôt principal et **absolu** depuis un worktree. D'où
`--path-format=absolute` dans `lock.sh` : sans lui, le verrou atterrit à deux
endroits différents selon l'appelant, paraît fonctionner, et ne protège rien.

**Comportement** :

- **Acquisition atomique** : la pose se fait sous `noclobber`, donc avec
  `O_CREAT|O_EXCL` — exactement un processus gagne. ⚠️ Un `[ -f ]` suivi d'une
  écriture ne verrouille **rien** : mesuré, trois acquisitions simultanées
  réussissaient toutes les trois, et la première à finir supprimait le fichier
  pour tout le monde. Vérifié depuis : 5 acquisitions simultanées → 1 gagnant,
  4 refus.
- Refus en **exit 2**, avec le PID, l'ancienneté, **le worktree détenteur** et le
  chemin du fichier de verrou — la seule information qui rend le refus
  actionnable, l'autre session étant invisible.
- Verrou **périmé** : repris automatiquement. La péremption se juge sur la **date
  de démarrage** du processus, pas sur le seul PID. Un processus tué par l'OOM
  (SIGKILL : aucun trap) laisse son fichier derrière lui ; si le système recycle
  ce PID, `kill -0` réussit sur un processus innocent et le blocage devient
  perpétuel — pour **tout le dépôt**, désormais, et non plus pour un worktree.
- Relâché à la sortie. **Ctrl-C et SIGTERM relâchent puis SORTENT** (130 / 143).
  Sans ce `exit`, bash reprend l'exécution après le handler et l'appelant irait
  écrire un verdict calculé sur une commande interrompue — un faux vert, ensuite
  rejoué comme vérité par la garde 3.
- **Jamais de verrou silencieusement absent** : helper introuvable, répertoire
  git commun introuvable, fichier impossible à écrire → **exit 1**, et la
  commande n'est pas exécutée. Croire être protégé sans l'être est le pire des
  trois états.
- **Un refus s'attend, il ne se contourne pas.** Il n'y a pas de `FORCE=1` sur
  ces verrous, et c'est délibéré.

**Ce qu'ils ne couvrent pas** : `db:migrate` et `db:types`, qui visent la
**production** et se lancent depuis `main` après merge ; `db:status` (lecture
seule) ; et les serveurs de dev (règle 5).

### Garde déjà existante, à ne pas confondre

`check:incremental` refuse aussi de tourner **quand la pile Supabase locale est
allumée** (12 conteneurs, ~1,9 Go : sur 8 Go elle étrangle le typecheck —
mesuré 15 min au lieu de 40 s, puis tué sans verdict). Message différent,
contournement `ALLOW_DB=1`. Ce n'est pas le verrou inter-worktree.

### L'état de rejeu reste local — et doit le rester

`check:incremental` rejoue son dernier verdict si rien n'a changé. Cet état
(`.svelte-kit/.check-incremental/`) est **local au worktree**, volontairement :
partagé, un worktree rejouerait le « 0 erreur » calculé sur un **autre arbre
source** sans rien vérifier. Un faux vert est pire que pas de garde.

---

## Fin de vie

```bash
git worktree remove ../ubumaths-wt-<sujet>
git branch -d <type>/<sujet>
git worktree list   # vérifier qu'il a bien disparu
```

`git worktree remove` **refuse** s'il reste du travail non commité. C'est voulu :
ne pas `--force` sans avoir regardé ce qui allait être détruit.

---

## Dépannage

| Symptôme                                                  | Cause                                                     | Remède                                                |
| --------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------- |
| `⛔ … tourne déjà` mais rien ne tourne visiblement        | L'autre session est dans un autre worktree — c'est le but | Le message nomme le worktree ; attendre               |
| Le détenteur est un processus zombie                      | Processus vivant mais bloqué                              | `kill <PID>` indiqué dans le message                  |
| Verrou fantôme, détenteur introuvable                     | Cas normalement impossible (date de démarrage vérifiée)   | Supprimer le fichier de verrou que le message nomme   |
| `git worktree list` montre un worktree supprimé à la main | Dossier effacé sans `git worktree remove`                 | `git worktree prune`                                  |
| Tests d'intégration en échec sans test en échec           | `db:reset` concurrent, **ou** GoTrue dégradé              | Le verrou exclut la 1ʳᵉ cause → `db:stop && db:start` |
| `?? .claude/worktrees/` dans `git status`                 | Un worktree a été créé **dans** le dépôt                  | Le déplacer en frère (voir ci-dessous)                |

---

## Pourquoi pas le tool natif `EnterWorktree`

Il crée les worktrees dans `.claude/worktrees/`, qui est **dans** le dépôt, et
`.claude/` est **suivi** par git (135 fichiers) sans aucune règle d'exclusion.

Mesuré le 2026-09-15 : un worktree créé là apparaît en `?? .claude/worktrees/`
dans le `git status` du **dépôt principal** — donc balayable par un `git add -A`.
C'est exactement le piège qui a envoyé une migration destructive dans la mauvaise
PR le 2026-09-12, et que les worktrees sont censés supprimer.

Pour l'utiliser un jour, il faudrait d'abord ajouter `.claude/worktrees/` au
`.gitignore`. En attendant : `git worktree add` en frère du dépôt.
