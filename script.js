// Arrays til læseliste og læste bøger
let readingList = JSON.parse(localStorage.getItem("readingList")) || [];
let readBooks = JSON.parse(localStorage.getItem("readBooks")) || [];

const searchInput = document.getElementById("search-input");

searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim();
    if (query.length < 3) return;
    performSearch(query);
});

function performSearch(query) {
    // Ryd eksisterende sektioner på index
    const sections = document.querySelectorAll("section");
    sections.forEach(section => {
        if (!["reading-list-kat", "my-books-kat"].includes(section.id)) {
            section.innerHTML = "";
        }
    });

    // Lav ny section til søgning
    const searchSection = document.createElement("section");
    searchSection.id = "search-results";

    const h2 = document.createElement("h2");
    h2.textContent = `Søgeresultater for "${query}"`;
    searchSection.appendChild(h2);

    const rowDiv = document.createElement("div");
    rowDiv.className = "row"; // Brug samme styling som dine eksisterende book-rows

    // Hent bøger via OpenLibrary API
    fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(data => {
            data.docs.slice(0, 20).forEach(book => {
                const div = document.createElement("div");
                div.classList.add("book");

                const title = book.title || "Ukendt titel";
                const author = book.author_name ? book.author_name[0] : "Ukendt forfatter";
                let coverUrl = "https://via.placeholder.com/150x220?text=No+Cover";
                if (book.cover_i) {
                    coverUrl = `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`;
                }

                div.innerHTML = `
                    <img src="${coverUrl}" alt="${title}">
                    <h3>${title}</h3>
                    <p>${author}</p>
                `;

                div.addEventListener("click", () => openBookDetail(book));
                rowDiv.appendChild(div);
            });
        })
        .catch(err => console.error("Fejl ved hentning:", err));

    searchSection.appendChild(rowDiv);
    document.body.appendChild(searchSection);
}

// Funktion til at hente bøger til en kategori
function loadKategori(query, sectionId) {
    const section = document.querySelector(`#${sectionId} .row`);
    if (!section) return; // hvis sektionen ikke findes på siden

    fetch(`https://openlibrary.org/search.json?q=${query}`)
        .then(res => res.json())
        .then(data => {
            section.innerHTML = "";

            data.docs.slice(0, 20).forEach(book => {
                const div = document.createElement("div");
                div.classList.add("book");

                const title = book.title || "Ukendt titel";
                const author = book.author_name ? book.author_name[0] : "Ukendt forfatter";

                let coverUrl = "https://via.placeholder.com/150x220?text=No+Cover";
                if (book.cover_i) {
                    coverUrl = `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`;
                }

                div.innerHTML = `
                    <img src="${coverUrl}" alt="${title}">
                    <h3>${title}</h3>
                    <p>${author}</p>
                `;

                // Klik på bogkort åbner detaljemodal
                div.addEventListener("click", () => openBookDetail(book));

                section.appendChild(div);
            });
        })
        .catch(error => console.error("Fejl ved hentning:", error));
}

// Funktion til at åbne detaljemodal
function openBookDetail(book) {
    const modal = document.getElementById("book-detail");
    if (!modal) return; // hvis modal ikke findes på siden

    const titleEl = document.getElementById("detail-title");
    const authorEl = document.getElementById("detail-author");
    const yearEl = document.getElementById("detail-year");
    const subjectsEl = document.getElementById("detail-subjects");
    const descriptionEl = document.getElementById("detail-description");
    const coverEl = document.getElementById("detail-cover");

    // Basis info
    titleEl.textContent = book.title || "Ukendt titel";
    authorEl.textContent = "Forfatter: " + (book.author_name ? book.author_name.join(", ") : "Ukendt");
    yearEl.textContent = "Første udgivelse: " + (book.first_publish_year || "Ukendt");

    if (book.cover_i) {
        coverEl.src = `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`;
    } else {
        coverEl.src = "https://via.placeholder.com/150x220?text=No+Cover";
    }

    // Hent detaljer fra Work API
    fetch(`https://openlibrary.org${book.key}.json`)
        .then(res => res.json())
        .then(detail => {
            let desc = "";
            if (detail.description) {
                desc = typeof detail.description === "string" ? detail.description : detail.description.value;
            }
            descriptionEl.textContent = desc;

            if (detail.subjects) {
                subjectsEl.textContent = "Emner: " + detail.subjects.slice(0, 3).join(", ");
            }
        })
        .catch(err => console.error("Fejl ved hentning af detaljer:", err));

    modal.classList.remove("hidden");

    // Læseliste knap toggle
    const addBtn = document.getElementById("add-reading-list");
    if (addBtn) {
        if (readingList.some(b => b.key === book.key)) {
            addBtn.textContent = "Fjern fra læseliste";
            addBtn.onclick = () => {
                removeFromReadingList(book);
                addBtn.textContent = "Tilføj til læseliste";
            };
        } else {
            addBtn.textContent = "Tilføj til læseliste";
            addBtn.onclick = () => {
                addToReadingList(book);
                addBtn.textContent = "Fjern fra læseliste";
            };
        }
    }

    // Mine bøger knap toggle
    const markBtn = document.getElementById("mark-as-read");
    if (markBtn) {
        if (readBooks.some(b => b.key === book.key)) {
            markBtn.textContent = "Fjern fra dine bøger";
            markBtn.onclick = () => {
                removeFromMyBooks(book);
                markBtn.textContent = "Markér som læst";
            };
        } else {
            markBtn.textContent = "Markér som læst";
            markBtn.onclick = () => {
                markAsRead(book);
                markBtn.textContent = "Fjern fra dine bøger";
            };
        }
    }
}

