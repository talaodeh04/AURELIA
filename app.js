const STORAGE_PRODUCTS = "aurelia_products";
const STORAGE_NOTES = "aurelia_notes";
const STORAGE_THEME = "aurelia_theme";
const STORAGE_LOG = "aurelia_provenance_log";
const LOW_STOCK_THRESHOLD = 5;

const seedProducts = [
    { id: uid(), title: "Rolex Submariner", category: "Watches", price: 8500, taxes: 120, ads: 300, discount: 100, count: 3, createdAt: Date.now() - 500000 },
    { id: uid(), title: "Cartier Love Bracelet", category: "Bracelets", price: 6200, taxes: 90, ads: 150, discount: 50, count: 5, createdAt: Date.now() - 400000 },
    { id: uid(), title: "Tiffany Solitaire Ring", category: "Rings", price: 12000, taxes: 200, ads: 400, discount: 150, count: 2, createdAt: Date.now() - 300000 },
    { id: uid(), title: "Patek Philippe Nautilus", category: "Watches", price: 35000, taxes: 500, ads: 600, discount: 0, count: 1, createdAt: Date.now() - 200000 },
    { id: uid(), title: "Van Cleef Alhambra Necklace", category: "Necklaces", price: 9800, taxes: 150, ads: 250, discount: 100, count: 4, createdAt: Date.now() - 100000 }
];

let state = {
    products: [],
    notes: [],
    log: [],
    search: "",
    searchMode: "title",
    category: "All",
    pendingDeleteId: null,
    lastDeleted: null
};

let categoryChart = null;
let topProductsChart = null;
let stockChart = null;

function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatCurrency(value) {
    return "$" + Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calcTotal(p) {
    const total = (Number(p.price) || 0) + (Number(p.taxes) || 0) + (Number(p.ads) || 0) - (Number(p.discount) || 0);
    return total > 0 ? total : 0;
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function loadProducts() {
    const raw = localStorage.getItem(STORAGE_PRODUCTS);
    if (raw) {
        try { return JSON.parse(raw); } catch (e) { return []; }
    }
    localStorage.setItem(STORAGE_PRODUCTS, JSON.stringify(seedProducts));
    return seedProducts;
}

function saveProducts() {
    localStorage.setItem(STORAGE_PRODUCTS, JSON.stringify(state.products));
}

function loadNotes() {
    const raw = localStorage.getItem(STORAGE_NOTES);
    if (raw) { try { return JSON.parse(raw); } catch (e) { return []; } }
    return [];
}

function saveNotes() {
    localStorage.setItem(STORAGE_NOTES, JSON.stringify(state.notes));
}

function loadLog() {
    const raw = localStorage.getItem(STORAGE_LOG);
    if (raw) { try { return JSON.parse(raw); } catch (e) { return []; } }
    return [];
}

function saveLog() {
    localStorage.setItem(STORAGE_LOG, JSON.stringify(state.log));
}

function addLog(action, title, meta) {
    const entry = { id: uid(), action, title, meta: meta || null, timestamp: Date.now() };
    state.log.unshift(entry);
    state.log = state.log.slice(0, 40);
    saveLog();
    renderLog();
    return entry.id;
}

function applyTheme(theme) {
    const root = document.documentElement;
    const icon = document.getElementById("theme-icon");
    if (theme === "dark") {
        root.classList.add("dark");
        icon.classList.remove("fa-moon");
        icon.classList.add("fa-sun");
    } else {
        root.classList.remove("dark");
        icon.classList.remove("fa-sun");
        icon.classList.add("fa-moon");
    }
    localStorage.setItem(STORAGE_THEME, theme);
}

function initTheme() {
    const saved = localStorage.getItem(STORAGE_THEME);
    if (saved) { applyTheme(saved); return; }
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(prefersDark ? "dark" : "light");
}

function toggleTheme() {
    const isDark = document.documentElement.classList.contains("dark");
    applyTheme(isDark ? "light" : "dark");
    setTimeout(renderCharts, 350);
}

function startClock() {
    const clockEl = document.getElementById("live-clock");
    const heroDateEl = document.getElementById("hero-date");
    function tick() {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString("en-US", { hour12: false });
        heroDateEl.textContent = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    }
    tick();
    setInterval(tick, 1000);
}

function initReveal() {
    const items = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("in-view");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });
    items.forEach((item) => observer.observe(item));
}

