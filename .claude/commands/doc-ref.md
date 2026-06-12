---
description: Generer la documentation de reference d'un theme ou module dans docs/ref/[nom] (structure geometry)
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, Task, TodoWrite, AskUserQuestion
argument-hint: <theme|repertoire> -- <phrase de precision>
---

# Documentation de reference : $ARGUMENTS

Tu generes (ou mets a jour) la documentation de reference d'un **theme** ou d'un
**module**, dans `docs/ref/<nom>/`, en suivant la structure du repertoire modele
[`docs/ref/geometry/`](../../docs/ref/geometry/).

> **Langue** : doc en francais, code/commentaires en anglais (regle projet).
> **Verite du code > documentation** : tout chiffre (nombre de fichiers, de
> tests, lignes) doit etre **verifie via `find`/`grep`**, jamais invente ni
> recopie d'un doc existant.

---

## Entree

`$ARGUMENTS` contient deux parties :

- **Cible** (1er token) : soit un **nom de theme** generique (ex.
  `authentification`, `gamification`, `notifications`), soit un **chemin de
  repertoire/module** (ex. `src/lib/mathAST`, `src/routes/(protected)/rewards`).
- **Phrase de precision** (le reste) : une phrase libre qui precise le perimetre,
  l'angle a couvrir, ce sur quoi insister. Elle cadre aussi la **decouverte** du
  code en mode theme. Si elle mentionne `leger`/`rapide`, profondeur = legere.

Convention : `/doc-ref <cible> -- <phrase>` (le `--` est optionnel ; sans lui, le
1er mot est la cible, le reste la phrase).

---

## Fichiers generes

### 6 fichiers cœur (toujours)

`README.md`, `architecture.md`, `code-quality.md`, `security.md`,
`performance.md`, `tests.md`, plus le dossier `progress/` (wip deplaces).

### Fichiers optionnels

| Fichier            | Active par defaut ? | Quand                                                        |
| ------------------ | ------------------- | ----------------------------------------------------------- |
| `decisions.md`     | **oui**             | Journal des decisions + rationale (style ADR). Recupere les `DECISION-LOG-*` epars et l'historique git. |
| `glossaire.md`     | **oui**             | Termes du domaine (vocabulaire pedagogique precis du projet). |
| `api.md`           | a la demande        | Le perimetre expose une **surface publique** nette (exports, builtins, props riches). |
| `data-model.md`    | a la demande        | Le perimetre touche la **DB** (migrations, tables, RLS).    |

En Phase 0, detecte lesquels s'appliquent et **fais-les valider** dans le plan.

---

## Principe : ce qui change entre les modes, c'est la delimitation du perimetre, pas l'audit

Des qu'un code est rattache, on l'audite. Seule change la facon d'obtenir la
liste des fichiers a auditer.

| Mode                  | Delimitation du perimetre                             | Audit code |
| --------------------- | ----------------------------------------------------- | ---------- |
| **MODULE**            | `test -d <chemin>` → le repertoire est le perimetre   | oui        |
| **THEME (avec code)** | **decouverte** : grep/glob a travers le code + phrase | oui        |
| **THEME (conceptuel)**| decouverte vide → aucun code rattache                 | non (rédaction transverse) |

Detection : `Bash: test -d "<token>" && echo MODULE || echo THEME`. Si ambigu,
`AskUserQuestion` avant tout.

---

## Architecture de generation : recon → colonne vertebrale → consultants

On n'attribue **pas** « 1 agent specialise = 1 doc » (rapport d'audit ≠ doc de
reference, exploration redondante, chiffres incoherents). On fait :

