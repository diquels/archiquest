# ArchiQuest

ArchiQuest est une application web interactive pour explorer des bâtiments remarquables (architecture) par ville, avec carte, fiches détaillées et outils de repérage photo. Elle fonctionne sans build (React UMD + Babel côté navigateur) et s’appuie sur une petite API Node pour la persistance et l’index des villes.

## Fonctionnalités clés
- Vue galerie + vue carte (Leaflet/OpenStreetMap)
- Filtres : type, architecte, année, ville/région
- Notes personnelles, étoiles, sélection, planification
- Statuts photo : repéré / photographié
- Ajout et édition de bâtiments (overrides)
- Sélection de ville avec recherche rapide (API)
- Export d’itinéraires Google Maps par ville

## Architecture (vue d’ensemble)
- Frontend statique : `index.html` + `app.js` + `styles.css` + données JS
- Pas de build : React 18 UMD + Babel Standalone en runtime
- Backend API (Node/Express) : persistance JSON + index de villes
- Déploiement recommandé : `docker-compose.yml` (Nginx + API)

## Démarrage rapide (Docker)
```bash
cd /var/www/archiquest
docker-compose up -d
```
- App : `http://<votre-hote>:8080`
- API : `http://<votre-hote>:8080/api` (reverse proxy Nginx)

Arrêt :
```bash
docker-compose down
```
Logs :
```bash
docker-compose logs -f
```

## Démarrage local (sans Docker)
Option 1 : frontend seul (pas de persistance serveur)
```bash
python -m http.server 8000
```
Puis ouvrir `http://localhost:8000`. L’app tentera d’appeler `/api/*` ; si l’API n’est pas lancée, la persistance est simplement inactive.

Option 2 : frontend + API local
```bash
# Terminal 1 (frontend statique)
python -m http.server 8000

# Terminal 2 (API)
cd api
npm install
DATA_JS_PATH=../data.js STATE_PATH=../.local/state.json CITIES_INDEX_PATH=../.local/cities.index.json npm start
```
Dans ce mode, la persistance est stockée dans `.local/` (créé automatiquement).

## Déploiement (Docker + Nginx)
`docker-compose.yml` lance :
- `archiquest` (Nginx) qui sert les fichiers statiques
- `archiquest_api` (Node) pour `/api/*`

Le reverse proxy interne est défini dans `nginx.conf`.

## Données et stockage

### Données “bâtiments”
**Source principale** : `data.js`
- Expose `window.ARCHIQUEST_RAW_DATA` (Array d’objets).
- Chaque entrée représente un bâtiment.

Exemple de schéma (champs principaux) :
- `id` (nombre ou string unique)
- `city` (ville)
- `type` (Logement, Culture, etc.)
- `name`
- `architect`
- `year`
- `address`
- `location_display`
- `img` (URL d’image ou chemin local)
- Champs optionnels possibles : `regionId`, `regionName`, `departmentCode`, `time`, etc.

**Images**
- L’app lit le champ `img` dans `data.js`.
- Si vous mettez des images locales, placez-les dans un dossier du repo (ex: `images/`) et utilisez un chemin relatif : `"images/mon_image.jpg"`.
- Les images externes (URL) fonctionnent aussi.

### Coordonnées GPS
**Fichier** : `coordsById.js`
- Expose `window.ARCHIQUEST_COORDS_BY_ID`.
- Map `{ id: { lat, lng } }`.
- Utilisé pour éviter un geocoding externe.
- Les `id` peuvent être des nombres **ou** des strings (ex: import Metz).

### Détails narratifs / photo
**Fichier** : `detailsById.js`
- Expose `window.ARCHIQUEST_DETAILS_BY_ID`.
- Map `{ id: { why_shoot, story, concept, keywords, architect_bio, photo_tips, photo_plans, moments } }`.
- Utilisé pour enrichir les cartes (raison de shooter, conseils photo, etc.).

### Index des villes (API)
**Fichier généré** : `/data/cities.index.json` (dans le conteneur API)
- Généré automatiquement à partir de `data.js` au premier lancement.
- Peut être reconstruit avec `REBUILD_INDEX=1`.

### Persistance utilisateur (API)
**Fichier** : `/data/state.json` (dans le conteneur API).
Stocké dans le volume Docker `archiquest_state`.
Contient l’état utilisateur : `selectedIds`, `ratings`, `notesById`, `deletedIds`, `customBuildings`, `buildingOverrides`, `planStatus`, `spottedIds`, `shotIds`, et `ui` (`selectedCityId`, `selectedCityLabel`, `recentCities`, `lastCityChangeAt`).

## Flux de données (important pour maintenance)
1. `index.html` charge **dans cet ordre** : `data.js`, `coordsById.js`, `detailsById.js`, puis `app.js`.
2. `app.js` lit les variables globales `window.ARCHIQUEST_*`.
3. Au chargement, l’app tente de lire `/api/state`.
4. Toute modification d’état est sauvée sur `/api/state` (debounce 400 ms).
5. L’API peut reconstruire l’index villes depuis `data.js`.

## Sources de données annexes
Ces fichiers ne sont pas consommés directement par l’app, mais servent de **références** ou d’historique :
- `archiquest_buildings_rennes.json`
- `rennesarhi.json`
- `metz_architecture_enriched.json`

## Structure du projet
```
repo/
├── index.html                # Entrée HTML
├── styles.css                # Styles custom
├── app.js                    # App React (UMD + JSX runtime)
├── data.js                   # Données bâtiments (source principale)
├── coordsById.js             # Coordonnées GPS par id
├── detailsById.js            # Détails narratifs/photo par id
├── api/                      # API Node/Express
│   ├── server.js
│   ├── citiesIndex.js
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml        # Nginx + API
├── nginx.conf                # Reverse proxy /api
├── docs/                     # Notes internes
└── *.json                    # Sources annexes
```

## Notes de conception
- Choix d’un frontend sans build : simplicité de déploiement, mais dépendance aux CDN (React/Babel/Tailwind/Leaflet).
- La persistance passe **exclusivement** par l’API JSON (pas de base de données).
- Le stockage est compatible backup/restauration par simple copie du volume `archiquest_state`.

## Mise à jour / backup
Pour sauvegarder la version VPS dans GitHub :
```bash
cd /var/www/archiquest
git add -A
git commit -m "Sync VPS"
git push
```

## Licence
© Pierre Diquelou - Tous droits réservés
