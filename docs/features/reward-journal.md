# Journal des Recompenses (Reward Journal)

**Status**: Production
**Last Updated**: 2025-11-21
**Version**: 1.0.0

## Table des matieres

- [Vue d'ensemble](#vue-densemble)
- [Guide Eleve](#guide-eleve)
  - [Acceder au journal](#acceder-au-journal)
  - [Comprendre la timeline](#comprendre-la-timeline)
  - [Utiliser les filtres](#utiliser-les-filtres)
  - [Types d'evenements](#types-devenements)
- [Guide Enseignant](#guide-enseignant)
  - [Consulter le journal d'un eleve](#consulter-le-journal-dun-eleve)
  - [Navigation depuis la liste des eleves](#navigation-depuis-la-liste-des-eleves)
  - [Cas d'utilisation](#cas-dutilisation)
- [Types de Recompenses](#types-de-recompenses)
- [Interface Utilisateur](#interface-utilisateur)
- [Architecture Technique](#architecture-technique)

---

## Vue d'ensemble

Le **Journal des Recompenses** est un historique complet et chronologique de toutes les activites liees aux recompenses d'un eleve. Il centralise dans une seule vue :

- Les gidouilles gagnees et depensees
- Les points bonus utilises
- Les cartes VIP obtenues, utilisees ou echangees
- Les succes debloques
- Les objets achetes dans la boutique

### Objectifs

**Pour les eleves** :

- Comprendre d'ou viennent leurs recompenses
- Suivre leur progression dans le temps
- Retrouver l'historique de leurs transactions

**Pour les enseignants** :

- Verifier les recompenses d'un eleve en cas de question
- Diagnostiquer les problemes (recompense manquante, etc.)
- Suivre l'engagement d'un eleve avec le systeme de recompenses

### Fonctionnalites cles

- Timeline chronologique avec pagination infinie
- Filtres par type de recompense
- Descriptions en francais pour chaque evenement
- Interface responsive (mobile et desktop)
- Mode clair et sombre

---

## Guide Eleve

### Acceder au journal

1. Connecte-toi a ton compte eleve
2. Va dans **Tableau de bord** > **Mon Journal**
3. Le journal s'affiche avec tes evenements les plus recents

**Chemin d'acces** : `/dashboard/student/journal`

### Comprendre la timeline

Le journal presente tes evenements sous forme de timeline verticale, du plus recent au plus ancien.

**Chaque carte d'evenement affiche** :

| Element         | Description                                                         |
| --------------- | ------------------------------------------------------------------- |
| **Icone**       | Identifie le type de recompense (piece, etoile, couronne, etc.)     |
| **Badge type**  | Couleur selon le type d'evenement (vert=gagne, rouge=depense, etc.) |
| **Description** | Explication en francais de ce qui s'est passe                       |
| **Date**        | Quand l'evenement a eu lieu (format relatif : "il y a 2 heures")    |
| **Montant**     | Pour les gidouilles/bonus : quantite gagnee ou depensee             |

**Exemple d'evenement** :

```
[Piece] [Gagne]                                    +50
Gidouilles gagnes pour l'enigme du jour
il y a 3 heures
```

### Utiliser les filtres

Les filtres te permettent d'afficher uniquement certains types de recompenses.

**Filtres disponibles** :

| Filtre         | Description                                                 |
| -------------- | ----------------------------------------------------------- |
| **Tout**       | Affiche tous les evenements (par defaut)                    |
| **Gidouilles** | Uniquement les mouvements de gidouilles                     |
| **Bonus**      | Uniquement les points bonus                                 |
| **Cartes VIP** | Uniquement les cartes VIP (obtention, utilisation, echange) |
| **Succes**     | Uniquement les succes debloques                             |
| **Objets**     | Uniquement les objets de la boutique                        |

**Comment filtrer** :

1. Clique sur le bouton du filtre desire
2. La liste se met a jour automatiquement
3. Clique sur "Tout" pour revenir a la vue complete

**Astuce** : Si tu cherches un evenement specifique, utilise le filtre correspondant pour reduire la liste.

### Types d'evenements

Chaque evenement a un **type** qui indique ce qui s'est passe :

| Type         | Badge      | Signification                                       |
| ------------ | ---------- | --------------------------------------------------- |
| **Gagne**    | Vert       | Tu as obtenu une recompense (exercice, enigme, jeu) |
| **Depense**  | Rouge      | Tu as utilise des gidouilles pour un achat          |
| **Echange**  | Bleu       | Tu as participe a un echange avec un autre eleve    |
| **Utilise**  | Orange     | Tu as active une carte VIP ou consomme un objet     |
| **Expire**   | Gris       | Une recompense temporaire a expire                  |
| **Debloque** | Violet     | Tu as debloque un succes                            |
| **Achete**   | Rose       | Tu as achete quelque chose dans la boutique         |
| **Recu**     | Cyan       | L'enseignant t'a donne une recompense               |
| **Retire**   | Gris fonce | L'enseignant t'a retire une recompense              |

---

## Guide Enseignant

### Consulter le journal d'un eleve

En tant qu'enseignant, vous pouvez consulter le journal de n'importe quel eleve de vos classes.

**Pour acceder au journal d'un eleve** :

1. Allez dans **Tableau de bord enseignant** > **Mes eleves**
2. Selectionnez un eleve dans la liste
3. Cliquez sur l'onglet **Journal** ou le bouton **Voir le journal**

**Chemin d'acces** : `/dashboard/teacher/students/[studentId]/journal`

### Navigation depuis la liste des eleves

Le journal d'un eleve est accessible depuis plusieurs endroits :

| Depuis               | Comment                                   |
| -------------------- | ----------------------------------------- |
| **Liste des eleves** | Cliquez sur un eleve > Journal            |
| **Page recompenses** | Cliquez sur l'icone journal a cote du nom |
| **Profil eleve**     | Section "Historique des recompenses"      |

### Cas d'utilisation

**Verifier une recompense manquante** :

1. Accedez au journal de l'eleve concerne
2. Filtrez par le type de recompense (ex: "Gidouilles")
3. Recherchez la date ou l'evenement devrait apparaitre
4. Verifiez si l'evenement existe avec le bon montant

**Comprendre la balance d'un eleve** :

1. Ouvrez le journal sans filtre
2. Parcourez les evenements recents
3. Les gains (verts) et depenses (rouges) expliquent le solde actuel

**Verifier un echange marketplace** :

1. Filtrez par "Cartes VIP" ou "Gidouilles"
2. Recherchez les evenements de type "Echange"
3. Les metadonnees indiquent le partenaire et les details

**Diagnostiquer un probleme** :

- Si un eleve dit avoir gagne des gidouilles mais ne les voit pas :
  1. Verifiez le journal pour l'evenement "Gagne"
  2. Si absent : l'action source n'a pas declenche la recompense
  3. Si present : verifiez s'il y a eu une depense juste apres

---

## Types de Recompenses

### Gidouilles

**Description** : Monnaie virtuelle de la plateforme.

**Sources possibles** :

- Exercices reussis
- Enigmes du jour
- Jeux (Demineur, etc.)
- Attribution par l'enseignant
- Echanges marketplace

**Utilisations** :

- Achats en boutique
- Tirage de cartes VIP
- Echanges avec d'autres eleves

**Icone** : Piece (Coins)

### Bonus

**Description** : Points bonus pour performances exceptionnelles.

**Sources possibles** :

- Exercices avec score parfait
- Bonus de serie (plusieurs reussites consecutives)
- Bonus temps (reponse rapide)

**Utilisations** :

- Multiplicateurs de recompenses
- Avantages temporaires

**Icone** : Etoile (Star)

### Cartes VIP

**Description** : Cartes speciales avec des pouvoirs uniques.

**Types de cartes** :

- **Joker Devoir** : Passe un devoir
- **Temps Extra** : Plus de temps pour un exercice
- **Double Gidouilles** : Double les gains temporairement
- Et bien d'autres...

**Sources possibles** :

- Tirage (avec gidouilles)
- Attribution par l'enseignant
- Echanges marketplace
- Recompenses de succes

**Icone** : Couronne (Crown)

### Succes (Achievements)

**Description** : Badges de progression debloques en jouant.

**Exemples** :

- Premier exercice reussi
- 10 enigmes resolues
- Collectionneur (avoir 10 cartes VIP)

**Caracteristiques** :

- Ne peuvent etre que debloques (jamais retires)
- Donnent parfois des recompenses bonus

**Icone** : Trophee (Trophy)

### Objets (Items)

**Description** : Objets de la boutique.

**Types** :

- Consommables (utilisables une fois)
- Permanents (bonus durables)
- Cosmetiques (personnalisation)

**Cycle de vie** :

1. **Achete** : Acquisition en boutique
2. **Utilise** : Activation de l'effet
3. **Expire** : Fin de l'effet (si temporaire)

**Icone** : Paquet (Package)

---

## Interface Utilisateur

### Page du journal (eleve)

La page du journal eleve comprend :

**En-tete** :

- Titre "Mon Journal" avec icone livre
- Sous-titre "Historique de tes recompenses et activites"
- Bouton rafraichir

**Section filtres** :

- Barre de boutons horizontale
- Scroll horizontal sur mobile
- Indicateur visuel du filtre actif

**Liste des evenements** :

- Cartes empilees verticalement
- Espacement de 12px entre les cartes
- Animation de chargement (skeleton)

**Pagination** :

- Bouton "Charger plus" en bas de la liste
- Compteur "X sur Y evenements"
- Chargement infini (pas de pages numerotees)

### Page du journal (enseignant)

La page enseignant ajoute :

**En-tete eleve** :

- Avatar de l'eleve
- Nom complet
- Fil d'Ariane (Eleves > Nom > Journal)

**Navigation** :

- Bouton retour vers la liste des eleves
- Meme interface de filtres que l'eleve

### Composant RewardEventCard

Chaque evenement est affiche dans une carte avec :

| Zone        | Contenu                                         |
| ----------- | ----------------------------------------------- |
| Gauche      | Icone ronde coloree selon le type de recompense |
| Centre-haut | Badges (type d'evenement + type de recompense)  |
| Centre      | Description textuelle de l'evenement            |
| Centre-bas  | Date relative ("il y a X minutes/heures/jours") |
| Droite      | Montant avec signe (+/-) si applicable          |

**Couleurs des badges** :

- Gagne : `bg-green-500/10 text-green-700`
- Depense : `bg-red-500/10 text-red-700`
- Echange : `bg-blue-500/10 text-blue-700`
- Utilise : `bg-orange-500/10 text-orange-700`
- Debloque : `bg-purple-500/10 text-purple-700`
- Achete : `bg-pink-500/10 text-pink-700`
- Recu : `bg-cyan-500/10 text-cyan-700`
- Retire/Expire : `bg-gray-500/10 text-gray-700`

### Etats de l'interface

**Chargement initial** :

- 5 cartes skeleton animees
- Pas de message texte

**Liste vide (sans filtre)** :

- Icone boite vide
- Message : "Ton journal est vide"
- Sous-texte encourageant

**Liste vide (avec filtre)** :

- Icone boite vide
- Message : "Aucun evenement trouve"
- Bouton "Effacer les filtres"

**Erreur** :

- Bandeau rouge avec icone alerte
- Message d'erreur
- Bouton "Reessayer"

---

## Architecture Technique

### Endpoints API

| Endpoint                           | Methode | Description                     |
| ---------------------------------- | ------- | ------------------------------- |
| `/api/rewards/journal`             | GET     | Journal de l'eleve connecte     |
| `/api/rewards/journal/[studentId]` | GET     | Journal d'un eleve (enseignant) |

**Parametres de requete** :

- `page` : Numero de page (defaut: 1)
- `limit` : Evenements par page (defaut: 20, max: 100)
- `reward_type` : Filtrer par type de recompense
- `event_type` : Filtrer par type d'evenement
- `from` : Date de debut (ISO 8601)
- `to` : Date de fin (ISO 8601)

**Reponse** :

```json
{
	"events": [
		{
			"id": "uuid",
			"student_id": "uuid",
			"reward_type": "gidouilles",
			"event_type": "earned",
			"amount": 50,
			"item_name": null,
			"description": "Gidouilles gagnes pour l'enigme du jour",
			"metadata": {},
			"source_table": "gidouilles_history",
			"source_id": "uuid",
			"class_id": "uuid",
			"created_by": null,
			"created_at": "2025-11-21T10:30:00Z"
		}
	],
	"pagination": {
		"page": 1,
		"limit": 20,
		"total": 156,
		"totalPages": 8,
		"hasMore": true
	}
}
```

### Store Svelte

**Fichier** : `src/lib/stores/rewardJournal.svelte.ts`

**Etat** :

- `events` : Liste des evenements charges
- `loading` : Indicateur de chargement
- `error` : Message d'erreur eventuel
- `pagination` : Metadonnees de pagination
- `filters` : Filtres actifs

**Methodes** :

- `fetchEvents(studentId?)` : Charger les evenements
- `loadMore()` : Charger la page suivante
- `setFilters(filters)` : Appliquer des filtres
- `clearFilters()` : Reinitialiser les filtres
- `reset()` : Reinitialiser tout l'etat

### Base de donnees

**Table** : `reward_events`

**Colonnes principales** :
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| student_id | UUID | Reference vers profiles |
| reward_type | ENUM | Type de recompense |
| event_type | ENUM | Type d'evenement |
| amount | INTEGER | Quantite (si applicable) |
| item_name | TEXT | Nom d'affichage |
| description | TEXT | Description en francais |
| metadata | JSONB | Donnees supplementaires |
| source_table | TEXT | Table source de l'evenement |
| source_id | UUID | ID dans la table source |
| class_id | UUID | Classe de l'eleve |
| created_at | TIMESTAMPTZ | Date de l'evenement |

**Indexes** :

- `idx_reward_events_student_time` : Recherche par eleve + tri chronologique
- `idx_reward_events_student_type_time` : Recherche par eleve + type + tri
- `idx_reward_events_class_time` : Recherche par classe (enseignant)

**Triggers** :
Les evenements sont crees automatiquement par des triggers sur les tables sources :

- `gidouilles_history`
- `bonus_history`
- `vip_cards_activity`
- `student_achievements`
- `shop_purchase_history`
- `item_usage_log`
- `marketplace_trades`

### Securite

**RLS Policies** :

- Les eleves ne voient que leurs propres evenements
- Les enseignants voient les evenements de leurs eleves
- Les admins voient tous les evenements
- Seul le service_role peut inserer (via triggers)

**Validation Zod** :

- Tous les parametres de requete sont valides
- UUIDs verifies pour studentId
- Limites sur la pagination (max 100)
- Dates au format ISO 8601

---

## FAQ

**Q : Combien de temps les evenements sont-ils conserves ?**
R : Les evenements sont conserves indefiniment pour l'audit.

**Q : Puis-je supprimer un evenement de mon journal ?**
R : Non, le journal est un historique immuable pour garantir la tracabilite.

**Q : Pourquoi un evenement n'apparait-il pas tout de suite ?**
R : Les evenements sont crees par des triggers database. Un leger delai (<1s) peut exister.

**Q : Les echanges marketplace apparaissent-ils pour les deux participants ?**
R : Oui, chaque participant voit ses propres evenements (envoi et reception).

**Q : L'enseignant peut-il voir tous les details de mes echanges ?**
R : L'enseignant voit les evenements mais pas le contenu des messages du marketplace.

---

## Historique des versions

### v1.0.0 (2025-11-21)

- Implementation initiale complete
- Table `reward_events` avec triggers automatiques
- Migration des donnees existantes
- Endpoints API pour eleves et enseignants
- Store Svelte avec pagination et filtres
- Interface utilisateur responsive
- Support mode clair/sombre

---

_Derniere mise a jour : 2025-11-21_