1. **Recon (1 passe partagee)** — cartographie le perimetre **une seule fois**,
   inline (`find`/`grep`/`Glob` + lecture des fichiers d'entree). Produit un
   **artefact de recon** : arbre des fichiers, types/exports cles, points
   d'entree, chiffres verifies (fichiers, tests, lignes). C'est la **source
   unique de verite** pour les chiffres.
2. **Colonne vertebrale = `documentation-writer` (Opus)** — redige les docs a
   partir de l'artefact de recon. Il **possede la coherence et les chiffres**.
   Peut etre scinde en 2-3 appels paralleles, mais tous recoivent **le meme
   artefact de recon** (chiffres identiques garantis).
3. **Consultants = agents specialises (Opus), profondeur `complet`** —
   `code-reviewer`, `security-auditor`, `performance-optimizer` produisent des
   **findings** (pas de la prose de doc), en recevant l'artefact de recon **pour
   aller droit au but** (ils lisent quand meme le code reel, mais ne
   recartographient pas). La colonne vertebrale **integre** ces findings dans
   `code-quality.md` / `security.md` / `performance.md`.

**Profondeur** :
- `complet` (defaut) : recon + consultants + colonne vertebrale.
- `leger` (si la phrase le demande, ou mode conceptuel) : recon + colonne
  vertebrale seule (le `documentation-writer` resume qualite/securite/perf sans
  audit dedie).

Plafonne chaque agent (« max N lignes, max M fichiers ») — briefs caps obligatoires.
Aucun agent n'execute build/lint/format/check/test en masse.

### Mapping doc -> producteur

| Document          | Redige par                                   | S'appuie sur            |
| ----------------- | -------------------------------------------- | ----------------------- |
| `architecture.md` | documentation-writer (spine)                 | recon                   |
| `tests.md`        | documentation-writer (spine)                 | recon + `*.test.ts`     |
| `code-quality.md` | spine, **a partir des findings** code-reviewer | consultant (complet)  |
| `security.md`     | spine, **a partir des findings** security-auditor | consultant (complet) |
| `performance.md`  | spine, **a partir des findings** performance-optimizer | consultant (complet) |
| `README.md`       | skill (chiffres) + spine (prose)             | recon                   |
| `decisions.md`    | spine                                        | git log + DECISION-LOG  |
| `glossaire.md`    | spine                                        | termes du perimetre     |
| `api.md`          | spine                                        | exports publics         |
| `data-model.md`   | spine                                        | migrations / tables     |

---

## Phase 0 : Plan (OBLIGATOIRE — ATTENDRE VALIDATION)

Ne genere **rien** avant validation.

### Etape A — Decouverte du perimetre (mode THEME)

Construis la liste des fichiers du theme, guide par la phrase de precision :
`Grep` mots-cles (+ synonymes) dans `src/`, `Glob` repertoires evocateurs,
regroupe par sous-systeme (lib / routes / server / stores / components).
- **Fichiers trouves → THEME (avec code)** : ce set est le perimetre d'audit.
- **Rien de pertinent → THEME (conceptuel)** : profondeur legere, signale-le.

En mode MODULE, saute l'etape A : le perimetre est le repertoire cible.

### Etape B — Recon legere pour chiffrer le plan

Lance la **recon** (cf. ci-dessus) pour pouvoir annoncer des chiffres reels et
detecter les optionnels (`api.md` si surface publique, `data-model.md` si DB).

### Etape C — Presenter le plan

```markdown
## Plan documentation de reference

- **Cible** : <token>
- **Mode** : MODULE | THEME (avec code) | THEME (conceptuel)
- **Profondeur** : complet | leger
- **Nom retenu** : docs/ref/<nom>/        ← propose court (ex. src/lib/geometry-core → "geometry")
- **Phrase de precision** : <phrase>
- **Etat** : creation | mise a jour

### Perimetre (chiffres recon)
- MODULE : <chemin> — <X fichiers src, Y tests, ~Z lignes>
- THEME  : <fichiers/sous-systemes decouverts, groupes>   ← A FAIRE VALIDER

### Fichiers a produire
- Cœur (6)  : README, architecture, code-quality, security, performance, tests
- Optionnels: decisions.md (oui), glossaire.md (oui), api.md (?), data-model.md (?)  ← A VALIDER

### Agents
- Spine    : documentation-writer (Opus)
- Consultants (si complet) : code-reviewer, security-auditor, performance-optimizer (Opus)

### Wip a deplacer
- docs/wip/<...>.md  (suivi git: oui/non)

### Questions
- <nom, perimetre, optionnels, profondeur>
```

**STOP** — attends validation du **nom**, du **perimetre** (crucial en mode
theme), des **optionnels** et de la **profondeur**. Cree une TodoList une fois valide.

---

## Phase 1 : Collecte des wip -> progress/

1. Repere les wip : `Glob docs/wip/<theme>/**` + `Grep` du nom/module dans `docs/wip/*.md`.
2. `Bash: mkdir -p docs/ref/<nom>/progress`.
3. **Deplacement** (decision actee = deplacer) :
   - Suivi git ? `git ls-files --error-unmatch <fichier>`.
   - **Suivi** → `git mv <fichier> docs/ref/<nom>/progress/`.
   - **NON suivi** → **NE DEPLACE PAS sans accord** (regle 0 CLAUDE.md). Liste-les
     et demande validation explicite (`AskUserQuestion`) avant `mv`.
4. Note les liens `docs/wip/...` references ailleurs (a corriger dans le README).

---

## Phase 2 : Generation

1. **Recon complete** (si pas deja faite en Phase 0) → artefact de recon partage.
2. Lis l'equivalent dans `docs/ref/geometry/` comme **gabarit** (ton, structure,
   frontmatter, encarts `>`).
