/* Offline fallback used only when Leaflet CDN is unavailable. */
(() => {
  if (window.L) return;
  const B = { south: 8.85, north: 9.25, west: 7.25, east: 7.7 };
  let activeMap;
  const project = (lat, lng, el) => ({
    x: ((lng - B.west) / (B.east - B.west)) * el.clientWidth,
    y: ((B.north - lat) / (B.north - B.south)) * el.clientHeight,
  });
  const boundsFrom = (coords) => {
    const flat = coords.flat(Infinity).filter(Number.isFinite),
      pairs = [];
    for (let i = 0; i < flat.length; i += 2) pairs.push([flat[i], flat[i + 1]]);
    return {
      pairs,
      pad() {
        return this;
      },
    };
  };
  class Layer {
    addTo(target) {
      (target._layers || target.layers || []).push(this);
      this._map = target._map || target;
      if (target._render) target._render();
      else this.render?.(this._map);
      return this;
    }
    bindTooltip() {
      return this;
    }
    openTooltip() {
      return this;
    }
  }
  class Polyline extends Layer {
    constructor(coords, opt = {}) {
      super();
      this.coords = coords;
      this.opt = opt;
    }
    render(m) {
      const pts = this.coords.map((c) => project(c[0], c[1], m.el));
      const p = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "polyline",
      );
      p.setAttribute("points", pts.map((v) => `${v.x},${v.y}`).join(" "));
      p.setAttribute("fill", "none");
      p.setAttribute("stroke", this.opt.color || "#8067e6");
      p.setAttribute("stroke-width", this.opt.weight || 4);
      p.setAttribute("stroke-linecap", "round");
      if (this.opt.dashArray)
        p.setAttribute("stroke-dasharray", this.opt.dashArray);
      p.setAttribute("opacity", this.opt.opacity ?? 1);
      m.svg.appendChild(p);
      this.node = p;
    }
  }
  class Marker extends Layer {
    constructor(coords, opt = {}) {
      super();
      this.coords = coords;
      this.opt = opt;
    }
    render(m) {
      const p = project(this.coords[0], this.coords[1], m.el),
        d = document.createElement("div");
      d.className = "fallback-marker";
      d.style.left = p.x + "px";
      d.style.top = p.y + "px";
      d.innerHTML = this.opt.icon?.options?.html || "<span></span>";
      m.markers.appendChild(d);
      this.node = d;
    }
  }
  class Group extends Layer {
    constructor(layers = []) {
      super();
      this.layers = layers;
      this._layers = this.layers;
      this._map = null;
    }
    addTo(m) {
      this._map = m;
      m.groups.push(this);
      this._render();
      return this;
    }
    _render() {
      if (!this._map) return;
      this.layers.forEach((l) => {
        if (!l.node) l.render?.(this._map);
      });
    }
    getBounds() {
      const c = this.layers.flatMap((l) => l.coords || []);
      return boundsFrom(c);
    }
  }
  class Map {
    constructor(id) {
      this.el = document.getElementById(id);
      this.el.classList.add("fallback-map");
      this.el.innerHTML =
        '<div class="fallback-grid"></div><svg class="fallback-svg"></svg><div class="fallback-markers"></div><div class="fallback-badge">Map tiles load when online</div>';
      this.svg = this.el.querySelector("svg");
      this.markers = this.el.querySelector(".fallback-markers");
      this.groups = [];
      this.handlers = {};
      this.zoomControl = { setPosition() {} };
      activeMap = this;
      this.el.addEventListener("click", (e) => {
        const r = this.el.getBoundingClientRect(),
          lng = B.west + ((e.clientX - r.left) / r.width) * (B.east - B.west),
          lat =
            B.north - ((e.clientY - r.top) / r.height) * (B.north - B.south);
        this.handlers.click?.forEach((f) => f({ latlng: { lat, lng } }));
      });
    }
    setView() {
      return this;
    }
    getContainer() {
      return this.el;
    }
    on(n, f) {
      (this.handlers[n] ??= []).push(f);
      return this;
    }
    flyTo() {
      return this;
    }
    fitBounds() {
      return this;
    }
    invalidateSize() {
      return this;
    }
    removeLayer(layer) {
      layer.node?.remove();
      layer.layers?.forEach((l) => l.node?.remove());
      return this;
    }
  }
  const L = {
    map: (id) => new Map(id),
    tileLayer: () => ({
      addTo() {
        return this;
      },
    }),
    layerGroup: () => new Group(),
    featureGroup: (layers) => new Group(layers),
    polyline: (c, o) => new Polyline(c, o),
    marker: (c, o) => new Marker(c, o),
    divIcon: (options) => ({ options }),
    latLngBounds: (coords) => boundsFrom(coords),
    control: {
      layers: () => ({
        addTo() {
          return this;
        },
      }),
    },
  };
  window.L = L;
})();
