# Chantier `shtam-illustrations` — une illustration par article du Shtam

## Reprendre ici

_Mis à jour le 2026-11-03, lot 2 complet, PR ouverte._

- **État** : lot 1 en `main` (#2307). Lot 2 (7 articles parus restants) : 7 dessins intégrés sur `feat/shtam-illustrations-lot-2`, PR ouverte. Les 13 articles parus sont alors illustrés.
- **Prochaine action** : après le merge, lot 3 = les 41 articles programmés, dans leur ordre de parution (le plus proche d'abord : `pifometrie-anniversaires`… vérifier par `date:`), par lots d'environ 6.
- **En attente de David** : rien.
- **Pièges en cours** : ne jamais lancer prettier sur les articles ; pièces jointes → `~/Downloads` ; **couleurs d'un personnage : les recopier de son portrait** (Czar = bleu ciel, Bordure = veste verte), jamais de mémoire ; **pas de kippa/redingote noire/longue barbe** pour un savant (caricature) ; une blague abstraite a besoin d'un signe lisible (exceptions « ÷ 0 », « ∞ », « LUNDI/MARDI », π) ; Nano Banana rend parfois du 16:9 ou du carré → demander « extend to 3:2 » dans la même conversation (il redessine) ; texte illisible → réécrit par `magick -annotate` (voir `nombrilie-division-par-zero/retouche.txt`) ; jamais de personne réelle dessinée.
- **Worktree / branche** : `ubumaths-wt-shtam-illustrations`, `feat/shtam-illustrations-lot-2`.

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
7. **Style validé** (2026-11-03) sur le dessin de fermat-marge-trop-petite, sans retouche (marge pas visible, tache bleue du fond : acceptées).
8. **Ordre précisé** (2026-11-03) : d'abord les **13 articles parus**, du plus récent au plus ancien, puis les **41 programmés** dans leur ordre de parution.

## Journal

- 2026-11-03 — Chantier ouvert à la demande de David (« créer une illustration pour chaque article du shtam »).
- 2026-11-03 — Phase 0 tranchée par David : les 6 réponses suivent les recommandations (voir « Décisions de David »).
- 2026-11-03 — Lot 1 : dessin de fermat-marge-trop-petite (Mère Ubu et la facture ; 1264×848 recadré en 1200×800, 172 Ko), style validé ; prompts des 5 suivants écrits.
- 2026-11-03 — glitchistan-ha-ha intégré (`integrer.sh` écrit). Barbier : essai 1 refusé (reflet au crâne rasé), prompt v2 « très mauvais » ; retenu = essai 1 **retouché par deux carrés** (barbe de trois jours / reflet rasé, mousse sur une joue — idée de David), `coller-retouches.sh` par masque de différence ; **validé par David**.
- 2026-11-03 — bedonstan-rails-de-sandomir : essai 1 (4:3, recadré en 3:2), trait plus fin et texture crayon, différent des autres ; **gardé par David**.
- 2026-11-03 — nombrilie-zero-virgule-neuf et yoyolande-hotel-de-l-infini intégrés (hôtel en 16:9, recadré à gauche pour garder le voyageur). Lot 1 complet ; skill `shtam` mise à jour.
- 2026-11-03 — #2307 mergé (lot 1, CI verte), worktree retiré.
- 2026-11-03 — Lot 2 ouvert : prompts des 7 derniers articles parus écrits. Choix : π seul symbole permis (pi-transcendant) ; triangle 3-4-5 par des graduations, sans chiffres ; ni jambe de bois ni troisième jambe (moyenne-des-jambes : Bordure qui compte) ; aucun portrait de Pythagore.
- 2026-11-03 — Lot 2 : 7 dessins intégrés. moyenne-des-jambes, pile-ou-face : essai 1. triangle-plainte : 4:3, fenêtre de recadrage décalée (+70) pour garder les pieds. czar-alexis : redingote verte (erreur de prompt) recolorée en bleu du portrait. division-par-zero : essai 1 refusé (illisible, gardes confus), v2 en 16:9, redessiné en 3:2, écran « ÷0 » réécrit à la main. pi-transcendant : essai 1 refusé (incompréhensible, savant caricatural), v2 LUNDI/MARDI retenue. pythagore : essai 1.
