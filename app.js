const euro = value => value ? `${value} €` : "";

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;"
}[character]));

function priceText(dish) {
  if (dish.copa || dish.botella) {
    return [dish.copa && `Copa ${euro(dish.copa)}`, dish.botella && `Botella ${euro(dish.botella)}`].filter(Boolean).join(" · ");
  }
  if (dish.tapa || dish.racion) {
    return [dish.tapa && `Tapa ${euro(dish.tapa)}`, dish.racion && `Ración ${euro(dish.racion)}`].filter(Boolean).join(" · ");
  }
  if (dish.price) return euro(dish.price) + (dish.unit ? ` / ${dish.unit}` : "");
  return "Precio pendiente de confirmar";
}

const groupsEl = document.querySelector("#menu-groups");
const filtersEl = document.querySelector("#filters");
const searchEl = document.querySelector("#menu-search");
const sourceEl = document.querySelector("#menu-source");
let dishes = [];
let activeCategory = "Todas";

function renderMenu() {
  const query = searchEl.value.trim().toLowerCase();
  const visible = dishes.filter(dish => {
    const categoryOk = activeCategory === "Todas" || dish.category === activeCategory;
    const haystack = `${dish.name} ${dish.description} ${dish.category}`.toLowerCase();
    return categoryOk && (!query || haystack.includes(query));
  });

  if (!visible.length) {
    groupsEl.innerHTML = "<p class=\"empty\">Ningún plato coincide con esa búsqueda.</p>";
    return;
  }

  const groups = [];
  visible.forEach(dish => {
    let group = groups.find(item => item.category === dish.category);
    if (!group) {
      group = { category: dish.category, source: dish.source, items: [] };
      groups.push(group);
    }
    group.items.push(dish);
  });

  let tripticoNoted = false;
  groupsEl.innerHTML = groups.map(group => {
    let note = "";
    if (group.source === "triptico" && !tripticoNoted) {
      tripticoNoted = true;
      note = "<p class=\"source-flag\">Bodega transcrita de otro impreso del local, el tríptico. Confirma estas referencias en sala: no salen en la hoja Gastroclub.</p>";
    }
    const cards = group.items.map(dish => `
        <article class="dish">
          ${dish.thumbnail ? `<img src="${escapeHtml(dish.thumbnail)}" alt="${escapeHtml(dish.name)}" loading="lazy">` : '<div class="dish-placeholder" aria-hidden="true"><span>María Germiná</span></div>'}
          <div class="dish-content">
            <h4>${escapeHtml(dish.name)}</h4>
            ${dish.description ? `<p class="dish-description">${escapeHtml(dish.description)}</p>` : ""}
            ${dish.dietaryLabels.length ? `<div class="dish-tags">${dish.dietaryLabels.map(label => `<span>${escapeHtml(label)}</span>`).join("")}</div>` : ""}
            <p class="dish-price">${escapeHtml(priceText(dish))}</p>
            <button class="dish-open" type="button" data-id="${escapeHtml(dish.id)}">Ver ficha</button>
          </div>
        </article>
    `).join("");
    return `<section class="menu-group"><h3>${escapeHtml(group.category)}</h3>${note}<div class="dish-grid">${cards}</div></section>`;
  }).join("");
}