// Luk modal med kryds
const closeBtn = document.getElementById("close-detail");
if (closeBtn) {
    closeBtn.addEventListener("click", () => {
        document.getElementById("book-detail").classList.add("hidden");
    });
}

// Luk modal ved klik udenfor modal-content
const modal = document.getElementById("book-detail");
if (modal) {
    modal.addEventListener("click", (e) => {
        if (e.target.id === "book-detail") {
            e.target.classList.add("hidden");
        }
    });
}

// Tilføj bog til læseliste
function addToReadingList(book) {
    if (!readingList.some(b => b.key === book.key)) {
        readingList.push(book);
        localStorage.setItem("readingList", JSON.stringify(readingList));
    }
}

// Fjern bog fra læseliste
function removeFromReadingList(book) {
    readingList = readingList.filter(b => b.key !== book.key);
    localStorage.setItem("readingList", JSON.stringify(readingList));
    renderReadingList();
}

// Markér som læst
function markAsRead(book) {
    if (!readBooks.some(b => b.key === book.key)) {
        readBooks.push(book);
        localStorage.setItem("readBooks", JSON.stringify(readBooks));

        // Fjern fra læselisten hvis den er der
        readingList = readingList.filter(b => b.key !== book.key);
        localStorage.setItem("readingList", JSON.stringify(readingList));
        renderReadBooks();
    }
}

// Fjern bog fra mine bøger
function removeFromMyBooks(book) {
    readBooks = readBooks.filter(b => b.key !== book.key);
    localStorage.setItem("readBooks", JSON.stringify(readBooks));
    renderReadBooks();
}

// Render læseliste (kun på reading-list.html)
function renderReadingList() {
    const container = document.getElementById("reading-list-kat");
    if (!container) return; // findes ikke på index.html

    container.innerHTML = "";

    if (readingList.length === 0) {
        container.innerHTML = "<p>Din læseliste er tom.</p>";
        return;
    }

    readingList.forEach(book => {
        const div = document.createElement("div");
        div.classList.add("book");

        const title = book.title || "Ukendt titel";
        const author = book.author_name ? book.author_name[0] : "Ukendt forfatter";

        let coverUrl = "https://via.placeholder.com/150x220?text=No+Cover";
        if (book.cover_i) {
            coverUrl = `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`;
        }

        div.innerHTML = `
            <img src="${coverUrl}" alt="${title}">
            <h3>${title}</h3>
            <p>${author}</p>
        `;

        div.addEventListener("click", () => openBookDetail(book));
        container.appendChild(div);
    });
}

// Render læste bøger (kun på my-books.html)
function renderReadBooks() {
    const container = document.getElementById("my-books-kat");
    if (!container) return; // findes ikke på andre sider

    container.innerHTML = "";

    if (readBooks.length === 0) {
        container.innerHTML = "<p>Du har ikke markeret nogen bøger som læst endnu.</p>";
        return;
    }

    readBooks.forEach(book => {
        const div = document.createElement("div");
        div.classList.add("book");

        const title = book.title || "Ukendt titel";
        const author = book.author_name ? book.author_name[0] : "Ukendt forfatter";

        let coverUrl = "https://via.placeholder.com/150x220?text=No+Cover";
        if (book.cover_i) {
            coverUrl = `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`;
        }

        div.innerHTML = `
            <img src="${coverUrl}" alt="${title}">
            <h3>${title}</h3>
            <p>${author}</p>
        `;

        // Gør det muligt at åbne popup med mere info
        div.addEventListener("click", () => openBookDetail(book));

        container.appendChild(div);
    });
}



// Kør kun renderReadBooks hvis vi er på my-books siden
if (document.getElementById("my-books-kat")) {
    renderReadBooks();
}


// Kør kun renderReadingList hvis vi er på reading-list siden
if (document.getElementById("reading-list-kat")) {
    renderReadingList();
}

// Load kategorier kun på index.html
if (document.getElementById("popular")) {
    loadKategori("popular", "popular");
    loadKategori("crime", "krimi");
    loadKategori("romance", "romantik");
}