3. **Consultants** (profondeur `complet`) : lance `code-reviewer`,
   `security-auditor`, `performance-optimizer` **en parallele** (plusieurs `Task`
   dans un seul message), chacun avec l'artefact de recon + le perimetre + un
   cap. Recolte leurs **findings**.
4. **Colonne vertebrale** : `documentation-writer` redige les fichiers (cœur +
   optionnels valides) a partir de la recon **et** des findings consultants.
   Brief commun :
   > Redige `docs/ref/<nom>/<fichier>.md`. Gabarit :
   > `docs/ref/geometry/<equivalent>.md`. Utilise l'artefact de recon ci-joint
   > pour TOUS les chiffres (ne recompte pas, ne recopie rien d'ailleurs).
   > Integre les findings consultants ci-joints. Francais, code/comments anglais.
   > N'execute AUCUNE commande build/lint/check/test. Max <N> lignes.
   > Angle : `<phrase>`.
5. **Mode conceptuel / leger** : pas de consultants ; la colonne vertebrale
   redige les 6 cœur de maniere transverse a partir de la recon et de la phrase.

### Mise a jour (si docs/ref/<nom>/ existe deja)

Lis l'existant, **preserve** ce qui est juste, mets a jour chiffres et sections
obsoletes. Ne reecris pas a l'aveugle.

---

## Phase 3 : README index

Sur le modele de `docs/ref/geometry/README.md` :

- **Frontmatter** : `title`, `date` (jour), `version`, `status: vivant`, `audience`, `scope`.
- **Chiffres cles** : tableau **de l'artefact de recon** (verifie via
  `find <perimetre> -name "*.ts" | wc -l`, tests via
  `grep -rE "^\s*(it|test)\(" --include="*.test.ts"`), avec note « Chiffres verifies via ... ».
- **Les documents de reference** : un encart par doc (cœur + optionnels) avec audience + longueur + resume.
- **Lien vers `progress/`** + liens wip corriges.
- **Voir aussi** : docs connexes, `CLAUDE.md`, entrees `MEMORY.md` pertinentes.

---

## Phase 4 : Cloture

1. **Coherence** : liens internes valides, **aucun chiffre contradictoire** entre
   docs (ils viennent tous de la recon). Verifie directement ou via `code-reviewer`.
2. **Liste explicite** des fichiers produits/deplaces :
   ```
   Cree   : docs/ref/<nom>/{README,architecture,code-quality,security,performance,tests}.md [+ optionnels]
   Deplace: docs/wip/... -> docs/ref/<nom>/progress/...
   ```
3. **Commit** : direct si < 5 fichiers evidents, sinon `commit-manager`.
   `git push`/`pnpm release` seulement si l'utilisateur le demande explicitement.

---

## Checklist de validation

- [ ] Plan valide (Phase 0) : nom, **perimetre**, optionnels, profondeur
- [ ] Recon faite → artefact partage = source unique des chiffres
- [ ] Wip deplaces (suivis via `git mv` ; non suivis seulement apres accord)
- [ ] Consultants lances (si `complet`) ; findings integres par la colonne vertebrale
- [ ] 6 cœur + optionnels retenus, homogenes avec `docs/ref/geometry/`
- [ ] Tous les chiffres issus de la recon (aucune valeur inventee), README inclus
- [ ] Liens internes valides, aucun chiffre contradictoire
- [ ] Doc en francais, code/commentaires en anglais
- [ ] Liste des fichiers produits + commit propose