fetch("data/menu.json")
  .then(response => {
    if (!response.ok) throw new Error("carta");
    return response.json();
  })
  .then(menu => {
    dishes = (menu.dishes || []).map((dish, index) => ({
      ...dish,
      thumbnail: dish.thumbnail || dish.image || "",
      gallery: dish.gallery || [],
      glbUrl: dish.glbUrl || dish.glb || "",
      usdzUrl: dish.usdzUrl || dish.usdz || "",
      nutrition: dish.nutrition || {},
      ingredients: dish.ingredients || [],
      allergens: dish.allergens || [],
      dietaryLabels: dish.dietaryLabels || [],
      isAvailable: dish.isAvailable !== false,
      has3D: dish.has3D === true || Boolean(dish.glbUrl || dish.glb),
      hasAR: dish.hasAR === true || Boolean(dish.usdzUrl || dish.usdz),
      sortOrder: Number.isFinite(dish.sortOrder) ? dish.sortOrder : index
    })).filter(dish => dish.isAvailable).sort((a, b) => a.sortOrder - b.sortOrder);
    sourceEl.textContent = `${menu.foodSource} ${menu.serviceNote} ${menu.allergenNote}`;
    const categories = ["Todas", ...new Set(dishes.map(dish => dish.category))];
    filtersEl.innerHTML = categories.map(category =>
      `<button class="filter" type="button" aria-pressed="${category === "Todas"}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`
    ).join("");
    renderMenu();
  })
  .catch(() => {
    groupsEl.innerHTML = "<p class=\"empty\">No se ha podido cargar la carta. Revisa la fotografía de la carta en la sección del local.</p>";
  });

filtersEl.addEventListener("click", event => {
  const button = event.target.closest(".filter");
  if (!button) return;
  activeCategory = button.dataset.category;
  filtersEl.querySelectorAll(".filter").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
  renderMenu();
});
searchEl.addEventListener("input", renderMenu);

groupsEl.addEventListener("click", event => {
  const button = event.target.closest(".dish-open");
  if (!button) return;
  const dish = dishes.find(item => item.id === button.dataset.id);
  if (dish) openDish(dish, button);
});

const dialog = document.querySelector("#ficha");
const dialogMedia = document.querySelector("#ficha-media");
const dialogStatus = document.querySelector("#ficha-status");
let lastFocus = null;

function openDish(dish, trigger) {
  lastFocus = trigger;
  document.querySelector("#ficha-categoria").textContent = dish.category;
  document.querySelector("#ficha-titulo").textContent = dish.name;
  document.querySelector("#ficha-precio").textContent = priceText(dish);
  const note = document.querySelector("#ficha-nota");
  note.hidden = !dish.note;
  note.textContent = dish.note || "";
  const description = document.querySelector("#ficha-descripcion");
  description.hidden = !dish.description;
  description.textContent = dish.description || "";
  const extra = document.querySelector("#ficha-extra");
  const blocks = [];
  if (dish.ingredients && dish.ingredients.length) {
    blocks.push(`<p><strong>Ingredientes confirmados.</strong> ${escapeHtml(dish.ingredients.join(", "))}</p>`);
  }
  if (dish.allergens && dish.allergens.length) {
    blocks.push(`<p><strong>Alérgenos confirmados.</strong> ${escapeHtml(dish.allergens.join(", "))}</p>`);
  }
  extra.innerHTML = blocks.join("");
  dialogMedia.innerHTML = dish.thumbnail
    ? `<img src="${escapeHtml(dish.thumbnail)}" alt="${escapeHtml(dish.name)}">`
    : '<div class="ficha-placeholder" role="img" aria-label="Fotografía del plato pendiente de incorporar"><span>Fotografía próximamente</span></div>';
  const actions = document.querySelector("#ficha-actions");
  actions.innerHTML = "";
  dialogStatus.textContent = "";
  if (dish.has3D && dish.glbUrl) {
    const viewButton = document.createElement("button");
    viewButton.className = "button button-primary";
    viewButton.type = "button";
    viewButton.textContent = "Ver en 3D";
    viewButton.addEventListener("click", () => showModel(dish));
    actions.appendChild(viewButton);
  }

  const nutritionButton = document.createElement("button");
  nutritionButton.className = "button button-outline";
  nutritionButton.type = "button";
  nutritionButton.textContent = "Info nutricional";
  nutritionButton.addEventListener("click", () => openNutrition(dish));
  actions.appendChild(nutritionButton);

  const orderLink = document.createElement("a");
  orderLink.className = "button button-primary";
  orderLink.href = "tel:+34854705167";
  orderLink.textContent = "Pedir ahora";
  orderLink.setAttribute("aria-label", `Pedir ahora ${dish.name} llamando al restaurante`);
  actions.appendChild(orderLink);
  dialogStatus.textContent = dish.has3D
    ? "El pedido se confirma hablando con el restaurante."
    : "Modelo 3D próximamente. El pedido se confirma hablando con el restaurante.";
  if (typeof dialog.showModal === "function") dialog.showModal();
  document.querySelector(".ficha-close").focus();
}

