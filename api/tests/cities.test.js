const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeText,
  slugifyCityId,
  buildCitiesIndex,
  searchCities,
  updateRecentCities,
  getNextActiveIndex,
} = require("../citiesIndex");

test("normalizeText removes accents and punctuation", () => {
  assert.equal(normalizeText("Saint-Brieuc"), "saint brieuc");
  assert.equal(normalizeText("Évry-Courcouronnes"), "evry courcouronnes");
});

test("slugifyCityId stable slug", () => {
  assert.equal(slugifyCityId("Saint-Brieuc"), "saint-brieuc");
});

test("buildCitiesIndex counts buildings", () => {
  const buildings = [{ city: "Metz" }, { city: "Metz" }, { city: "Rennes" }];
  const index = buildCitiesIndex(buildings);
  const metz = index.items.find((c) => c.id === "metz");
  const rennes = index.items.find((c) => c.id === "rennes");
  assert.equal(metz.countBuildings, 2);
  assert.equal(rennes.countBuildings, 1);
});

test("searchCities exact before prefix, then by count", () => {
  const items = [
    { id: "metz", name: "Metz", countBuildings: 5, searchName: "metz" },
    { id: "metz-environs", name: "Metz-environs", countBuildings: 10, searchName: "metz environs" },
    { id: "thionville", name: "Thionville", countBuildings: 20, searchName: "thionville" },
  ];
  const res = searchCities(items, "metz", 10);
  assert.equal(res[0].id, "metz");
});

test("updateRecentCities keeps LRU order", () => {
  assert.deepEqual(updateRecentCities(["a", "b", "c"], "b", 5), ["b", "a", "c"]);
  assert.deepEqual(updateRecentCities(["a", "b", "c"], "d", 3), ["d", "a", "b"]);
});

test("getNextActiveIndex handles arrows", () => {
  assert.equal(getNextActiveIndex("ArrowDown", -1, 3), 0);
  assert.equal(getNextActiveIndex("ArrowDown", 1, 3), 2);
  assert.equal(getNextActiveIndex("ArrowUp", 0, 3), 0);
});
