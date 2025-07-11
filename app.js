// Simple substitution cipher for API key obfuscation
const _subMap = {
    'a': 'q', 'b': 'w', 'c': 'e', 'd': 'r', 'e': 't', 'f': 'y', 'g': 'u', 'h': 'i', 'i': 'o', 'j': 'p',
    'k': 'a', 'l': 's', 'm': 'd', 'n': 'f', 'o': 'g', 'p': 'h', 'q': 'j', 'r': 'k', 's': 'l', 't': 'z',
    'u': 'x', 'v': 'c', 'w': 'v', 'x': 'b', 'y': 'n', 'z': 'm',
    '0': '5', '1': '6', '2': '7', '3': '8', '4': '9', '5': '0', '6': '1', '7': '2', '8': '3', '9': '4'
};
const _revSubMap = Object.fromEntries(Object.entries(_subMap).map(([k, v]) => [v, k]));
function encodeSub(str) {
    return str.split('').map(ch => _subMap[ch] || ch).join('');
}
function decodeSub(str) {
    return str.split('').map(ch => _revSubMap[ch] || ch).join('');
}
// Encoded API key (obfuscated)
const _obfKey = encodeSub('9d0abb35effd939e5705f3e9b6245a83');
const TMDB_API_KEY = decodeSub(_obfKey);
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

// Helper to fetch trending movies
async function fetchTrendingMovies() {
    const url = `${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}`;
    const res = await fetch(url);
    return res.json();
}

// Helper to fetch genres
async function fetchGenres() {
    const url = `${TMDB_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}`;
    const res = await fetch(url);
    return res.json();
}

// Helper to fetch languages
async function fetchLanguages() {
    const url = `${TMDB_BASE_URL}/configuration/languages?api_key=${TMDB_API_KEY}`;
    const res = await fetch(url);
    return res.json();
}

// Helper to fetch movies by genre
async function fetchMoviesByGenre(genreId) {
    const url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreId}&sort_by=popularity.desc`;
    const res = await fetch(url);
    return res.json();
}

// Helper to search movies
async function fetchMoviesBySearch(query) {
    const url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    return res.json();
}

// Helper to fetch movie details (with videos)
async function fetchMovieDetails(movieId) {
    const url = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=credits,videos`;
    const res = await fetch(url);
    return res.json();
}

