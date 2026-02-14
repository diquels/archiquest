const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const {
  buildCitiesIndex,
  loadBuildingsFromDataJs,
  searchCities,
} = require("./citiesIndex");

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_PATH = process.env.STATE_PATH || "/data/state.json";
const CITIES_INDEX_PATH = process.env.CITIES_INDEX_PATH || "/data/cities.index.json";
const DATA_JS_PATH = process.env.DATA_JS_PATH || "/app_data/data.js";
const REBUILD_INDEX = process.env.REBUILD_INDEX === "1";

app.use(cors({ origin: true }));
app.use(express.json({ limit: "2mb" }));

const ensureStateFile = () => {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_PATH)) {
    const initial = {
      selectedIds: [],
      ratings: {},
      notesById: {},
      deletedIds: [],
      planStatus: {},
      customBuildings: [],
      buildingOverrides: {},
      spottedIds: [],
      shotIds: [],
      ui: {
        selectedCityId: null,
        selectedCityLabel: "",
        recentCities: [],
        lastCityChangeAt: null,
      },
    };
    fs.writeFileSync(DATA_PATH, JSON.stringify(initial, null, 2), "utf8");
  }
};

const readState = () => {
  ensureStateFile();
  const raw = fs.readFileSync(DATA_PATH, "utf8");
  return JSON.parse(raw || "{}");
};

const writeStateAtomic = (data) => {
  ensureStateFile();
  const dir = path.dirname(DATA_PATH);
  const temp = path.join(dir, `state.${Date.now()}.tmp`);
  fs.writeFileSync(temp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(temp, DATA_PATH);
};

const ensureCitiesIndex = () => {
  const dir = path.dirname(CITIES_INDEX_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (!fs.existsSync(CITIES_INDEX_PATH) || REBUILD_INDEX) {
    const buildings = loadBuildingsFromDataJs(DATA_JS_PATH);
    const index = buildCitiesIndex(buildings);
    fs.writeFileSync(CITIES_INDEX_PATH, JSON.stringify(index, null, 2), "utf8");
  }
};

const readCitiesIndex = () => {
  ensureCitiesIndex();
  const raw = fs.readFileSync(CITIES_INDEX_PATH, "utf8");
  const data = JSON.parse(raw || "{}");
  return Array.isArray(data.items) ? data : { items: [] };
};

const citiesCache = { index: null, mtimeMs: 0 };
const searchCache = new Map();
const cacheKey = (q, limit, region) => `${q}::${limit}::${region || ""}`;
const normalizeLimit = (value) => {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return 30;
  if (n < 1) return 1;
  if (n > 50) return 50;
  return n;
};

app.get("/api/state", (req, res) => {
  try {
    const data = readState();
    res.json(data || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "read_failed" });
  }
});

app.put("/api/state", (req, res) => {
  try {
    const data = req.body || {};
    writeStateAtomic(data);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "write_failed" });
  }
});

const ensureCitiesCacheLoaded = () => {
  const stat = fs.existsSync(CITIES_INDEX_PATH)
    ? fs.statSync(CITIES_INDEX_PATH)
    : null;
  const mtimeMs = stat ? stat.mtimeMs : 0;
  if (!citiesCache.index || citiesCache.mtimeMs !== mtimeMs) {
    citiesCache.index = readCitiesIndex();
    citiesCache.mtimeMs = mtimeMs;
    searchCache.clear();
  }
};

app.get("/api/cities/regions", (req, res) => {
  try {
    ensureCitiesCacheLoaded();
    const regions = citiesCache.index.regions || [];
    res.json({ regions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "regions_failed" });
  }
});

app.get("/api/cities/search", (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const limit = normalizeLimit(req.query.limit);
    const region = String(req.query.region || "").trim();

    ensureCitiesCacheLoaded();

    const key = cacheKey(q, limit, region);
    if (searchCache.has(key)) {
      return res.json({ items: searchCache.get(key) });
    }

    let pool = citiesCache.index.items || [];
    if (region) {
      pool = pool.filter((c) => c.regionName === region);
    }

    const items = searchCities(pool, q, limit);
    searchCache.set(key, items);
    if (searchCache.size > 200) {
      const firstKey = searchCache.keys().next().value;
      if (firstKey) searchCache.delete(firstKey);
    }

    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "search_failed" });
  }
});

app.listen(PORT, () => {
  console.log(`ArchiQuest API listening on :${PORT}`);
});