function initNavHighlight() {
    const sections = document.querySelectorAll("section[id], header[id]");
    const links = document.querySelectorAll(".nav-link");
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                links.forEach((link) => {
                    link.classList.toggle("active", link.getAttribute("href") === "#" + entry.target.id);
                });
            }
        });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach((s) => observer.observe(s));
}

function initScrollTop() {
    const btn = document.getElementById("scroll-top");
    window.addEventListener("scroll", () => {
        if (window.scrollY > 600) {
            btn.classList.remove("hidden");
            btn.classList.add("flex");
        } else {
            btn.classList.add("hidden");
            btn.classList.remove("flex");
        }
    });
    btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

function animateCount(el, target) {
    const start = Number(el.dataset.value || 0);
    const duration = 700;
    const startTime = performance.now();
    function step(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(start + (target - start) * eased);
        el.textContent = value;
        if (progress < 1) requestAnimationFrame(step);
        else el.dataset.value = target;
    }
    requestAnimationFrame(step);
}

function getFilteredProducts() {
    let list = [...state.products];
    if (state.category !== "All") {
        list = list.filter((p) => p.category === state.category);
    }
    if (state.search.trim() !== "") {
        const q = state.search.trim().toLowerCase();
        if (state.searchMode === "category") {
            list = list.filter((p) => p.category.toLowerCase().includes(q));
        } else {
            list = list.filter((p) => p.title.toLowerCase().includes(q));
        }
    }
    return list.sort((a, b) => b.createdAt - a.createdAt);
}

function renderStats() {
    const total = state.products.length;
    const value = state.products.reduce((sum, p) => sum + calcTotal(p), 0);
    const low = state.products.filter((p) => p.count > 0 && p.count <= LOW_STOCK_THRESHOLD).length;
    const categories = new Set(state.products.map((p) => p.category)).size;

    animateCount(document.getElementById("hero-total"), total);
    document.getElementById("hero-value").textContent = formatCurrency(value);
    animateCount(document.getElementById("hero-low"), low);
    animateCount(document.getElementById("hero-categories"), categories);

    document.getElementById("delete-all-count").textContent = total;
}

function renderCategoryChips() {
    const wrap = document.getElementById("category-chips");
    const categories = ["All", ...new Set(state.products.map((p) => p.category))];
    wrap.innerHTML = categories.map((cat) => {
        const active = cat === state.category;
        const activeCls = active
            ? "bg-zinc-900 dark:bg-gold-400 text-white dark:text-zinc-900 border-zinc-900 dark:border-gold-400"
            : "bg-white dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-gold-400";
        return `<button data-category="${escapeHtml(cat)}" class="chip-btn px-4 py-2 rounded-full text-sm font-medium border transition-colors cursor-pointer ${activeCls}">${escapeHtml(cat)}</button>`;
    }).join("");
    wrap.querySelectorAll(".chip-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            state.category = btn.dataset.category;
            renderCategoryChips();
            renderProducts();
        });
    });

    const datalist = document.getElementById("category-suggestions");
    datalist.innerHTML = [...new Set(state.products.map((p) => p.category))]
        .map((cat) => `<option value="${escapeHtml(cat)}"></option>`).join("");
}

function stockBadge(count) {
    if (count === 0) return '<span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-200 dark:bg-zinc-800 text-zinc-500">Out</span>';
    if (count <= LOW_STOCK_THRESHOLD) return '<span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 dark:bg-rose-500/10 text-rose-500">' + count + ' remaining</span>';
    return '<span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600">' + count + ' available</span>';
}

