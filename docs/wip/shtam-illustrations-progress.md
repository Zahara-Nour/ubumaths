# Chantier `shtam-illustrations` — une illustration par article du Shtam

## Reprendre ici

_Mis à jour le 2026-11-03, phase 0 tranchée (6 décisions)._

- **État** : phase 0 tranchée (voir « Décisions de David ») ; aucun dessin fait, pas encore de worktree.
- **Prochaine action** : créer le worktree `ubumaths-wt-shtam-illustrations` (branche `feat/shtam-illustrations-lot-1`), repérer l'article de la une, écrire son prompt Nano Banana (style Steinlen, nuancier imprimerie, Mousched-Gogh) et le donner à David ; le style se valide sur ce premier dessin.
- **En attente de David** : rien.
- **Pièges en cours** : ne jamais lancer prettier sur les articles (casse `~q*2~`) ; fichiers à joindre à Nano Banana → copie dans `~/Downloads` ; la une prend la **première** image du corps (`present.ts`) → le dessin AVANT toute figure SVG.
- **Worktree / branche** : aucun pour l'instant.

## À lire avant de commencer

- Skill `shtam` (`.claude/skills/shtam/SKILL.md`) : illustration = `![texte](/shtam/fichier.svg){size=large}`, vérifs `pnpm test:server src/lib/server/shtam` et `pnpm check:ubumark src/lib/server/shtam/articles`.
- Chantier `illustrations` clos : `docs/archive/wip/illustrations-progress.md` (style Steinlen, nuancier, méthode Nano Banana, prompts) ; le durable au Compendium `docs/Chiphres/lore-pataphysique.md` § XI « Illustrations ».
- Ce qui est déjà tranché par ce chantier et le Compendium : le Shtam est un **objet imprimé** → nuancier _imprimerie_ ; Mousched-Gogh est l'illustrateur du Shtam ; Merdranpo en est le reporter.
- Page du journal : chantier `shtam-journal` (`docs/wip/shtam-journal-progress.md`) ; la une affiche l'image de l'article s'il y en a une.

## Questions de phase 0 (tranchées le 2026-11-03)

1. **Nature de l'image** : gravure / dessin de presse Steinlen par Nano Banana (raster), figure mathématique SVG comme les 5 existantes, ou les deux selon l'article ?
2. **Les 5 figures SVG existantes** : gardées telles quelles, complétées d'un dessin, ou remplacées ?
3. **Place dans l'article** : en tête (sous le titre, reprise par la une) ou dans le corps ; une seule image par article ?
4. **Format et poids** des images raster (webp ? largeur ?) et emplacement (`static/shtam/`).
5. **Ordre** : ordre de parution, par province, ou d'abord la une ?
6. **Circuit** : une PR par lot d'articles, ou commits directs sur `main` comme la relecture (dérogation à confirmer) ?

## Décisions de David

_2026-11-03, phase 0 :_

1. **Nature** : un **dessin de presse** façon Steinlen (Nano Banana, nuancier imprimerie, Mousched-Gogh) pour **chaque** article.
2. **Figures SVG existantes** : **gardées** dans le corps ; on **ajoute** le dessin en plus.
3. **Place** : **un seul** dessin par article, **en tête du corps** (sous le chapô) → c'est lui que reprend la une ; les figures SVG viennent après.
4. **Format** : paysage **3:2, 1200 px** de large, **webp q85** (~100-200 Ko), `static/shtam/<slug>.webp` ; l'original Nano Banana gardé dans un dossier de travail.
5. **Ordre** : **l'article de la une d'abord** (il fixe le style, validé par David), puis **ordre de parution du plus récent au plus ancien**, par lots d'environ 6.
6. **Circuit** : **une PR par lot**, depuis le worktree `ubumaths-wt-shtam-illustrations` ; merge dès la CI verte.

## Journal

- 2026-11-03 — Chantier ouvert à la demande de David (« créer une illustration pour chaque article du shtam »).
- 2026-11-03 — Phase 0 tranchée par David : les 6 réponses suivent les recommandations (voir « Décisions de David »).
