# Buddy System — Les Palotins

> Document de specification pour le systeme de compagnon virtuel d'UbuMaths.

## Concept

Chaque eleve choisit un **Palotin** comme compagnon. Les Palotins sont les hommes de main du Pere Ubu dans l'oeuvre d'Alfred Jarry (_Ubu Roi_, 1896). Leurs noms viennent du vocabulaire heraldique (blason).

Le buddy est **toujours visible** (coin de l'ecran), reagit aux actions de l'eleve, donne des encouragements et des indices, et **evolue avec l'activite de l'eleve** via un systeme d'XP permanent.

---

## Les 3 Palotins

### Giron — Le triangle qui fonce

**Archetype** : L'aventurier impatient

- **Energie** : Fonceur, enthousiaste, un peu tete brulee
- **Rapport aux maths** : Les voit comme un defi, un combat. "On attaque !" "Allez, suivant !"
- **Quand l'eleve reussit** : Explose de joie, exagere ("LEGENDAIRE ! Le Pere Ubu lui-meme n'aurait pas fait mieux... bon, lui il aurait pas su, mais quand meme !")
- **Quand l'eleve se trompe** : S'enerve contre l'exercice (pas contre l'eleve). "Pfff, question vicieuse celle-la. On la refait."
- **Style de hint** : Direct, va a l'essentiel. "T'as regarde le denominateur ? Regarde le denominateur."
- **Defaut attachant** : Trop confiant, se trompe lui-meme parfois et l'assume
- **Parle comment** : Phrases courtes, exclamatives, argot leger
- **Attire les eleves** : Competitifs, sportifs, ceux qui aiment aller vite

### Pile — La pointe qui observe

**Archetype** : Le reveur philosophe