function renderProducts() {
    const tbody = document.getElementById("product-tbody");
    const emptyState = document.getElementById("empty-state");
    const list = getFilteredProducts();

    if (list.length === 0) {
        tbody.innerHTML = "";
        document.querySelector("#operations table").classList.add("hidden");
        emptyState.classList.remove("hidden");
        emptyState.classList.add("flex");
        const title = document.getElementById("empty-title");
        const desc = document.getElementById("empty-desc");
        if (state.products.length === 0) {
            title.textContent = "The vault is empty";
            desc.textContent = "Add your first piece using the vault console above.";
        } else {
            title.textContent = "No matches found";
            desc.textContent = "Try a different search term or category filter.";
        }
        return;
    }

    document.querySelector("#operations table").classList.remove("hidden");
    emptyState.classList.add("hidden");
    emptyState.classList.remove("flex");

    tbody.innerHTML = list.map((p, i) => {
        const total = calcTotal(p);
        return `
      <tr class="row-enter border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/40" style="animation-delay:${i * 35}ms">
        <td class="px-4 py-3.5 font-mono text-xs text-zinc-400">#${String(i + 1).padStart(3, "0")}</td>
        <td class="px-4 py-3.5 font-semibold">${escapeHtml(p.title)}</td>
        <td class="px-4 py-3.5 text-right font-mono">${formatCurrency(p.price)}</td>
        <td class="px-4 py-3.5 text-right font-mono text-zinc-400">${formatCurrency(p.taxes)}</td>
        <td class="px-4 py-3.5 text-right font-mono text-zinc-400">${formatCurrency(p.ads)}</td>
        <td class="px-4 py-3.5 text-right font-mono text-rose-500">-${formatCurrency(p.discount)}</td>
        <td class="px-4 py-3.5 text-right font-mono font-bold text-gold-600 dark:text-gold-400">${formatCurrency(total)}</td>
        <td class="px-4 py-3.5">${stockBadge(p.count)}</td>
        <td class="px-4 py-3.5"><span class="px-2.5 py-1 rounded-full text-[11px] font-mono uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">${escapeHtml(p.category)}</span></td>
        <td class="px-4 py-3.5 text-center">
          <button data-id="${p.id}" class="qr-btn w-8 h-8 rounded-lg inline-flex items-center justify-center text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-gold-600 transition-colors"><i class="fa-solid fa-qrcode text-xs"></i></button>
        </td>
        <td class="px-4 py-3.5 text-center">
          <button data-id="${p.id}" class="edit-btn w-8 h-8 rounded-lg inline-flex items-center justify-center text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-gold-600 transition-colors"><i class="fa-solid fa-pen text-xs"></i></button>
        </td>
        <td class="px-4 py-3.5 text-center">
          <button data-id="${p.id}" class="delete-btn w-8 h-8 rounded-lg inline-flex items-center justify-center text-zinc-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-500 transition-colors"><i class="fa-solid fa-trash text-xs"></i></button>
        </td>
      </tr>
    `;
    }).join("");

    tbody.querySelectorAll(".edit-btn").forEach((el) => el.addEventListener("click", () => openEditMode(el.dataset.id)));
    tbody.querySelectorAll(".delete-btn").forEach((el) => el.addEventListener("click", () => openConfirmDelete(el.dataset.id)));
    tbody.querySelectorAll(".qr-btn").forEach((el) => el.addEventListener("click", () => openQrModal(el.dataset.id)));
}

function renderAll() {
    renderStats();
    renderCategoryChips();
    renderProducts();
    renderCharts();
}

function updateLiveTotal() {
    const price = parseFloat(document.getElementById("field-price").value) || 0;
    const taxes = parseFloat(document.getElementById("field-taxes").value) || 0;
    const ads = parseFloat(document.getElementById("field-ads").value) || 0;
    const discount = parseFloat(document.getElementById("field-discount").value) || 0;
    const total = calcTotal({ price, taxes, ads, discount });
    document.getElementById("live-total").textContent = formatCurrency(total);
}

function resetForm() {
    document.getElementById("product-form").reset();
    document.getElementById("product-id").value = "";
    document.getElementById("form-title").textContent = "Register New Piece";
    document.getElementById("submit-label").textContent = "Add to Vault";
    document.getElementById("form-icon").className = "fa-solid fa-plus text-sm";
    document.getElementById("cancel-edit-btn").classList.add("hidden");
    updateLiveTotal();
}

