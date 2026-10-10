# Skills et commandes — mode d'emploi

Ce que tu peux taper dans Claude Code sur ce projet, et quand. Les fichiers eux-mêmes sont des
consignes pour l'agent : `.claude/skills/<nom>/SKILL.md`.

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

## Les commandes du projet : retirées le 2026-10-10

Les quatorze commandes de `.claude/commands/` (`/feature`, `/fix`, `/pr`, `/check`…) ont été retirées.
Aucune n'avait été lancée en 60 jours, et plusieurs prescrivaient des gestes devenus faux : `/pr`
lançait `pnpm check:fast`, qui meurt sur le tas V8, et `/check` enchaînait `check`, `lint` et `build`.
Le déroulé de référence est dans [CLAUDE.md](../../CLAUDE.md) et
[git-workflow.md](git-workflow.md) ; il suffit de dire ce qu'on veut (« corrige ce bug », « ouvre la PR »).

Elles restent dans l'historique git (`git log --diff-filter=D -- .claude/commands`) si l'une
devait revenir.
