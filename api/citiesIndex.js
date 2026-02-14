const fs = require("fs");
const vm = require("vm");

const CITY_REGION_MAP = {
  "Rennes": "Bretagne",
  "Brest": "Bretagne",
  "Lorient": "Bretagne",
  "Quimper": "Bretagne",
  "Saint-Brieuc": "Bretagne",
  "Vannes": "Bretagne",
  "Chantepie": "Bretagne",
  "Nantes": "Pays de la Loire",
  "Saint-Nazaire": "Pays de la Loire",
  "Metz": "Grand Est",
  "Thionville": "Grand Est",
  "Uckange": "Grand Est",
  "Saint-Louis": "Grand Est",
};

const normalizeText = (value) => {
  if (value == null) return "";
  return String(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
};

const slugifyCityId = (value) => {
  const norm = normalizeText(value);
  return norm.replace(/\s+/g, "-");
};

const loadBuildingsFromDataJs = (dataJsPath) => {
  if (!fs.existsSync(dataJsPath)) return [];
  const code = fs.readFileSync(dataJsPath, "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  const data = sandbox.window.ARCHIQUEST_RAW_DATA;
  return Array.isArray(data) ? data : [];
};

const buildCitiesIndex = (buildings) => {
  const byId = new Map();

  buildings.forEach((b) => {
    const name = (b && b.city) || "";
    if (!name) return;
    const id = slugifyCityId(name);

    const regionId = b.regionId || null;
    const regionName = b.regionName || CITY_REGION_MAP[name] || null;
    const departmentCode = b.departmentCode || null;

    const existing = byId.get(id);
    if (existing) {
      existing.countBuildings += 1;
      return;
    }

    byId.set(id, {
      id,
      name,
      regionId,
      regionName,
      departmentCode,
      countBuildings: 1,
      aliases: [],
      searchName: normalizeText(name),
      searchAliases: [],
    });
  });

  const items = Array.from(byId.values());
  const regions = [...new Set(items.map(c => c.regionName).filter(Boolean))].sort();

  return {
    generatedAt: new Date().toISOString(),
    items,
    regions,
  };
};

const isExactMatch = (searchText, query) => searchText === query;

const isPrefixMatch = (searchText, query) => {
  if (!query) return false;
  if (searchText.startsWith(query)) return true;
  return searchText.split(" ").some((token) => token.startsWith(query));
};

const isContainsMatch = (searchText, query) => {
  if (!query) return false;
  return searchText.includes(query);
};

const scoreCity = (city, query) => {
  const searchName = city.searchName || normalizeText(city.name || "");
  const aliases = Array.isArray(city.searchAliases)
    ? city.searchAliases
    : (city.aliases || []).map(normalizeText);

  if (isExactMatch(searchName, query)) return { score: 0, exact: true };
  if (aliases.some((a) => isExactMatch(a, query))) return { score: 0, exact: true };
  if (isPrefixMatch(searchName, query)) return { score: 1, exact: false };
  if (aliases.some((a) => isPrefixMatch(a, query))) return { score: 1, exact: false };
  if (isContainsMatch(searchName, query)) return { score: 2, exact: false };
  if (aliases.some((a) => isContainsMatch(a, query))) return { score: 2, exact: false };
  return { score: 3, exact: false };
};

const searchCities = (items, query, limit = 30) => {
  const q = normalizeText(query);
  const max = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 50);

  if (!q) {
    return items
      .slice()
      .sort((a, b) => (b.countBuildings || 0) - (a.countBuildings || 0))
      .slice(0, max);
  }

  return items
    .map((city) => ({ city, match: scoreCity(city, q) }))
    .filter((c) => c.match.score < 3)
    .sort((a, b) => {
      if (a.match.score !== b.match.score) return a.match.score - b.match.score;
      if (a.match.exact !== b.match.exact) return a.match.exact ? -1 : 1;
      const bc = b.city.countBuildings || 0;
      const ac = a.city.countBuildings || 0;
      if (bc !== ac) return bc - ac;
      return String(a.city.name).localeCompare(String(b.city.name));
    })
    .slice(0, max)
    .map((c) => c.city);
};

const updateRecentCities = (recent, nextId, max = 10) => {
  const list = Array.isArray(recent) ? recent.slice() : [];
  const filtered = list.filter((id) => id !== nextId);
  filtered.unshift(nextId);
  return filtered.slice(0, max);
};

const getNextActiveIndex = (key, current, length) => {
  if (length <= 0) return -1;
  if (key === "ArrowDown") return Math.min(current + 1, length - 1);
  if (key === "ArrowUp") return Math.max(current - 1, 0);
  return current;
};

module.exports = {
  normalizeText,
  slugifyCityId,
  loadBuildingsFromDataJs,
  buildCitiesIndex,
  searchCities,
  updateRecentCities,
  getNextActiveIndex,
};
