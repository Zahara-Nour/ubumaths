# Skills et commandes — mode d'emploi

Ce que tu peux taper dans Claude Code sur ce projet, et quand. Les fichiers eux-mêmes sont des
consignes pour l'agent : `.claude/skills/<nom>/SKILL.md` pour les skills du projet (versionnés),
`~/.claude/skills/<nom>/SKILL.md` pour tes skills personnels (hors dépôt, valables dans tous tes
projets, voir [en bas](#skills-personnels-hors-dépôt)).

Un skill ajouté ou modifié n'est vu qu'**au démarrage d'une session** : `/clear` ou nouvelle session.

---

## `domain-modeling` — le vocabulaire et les décisions

Fait vivre deux fichiers :

- **[`CONTEXT.md`](../../CONTEXT.md)** — le glossaire : un terme, un sens, les termes bannis.
- **[`docs/adr/`](../adr/README.md)** — tes décisions figées, une fiche chacune, avec ce qui a été écarté.

Le skill se déclenche **tout seul** quand la discussion touche au vocabulaire ou à une décision
d'architecture. Taper `/domain-modeling` le force.

### Les trois moments

**1. Au démarrage d'une fonctionnalité (phase 0)**

```
/domain-modeling je veux que les élèves puissent rendre une fiche en photo
```

Claude relit le glossaire et les ADR du sujet, puis pose un **tour de questions numérotées**, chacune
avec sa recommandation :

```
❓ Q1 — « Rendre » : nouvelle notion, ou étape de l'affectation existante ?
➡️ Étape de l'affectation : couvre aussi les élèves inscrits en retard (ADR 0005).

❓ Q2 — Élève archivé : peut-il rendre une fiche reçue avant sa sortie ?
➡️ …
```

Tu réponds (« Q1 oui, Q2 non »). Les termes tranchés entrent dans `CONTEXT.md` au fil de l'eau, puis
vient le tour suivant. Quand plus rien n'est ouvert, Claude le dit et **attend ton feu vert** avant de
coder.

**2. Quand un mot flotte, en cours de route** — rien à taper. Un terme ambigu (« publier », « la
compétence ») ou banni → Claude demande lequel tu veux dire. Une description que le code contredit →
Claude montre la contradiction au lieu de te suivre.

Pour trancher un mot à froid : « on appelle ça comment ? », « ajoute _X_ au glossaire ».

**3. Quand tu tranches quelque chose d'important** — si la décision est difficile à défaire,
surprenante sans contexte et issue d'un vrai choix, Claude propose : « je l'écris en ADR ? ». Tu peux
aussi le demander : « note ça en ADR ».

Si Claude re-propose un jour une option écartée par un ADR, il doit le dire (« contredit l'ADR 0001,
parce que… ») ; c'est toi qui rouvres ou non.

### Ce que tu relis toi-même

- `CONTEXT.md` : c'est **ton** glossaire. Une définition fausse → le dire, tu fais foi.
- Les fiches de `docs/adr/` : les dix premières (0001 à 0010) ont été reconstruites à partir des
  mémoires de Claude le 2026-09-28 — une date ou une nuance peut être à corriger.

---

## `doc-a-jour` — la doc suit le code, dans la même PR

Se déclenche quand `pnpm docs:check-a-jour --depuis origin/main` signale une doc à mettre à jour,
avant d'ouvrir une PR qui touche du code couvert (en-tête `couvre:`), ou quand tu demandes de
remettre une doc d'accord avec le code. Il fait relire le diff passage par passage, vérifier chaque
symbole cité dans le code, et sinon écrire `Doc-inchangée: <raison>` dans un commit. Pour une zone
encore sans doc (liste `trous` de `scripts/doc-a-jour.config.ts`), il fait écrire la doc **d'abord**.

---

## `shtam` — écrire et relire les articles du Shtam

Se déclenche **tout seul** dès qu'on parle d'un article du Shtam (titre, chapô, chute, vrai du faux,
illustration) ; `/shtam` le force. Il renvoie à la charte (Compendium §IX) et au format
([shtam-articles.md](shtam-articles.md)), et garde ce qu'ils ne disent pas :

- **tes goûts** : le mot à deux sens proposé en tête de chaque lot, les titres en deux propositions
  qui se répondent, les chapôs compréhensibles sans l'article ;
- **tes refus** : absurde sans logique, personnification, sujet trop abstrait, Czar rattaché à la
  Russie ;
- **la relecture** : pas de commit pendant les allers-retours ; à ta validation, journal + commit +
  vérifs locales + push direct sur `main` (ta dérogation, pour le Shtam seulement).

Un goût nouveau ou un refus qui se répète → le dire (« note-le dans le skill »).

---

## `fiches-exercices` — créer les fiches d'un thème pour un niveau

Se déclenche dès qu'on demande une fiche d'exercices (technique, applications, ou un thème pour un
niveau) ; il refuse de travailler sans **grade** et **thème** précisés.

- **Avant tout travail**, il interroge la base de production en lecture seule : si les deux fiches
  (technique et applications) existent déjà pour ce niveau et ce thème, il s'arrête et te demande
  quoi faire.
- Il suit la démarche de [fiches-exercices.md](fiches-exercices.md), modèle par tâche compris.
- Rien n'est écrit en production sans ton accord (`--publier`).

## `couvrir-niveau` — couvrir un niveau en modèles de questions

Se déclenche sur « couvre le CE1 », « complète les modèles de 6e », « quels points du niveau X
n'ont pas de modèle » ; il refuse de travailler sans **niveau**.

- Il suit la démarche de [couvrir-un-niveau.md](couvrir-un-niveau.md), tirée du chantier du CP :
  relevé en lecture seule, vérification de l'existant contre les bornes, classement des points
  sans modèle, **proposition des outils qui manquent** (nouveaux blocs, gestes de réponse, en
  chantiers à part), lots avec phase 0, migration nœud + tag, page à cocher, publication.
- Rien n'est écrit en production par lui : `create-questions --publier` et la publication, c'est
  toi qui les lances.

## `reprendre` — repartir d'un chantier après un `/clear`

`/reprendre <sujet>` (ou « reprends », « on en était où ? ») : la session retrouve le journal
`docs/wip/<sujet>-progress.md` (d'après l'argument, sinon le worktree ou la branche, sinon elle te
liste les chantiers actifs) et n'en lit **que le bloc « Reprendre ici »**, puis te dit en 5 lignes
l'état, la prochaine action et ce qui t'attend. Un journal sans bloc en reçoit un au passage.
Elle tourne en **Sonnet** (`model: sonnet` dans son en-tête) : le changement ne vaut que pour
ce tour, ton message suivant repart sur le modèle de la session. C'est pourquoi elle attend
toujours ton go au lieu d'enchaîner sur la prochaine action.

Le but est d'économiser des tokens : une session qui s'étire sur plusieurs PR relit tout son
historique à chaque message. Après chaque merge, la session met le bloc à jour et te propose
`/clear` + `/reprendre <sujet>` (règle de `CLAUDE.md` § Worktrees, 2026-10-19).

---

## Les commandes du projet : retirées le 2026-10-10

Les quatorze commandes de `.claude/commands/` (`/feature`, `/fix`, `/pr`, `/check`…) ont été retirées.
Aucune n'avait été lancée en 60 jours, et plusieurs prescrivaient des gestes devenus faux : `/pr`
lançait l'ancien `check:fast`, qui meurt sur le tas V8, et `/check` enchaînait `check`, `lint` et `build`.
Le déroulé de référence est dans [CLAUDE.md](../../CLAUDE.md) et
[git-workflow.md](git-workflow.md) ; il suffit de dire ce qu'on veut (« corrige ce bug », « ouvre la PR »).

Elles restent dans l'historique git (`git log --diff-filter=D -- .claude/commands`) si l'une
devait revenir.

---

## `menage-contexte` — alléger `CLAUDE.md` et la mémoire

`/menage-contexte` (ou « fais le ménage dans CLAUDE.md / la mémoire ») : la session traite
**toujours les deux ensemble**, pour voir aussi les doublons entre eux. Elle mesure (plafonds :
`CLAUDE.md` 15 Ko, `MEMORY.md` 10 Ko), repère les liens morts, les mémoires non indexées, les
projets marqués clos, les chemins cités qui ont disparu, puis lit les deux fichiers et te propose
une liste numérotée : archiver, fusionner, raccourcir, déplacer. **Elle ne touche à rien avant ta
réponse**, ne supprime jamais une mémoire sans ton « oui » sur ce fichier, et ne retire jamais une
règle de `CLAUDE.md` (elle en déplace seulement le détail ou le pourquoi). Comme `reprendre`, elle
tourne en **Sonnet** pour ce tour ; l'application se fait au tour suivant.

---

## Skills personnels (hors dépôt)

Installés dans `~/.claude/skills/`, ils ne sont ni versionnés ni partagés : seul ton compte les voit,
dans tous tes projets. Pour en installer un, donner à Claude le lien du dépôt : il lit le `SKILL.md`
en entier avant de le copier.

### `llm-council` — passer une décision au crible de cinq conseillers

Installé le 2026-10-21 depuis [aiwithremy/claude-skills-llm-council](https://github.com/aiwithremy/claude-skills-llm-council)
(méthode « LLM Council » de Karpathy). Que des consignes, aucun script.

- **Le lancer** : `/llm-council`, ou « council this », « pressure-test this », « stress-test this »
  suivi d'une vraie décision à enjeu (pas une question à réponse unique).
- **Ce qu'il fait** : lit `CLAUDE.md` et la mémoire pour le contexte ; cinq conseillers répondent en
  parallèle (le contradicteur, les principes premiers, l'expansionniste, le regard extérieur, le
  pragmatique) ; cinq relecteurs jugent leurs réponses anonymisées ; un président rend le verdict
  dans le chat (accords, désaccords, angles morts, recommandation, première action).
- **Coût** : **11 agents** par conseil. Le skill ne fixe aucun modèle ; suivant `CLAUDE.md`
  § Quand utiliser un agent, la session passe `model: sonnet` aux conseillers et relecteurs, et
  réserve Opus au président.
- Ne remplace ni la phase 0 ni les ADR : une décision issue du conseil reste à trancher par toi.

---

Vérifié contre le code le 2026-10-22.
