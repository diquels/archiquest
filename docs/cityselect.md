# CitySelect

## Intégration
- Utiliser le composant `CitySelect` dans le header (vue galerie).
- Props requises :
  - `selectedCityId`
  - `selectedCityLabel`
  - `onSelectCity(option | null)`
- L'input interroge `GET /api/cities/search?q=<string>&limit=30` avec debounce 250 ms.
- La sélection met à jour `selectedCityId` et déclenche le filtrage des bâtiments.

## Accessibilité (checklist)
- `role="combobox"` sur l'input, `aria-autocomplete="list"`.
- `aria-expanded` et `aria-controls` pointent le listbox.
- `aria-activedescendant` mis à jour quand l'option active change.
- Liste `role="listbox"` ; options `role="option"`.
- Clavier :
  - Flèches ↑↓ naviguent.
  - Entrée sélectionne.
  - Échap ferme sans perdre la sélection.
  - Tab sort normalement.

## État persistant
- Stocké dans `/api/state` sous `ui` :
  - `selectedCityId`
  - `selectedCityLabel`
  - `recentCities`
  - `lastCityChangeAt`