function openEditMode(id) {
    const product = state.products.find((p) => p.id === id);
    if (!product) return;
    document.getElementById("product-id").value = product.id;
    document.getElementById("field-title").value = product.title;
    document.getElementById("field-price").value = product.price;
    document.getElementById("field-taxes").value = product.taxes;
    document.getElementById("field-ads").value = product.ads;
    document.getElementById("field-discount").value = product.discount;
    document.getElementById("field-count").value = product.count;
    document.getElementById("field-category").value = product.category;
    document.getElementById("form-title").textContent = "Editing: " + product.title;
    document.getElementById("submit-label").textContent = "Save Changes";
    document.getElementById("form-icon").className = "fa-solid fa-pen text-sm";
    document.getElementById("cancel-edit-btn").classList.remove("hidden");
    updateLiveTotal();
    document.getElementById("form-card").scrollIntoView({ behavior: "smooth", block: "center" });
}

function handleProductSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("product-id").value;
    const title = document.getElementById("field-title").value.trim();
    const category = document.getElementById("field-category").value.trim();
    const price = parseFloat(document.getElementById("field-price").value);
    const taxes = parseFloat(document.getElementById("field-taxes").value) || 0;
    const ads = parseFloat(document.getElementById("field-ads").value) || 0;
    const discount = parseFloat(document.getElementById("field-discount").value) || 0;
    const count = parseInt(document.getElementById("field-count").value, 10);

    if (!title || !category || isNaN(price) || isNaN(count)) {
        showToast("Please fill in all required fields", "error");
        return;
    }

    if (id) {
        const product = state.products.find((p) => p.id === id);
        Object.assign(product, { title, category, price, taxes, ads, discount, count });
        addLog("updated", title);
        showToast("Piece details updated", "success");
    } else {
        state.products.unshift({ id: uid(), title, category, price, taxes, ads, discount, count, createdAt: Date.now() });
        addLog("created", title);
        showToast("Piece added to the vault", "success");
    }

    saveProducts();
    resetForm();
    renderAll();
}

function openConfirmDelete(id) {
    state.pendingDeleteId = id;
    showModal("confirm-modal");
}

function confirmDelete() {
    if (!state.pendingDeleteId) return;
    const product = state.products.find((p) => p.id === state.pendingDeleteId);
    if (!product) return;
    const index = state.products.indexOf(product);
    state.products = state.products.filter((p) => p.id !== state.pendingDeleteId);
    saveProducts();
    const logId = addLog("deleted", product.title, { undoable: true });
    state.lastDeleted = { product, index, logId };
    renderLog();
    state.pendingDeleteId = null;
    hideModal("confirm-modal");
    renderAll();
    showToast("Piece removed — restore from Provenance Log", "info");
}

function undoDelete(logId) {
    if (!state.lastDeleted) {
        showToast("Nothing to undo", "error");
        return;
    }
    const { product, index } = state.lastDeleted;
    state.products.splice(Math.min(index, state.products.length), 0, product);
    saveProducts();
    state.lastDeleted = null;
    state.log = state.log.filter((l) => l.id !== logId);
    saveLog();
    renderLog();
    renderAll();
    showToast("Piece restored to the vault", "success");
}

function deleteAllProducts() {
    state.products = [];
    saveProducts();
    addLog("cleared", "All pieces");
    hideModal("confirm-modal");
    renderAll();
    showToast("Vault cleared", "info");
}

function showModal(id) {
    const modal = document.getElementById(id);
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.body.style.overflow = "hidden";
}

function hideModal(id) {
    const modal = document.getElementById(id);
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.body.style.overflow = "";
}

function hideAllModals() {
    ["confirm-modal", "qr-modal"].forEach(hideModal);
}

function openQrModal(id) {
    const product = state.products.find((p) => p.id === id);
    if (!product) return;
    document.getElementById("qr-title").textContent = product.title;
    const wrap = document.getElementById("qr-canvas-wrap");
    wrap.innerHTML = "";
    const payload = JSON.stringify({
        title: product.title,
        category: product.category,
        price: product.price,
        total: calcTotal(product),
        stock: product.count
    });
    new QRCode(wrap, { text: payload, width: 200, height: 200, colorDark: "#0B1220", colorLight: "#ffffff" });
    document.getElementById("qr-download-btn").onclick = () => {
        const img = wrap.querySelector("img") || wrap.querySelector("canvas");
        const link = document.createElement("a");
        link.download = product.title.replace(/\s+/g, "-").toLowerCase() + "-certificate.png";
        link.href = img.tagName === "CANVAS" ? img.toDataURL("image/png") : img.src;
        link.click();
    };
    showModal("qr-modal");
}