dialog.addEventListener("click", event => {
  if (event.target === dialog || event.target.closest("[data-close]")) closeDish();
});
dialog.addEventListener("cancel", () => {
  if (lastFocus) lastFocus.focus();
});

function closeDish() {
  if (dialog.open) dialog.close();
  if (lastFocus) lastFocus.focus();
}

const nutritionModal = document.querySelector("#nutrition-modal");
const nutritionTitle = document.querySelector("#nutrition-title");
const nutritionContent = document.querySelector("#nutrition-content");
let nutritionTrigger = null;

function openNutrition(dish) {
  nutritionTrigger = document.activeElement;
  nutritionTitle.textContent = dish.name;
  const nutrition = dish.nutrition || {};
  const rows = [
    ["Energía", nutrition.kcal || nutrition.kj ? `${nutrition.kcal ? `${nutrition.kcal} kcal` : ""}${nutrition.kcal && nutrition.kj ? " · " : ""}${nutrition.kj ? `${nutrition.kj} kJ` : ""}` : ""],
    ["Grasas", nutrition.fat || ""],
    ["Grasas saturadas", nutrition.saturatedFat || ""],
    ["Hidratos de carbono", nutrition.carbohydrates || ""],
    ["Azúcares", nutrition.sugars || ""],
    ["Proteínas", nutrition.protein || ""],
    ["Sal", nutrition.salt || ""]
  ].filter(([, value]) => value);
  const reference = nutrition.servingSize
    ? `<p><strong>Tamaño de ración o base de cálculo:</strong> ${escapeHtml(nutrition.servingSize)}</p>`
    : '<p><strong>Tamaño de ración o base de cálculo:</strong> Información pendiente de confirmar.</p>';
  const nutritionHtml = rows.length
    ? `<dl class="nutrition-table">${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>`
    : '<p>Información nutricional pendiente de confirmar.</p>';
  const ingredientsHtml = dish.ingredients && dish.ingredients.length
    ? `<p><strong>Ingredientes confirmados:</strong> ${escapeHtml(dish.ingredients.join(", "))}</p>`
    : "<p><strong>Ingredientes:</strong> Información pendiente de confirmar.</p>";
  const allergensHtml = dish.allergens && dish.allergens.length
    ? `<p><strong>Alérgenos confirmados:</strong> ${escapeHtml(dish.allergens.join(", "))}</p>`
    : "<p><strong>Alérgenos:</strong> Información pendiente de confirmar.</p>";
  nutritionContent.innerHTML = `${reference}${nutritionHtml}${ingredientsHtml}${allergensHtml}<p class=\"nutrition-disclaimer\">Confirma cualquier necesidad alimentaria o alergia directamente con el restaurante antes de consumir el plato.</p>`;
  if (typeof nutritionModal.showModal === "function") nutritionModal.showModal();
  document.querySelector("[data-nutrition-close]").focus();
}

function closeNutrition() {
  if (nutritionModal.open) nutritionModal.close();
  if (nutritionTrigger) nutritionTrigger.focus();
}

document.querySelector("[data-nutrition-close]").addEventListener("click", closeNutrition);
nutritionModal.addEventListener("cancel", () => {
  if (nutritionTrigger) nutritionTrigger.focus();
});
nutritionModal.addEventListener("click", event => {
  if (event.target === nutritionModal) closeNutrition();
});

