---
status: clos
---

# Cahier : images externes en lien

## Reprendre ici

_Mis à jour le 2026-11-09, après #2505._

- **État** : clos, mergé (#2505), pas encore en prod (`deploy:prod` sur demande de David) ·
  **Reste noté** : échappement en trop de `src` dans `ImageDisplay` (voir Revues) ·
  **Worktree / branche** : supprimés

---

## Décision

David, 2026-11-09 (« oui ») : au cahier (page élève, lien public anonyme), une image hors de
notre stockage devient un lien, comme les vidéos (2026-11-06) et les formules (2026-11-08,
[journal](cahier-formules-progress.md)). Prod au 2026-11-09 : aucune image au cahier.

## Fait

- `ImageDisplay.svelte` : `externalHref` si `readProjectMediaOnly()` et que l'adresse
  RÉSOLUE n'est pas dans le stockage du projet → `<a class="external-media">Image : …</a>`.
- Adresses biaisées : `//hôte` et `data:` (sans `://`) sont lues comme des noms de fichier
  du stockage des questions → requête chez nous seulement, image cassée ; `/\hôte` (lu
  `//hôte` par le navigateur) → lien.
- Tests : `JournalContent.svelte.test.ts`, describe « images » (4 rouges avant le correctif).

## Revues

- `code-reviewer` : rien de bloquant ; tests renforcés (le lien est asserté, pas seulement
  l'absence d'`<img>`). Un tableau n'affiche jamais d'image (cellule en texte).
- `security-auditor` : rien de bloquant. Non bloquant, non traité ici :
  1. `ImageDisplay` contrôle `resolvedSrc` mais charge `escapeHtml(resolvedSrc)` (échappement
     en trop, Svelte échappe déjà les attributs) : l'adresse chargée peut différer de celle
     contrôlée, sans hôte atteignable (finit par `&`). Préexistant, chat compris. Correctif :
     `src={resolvedSrc}`, idem `alt` / `title` (aujourd'hui affichés `&amp;`).
  2. Une image du site (`/shtam/…`, `static/`) devient aussi un lien au cahier — même origine,
     pas une fuite ; comme les vidéos.
