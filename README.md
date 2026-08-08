<div align="center">

<img src="logo.png" alt="AURELIA logo" width="120" />

# AURELIA

**The Private Vault for Rare Jewelry & Timepieces**

A local-first inventory, valuation, and provenance system for luxury goods — built with vanilla JavaScript, Tailwind CSS, and Chart.js.

[Live Demo](#) · [Report a Bug](https://github.com/talaodeh04/AURELIA/issues)

</div>

---

## About

AURELIA is a single-page web app for managing a private collection of jewelry and timepieces. It handles real pricing (price, taxes, ad spend, discounts), tracks stock levels, visualizes collection value, and logs every change — all stored locally in the browser, with no backend required.

Built as a hands-on project for the **BinX Tech Frontend Development Internship**, extending the standard "Product Management System" lab brief into a fuller, production-style application.

## Features

**The Vault** — Register, edit, and delete pieces with price, taxes, ad spend, discount, stock count, and category. The line total recalculates live as you type.

**Appraisal Insights** — Live charts (Chart.js) for value by category, top pieces by value, and stock levels per piece.

**Provenance Log** — Every create, update, and delete is logged with a timestamp, and deletions can be undone with one tap.

**Curator Notes** — Private notes pinned locally to the collection.

**Search & Filter** — Debounced search by piece name or category, plus category filter chips.

**Import / Export** — Bring in or send out your collection as a CSV file.

**QR Certificates** — Each piece gets a scannable certificate of authenticity, downloadable as an image.

**Dark Mode** — Full light/dark theme, saved across sessions.

**Fully Responsive** — Includes a mobile navigation menu and adapts down to small screens.

**Local Persistence** — Products, notes, activity log, and theme preference all survive a page refresh via `localStorage`.

## Tech Stack

- **JavaScript (ES6+)** — vanilla, no framework
- **Tailwind CSS** — via CDN
- **Chart.js** — data visualization
- **qrcodejs** — certificate generation
- **Font Awesome** — icons
- **Google Fonts** — Cormorant Garamond & Inter
- **Local Storage** — persistence, no backend

## Project Structure

```
AURELIA/
├── index.html      # Markup, layout, and Tailwind config
├── app.js           # All application logic
├── logo.png         # App logo
├── favicon.png       # Browser tab icon
└── README.md
```

## Getting Started

No build step or dependencies to install — it's a static site.

1. Clone the repository
   ```bash
   git clone https://github.com/talaodeh04/AURELIA.git
   ```
2. Open `index.html` in your browser, or serve it locally:
   ```bash
   npx serve .
   ```
3. Start adding pieces to the vault.

## Roadmap

- [ ] Multi-currency support
- [ ] Cloud sync / optional backend
- [ ] Bulk edit for stock counts
- [ ] Printable appraisal reports (PDF)

## Author

**Tala Odeh** — Frontend Development Intern, BinX Tech

## License

This project is available for educational and portfolio purposes.