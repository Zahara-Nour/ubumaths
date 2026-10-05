# Atelier — suppression en cascade, export et rejeu de Calcul (phase 0)

Demande de David du 2026-10-05, recos suivies le même jour. Deux lots,
chacun : branche + PR, tests rouges d'abord, `code-reviewer`.

---

## Lot B — Supprimer un objet et ceux qui en dépendent

Remplace la règle **L3** de `atelier-grapheur-phase0.md` (« `f′` passe en
attente quand on supprime `f` »). L'état « en attente » **reste** pour un nom
cité avant d'être défini (`g(x) = f(x)+1` tapé avant `f`) : seule la
suppression change.

| Id  | Situation                                   | Comportement attendu                                                                                           |
| --- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| N1  | Supprimer `f`, sans dépendant               | Supprimé tout de suite ; message « « f » supprimé · Annuler »                                                  |
| N2  | Supprimer `f`, citée par `f′`, `g`          | Confirmation : « Supprimer f supprime aussi f′ et g. » [Tout supprimer] [Annuler]                              |
| N3  | N2 confirmé                                 | Les trois disparaissent (cartes, courbes) ; message « 3 objets supprimés · Annuler »                           |
| N4  | « Annuler » dans le message                 | Tout revient **à l'identique** : définitions, réglages de courbe, tracé, curseurs, diagrammes                  |
| L1  | Dépendants en chaîne (`h(x)=g(x)+1`)        | `h` est comptée et nommée aussi (dépendants transitifs)                                                        |
| L2  | Supprimer `f′` seule                        | Seule `f′` part (sauf si un objet cite `f′`, alors N2)                                                         |
| L3  | Plus de 3 dépendants                        | La confirmation en nomme 3 et dit « et 2 autres »                                                              |
| L4  | Une autre modification après la suppression | Le message « Annuler » disparaît : on ne restaure jamais par-dessus un atelier qui a changé (nom repris, etc.) |
| E1  | « Annuler » dans la confirmation            | Rien n'est supprimé                                                                                            |
| E2  | Le message n'est pas lu à temps (≈ 10 s)    | Il disparaît ; la suppression est définitive, comme aujourd'hui                                                |

Accessibilité : la confirmation est un vrai dialogue (focus piégé, Échap =
annuler), le message est annoncé (`role="status"`), « Annuler » atteignable au
clavier.

---

## Lot C — Exporter l'historique de Calcul, le rejouer

### Export : deux formats (décision de David)

Un bouton **« Exporter »** en tête de la vue Calcul propose :

- **JSON** (`calcul-AAAA-MM-JJ.json`) — pour rejouer. Distingue chaque entrée :

  ```json
  {
  	"format": "chiphre-calcul",
  	"version": 1,
  	"exportedAt": "2026-10-05T14:03:00Z",
  	"entries": [
  		{
  			"kind": "saisie",
  			"input": "f(x)=x^2",
  			"provenance": "text",
  			"text": "« f » est dans tes objets.",
  			"failed": false
  		},
  		{
  			"kind": "action",
  			"label": "Dériver f",
  			"text": "f′(x) = 2x",
  			"latex": "f'(x)=2x",
  			"failed": false
  		}
  	]
  }
  ```

- **ubumark** (`calcul-AAAA-MM-JJ.md`) — pour lire et recopier dans une fiche.
  Formules en `$…$` LaTeX (pas `~…~`, dont les pièges sont connus : grec, primes
  sur une autre lettre que f/g/h). Une saisie en code, sa réponse en dessous,
  les étapes en liste quand la ligne en a :

  ```markdown
  `f(x)=x^2`

  « f » est dans tes objets.

  `.dériver f`

  $f'(x) = 2x$

  - On dérive terme à terme : $…$
  ```

| Id  | Situation                      | Comportement attendu                                               |
| --- | ------------------------------ | ------------------------------------------------------------------ |
| X1  | Historique vide                | Bouton désactivé, avec sa raison (« Rien à exporter »)             |
| X2  | Ligne en échec                 | Exportée, marquée `failed: true` (JSON) / « Erreur : … » (ubumark) |
| X3  | Ligne avec graphique / tableau | JSON : texte seul ; ubumark : texte seul + mention « (graphique) » |

### Rejeu : importer un JSON

Un bouton **« Rejouer un historique… »** (même menu) choisit un fichier.

| Id  | Situation                                      | Comportement attendu                                                                                     |
| --- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| R1  | Atelier vide                                   | Chaque **saisie** est retapée, dans l'ordre, par le même chemin que le clavier (rien n'est injecté)      |
| R2  | Atelier non vide                               | Confirmation : « Rejouer repart de zéro : tes N objets seront remplacés. » puis Repartir de zéro + rejeu |
| R3  | Une saisie échoue au rejeu                     | Arrêt à cette ligne ; « Rejeu arrêté à la ligne 7 : … » ; ce qui précède reste                           |
| R4  | Entrées `action` (venues des cartes)           | **Voir question Q1**                                                                                     |
| E1  | Fichier qui n'est pas du JSON / mauvais format | Refusé : « Ce fichier n'est pas un historique de Calcul. » Rien ne change                                |
| E2  | Version plus récente que la nôtre              | Refusé : « Cet historique vient d'une version plus récente de Chiphre. »                                 |
| E3  | Trop gros                                      | Refusé au-delà de 1 Mo, 500 entrées, 2 000 caractères par saisie (Zod)                                   |

⚠️ **Rejouer l'historique ≠ restaurer l'atelier.** Ce qu'on fait sur les
cartes (taper une définition dans une carte, bouger un curseur, recolorer)
n'écrit pas de ligne dans Calcul : le rejeu ne le reproduit pas. Pour retrouver
un atelier à l'identique, il y a déjà la sauvegarde du navigateur et le lien
de partage.

Pour rejouer fidèlement, l'entrée doit garder sa **provenance** (`text` /
`mathfield`), que `Entry` ne stocke pas aujourd'hui : on l'ajoute.

### Question ouverte

✅ **Tranché par David le 2026-10-05 : on traduit aussi les actions des cartes** en leur commande quand elle existe ; celles qui n'en ont pas sont nommées à la fin du rejeu.

**Q1 — Les lignes venues des cartes (« Dériver f », « Statistiques L1 »…).**
Elles ne sont pas des saisies.
**Reco : ne rejouer que les saisies**, et dire à la fin « 3 lignes venues des
cartes n'ont pas été rejouées ». Alternative : traduire chaque action en sa
commande (`Dériver f` → `.dériver f`) quand elle en a une — plus fidèle, mais
chaque action doit avoir son équivalent, et toutes n'en ont pas.
