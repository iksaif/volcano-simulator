# 🧪 Référence des Matériaux

Guide complet de tous les matériaux du simulateur physique Volcano, incluant leurs propriétés physiques et transitions de phase.

## Vue d'ensemble

Le simulateur inclut 10 matériaux avec des propriétés physiques réalistes basées sur des valeurs réelles. Chaque matériau a des caractéristiques uniques qui déterminent son comportement dans la simulation.

## États des Matériaux

Les matériaux existent dans trois états physiques :

- **🪨 Solide** : Tombe verticalement, peut former des structures
- **💧 Liquide** : Tombe et s'écoule horizontalement
- **💨 Gaz** : Se disperse et monte (se comporte actuellement comme les liquides)

## Matériaux par Type

### 🌋 Lave

**Type** : Liquide
**Description** : Roche basaltique en fusion - le cœur de l'activité volcanique

**Propriétés Physiques** :
- Densité : 3 100 kg/m³
- Viscosité : 100 Pa·s (normalisée : ~135)
- Conductivité Thermique : 0,8 W/(m·K)
- Capacité Thermique : 1,2 kJ/(kg·K)
- Couleur : Rouge-orange (`#ff4500`)

**Transitions de Phase** :
- Refroidit en **Roche** en dessous de 1 000°C

**Comportement** :
- Très chaude (1 200°C+ au spawn)
- S'écoule lentement due à sa haute viscosité
- Excellent conducteur de chaleur - réchauffe rapidement les matériaux voisins
- Plus dense que l'eau - coule et la déplace

**Notes réelles** :
- Lave basaltique (type fluide) : 10-1 000 Pa·s
- Lave rhyolitique (type épais) : 100 000-10 000 000 Pa·s
- Point de solidification : 800-1 200°C

---

### 🪨 Roche

**Type** : Solide
**Description** : Basalte/granite solidifié - le matériau de fondation

