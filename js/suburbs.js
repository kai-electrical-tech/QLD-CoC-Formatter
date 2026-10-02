// Online Address Autocomplete & Smart Australian Address Parser
// Optimized for Queensland Electrical Contractors (Strict QLD Prioritization)
(function(window) {
  'use strict';

  const ROAD_TYPE_MAP = {
    'street': 'St',
    'road': 'Rd',
    'avenue': 'Ave',
    'drive': 'Dr',
    'close': 'Cl',
    'court': 'Ct',
    'crescent': 'Cres',
    'place': 'Pl',
    'parade': 'Pde',
    'boulevard': 'Blvd',
    'highway': 'Hwy',
    'terrace': 'Tce',
    'lane': 'Ln',
    'way': 'Way',
    'circuit': 'Cct',
    'grove': 'Gr',
    'esplanade': 'Esp',
    'square': 'Sq',
    'st': 'St',
    'rd': 'Rd',
    'ave': 'Ave',
    'dr': 'Dr',
    'cl': 'Cl',
    'ct': 'Ct',
    'cres': 'Cres',
    'pl': 'Pl',
    'pde': 'Pde',
    'blvd': 'Blvd',
    'hwy': 'Hwy',
    'tce': 'Tce',
    'ln': 'Ln'
  };

  const STATE_ABBR = {
    'queensland': 'QLD',
    'qld': 'QLD',
    'new south wales': 'NSW',
    'nsw': 'NSW',
    'victoria': 'VIC',
    'vic': 'VIC',
    'western australia': 'WA',
    'wa': 'WA',
    'south australia': 'SA',
    'sa': 'SA',
    'tasmania': 'TAS',
    'tas': 'TAS',
    'australian capital territory': 'ACT',
    'act': 'ACT',
    'northern territory': 'NT',
    'nt': 'NT'
  };

  const SuburbService = {
    // Normalize road type: "10 Sample Road" -> "10 Sample Rd"
    normalizeStreet(streetStr) {
      if (!streetStr) return '';
      let clean = streetStr.trim().replace(/,\s*$/, '');
      const words = clean.split(/\s+/);
      if (words.length > 1) {
        const lastWord = words[words.length - 1].toLowerCase().replace(/\.$/, '');
        if (ROAD_TYPE_MAP[lastWord]) {
          words[words.length - 1] = ROAD_TYPE_MAP[lastWord];
          clean = words.join(' ');
        }
      }
      return clean;
    },

    // Standardize State abbreviation
    normalizeState(stateStr) {
      if (!stateStr) return 'QLD';
      const s = stateStr.trim().toLowerCase();
      return STATE_ABBR[s] || (s.length === 3 ? s.toUpperCase() : 'QLD');
    },

    _cache: new Map(),

    _setCache(key, val) {
      if (this._cache.size >= 100) {
        const oldestKey = this._cache.keys().next().value;
        this._cache.delete(oldestKey);
      }
      this._cache.set(key, val);
    },

    // Check if query meets minimum length threshold:
    // If starts with street number (e.g. "6 vid"): requires at least 3 letters of street name
    // Otherwise requires at least 3 characters
    isQueryReady(query) {
      if (!query || typeof query !== 'string') return false;
      const q = query.trim();
      if (q.length < 3) return false;

      const parts = q.split(/\s+/);
      if (parts.length >= 2 && /^\d/.test(parts[0])) {
        const streetPart = parts.slice(1).join(' ');
        return streetPart.length >= 3; // e.g. "vid" (3 chars)
      }

      return q.length >= 3;
    },

    // Online search for street addresses using Photon (Komoot / OpenStreetMap) with Queensland priority
    async searchAddresses(query, limit = 6) {
      if (!this.isQueryReady(query)) return [];
      // Fast short-circuit when device is offline to prevent failed network requests
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return [];
      }
      const q = query.trim();
      const cacheKey = q.toLowerCase();
      if (this._cache.has(cacheKey)) {
        return this._cache.get(cacheKey);
      }

      const queryParts = q.split(/\s+/);
      const isNumberedQuery = queryParts.length >= 2 && /^\d/.test(queryParts[0]);
      const typedHouseNumber = isNumberedQuery ? queryParts[0] : '';
      const typedStreetPart = isNumberedQuery ? queryParts.slice(1).join(' ') : q;
      const typedStreetPrefix = typedStreetPart.toLowerCase();

      try {
        // Query Photon with strict Queensland bounding box
        // If numbered, search with street part for maximum road hit rate
        const searchQuery = isNumberedQuery ? typedStreetPart : q;
        const qldBbox = '138,-29.5,154,-10';
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&limit=15&bbox=${qldBbox}&lat=-27.47&lon=153.02`;
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) throw new Error(`Photon HTTP error ${res.status}`);
        const data = await res.json();

        if (data && data.features && data.features.length > 0) {
          const results = [];
          for (const feat of data.features) {
            const props = feat.properties || {};
            if (props.countrycode && props.countrycode.toLowerCase() !== 'au') continue;

            // If feature has a housenumber, use it; otherwise attach user's typed house number
            const featureHouse = (props.housenumber || '').trim();
            const houseNumber = featureHouse || typedHouseNumber;
            if (!houseNumber) continue; // Must have house number

            const streetName = props.street || props.name || '';
            if (!streetName) continue;

            // Ensure street name matches prefix typed by user
            if (typedStreetPrefix && !streetName.toLowerCase().includes(typedStreetPrefix)) {
              continue;
            }

            const rawStreet = `${houseNumber} ${streetName}`.trim();
            const normStreet = this.normalizeStreet(rawStreet);

            const suburb = props.district || props.city || props.locality || props.county || '';
            const state = this.normalizeState(props.state || 'QLD');
            const postcode = props.postcode || '';

            if (!normStreet || !suburb) continue;

            const mainLine = normStreet;
            const subLine = [suburb, state, postcode].filter(Boolean).join(' ');
            const formatted = `${normStreet}, ${suburb} ${state} ${postcode}`.trim();

            if (!results.some(r => r.formatted === formatted)) {
              results.push({
                street: normStreet,
                suburb: suburb,
                state: state,
                postcode: postcode,
                mainLine: mainLine,
                subLine: subLine,
                formatted: formatted
              });
            }
          }
          if (results.length > 0) {
            const finalRes = results.slice(0, limit);
            this._setCache(cacheKey, finalRes);
            return finalRes;
          }
        }
      } catch (err) {
        console.warn('Photon autocomplete failed, trying fallback:', err);
      }

      // Fallback: OpenStreetMap Nominatim with Queensland boundary viewbox
      try {
        const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=au&viewbox=138,-10,154,-29.5&bounded=1&limit=10&q=${encodeURIComponent(q)}`;
        const res = await fetch(nomUrl, { 
          headers: { 
            'Accept': 'application/json',
            'User-Agent': 'QueenslandCoCApp/1.0 (https://github.com/kai-electrical-tech/QLD-CoC-Formatter)'
          } 
        });
        if (res.ok) {
          const items = await res.json();
          const results = [];
          for (const item of items) {
            const addr = item.address || {};
            const house = (addr.house_number || '').trim();
            // Requirement: Exclude any hit that does not have a house number
            if (!house) continue;

            const road = addr.road || addr.pedestrian || '';
            if (typedStreetPrefix && !road.toLowerCase().includes(typedStreetPrefix)) {
              continue;
            }

            const street = this.normalizeStreet(`${house} ${road}`);
            const suburb = addr.suburb || addr.city_district || addr.city || addr.town || '';
            const state = this.normalizeState(addr.state || 'QLD');
            const postcode = addr.postcode || '';
            const formatted = `${street}, ${suburb} ${state} ${postcode}`.trim();

            if (street && suburb && !results.some(r => r.formatted === formatted)) {
              results.push({
                street: street,
                suburb: suburb,
                state: state,
                postcode: postcode,
                mainLine: street,
                subLine: `${suburb} ${state} ${postcode}`.trim(),
                formatted: formatted
              });
            }
          }
          if (results.length > 0) {
            const finalRes = results.slice(0, limit);
            this._setCache(cacheKey, finalRes);
            return finalRes;
          }
        }
      } catch (nomErr) {
        console.warn('Nominatim fallback error:', nomErr);
      }

      return [];
    },

    // Parse Australian address string into components
    parseAddress(rawInput) {
      if (!rawInput || typeof rawInput !== 'string') {
        return { street: '', suburb: '', state: 'QLD', postcode: '', formatted: '' };
      }
      let text = rawInput.trim();
      if (!text) {
        return { street: '', suburb: '', state: 'QLD', postcode: '', formatted: '' };
      }

      let detectedPostcode = '';
      let detectedState = 'QLD';
      let detectedSuburb = '';
      let detectedStreet = '';

      // 1. Extract 4-digit postcode
      const pcMatch = text.match(/\b([0-9]{4})\b/);
      if (pcMatch) {
        detectedPostcode = pcMatch[1];
        text = text.replace(pcMatch[0], ' ');
      }

      // 2. Extract State if present
      const stateMatch = text.match(/\b(QLD|NSW|VIC|WA|SA|TAS|ACT|NT|Queensland|New South Wales|Victoria)\b/i);
      if (stateMatch) {
        detectedState = this.normalizeState(stateMatch[1]);
        text = text.replace(stateMatch[0], ' ');
      }

      // 3. Remove country name
      text = text.replace(/\bAustralia\b/gi, ' ');

      // 4. Split by comma or clean spaces
      const commaParts = text.split(',').map(p => p.trim()).filter(Boolean);

      if (commaParts.length >= 2) {
        detectedStreet = commaParts[0];
        detectedSuburb = commaParts.slice(1).join(' ').trim();
      } else {
        const cleanWords = text.split(/\s+/).filter(Boolean);
        let splitIdx = -1;

        for (let i = 0; i < cleanWords.length; i++) {
          const lower = cleanWords[i].toLowerCase().replace(/\.$/, '');
          if (ROAD_TYPE_MAP[lower]) {
            splitIdx = i;
            break;
          }
        }

        if (splitIdx !== -1 && splitIdx < cleanWords.length - 1) {
          detectedStreet = cleanWords.slice(0, splitIdx + 1).join(' ');
          detectedSuburb = cleanWords.slice(splitIdx + 1).join(' ');
        } else {
          if (/^\d/.test(text) && cleanWords.length > 2) {
            detectedStreet = cleanWords.slice(0, -1).join(' ');
            detectedSuburb = cleanWords[cleanWords.length - 1];
          } else {
            detectedStreet = text;
          }
        }
      }

      detectedStreet = this.normalizeStreet(detectedStreet);
      detectedSuburb = detectedSuburb.replace(/\s+/g, ' ').trim();

      const formatted = `${detectedStreet}${detectedSuburb ? ', ' + detectedSuburb : ''} ${detectedState} ${detectedPostcode}`.trim();

      return {
        street: detectedStreet,
        suburb: detectedSuburb,
        state: detectedState,
        postcode: detectedPostcode,
        formatted: formatted
      };
    }
  };

  window.SuburbService = SuburbService;
})(window);
