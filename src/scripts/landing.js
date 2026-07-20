(function () {
  const books = window.__BOOKS__ || [];
  const otGrid = document.getElementById("ot-cover-grid");
  const ntGrid = document.getElementById("nt-cover-grid");

  function renderCard(book) {
    const card = document.createElement("article");
    card.className = "group overflow-hidden rounded-xl border border-border bg-card shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg";
    card.innerHTML = [
      '<a class="block p-2" href="/reader/' + book.book_id + '/">',
      '<img class="aspect-[3/4] w-full rounded-md border border-border object-cover" loading="lazy" src="' + book.cover_image + '" alt="' + book.title_ko + ' cover" />',
      '<div class="px-1 pb-2 pt-3">',
      '<h3 class="text-sm font-semibold tracking-tight text-zinc-900">' + book.title_ko + "</h3>",
      '<p class="mt-1 text-xs text-zinc-600">' + book.title_en + "</p>",
      "</div>",
      "</a>",
    ].join("");
    return card;
  }

  function renderCovers() {
    if (!otGrid || !ntGrid) return;
    otGrid.innerHTML = "";
    ntGrid.innerHTML = "";

    books.forEach((book) => {
      const target = book.testament === "new" ? ntGrid : otGrid;
      target.appendChild(renderCard(book));
    });
  }

  renderCovers();
})();