function loadModelViewer() {
  if (window.customElements && customElements.get("model-viewer")) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://unpkg.com/@google/model-viewer@3.5.0/dist/model-viewer.min.js";
    script.onload = () => customElements.whenDefined("model-viewer").then(resolve);
    script.onerror = () => reject(new Error("visor"));
    document.head.appendChild(script);
  });
}

async function showModel(dish) {
  const glbUrl = dish.glbUrl;
  dialogStatus.textContent = "Cargando el modelo…";
  try {
    const response = await fetch(glbUrl, { method: "HEAD" });
    if (!response.ok) throw new Error("missing");
    await loadModelViewer();
  } catch (error) {
    dialogStatus.textContent = error.message === "missing"
      ? "La ruta del modelo está escrita, pero el archivo no se encuentra. No se abre un visor vacío."
      : "No se ha podido cargar el visor 3D. Comprueba la conexión e inténtalo de nuevo.";
    return;
  }

  const viewer = document.createElement("model-viewer");
  viewer.setAttribute("src", glbUrl);
  if (dish.usdzUrl) viewer.setAttribute("ios-src", dish.usdzUrl);
  viewer.setAttribute("alt", `Modelo 3D de ${dish.name}`);
  viewer.setAttribute("camera-controls", "");
  viewer.setAttribute("touch-action", "pan-y");
  viewer.setAttribute("shadow-intensity", "1");
  viewer.setAttribute("exposure", "1.05");
  if (dish.hasAR) {
    viewer.setAttribute("ar", "");
    viewer.setAttribute("ar-modes", "webxr scene-viewer quick-look");
  }
  viewer.setAttribute("auto-rotate", "");
  viewer.setAttribute("auto-rotate-delay", "1000");
  viewer.setAttribute("rotation-per-second", "12deg");
  viewer.addEventListener("error", () => {
    dialogStatus.textContent = "El modelo no se ha podido mostrar.";
  });
  dialogMedia.replaceChildren(viewer);

  const actions = document.querySelector("#ficha-actions");
  actions.innerHTML = "";

  const backButton = document.createElement("button");
  backButton.className = "button button-outline";
  backButton.type = "button";
  backButton.textContent = "Volver a la ficha";
  backButton.addEventListener("click", () => openDish(dish, lastFocus));
  actions.appendChild(backButton);

  const rotateButton = document.createElement("button");
  rotateButton.className = "button button-outline";
  rotateButton.type = "button";
  rotateButton.textContent = "Rotar 3D";
  rotateButton.setAttribute("aria-pressed", "true");
  rotateButton.addEventListener("click", () => {
    const rotating = rotateButton.getAttribute("aria-pressed") === "true";
    rotateButton.setAttribute("aria-pressed", String(!rotating));
    if (rotating) viewer.removeAttribute("auto-rotate");
    else viewer.setAttribute("auto-rotate", "");
  });
  actions.appendChild(rotateButton);

  if (dish.hasAR && dish.glbUrl) {
    const arButton = document.createElement("button");
    arButton.className = "button button-outline";
    arButton.type = "button";
    arButton.dataset.ar = "true";
    arButton.textContent = "Ver en realidad aumentada";
    arButton.addEventListener("click", () => {
      if (viewer.canActivateAR) {
        viewer.activateAR();
        return;
      }
      dialogStatus.textContent = dish.usdzUrl
        ? "Este navegador no ha activado la realidad aumentada. En iPhone, abre la ficha desde Safari."
        : "Este dispositivo no ofrece realidad aumentada ahora. En iPhone hace falta, además, un archivo USDZ y abrir la página por HTTPS en Safari.";
    });
    actions.appendChild(arButton);
  }
  dialogStatus.textContent = "Arrastra para girar el plato y pellizca para acercarlo.";
}

const panoramaStatus = document.querySelector("#panorama-status");
const panoramaEl = document.querySelector("#panorama");

