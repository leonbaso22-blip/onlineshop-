/* ============================================================
   Lumen Store — App-Logik
   - Produkt-Rendering
   - Warenkorb (mit localStorage)
   - Drawer, Mobile-Menü, Toast, Scroll-Reveal
   ============================================================ */

(function () {
  "use strict";

  const STORAGE_KEY = "lumen-cart";
  const euro = (cents) =>
    (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });

  // -------- State --------
  let cart = loadCart();

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

  // -------- Produkte rendern --------
  const grid = document.getElementById("productGrid");

  function renderProducts() {
    grid.innerHTML = PRODUCTS.map(
      (p) => `
      <article class="card reveal" data-id="${p.id}">
        <span class="card__tag">${p.tag || ""}</span>
        <div class="card__visual" style="background:${p.gradient}">${p.emoji}</div>
        <h3 class="card__name">${p.name}</h3>
        <p class="card__desc">${p.desc}</p>
        <div class="card__price">${euro(p.price)} <small>inkl. MwSt.</small></div>
        <button class="btn btn--small" data-add="${p.id}">In den Warenkorb</button>
      </article>`
    ).join("");
    observeReveals();
  }

  // -------- Warenkorb-Operationen --------
  function addToCart(id) {
    const line = cart.find((i) => i.id === id);
    if (line) {
      line.qty += 1;
    } else {
      cart.push({ id, qty: 1 });
    }
    saveCart();
    updateCartUI();
    const p = findProduct(id);
    showToast(`${p ? p.name : "Produkt"} hinzugefügt`);
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
          <div class="cart-item__visual" style="background:${p.gradient}">${p.emoji}</div>
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
    toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
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
  });

  document.getElementById("cartBtn").addEventListener("click", openCart);
  document.getElementById("cartClose").addEventListener("click", closeCart);
  overlayEl.addEventListener("click", closeCart);

  document.getElementById("checkoutBtn").addEventListener("click", () => {
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

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCart();
  });

  // -------- Init --------
  renderProducts();
  updateCartUI();
  observeReveals();
})();
