---
status: en-cours
---

# Cahier : images externes en lien

## Reprendre ici

_Mis à jour le 2026-11-09, PR ouverte._

- **État** : correctif écrit, tests verts · **Prochaine action** : revues, CI, merge ·
  **En attente de David** : rien · **Worktree / branche** :
  `ubumaths-wt-cahier-images-externes` / `fix/cahier-images-externes`

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