// Helper to fetch movies with filters
async function fetchMoviesWithFilters({ year, rating, language }) {
    let url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&sort_by=popularity.desc`;
    if (year) url += `&primary_release_year=${year}`;
    if (rating) url += `&vote_average.gte=${rating}`;
    if (language) url += `&with_original_language=${language}`;
    const res = await fetch(url);
    return res.json();
}

// Render carousel posters
function renderCarousel(movies) {
    const carousel = document.getElementById('carousel-list');
    carousel.innerHTML = '';
    movies.filter(movie => movie.poster_path).forEach(movie => {
        const poster = document.createElement('div');
        poster.className = 'carousel-poster';
        poster.innerHTML = `
            <img src="${TMDB_IMAGE_BASE + movie.poster_path}" alt="${movie.title}">
            <div class="carousel-title">${movie.title}</div>
        `;
        poster.addEventListener('click', () => openMovieModal(movie.id));
        carousel.appendChild(poster);
    });
}

// Render movie cards
function showSkeletons(container, count = 6) {
    let skeletons = '';
    for (let i = 0; i < count; i++) {
        skeletons += `
        <div class="skeleton-card">
            <div class="skeleton-img"><div class="skeleton-shimmer"></div></div>
            <div class="skeleton-line long"><div class="skeleton-shimmer"></div></div>
            <div class="skeleton-line short"><div class="skeleton-shimmer"></div></div>
            <div class="skeleton-line medium"><div class="skeleton-shimmer"></div></div>
        </div>`;
    }
    container.innerHTML = skeletons;
}

function renderMovies(movies, container) {
    container.innerHTML = '';
    if (!movies || movies.length === 0) {
        container.innerHTML = '<p>No movies found.</p>';
        return;
    }
    movies.forEach(movie => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.setAttribute('data-movie-id', movie.id);
        const rating = movie.vote_average ? `<span class="movie-rating"><svg width="16" height="16" viewBox="0 0 24 24" fill="#ffb400" style="vertical-align:middle;"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg> ${movie.vote_average.toFixed(1)}</span>` : '';
        const overview = movie.overview ? `<div class="movie-overview">${movie.overview.length > 90 ? movie.overview.slice(0, 90) + '…' : movie.overview}</div>` : '';
        card.innerHTML = `
            <span class="card-type-tag">Movie</span>
            <img src="${movie.poster_path ? TMDB_IMAGE_BASE + movie.poster_path : 'https://via.placeholder.com/300x450?text=No+Image'}" alt="${movie.title}">
            <div class="movie-title-row">
                <div class="movie-title">${movie.title}</div>
                ${rating}
            </div>
            <div class="movie-year">${movie.release_date ? movie.release_date.slice(0, 4) : ''}</div>
            <div class="movie-genre">${movie.genre_names ? movie.genre_names.join(', ') : ''}</div>
            ${overview}
        `;
        card.addEventListener('click', () => openMovieModal(movie.id));
        container.appendChild(card);
    });
}

// Load and display trending movies (default or after clearing filters)
async function loadTrendingMovies(genreMap) {
    const container = document.getElementById('trending-list');
    showSkeletons(container);
    const data = await fetchTrendingMovies();
    let movies = data.results.slice(0, 10);
    // Map genre IDs to names
    movies = movies.map(m => ({
        ...m,
        genre_names: m.genre_ids.map(id => genreMap[id]).filter(Boolean)
    }));
    renderMovies(movies, container);
}

// Helper to fetch now playing movies (today's picks)
async function fetchNowPlayingMovies() {
    const url = `${TMDB_BASE_URL}/movie/now_playing?api_key=${TMDB_API_KEY}&region=IN`;
    const res = await fetch(url);
    return res.json();
}

// Load and display now playing movies for carousel (today's picks)
async function loadCarousel() {
    const data = await fetchNowPlayingMovies();
    let movies = data.results.filter(m => m.poster_path);
    // Carousel (right)
    renderCarousel(movies.slice(0, 18));
    // Top reviewed trailer (left)
    if (movies.length > 0) {
        // Sort movies by rating descending
        const sortedMovies = movies.slice().sort((a, b) => b.vote_average - a.vote_average);
        const trailerDiv = document.getElementById('top-reviewed-trailer');
        trailerDiv.innerHTML = '<div style="text-align:center;width:100%;">Loading trailer…</div>';
        // Helper to find the first movie with a trailer
        async function findMovieWithTrailer(index) {
            if (index >= sortedMovies.length) {
                trailerDiv.innerHTML = `<div style="color:#bbb;text-align:center;padding:2rem 0;">No trailer available for any top reviewed movie.</div>`;
                return;
            }
            const movie = sortedMovies[index];
            const url = `${TMDB_BASE_URL}/movie/${movie.id}/videos?api_key=${TMDB_API_KEY}`;
            const res = await fetch(url);
            const videos = await res.json();
            const trailer = videos.results && videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
            if (trailer) {
                trailerDiv.innerHTML = `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1" title="${movie.title} Trailer" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen style="border-radius:12px;"></iframe>`;
            } else {
                findMovieWithTrailer(index + 1);
            }
        }
        findMovieWithTrailer(0);
    }
}

// Load and display movies by genre
async function loadMoviesByGenre(genreId, genreMap) {
    const data = await fetchMoviesByGenre(genreId);
    let movies = data.results.slice(0, 10);
    movies = movies.map(m => ({
        ...m,
        genre_names: m.genre_ids.map(id => genreMap[id]).filter(Boolean)
    }));
    renderMovies(movies, document.getElementById('genre-list'));
}

// Search handler
async function handleSearch(query, genreMap) {
    const trendingTitle = document.querySelector('#trending h2');
    trendingTitle.textContent = `Search results for "${query}"`;
    document.getElementById('search-clear').style.display = 'block';
    const data = await fetchMoviesBySearch(query);
    let movies = data.results.slice(0, 10);
    movies = movies.map(m => ({
        ...m,
        genre_names: m.genre_ids.map(id => genreMap[id]).filter(Boolean)
    }));
    renderMovies(movies, document.getElementById('trending-list'));
}

