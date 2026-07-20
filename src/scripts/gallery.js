(function () {
  const gallery = window.__GALLERY__;
  const timeline = document.getElementById("timeline");
  if (!gallery || !timeline) return;

  timeline.innerHTML = "";
  (gallery.items || []).forEach((item, idx) => {
    const block = document.createElement("article");
    block.className = "timeline-item grid items-center gap-5 rounded-2xl border border-border bg-card p-5 shadow-soft lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]";
    block.innerHTML = [
      '<div class="timeline-content grid content-center gap-2">',
      '<p class="timeline-step text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">STEP ' + String(idx + 1).padStart(2, "0") + "</p>",
      '<strong class="timeline-date text-sm font-medium text-zinc-600">' + item.date + "</strong>",
      '<h3 class="text-xl font-semibold tracking-tight text-zinc-900">' + item.title + "</h3>",
      '<p class="text-sm leading-7 text-zinc-700">' + (item.description || "") + "</p>",
      "</div>",
      '<div class="timeline-image-wrap overflow-hidden rounded-xl border border-border bg-zinc-50">',
      '<img class="block aspect-[4/3] w-full object-cover" loading="lazy" src="' + item.image + '" alt="' + item.title + '" />',
      "</div>",
    ].join("");
    timeline.appendChild(block);
  });
})();
