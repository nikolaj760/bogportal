// Hent læseliste og læste bøger fra localStorage
let readingList = JSON.parse(localStorage.getItem("readingList")) || [];
let readBooks = JSON.parse(localStorage.getItem("readBooks")) || [];

// Hjælpefunktioner

// Gem data i localStorage
function save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// Returner coverbillede eller placeholder
function coverUrl(book) {
    return book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : "https://via.placeholder.com/150x220?text=No+Cover";
}

// Lav bogkort med billede og klik-event
function makeBookCard(book) {
    const div = document.createElement("div");
    div.className = "book";
    div.innerHTML = `<img src="${coverUrl(book)}" alt="${book.title || "No title"}">`;
    div.addEventListener("click", () => openBookDetail(book));
    return div;
}

// Vis liste af bøger eller tom besked
function renderList(list, containerId, emptyMsg) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";
    if (list.length === 0) {
        container.innerHTML = `<p>${emptyMsg}</p>`;
        return;
    }
    list.forEach(book => container.appendChild(makeBookCard(book)));
}

// Søgning
const searchInput = document.getElementById("search-input");
if (searchInput) {
    searchInput.addEventListener("input", () => {
        const query = searchInput.value.trim();
        if (query.length < 3) return;
        performSearch(query);
    });
}

function performSearch(query) {
    // Ryd sektioner undtagen læseliste og mine bøger
    document.querySelectorAll("section").forEach(s => {
        if (!["reading-list-kat", "my-books-kat"].includes(s.id)) s.innerHTML = "";
    });

    // Lav/find sektion til søgeresultater
    let searchSection = document.getElementById("search-results");
    if (!searchSection) {
        searchSection = document.createElement("section");
        searchSection.id = "search-results";
        document.body.appendChild(searchSection);
    }
    // Ryd footer
    const footer = document.querySelector("footer");
    if (footer) footer.innerHTML = ""; // rydder footeren helt væk under søgning
    if (!searchSection.parentElement) document.body.appendChild(searchSection);

    // Tilføj overskrift
    searchSection.innerHTML = `<h2>Search results for "${query}"</h2>`;
    const row = document.createElement("div");
    row.className = "row";
    searchSection.appendChild(row);

    // Hent søgeresultater (20 stk.)
    fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(data => {
            data.docs.slice(0,20).forEach(book => row.appendChild(makeBookCard(book)));
        })
        .catch(e => console.error("Error fetching search:", e));
}

// Kategori loader
// Hent og vis kategori
function loadKategori(query, sectionId) {
    const section = document.querySelector(`#${sectionId} .row`);
    if (!section) return;
    fetch(`https://openlibrary.org/search.json?q=${query}`)
        .then(res => res.json())
        .then(data => {
            section.innerHTML = "";
            data.docs.slice(0,20).forEach(book => section.appendChild(makeBookCard(book)));
        })
        .catch(e => console.error("Error loading category:", e));
}

// Modal og knapper
// Åbn modal med bogdetaljer og knapper
function openBookDetail(book) {
    const modal = document.getElementById("book-detail");
    if (!modal) return;

    const titleEl = document.getElementById("detail-title");
    const authorEl = document.getElementById("detail-author");
    const yearEl = document.getElementById("detail-year");
    const subjectsEl = document.getElementById("detail-subjects");
    const descriptionEl = document.getElementById("detail-description");
    const coverEl = document.getElementById("detail-cover");

    // Udfyld modal med boginfo
    titleEl.textContent = book.title || "Unknown title";
    authorEl.textContent = "Author: " + (book.author_name ? book.author_name.join(", ") : "Unknown");
    yearEl.textContent = "First published: " + (book.first_publish_year || "Unknown");
    coverEl.src = coverUrl(book);
    subjectsEl.textContent = "";
    descriptionEl.textContent = "";

    // Hent detaljer fra API
    fetch(`https://openlibrary.org${book.key}.json`)
        .then(res => res.json())
        .then(detail => {
            let desc = "";
            if (detail.description) desc = typeof detail.description === "string" ? detail.description : detail.description.value;
            descriptionEl.textContent = desc;
            if (detail.subjects) subjectsEl.textContent = "Subjects: " + detail.subjects.slice(0,3).join(", ");
        })
        .catch(() => {});

    modal.classList.remove("hidden");

    // Knap til læseliste
    const addBtn = document.getElementById("add-reading-list");
    if (addBtn) {
        if (readingList.some(b => b.key === book.key)) {
            addBtn.textContent = "Remove from reading list";
            addBtn.onclick = () => {
                readingList = readingList.filter(b => b.key !== book.key);
                save("readingList", readingList);
                addBtn.textContent = "Add to reading list";
                renderReadingList();
            };
        } else {
            addBtn.textContent = "Add to reading list";
            addBtn.onclick = () => {
                readingList.push(book);
                save("readingList", readingList);
                addBtn.textContent = "Remove from reading list";
                renderReadingList();
            };
        }
    }

    // Knap til marker som læst
    const markBtn = document.getElementById("mark-as-read");
    if (markBtn) {
        if (readBooks.some(b => b.key === book.key)) {
            markBtn.textContent = "Remove from your books";
            markBtn.onclick = () => {
                readBooks = readBooks.filter(b => b.key !== book.key);
                save("readBooks", readBooks);
                markBtn.textContent = "Mark book as read";
                renderReadBooks();
            };
        } else {
            markBtn.textContent = "Mark book as read";
            markBtn.onclick = () => {
                readBooks.push(book);
                save("readBooks", readBooks);
                readingList = readingList.filter(b => b.key !== book.key);
                save("readingList", readingList);
                markBtn.textContent = "Remove from your books";
                renderReadBooks();
                renderReadingList();
            };
        }
    }
}

// Luk modal (kryds)
const closeBtn = document.getElementById("close-detail");
if (closeBtn) closeBtn.addEventListener("click", () => {
    // Skjul modal
    document.getElementById("book-detail").classList.add("hidden");
});

// Luk modal (klik udenfor)
const modal = document.getElementById("book-detail");
if (modal) modal.addEventListener("click", e => {
    // Skjul modal ved klik udenfor
    if (e.target === modal) modal.classList.add("hidden");
});



// Vis læseliste
function renderReadingList() {
    renderList(readingList, "reading-list-kat", "Your reading list is empty.");
}

// Vis læste bøger
function renderReadBooks() {
    renderList(readBooks, "my-books-kat", "You have not marked any books as read yet.");
}


// Kør funktioner ved load
if (document.getElementById("my-books-kat")) renderReadBooks();
if (document.getElementById("reading-list-kat")) renderReadingList();

if (document.getElementById("popular")) {
    loadKategori("award", "popular");
    loadKategori("scifi", "sci-fi");
    loadKategori("thriller", "thriller");
    loadKategori("horror", "horror");
    loadKategori("fantasy", "fantasy");
    loadKategori("Harry-Potter", "kids");
    loadKategori("nonfiction", "nonfic");
}