// Setup genre filter buttons dynamically
async function setupGenreFilters(genreMap) {
    const genreFilters = document.querySelector('.genre-filters');
    genreFilters.innerHTML = '';
    // Show only a few popular genres
    const popularGenres = ['Action', 'Comedy', 'Drama', 'Horror', 'Science Fiction'];
    Object.entries(genreMap).forEach(([id, name]) => {
        if (popularGenres.includes(name)) {
            const btn = document.createElement('button');
            btn.textContent = name;
            btn.dataset.genre = id;
            genreFilters.appendChild(btn);
        }
    });
}

// Setup filter bar (year, language)
async function setupFilterBar() {
    // Year dropdown (from 1960 to current year, ascending)
    const yearSelect = document.getElementById('filter-year');
    const currentYear = new Date().getFullYear();
    for (let y = 1960; y <= currentYear; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        yearSelect.appendChild(opt);
    }
    // Language dropdown (A-Z)
    const langSelect = document.getElementById('filter-language');
    let langs = await fetchLanguages();
    langs = langs.filter(lang => lang.english_name && lang.iso_639_1);
    langs.sort((a, b) => a.english_name.localeCompare(b.english_name));
    langs.forEach(lang => {
        const opt = document.createElement('option');
        opt.value = lang.iso_639_1;
        opt.textContent = lang.english_name;
        langSelect.appendChild(opt);
    });
}

// Fetch top people (actors/actresses)
async function fetchTopPeople() {
    const url = `${TMDB_BASE_URL}/person/popular?api_key=${TMDB_API_KEY}`;
    const res = await fetch(url);
    return res.json();
}

// Render people bar
function renderPeopleBar(people) {
    const peopleBar = document.getElementById('people-list');
    peopleBar.innerHTML = '';
    people.filter(person => person.profile_path).forEach((person, idx) => {
        const card = document.createElement('div');
        card.className = 'person-card';
        card.innerHTML = `
            <div class="person-photo-frame">
                <img src="https://image.tmdb.org/t/p/w185${person.profile_path}" alt="${person.name}">
            </div>
            <div class="person-name">${person.name}</div>
            <div class="person-known">${person.known_for_department || ''}</div>
        `;
        peopleBar.appendChild(card);
    });
}

// Load and display top people
async function loadPeopleBar() {
    const data = await fetchTopPeople();
    let people = data.results.slice(0, 18);
    renderPeopleBar(people);
}

// Fetch popular anime (TV shows with Animation genre)
async function fetchPopularAnime() {
    // Animation genre id for TV in TMDb is 16
    const url = `${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_genres=16&sort_by=popularity.desc&language=en`;
    const res = await fetch(url);
    return res.json();
}

// Render anime bar
function renderAnimeBar(animeList) {
    const animeBar = document.getElementById('anime-list');
    animeBar.innerHTML = '';
    animeList.filter(anime => anime.poster_path).forEach(anime => {
        const card = document.createElement('div');
        card.className = 'anime-card';
        card.innerHTML = `
            <span class="card-type-tag">Cartoon</span>
            <img src="${TMDB_IMAGE_BASE + anime.poster_path}" alt="${anime.name}">
            <div class="anime-title">${anime.name}</div>
        `;
        card.addEventListener('click', () => openAnimeModal(anime.id));
        animeBar.appendChild(card);
    });
}