**Propriétés Physiques** :
- Densité : 2 700 kg/m³
- Viscosité : ∞ (ne s'écoule pas)
- Conductivité Thermique : 0,3 W/(m·K)
- Capacité Thermique : 0,8 kJ/(kg·K)
- Couleur : Brun foncé (`#3d2817`)

**Transitions de Phase** :
- Fond en **Lave** au-dessus de 1 200°C

**Comportement** :
- Tombe et s'empile pour former des structures
- Forme des ponts quand froide (intégrité structurelle)
- Conducteur de chaleur modéré
- Peut être érodée/brisée par la pression

**Notes réelles** :
- Densité du granite : ~2 700 kg/m³, basalte : ~2 900 kg/m³
- Point de fusion : 1 100-1 250°C
- Conductivité thermique : 1,5-3,5 W/(m·K)

---

### 🌊 Eau

**Type** : Liquide
**Description** : H₂O liquide pur - essentiel pour les interactions thermiques

**Propriétés Physiques** :
- Densité : 1 000 kg/m³
- Viscosité : 0,001 Pa·s (normalisée : ~15)
- Conductivité Thermique : 0,6 W/(m·K)
- Capacité Thermique : 4,2 kJ/(kg·K) ⭐ (la plus élevée !)
- Couleur : Bleu profond (`#1e90ff`)

**Transitions de Phase** :
- Gèle en **Glace** à 0°C
- Bout en **Vapeur** à 100°C (expansion ×4)

**Comportement** :
- S'écoule rapidement grâce à sa faible viscosité
- Excellent puits de chaleur grâce à sa très haute capacité thermique
- Se dilate considérablement en bouillant (1 cellule → 4 cellules)
- Bon conducteur thermique

**Notes réelles** :
- Plus haute capacité thermique des liquides courants
- Expansion de volume en bouillant : ~1 600× (simplifié à 4× pour le gameplay)
- Pratiquement incompressible

---

### 🧊 Glace

**Type** : Solide
**Description** : Eau gelée - H₂O solide

**Propriétés Physiques** :
- Densité : 917 kg/m³ (moins dense que l'eau !)
- Viscosité : ∞ (ne s'écoule pas)
- Conductivité Thermique : 0,5 W/(m·K)
- Capacité Thermique : 2,1 kJ/(kg·K)
- Couleur : Cyan clair (`#b0e5f5`)

**Transitions de Phase** :
- Fond en **Eau** au-dessus de 0°C

**Comportement** :
- Tombe et forme des structures comme la roche
- Forme des ponts froids (renforcés par la basse température)
- Conduit la chaleur mieux que l'eau
- Flotte sur l'eau (densité plus faible)

**Notes réelles** :
- Moins dense que l'eau - la glace flotte !
- Conduit la chaleur 4× mieux que l'eau
- Capacité thermique environ moitié de l'eau

---

### ☁️ Vapeur

**Type** : Gaz
**Description** : Vapeur d'eau (steam) provenant de l'eau bouillante

**Propriétés Physiques** :
- Densité : 0,6 kg/m³
- Viscosité : 0,000012 Pa·s (normalisée : ~1)
- Conductivité Thermique : 0,02 W/(m·K)
- Capacité Thermique : 2,0 kJ/(kg·K)
- Couleur : Bleu clair (`#b0e0e6`)

**Transitions de Phase** :
- Condense en **Eau** en dessous de 100°C (probabiliste, 2% de chance de base par frame)

**Comportement** :
- Créée quand l'eau bout (4 cellules de vapeur par cellule d'eau)
- Se disperse rapidement - très faible viscosité
- Refroidit graduellement vers la température ambiante
- La condensation est probabiliste pour éviter l'effondrement instantané

**Notes réelles** :
- L'ébullition de l'eau produit une expansion de volume ~1 600×
- Moins visqueuse que l'air
- Probabilité de condensation dépend de la sursaturation

---

### 💨 Air

**Type** : Gaz
**Description** : Air atmosphérique normal (78% N₂, 21% O₂, gaz traces)

**Propriétés Physiques** :
- Densité : 1,2 kg/m³
- Viscosité : 0,000018 Pa·s (normalisée : ~2)
- Conductivité Thermique : 0,026 W/(m·K) (excellent isolant)
- Capacité Thermique : 1,0 kJ/(kg·K)
- Couleur : Bleu très clair (`#e6f2ff`)

**Transitions de Phase** :
- Aucune

**Comportement** :
- Matériau "vide" par défaut pouvant être déplacé
- Mauvais conducteur thermique (isolant)
- Utilisé pour effacer d'autres matériaux

**Notes réelles** :
- Contient 21% O₂ (supporte la combustion)
- Excellent isolant thermique
- Conditions atmosphériques standard : 20°C, 1 atm

---

### 🌱 Herbe

**Type** : Solide
**Description** : Matière végétale organique - matériau vivant

**Propriétés Physiques** :
- Densité : 800 kg/m³
- Viscosité : ∞ (ne s'écoule pas)
- Conductivité Thermique : 0,4 W/(m·K)
- Capacité Thermique : 1,5 kJ/(kg·K)
- Couleur : Vert forêt (`#228b22`)

**Transitions de Phase** :
- Meurt quand température < -10°C ou > 200°C
- Brûle en **Cendre** au-dessus de 200°C

**Comportement** :
- Se propage vers la roche/cendre voisine avec faible probabilité
- Nécessite une température modérée (-10°C à 200°C)
- Inflammable (ignition réelle : 300-350°C)

**Notes réelles** :
- Densité de l'herbe fraîche : 800-1 000 kg/m³
- Dommages de gel commencent : -5 à -15°C
- Décomposition thermique : 150-250°C

---

### 🌫️ Cendre

**Type** : Solide
**Description** : Cendre volcanique - fines particules de roche et minéraux

**Propriétés Physiques** :
- Densité : 700 kg/m³
- Viscosité : 10 Pa·s (s'écoule comme du sable)
- Conductivité Thermique : 0,3 W/(m·K)
- Capacité Thermique : 0,8 kJ/(kg·K)
- Couleur : Gris (`#808080`)

**Transitions de Phase** :
- Aucune

**Comportement** :
- Matériau granulaire - s'écoule comme du sable
- Viscosité plus faible que la roche solide
- Peut être colonisée par l'herbe
- Produite quand l'herbe brûle

**Notes réelles** :
- Cendre volcanique en vrac : 600-800 kg/m³
- Consiste en fines particules de roche et verre volcanique

---

### 🔵 Gaz (Volcanique)

**Type** : Gaz
**Description** : Gaz volcanique générique (mélange CO₂/SO₂)

**Propriétés Physiques** :
- Densité : 1,0 kg/m³
- Viscosité : 0,000019 Pa·s (normalisée : ~2)
- Conductivité Thermique : 0,025 W/(m·K)
- Capacité Thermique : 1,0 kJ/(kg·K)
- Couleur : Gris foncé (`#666666`)

**Transitions de Phase** :
- Aucune

**Comportement** :
- Plus dense que l'air (CO₂, SO₂)
- Légèrement plus visqueux que l'air
- Mauvais conducteur thermique

**Notes réelles** :
- Densité CO₂ : 1,98 kg/m³, SO₂ : 2,26 kg/m³
- Émissions volcaniques courantes

---

## Diagramme des Transitions de Phase

```
        -10°C        0°C         100°C       200°C       1 000°C     1 200°C
         │           │            │           │            │           │
  Herbe──┴──Herbe────┴────────────┴───(meurt)┴──→ Cendre  │           │
                     │            │                        │           │
          Glace ─────┴──→ Eau ───┴──→ Vapeur              │           │
                          (×1)      (×4)                   │           │
                                                           │           │
                                              Lave ────────┴──→ Roche ─┴──→ Lave
                                                                        (×1)
```

**Légende** :
- (×N) = Ratio d'expansion de volume pendant la transition
- → = Direction de transition de phase

## Tableaux de Comparaison des Propriétés

### Classement par Densité (kg/m³)

| Matériau | Densité | Comportement |
|----------|---------|--------------|
| 🌋 Lave | 3 100 | Coule à travers tout |
| 🪨 Roche | 2 700 | Coule à travers liquides/gaz |
| 🌊 Eau | 1 000 | Coule à travers les gaz |
| 🧊 Glace | 917 | Flotte sur l'eau ! |
| 🌱 Herbe | 800 | Tombe comme la roche |
| 🌫️ Cendre | 700 | Tombe, s'écoule comme du sable |
| 💨 Air | 1,2 | "Vide" par défaut |
| 🔵 Gaz | 1,0 | Légèrement plus léger que l'air |
| ☁️ Vapeur | 0,6 | Matériau le plus léger |
| Vide | 0 | Vide/vacuum |

### Vitesse d'Écoulement (Viscosité)

| Matériau | Viscosité (Pa·s) | Vitesse d'écoulement |
|----------|------------------|----------------------|
| ☁️ Vapeur | 0,000012 | La plus rapide |
| 💨 Air | 0,000018 | Très rapide |
| 🔵 Gaz | 0,000019 | Très rapide |
| 🌊 Eau | 0,001 | Rapide |
| 🌫️ Cendre | 10 | S'écoule comme du sable |
| 🌋 Lave | 100 | Lente |
| 🪨 Roche | ∞ | Ne s'écoule pas |
| 🧊 Glace | ∞ | Ne s'écoule pas |
| 🌱 Herbe | ∞ | Ne s'écoule pas |

### Propriétés Thermiques

| Matériau | Conductivité | Capacité Thermique | Notes |
|----------|--------------|-------------------|-------|
| 🌋 Lave | 0,8 | 1,2 | Excellent conducteur |
| 🌊 Eau | 0,6 | 4,2 ⭐ | Meilleur puits de chaleur |
| 🧊 Glace | 0,5 | 2,1 | Bon conducteur |
| 🌱 Herbe | 0,4 | 1,5 | Modéré |
| 🪨 Roche | 0,3 | 0,8 | Modéré |
| 🌫️ Cendre | 0,3 | 0,8 | Comme la roche |
| 💨 Air | 0,026 | 1,0 | Isolant |
| 🔵 Gaz | 0,025 | 1,0 | Isolant |
| ☁️ Vapeur | 0,02 | 2,0 | Mauvais conducteur |

## Propriétés Avancées

### Expansion Thermique

Augmentation du volume par degré :

- **Gaz** : ~0,003 1/K (haute expansion)
- **Liquides** : ~0,0002 1/K (expansion modérée)
- **Solides** : ~0,00001 1/K (expansion minimale)

Les matériaux chauds sont moins denses → montent par flottabilité (convection).

### Effets de Température

La température modifie la densité par expansion thermique :

```
densité_réelle = densité_base / (1 + α × ΔT)
```

Où :
- α = coefficient d'expansion thermique
- ΔT = température - 20°C

Cela crée des courants de convection dans les liquides et gaz.

### Propriétés Structurelles

**Formation de Ponts** (solides froids) :
- La glace et la roche peuvent former des ponts stables
- Force = `densité × (1 + facteur_refroidissement) × supports`
- S'effondre sous haute pression

**Écoulement Granulaire** (cendre) :
- S'écoule comme du sable plutôt que de tomber en blocs
- Viscosité effective plus faible

## Astuces pour Interactions entre Matériaux

### Refroidir la Lave Rapidement
- Utiliser de l'eau - haute capacité thermique absorbe la chaleur
- Crée de la vapeur (expansion de vapeur)
- L'eau refroidit 5× plus vite que l'air

### Créer des Structures
- Utiliser de la roche ou de la glace quand froide
- Les matériaux froids forment des ponts plus solides
- Éviter les situations de haute pression

### Stratégies de Changement de Phase
- Faire bouillir l'eau pour créer des nuages de vapeur
- Geler l'eau pour créer des barrières de glace
- Fondre la roche avec la lave pour sculpter

### Gestion de Température
- L'air est un excellent isolant
- L'eau est un excellent refroidisseur
- La lave réchauffe tout rapidement

## Voir Aussi

- [README Moteur Cellulaire](../src/physics/engines/cellular/README.fr.md) - Comment les matériaux se déplacent
- [Guide de Développement](../README.dev.md) - Ajouter de nouveaux matériaux
- README Principal - Contrôles et fonctionnalités
