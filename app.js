/* app.js
   Application ArchiQuest (React + Tailwind + Leaflet)
   - Utilise des variables globales définies par :
     - data.js            -> window.ARCHIQUEST_RAW_DATA
     - coordsById.js      -> window.ARCHIQUEST_COORDS_BY_ID
     - detailsById.js     -> window.ARCHIQUEST_DETAILS_BY_ID (optionnel, mais recommandé)
*/

(() => {
  const { useEffect, useMemo, useRef, useState } = React;

  // -----------------------------
  // Sécurité / LocalStorage
  // -----------------------------
  const STORAGE_KEYS = {
    selected: "archiquest_selected_ids",
    ratings: "archiquest_ratings",
    notes: "archiquest_notes",
    deleted: "archiquest_deleted_ids",
    customBuildings: "archiquest_custom_buildings_v1",
    geoCache: "archiquest_geo_cache_v2",
    planStatus: "archiquest_plan_status_v1",
    buildingOverrides: "archiquest_building_overrides_v1",
  };

  const safeRead = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (e) {
      console.error("Erreur lecture localStorage", key, e);
      return fallback;
    }
  };

  const safeWrite = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error("Erreur écriture localStorage", key, e);
    }
  };

  // -----------------------------
  // Helpers données
  // -----------------------------
  const getYearValue = (item) => {
    const m = String(item?.year || "").match(/\d{4}/);
    return m ? parseInt(m[0], 10) : 0; // 0 = inconnu/non exploitable
  };

  const getDetailsById = (id) => {
    const db = window.ARCHIQUEST_DETAILS_BY_ID || {};
    return db[String(id)] || db[id] || null;
  };

  const pickFirstString = (...vals) => {
    for (const v of vals) {
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  };
  
  const getWhyShoot = (id) => {
    const d = getDetailsById(id);
    return d ? pickFirstString(d.why_shoot) : "";
  };
  
  const getDescription = (id) => {
    const d = getDetailsById(id);
    return d ? pickFirstString(d.description, d.story, d.desc, d.summary) : "";
  };
  
  const getConcept = (id) => {
    const d = getDetailsById(id);
    return d ? pickFirstString(d.concept) : "";
  };
  
  const getKeywords = (id) => {
    const d = getDetailsById(id);
    return d?.keywords || [];
  };

  const getPhotoTips = (id) => {
    const d = getDetailsById(id);
    return d ? pickFirstString(d.photoTips, d.photo_tips, d.tips, d.advice) : "";
  };
  
  const getPhotoPlans = (id) => {
    const d = getDetailsById(id);
    return d?.photo_plans || [];
  };
  
  const getMoments = (id) => {
    const d = getDetailsById(id);
    return d ? pickFirstString(d.moments) : "";
  };

  const getArchitectBio = (id) => {
    const d = getDetailsById(id);
    if (!d) return "";
    return pickFirstString(
      d.architect_bio,
      d.architectBio,
      d.architect?.bio,
      d.architect?.biography,
      d.bio
    );
  };

  const googleImagesUrlFor = (name, city) =>
    "https://www.google.com/search?tbm=isch&q=" +
    encodeURIComponent(`${name} ${city} architecture`);

  // -----------------------------
  // UI : Petits composants
  // -----------------------------
  const StarRating = ({ rating, onRate, sizeClass = "text-sm" }) => {
    const [hovered, setHovered] = useState(0);
    const display = hovered || rating;

    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRate(star === rating ? 0 : star); // clic sur la même étoile => retour à 0
            }}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="focus:outline-none transition-transform active:scale-95 hover:scale-110"
            aria-label={`Noter ${star} étoile(s)`}
          >
            <span
              className={
                star <= display
                  ? `text-amber-500 ${sizeClass}`
                  : `text-zinc-600 ${sizeClass}`
              }
            >
              ★
            </span>
          </button>
        ))}
      </div>
    );
  };

  const CollapsibleSection = ({ title, children, defaultOpen = true, shootingMode = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    useEffect(() => {
      setIsOpen(defaultOpen);
    }, [defaultOpen]);

    if (!React.Children.count(children)) {
      return null;
    }

    return (
      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/50">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex justify-between items-center p-4 text-left"
        >
          <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-widest">{title}</h3>
          <span className={`text-amber-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>
        {isOpen && (
          <div className="px-4 pb-4 pt-2 border-t border-zinc-800">
            {children}
          </div>
        )}
      </div>
    );
  };

  // -----------------------------
  // Modale réutilisable
  // -----------------------------
  const ModalShell = ({ title, subtitle, onClose, children, footer }) => {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm px-4 py-4 animate-fade-in"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="w-full max-w-3xl max-h-[90vh] bg-zinc-950 border-2 border-amber-400 rounded-2xl shadow-2xl shadow-amber-500/30 overflow-hidden flex flex-col animate-modal-appear">
          <div className="p-4 md:p-5 border-b border-zinc-800 flex items-start justify-between gap-4 flex-shrink-0">
            <div className="min-w-0">
              <h2 className="text-base md:text-lg font-bold text-white">
                {title}
              </h2>
              {subtitle ? (
                <div className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  {subtitle}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-zinc-500 hover:text-white text-sm px-2 py-1 rounded-full hover:bg-zinc-800 flex-shrink-0"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>

          <div className="p-4 md:p-5 space-y-4 overflow-y-auto flex-grow">
            {children}
          </div>

          {footer ? (
            <div className="p-3 md:p-4 border-t border-zinc-800 bg-black/30 flex-shrink-0">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  // -----------------------------
  // Carte bâtiment
  // -----------------------------
  const BuildingCard = ({
    item,
    isSelected,
    rating,
    onToggleSelection,
    onRate,
    onOpenInfos,
  }) => {
    return (
      <div
        className={
          "relative bg-zinc-900 rounded-xl overflow-hidden border-2 transition-all duration-300 group flex flex-col h-full transform hover:-translate-y-1 " +
          (isSelected
            ? "border-amber-500 shadow-xl shadow-amber-900/30"
            : "border-zinc-800 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/20")
        }
      >
        <div className="relative h-44 w-full flex-shrink-0 overflow-hidden">
          {item.img ? (
            <img
              src={item.img}
              alt={item.name}
              className="absolute inset-0 w-full h-full object-cover filter grayscale contrast-125 opacity-60 transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
            />
          ) : null}

          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/90 via-zinc-950 to-black">
            <div
              className="absolute inset-0 opacity-15"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.18) 1px, transparent 0)",
                backgroundSize: "16px 16px",
              }}
            />
          </div>

          <div className="relative z-10 h-full flex flex-col items-center justify-center px-4">
            <h3 className="text-zinc-200 text-center font-black text-[11px] uppercase tracking-[0.25em] opacity-90 max-w-[85%]">
              {item.name}
            </h3>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenInfos(item);
              }}
              className="mt-4 inline-flex items-center gap-2 bg-zinc-800/80 hover:bg-zinc-100 text-zinc-100 hover:text-black px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.18em] transition-all border border-zinc-600 hover:border-zinc-900 shadow-md shadow-black/40"
            >
              <span className="text-xs">📝</span>
              Plus d'infos
            </button>
          </div>

          <div className="absolute top-2 right-2 bg-black/90 backdrop-blur px-2.5 py-1 rounded text-[10px] text-zinc-100 font-bold uppercase tracking-[0.18em] border border-white/10 shadow-sm z-20">
            {item.city}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelection(item.id);
            }}
            aria-pressed={isSelected}
            className={
              "absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.14em] backdrop-blur-md transition-all shadow-lg z-20 border " +
              (isSelected
                ? "bg-emerald-500 text-black border-emerald-400 scale-105"
                : "bg-black/60 text-zinc-100 border-zinc-600 hover:border-emerald-400 hover:text-emerald-300 hover:scale-105")
            }
          >
            {isSelected ? "✅" : "Choisir"}
          </button>
        </div>

        <div className="p-4 flex flex-col flex-grow bg-zinc-900 border-t border-zinc-800">
          <div className="mb-auto">
            <p className="text-amber-500 text-[9px] font-black uppercase tracking-[0.15em] mb-1.5">
              {item.type}
            </p>
            <h3 className="text-base font-bold text-zinc-100 leading-tight">
              {item.name}
            </h3>
          </div>

          <div className="mt-4 mb-4">
            <p className="text-zinc-300 text-xs flex items-start leading-relaxed font-medium">
              <span className="mr-1.5 mt-0.5 flex-shrink-0 text-amber-500/80">
                📍
              </span>
              {item.location_display}
            </p>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-zinc-800">
            <StarRating rating={rating} onRate={onRate} />
            <span className="text-[10px] font-bold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded font-mono border border-zinc-700">
              {item.year}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // -----------------------------
  // Plan de sortie
  // -----------------------------
  const ShootPlan = ({
    selectedIds,
    buildings,
    ratings,
    notesById,
    clearSelection,
    removeFromSelection,
    goToGallery,
  }) => {
    const selectedBuildings = buildings.filter((b) => selectedIds.includes(b.id));

    const byCity = useMemo(() => {
      return selectedBuildings.reduce((acc, curr) => {
        (acc[curr.city] = acc[curr.city] || []).push(curr);
        return acc;
      }, {});
    }, [selectedBuildings]);

    const generateGoogleMapsUrl = (items) => {
      if (!items.length) return "#";
      const base = "https://www.google.com/maps/dir/";
      const destinations = items.map((b) => encodeURIComponent(b.address)).join("/");
      return base + destinations;
    };

    const downloadBrief = () => {
      let content = "ARCHIQUEST — ROADBOOK\n====================\n\n";
      Object.keys(byCity).forEach((city) => {
        content += `\n--- ${city.toUpperCase()} ---\n`;
        byCity[city].forEach((b, idx) => {
          const rate = ratings[b.id] || 0;
          const note = (notesById[b.id] || "").trim();
          const desc = getDescription(b.id);
          const tips = getPhotoTips(b.id);

          content += `\n${idx + 1}. ${b.name} (${b.year})\n`;
          content += `   ⭐ ${rate}/5\n`;
          content += `   📍 ${b.address}\n`;
          if (desc) content += `   🧱 ${desc}\n`;
          if (tips) content += `   📷 ${tips}\n`;
          if (note) content += `   📝 Notes: ${note}\n`;
          content += `   🔎 Images: ${googleImagesUrlFor(b.name, b.city)}\n`;
        });
        content += `\n🧭 Itinéraire : ${generateGoogleMapsUrl(byCity[city])}\n`;
        content += "-----------------------------------\n";
      });

      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ArchiQuest_Roadbook.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    if (!selectedBuildings.length) {
      return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-zinc-400 animate-fade-in text-center px-4">
          <div className="bg-zinc-800/50 p-6 rounded-full mb-6 ring-1 ring-zinc-700 text-4xl opacity-60">
            📷
          </div>
          <h3 className="text-lg font-bold text-white mb-2">
            Plan de sortie vierge
          </h3>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            Retourne à la galerie pour sélectionner tes spots.
          </p>
          <button
            type="button"
            onClick={goToGallery}
            className="mt-6 text-amber-500 text-xs font-bold uppercase tracking-widest hover:text-amber-400 border-b border-amber-500/30 pb-1"
          >
            Aller à la Galerie
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6 pb-24 animate-fade-in">
        <div className="bg-zinc-900/90 backdrop-blur-md p-4 rounded-xl border border-zinc-800 sticky top-20 z-30 shadow-2xl flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="bg-amber-500 text-black font-black text-xs w-8 h-8 flex items-center justify-center rounded-lg shadow-lg shadow-amber-500/20">
              {selectedBuildings.length}
            </span>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Sélection
              </h2>
              <p className="text-[10px] text-zinc-500">
                {Object.keys(byCity).length} villes
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={downloadBrief}
              className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-lg"
            >
              <span className="text-sm">⬇️</span>
              EXPORTER
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="flex items-center justify-center bg-zinc-800 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 px-3 py-2 rounded-lg transition-colors border border-zinc-700"
              aria-label="Vider la sélection"
            >
              🗑
            </button>
          </div>
        </div>

        {Object.keys(byCity).map((city) => (
          <div
            key={city}
            className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden shadow-lg"
          >
            <div className="bg-zinc-950 p-4 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="font-black text-amber-500 tracking-[0.15em] uppercase text-xs">
                {city}
              </h3>
              <a
                href={generateGoogleMapsUrl(byCity[city])}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-full transition-all shadow-lg shadow-blue-600/20 group"
              >
                <span className="group-hover:rotate-12 transition-transform text-xs">
                  🧭
                </span>
                GPS MAPS
              </a>
            </div>

            <div className="divide-y divide-zinc-800/50">
              {byCity[city].map((b) => {
                const rate = ratings[b.id] || 0;
                const note = (notesById[b.id] || "").trim();
                const tips = getPhotoTips(b.id);

                return (
                  <div
                    key={b.id}
                    className="p-4 flex gap-4 hover:bg-zinc-800/40 transition-colors group"
                  >
                    <div className="hidden sm:block w-16 h-16 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0 border border-zinc-700">
                      {b.img ? (
                        <img
                          src={b.img}
                          alt={b.name}
                          className="w-full h-full object-cover grayscale opacity-70 group-hover:opacity-100 transition-opacity"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600 text-lg">
                          🏛️
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-3 mb-1">
                        <div className="min-w-0">
                          <h4 className="font-bold text-zinc-100 text-sm truncate">
                            {b.name}
                          </h4>
                          <p className="text-[10px] text-zinc-500 mt-0.5">
                            ⭐ {rate}/5 · {b.year}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromSelection(b.id)}
                          className="text-zinc-600 hover:text-red-500 p-1 text-xs"
                          aria-label="Retirer du plan"
                        >
                          🗑
                        </button>
                      </div>

                      <p className="text-[10px] text-zinc-400 mb-2 truncate">
                        <span className="mr-1 text-zinc-500">📍</span>
                        {b.address}
                      </p>

                      {tips ? (
                        <div className="bg-black/30 p-2.5 rounded border-l-2 border-amber-500/50 mb-2">
                          <p className="text-[10px] text-zinc-300 leading-relaxed">
                            <span className="text-amber-500 font-bold uppercase mr-1">
                              Astuce :
                            </span>
                            {tips}
                          </p>
                        </div>
                      ) : null}

                      {note ? (
                        <div className="bg-zinc-900/40 p-2.5 rounded border border-zinc-800">
                          <p className="text-[10px] text-zinc-300 leading-relaxed">
                            <span className="text-zinc-500 font-bold uppercase mr-1">
                              Notes :
                            </span>
                            {note}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // -----------------------------
  // Carte Leaflet (optimisée)
  // -----------------------------
  const MapView = ({ buildings, coordsById, onOpenInfos }) => {
    const mapRef = useRef(null);
    const layerRef = useRef(null);
    const markersRef = useRef({});
    const [isLoading, setIsLoading] = useState(true);

    const cityCentroids = useMemo(() => {
      const sums = {};
      const counts = {};
      buildings.forEach((b) => {
        const c = coordsById[b.id];
        if (!c) return;
        sums[b.city] = sums[b.city] || { lat: 0, lng: 0 };
        counts[b.city] = (counts[b.city] || 0) + 1;
        sums[b.city].lat += c.lat;
        sums[b.city].lng += c.lng;
      });

      const centroids = {};
      Object.keys(sums).forEach((city) => {
        centroids[city] = {
          lat: sums[city].lat / counts[city],
          lng: sums[city].lng / counts[city],
        };
      });
      return centroids;
    }, [buildings, coordsById]);

    useEffect(() => {
      if (!window.L) {
        console.error("Leaflet non chargé");
        return;
      }

      // Initialiser la carte une seule fois
      const map = L.map("archiquest-map", {
        zoomControl: true,
        preferCanvas: true,
        maxZoom: 19,
        minZoom: 3,
        scrollWheelZoom: true,
        dragging: true,
      }).setView([47.5, -2], 6);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
        minZoom: 3,
        tileSize: 256,
        updateWhenZooming: false,
        updateWhenIdle: false,
        keepBuffer: 2,
      }).addTo(map);

      // Forcer le recalcul de la taille après un court délai
      setTimeout(() => {
        map.invalidateSize();
        setIsLoading(false);
      }, 500);

      // Recalculer aussi après 1 seconde pour être sûr
      setTimeout(() => {
        map.invalidateSize();
      }, 1000);

      const layer = L.layerGroup().addTo(map);

      mapRef.current = map;
      layerRef.current = layer;

      return () => {
        map.remove();
      };
    }, []);

    // Mettre à jour les marqueurs séparément
    useEffect(() => {
      if (!layerRef.current || !mapRef.current) return;

      const layer = layerRef.current;
      const map = mapRef.current;

      // Nettoyer les anciens marqueurs
      layer.clearLayers();
      markersRef.current = {};

      const bounds = [];

      buildings.forEach((b) => {
        const c = coordsById[b.id];
        const fallback = cityCentroids[b.city];
        const latlng = c
          ? [c.lat, c.lng]
          : fallback
          ? [fallback.lat, fallback.lng]
          : null;

        if (!latlng) return;

        const isApprox = !c;

        // Créer un ID unique pour le popup
        const popupId = `popup-${b.id}`;

        const popupHtml = `
          <div style="font-size:11px; line-height:1.5; min-width:200px;">
            <strong style="font-size:13px;">${b.name}</strong><br/>
            <span style="color:#94a3b8;">${b.city} – ${b.type}</span><br/>
            <span style="color:#71717a; font-size:10px;">${b.address}</span><br/>
            ${
              isApprox
                ? `<span style="color:#cbd5e1; font-size:10px;">(coordonnée approximative)</span><br/>`
                : ""
            }
            <div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">
              <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                b.address
              )}" target="_blank" rel="noopener noreferrer"
              style="background:#3b82f6; color:white; padding:4px 8px; border-radius:4px; text-decoration:none; font-size:10px; font-weight:bold; display:inline-block;">
                📍 Google Maps
              </a>
              <button id="${popupId}"
              style="background:#f59e0b; color:black; padding:4px 8px; border-radius:4px; border:none; font-size:10px; font-weight:bold; cursor:pointer;">
                📝 Voir la fiche
              </button>
            </div>
          </div>
        `;

        let marker;
        if (isApprox) {
          marker = L.circleMarker(latlng, {
            radius: 7,
            weight: 2,
            opacity: 0.9,
            fillOpacity: 0.3,
          }).addTo(layer);
        } else {
          marker = L.marker(latlng).addTo(layer);
        }

        marker.bindPopup(popupHtml, {
          autoPan: false,
          closeButton: true,
          autoClose: true,
          maxWidth: 300,
          className: "custom-popup",
          keepInView: false,
        });

        // Ajouter l'event listener pour le bouton après l'ouverture du popup
        marker.on("popupopen", () => {
          const btn = document.getElementById(popupId);
          if (btn) {
            btn.onclick = () => {
              onOpenInfos(b);
              marker.closePopup();
            };
          }
        });

        markersRef.current[b.id] = marker;
        bounds.push(latlng);
      });

      if (bounds.length) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }, [buildings, coordsById, cityCentroids, onOpenInfos]);

    return (
      <div className="space-y-4 animate-fade-in">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-[0.2em]">
            Carte des spots
          </h2>
          <p className="text-[10px] text-zinc-500 mt-1">
            Cliquez sur un marqueur pour voir les détails et accéder à la fiche complète.
          </p>
        </div>

        <div className="relative">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-900/80 rounded-2xl">
              <div className="text-center">
                <div className="inline-block animate-spin text-4xl mb-2">🗺️</div>
                <p className="text-xs text-zinc-400">Chargement de la carte...</p>
              </div>
            </div>
          )}
          <div
            id="archiquest-map"
            className="w-full h-[70vh] rounded-2xl border border-zinc-800 shadow-lg overflow-hidden"
          />
        </div>
      </div>
    );
  };

  // -----------------------------
  // Modale Ajout Bâtiment
  // -----------------------------
  const Input = ({ label, value, onChange, placeholder, type = "text" }) => (
    <div className="sm:col-span-1">
      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-zinc-900 text-zinc-100 border border-zinc-700 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
      />
    </div>
  );

  const AddBuildingModal = ({ onClose, onAddBuilding }) => {
    const [name, setName] = useState("");
    const [city, setCity] = useState("");
    const [architect, setArchitect] = useState("");
    const [year, setYear] = useState("");
    const [type, setType] = useState("Logement");
    const [address, setAddress] = useState("");
    const [img, setImg] = useState("");
    const [lat, setLat] = useState("");
    const [lng, setLng] = useState("");

    const handleSubmit = () => {
      if (!name || !city || !address || !lat || !lng) {
        alert("Veuillez remplir au moins : Nom, Ville, Adresse, Latitude et Longitude.");
        return;
      }
      onAddBuilding({
        name,
        city,
        architect: architect || "Inconnu",
        year: year || "Date inconnue",
        type,
        address,
        img: img || null,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        location_display: address,
      });
    };
    

    return (
      <ModalShell
        title="Ajouter un nouveau lieu"
        subtitle="Les lieux ajoutés sont stockés localement sur votre navigateur."
        onClose={onClose}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-[11px] font-bold uppercase tracking-[0.2em] bg-zinc-800 text-zinc-200 px-4 py-2 rounded-lg border border-zinc-700 hover:border-zinc-500"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="text-[11px] font-bold uppercase tracking-[0.2em] bg-amber-500 text-black px-4 py-2 rounded-lg hover:bg-amber-400 transition-all"
            >
              Sauvegarder
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nom du lieu" value={name} onChange={setName} placeholder="Ex: Villa Cavrois" />
          <Input label="Ville" value={city} onChange={setCity} placeholder="Ex: Croix" />
          <Input label="Architecte" value={architect} onChange={setArchitect} placeholder="Ex: Robert Mallet-Stevens" />
          <Input label="Année" value={year} onChange={setYear} placeholder="Ex: 1932" />
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-zinc-900 text-zinc-100 border border-zinc-700 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500">
              {['Logement', 'Culture', 'Bureaux', 'Santé', 'Transport', 'Militaire', 'Industriel', 'Commerce', 'Public', 'Enseignement', 'Loisirs', 'Urbain', 'Mémorial', 'Mixte', 'Patrimoine', 'Admin', 'Enfance'].sort().map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Input label="Adresse" value={address} onChange={setAddress} placeholder="Ex: 60 Avenue du Président John Fitzgerald Kennedy, 59170 Croix" />
          </div>
          <div className="sm:col-span-2">
            <Input label="URL de l'image (optionnel)" value={img} onChange={setImg} placeholder="Lien direct vers une image" />
          </div>
          <Input label="Latitude" value={lat} onChange={setLat} placeholder="Ex: 50.692" type="number" />
          <Input label="Longitude" value={lng} onChange={setLng} placeholder="Ex: 3.16" type="number" />
        </div>
      </ModalShell>
    );
  };

  // -----------------------------
  // Modale Édition Bâtiment
  // -----------------------------
  const EditBuildingModal = ({ building, coordsById, onClose, onSaveBuilding }) => {
    const coords = coordsById[building.id] || {};

    const [name, setName] = useState(building.name || "");
    const [city, setCity] = useState(building.city || "");
    const [architect, setArchitect] = useState(building.architect || "");
    const [year, setYear] = useState(building.year || "");
    const [type, setType] = useState(building.type || "Logement");
    const [address, setAddress] = useState(building.address || building.location_display || "");
    const [img, setImg] = useState(building.img || "");
    const [lat, setLat] = useState(coords.lat || "");
    const [lng, setLng] = useState(coords.lng || "");

    const handleSubmit = () => {
      if (!name || !city || !address) {
        alert("Veuillez remplir au moins : Nom, Ville et Adresse.");
        return;
      }

      const updatedData = {
        name,
        city,
        architect: architect || "Inconnu",
        year: year || "Date inconnue",
        type,
        address,
        img: img || null,
        location_display: address,
      };

      // Ajouter les coordonnées si elles sont fournies
      if (lat && lng) {
        updatedData.lat = parseFloat(lat);
        updatedData.lng = parseFloat(lng);
      }

      onSaveBuilding(building.id, updatedData);
    };

    return (
      <ModalShell
        title="Modifier le bâtiment"
        subtitle="Les modifications sont stockées localement sur votre navigateur."
        onClose={onClose}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-[11px] font-bold uppercase tracking-[0.2em] bg-zinc-800 text-zinc-200 px-4 py-2 rounded-lg border border-zinc-700 hover:border-zinc-500"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="text-[11px] font-bold uppercase tracking-[0.2em] bg-amber-500 text-black px-4 py-2 rounded-lg hover:bg-amber-400 transition-all"
            >
              Sauvegarder
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nom du lieu" value={name} onChange={setName} placeholder="Ex: Villa Cavrois" />
          <Input label="Ville" value={city} onChange={setCity} placeholder="Ex: Croix" />
          <Input label="Architecte" value={architect} onChange={setArchitect} placeholder="Ex: Robert Mallet-Stevens" />
          <Input label="Année" value={year} onChange={setYear} placeholder="Ex: 1932" />
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-zinc-900 text-zinc-100 border border-zinc-700 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500">
              {['Logement', 'Culture', 'Bureaux', 'Santé', 'Transport', 'Militaire', 'Industriel', 'Commerce', 'Public', 'Enseignement', 'Loisirs', 'Urbain', 'Mémorial', 'Mixte', 'Patrimoine', 'Admin', 'Enfance'].sort().map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Input label="Adresse" value={address} onChange={setAddress} placeholder="Ex: 60 Avenue du Président John Fitzgerald Kennedy, 59170 Croix" />
          </div>
          <div className="sm:col-span-2">
            <Input label="URL de l'image (optionnel)" value={img} onChange={setImg} placeholder="Lien direct vers une image" />
          </div>
          <Input label="Latitude (optionnel)" value={lat} onChange={setLat} placeholder="Ex: 50.692" type="number" />
          <Input label="Longitude (optionnel)" value={lng} onChange={setLng} placeholder="Ex: 3.16" type="number" />
        </div>
      </ModalShell>
    );
  };

  // -----------------------------
  // App
  // -----------------------------
  function ArchiQuestApp() {
    const baseBuildings = Array.isArray(window.ARCHIQUEST_RAW_DATA)
      ? window.ARCHIQUEST_RAW_DATA
      : [];

    const [view, setView] = useState("gallery");
    const [activeCity, setActiveCity] = useState("All");

    const [selectedIds, setSelectedIds] = useState(() =>
      safeRead(STORAGE_KEYS.selected, [])
    );
    const [ratings, setRatings] = useState(() =>
      safeRead(STORAGE_KEYS.ratings, {})
    );
    const [notesById, setNotesById] = useState(() =>
      safeRead(STORAGE_KEYS.notes, {})
    );
    const [deletedIds, setDeletedIds] = useState(() =>
      safeRead(STORAGE_KEYS.deleted, [])
    );
    const [customBuildings, setCustomBuildings] = useState(() =>
      safeRead(STORAGE_KEYS.customBuildings, [])
    );
    const [planStatus, setPlanStatus] = useState(() =>
      safeRead(STORAGE_KEYS.planStatus, {})
    );
    const [buildingOverrides, setBuildingOverrides] = useState(() =>
      safeRead(STORAGE_KEYS.buildingOverrides, {})
    );

    const [sortMode, setSortMode] = useState("default");
    const [minRating, setMinRating] = useState(0);
    const [architectFilter, setArchitectFilter] = useState("All");
    const [yearFrom, setYearFrom] = useState("All");
    const [yearTo, setYearTo] = useState("All");

    const [showSettings, setShowSettings] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [infoItem, setInfoItem] = useState(null);
    const [editItem, setEditItem] = useState(null);
    const [shootingMode, setShootingMode] = useState(false);

    const fileInputRef = useRef(null);

    useEffect(() => safeWrite(STORAGE_KEYS.selected, selectedIds), [selectedIds]);
    useEffect(() => safeWrite(STORAGE_KEYS.ratings, ratings), [ratings]);
    useEffect(() => safeWrite(STORAGE_KEYS.notes, notesById), [notesById]);
    useEffect(() => safeWrite(STORAGE_KEYS.deleted, deletedIds), [deletedIds]);
    useEffect(() => safeWrite(STORAGE_KEYS.customBuildings, customBuildings), [customBuildings]);
    useEffect(() => safeWrite(STORAGE_KEYS.planStatus, planStatus), [planStatus]);
    useEffect(() => safeWrite(STORAGE_KEYS.buildingOverrides, buildingOverrides), [buildingOverrides]);

    const toggleSelection = (id) => {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    };

    const handleRate = (id, score) => {
      setRatings((prev) => ({ ...prev, [id]: score }));
    };

    const handleNoteChange = (id, text) => {
      setNotesById((prev) => ({ ...prev, [id]: text }));
    };

    const handlePlanStatusChange = (planKey) => {
      setPlanStatus(prev => ({...prev, [planKey]: !prev[planKey]}));
    };

    const handleAddBuilding = (newBuildingData) => {
      const newBuilding = {
        ...newBuildingData,
        id: Date.now(),
      };
      setCustomBuildings(prev => [...prev, newBuilding]);
      setShowAddModal(false);
    };

    const handleSaveBuilding = (id, updatedData) => {
      // Si c'est un bâtiment personnalisé, le modifier directement
      const isCustomBuilding = customBuildings.some(cb => cb.id === id);

      if (isCustomBuilding) {
        setCustomBuildings(prev =>
          prev.map(cb => cb.id === id ? { ...cb, ...updatedData } : cb)
        );
      } else {
        // Sinon, créer/mettre à jour un override
        setBuildingOverrides(prev => ({
          ...prev,
          [id]: updatedData
        }));
      }

      // Mettre à jour les coordonnées si elles sont fournies
      if (updatedData.lat && updatedData.lng) {
        // Les coordonnées seront gérées par le useMemo de coordsById
      }

      setEditItem(null);
    };

    const handleDeleteBuilding = (id) => {
      const b = buildings.find((x) => x.id === id);
      const label = b ? `${b.name} (${b.city})` : `ID ${id}`;
      if (!confirm(`Supprimer ce bâtiment de l'application ?\n\n${label}`)) return;

      if (customBuildings.some(cb => cb.id === id)) {
        setCustomBuildings(prev => prev.filter(cb => cb.id !== id));
      } else {
        setDeletedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      }
      
      setSelectedIds((prev) => prev.filter((x) => x !== id));

      setRatings((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });

      setNotesById((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });

      if (infoItem?.id === id) setInfoItem(null);
    };

    const buildings = useMemo(() => {
      const allBuildings = [...baseBuildings, ...customBuildings];
      const del = new Set(deletedIds);

      // Appliquer les overrides sur les bâtiments
      return allBuildings
        .filter((b) => !del.has(b.id))
        .map((b) => {
          const override = buildingOverrides[b.id];
          return override ? { ...b, ...override } : b;
        });
    }, [baseBuildings, customBuildings, deletedIds, buildingOverrides]);

    const coordsById = useMemo(() => {
      const customCoords = customBuildings.reduce((acc, b) => {
        if (b.lat != null && b.lng != null) {
          acc[b.id] = { lat: b.lat, lng: b.lng };
        }
        return acc;
      }, {});

      // Ajouter les coordonnées des overrides
      const overrideCoords = Object.keys(buildingOverrides).reduce((acc, id) => {
        const override = buildingOverrides[id];
        if (override.lat != null && override.lng != null) {
          acc[id] = { lat: override.lat, lng: override.lng };
        }
        return acc;
      }, {});

      return { ...window.ARCHIQUEST_COORDS_BY_ID, ...customCoords, ...overrideCoords };
    }, [customBuildings, buildingOverrides]);

    const allCities = useMemo(() => {
      const set = new Set(buildings.map((b) => b.city));
      return ["All", ...Array.from(set)].sort((a, b) => a.localeCompare(b));
    }, [buildings]);

    const allArchitects = useMemo(() => {
      const set = new Set(buildings.map((b) => b.architect).filter(Boolean));
      return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
    }, [buildings]);

    const allYears = useMemo(() => {
      const nums = buildings
        .map(getYearValue)
        .filter((y) => y > 0)
        .sort((a, b) => a - b);
      const uniq = Array.from(new Set(nums));
      return uniq;
    }, [buildings]);

    const filtered = useMemo(() => {
      let items = buildings;

      if (activeCity !== "All") items = items.filter((b) => b.city === activeCity);
      if (architectFilter !== "All")
        items = items.filter((b) => b.architect === architectFilter);

      if (minRating > 0) {
        items = items.filter((b) => (ratings[b.id] || 0) >= minRating);
      }

      const fromVal = yearFrom === "All" ? null : parseInt(yearFrom, 10);
      const toVal = yearTo === "All" ? null : parseInt(yearTo, 10);

      if (fromVal || toVal) {
        items = items.filter((b) => {
          const y = getYearValue(b);
          if (!y) return false;
          if (fromVal && y < fromVal) return false;
          if (toVal && y > toVal) return false;
          return true;
        });
      }

      return items;
    }, [buildings, activeCity, architectFilter, minRating, yearFrom, yearTo, ratings]);

    const displayed = useMemo(() => {
      const items = [...filtered];

      if (sortMode === "year-desc") items.sort((a, b) => getYearValue(b) - getYearValue(a));
      else if (sortMode === "year-asc") items.sort((a, b) => getYearValue(a) - getYearValue(b));
      else if (sortMode === "rating-desc")
        items.sort((a, b) => (ratings[b.id] || 0) - (ratings[a.id] || 0));
      else if (sortMode === "rating-asc")
        items.sort((a, b) => (ratings[a.id] || 0) - (ratings[b.id] || 0));

      return items;
    }, [filtered, sortMode, ratings]);

    const handleExportSettings = () => {
      const payload = {
        version: 3,
        exportedAt: new Date().toISOString(),
        selectedIds,
        ratings,
        notesById,
        deletedIds,
        planStatus,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "archiquest-config.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    const handleImportSettings = (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const data = JSON.parse(text);

          const importedSelected = data.selectedIds || [];
          const importedRatings = data.ratings || {};
          const importedNotes = data.notesById || {};
          const importedDeleted = data.deletedIds || [];
          const importedPlanStatus = data.planStatus || {};

          if (!Array.isArray(importedSelected)) throw new Error("selectedIds invalide");
          if (typeof importedRatings !== "object") throw new Error("ratings invalide");
          if (typeof importedNotes !== "object") throw new Error("notes invalide");
          if (!Array.isArray(importedDeleted)) throw new Error("deletedIds invalide");
          if (typeof importedPlanStatus !== "object") throw new Error("planStatus invalide");

          setSelectedIds(importedSelected);
          setRatings(importedRatings);
          setNotesById(importedNotes);
          setDeletedIds(importedDeleted);
          setPlanStatus(importedPlanStatus);

          alert("Configuration restaurée avec succès.");
        } catch (err) {
          console.error(err);
          alert("Impossible de lire ce fichier (JSON invalide).");
        }
      };
      reader.readAsText(file);
      event.target.value = "";
    };

    const handleResetAll = () => {
      if (!confirm("Tout réinitialiser (notes, étoiles, sélection, plans, suppressions) ?"))
        return;
      setRatings({});
      setNotesById({});
      setSelectedIds([]);
      setDeletedIds([]);
      setPlanStatus({});
    };

    const clearFilters = () => {
      setMinRating(0);
      setArchitectFilter("All");
      setYearFrom("All");
      setYearTo("All");
    };

    const renderInfoModalContent = () => {
      if (!infoItem) return null;

      const whyShoot = getWhyShoot(infoItem.id);
      const description = getDescription(infoItem.id);
      const concept = getConcept(infoItem.id);
      const keywords = getKeywords(infoItem.id);
      const architectBio = getArchitectBio(infoItem.id);
      const photoTips = getPhotoTips(infoItem.id);
      const photoPlans = getPhotoPlans(infoItem.id);
      const moments = getMoments(infoItem.id);

      const journalSection = (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-widest">Journal de shooting</h3>
          <textarea
            value={notesById[infoItem.id] || ""}
            onChange={(e) => handleNoteChange(infoItem.id, e.target.value)}
            placeholder="Contexte, lumière, émotions, galères, idées de série, réglages, anecdotes…"
            className="w-full min-h-[120px] bg-zinc-950 text-zinc-200 border border-zinc-800 rounded-xl p-3 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      );

      const photoSection = (
        <div className="space-y-4">
          {photoTips && (
            <div>
              <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">Conseils photo</h4>
              <p className="text-sm text-zinc-300 leading-relaxed">{photoTips}</p>
            </div>
          )}
          {moments && (
             <div>
              <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">Moments</h4>
              <p className="text-sm text-zinc-300 leading-relaxed">{moments}</p>
            </div>
          )}
          {photoPlans.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">Plans à faire</h4>
              <div className="space-y-2">
                {photoPlans.map((plan, index) => {
                  const planKey = `${infoItem.id}-${index}`;
                  return (
                    <label key={planKey} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!planStatus[planKey]}
                        onChange={() => handlePlanStatusChange(planKey)}
                        className="w-5 h-5 bg-zinc-800 border-zinc-700 text-amber-500 focus:ring-amber-500"
                      />
                      <span className={`text-sm ${planStatus[planKey] ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>{plan}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );

      const lectureModeContent = (
        <>
          <CollapsibleSection title="À Propos" defaultOpen={true}>
            <div className="space-y-4">
              {whyShoot && (
                <div>
                  <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">Pourquoi le shooter ?</h4>
                  <p className="text-sm text-zinc-300 leading-relaxed">{whyShoot}</p>
                </div>
              )}
              {description && (
                <div>
                  <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">Description</h4>
                  <p className="text-sm text-zinc-300 leading-relaxed">{description}</p>
                </div>
              )}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Intention & Histoire" defaultOpen={true}>
            <div className="space-y-4">
              {concept && (
                <div>
                  <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">Le Concept</h4>
                  <p className="text-sm text-zinc-300 leading-relaxed">{concept}</p>
                </div>
              )}
              {architectBio && (
                <div>
                  <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">Architecte</h4>
                  <p className="text-sm text-zinc-300 leading-relaxed">{architectBio}</p>
                </div>
              )}
              {keywords.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">État d'esprit</h4>
                  <div className="flex flex-wrap gap-2">
                    {keywords.map(kw => <span key={kw} className="bg-zinc-800 text-zinc-300 text-xs font-medium px-2 py-1 rounded">{kw}</span>)}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>
        </>
      );

      const shootingModeContent = (
        <>
          <CollapsibleSection title="Photo" defaultOpen={true}>
            {photoSection}
          </CollapsibleSection>

          <CollapsibleSection title="Journal de shooting" defaultOpen={true}>
            <textarea
              value={notesById[infoItem.id] || ""}
              onChange={(e) => handleNoteChange(infoItem.id, e.target.value)}
              placeholder="Contexte, lumière, émotions, galères, idées de série, réglages, anecdotes…"
              className="w-full min-h-[120px] bg-zinc-950 text-zinc-200 border border-zinc-800 rounded-xl p-3 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </CollapsibleSection>
        </>
      );

      return shootingMode ? shootingModeContent : lectureModeContent;
    };

    return (
      <div className="min-h-screen bg-[#050505] text-zinc-200 font-sans selection:bg-amber-500 selection:text-black">
        <header className="fixed top-0 w-full z-50 bg-[#050505]/90 backdrop-blur-xl border-b border-zinc-800">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-100 rounded flex items-center justify-center font-black text-black text-l border border-zinc-300 shadow-lg shadow-white/5">
                AQ
              </div>
              <div>
                <h1 className="text-l font-bold text-white tracking-[0.2em] uppercase">
                  <span className="text-amber-500">ARCHI</span>QUEST
                </h1>
                <p className="text-[12px] text-zinc-500 uppercase tracking-widest">
                  Photo d’architecture
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setView("gallery")}
                  className={
                    "px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all " +
                    (view === "gallery"
                      ? "bg-zinc-100 text-black shadow-md"
                      : "text-zinc-500 hover:text-white")
                  }
                >
                  Galerie
                </button>
                <button
                  type="button"
                  onClick={() => setView("plan")}
                  className={
                    "px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 " +
                    (view === "plan"
                      ? "bg-amber-500 text-black shadow-md"
                      : "text-zinc-500 hover:text-white")
                  }
                >
                  Plan de sortie
                  {selectedIds.length > 0 ? (
                    <span className="bg-black text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full ml-0.5">
                      {selectedIds.length}
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={() => setView("map")}
                  className={
                    "px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all " +
                    (view === "map"
                      ? "bg-blue-500 text-black shadow-md"
                      : "text-zinc-500 hover:text-white")
                  }
                >
                  Carte
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1.5 shadow-sm hover:border-amber-500/60 transition-all"
              >
                <span className="text-xs">⚙</span>
                <span>Paramètres</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] font-bold text-black hover:text-black bg-amber-500 border border-amber-400 rounded-full px-3 py-1.5 shadow-sm hover:bg-amber-400 transition-all"
              >
                <span className="text-xs">➕</span>
                <span>Ajouter un lieu</span>
              </button>
            </div>
          </div>

          {view === "gallery" ? (
            <div className="border-t border-zinc-800/50 bg-[#050505]/50 overflow-x-auto no-scrollbar mt-2">
              <div className="container mx-auto px-4 flex gap-2 items-center min-w-max py-3">
                {allCities.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => setActiveCity(city)}
                    className={
                      "text-[11px] uppercase font-bold tracking-wider px-4 py-1.5 rounded-full transition-all border " +
                      (activeCity === city
                        ? "bg-zinc-100 text-black border-zinc-100 shadow"
                        : "text-white border-transparent hover:border-zinc-700")
                    }
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </header>

        {showAddModal ? (
          <AddBuildingModal
            onClose={() => setShowAddModal(false)}
            onAddBuilding={handleAddBuilding}
          />
        ) : null}

        {editItem ? (
          <EditBuildingModal
            building={editItem}
            coordsById={coordsById}
            onClose={() => setEditItem(null)}
            onSaveBuilding={handleSaveBuilding}
          />
        ) : null}

        {showSettings ? (
          <ModalShell
            title="Paramètres"
            subtitle="Sauvegarde / restauration + actions utiles. Tout est local (navigateur + fichiers)."
            onClose={() => setShowSettings(false)}
          >
            <div className="space-y-3">
              <h3 className="text-[11px] font-bold text-zinc-300 uppercase tracking-[0.16em]">
                Données
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleExportSettings}
                  className="flex items-center justify-center gap-2 text-[11px] font-semibold bg-zinc-100 text-black rounded-lg px-3 py-2 hover:bg-white transition-all shadow-md"
                >
                  <span className="text-sm">💾</span>
                  <span>Sauvegarder</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  className="flex items-center justify-center gap-2 text-[11px] font-semibold bg-zinc-900 text-zinc-100 rounded-lg px-3 py-2 border border-zinc-700 hover:border-amber-500 hover:text-amber-300 transition-all"
                >
                  <span className="text-sm">📂</span>
                  <span>Restaurer</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleImportSettings}
              />

              <p className="text-[10px] text-zinc-500">
                Le fichier contient : sélection, étoiles, notes, plans cochés, bâtiments supprimés.
              </p>
            </div>

            <div className="space-y-3 border-t border-zinc-800 pt-4">
              <h3 className="text-[11px] font-bold text-zinc-300 uppercase tracking-[0.16em]">
                Réinitialisation
              </h3>
              <button
                  type="button"
                  onClick={handleResetAll}
                  className="w-full text-sm bg-red-600/90 text-white px-3 py-2 rounded-lg hover:bg-red-500 transition-all"
                >
                  Tout réinitialiser
              </button>
            </div>
          </ModalShell>
        ) : null}

        {infoItem ? (
          <ModalShell
            title={infoItem.name}
            subtitle={
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                <span className="bg-zinc-800 text-zinc-300 text-xs font-medium px-2 py-0.5 rounded">{infoItem.city}</span>
                <span className="bg-zinc-800 text-zinc-300 text-xs font-medium px-2 py-0.5 rounded">{infoItem.year}</span>
                <span className="bg-zinc-800 text-zinc-300 text-xs font-medium px-2 py-0.5 rounded">{infoItem.type}</span>
              </div>
            }
            onClose={() => setInfoItem(null)}
            footer={
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <StarRating
                    rating={ratings[infoItem.id] || 0}
                    onRate={(score) => handleRate(infoItem.id, score)}
                    sizeClass="text-base"
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href={googleImagesUrlFor(infoItem.name, infoItem.city)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold uppercase tracking-wider bg-zinc-800 text-zinc-200 px-3 py-2 rounded-lg border border-zinc-700 hover:border-zinc-500"
                  >
                    Google Images
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setEditItem(infoItem);
                      setInfoItem(null);
                    }}
                    className="text-xs font-bold uppercase tracking-wider bg-amber-500 text-black px-3 py-2 rounded-lg hover:bg-amber-400"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteBuilding(infoItem.id)}
                    className="text-xs font-bold uppercase tracking-wider bg-red-900/80 text-red-100 px-3 py-2 rounded-lg hover:bg-red-800"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            }
          >
            <div className="flex items-center justify-center mb-4">
              <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShootingMode(false)}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest transition-all ${!shootingMode ? 'bg-zinc-100 text-black shadow-md' : 'text-zinc-500 hover:text-white'}`}
                  >
                    Mode Lecture
                  </button>
                  <button
                    type="button"
                    onClick={() => setShootingMode(true)}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest transition-all ${shootingMode ? 'bg-amber-500 text-black shadow-md' : 'text-zinc-500 hover:text-white'}`}
                  >
                    Mode Shooting
                  </button>
              </div>
            </div>
            {renderInfoModalContent()}
          </ModalShell>
        ) : null}

        <main className="container mx-auto px-4 pt-40 pb-12 transition-all duration-500">
          {view === "gallery" ? (
            <div className="space-y-4">
              <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4">
                <div className="flex flex-col lg:flex-row lg:items-end gap-3 lg:gap-4 justify-between">
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="uppercase tracking-[0.16em] text-zinc-500 font-bold">
                      Trier par
                    </span>
                    <select
                      value={sortMode}
                      onChange={(e) => setSortMode(e.target.value)}
                      className="bg-zinc-900 border border-amber-500/70 text-[11px] text-zinc-100 rounded-full px-3 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="default">Ordre par défaut</option>
                      <option value="year-desc">Année · récent → ancien</option>
                      <option value="year-asc">Année · ancien → récent</option>
                      <option value="rating-desc">Note · meilleure → pire</option>
                      <option value="rating-asc">Note · pire → meilleure</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 w-full lg:max-w-4xl">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-bold whitespace-nowrap">
                        Note ≥
                      </span>
                      <select
                        value={minRating}
                        onChange={(e) => setMinRating(parseInt(e.target.value, 10))}
                        className="w-full bg-zinc-900 border border-zinc-700 text-[11px] text-zinc-100 rounded-full px-3 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      >
                        {[0, 1, 2, 3, 4, 5].map((v) => (
                          <option key={v} value={v}>
                            {v === 0 ? "Toutes" : `${v}★`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-bold whitespace-nowrap">
                        Architecte
                      </span>
                      <select
                        value={architectFilter}
                        onChange={(e) => setArchitectFilter(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 text-[11px] text-zinc-100 rounded-full px-3 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      >
                        {allArchitects.map((a) => (
                          <option key={a} value={a}>
                            {a === "All" ? "Tous" : a}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-bold whitespace-nowrap">
                        Année de
                      </span>
                      <select
                        value={yearFrom}
                        onChange={(e) => setYearFrom(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 text-[11px] text-zinc-100 rounded-full px-3 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      >
                        <option value="All">—</option>
                        {allYears.map((y) => (
                          <option key={y} value={String(y)}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-bold whitespace-nowrap">
                        à
                      </span>
                      <select
                        value={yearTo}
                        onChange={(e) => setYearTo(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 text-[11px] text-zinc-100 rounded-full px-3 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      >
                        <option value="All">—</option>
                        {allYears.map((y) => (
                          <option key={y} value={String(y)}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] text-zinc-500">
                    Total: <span className="text-zinc-200 font-bold">{buildings.length}</span>{" "}
                    · Affichés: <span className="text-zinc-200 font-bold">{displayed.length}</span>{" "}
                    · Supprimés:{" "}
                    <span className="text-zinc-200 font-bold">
                      {deletedIds.length}
                    </span>
                  </p>

                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-[10px] font-bold uppercase tracking-[0.16em] bg-zinc-900 text-zinc-200 px-3 py-2 rounded-lg border border-zinc-700 hover:border-amber-500 hover:text-amber-300 transition-all"
                  >
                    Réinitialiser filtres
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {displayed.map((item) => (
                  <BuildingCard
                    key={item.id}
                    item={item}
                    isSelected={selectedIds.includes(item.id)}
                    rating={ratings[item.id] || 0}
                    onToggleSelection={toggleSelection}
                    onRate={(score) => handleRate(item.id, score)}
                    onOpenInfos={(it) => setInfoItem(it)}
                  />
                ))}
              </div>

              {!displayed.length ? (
                <div className="text-center text-zinc-500 text-sm py-12">
                  Aucun résultat avec ces filtres.
                </div>
              ) : null}
            </div>
          ) : null}

          {view === "plan" ? (
            <div className="max-w-3xl mx-auto">
              <ShootPlan
                selectedIds={selectedIds}
                buildings={buildings}
                ratings={ratings}
                notesById={notesById}
                clearSelection={() => setSelectedIds([])}
                removeFromSelection={(id) => toggleSelection(id)}
                goToGallery={() => setView("gallery")}
              />
            </div>
          ) : null}

          {view === "map" ? (
            <div className="max-w-5xl mx-auto">
              <MapView buildings={buildings} coordsById={coordsById} onOpenInfos={(item) => setInfoItem(item)} />
            </div>
          ) : null}
        </main>
      </div>
    );
  }

  const rootElement = document.getElementById("root");
  if (!rootElement) {
    console.error("Aucun #root trouvé dans la page.");
    return;
  }
  const root = ReactDOM.createRoot(rootElement);
  root.render(<ArchiQuestApp />);
})();
