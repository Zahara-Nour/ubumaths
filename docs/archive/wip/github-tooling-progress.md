# GitHub tooling & workflows — progression

> Date : 2026-06-13 · Objectif : ajouter outils/workflows GitHub utiles au projet.
> Repo **public**, free tier (minutes Actions limitées). `gh` authentifié (Zahara-Nour).

## Items (8)

| #   | Item                                            | Statut               |
| --- | ----------------------------------------------- | -------------------- |
| 1   | Économiser minutes : concurrency + paths-ignore | ✅                   |
| 2   | Garde-fou bundle Safari TDZ (<100 KB)           | ✅                   |
| 3   | Job nightly Pyodide (`*-real`)                  | ✅                   |
| 4   | Dependabot                                      | ✅                   |
| 5   | Secret scanning + push protection               | ✅ (live)            |
| 6   | CodeQL (repo public)                            | ✅                   |
| 7   | Release GitHub auto depuis tag                  | ✅                   |
| 8   | Badges README + branch protection légère        | ✅ (protection live) |

### Live (appliqué via `gh api`, hors git)

- **Secret scanning** + **push protection** : activés sur le repo.
- **Dependabot alerts** + **automated security fixes** : activés (complète #4).
- **Branch protection `main`** : force-push ❌, suppression ❌, `enforce_admins: false`
  (David garde le push direct sur `main`). CI **non** obligatoire (volontaire).

## Décisions

- **paths-ignore** : skip CI sur `docs/**` + `**/*.md`. Sûr car on NE rend PAS les
  checks obligatoires (pas de conflit required-checks/skip).
- **Branch protection** : version **non disruptive** (bloque force-push + suppression,
  `enforce_admins: false`). On NE rend PAS la CI obligatoire car David pousse
  directement sur `main` (solo) → exiger les checks casserait son flux. À activer
  plus tard s'il adopte un workflow PR.
- **Pyodide nightly** : gate `vite.config.ts` passe de `CI` à
  `CI && !RUN_PYODIDE_REAL` ; le job nightly pose `RUN_PYODIDE_REAL=1`.
- **Pas de push automatique** : tout est commité en local, David pousse quand il veut.
  Les workflows ne s'activent qu'une fois poussés ; secret scanning + branch
  protection (via `gh api`) s'appliquent immédiatement.

## Fichiers touchés / créés

**Modifiés :**

- `.github/workflows/quality.yml` — concurrency + paths-ignore (#1), garde-fou bundle (#2)
- `vite.config.ts` — gate Pyodide `CI && !RUN_PYODIDE_REAL` (#3)
- `README.md` — badges CodeQL / Release / Node (#8)

**Créés :**

- `.github/workflows/nightly-pyodide.yml` (#3)
- `.github/dependabot.yml` (#4)
- `.github/workflows/codeql.yml` (#6)
- `.github/workflows/release.yml` (#7)

## Validation

- 5 fichiers YAML validés (parser `yaml` de node_modules) → tous OK.
- Pas de `pnpm check` lourd : seule modif code = ternaire dans `vite.config.ts` (config test).

## Reste à faire (côté David)

- **Pousser** pour activer les workflows (`nightly`, `codeql`, `release`) — ils ne
  tournent pas tant que non poussés.
- Le prochain tag `vX.Y.Z` poussé déclenchera la Release GitHub auto (#7).
- (Optionnel) Adopter un flux PR plus tard → activer « require CI » dans la branch
  protection.
