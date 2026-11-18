"use strict";

const productsById = new Map(earthnestProducts.map(product => [product.id, product]));
const categories = ["All products", "Bath & Body", "Kitchen & Home", "On the Go"];
const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD"
});
const maximumQuantity = 99;
const storageKey = "earthnest.cart.v1";
const overlay = document.querySelector("#overlay");
const overlayContent = document.querySelector("#dialog-content");
const live = document.querySelector("#announcement-live");
const shopPage = document.body.dataset.page === "shop";
const shopSearch = document.querySelector("#shop-search");
const shopSort = document.querySelector("#shop-sort");
const filterState = { category: "All products", query: "", sort: "featured" };

let cart = {};
let persistentCartAvailable = true;
let overlayOpener = null;
let detailId = null;
let detailQuantity = 1;
let detailOrigin = "";
let modalQuery = "";
let reviewedCart = "";
let enquiryDraft = null;
let toastTimer;

function icon(name) {
  return `<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;
}
function escapeHtml(value) {
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value).replace(/[&<>"']/g, character => entities[character]);
}
function price(cents) {
  return priceFormatter.format(cents / 100);
}
function unitLabel(number, singular = "item") {
  return `${number} ${singular}${number === 1 ? "" : "s"}`;
}
function picture(product, lazy = true) {
  return `<img src="assets/${product.id}.webp" alt="${escapeHtml(product.alt)}" width="880" height="880" ${lazy ? 'loading="lazy"' : ""} decoding="async">`;
}
function productCard(product, lazy = true) {
  const name = escapeHtml(product.name);
  return `<article class="product-card" data-product="${product.id}">
    <button class="product-photo" type="button" data-action="detail" data-id="${product.id}" aria-label="View ${name}" aria-haspopup="dialog">
      ${picture(product, lazy)}<span class="category-label">${escapeHtml(product.category)}</span>
    </button>
    <div class="product-copy">
      <div class="product-heading"><h3><button class="product-title" type="button" data-action="detail" data-id="${product.id}" aria-haspopup="dialog">${name}</button></h3><span class="price">${price(product.priceCents)}</span></div>
      <p>${escapeHtml(product.short)}</p>
      <div class="card-actions"><button class="card-add" type="button" data-action="add" data-id="${product.id}" aria-label="Add ${name} to cart">${icon("plus")} Add to cart</button>
      <button class="details-link" type="button" data-action="detail" data-id="${product.id}" aria-label="View details for ${name}" aria-haspopup="dialog">View details</button></div>
    </div>
  </article>`;
}
function matchingProducts(query, category = "All products", sort = "featured") {
  const terms = query.trim().toLocaleLowerCase("en-IN").split(/\s+/).filter(Boolean);
  const matches = earthnestProducts.filter(product => {
    const haystack = `${product.name} ${product.category} ${product.short} ${product.material}`.toLocaleLowerCase("en-IN");
    return (category === "All products" || product.category === category) && terms.every(term => haystack.includes(term));
  });
  if (sort === "price-asc") matches.sort((a, b) => a.priceCents - b.priceCents);
  if (sort === "price-desc") matches.sort((a, b) => b.priceCents - a.priceCents);
  if (sort === "name-asc") matches.sort((a, b) => a.name.localeCompare(b.name, "en-IN"));
  if (sort === "name-desc") matches.sort((a, b) => b.name.localeCompare(a.name, "en-IN"));
  return matches;
}
function shopUrl(query = "") {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  return "shop.html" + (params.size ? `?${params}` : "");
}
function loadShopState() {
  const params = new URLSearchParams(location.search);
  const category = params.get("category");
  const sort = params.get("sort");
  filterState.category = categories.includes(category) ? category : "All products";
  filterState.query = params.get("q") || "";
  filterState.sort = [...shopSort.options].some(option => option.value === sort) ? sort : "featured";
  shopSearch.value = filterState.query;
  shopSort.value = filterState.sort;
}
function renderShop(updateUrl = true) {
  const matches = matchingProducts(filterState.query, filterState.category, filterState.sort);
  document.querySelectorAll("[data-category]").forEach(chip => {
    chip.setAttribute("aria-pressed", String(chip.dataset.category === filterState.category));
  });
  document.querySelector("#result-count").textContent = unitLabel(matches.length, "product");
  const empty = `<div class="empty-results"><h2>No matching products.</h2><p>Try another search or browse the full collection.</p><button class="btn outline" data-action="reset-shop" type="button">Show all products</button></div>`;
  document.querySelector("#shop-grid").innerHTML = matches.length ? matches.map((product, i) => productCard(product, i >= 4)).join("") : empty;
  if (!updateUrl) return;
  const url = new URL(location.href);
  const params = url.searchParams;
  if (filterState.query.trim()) params.set("q", filterState.query.trim()); else params.delete("q");
  if (filterState.category === "All products") params.delete("category"); else params.set("category", filterState.category);
  if (filterState.sort === "featured") params.delete("sort"); else params.set("sort", filterState.sort);
  try { history.replaceState(null, "", url); } catch { /* A locally opened file can still filter in memory. */ }
}
function resetShop() {
  Object.assign(filterState, { category: "All products", query: "", sort: "featured" });
  shopSearch.value = "";
  shopSort.value = "featured";
  renderShop();
  shopSearch.focus();
}
function readCart() {
  if (!persistentCartAvailable) return { ...cart };
  try {
    const source = JSON.parse(localStorage.getItem(storageKey) || "{}");
    const valid = {};
    if (!source || typeof source !== "object" || Array.isArray(source)) return valid;
    for (const [id, quantity] of Object.entries(source)) {
      if (productsById.has(id) && Number.isInteger(quantity) && quantity > 0) {
        valid[id] = Math.min(quantity, maximumQuantity);
      }
    }
    return valid;
  } catch (error) {
    if (error instanceof SyntaxError) return {};
    persistentCartAvailable = false;
    return { ...cart };
  }
}
function writeCart() {
  if (persistentCartAvailable) {
    try { localStorage.setItem(storageKey, JSON.stringify(cart)); }
    catch { persistentCartAvailable = false; }
  }
  updateCartCount();
}
function cartLines() {
  return Object.entries(cart).map(([id, quantity]) => ({ product: productsById.get(id), quantity }));
}
function cartTotals(lines = cartLines()) {
  return lines.reduce((total, { product, quantity }) => ({
    count: total.count + quantity, amount: total.amount + product.priceCents * quantity
  }), { count: 0, amount: 0 });
}
function updateCartCount() {
  const count = cartTotals().count;
  document.querySelectorAll("[data-cart-count]").forEach(badge => { badge.textContent = count; });
  document.querySelector(".bag-trigger").setAttribute("aria-label", `Open shopping cart, ${unitLabel(count)}`);
}
function announce(message) {
  live.textContent = "";
  requestAnimationFrame(() => { live.textContent = message; });
}
function hideToast() {
  clearTimeout(toastTimer);
  document.querySelector("#toast").hidden = true;
}
function showToast(message) {
  const toast = document.querySelector("#toast");
  clearTimeout(toastTimer);
  document.querySelector("#toast-message").textContent = message;
  toast.hidden = false;
  announce(message);
  toastTimer = setTimeout(hideToast, 4700);
}
function addProduct(id, quantity = 1, showDrawer = false) {
  const product = productsById.get(id);
  if (!product) return;
  cart = readCart();
  const before = cart[id] || 0;
  cart[id] = Math.min(maximumQuantity, before + quantity);
  writeCart();
  const added = cart[id] - before;
  const message = added === 0 ? `The limit is ${maximumQuantity} per product.` : `${product.name} added to cart.`;
  if (showDrawer) {
    openCart();
    announce(message);
  } else {
    showToast(message);
  }
}
function closeButton() {
  return `<button class="dialog-close" type="button" data-action="close" aria-label="Close dialog">${icon("close")}</button>`;
}
function drawerHead(title) {
  return `<div class="drawer-head"><h2 tabindex="-1" id="dialog-title">${title}</h2>${closeButton()}</div>`;
}
function dialogHead(title) {
  return `<div class="dialog-head"><h2 tabindex="-1" id="dialog-title">${title}</h2>${closeButton()}</div>`;
}
function showOverlay(kind, markup, focusSelector = "#dialog-title") {
  if (!overlay.open) overlayOpener = document.activeElement;
  hideToast();
  overlay.dataset.kind = kind;
  overlayContent.innerHTML = markup;
  if (!overlay.open) overlay.showModal();
  document.body.classList.add("modal-open");
  overlay.scrollTop = 0;
  const focusTarget = overlayContent.querySelector(focusSelector) || overlayContent.querySelector("#dialog-title");
  if (focusTarget) focusTarget.focus({ preventScroll: true });
}
function miniProduct(product) {
  return `<button type="button" class="mini-product" data-action="detail" data-id="${product.id}">
    ${picture(product, false)}<span class="mini-info"><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.category)}</small></span><span class="price">${price(product.priceCents)}</span>${icon("up-right")}
  </button>`;
}
function renderSearch() {
  const matches = matchingProducts(modalQuery);
  const results = document.querySelector("#search-results");
  results.innerHTML = matches.length ? matches.map(miniProduct).join("") : `<p class="no-matches">No matching products. Try “bamboo”, “kitchen” or “tote”.</p>`;
  const view = document.querySelector("#all-search-results");
  view.href = shopUrl(modalQuery);
  view.innerHTML = `${modalQuery.trim() ? `View results (${matches.length})` : "View the full collection"} ${icon("arrow")}`;
  document.querySelector("#search-count").textContent = unitLabel(matches.length, "product");
}
function openSearch(restore = false) {
  if (!restore) modalQuery = "";
  showOverlay("search", `<div class="dialog-pad">${dialogHead("Search EarthNest")}
    <form id="quick-search-form" role="search"><div class="search-field">${icon("search")}<label class="sr-only" for="quick-search">Search products</label><input type="search" id="quick-search" autocomplete="off" placeholder="Search by product, material or category" value="${escapeHtml(modalQuery)}"></div></form>
    <span id="search-count" class="sr-only" aria-live="polite"></span><div id="search-results" class="search-list"></div><a id="all-search-results" class="text-link modal-link" href="shop.html"></a></div>`, "#quick-search");
  renderSearch();
}
function openScene() {
  const items = ["tote", "dispenser", "cloths", "jars"].map(id => miniProduct(productsById.get(id))).join("");
  showOverlay("scene", `<div class="dialog-pad">${dialogHead("Shop the scene")}<p class="dialog-note">Explore the everyday pieces behind our sunlit kitchen edit.</p><div class="scene-list">${items}</div></div>`);
}
function stepper(quantity, context, id) {
  const label = escapeHtml(productsById.get(id).name);
  return `<div class="stepper" role="group" aria-label="Quantity for ${label}">
    <button type="button" data-action="${context}-minus" data-id="${id}" aria-label="Decrease quantity of ${label}" ${quantity <= 1 ? "disabled" : ""}>${icon("minus")}</button>
    <output aria-label="Quantity">${quantity}</output>
    <button type="button" data-action="${context}-plus" data-id="${id}" aria-label="Increase quantity of ${label}" ${quantity >= maximumQuantity ? "disabled" : ""}>${icon("plus")}</button>
  </div>`;
}
function openDetail(id) {
  const product = productsById.get(id);
  if (!product) return;
  detailOrigin = overlay.open && ["scene", "search"].includes(overlay.dataset.kind) ? overlay.dataset.kind : "";
  detailId = id;
  detailQuantity = 1;
  const backLabel = detailOrigin === "scene" ? "Back to the scene" : "Back to search";
  const back = detailOrigin ? `<button class="detail-back" data-action="detail-back" type="button">${icon("back")} ${backLabel}</button>` : "";
  showOverlay("detail", `<div class="detail-layout">${closeButton()}
    <img class="detail-photo" src="assets/${product.id}.webp" alt="${escapeHtml(product.alt)}" width="880" height="880">
    <div class="detail-body">${back}<div class="detail-kicker">${escapeHtml(product.category)}</div><h2 tabindex="-1" id="dialog-title">${escapeHtml(product.name)}</h2>
    <p class="price detail-price">${price(product.priceCents)}</p><p class="detail-description">${escapeHtml(product.description)}</p>
    <dl class="product-facts"><div><dt>Material</dt><dd>${escapeHtml(product.material)}</dd></div><div><dt>Includes</dt><dd>${escapeHtml(product.includes)}</dd></div></dl>
    <details class="care"><summary>How to care for it</summary><p>${escapeHtml(product.care)}</p></details>
    <div class="detail-buy">${stepper(1, "detail", id)}<button type="button" class="btn primary" data-action="detail-add" data-id="${id}">${icon("bag")} Add to cart</button></div></div></div>`);
}
function changeDetailQuantity(delta) {
  detailQuantity = Math.max(1, Math.min(maximumQuantity, detailQuantity + delta));
  updateStepper(overlayContent.querySelector(".stepper"), detailQuantity);
}
function updateStepper(control, quantity) {
  control.querySelector("output").textContent = quantity;
  control.querySelector('[data-action$="-minus"]').disabled = quantity === 1;
  control.querySelector('[data-action$="-plus"]').disabled = quantity === maximumQuantity;
}

function cartRow({ product, quantity }) {
  const name = escapeHtml(product.name);
  return `<article class="cart-row" data-cart-row="${product.id}">${picture(product, false)}<div>
    <div class="cart-row-heading"><h3>${name}</h3><button type="button" class="remove-btn" data-action="remove" data-id="${product.id}" aria-label="Remove ${name} from cart">${icon("trash")}</button></div>
    <p>${price(product.priceCents)} each</p><div class="cart-row-tail">${stepper(quantity, "cart", product.id)}<span class="price">${price(product.priceCents * quantity)}</span></div>
  </div></article>`;
}
function openCart(focusSelector = "#dialog-title", keepScroll = false) {
  cart = readCart();
  updateCartCount();
  const lines = cartLines();
  const totals = cartTotals(lines);
  const scroll = keepScroll ? overlayContent.querySelector(".drawer-body")?.scrollTop || 0 : 0;
  const head = drawerHead(`Your cart <span>(${totals.count})</span>`);
  if (!lines.length) {
    showOverlay("cart", `${head}<div class="empty-cart">${icon("bag")}<h3>Your cart is empty.</h3><p>Find something for your everyday routine in the collection.</p><a class="btn primary" href="shop.html">Explore Collection ${icon("arrow")}</a></div>`);
    return;
  }
  showOverlay("cart", `${head}<div class="drawer-body">${lines.map(cartRow).join("")}</div>
    <div class="drawer-foot"><div class="totals-line"><span>Subtotal</span><span class="price">${price(totals.amount)}</span></div>
      <button class="btn primary" type="button" data-action="review">Review demo order ${icon("arrow")}</button>
      <p class="dialog-note">Assignment prototype · Illustrative prices</p></div>`, focusSelector);
  overlayContent.querySelector(".drawer-body").scrollTop = scroll;
}
function changeCart(id, action) {
  const latest = readCart();
  const changedElsewhere = JSON.stringify(latest) !== JSON.stringify(cart);
  cart = latest;
  if (!cart[id]) { openCart(); return; }
  if (action === "remove") delete cart[id];
  else cart[id] = Math.min(maximumQuantity, Math.max(1, cart[id] + (action === "cart-plus" ? 1 : -1)));
  writeCart();
  if (action === "remove" || changedElsewhere) {
    openCart('[data-action="remove"]', true);
  } else {
    const row = overlayContent.querySelector(`[data-cart-row="${id}"]`);
    const totals = cartTotals();
    updateStepper(row.querySelector(".stepper"), cart[id]);
    row.querySelector(".price").textContent = price(productsById.get(id).priceCents * cart[id]);
    overlayContent.querySelector(".drawer-head h2 span").textContent = `(${totals.count})`;
    overlayContent.querySelector(".totals-line .price").textContent = price(totals.amount);
  }
  const name = productsById.get(id).name;
  announce(action === "remove" ? `${name} removed from cart.` : `${name}, quantity ${cart[id]}. Subtotal ${price(cartTotals().amount)}.`);
}
function openReview() {
  cart = readCart();
  const lines = cartLines();
  if (!lines.length) { openCart(); return; }
  reviewedCart = JSON.stringify(cart);
  const { amount, count } = cartTotals(lines);
  const items = lines.map(({ product, quantity }) => `<li>${picture(product, false)}<div><strong>${escapeHtml(product.name)}</strong><small>${quantity} × ${price(product.priceCents)}</small></div><span class="price">${price(product.priceCents * quantity)}</span></li>`).join("");
  showOverlay("review", `${drawerHead("Review your order")}<div class="drawer-body"><div class="review-intro">
    <button data-action="cart" type="button" class="drawer-back">${icon("back")} Back to cart</button>
    <p class="dialog-note">Preview a purchase of ${unitLabel(count)}. This assignment checkout simulates an order without payment or delivery.</p></div>
    <ul class="review-list">${items}</ul></div><div class="drawer-foot"><div class="totals-line"><span>Demo total</span><span class="price">${price(amount)}</span></div>
    <button class="btn primary" type="button" data-action="place-order">Place demo order ${icon("arrow")}</button></div>`);
}
function completeDemo() {
  cart = readCart();
  if (reviewedCart !== JSON.stringify(cart)) {
    openReview();
    announce("Your cart changed. Review the updated products before placing the demo order.");
    return;
  }
  const { amount, count } = cartTotals();
  if (!count) { openCart(); return; }
  cart = {};
  writeCart();
  reviewedCart = "";
  showOverlay("receipt", `${drawerHead("Demo order complete")}<div class="receipt">${icon("check")}<h3>Thank you for visiting.</h3><p>You completed the practice checkout for ${unitLabel(count)}, totalling <strong>${price(amount)}</strong>.</p><a class="btn primary" href="shop.html">Back to the collection ${icon("arrow")}</a></div>`);
  announce("Demo order complete.");
}
function openMenu() {
  const home = shopPage ? "index.html" : "";
  const links = [["Home", "index.html"], ["Shop", "shop.html"], ["Our Story", `${home}#story`], ["Why EarthNest", `${home}#why-earthnest`], ["Contact", `${home}#contact`]];
  showOverlay("menu", `${drawerHead("Explore EarthNest")}<nav class="mobile-links" aria-label="Mobile navigation">${links.map(([name, href]) => `<a href="${href}">${name}${icon("up-right")}</a>`).join("")}</nav>`);
}
function openContact(edit = false) {
  if (!edit) enquiryDraft = null;
  const draft = enquiryDraft || { name: "", email: "", message: "" };
  showOverlay("contact", `<div class="dialog-pad">${dialogHead("Contact EarthNest")}
    <p class="dialog-note">Prepare an enquiry about a product or its care. This demo creates a downloadable message on your device.</p>
    <form id="enquiry-form" class="enquiry-form"><label>Your name<input name="name" maxlength="80" required autocomplete="given-name" value="${escapeHtml(draft.name)}"></label>
    <label>Email address<input name="email" type="email" autocomplete="email" maxlength="180" required value="${escapeHtml(draft.email)}"></label>
    <label>Your question<textarea name="message" rows="4" maxlength="1600" required>${escapeHtml(draft.message)}</textarea></label>
    <button class="btn primary" type="submit">Prepare enquiry ${icon("arrow")}</button></form></div>`);
}
function prepareEnquiry(form) {
  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  const message = String(data.get("message") || "").trim();
  if (!name || !message) {
    const field = form.elements.namedItem(!name ? "name" : "message");
    field.setCustomValidity("Please enter some text.");
    field.reportValidity();
    return;
  }
  enquiryDraft = { name, email: String(data.get("email") || "").trim(), message };
  showOverlay("enquiry", `<div class="dialog-pad">${dialogHead("Your enquiry is ready")}
    <p class="dialog-note">You can download this draft for your records or return to edit it.</p>
    <div class="draft-preview">${escapeHtml(enquiryText())}</div>
    <div class="hero-actions"><button class="btn primary" type="button" data-action="download">${icon("download")} Download enquiry</button>
    <button class="details-link" type="button" data-action="edit-enquiry">Edit message</button></div></div>`);
}
function enquiryText() {
  const { name, email, message } = enquiryDraft;
  return `EarthNest enquiry\n\nFrom: ${name}\nEmail: ${email}\n\n${message}`;
}
function downloadEnquiry() {
  if (!enquiryDraft) return;
  const url = URL.createObjectURL(new Blob([enquiryText()], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "EarthNest-enquiry.txt";
  overlayContent.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
  announce("Enquiry prepared for download.");
}
function handleAction(button) {
  const { action, id } = button.dataset;
  switch (action) {
    case "search": openSearch(); break;
    case "scene": openScene(); break;
    case "detail": openDetail(id); break;
    case "detail-back": detailOrigin === "search" ? openSearch(true) : openScene(); break;
    case "cart": openCart(); break;
    case "review": openReview(); break;
    case "place-order": completeDemo(); break;
    case "add": addProduct(id); break;
    case "detail-add": addProduct(detailId, detailQuantity, true); break;
    case "detail-plus": changeDetailQuantity(1); break;
    case "detail-minus": changeDetailQuantity(-1); break;
    case "cart-plus":
    case "cart-minus":
    case "remove": changeCart(id, action); break;
    case "menu": openMenu(); break;
    case "close": overlay.close(); break;
    case "reset-shop": resetShop(); break;
    case "dismiss-toast": hideToast(); break;
    case "contact": openContact(); break;
    case "edit-enquiry": openContact(true); break;
    case "download": downloadEnquiry(); break;
  }
}
document.addEventListener("click", event => {
  const button = event.target.closest("[data-action]");
  if (button) { handleAction(button); return; }
  const categoryButton = event.target.closest("[data-category]");
  if (categoryButton) {
    filterState.category = categoryButton.dataset.category;
    renderShop();
    return;
  }
  if (overlay.open && event.target.closest(".mobile-links a")) overlay.close();
});
document.addEventListener("input", event => {
  const field = event.target;
  if (field === shopSearch) {
    filterState.query = field.value;
    renderShop();
  } else if (field.id === "quick-search") {
    modalQuery = field.value;
    renderSearch();
  } else if (field.closest("#enquiry-form")) {
    field.setCustomValidity("");
  }
});
document.addEventListener("submit", event => {
  if (event.target.id === "quick-search-form") {
    event.preventDefault();
    location.href = shopUrl(modalQuery);
  } else if (event.target.id === "enquiry-form") {
    event.preventDefault();
    prepareEnquiry(event.target);
  }
});
overlay.addEventListener("close", () => {
  document.body.classList.remove("modal-open");
  if (overlayOpener && overlayOpener.isConnected) overlayOpener.focus({ preventScroll: true });
  overlayOpener = null;
  overlay.removeAttribute("data-kind");
  overlayContent.replaceChildren();
  enquiryDraft = null;
});
let pressedBackdrop = false;
function outsideOverlay(event) {
  const rect = overlay.getBoundingClientRect();
  return event.target === overlay && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom);
}
overlay.addEventListener("pointerdown", event => { pressedBackdrop = outsideOverlay(event); });
overlay.addEventListener("click", event => {
  if (pressedBackdrop && outsideOverlay(event)) overlay.close();
  pressedBackdrop = false;
});
window.addEventListener("storage", event => {
  if (event.key !== storageKey && event.key !== null) return;
  cart = readCart();
  updateCartCount();
  if (overlay.open && overlay.dataset.kind === "cart") openCart("#dialog-title", true);
  if (overlay.open && overlay.dataset.kind === "review") openReview();
});
window.addEventListener("pageshow", () => {
  cart = readCart();
  updateCartCount();
});
document.addEventListener("error", event => {
  const image = event.target;
  if (!(image instanceof HTMLImageElement) || image.dataset.fallback) return;
  image.dataset.fallback = "true";
  const pictureSource = image.closest("picture")?.querySelector("source");
  if (pictureSource) pictureSource.remove();
  image.alt = "EarthNest";
  image.src = "assets/mark.svg";
  image.classList.add("fallback-image");
}, true);

function startHomeMotion() {
  const hero = document.querySelector(".hero");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const desktop = window.matchMedia("(min-width: 701px)");
  let frame = 0;
  const navSections = [...document.querySelectorAll("#story, #why-earthnest, #philosophy, #contact")];
  const nav = document.querySelector(".desktop-nav");
  function update() {
    frame = 0;
    if (!reduce.matches && desktop.matches && scrollY < hero.offsetHeight + 170) {
      hero.style.setProperty("--parallax", `${Math.min(15, Math.max(0, scrollY) * 0.08)}px`);
    }
    const section = navSections.filter(node => node.getBoundingClientRect().top < 150).pop();
    const target = section ? `#${section.id}` : "index.html";
    for (const link of nav.querySelectorAll("a")) {
      if (link.getAttribute("href") === target) link.setAttribute("aria-current", section ? "location" : "page");
      else link.removeAttribute("aria-current");
    }
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  update();
  if (!("IntersectionObserver" in window) || reduce.matches) return;
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("reveal-visible");
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: 0.12 });
  document.querySelectorAll(".story-copy, .value-card, .philosophy-inner > div").forEach(element => observer.observe(element));
}

cart = readCart();
updateCartCount();
if (shopPage) {
  loadShopState();
  renderShop(false);
  shopSort.addEventListener("change", () => { filterState.sort = shopSort.value; renderShop(); });
  window.addEventListener("popstate", () => { loadShopState(); renderShop(false); });
} else {
  document.querySelector("#featured-grid").innerHTML = earthnestProducts.slice(0, 4).map(product => productCard(product)).join("");
  startHomeMotion();
}