function showToast(message, type) {
    const container = document.getElementById("toast-container");
    const icons = { success: "fa-circle-check text-emerald-400", error: "fa-circle-exclamation text-rose-400", info: "fa-circle-info text-blue-400" };
    const toast = document.createElement("div");
    toast.className = "toast-enter flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-900 text-white shadow-2xl border border-zinc-800 min-w-[260px]";
    toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span class="text-sm font-medium">${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.transition = "opacity 0.4s, transform 0.4s";
        toast.style.opacity = "0";
        toast.style.transform = "translateX(120%)";
        setTimeout(() => toast.remove(), 400);
    }, 3200);
}

function logMeta(action) {
    const map = {
        created: { icon: "fa-solid fa-plus", color: "text-gold-500 border-gold-400" },
        updated: { icon: "fa-solid fa-pen", color: "text-blue-500 border-blue-400" },
        deleted: { icon: "fa-solid fa-trash", color: "text-rose-500 border-rose-400" },
        cleared: { icon: "fa-solid fa-trash-can", color: "text-rose-500 border-rose-400" },
        imported: { icon: "fa-solid fa-file-import", color: "text-azure-500 border-azure-400" }
    };
    return map[action] || map.created;
}

function renderLog() {
    const wrap = document.getElementById("activity-log");
    const empty = document.getElementById("activity-empty");
    if (state.log.length === 0) {
        wrap.innerHTML = "";
        empty.classList.remove("hidden");
        empty.classList.add("flex");
        return;
    }
    empty.classList.add("hidden");
    empty.classList.remove("flex");

    wrap.innerHTML = state.log.map((entry) => {
        const meta = logMeta(entry.action);
        const time = new Date(entry.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        const undoBtn = entry.meta && entry.meta.undoable && state.lastDeleted && state.lastDeleted.logId === entry.id
            ? `<button data-log-id="${entry.id}" class="undo-btn ml-auto text-xs font-semibold text-gold-600 dark:text-gold-400 hover:underline flex-shrink-0">Undo</button>`
            : "";
        return `
      <div class="log-item ${meta.color} flex items-center gap-3 pl-3 py-1.5">
        <div class="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center ${meta.color} flex-shrink-0"><i class="${meta.icon} text-xs"></i></div>
        <div class="min-w-0 flex-1">
          <p class="text-sm truncate"><span class="font-semibold capitalize">${entry.action}</span> — ${escapeHtml(entry.title)}</p>
          <p class="text-[11px] text-zinc-400 font-mono">${time}</p>
        </div>
        ${undoBtn}
      </div>
    `;
    }).join("");

    wrap.querySelectorAll(".undo-btn").forEach((btn) => {
        btn.addEventListener("click", () => undoDelete(btn.dataset.logId));
    });
}

function clearLog() {
    state.log = [];
    saveLog();
    renderLog();
}

function exportCsv() {
    const headers = ["title", "category", "price", "taxes", "ads", "discount", "count"];
    const rows = state.products.map((p) => headers.map((h) => p[h]).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aurelia-vault.csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Vault exported to CSV", "success");
}

function importCsv(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const lines = e.target.result.split(/\r?\n/).filter((l) => l.trim() !== "");
        if (lines.length < 2) {
            showToast("CSV file is empty", "error");
            return;
        }
        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
        let importedCount = 0;
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(",");
            const row = {};
            headers.forEach((h, idx) => { row[h] = cols[idx] ? cols[idx].trim() : ""; });
            if (!row.title) continue;
            state.products.unshift({
                id: uid(),
                title: row.title,
                category: row.category || "Uncategorized",
                price: parseFloat(row.price) || 0,
                taxes: parseFloat(row.taxes) || 0,
                ads: parseFloat(row.ads) || 0,
                discount: parseFloat(row.discount) || 0,
                count: parseInt(row.count, 10) || 0,
                createdAt: Date.now()
            });
            importedCount++;
        }
        saveProducts();
        addLog("imported", importedCount + " pieces");
        renderAll();
        showToast(importedCount + " pieces imported", "success");
    };
    reader.readAsText(file);
}

function chartTextColor() {
    return document.documentElement.classList.contains("dark") ? "#d4d4d8" : "#3f3f46";
}