function setPanoramaMessage(title, text) {
  panoramaStatus.hidden = false;
  panoramaStatus.innerHTML = `<h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p>`;
}

async function preparePanorama() {
  let config = { file: "assets/panorama/local.jpg", hotspots: [] };
  try {
    const response = await fetch("data/panorama.json");
    if (response.ok) config = await response.json();
  } catch (error) {
    config = { file: "assets/panorama/local.jpg", hotspots: [] };
  }

  const file = config.file || "assets/panorama/local.jpg";
  let exists = false;
  try {
    const response = await fetch(file, { method: "HEAD" });
    exists = response.ok;
  } catch (error) {
    exists = false;
  }

  if (!exists) {
    setPanoramaMessage(
      "El recorrido todavía no tiene panorama",
      `Hace falta una fotografía equirectangular 2:1, en JPG, guardada como ${file}. No se simula el 360° con una foto normal. Cuando el archivo esté, esta zona cargará el visor con giro, zoom y pantalla completa.`
    );
    return;
  }

  const image = new Image();
  image.onload = () => {
    const ratio = image.naturalWidth / image.naturalHeight;
    if (ratio < 1.9 || ratio > 2.1) {
      setPanoramaMessage(
        "El archivo no vale como panorama",
        `Se encontró ${file} a ${image.naturalWidth}×${image.naturalHeight} px. Un equirectangular tiene que estar cerca de la proporción 2:1. No se muestra como recorrido 360°.`
      );
      return;
    }
    mountPanorama(file, config.hotspots || [], image.naturalWidth);
  };
  image.onerror = () => {
    setPanoramaMessage("No se ha podido leer el panorama", `El archivo ${file} existe, pero el navegador no ha podido abrirlo.`);
  };
  image.src = file;
}

function mountPanorama(file, hotspots, width) {
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "assets/vendor/pannellum/pannellum.css";
  document.head.appendChild(css);
  const script = document.createElement("script");
  script.src = "assets/vendor/pannellum/pannellum.js";
  script.onload = () => {
    panoramaEl.hidden = false;
    panoramaStatus.hidden = true;
    const spots = hotspots.filter(spot => spot && spot.title && Number.isFinite(spot.pitch) && Number.isFinite(spot.yaw));
    const viewer = pannellum.viewer("panorama", {
      type: "equirectangular",
      panorama: file,
      autoLoad: true,
      showZoomCtrl: true,
      showFullscreenCtrl: true,
      compass: false,
      hfov: 100,
      hotSpots: spots.map(spot => ({
        pitch: spot.pitch,
        yaw: spot.yaw,
        type: "info",
        text: spot.text ? `${spot.title}. ${spot.text}` : spot.title
      }))
    });
    viewer.on("error", () => {
      panoramaEl.hidden = true;
      setPanoramaMessage("El panorama no se ha podido cargar", "Pannellum ha devuelto un error al abrir el archivo. Revisa que sea un JPG equirectangular.");
    });
    panoramaStatus.hidden = false;
    panoramaStatus.innerHTML = `<p>Panorama de ${width} px de ancho. Arrastra o desliza para girar, usa la rueda o el pellizco para el zoom y el botón de pantalla completa del visor.</p>`;
  };
  script.onerror = () => {
    setPanoramaMessage("No se ha podido cargar el visor", "El panorama está en el proyecto, pero la librería Pannellum no ha llegado desde la red.");
  };
  document.body.appendChild(script);
}

const tour = document.querySelector("#recorrido");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) {
      observer.disconnect();
      preparePanorama();
    }
  }, { rootMargin: "200px" });
  observer.observe(tour);
} else {
  preparePanorama();
}

const toggle = document.querySelector(".menu-toggle");
const nav = document.querySelector("#nav");
toggle.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  toggle.setAttribute("aria-expanded", String(open));
});
nav.addEventListener("click", event => {
  if (event.target.closest("a")) {
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }
});

document.querySelector("#year").textContent = String(new Date().getFullYear());
