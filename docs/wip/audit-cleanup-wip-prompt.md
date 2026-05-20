# Prompt — Audit cleanup `docs/wip/`

> Session fraîche recommandée. Agent `general-purpose` (Sonnet ou Opus). Durée estimée : 2-4h.

---

## Contexte

Le dossier `docs/wip/` (work in progress) du projet UbuMaths contient **~130 documents** : des progress docs (historique de travaux livrés) et des prompts (spécifications de travaux à faire). Le tracking s'est **désynchronisé** : plusieurs prompts récents décrivent des features déjà implémentées sans que les fichiers aient été archivés.

**Exemples vérifiés en session 2026-05-20** (5 prompts geometry/, tous déjà fixés) :

| Prompt                                                           | Statut réel                                                    |
| ---------------------------------------------------------------- | -------------------------------------------------------------- |
| `geometry/prompt-angle-object.md`                                | ✅ V1+V2+V3a livrées (tag `v0.9.3`)                            |
| `geometry/prompt-intersections-coniques.md`                      | ✅ `intersectLQ` + `intersectQQ` en place                      |
| `geometry/prompt-piecewise-differentiation.md`                   | ✅ `differentiate.ts:297` + tests                              |
| `geometry/prompt-parametric-polar.md`                            | ✅ MEMORY confirme livré                                       |
| `implicit-curves-general-prompt.md`                              | ✅ `createImplicitCurve` + marchingSquares                     |
| `geometry/dsl-constants-variables-prompt.md`                     | ✅ `\pi`/`e` réservés, `unite_angle`, `createScalarExpression` |
| `constructions-v2/prompt-fix-instrument-animation.md` (supprimé) | ✅ `_lastInstrumentPositions` en place                         |

→ **Probable que la majorité des prompts soient déjà résolus**.

## Mission

Pour chaque prompt restant dans `docs/wip/`, déterminer son statut réel en **vérifiant le code source** (et non en lisant juste le prompt), puis produire un rapport d'audit + actions de cleanup.

## Méthode de vérification (par prompt)

Pour chaque `*-prompt.md` ou `prompt-*.md` :

1. **Lire le prompt** pour identifier les artefacts clés à chercher :

   - Nouveaux fichiers attendus (types, factories, handlers)
   - Nouvelles fonctions exportées
   - Nouveaux builtins DSL
   - Nouveaux champs sur types existants
   - Tests attendus

2. **Vérifier dans le code** via `grep` ciblé :

   - `grep -rn "<symbole_attendu>" src/lib/`
   - `find src/ -path "*<feature_attendue>*" -type f`
   - Vérifier la date du commit le plus récent qui touche ces fichiers : `git log -1 --format="%ai %s" <fichier>`

3. **Classer** dans une de ces catégories :
   - 🟢 **DONE** : tout est en place, prompt obsolète à archiver
   - 🟡 **PARTIAL** : certaines features faites, certaines manquent — préciser ce qui reste
   - 🔴 **TODO** : pas encore fait, prompt encore valide
   - ⚫ **OBSOLETE** : la décision design a changé / l'approche a été remplacée — supprimer le prompt

## Liste des prompts à auditer

### Geometry / mathAST (probablement déjà faits)

- `docs/wip/geometry/prompt-angle-object.md` — DÉJÀ VÉRIFIÉ : 🟢 DONE (V1+V2+V3a)
- `docs/wip/geometry/prompt-intersections-coniques.md` — DÉJÀ VÉRIFIÉ : 🟢 DONE
- `docs/wip/geometry/prompt-piecewise-differentiation.md` — DÉJÀ VÉRIFIÉ : 🟢 DONE
- `docs/wip/geometry/prompt-parametric-polar.md` — DÉJÀ VÉRIFIÉ : 🟢 DONE (MEMORY)
- `docs/wip/geometry/dsl-constants-variables-prompt.md` — DÉJÀ VÉRIFIÉ : 🟢 DONE (à confirmer en grep complet)
- `docs/wip/implicit-curves-general-prompt.md` — DÉJÀ VÉRIFIÉ : 🟢 DONE (à confirmer en grep complet)

### Constructions-v2

- `docs/wip/constructions-v2/prompt-arc-element.md`
- `docs/wip/constructions-v2/prompt-rewrite-converter-and-player.md`
- `docs/wip/constructions-v2/prompt-xml-to-dsl-converter.md`

### Pédagogie / mathAST steppers

- `docs/wip/pedagogical-steppers-mvp-prompt.md`
- `docs/wip/pedagogical-arithmetic-prompt.md`
- `docs/wip/differentiation-stepper-prompt.md`
- `docs/wip/integration-stepper-prompt.md`
- `docs/wip/simplify-stepper-prompt.md`
- `docs/wip/quadratic-stepper-prompt.md`
- `docs/wip/quadratic-stepper-v2-prompt.md`
- `docs/wip/correction-integration-prompt.md`
- `docs/wip/domain-renderer-prompt.md`
- `docs/wip/limits-renderer-prompt.md`