function renderCharts() {
    if (typeof Chart === "undefined") return;

    const categoryCanvas = document.getElementById("category-chart");
    const categoryTotals = state.products.reduce((acc, p) => {
        acc[p.category] = (acc[p.category] || 0) + calcTotal(p);
        return acc;
    }, {});
    const catLabels = Object.keys(categoryTotals);
    const catData = Object.values(categoryTotals);

    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart(categoryCanvas, {
        type: "doughnut",
        data: {
            labels: catLabels.length ? catLabels : ["No data"],
            datasets: [{
                data: catData.length ? catData : [1],
                backgroundColor: ["#D4AF37", "#1C8CE0", "#3b82f6", "#f43f5e", "#a855f7", "#14b8a6"],
                borderColor: document.documentElement.classList.contains("dark") ? "#0B1220" : "#ffffff",
                borderWidth: 3
            }]
        },
        options: {
            plugins: { legend: { position: "bottom", labels: { color: chartTextColor(), font: { family: "Inter" }, boxWidth: 12, padding: 14 } } },
            cutout: "62%"
        }
    });

    const topCanvas = document.getElementById("top-products-chart");
    const topSorted = [...state.products].sort((a, b) => calcTotal(b) - calcTotal(a)).slice(0, 6);
    if (topProductsChart) topProductsChart.destroy();
    topProductsChart = new Chart(topCanvas, {
        type: "bar",
        data: {
            labels: topSorted.length ? topSorted.map((p) => p.title) : ["No data"],
            datasets: [{
                data: topSorted.length ? topSorted.map((p) => calcTotal(p)) : [0],
                backgroundColor: "#D4AF37",
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: "y",
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: chartTextColor() }, grid: { color: "rgba(148,163,184,0.15)" } },
                y: { ticks: { color: chartTextColor() }, grid: { display: false } }
            }
        }
    });

    const stockCanvas = document.getElementById("stock-chart");
    if (stockChart) stockChart.destroy();
    stockChart = new Chart(stockCanvas, {
        type: "bar",
        data: {
            labels: state.products.length ? state.products.map((p) => p.title) : ["No data"],
            datasets: [{
                data: state.products.length ? state.products.map((p) => p.count) : [0],
                backgroundColor: state.products.map((p) => (p.count <= LOW_STOCK_THRESHOLD ? "#f43f5e" : "#D4AF37")),
                borderRadius: 6
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: chartTextColor() }, grid: { display: false } },
                y: { ticks: { color: chartTextColor() }, grid: { color: "rgba(148,163,184,0.15)" } }
            }
        }
    });
}

function renderNotes() {
    const grid = document.getElementById("notes-grid");
    const empty = document.getElementById("notes-empty");
    if (state.notes.length === 0) {
        grid.innerHTML = "";
        empty.classList.remove("hidden");
        empty.classList.add("flex");
        return;
    }
    empty.classList.add("hidden");
    empty.classList.remove("flex");

    const palette = ["bg-gold-50 dark:bg-gold-500/10 border-gold-200 dark:border-gold-500/20", "bg-azure-50 dark:bg-azure-500/10 border-azure-200 dark:border-azure-500/20", "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20", "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20"];

    grid.innerHTML = state.notes.map((note, i) => `
    <div class="note-card relative p-4 rounded-xl border ${palette[i % palette.length]}">
      <p class="text-sm text-zinc-700 dark:text-zinc-200 pr-6 break-words">${escapeHtml(note.text)}</p>
      <p class="text-[11px] text-zinc-400 font-mono mt-2">${new Date(note.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
      <button data-id="${note.id}" class="delete-note-btn absolute top-3 right-3 w-6 h-6 rounded-md flex items-center justify-center text-zinc-400 hover:text-rose-500 hover:bg-white/60 dark:hover:bg-black/20 transition-colors">
        <i class="fa-solid fa-xmark text-xs"></i>
      </button>
    </div>
  `).join("");

    grid.querySelectorAll(".delete-note-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            state.notes = state.notes.filter((n) => n.id !== btn.dataset.id);
            saveNotes();
            renderNotes();
        });
    });
}

function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

