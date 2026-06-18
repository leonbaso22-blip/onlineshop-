/* ============================================================
   air up Store — App-Logik
   - Produkt-Rendering mit SVG-Illustrationen
   - Kategorie-Filter (Tabs)
   - Warenkorb mit localStorage
   - Drawer, Mobile-Menü, Toast, Scroll-Reveal
   - FAQ-Accordion, Newsletter
   ============================================================ */

(function () {
  "use strict";

  const STORAGE_KEY = "airup-cart";
  const euro = (cents) =>
    (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });

  // -------- State --------
  let cart = loadCart();
  let activeCategory = "all";

  function loadCart() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }
  function saveCart() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }
  const findProduct = (id) => PRODUCTS.find((p) => p.id === id);

  // -------- Kategorie-Tabs --------
  const tabsEl = document.getElementById("catTabs");

  function renderTabs() {
    if (!tabsEl) return;
    tabsEl.innerHTML = CATEGORIES.map(
      (c) =>
        `<button class="tab${c.id === activeCategory ? " tab--active" : ""}" data-cat="${c.id}" role="tab" aria-selected="${c.id === activeCategory}">${c.label}</button>`
    ).join("");
  }

  // -------- Produkte rendern --------
  const grid = document.getElementById("productGrid");

  function visibleProducts() {
    return activeCategory === "all"
      ? PRODUCTS
      : PRODUCTS.filter((p) => p.category === activeCategory);
  }

  function renderProducts() {
    grid.innerHTML = visibleProducts()
      .map(
        (p) => `
      <article class="card reveal" data-id="${p.id}">
        ${p.tag ? `<span class="card__tag">${p.tag}</span>` : `<span class="card__tag"></span>`}
        <div class="card__visual">
          ${renderArt(p.art)}
          ${p.badge ? `<span class="card__badge" aria-hidden="true">${p.badge}</span>` : ""}
        </div>
        <h3 class="card__name">${p.name}</h3>
        <p class="card__desc">${p.desc}</p>
        <div class="card__price">
          <span>${euro(p.price)}</span>
          ${p.oldPrice ? `<s>${euro(p.oldPrice)}</s>` : ""}
          <small>inkl. MwSt.</small>
        </div>
        <button class="btn btn--small" data-add="${p.id}">In den Warenkorb</button>
      </article>`
      )
      .join("");
    observeReveals();
  }

  // -------- Warenkorb-Operationen --------
  function addToCart(id) {
    const line = cart.find((i) => i.id === id);
    if (line) line.qty += 1;
    else cart.push({ id, qty: 1 });
    saveCart();
    updateCartUI();
    const p = findProduct(id);
    showToast(`${p ? p.name : "Produkt"} hinzugefügt 🛒`);
    bumpCart();
  }

  function changeQty(id, delta) {
    const line = cart.find((i) => i.id === id);
    if (!line) return;
    line.qty += delta;
    if (line.qty <= 0) cart = cart.filter((i) => i.id !== id);
    saveCart();
    updateCartUI();
  }

  function removeFromCart(id) {
    cart = cart.filter((i) => i.id !== id);
    saveCart();
    updateCartUI();
  }

  const cartTotalCents = () =>
    cart.reduce((sum, i) => {
      const p = findProduct(i.id);
      return sum + (p ? p.price * i.qty : 0);
    }, 0);

  const cartCount = () => cart.reduce((sum, i) => sum + i.qty, 0);

  // -------- Warenkorb-UI --------
  const cartItemsEl = document.getElementById("cartItems");
  const cartEmptyEl = document.getElementById("cartEmpty");
  const cartFootEl = document.getElementById("cartFoot");
  const cartTotalEl = document.getElementById("cartTotal");
  const cartCountEl = document.getElementById("cartCount");
  const cartBtn = document.getElementById("cartBtn");

  function updateCartUI() {
    const count = cartCount();
    cartCountEl.textContent = count;
    cartCountEl.hidden = count === 0;

    if (cart.length === 0) {
      cartItemsEl.innerHTML = "";
      cartEmptyEl.style.display = "flex";
      cartFootEl.hidden = true;
      return;
    }

    cartEmptyEl.style.display = "none";
    cartFootEl.hidden = false;

    cartItemsEl.innerHTML = cart
      .map((i) => {
        const p = findProduct(i.id);
        if (!p) return "";
        return `
        <div class="cart-item">
          <div class="cart-item__visual">${renderArt(p.art)}</div>
          <div class="cart-item__info">
            <div class="cart-item__name">${p.name}</div>
            <div class="cart-item__price">${euro(p.price)}</div>
            <div class="cart-item__qty">
              <button data-dec="${p.id}" aria-label="Menge verringern">−</button>
              <span>${i.qty}</span>
              <button data-inc="${p.id}" aria-label="Menge erhöhen">+</button>
            </div>
            <button class="cart-item__remove" data-remove="${p.id}">Entfernen</button>
          </div>
        </div>`;
      })
      .join("");

    cartTotalEl.innerHTML = euro(cartTotalCents());
  }

  function bumpCart() {
    cartBtn.classList.remove("bump");
    void cartBtn.offsetWidth; // Reflow erzwingen
    cartBtn.classList.add("bump");
  }

  // -------- Drawer --------
  const cartEl = document.getElementById("cart");
  const overlayEl = document.getElementById("drawerOverlay");

  function openCart() {
    overlayEl.hidden = false;
    requestAnimationFrame(() => cartEl.classList.add("open"));
    cartEl.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeCart() {
    cartEl.classList.remove("open");
    cartEl.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    setTimeout(() => (overlayEl.hidden = true), 400);
  }

  // -------- Toast --------
  let toastTimer;
  function showToast(msg) {
    let t = document.querySelector(".toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    requestAnimationFrame(() => t.classList.add("show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
  }

  // -------- Scroll-Reveal --------
  let io;
  function observeReveals() {
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
      return;
    }
    if (!io) {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("in");
              io.unobserve(e.target);
            }
          });
        },
        { threshold: 0.12 }
      );
    }
    document.querySelectorAll(".reveal:not(.in)").forEach((el) => io.observe(el));
  }

  // -------- Mobile-Menü --------
  const burger = document.getElementById("burger");
  const navLinks = document.querySelector(".nav__links");

  // -------- Events --------
  document.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) return addToCart(add.dataset.add);

    const inc = e.target.closest("[data-inc]");
    if (inc) return changeQty(inc.dataset.inc, +1);

    const dec = e.target.closest("[data-dec]");
    if (dec) return changeQty(dec.dataset.dec, -1);

    const rem = e.target.closest("[data-remove]");
    if (rem) return removeFromCart(rem.dataset.remove);

    const tab = e.target.closest("[data-cat]");
    if (tab) {
      activeCategory = tab.dataset.cat;
      renderTabs();
      renderProducts();
      return;
    }

    const faq = e.target.closest(".faq__q");
    if (faq) {
      const item = faq.parentElement;
      const open = item.classList.toggle("open");
      faq.setAttribute("aria-expanded", String(open));
      return;
    }
  });

  cartBtn.addEventListener("click", openCart);
  document.getElementById("cartClose").addEventListener("click", closeCart);
  overlayEl.addEventListener("click", closeCart);

  document.getElementById("checkoutBtn").addEventListener("click", () => {
    if (cart.length === 0) return;
    showToast(`Danke! Bestellung über ${euro(cartTotalCents())} aufgegeben 🎉`);
    cart = [];
    saveCart();
    updateCartUI();
    closeCart();
  });

  document.getElementById("searchBtn").addEventListener("click", () => {
    document.getElementById("catalogRoot").scrollIntoView({ behavior: "smooth" });
  });

  burger.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    burger.setAttribute("aria-expanded", String(open));
  });
  navLinks.addEventListener("click", (e) => {
    if (e.target.tagName === "A") {
      navLinks.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
    }
  });

  // Newsletter
  const newsletter = document.getElementById("newsletterForm");
  if (newsletter) {
    newsletter.addEventListener("submit", (e) => {
      e.preventDefault();
      newsletter.reset();
      showToast("Willkommen an Bord! 🎉 Du erhältst gleich deinen Gutschein.");
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCart();
  });

  // -------- Init --------
  renderTabs();
  renderProducts();
  updateCartUI();
  observeReveals();

  // aktuelles Jahr im Footer
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
