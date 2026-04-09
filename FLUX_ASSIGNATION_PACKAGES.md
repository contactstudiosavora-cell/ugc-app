# 📊 Flux de la Fonctionnalité : Assignation de Scripts aux Packages

## Vue d'ensemble du Flux

```
┌─────────────────────────────────────────────────────────────┐
│  UTILISATEUR : Page Entreprise → Onglet SCRIPTS             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  AFFICHAGE : Liste de tous les scripts de l'entreprise      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 📱 Script #1 - ÉMOTIONNEL          [GÉNÉRÉ]          │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🎯 Script #2 - PROBLÈME/SOL.      [VALIDÉ]          │   │
│  │ 📦 Package Juin 2025                                 │   │
│  │ ─────────────────────────────────────────────────    │   │
│  │ CHANGER DE PACKAGE:  [▼ Dropdown]  [✓ ASSIGNER] [✕] │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
   Script non validé                    Script validé
   ┌────────────┐                      ┌────────────────┐
   │ PAS de     │                      │ Section        │
   │ section    │                      │ d'assignation  │
   │ package    │                      │ visible ✓      │
   └────────────┘                      └────────────────┘
                                               │
                                               ▼
                         ┌─────────────────────────────────────┐
                         │ 1. Sélection d'un package           │
                         │    dans le dropdown                 │
                         └─────────────────────────────────────┘
                                               │
                                               ▼
                         ┌─────────────────────────────────────┐
                         │ 2. Bouton [✓ ASSIGNER] apparaît    │
                         └─────────────────────────────────────┘
                                               │
                                               ▼
                         ┌─────────────────────────────────────┐
                         │ 3. Clic sur [✓ ASSIGNER]           │
                         └─────────────────────────────────────┘
                                               │
                                               ▼
                         ┌─────────────────────────────────────┐
                         │ API CALL:                           │
                         │ PUT /api/scripts/{scriptId}         │
                         │ Body: { packageId: "xxx" }          │
                         └─────────────────────────────────────┘
                                               │
                                               ▼
                         ┌─────────────────────────────────────┐
                         │ MongoDB UPDATE:                     │
                         │ scripts.updateOne(                  │
                         │   { _id: scriptId },                │
                         │   { $set: { packageId: "xxx" } }    │
                         │ )                                   │
                         └─────────────────────────────────────┘
                                               │
                                               ▼
                         ┌─────────────────────────────────────┐
                         │ INTERFACE UPDATE:                   │
                         │ - Badge 📦 apparaît                 │
                         │ - Dropdown se réinitialise          │
                         │ - Bouton ASSIGNER disparaît         │
                         └─────────────────────────────────────┘
```

## Détails des États du Script

```
╔════════════════════════════════════════════════════════════╗
║  STATUTS DE SCRIPT                                         ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  ❌ GÉNÉRÉ          → PAS d'assignation possible          ║
║  ✅ VALIDÉ          → Assignation POSSIBLE                ║
║  🎬 EN PRODUCTION   → Assignation POSSIBLE                ║
║  🎥 FILMÉ           → Assignation POSSIBLE                ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

## Structure des Données

```javascript
// État local du composant
{
  scripts: [
    {
      id: "script-123",
      companyId: "company-456",
      packageId: "package-789",      // ← Peut être null
      packageName: "Pack Juin 2025", // ← Peut être null
      status: "validated",
      angle: "emotional",
      content: "Hook: Tu veux avoir...",
      ...
    }
  ],
  
  packages: [
    {
      id: "package-789",
      name: "Pack Juin 2025",
      scriptType: "ugc",
      companyId: "company-456",
      ...
    }
  ],
  
  assigningPackages: {
    "script-123": "package-999",  // Sélection temporaire
    "script-456": "package-789",
    ...
  }
}
```

## Cas d'Usage Principaux

### 1️⃣ Script sans package → Assignation
```
AVANT:
┌────────────────────────────────────────┐
│ Script: "Hook émotionnel..."           │
│ Package: AUCUN                         │
└────────────────────────────────────────┘

ACTION: Sélectionner "Pack Juin" + Cliquer ASSIGNER

APRÈS:
┌────────────────────────────────────────┐
│ Script: "Hook émotionnel..."           │
│ 📦 Package: Pack Juin 2025            │
└────────────────────────────────────────┘
```

### 2️⃣ Script avec package → Changement
```
AVANT:
┌────────────────────────────────────────┐
│ Script: "Hook émotionnel..."           │
│ 📦 Package: Pack Juin 2025            │
└────────────────────────────────────────┘

ACTION: Sélectionner "Pack Juillet" + Cliquer ASSIGNER

APRÈS:
┌────────────────────────────────────────┐
│ Script: "Hook émotionnel..."           │
│ 📦 Package: Pack Juillet 2025         │
└────────────────────────────────────────┘
```

### 3️⃣ Script avec package → Retrait
```
AVANT:
┌────────────────────────────────────────┐
│ Script: "Hook émotionnel..."           │
│ 📦 Package: Pack Juin 2025            │
└────────────────────────────────────────┘

ACTION: Cliquer sur [✕]

APRÈS:
┌────────────────────────────────────────┐
│ Script: "Hook émotionnel..."           │
│ Package: AUCUN                         │
└────────────────────────────────────────┘
```

## Points Techniques Clés

✅ **Optimistic UI Update** : L'interface se met à jour immédiatement avant la confirmation serveur  
✅ **Gestion d'erreur** : Alert en cas d'échec de l'API  
✅ **État temporaire** : `assigningPackages` stocke les sélections en cours  
✅ **Réactivité** : Bouton ASSIGNER visible uniquement si changement détecté  
✅ **Nettoyage** : État temporaire supprimé après assignation réussie  