### Backend / SaaS / UI

- `docs/wip/unify-use-vip-card-rpc-prompt.md`
- `docs/wip/units-imperial-affine-prompt.md`
- `docs/wip/short-todos-prompt.md`
- `docs/wip/mode-b-elargissement-prompt.md`
- `docs/wip/poincare-ideas-prompt.md`
- `docs/wip/fix-proposal-summary-prompt.md`

### Spec / study docs (mixed status)

À auditer aussi (chercher les fichiers `*-spec.md`, `*-study.md`, `*-plan.md`) :

```bash
find docs/wip -name "*-spec.md" -o -name "*-study.md" -o -name "*-plan.md"
```

## Pour chaque progress doc (`*-progress.md`) — audit léger

Les `*-progress.md` documentent un travail terminé. Audit minimal :

- Vérifier la date du dernier commit touchant les fichiers mentionnés
- Si > 6 mois ET aucun fichier modifié récemment : marquer 🟢 ARCHIVE (déplacer vers `docs/archives/wip/` ou supprimer)
- Si récent ou actif : laisser tel quel

## Livrables

### 1. Rapport d'audit

Créer `docs/wip/AUDIT-2026-05-20.md` (ou date courante) avec un **tableau** :

```markdown
| Document                          | Statut  | Date dernier commit pertinent | Action recommandée |
| --------------------------------- | ------- | ----------------------------- | ------------------ |
| `geometry/prompt-angle-object.md` | 🟢 DONE | 2026-05-20 (v0.9.3)           | Archiver           |
| ...                               |
```

Avec **résumé exécutif en tête** :

- Total documents audités
- Répartition par statut (% DONE / PARTIAL / TODO / OBSOLETE)
- Liste des vrais TODO restants (le seul output actionnable)
- Liste des fichiers à archiver/supprimer

### 2. Actions effectuées

Pour chaque doc 🟢 DONE ou ⚫ OBSOLETE :

- **Option A (conservatrice)** : déplacer vers `docs/archives/wip/` (créer le dossier si besoin). Préserve l'historique.
- **Option B (agressive)** : `git rm` direct si jamais commité, sinon `rm`. Doc déjà tracé par git pour history.
- **À trancher avec l'utilisateur** au début de la session.

Pour chaque doc 🟡 PARTIAL :

- Mettre à jour le doc avec section « État au 2026-05-20 » listant ce qui reste

Pour chaque doc 🔴 TODO :

- Laisser tel quel (vraie liste de travail)

### 3. Recommandations pour éviter la dérive future

Section en fin de rapport :

- Convention : tout prompt résolu → marquer en tête `## Statut : ✅ RÉSOLU (commit XYZ, date)` puis archiver dans X mois
- Hook ou script pour scanner `docs/wip/` à chaque release
- Lien depuis CHANGELOG vers les prompts résolus dans la version

## Contraintes dures

1. **NE PAS faire confiance au contenu du prompt** — toujours grep le code en parallèle.
2. **Vérifier la date** du commit le plus récent qui touche les fichiers mentionnés (`git log -1 <fichier>`).
3. **Demander à l'utilisateur** au début de la session : archivage conservateur (A) ou suppression agressive (B) ?
4. **Tester rapidement** chaque feature 🟢 DONE en lançant 1-2 tests existants pour confirmer.
5. **Pas de modifications de code source** — purement audit + déplacement de docs.

## Sources à consulter

- `MEMORY.md` du projet (`/Users/david/.claude/projects/-Users-david-Coding-js-ubumaths/memory/MEMORY.md`) : contient un historique de ce qui a été livré (entrées par sujet).
- `CHANGELOG.md` à la racine : versions et features par release.
- `git log --since="6 months ago"` pour avoir le contexte des évolutions récentes.

## Format de réponse final

Rapport markdown avec :

1. **Résumé exécutif** (< 200 mots) : chiffres + vraie liste TODO
2. **Tableau d'audit** détaillé
3. **Actions effectuées** (fichiers archivés/supprimés)
4. **Section reco anti-dérive future**
5. **Liens vers le rapport** : `docs/wip/AUDIT-2026-05-20.md`

## Estimation

- ~25 prompts × 5-10 min de vérification = 2-4h
- - écriture du rapport : 30 min
- - nettoyage (déplacement fichiers) : 30 min
- **Total : 3-5h**

Bon courage à l'agent qui fera ça — c'est ingrat mais ça paiera longtemps sur la clarté du tracking projet.