// Show anime details in modal (reuse movie modal for TV)
async function openAnimeModal(tvId) {
    const modal = document.getElementById('movie-modal');
    const modalBody = document.getElementById('modal-body');
    modal.classList.add('show');
    modalBody.innerHTML = '<div style="text-align:center;">Loading...</div>';
    const url = `${TMDB_BASE_URL}/tv/${tvId}?api_key=${TMDB_API_KEY}&append_to_response=credits`;
    const res = await fetch(url);
    const anime = await res.json();
    const genres = anime.genres ? anime.genres.map(g => g.name).join(', ') : '';
    const cast = anime.credits && anime.credits.cast ? anime.credits.cast.slice(0, 5).map(c => c.name).join(', ') : '';
    modalBody.innerHTML = `
        <div class="modal-poster">
            <img src="${anime.poster_path ? TMDB_IMAGE_BASE + anime.poster_path : 'https://via.placeholder.com/300x450?text=No+Image'}" alt="${anime.name}">
        </div>
        <div class="modal-details">
            <h3>${anime.name} (${anime.first_air_date ? anime.first_air_date.slice(0, 4) : ''})</h3>
            <div class="modal-info"><strong>Genres:</strong> ${genres}</div>
            <div class="modal-info"><strong>Rating:</strong> ${anime.vote_average || 'N/A'} / 10</div>
            <div class="modal-info"><strong>Episodes:</strong> ${anime.number_of_episodes || 'N/A'}</div>
            <div class="modal-info"><strong>Cast:</strong> ${cast}</div>
            <div class="modal-overview">${anime.overview || ''}</div>
        </div>
    `;
}

// Load and display popular anime
async function loadAnimeBar() {
    const data = await fetchPopularAnime();
    let animeList = data.results.slice(0, 18);
    renderAnimeBar(animeList);
}

// Fetch popular TV series
async function fetchPopularSeries() {
    const url = `${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}&language=en`;
    const res = await fetch(url);
    return res.json();
}

// Fetch series with filters
async function fetchSeriesWithFilters({ year, rating, language }) {
    let url = `${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&sort_by=popularity.desc`;
    if (year) url += `&first_air_date_year=${year}`;
    if (rating) url += `&vote_average.gte=${rating}`;
    if (language) url += `&with_original_language=${language}`;
    const res = await fetch(url);
    return res.json();
}

// Render series cards (same format as movies)
function renderSeries(series, genreMap) {
    const container = document.getElementById('series-list');
    container.innerHTML = '';
    if (!series || series.length === 0) {
        container.innerHTML = '<p>No series found.</p>';
        return;
    }
    series.forEach(show => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.setAttribute('data-series-id', show.id);
        const rating = show.vote_average ? `<span class="movie-rating"><svg width="16" height="16" viewBox="0 0 24 24" fill="#ffb400" style="vertical-align:middle;"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg> ${show.vote_average.toFixed(1)}</span>` : '';
        const overview = show.overview ? `<div class="movie-overview">${show.overview.length > 90 ? show.overview.slice(0, 90) + '…' : show.overview}</div>` : '';
        const genres = show.genre_ids && genreMap ? show.genre_ids.map(id => genreMap[id]).filter(Boolean) : [];
        card.innerHTML = `
            <span class="card-type-tag">Series</span>
            <img src="${show.poster_path ? TMDB_IMAGE_BASE + show.poster_path : 'https://via.placeholder.com/300x450?text=No+Image'}" alt="${show.name}">
            <div class="movie-title-row">
                <div class="movie-title">${show.name}</div>
                ${rating}
            </div>
            <div class="movie-year">${show.first_air_date ? show.first_air_date.slice(0, 4) : ''}</div>
            <div class="movie-genre">${genres.join(', ')}</div>
            ${overview}
        `;
        card.addEventListener('click', () => openAnimeModal(show.id));
        container.appendChild(card);
    });
}

// Populate series filter bar
async function setupSeriesFilterBar() {
    // Year dropdown (from 1960 to current year, ascending)
    const yearSelect = document.getElementById('series-filter-year');
    const currentYear = new Date().getFullYear();
    for (let y = 1960; y <= currentYear; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        yearSelect.appendChild(opt);
    }
    // Language dropdown (A-Z)
    const langSelect = document.getElementById('series-filter-language');
    let langs = await fetchLanguages();
    langs = langs.filter(lang => lang.english_name && lang.iso_639_1);
    langs.sort((a, b) => a.english_name.localeCompare(b.english_name));
    langs.forEach(lang => {
        const opt = document.createElement('option');
        opt.value = lang.iso_639_1;
        opt.textContent = lang.english_name;
        langSelect.appendChild(opt);
    });
}

