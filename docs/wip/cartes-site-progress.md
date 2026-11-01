# Chantier `cartes-site` — les cartes du Royaume sur le site

## Reprendre ici

_Mis à jour le 2026-11-01, phase 0 écrite, en attente de validation._

- **État** : chantier ouvert. Les cartes viennent du chantier `illustrations` (`docs/Chiphres/illustrations/`). Trois choix de David (2026-11-01) : grande carte **dans `/royaume`, à la place de la spirale** ; **une page par ville** ; clic sur un lieu → **courte description tirée du Compendium** (relue par David sur une page à cocher).
- **Prochaine action** : faire valider la phase 0 (ci-dessous), puis écrire les tests.
- **En attente de David** : la phase 0 (questions Q1 à Q3).
- **Pièges en cours** : grande carte de 2,4 Mo (4356 px) → versions réduites ; texte des lieux = Compendium (`docs/Chiphres/lore-pataphysique.md`), qui fait foi.
- **Worktree / branche** : `../ubumaths-wt-cartes-site` · `feat/cartes-site`.

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
