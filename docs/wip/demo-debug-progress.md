# Pages de démo et de debug : mise en cohérence

## Reprendre ici

_Mis à jour le 2026-10-24, avant toute PR._

- **État** : inventaire fait (ci-dessous), revue page par page avec David en cours.
- **Prochaine action** : poursuivre la revue au premier `?` du tableau « Revue page par page ».
- **En attente de David** : le sort de chaque page (vitrine / dev / autre).
- **Pièges en cours** : rien ne se supprime pour l'instant ; `/automaths/test`, `/api/tests/save`, `/api/test-mode` sont de vraies fonctionnalités, hors chantier.
- **Worktree / branche** : aucun (rien de codé) ; journal commité sur `main`.

## Décisions de David (2026-10-24)

1. **Pages de dev : admin seul.**
2. **Rangées dans un espace unique `/dev/…`** : groupe de routes avec sa propre garde, sans
   la coquille du tableau de bord (pages en plein écran). `/dashboard/admin/debug/*` y passe
   aussi. Anciennes adresses redirigées un temps.
3. **Une vitrine publique** (`/demo/…`), au contenu choisi page par page avec David.
4. **Aucune suppression pour l'instant.**

## Inventaire (2026-10-24)

Aucune de ces pages n'est reliée depuis le site, hors liens entre elles. Hors chantier : la
vitrine du Tour du Royaume.

### Déjà admin (`/dashboard/admin/…`)

`debug/database`, `debug/session`, `debug/rls`, `debug/api-docs`, `debug/avatar`,
`debug/wheel`, `debug/mathfield`, `debug/rich-text`, `debug/question-display`,
`debug/typst-preview`, `debug/latex-preview`, `debug/latex-transpiler`,
`debug/correction-mode-b` et `debug/question-preview-base-card` (absentes des onglets),
`errors/test` (hors de `debug/`).

### Publiques (cachées aux robots seulement)

`/test-cadres`, `/test-font`, `/test-erreur` (+ `[code]`, `plantage` en dev seul),
`/test-saisie` (prototype « jetable »), `/test-structure`, `/demo` (carrefour),
`/demo/theme-test`, `/demo/mots-cliquables`, `/demo/question-display-demo` et
`/demo/rich-text-editor-demo` (doublons d'`admin/debug`), `/demo/trig-circle-demo`,
`/demo/vip-cards-demo` (vide pour un anonyme), `/geometry-demo/*` (30 pages),
`/construction-demo` (« Sauvegarder » montré à l'élève → 403), `/slides/demo`,
`/slides/demo-embedded`, `/slides/test-transitions`, `/blockly/playground` (seul usage de Blockly).

### Tout connecté, élève compris

`/test-exercises` (« probablement morte » selon `utilitaires-et-demos.md`).

## Revue page par page

Sort : **vitrine** (`/demo/…`, public) · **dev** (`/dev/…`, admin) · **à revoir**.

| #   | Page                            | Sort | Note |
| --- | ------------------------------- | ---- | ---- |
| 1   | `/test-structure`               | ?    |      |
| 2   | `/geometry-demo/*`              | ?    |      |
| 3   | `/demo/trig-circle-demo`        | ?    |      |
| 4   | `/construction-demo`            | ?    |      |
| 5   | `/demo/vip-cards-demo`          | ?    |      |
| 6   | `/demo/mots-cliquables`         | ?    |      |
| 7   | `/demo/question-display-demo`   | ?    |      |
| 8   | `/demo/rich-text-editor-demo`   | ?    |      |
| 9   | `/demo/theme-test`              | ?    |      |
| 10  | `/demo` (carrefour)             | ?    |      |
| 11  | `/test-saisie`                  | ?    |      |
| 12  | `/test-cadres`                  | ?    |      |
| 13  | `/test-font`                    | ?    |      |
| 14  | `/test-erreur`                  | ?    |      |
| 15  | `/slides/*` (3 pages)           | ?    |      |
| 16  | `/blockly/playground`           | ?    |      |
| 17  | `/test-exercises`               | ?    |      |
| 18  | `/dashboard/admin/debug/*` (14) | ?    |      |
| 19  | `/dashboard/admin/errors/test`  | ?    |      |