// Load and display popular series
async function loadPopularSeries(genreMap, filters = {}) {
    const container = document.getElementById('series-list');
    showSkeletons(container);
    let series;
    if (filters.year || filters.rating || filters.language) {
        const data = await fetchSeriesWithFilters(filters);
        series = data.results.slice(0, 10);
    } else {
        const data = await fetchPopularSeries();
        series = data.results.slice(0, 10);
    }
    renderSeries(series, genreMap);
}

// Fetch Hindi movies with filters
async function fetchHindiMoviesWithFilters({ year, rating }) {
    let url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&sort_by=popularity.desc&with_original_language=hi`;
    if (year) url += `&primary_release_year=${year}`;
    if (rating) url += `&vote_average.gte=${rating}`;
    const res = await fetch(url);
    return res.json();
}

// Render Hindi movies
function renderHindiMovies(movies, genreMap) {
    const container = document.getElementById('hindi-list');
    container.innerHTML = '';
    if (!movies || movies.length === 0) {
        container.innerHTML = '<p>No movies found.</p>';
        return;
    }
    movies.forEach(movie => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.setAttribute('data-movie-id', movie.id);
        const rating = movie.vote_average ? `<span class="movie-rating"><svg width="16" height="16" viewBox="0 0 24 24" fill="#ffb400" style="vertical-align:middle;"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg> ${movie.vote_average.toFixed(1)}</span>` : '';
        const overview = movie.overview ? `<div class="movie-overview">${movie.overview.length > 90 ? movie.overview.slice(0, 90) + '…' : movie.overview}</div>` : '';
        const genres = movie.genre_ids && genreMap ? movie.genre_ids.map(id => genreMap[id]).filter(Boolean) : [];
        card.innerHTML = `
            <span class="card-type-tag">Movie</span>
            <img src="${movie.poster_path ? TMDB_IMAGE_BASE + movie.poster_path : 'https://via.placeholder.com/300x450?text=No+Image'}" alt="${movie.title}">
            <div class="movie-title-row">
                <div class="movie-title">${movie.title}</div>
                ${rating}
            </div>
            <div class="movie-year">${movie.release_date ? movie.release_date.slice(0, 4) : ''}</div>
            <div class="movie-genre">${genres.join(', ')}</div>
            ${overview}
        `;
        card.addEventListener('click', () => openMovieModal(movie.id));
        container.appendChild(card);
    });
}

// Load and display popular Hindi movies
async function loadPopularHindiMovies(genreMap, filters = {}) {
    const container = document.getElementById('hindi-list');
    showSkeletons(container);
    const data = await fetchHindiMoviesWithFilters(filters);
    let movies = data.results.slice(0, 10);
    movies = movies.map(m => ({
        ...m,
        genre_names: m.genre_ids && genreMap ? m.genre_ids.map(id => genreMap[id]).filter(Boolean) : []
    }));
    renderHindiMovies(movies, genreMap);
}

// Modal logic
function openMovieModal(movieId) {
    const modal = document.getElementById('movie-modal');
    const modalBody = document.getElementById('modal-body');
    modal.classList.add('show');
    modalBody.innerHTML = '<div style="text-align:center;">Loading...</div>';
    fetchMovieDetails(movieId).then(movie => {
        const genres = movie.genres ? movie.genres.map(g => g.name).join(', ') : '';
        const cast = movie.credits && movie.credits.cast ? movie.credits.cast.slice(0, 5).map(c => c.name).join(', ') : '';
        let videoEmbed = '';
        let showPoster = true;
        if (movie.videos && movie.videos.results && movie.videos.results.length > 0) {
            const trailer = movie.videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube') || movie.videos.results[0];
            if (trailer && trailer.site === 'YouTube') {
                videoEmbed = `<div class="modal-info" style="margin:1rem 0 0 0;"><iframe width="100%" height="315" src="https://www.youtube.com/embed/${trailer.key}" title="YouTube trailer" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
                showPoster = false;
            }
        }
        // Additional details
        const budget = movie.budget ? `${movie.budget.toLocaleString()}` : 'N/A';
        const revenue = movie.revenue ? `${movie.revenue.toLocaleString()}` : 'N/A';
        const companies = movie.production_companies && movie.production_companies.length > 0
            ? movie.production_companies.map(c => c.name).join(', ') : 'N/A';
        const homepage = movie.homepage ? `<a href="${movie.homepage}" target="_blank" rel="noopener">Official Site</a>` : '';
        const imdbLink = movie.imdb_id ? `https://www.imdb.com/title/${movie.imdb_id}` : '';
        modalBody.innerHTML = `
            <button class="close-modal" style="position:absolute;top:1.2rem;right:1.5rem;font-size:2.2rem;z-index:10;">&times;</button>
            ${showPoster ? `<div class="modal-poster">
                <img src="${movie.poster_path ? TMDB_IMAGE_BASE + movie.poster_path : 'https://via.placeholder.com/300x450?text=No+Image'}" alt="${movie.title}">
            </div>` : videoEmbed}
            <div class="modal-details">
                <h3>${movie.title} (${movie.release_date ? movie.release_date.slice(0, 4) : ''})</h3>
                <div class="modal-info"><strong>Genres:</strong> ${genres}</div>
                <div class="modal-info"><strong>Rating:</strong> ${movie.vote_average || 'N/A'} / 10</div>
                <div class="modal-info"><strong>Runtime:</strong> ${movie.runtime ? movie.runtime + ' min' : 'N/A'}</div>
                <div class="modal-info"><strong>Budget:</strong> ${budget}</div>
                <div class="modal-info"><strong>Revenue:</strong> ${revenue}</div>
                <div class="modal-info"><strong>Production:</strong> ${companies}</div>
                <div class="modal-info"><strong>Cast:</strong> ${cast}</div>
                <div class="modal-info">${homepage}</div>
                ${imdbLink ? `<div class="modal-info"><button id="copy-imdb" data-link="${imdbLink}" style="padding:0.4rem 1.2rem;border-radius:8px;background:#ffb400;color:#181818;font-weight:700;cursor:pointer;">Copy IMDb Link</button></div>` : ''}
                <div class="modal-overview">${movie.overview || ''}</div>
                ${!showPoster ? '' : videoEmbed}
            </div>
        `;
        // Add close button handler
        modalBody.querySelector('.close-modal').onclick = closeMovieModal;
        // Add copy IMDb handler
        const copyBtn = modalBody.querySelector('#copy-imdb');
        if (copyBtn) {
            copyBtn.onclick = function() {
                const link = copyBtn.getAttribute('data-link');
                navigator.clipboard.writeText(link);
                copyBtn.textContent = 'Copied!';
                setTimeout(() => { copyBtn.textContent = 'Copy IMDb Link'; }, 1200);
            };
        }
    });
}

