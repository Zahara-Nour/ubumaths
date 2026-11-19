# Chantier `ordre-grande-passoire` : le grade de l'Ordre fondé sur le travail réel

## Reprendre ici

_Mis à jour le 2026-11-17, chantier clos et archivé._

- **État** : clos. La règle d'avancement est validée et versée dans le Compendium (`docs/Chiphres/lore-pataphysique.md`, section VII, « Mécanique d'attribution »).
- **Suite** : le code de l'Ordre (calcul, mémoire en base, affichage, cérémonie) est un **futur chantier**, à ouvrir quand on voudra montrer le grade aux élèves. Il faudra y trancher où le grade s'affiche et qui le voit, et les points laissés « à préciser au moment du code » ci-dessous.
- **Navadra 5a** : si le travail débloque les coups et les sorts, utiliser la même mesure (D).

## Décision (2026-11-09, David)

Le problème : avec des gidouilles cumulées, un élève qui travaille sans jouer monte lentement. Le travail ne rapporte que les étapes de la Chatterie (20 au plus sur 24 h) et la révision du jour (+2) ; voir `docs/systeme/jeux-et-economie.md:211`. Les mini-jeux et les gestes du prof, eux, en rapportent bien plus. Le grade mesurerait donc l'activité ludique, pas l'apprentissage.

**Choix b** (sur ma recommandation) :

- le grade se fonde sur le travail réel ;
- il ne s'achète pas, ne se distribue pas à la main et ne s'obtient pas en jouant ;
- les gidouilles restent une **monnaie** qu'on dépense en boutique.

La voie a a été écartée : garder les gidouilles et faire payer chaque travail.

## Règle d'avancement (validée par David le 2026-11-17)

Tout ce qui suit a été proposé puis validé en bloc, galons et primaire compris.

- **Arrivée** : tout élève qui arrive pour la première fois dans Chiphre est **Embarqué Phollet**, quelle que soit sa classe, primaire compris.
- **Le voyage** va de sa classe actuelle jusqu'à la Terminale. Les grades qui lui restent se répartissent sur les années qui lui restent. Le partage est refait à chaque rentrée et à chaque retour.
- **Patanaute Yllustre ne se gagne qu'en Terminale**, quelle qu'elle soit (spé, complémentaire, expertes, techno). Il faut être déjà Cartographe Royal et avoir acquis **au moins les trois quarts du programme de sa Terminale**. Les autres grades se gagnent avant.
- **Chaque année a ses grades à gagner, par le travail.** Ce sont des parts du programme de sa classe à acquérir : la moitié pour un seul grade ; 30 % puis 60 % pour deux grades ; même étalement au-delà. L'acquisition est celle des points (`student_point_state.is_acquired`), pas les gidouilles.
- **Le grade ne redescend jamais.** Un grade manqué est reporté sur les années suivantes, ce qui permet de rattraper.
- **Galons** : une année qui n'a aucun grade à donner donne un **galon** dans le grade, gagné par le travail de l'année. C'est une marque, pas un 8e grade. Exemple : « Matelot Phlibustier, 1 galon ». L'élève progresse ainsi chaque année.
- **Primaire** (option a) : l'élève entre dans l'Ordre dès son arrivée ; ses années sans grade donnent des galons.
- **Départ puis retour** : il garde son grade, et les grades restants se répartissent sur les années restantes.
- **Redoublement** : il garde son grade, et les grades s'étalent sur une année de plus. Le « retombage » ne touche que l'Échelle du Décervelage.
- **Saut de classe** : il y a une année de moins, donc les grades se resserrent.
- **Terminale finie sans Patanaute** : le voyage s'arrête au grade atteint.
- **Rien d'autre ne fait monter** : ni gidouilles, ni jeux, ni gestes du prof, ni décret royal.

Exemples : arrivée en 6e (6e Moussaillon, 5e Matelot, 4e Marinier, 3e Quartier-Maître, 2de Cartographe, 1re galon, Tle Patanaute) ; arrivée en 4e (4e Moussaillon et Matelot, 3e Marinier, 2de Quartier-Maître, 1re Cartographe, Tle Patanaute) ; arrivée en Terminale (les 6 grades dans l'année).

Écartés : les seuils en nombre de points, injustes entre classes (65 points travaillables en 3e, 295 en Tle spé, mesuré le 2026-11-17) ; les seuils en « années de programme » cumulées, qui n'assurent ni la fin en Terminale ni une progression chaque année.

**À préciser au moment du code** : les points de l'année précédente comptent-ils dans la part de l'année (consolidation) ? Combien de galons au plus dans un grade ? Quand on ajoute des modèles, la part acquise baisse, mais la mémoire du grade empêche toute rétrogradation.

**Données** : `student_point_state` ne remplit que depuis le 2026-11-04 (2 élèves, aucun point acquis le 2026-11-17). Les seuils de parts (50 %, 30/60 %, 75 %) sont un pari, à revoir après une année de données.

## Questions tranchées (2026-11-17, David suit les recommandations)

- **A. Périmètre** : la règle seule, versée dans le Compendium. Le code est un futur chantier.
- **C. Médaille et collier de l'Ordre** (Chatterie, `src/lib/mathoux/decorations.ts:90,104`) : ils restent achetables, comme ornements du Mathou. Ce ne sont pas le grade.
- **D.** (navadra 5a) : reste à trancher dans navadra ; recommandation : la même mesure du travail que l'Ordre.

## Historique

- **2026-11-17** : A et C tranchés (recommandations suivies). Section VII du Compendium réécrite (décrets royaux retirés). Chantier clos et archivé.
- **2026-11-17** : phase 0. Règle d'avancement validée par David (voyage jusqu'à la Terminale, galons, primaire dans l'Ordre).

- **2026-11-09** : ouvert pendant la question 5 du chantier `navadra` (la progression).
