# Chantier `shtam-illustrations` — une illustration par article du Shtam

## Reprendre ici

_Mis à jour le 2026-11-03, ouverture du chantier (rien de fait)._

- **État** : chantier ouvert, phase 0. 54 articles dans `src/lib/server/shtam/articles/`, 5 seulement illustrés (bedonstan-rails-de-sandomir, bedonstan-thales-puits, bedonstan-triangle-pole-nord, pifometrie-pile-ou-face, pythagore-vie-courante), par des **figures SVG** de `static/shtam/` (8 fichiers, tous insérés ; plusieurs dans un même article : 3 dans les rails de Sandomir, 2 dans Pythagore).
- **Prochaine action** : poser à David les questions de phase 0 ci-dessous, une par une ; ne rien générer avant.
- **En attente de David** : toutes les questions de phase 0.
- **Pièges en cours** : ne jamais lancer prettier sur les articles (casse `~q*2~`) ; fichiers à joindre à Nano Banana → copie dans `~/Downloads` ; l'article et l'image = code (hors `docs/`) → branche + PR, sauf dérogation de David.
- **Worktree / branche** : aucun pour l'instant.

## À lire avant de commencer

- Skill `shtam` (`.claude/skills/shtam/SKILL.md`) : illustration = `![texte](/shtam/fichier.svg){size=large}`, vérifs `pnpm test:server src/lib/server/shtam` et `pnpm check:ubumark src/lib/server/shtam/articles`.
- Chantier `illustrations` clos : `docs/archive/wip/illustrations-progress.md` (style Steinlen, nuancier, méthode Nano Banana, prompts) ; le durable au Compendium `docs/Chiphres/lore-pataphysique.md` § XI « Illustrations ».
- Ce qui est déjà tranché par ce chantier et le Compendium : le Shtam est un **objet imprimé** → nuancier _imprimerie_ ; Mousched-Gogh est l'illustrateur du Shtam ; Merdranpo en est le reporter.
- Page du journal : chantier `shtam-journal` (`docs/wip/shtam-journal-progress.md`) ; la une affiche l'image de l'article s'il y en a une.

## Questions de phase 0 (à poser, aucune tranchée)

1. **Nature de l'image** : gravure / dessin de presse Steinlen par Nano Banana (raster), figure mathématique SVG comme les 5 existantes, ou les deux selon l'article ?
2. **Les 5 figures SVG existantes** : gardées telles quelles, complétées d'un dessin, ou remplacées ?
3. **Place dans l'article** : en tête (sous le titre, reprise par la une) ou dans le corps ; une seule image par article ?
4. **Format et poids** des images raster (webp ? largeur ?) et emplacement (`static/shtam/`).
5. **Ordre** : ordre de parution, par province, ou d'abord la une ?
6. **Circuit** : une PR par lot d'articles, ou commits directs sur `main` comme la relecture (dérogation à confirmer) ?

## Décisions de David

_(aucune pour l'instant)_

## Journal

- 2026-11-03 — Chantier ouvert à la demande de David (« créer une illustration pour chaque article du shtam »).
