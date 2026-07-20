export async function fetchJson(path, options = {}) {
  // Dev: always revalidate so edited JSON (toc/books/manifests) shows immediately.
  // Prod: keep aggressive caching for the static archive.
  const { cache = import.meta.env.DEV ? "no-cache" : "force-cache" } = options;
  const response = await fetch(path, { cache });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`);
  }
  return response.json();
}

export function findBook(books, bookId) {
  return books.find((book) => book.book_id === bookId) || books[0] || null;
}

export function formatWriterEntry(entry, booksById) {
  const book = booksById.get(entry.book_id);
  const title = book ? book.title_ko : entry.book_id;
  const chapter = Number.isFinite(Number(entry.chapter)) ? ` ${entry.chapter}장` : "";
  const page = Number.isFinite(Number(entry.page)) ? ` · ${entry.page}p` : "";
  return `${title}${chapter}${page}`;
}