function closeMovieModal() {
    document.getElementById('movie-modal').classList.remove('show');
}

window.addEventListener('DOMContentLoaded', async () => {
    // Fetch genres and build a map
    const genresData = await fetchGenres();
    const genreMap = {};
    genresData.genres.forEach(g => { genreMap[g.id] = g.name; });
    await setupGenreFilters(genreMap);
    await setupFilterBar();
    await loadCarousel();
    await loadTrendingMovies(genreMap);
    await loadPeopleBar();
    await loadAnimeBar();
    await setupSeriesFilterBar();
    await loadPopularSeries(genreMap);
    await loadPopularHindiMovies(genreMap);

    // Series filter bar logic
    document.getElementById('series-filter-apply').addEventListener('click', async () => {
        const year = document.getElementById('series-filter-year').value;
        const rating = document.getElementById('series-filter-rating').value;
        const language = document.getElementById('series-filter-language').value;
        await loadPopularSeries(genreMap, { year, rating, language });
    });
    document.getElementById('series-filter-clear').addEventListener('click', async () => {
        document.getElementById('series-filter-year').value = '';
        document.getElementById('series-filter-rating').value = '';
        document.getElementById('series-filter-language').value = '';
        await loadPopularSeries(genreMap);
    });

    // Hindi filter bar logic
    // Year dropdown (from 1960 to current year, ascending)
    const hindiYearSelect = document.getElementById('hindi-filter-year');
    const currentYear = new Date().getFullYear();
    for (let y = 1960; y <= currentYear; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        hindiYearSelect.appendChild(opt);
    }
    // Hindi filter apply
    document.getElementById('hindi-filter-apply').addEventListener('click', async () => {
        const year = document.getElementById('hindi-filter-year').value;
        const rating = document.getElementById('hindi-filter-rating').value;
        await loadPopularHindiMovies(genreMap, { year, rating });
    });
    document.getElementById('hindi-filter-clear').addEventListener('click', async () => {
        document.getElementById('hindi-filter-year').value = '';
        document.getElementById('hindi-filter-rating').value = '';
        await loadPopularHindiMovies(genreMap);
    });

    // Set Drama as default active and load Drama movies
    const dramaBtn = Array.from(document.querySelectorAll('.genre-filters button')).find(btn => btn.textContent.trim().toLowerCase() === 'drama');
    if (dramaBtn) {
        dramaBtn.classList.add('active');
        await loadMoviesByGenre(dramaBtn.dataset.genre, genreMap);
    }

    // Carousel arrow logic
    const carousel = document.getElementById('carousel-list');
    document.getElementById('carousel-left').addEventListener('click', () => {
        carousel.scrollBy({ left: -320, behavior: 'smooth' });
    });
    document.getElementById('carousel-right').addEventListener('click', () => {
        carousel.scrollBy({ left: 320, behavior: 'smooth' });
    });

    // Anime bar arrow logic
    const animeBar = document.getElementById('anime-list');
    document.getElementById('anime-left').addEventListener('click', () => {
        animeBar.scrollBy({ left: -320, behavior: 'smooth' });
    });
    document.getElementById('anime-right').addEventListener('click', () => {
        animeBar.scrollBy({ left: 320, behavior: 'smooth' });
    });

    // Genre filter buttons
    document.querySelectorAll('.genre-filters button').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            document.querySelectorAll('.genre-filters button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            await loadMoviesByGenre(btn.dataset.genre, genreMap);
        });
    });

    // Filter bar logic
    document.getElementById('filter-apply').addEventListener('click', async () => {
        const year = document.getElementById('filter-year').value;
        const rating = document.getElementById('filter-rating').value;
        const language = document.getElementById('filter-language').value;
        const data = await fetchMoviesWithFilters({ year, rating, language });
        let movies = data.results.slice(0, 10);
        movies = movies.map(m => ({
            ...m,
            genre_names: m.genre_ids && genreMap ? m.genre_ids.map(id => genreMap[id]).filter(Boolean) : []
        }));
        renderMovies(movies, document.getElementById('trending-list'));
    });
    document.getElementById('filter-clear').addEventListener('click', async () => {
        document.getElementById('filter-year').value = '';
        document.getElementById('filter-rating').value = '';
        document.getElementById('filter-language').value = '';
        document.querySelector('#trending h2').textContent = 'Trending Movies';
        document.getElementById('search-clear').style.display = 'none';
        await loadTrendingMovies(genreMap);
    });

    // Search clear (cross) button logic
    document.getElementById('search-clear').addEventListener('click', async () => {
        document.getElementById('search-input').value = '';
        document.querySelector('#trending h2').textContent = 'Trending Movies';
        document.getElementById('search-clear').style.display = 'none';
        await loadTrendingMovies(genreMap);
    });

    // Show/hide cross button as user types
    document.getElementById('search-input').addEventListener('input', (e) => {
        const val = e.target.value.trim();
        document.getElementById('search-clear').style.display = val ? 'block' : 'none';
    });

    // Search form
    document.getElementById('search-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const query = document.getElementById('search-input').value.trim();
        if (query) {
            await handleSearch(query, genreMap);
        }
    });

    // Modal close logic
    document.querySelector('.close-modal').addEventListener('click', closeMovieModal);
    document.getElementById('movie-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('movie-modal')) closeMovieModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMovieModal();
    });
});