function setSearchMode(mode) {
    state.searchMode = mode;
    document.querySelectorAll(".search-mode-btn").forEach((btn) => {
        if (btn.dataset.mode === mode) {
            btn.className = "search-mode-btn h-9 px-4 rounded-lg text-sm font-medium bg-zinc-900 dark:bg-gold-400 text-white dark:text-zinc-900 transition-colors";
        } else {
            btn.className = "search-mode-btn h-9 px-4 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors";
        }
    });
    renderProducts();
}

function initMobileMenu() {
    const toggleBtn = document.getElementById("mobile-menu-toggle");
    const menu = document.getElementById("mobile-menu");
    const icon = document.getElementById("mobile-menu-icon");
    if (!toggleBtn || !menu) return;

    function closeMenu() {
        menu.classList.add("hidden");
        icon.classList.remove("fa-xmark");
        icon.classList.add("fa-bars");
    }

    function toggleMenu() {
        const isOpen = !menu.classList.contains("hidden");
        if (isOpen) {
            closeMenu();
        } else {
            menu.classList.remove("hidden");
            icon.classList.remove("fa-bars");
            icon.classList.add("fa-xmark");
        }
    }

    toggleBtn.addEventListener("click", toggleMenu);
    menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
    window.addEventListener("resize", () => {
        if (window.innerWidth >= 1024) closeMenu();
    });
}

function initEventListeners() {
    document.getElementById("theme-toggle").addEventListener("click", toggleTheme);

    document.querySelectorAll(".calc-field").forEach((el) => el.addEventListener("input", updateLiveTotal));
    document.getElementById("product-form").addEventListener("submit", handleProductSubmit);
    document.getElementById("cancel-edit-btn").addEventListener("click", resetForm);

    document.querySelectorAll(".modal-close, .modal-backdrop").forEach((el) => el.addEventListener("click", hideAllModals));
    document.getElementById("confirm-cancel").addEventListener("click", () => {
        state.pendingDeleteId = null;
        hideModal("confirm-modal");
    });
    document.getElementById("confirm-delete").addEventListener("click", () => {
        if (state.pendingDeleteId === "ALL") {
            deleteAllProducts();
        } else {
            confirmDelete();
        }
    });

    document.getElementById("delete-all-btn").addEventListener("click", () => {
        if (state.products.length === 0) {
            showToast("Nothing to delete", "info");
            return;
        }
        state.pendingDeleteId = "ALL";
        document.getElementById("confirm-title").textContent = "Clear the entire vault?";
        document.getElementById("confirm-desc").textContent = "This will remove all " + state.products.length + " pieces permanently.";
        showModal("confirm-modal");
    });

    const debouncedSearch = debounce((value) => {
        state.search = value;
        renderProducts();
    }, 220);
    document.getElementById("search-input").addEventListener("input", (e) => debouncedSearch(e.target.value));

    document.getElementById("search-by-title").addEventListener("click", () => setSearchMode("title"));
    document.getElementById("search-by-category").addEventListener("click", () => setSearchMode("category"));

    document.getElementById("export-btn").addEventListener("click", exportCsv);
    document.getElementById("import-btn").addEventListener("click", () => document.getElementById("import-file").click());
    document.getElementById("import-file").addEventListener("change", (e) => {
        if (e.target.files[0]) importCsv(e.target.files[0]);
        e.target.value = "";
    });

    document.getElementById("clear-log-btn").addEventListener("click", clearLog);

    document.getElementById("note-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const input = document.getElementById("note-input");
        const text = input.value.trim();
        if (!text) return;
        state.notes.unshift({ id: uid(), text, createdAt: Date.now() });
        saveNotes();
        renderNotes();
        input.value = "";
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
            e.preventDefault();
            document.getElementById("search-input").focus();
        }
        if (e.key === "Escape") hideAllModals();
    });

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener("click", function (e) {
            const target = document.querySelector(this.getAttribute("href"));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        });
    });
}

function init() {
    initTheme();
    startClock();
    initReveal();
    initNavHighlight();
    initScrollTop();
    initMobileMenu();

    state.products = loadProducts();
    state.notes = loadNotes();
    state.log = loadLog();

    initEventListeners();
    resetForm();
    renderAll();
    renderNotes();
    renderLog();
}

document.addEventListener("DOMContentLoaded", init);