- **Energie** : Calme, contemplatif, un peu lunaire
- **Rapport aux maths** : Les voit comme des mysteres a contempler. "Interessant... pourquoi ca marche, a ton avis ?"
- **Quand l'eleve reussit** : Satisfaction tranquille, pousse a reflechir plus loin. "Joli. Et si le nombre etait negatif, ca marcherait encore ?"
- **Quand l'eleve se trompe** : Dedramatise avec philosophie. "Les erreurs, c'est le chemin qui se construit sous tes pieds."
- **Style de hint** : Pose des questions qui guident. "Et si tu retournais le probleme ? Litteralement, la tete en bas." (clin d'oeil a sa forme inversee)
- **Defaut attachant** : Part dans des digressions bizarres, fait des liens improbables ("Tu savais que cette equation ressemble a une recette de soupe ?")
- **Parle comment** : Phrases longues, ton pose, metaphores inattendues
- **Attire les eleves** : Reflechis, introvertis, ceux qui aiment comprendre le "pourquoi"

### Cotice — La diagonale qui relie

**Archetype** : Le pote encourageant

- **Energie** : Chaleureux, sociable, optimiste
- **Rapport aux maths** : Les voit partout dans la vie quotidienne. "Eh, tu sais que ton score forme une suite arithmetique depuis 3 jours ?"
- **Quand l'eleve reussit** : Celebre avec l'eleve, partage la joie. "ON EST LES MEILLEURS. Enfin surtout toi. Moi j'ai rien fait."
- **Quand l'eleve se trompe** : Rassure et relativise. "Bah, hier t'en as reussi 12. Celle-la elle compte pas."
- **Style de hint** : Fait des paralleles avec des choses connues. "C'est comme partager une pizza — sauf que la pizza c'est 7/3 et bon courage."
- **Defaut attachant** : Bavard, fait des blagues pas toujours droles, un peu pot de colle
- **Parle comment** : Ton conversationnel, blagues, references au quotidien
- **Attire les eleves** : Sociables, anxieux face aux maths, ceux qui ont besoin d'etre rassures

---

## ADN commun des 3 Palotins

- **Loyaux** envers l'eleve (comme les Palotins envers Ubu, mais mieux traites)
- Jamais condescendants, jamais moralisateurs
- Parlent **entre eux** parfois (petites remarques dans l'interface)
- Respect mele de moquerie pour le Pere Ubu ("Le Patron ? Il est occupe a compter ses gidouilles...")
- Personnalite propre, distincte du Pere Ubu — plus jeunes, plus espiegles, moins pompeux

---

## Systeme d'XP et progression

### Philosophie

L'XP buddy est le **reflet de l'investissement de l'eleve dans la duree**. Pas de son talent, pas de son argent (gidouilles), mais de sa **regularite et ses efforts**. C'est la seule metrique du systeme qui ne peut pas etre achetee, echangee, ou perdue.

### Les 3 economies et leurs roles distincts

|                  | Gidouilles            | Cartes VIP                | XP Buddy                |
| ---------------- | --------------------- | ------------------------- | ----------------------- |
| **Nature**       | Monnaie consommable   | Objets collectibles       | Progression permanente  |
| **Se gagne par** | Performance, activite | Achat, tirage, echange    | Effort, regularite      |
| **Se depense**   | Oui (shop, tirages)   | Oui (activation, echange) | Non — ne descend jamais |
| **Fonction**     | Pouvoir d'achat       | Surprise, strategie       | Fil rouge, identite     |
| **Horizon**      | Court terme           | Moyen terme               | Long terme              |

### Sources d'XP

| Action                                        | XP  | Pourquoi                             |
| --------------------------------------------- | --- | ------------------------------------ |
| Exercice complete (bonne reponse)             | 10  | Recompense de base                   |
| Exercice complete (mauvaise reponse)          | 3   | L'effort compte, pas que le resultat |
| Exercice corrige apres erreur                 | 7   | Encourage a reessayer                |
| Premier exercice du jour                      | 5   | Juste se connecter et commencer      |
| Streak journalier (connexion + 1 exo minimum) | 15  | Regularite                           |
| Bonus streak x7 jours                         | 50  | Milestone hebdomadaire (hors cap)    |
| Bonus streak x14 jours                        | 100 | Milestone bi-hebdomadaire (hors cap) |
| Bonus streak x30 jours                        | 300 | Milestone mensuel (hors cap)         |
| Nouvelle thematique exploree                  | 25  | Curiosite                            |

**Principe fondamental** : l'XP ne s'achete PAS avec des gidouilles. Elle se merite par le travail.

### Anti-gaming

- **Cap d'XP journalier : 100 XP** (les bonus streak milestone ne comptent PAS dans le cap)
- **Pas d'XP pour les exercices repetes** identiques dans la meme session
- **L'XP ne s'achete pas** avec des gidouilles
- **Pas de perte d'XP** possible : evite la frustration et les hacks defensifs

### Table XP par niveau

| Niveau | XP cumule | XP pour ce niveau | Phase        |
| ------ | --------- | ----------------- | ------------ |
| 1      | 0         | —                 | Depart       |
| 2      | 30        | 30                | Decouverte   |
| 3      | 70        | 40                | Decouverte   |
| 4      | 120       | 50                | Decouverte   |
| 5      | 180       | 60                | Decouverte   |
| 6      | 260       | 80                | Construction |
| 7      | 360       | 100               | Construction |
| 8      | 480       | 120               | Construction |
| 9      | 620       | 140               | Construction |
| 10     | 780       | 160               | Construction |
| 11     | 960       | 180               | Construction |
| 12     | 1160      | 200               | Construction |
| 13     | 1400      | 240               | Construction |
| 14     | 1680      | 280               | Construction |
| 15     | 2000      | 320               | Construction |
| 16     | 2400      | 400               | Prestige     |
| 17     | 2900      | 500               | Prestige     |
| 18     | 3500      | 600               | Prestige     |
| 19     | 4200      | 700               | Prestige     |
| 20     | 5000      | 800               | Prestige     |

### Simulation

**Eleve actif (4-5 sessions/semaine, ~8 exos/session, ~70% reussite) :**

- Par session : ~86 XP (sous le cap de 100)
- Par semaine : ~300 XP effective (absences, weekends)
- Niv 5 (180 XP) → ~3-4 jours
- Niv 10 (780 XP) → ~2-3 semaines
- Niv 15 (2000 XP) → ~6-7 semaines
- Niv 20 (5000 XP) → ~4-5 mois

**Eleve occasionnel (1-2 sessions/semaine) :**

- Par semaine : ~100-170 XP
- Niv 5 → ~2 semaines
- Niv 10 → ~5-8 semaines
- Niv 15 → ~3-4 mois
- Niv 20 → difficilement atteignable sur l'annee (et c'est voulu)

### Deblocages par niveau

| Niveau | Deblocage                                                                                  | Type                 |
| ------ | ------------------------------------------------------------------------------------------ | -------------------- |
| 1      | Palotin choisi, apparence de base, reactions simples (correct/incorrect)                   | Visuel + fonctionnel |
| 2      | Bulle de parole : commentaires idle ("Je m'ennuie, fais un exo !")                         | Personnalite         |
| 3      | Reaction aux streaks ("3 d'affilee, pas mal !")                                            | Fonctionnel          |
| 4      | Premier accessoire visuel (ex: petit chapeau)                                              | Cosmetique           |
| 5      | **Hints basiques** — le Palotin peut donner un indice par session                          | Fonctionnel majeur   |
| 6      | Animation speciale quand on se connecte                                                    | Visuel               |
| 7      | Anecdote Ubu #1 debloquee                                                                  | Narratif             |
| 8      | Second accessoire visuel                                                                   | Cosmetique           |
| 9      | Le Palotin commente le type d'exercice ("Ah, des fractions ! Mon prefere / Ma bete noire") | Personnalite         |
| 10     | **Bonus quotidien** — le Palotin offre 1 gidouille/jour                                    | Fonctionnel majeur   |
| 11     | Reactions aux erreurs plus detaillees (encouragements personnalises)                       | Personnalite         |
| 12     | Troisieme accessoire / evolution visuelle                                                  | Cosmetique           |
| 13     | Anecdote Ubu #2                                                                            | Narratif             |
| 14     | Le Palotin reagit aux cartes VIP obtenues                                                  | Fonctionnel          |
| 15     | **2 hints par session** + hints plus precis                                                | Fonctionnel majeur   |
| 16     | Apparence prestige (evolution visuelle majeure)                                            | Cosmetique           |
| 17     | Le Palotin peut "parler" aux Palotins des camarades (messages predefinis)                  | Social               |
| 18     | Anecdote Ubu #3 + replique exclusive                                                       | Narratif             |
| 19     | Animation de prestige                                                                      | Visuel               |
| 20     | **Titre "Palotin Royal"** visible par la classe + skin doree                               | Social + cosmetique  |

---

## Systeme de streak

### Mecanisme

- **Condition** : connexion + au moins 1 exercice complete dans la journee
- **Le Palotin porte le streak** visuellement (compteur, flamme, etc.)
- **Perte du streak** : le Palotin est triste 1 jour, puis repart. Pas de punition mecanique, juste emotionnelle. Le compteur streak remet a zero mais l'XP acquise reste.
- **Le streak est un bonus d'XP**, pas une condition. Un eleve sans streak progresse quand meme, juste moins vite.

### Protection du streak

- **Carte VIP "Bouclier de streak"** : protege le streak 1 jour (nouvelle action VIP `streak_shield`)
- Integration naturelle avec le systeme VIP existant

---

## Integration systeme VIP

Le buddy ne remplace pas les cartes VIP, il les **enrichit** :

### Nouvelles actions de cartes VIP

| Action              | Effet                                             |
| ------------------- | ------------------------------------------------- |
| `unlock_buddy_skin` | Debloque un cosmetique specifique pour le Palotin |
| `buddy_xp_boost`    | Double l'XP pendant 24h                           |
| `streak_shield`     | Protege le streak pendant 1 jour                  |

### Reactions du Palotin aux cartes (niv 14+)

- **Giron** : "Oh, une legendaire ! DONNE !"
- **Pile** : "Hmm, celle-ci est rare... sais-tu pourquoi ?"
- **Cotice** : "Trop bien ! Montre aux autres !"

---

## Presence permanente

### Position et affichage

**Desktop (>768px) :**

- Buddy visible en bas a droite, ~80-100px
- Bulle de parole au-dessus, disparait apres 4-5s
- Animation idle quand inactif

**Mobile (<768px) :**

- Icone reduite ~60px en bas a droite (zone tactile 64px)
- Bulle de parole au-dessus, largeur max ~70% de l'ecran, disparait apres 4-5s
- Tap sur l'icone = affiche la derniere bulle ou l'etat du buddy (streak, niveau)

**Les deux :**

- Reactions pendant les exercices (correct/incorrect/hint)

### Interactions

- Reactions aux reponses de l'eleve (expressions, messages)
- Indices contextuels (debloques par niveau)
- Encouragements adaptes a la personnalite du Palotin
- Remarques entre Palotins (dans des contextes speciaux)

---

## Architecture des messages (mix pre-ecrit + IA)

### Principe

~90% des messages sont **pre-ecrits** (instantanes, zero cout). ~10% sont **generes par IA** via Groq (hints contextuels). Le MVP peut demarrer 100% pre-ecrit et ajouter l'IA plus tard.

### Messages pre-ecrits

Banque de messages par Palotin, par contexte. Pioche aleatoire avec rotation anti-repetition.

| Contexte                               | Par Palotin | Total (x3) |
| -------------------------------------- | ----------- | ---------- |
| Bonne reponse                          | 20          | 60         |
| Mauvaise reponse                       | 15          | 45         |
| Idle                                   | 15          | 45         |
| Streak (par palier)                    | 10          | 30         |
| Level up (par niveau)                  | 20          | 60         |
| Commentaire par theme math (~8 themes) | 16          | 48         |
| Reaction carte VIP (par rarete)        | 8           | 24         |
| Onboarding / presentation              | 3           | 9          |
| **Total**                              | **~107**    | **~321**   |

Les messages peuvent etre generes par batch via ChatGPT en lui donnant la personnalite de chaque Palotin.

### Repartition pre-ecrit vs IA

| Contexte                  | Frequence  | Approche                | Raison                                      |
| ------------------------- | ---------- | ----------------------- | ------------------------------------------- |
| Bonne reponse             | Tres haute | **Pre-ecrit**           | Instantane, pas besoin de contexte          |
| Mauvaise reponse          | Tres haute | **Pre-ecrit**           | Instantane, encouragement immediat          |
| Idle / commentaires       | Moyenne    | **Pre-ecrit**           | Ambiance, pas critique                      |
| Streak milestones         | Rare       | **Pre-ecrit**           | Moment important mais previsible            |
| Level up                  | Rare       | **Pre-ecrit**           | Message de celebration unique par niveau    |
| Hints sur exercice        | Basse      | **IA (Groq)**           | Doit etre contextuel au probleme specifique |
| Reaction cartes VIP       | Basse      | **Pre-ecrit**           | Quelques messages par rarete suffisent      |
| Anecdotes narratives      | Tres rare  | **Pre-ecrit**           | Contenu editorial, doit etre soigne         |
| Commentaire type exercice | Moyenne    | **Pre-ecrit par theme** | Quelques messages par thematique            |

### Endpoint `/api/buddy-chat` (hints IA uniquement)

Nouvel endpoint dedie, reutilisant l'infrastructure Groq existante (`/api/chat`).

**Requete :**

```json
{
	"palotinType": "giron",
	"context": {
		"exerciseType": "fractions",
		"statement": "Calculer 3/4 + 1/2",
		"studentAnswer": "4/6",
		"correctAnswer": "5/4",
		"studentGrade": "6",
		"buddyLevel": 12
	}
}
```

**Reponse :**

```json
{
	"message": "T'as additionne les numerateurs ET les denominateurs ? Non non non. Quand les denominateurs sont differents, faut d'abord les mettre au meme niveau !",
	"emotion": "thinking"
}
```

**Architecture (reutilisation existante) :**

| Composant              | Existant                            | Nouveau                           |
| ---------------------- | ----------------------------------- | --------------------------------- |
| Groq API (fetch, auth) | `src/lib/server/env.ts`             | Reutilise tel quel                |
| Modele                 | `llama-3.3-70b-versatile`           | Meme modele                       |
| Rate limiter           | `src/lib/server/rateLimiter.ts`     | Nouveaux quotas dedies            |
| Validation Zod         | `src/lib/server/validation/chat.ts` | Nouveau schema buddy              |
| Personnalites          | `src/lib/config/personalities.ts`   | 3 nouvelles personnalites Palotin |

**Rate limiting buddy-chat :**

- 3 hints par session (debloque au niveau 5, passe a 5 au niveau 15)
- 10 hints par jour par eleve
- Cout estime negligeable : ~50 tokens/appel, quelques hints/session

**System prompt (exemple Giron) :**

```
Tu es Giron, un Palotin compagnon mathematique. Tu es fonceur, enthousiaste,
un peu tete brulee. Tu parles en phrases courtes et exclamatives.
Tu t'enerves contre les exercices difficiles, jamais contre l'eleve.
Tu donnes un indice en 1-2 phrases MAX, sans donner la reponse.
Tu ne fais jamais la morale. Tu es un pote, pas un prof.
L'eleve est en classe de [grade]. Adapte ton vocabulaire.
```

---

## Persistance DB

### Table `student_buddies`

```
student_buddies
├── student_id (FK profiles, PK)
├── palotin_type (enum: giron, pile, cotice)
├── xp (integer, never decreases)
├── level (integer, cached from xp)
├── current_streak (integer, days)
├── longest_streak (integer, record)
├── last_activity_date (date, for streak calc)
├── equipped_skin_id (FK buddy_skins, nullable)
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

### Table `buddy_skins`

```
buddy_skins
├── id (uuid, PK)
├── palotin_type (enum: giron, pile, cotice)
├── name (text)
├── description (text)
├── image_path (text)
├── unlock_method (enum: level, vip_card)
├── unlock_requirement (jsonb: {level: 4} or {card_id: "xxx"})
├── sort_order (integer)
└── is_enabled (boolean)
```

---

## Prompt ChatGPT pour generer les messages pre-ecrits

Lancer ce prompt **une fois par Palotin** en changeant la section personnalite.

### Prompt (Giron)

```
Tu vas m'aider a generer une banque de messages pre-ecrits en francais pour un compagnon virtuel dans une application educative de mathematiques destinee a des collegiens/lyceens francophones.

## Le personnage : GIRON

Giron est un Palotin (personnage inspire d'Alfred Jarry / Ubu Roi). C'est un compagnon qui accompagne l'eleve pendant qu'il fait des exercices de maths.

**Personnalite** : L'aventurier impatient. Fonceur, enthousiaste, un peu tete brulee. Il voit les maths comme un defi, un combat. Il s'enerve contre les exercices difficiles, JAMAIS contre l'eleve. Trop confiant, il se trompe parfois et l'assume. Il parle en phrases courtes et exclamatives, avec un argot leger. Il n'est PAS un prof, c'est un pote.

**Regles** :
- Tutoiement obligatoire
- Jamais condescendant, jamais moralisateur
- Jamais de "tu aurais du" ou "il fallait"
- Pas d'emojis
- 1-2 phrases max par message
- Vocabulaire adapte a des 11-17 ans
- Il peut mentionner le "Pere Ubu" (son patron) de temps en temps avec moquerie
- Il peut utiliser des exclamations inventees style Jarry ("Cornegidouille", "Par ma chandelle verte") mais rarement (1 message sur 5 max)

## Messages a generer

Genere les messages au format JSON suivant :

{
  "correct": ["message1", "message2", ...],
  "incorrect": ["message1", "message2", ...],
  "idle": ["message1", "message2", ...],
  "streak_3": ["message1", ...],
  "streak_7": ["message1", ...],
  "streak_14": ["message1", ...],
  "streak_30": ["message1", ...],
  "streak_lost": ["message1", ...],
  "level_up": ["message1", ...],
  "theme_fractions": ["message1", ...],
  "theme_geometry": ["message1", ...],
  "theme_algebra": ["message1", ...],
  "theme_calcul_mental": ["message1", ...],
  "theme_proportions": ["message1", ...],
  "theme_statistiques": ["message1", ...],
  "theme_nombres": ["message1", ...],
  "theme_equations": ["message1", ...],
  "vip_card_common": ["message1", ...],
  "vip_card_rare": ["message1", ...],
  "vip_card_epic": ["message1", ...],
  "vip_card_legendary": ["message1", ...],
  "onboarding": ["message1", ...]
}

**Quantites demandees** :
- correct : 20 messages
- incorrect : 15 messages
- idle : 15 messages
- streak_3, streak_7, streak_14, streak_30 : 3 messages chacun
- streak_lost : 4 messages
- level_up : 20 messages (un par niveau, du 1 au 20, de plus en plus impressionnes)
- theme_* : 2 messages par theme
- vip_card_* : 2 messages par rarete
- onboarding : 3 messages (le Palotin se presente a l'eleve pour la premiere fois)

Assure-toi que chaque message est unique, varie, et fidele a la personnalite du personnage. Les messages "correct" doivent varier en intensite (de "pas mal" a "explosion de joie"). Les messages "incorrect" ne doivent JAMAIS culpabiliser l'eleve.
```

### Variante personnalite pour Pile

```
**Personnalite** : Le reveur philosophe. Calme, contemplatif, un peu lunaire. Il voit les maths comme des mysteres a contempler. Satisfaction tranquille quand l'eleve reussit, il pousse a reflechir plus loin. Dedramatise les erreurs avec philosophie. Part dans des digressions bizarres et fait des liens improbables. Il parle en phrases longues, ton pose, metaphores inattendues. Il n'est PAS un prof, c'est un compagnon sage et un peu bizarre.
```

### Variante personnalite pour Cotice

```
**Personnalite** : Le pote encourageant. Chaleureux, sociable, optimiste. Il voit les maths partout dans la vie quotidienne. Celebre avec l'eleve, partage la joie. Rassure et relativise quand ca se passe mal. Fait des paralleles avec des choses connues (pizza, jeux video, sport...). Bavard, blagues pas toujours droles, un peu pot de colle. Ton conversationnel, references au quotidien. Il n'est PAS un prof, c'est un pote.
```

---

## Contexte litteraire

Les Palotins apparaissent dans _Ubu Roi_ (1896) et _Cesar-Antechrist_ d'Alfred Jarry. Leurs noms sont des termes heraldiques :

- **Giron** : partition triangulaire d'un blason
- **Pile** : pointe triangulaire inversee sur un ecu
- **Cotice** : bande diagonale etroite

Jarry joue sur ces noms (quand Bougrelas coupe Giron en quatre, il devient un "gironne"). L'origine geometrique/heraldique des noms cree un lien naturel avec les mathematiques.

---

## Decisions prises

- [x] **Personnalites** : 3 Palotins distincts (Giron, Pile, Cotice) — valide
- [x] **Direction artistique** : Illustration dessinee (IA generative ChatGPT), humanoides, style marionnette grotesque mais attachant → convertie en sprite sheets
- [x] **Messages** : Mix pre-ecrit (~90%) + IA Groq pour hints (~10%)
- [x] **Endpoint IA** : Nouveau `/api/buddy-chat` dedie, reutilisant l'infra Groq existante
- [x] **XP** : Systeme structurant, progression permanente, non achetable

## Choix du Palotin

### Quand

A la **premiere connexion**, avant d'acceder au dashboard. Le choix du buddy est un moment fun qui cree un lien immediat.

### Comment — Quiz de personnalite + presentation

**Flow complet :**

1. Ecran titre : "Choisis ton Palotin !" avec les 3 silhouettes
2. 4 questions, une par ecran, reponses en gros boutons
3. Resultat : "On te suggere **[Palotin]** !" avec le Palotin qui se presente (bulle onboarding)
4. En dessous : les 2 autres Palotins, cliquables, avec leurs bulles aussi
5. Bouton "Choisir" sur chacun des 3
6. Confirmation : "Tu pars avec [Palotin] ?" → Oui / Non

**Questions du quiz :**

**Q1 — "Un exercice te resiste. Tu fais quoi ?"**

- A) Je fonce, je teste des trucs jusqu'a ce que ca passe → Giron
- B) Je prends du recul, j'essaie de comprendre pourquoi ca coince → Pile
- C) Je demande un coup de main ou je regarde un exemple → Cotice

**Q2 — "Qu'est-ce qui te donne le plus envie de continuer ?"**

- A) Battre mon record ou aller plus vite que la derniere fois → Giron
- B) Comprendre un truc que je comprenais pas avant → Pile
- C) Voir que je progresse avec les autres → Cotice

**Q3 — "Tes potes diraient que tu es plutot..."**

- A) Celui/celle qui fonce en premier → Giron
- B) Celui/celle qui pose les questions bizarres → Pile
- C) Celui/celle qui met l'ambiance → Cotice

**Q4 — "Les maths pour toi c'est..."**

- A) Un defi a relever → Giron
- B) Un mystere a explorer → Pile
- C) Plus sympa quand on est bien accompagne → Cotice

**Scoring :** +1 par reponse au Palotin correspondant. Score max 4. En cas d'egalite, les ex-aequo sont mis en avant et l'eleve tranche.

### Changement de Palotin

- **Premier changement gratuit** (droit a l'erreur)
- Ensuite : coute des gidouilles (ex: 50)
- **L'XP est toujours conservee** — on ne punit pas la progression

---

## Decisions prises

- [x] **Personnalites** : 3 Palotins distincts (Giron, Pile, Cotice) — valide
- [x] **Direction artistique** : Illustration dessinee (IA generative ChatGPT), humanoides, style marionnette grotesque mais attachant → convertie en sprite sheets
- [x] **Messages** : Mix pre-ecrit (~90%) + IA Groq pour hints (~10%)
- [x] **Messages pre-ecrits** : 396 textes dans `src/lib/config/buddy-messages.ts` (321 messages contextuels + 30 anecdotes de niveau + 45 idle lore)
- [x] **Endpoint IA** : Nouveau `/api/buddy-chat` dedie, reutilisant l'infra Groq existante
- [x] **XP** : Systeme structurant, progression permanente, non achetable
- [x] **Choix du Palotin** : A la premiere connexion, quiz de personnalite (4 questions) + presentation des 3 + choix libre
- [x] **Changement de Palotin** : 1er gratuit, puis payant en gidouilles, XP conservee
- [x] **Animations** : differe — images statiques + CSS simple pour le MVP, Rive envisage pour v2
- [x] **Mobile** : icone reduite 60px (zone tactile 64px) en bas a droite, bulles au-dessus (max 70% largeur, 4-5s)

- [x] **Skins** : 6 skins de niveau (base, acc.1, acc.2, evolution, prestige, royal) + skins VIP en v2
- [x] **Skins VIP** : skin debloque pour le Palotin actuel, conserve si changement
- [x] **Equilibrage XP** : 5000 XP total niv 20, cap 100/jour (hors milestones streak), streak x14 ajoute (100 XP)
- [x] **Contenu narratif** : 10 anecdotes/Palotin + 15 idle lore/Palotin = 75 textes generes et integres

## Skins detailles

### Skins par niveau (MVP)

| Niveau | Skin             | Description                                     |
| ------ | ---------------- | ----------------------------------------------- |
| 1      | **Base**         | Apparence de depart, simple                     |
| 4      | **Accessoire 1** | Petit chapeau / bandeau / echarpe               |
| 8      | **Accessoire 2** | Arme heraldique (epee en bois, bouclier, baton) |
| 12     | **Evolution**    | Look enrichi (vetements detailles, couleurs)    |
| 16     | **Prestige**     | Evolution majeure (cape, armure legere, aura)   |
| 20     | **Royal**        | Skin doree, couronne, titre "Palotin Royal"     |

**Assets** : 6 skins x 3 Palotins = 18 images

### Skins VIP (v2, apres validation du concept)

| Skin           | Rarete carte | Description                                           |
| -------------- | ------------ | ----------------------------------------------------- |
| **Pirate**     | Rare         | Bandeau sur l'oeil, chapeau tricorne                  |
| **Savant fou** | Rare         | Blouse blanche, lunettes, cheveux en l'air            |
| **Sportif**    | Rare         | Maillot, bandeau, baskets                             |
| **Chevalier**  | Epique       | Armure complete, ecu heraldique                       |
| **Astronaute** | Epique       | Combinaison spatiale, casque                          |
| **Pere Ubu**   | Legendaire   | Deguise en mini Pere Ubu (couronne, ventre a spirale) |

**Mecanique** : nouvelle action VIP `unlock_buddy_skin` → debloque le skin pour le Palotin actuel, conserve si changement de Palotin.

---

## Contenu narratif

### Anecdotes de niveau (10 par Palotin, 30 total)

Debloquees tous les 2 niveaux a partir du niveau 3. Mix lore invente et anecdotes litteraires.

| Niveau | Type       | Theme                                                                 |
| ------ | ---------- | --------------------------------------------------------------------- |
| 3      | Lore       | Presentation du Palotin (comment il est devenu Palotin)               |
| 5      | Lore       | Relation avec les deux autres Palotins                                |
| 7      | Lore       | Mission ratee pour le Pere Ubu (comique)                              |
| 9      | Litteraire | Jarry et la creation d'Ubu Roi (15 ans, parodie prof, scandale 1896)  |
| 11     | Lore       | Secret sur le Pere Ubu                                                |
| 13     | Litteraire | Origine des noms heraldiques (Giron, Pile, Cotice = formes de blason) |
| 15     | Lore       | Ce que le Palotin pense vraiment des maths                            |
| 17     | Litteraire | La pataphysique ("science des solutions imaginaires")                 |
| 18     | Lore       | Souvenir complice entre les 3 Palotins                                |
| 20     | Lore       | Confidence exclusive (moment intime)                                  |

### Idle lore (15 par Palotin, 45 total)

Bribes de lore qui apparaissent aleatoirement en idle a partir du niveau 5. Themes : habitudes du Pere Ubu, la Mere Ubu, la chandelle verte, les gidouilles, les autres Palotins, souvenirs de missions.

**Tout le contenu est genere et integre dans `src/lib/config/buddy-messages.ts`.**

---

## Decisions a prendre

- [ ] Role de l'enseignant : visibilite niveaux, XP bonus, desactivation ?
- [ ] Interactions sociales (niv 17+) : visibilite du Palotin des autres, risque moquerie ?
- [ ] Scope MVP vs features differees
