# Chantier `cartes-site` — les cartes du Royaume sur le site

## Reprendre ici

_Mis à jour le 2026-11-01, après #2138 : chantier CLOS, journal archivé._

- **État** : livré (#2138, mergée le 2026-11-01, pas encore en prod). La grande carte remplace la spirale sur `/royaume`, les sept pages `/royaume/<ville>` existent et sont dans le sitemap. Le durable est versé dans `docs/systeme/carte-des-fonctionnalites.md` (Tour du Royaume). Les 46 textes ont été validés par David sans correction (page à cocher https://claude.ai/artifact/4Ps5U829D9Nj37hynxuXG5).
- **Prochaine action** : aucune. La vérification sur un vrai téléphone est notée dans `docs/wip/verifications-manuelles.md`.
- **Worktree / branche** : retirés.

## Phase 0 — comportements

### Grande carte (`/royaume`, section « Six Provinces, un Royaume »)

- **Nominal** : la carte remplace la spirale. Sur grand écran, elle reste en place pendant que les fiches des Provinces défilent, comme la spirale aujourd'hui, et **la Province lue est teintée sur la carte**. Sur téléphone, la carte entière précède les fiches.
- Clic sur une **Province** → défilement jusqu'à sa fiche. Clic sur une **capitale** → page de la ville. Sandomir, qui n'est la capitale d'aucune Province, ouvre aussi sa page.
- Chaque fiche de Province gagne un lien vers la page de sa capitale.
- **Limite** : la Lithuanie, l'Empire du Czar et la mer ne sont pas cliquables. Les noms restent du texte de la carte.
- **Accessibilité** : la carte est un décor. Tout ce qu'elle permet de faire (aller à une Province, ouvrir une ville) passe aussi par des liens des fiches, au clavier.

### Pages des villes (`/royaume/<ville>`, sept pages)

- **Nominal** : un `BackLink` vers `/royaume`, le nom de la ville, la Province (ou « capitale du Royaume » pour Sandomir), la carte de la ville, puis la liste de ses lieux (de 4 à 8 par ville, 39 en tout), chacun avec son nom complet et 2 ou 3 phrases tirées du Compendium.
- Clic sur un lieu de la carte → sa fiche dans la liste est mise en évidence et amenée à l'écran.
- **Erreur** : une adresse de ville inconnue mène à la page 404 du site.
- Pages publiques, chacune avec son titre et sa description (Google).

### Questions encore ouvertes

- **Q1** : au clic sur un lieu, faut-il **défiler jusqu'à sa fiche** sous la carte (proposition, aussi bon au clavier qu'au téléphone) ou **ouvrir une bulle** sur la carte ?
- **Q2** : la page d'une ville renvoie-t-elle aussi vers les **outils de sa Province** (ceux de la fiche, comme « Y travailler sur Chiphre ») ?
- **Q3** : la spirale (code et tests) est-elle **supprimée** une fois la carte en place ? (Proposition : oui.)

## Historique

- 2026-11-01 — Phase 0 validée par David, avec mes recommandations : clic sur un lieu → défilement jusqu'à sa fiche ; la page d'une ville reprend les outils de sa Province (Sandomir n'en a pas) ; la spirale de la carte est retirée (`buildSpiral` reste, pour la gidouille des portes de la fin).
- Contour du Royaume : celui du plan schématique (`plan-schematique.py`), mis à l'échelle du fond (×4,5375), tombe sur le dessin ; surfaces des Provinces = secteurs issus de Sandomir (2580, 1865), bornés par les frontières relevées (`carte-royaume.py`), découpés par ce contour. Tampon de neige de la surcouche cuit dans le fond web.
- Textes : intros et descriptions tirées du Compendium ; deux ajouts sans source retirés avant la relecture (cris d'Ubu à l'Arène, presses « jour et nuit »).
