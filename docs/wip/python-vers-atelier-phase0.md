# Phase 0 — « Ouvrir dans l'atelier » depuis Python (le sens inverse du pont)

_Validée par David le 2026-10-25 (Q1-Q6 : recommandations suivies)._

Le second pont à sens unique prévu par la décision du 2026-10-24 (`docs/systeme/atelier.md`,
Décisions, « v3 Python remplacée ») : une liste produite par un programme (simulation, seuil d'une
suite) gardée comme objet de l'atelier. Pas d'état partagé : l'atelier reçoit une **copie**.

## Comportements

**Nominal.** L'élève exécute dans `/python` un programme qui laisse `lancers = [3, 5, 1, …]`. Un
bouton « Ouvrir dans l'atelier » apparaît ; son menu propose les listes du programme, par leur nom.
Le clic ouvre un **nouvel onglet** `/atelier` en **mode éphémère** avec la liste ; l'élève la
garde par « Garder dans mon atelier » (fusion existante, `merge.ts`). Le playground ne bouge pas.

**Limites.**

- Des mots (`['P', 'F', 'P']`) donnent une liste qualitative (20 modalités au plus, règles de
  l'atelier inchangées).
- Les flottants passent tels que Python les écrit (`0.30000000000000004`) : aucun arrondi caché.
- Plus de 200 valeurs et au plus 20 valeurs différentes : le menu propose « ses effectifs » ;
  l'atelier reçoit deux listes, valeurs et effectifs.
- Seules les listes **affectées par l'exécution en cours** sont proposées (le playground garde ses
  variables d'une exécution à l'autre).

**Refus, avec leur raison, dans le menu.** Liste vide ; élément qui n'est ni nombre ni texte
(liste imbriquée, `None`…) ; booléens ; entier au-delà de 2⁵³ (inexact) ; `nan`, `inf` ; texte
contenant « ; » ou un retour à la ligne ; plus de 200 valeurs et plus de 20 valeurs différentes ;
liste qui s'écrirait en plus de 4 000 caractères (trop de décimales : arrondir en Python).

## Décisions

| #   | Question                  | Décision                                                                                                                                                                            |
| --- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | Ce qui passe              | Les **listes** seulement (une `def` Python peut contenir n'importe quoi).                                                                                                           |
| Q2  | Comment désigner la liste | Le bouton propose, après l'exécution, les listes acceptables par leur nom : du Python normal, sans fonction propre à Chiphre.                                                       |
| Q3  | Plus de 200 valeurs       | Proposer **ses effectifs** (valeurs + effectifs) s'il y a au plus 20 valeurs différentes ; sinon refus avec la raison.                                                              |
| Q4  | Transport                 | **Boîte aux lettres à usage unique** dans `localStorage`, lue puis effacée par `/atelier?depuis-python=<clé>` ; rien ne sort du navigateur ; validée par le même schéma qu'un lien. |
| Q5  | Où est le bouton          | Dans `/python` seulement (les exercices notés ont leur page, `/python-exercises/[id]`).                                                                                             |
| Q6  | Le nom Python             | La liste prend une lettre libre (`L`, `M`, `N`…) ; sa colonne a pour **titre le nom Python** (« lancers », « lancers (effectifs) »). Un nom d'atelier valide (`L`) est gardé.       |

Points techniques tranchés : les tableaux numpy ne passent pas (ce ne sont pas des listes) ; un
rechargement de l'onglet après lecture ne retrouve pas la liste (boîte vidée) et le dit.
