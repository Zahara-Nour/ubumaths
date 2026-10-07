# Arbre des notions (validé le 2026-10-07)

Classement branche > notion > sous-notion décidé avec David ([ADR 0019](../../adr/0019-classement-branche-notion-sous-notion.md)).
**Rien n'est en base** : c'est la source de vérité pour la future migration.

- **`REPRISE.md` : document de reprise du chantier, à lire en premier.**
- `arbre-notions.json` : les 19 branches, 115 notions et 418 sous-notions (niveaux, notes).
- `arbre-notions.html` : la page visuelle (même contenu que l'artefact privé de travail).
- `dessin_branches.py`, `page.py`, `tpl.html` : génération de la page (`python3 dessin_branches.py && python3 page.py`
  depuis ce dossier) ; le JSON est réécrit par `dessin_branches.py`.
