const firebaseConfig = {
    apiKey: "AIzaSyC-s9FU-wjenKoke_GFDfbqQ8voHZF1btY",
    authDomain: "haber-portali-pro.firebaseapp.com",
    projectId: "haber-portali-pro",
    storageBucket: "haber-portali-pro.firebasestorage.app",
    messagingSenderId: "956145944082",
    appId: "1:956145944082:web:f13c5003d5ffc1fe477acb"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

let currentUser = null;

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('userInfo').style.display = 'flex';
        document.getElementById('userPic').src = user.photoURL;
        document.getElementById('userName').innerText = user.displayName.split(' ')[0];
        loadFromCloud(); 
    } else {
        currentUser = null;
        document.getElementById('loginBtn').style.display = 'flex';
        document.getElementById('userInfo').style.display = 'none';
        readArticles = JSON.parse(localStorage.getItem('readArticlesList')) || [];
        archivedArticles = JSON.parse(localStorage.getItem('archivedArticlesList')) || [];
        loadCustomFeeds();
        handleSearch(true);
    }
});

function signInWithGoogle() { auth.signInWithPopup(provider).catch(err => { alert("Giriş başarısız: " + err.message); }); }
function signOut() { auth.signOut(); }

async function syncToCloud() {
    if (!currentUser) return;
    try {
        await db.collection('users').doc(currentUser.uid).set({
            readArticles: readArticles,
            archivedArticles: archivedArticles,
            customRSSFeeds: JSON.parse(localStorage.getItem('customRSSFeeds')) || [],
            appTheme: currentTheme,
            activeSources: activeSources 
        }, { merge: true });
    } catch (e) { console.error("Bulut eşitleme hatası:", e); }
}

async function loadFromCloud() {
    if (!currentUser) return;
    try {
        const doc = await db.collection('users').doc(currentUser.uid).get();
        if (doc.exists) {
            const data = doc.data();
            if (data.readArticles) { readArticles = data.readArticles; localStorage.setItem('readArticlesList', JSON.stringify(readArticles)); }
            if (data.archivedArticles) { archivedArticles = data.archivedArticles; localStorage.setItem('archivedArticlesList', JSON.stringify(archivedArticles)); }
            if (data.customRSSFeeds) { localStorage.setItem('customRSSFeeds', JSON.stringify(data.customRSSFeeds)); }
            if (data.appTheme) { changeTheme(data.appTheme); }
            if (data.activeSources) { 
                activeSources = data.activeSources; 
                localStorage.setItem('activeSourcesList', JSON.stringify(activeSources));
            }
            
            loadCustomFeeds(); 
            renderChips();
            handleSearch(true);
            
            document.getElementById('toastText').innerText = `☁️ Ayarların buluttan yüklendi!`;
            document.getElementById('toastNotification').classList.add('show'); 
            setTimeout(() => { document.getElementById('toastNotification').classList.remove('show'); }, 3000);
        }
    } catch (e) { console.error("Buluttan veri çekme hatası:", e); }
}

const PLACEHOLDER_IMG = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect width='400' height='200' fill='%231e293b'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='16' fill='%2394a3b8' text-anchor='middle' dy='.3em'%3EGörsel Yok%3C/text%3E%3C/svg%3E";

const FEEDS_TR = [
    { id: 'sozcu', name: 'Sözcü - Gündem', url: 'https://www.sozcu.com.tr/rss/tum-haberler.xml' },
    { id: 'cumhuriyet', name: 'Cumhuriyet - Gündem', url: 'https://www.cumhuriyet.com.tr/rss' },
    { id: 'sol', name: 'soL - Gündem', url: 'https://haber.sol.org.tr/rss' },
    { id: 'diken', name: 'Diken - Gündem', url: 'https://www.diken.com.tr/feed/' },
    { id: 't24', name: 'T24 - Gündem', url: 'https://t24.com.tr/rss' },
    { id: 'evrensel', name: 'Evrensel - Gündem', url: 'https://www.evrensel.net/rss/haber.xml' },
    { id: 'memurlar', name: 'Memurlar.net - Kamu', url: 'https://www.memurlar.net/rss/' },
    { id: 'trt', name: 'TRT Haber - Son Dakika', url: 'https://www.trthaber.com/rss_sondakika.xml' },
    { id: 'aa', name: 'AA - Gündem', url: 'https://www.aa.com.tr/tr/rss/default?cat=guncel' },
    { id: 'sabah', name: 'Sabah - Gündem', url: 'https://www.sabah.com.tr/rss/sondakika.xml' },
    { id: 'yenisafak', name: 'Yeni Şafak - Gündem', url: 'https://www.yenisafak.com/rss' },
    { id: 'haberturk', name: 'Habertürk - Gündem', url: 'https://www.haberturk.com/rss' },
    { id: 'sputnik', name: 'Sputnik TR - Dünya', url: 'https://sputniknews.com.tr/export/rss2/archive/index.xml' },
    { id: 'dw', name: 'DW Türkçe - Dünya', url: 'https://rss.dw.com/rdf/rss-tur-all' },
    { id: 'voa', name: 'VOA Türkçe - Dünya', url: 'https://www.voaturkce.com/api/z$yqpe-tqp' },
    { id: 'bbc_tr', name: 'BBC Türkçe - Dünya', url: 'https://feeds.bbci.co.uk/turkce/rss.xml' },
    { id: 'evrimagaci', name: 'Evrim Ağacı - Bilim', url: 'https://evrimagaci.org/rss.xml' },
    { id: 'kozmikanafor', name: 'Kozmik Anafor - Bilim', url: 'https://www.kozmikanafor.com/feed/' },
    { id: 'bilimvegelecek', name: 'Bilim ve Gelecek - Bilim', url: 'https://www.bilimvegelecek.com.tr/feed/' },
    { id: 'arkeofili', name: 'Arkeofili - Tarih', url: 'https://www.arkeofili.com/feed/' },
    { id: 'dusunbil', name: 'Düşünbil - Felsefe', url: 'https://dusunbil.com/feed/' },
    { id: 'teyit', name: 'Teyit - Doğrulama', url: 'https://teyit.org/feed' },
    { id: 'webtekno', name: 'Webtekno - Teknoloji', url: 'https://www.webtekno.com/rss.xml' },
    { id: 'shiftdelete', name: 'ShiftDelete - Teknoloji', url: 'https://shiftdelete.net/rss' },
    { id: 'bloomberght', name: 'Bloomberg HT - Ekonomi', url: 'https://www.bloomberght.com/rss' }
];

const FEEDS_EN = [
    { id: 'bbc_en', name: 'BBC News', url: 'http://feeds.bbci.co.uk/news/rss.xml' },
    { id: 'cnn', name: 'CNN', url: 'http://rss.cnn.com/rss/edition.rss' },
    { id: 'aljazeera', name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
    { id: 'guardian', name: 'The Guardian', url: 'https://www.theguardian.com/world/rss' },
    { id: 'trtworld', name: 'TRT World', url: 'https://www.trtworld.com/rss.xml' },
    { id: 'dailysabah', name: 'Daily Sabah', url: 'https://www.dailysabah.com/rss' }
];

let currentLang = 'TR'; let currentCategory = ''; let isArchiveView = false;
let RSS_FEEDS = []; let allArticles = []; let filteredArticles = []; 
let activeSources = []; 
let archivedArticles = JSON.parse(localStorage.getItem('archivedArticlesList')) || [];
let readArticles = JSON.parse(localStorage.getItem('readArticlesList')) || [];
let showReadArticles = false;
let displayedCount = 0; let isFetchingRefresh = false; const ITEMS_PER_PAGE = 20;

let currentTheme = localStorage.getItem('appTheme') || 'default';

window.onload = () => {
    loadCustomFeeds(); 
    document.getElementById('toggleIcon').innerText = 'Genişlet ▼'; 
    changeTheme(currentTheme); 
    
    const savedData = JSON.parse(localStorage.getItem('savedNewsArticles')) || [];
    if(savedData.length > 0) {
        allArticles = savedData.map(a => { a.date = new Date(a.timestamp); return a; });
        handleSearch(true);
        setTimeout(() => { checkNewArticlesInBackground(true); }, 1500);
    } else {
        fetchAllRSS(true); 
    }
};

document.addEventListener('click', (e) => {
    const wrapper = document.getElementById('controlsWrapper');
    if (!wrapper.classList.contains('collapsed')) {
        if (!wrapper.contains(e.target) && e.target.id !== 'loginBtn') {
            wrapper.classList.add('collapsed');
            document.getElementById('toggleIcon').innerText = 'Genişlet ▼';
        }
    }
});

function toggleControls(event) {
    if(event) event.stopPropagation();
    const wrapper = document.getElementById('controlsWrapper'); const icon = document.getElementById('toggleIcon');
    if (wrapper.classList.contains('collapsed')) { wrapper.classList.remove('collapsed'); icon.innerText = 'Kapat ▲'; } 
    else { wrapper.classList.add('collapsed'); icon.innerText = 'Genişlet ▼'; }
}

function changeTheme(themeName, btnElement) {
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');
    else { Array.from(document.querySelectorAll('.theme-btn')).find(b => b.getAttribute('onclick').includes(themeName))?.classList.add('active'); }
    
    document.body.setAttribute('data-theme', themeName);
    currentTheme = themeName;
    localStorage.setItem('appTheme', themeName);
    syncToCloud();
}

function toggleReadVisibility(show) {
    showReadArticles = show;
    document.getElementById('showReadMain').checked = show;
    document.getElementById('showReadPopup').checked = show;
    handleSearch();
}

function markAsRead(link, fromSwipe = false) {
    if (!readArticles.includes(link)) {
        readArticles.push(link);
        localStorage.setItem('readArticlesList', JSON.stringify(readArticles));
        syncToCloud(); 
        if (!fromSwipe && !showReadArticles) handleSearch(true);
        else if (!fromSwipe) handleSearch(true); 
    }
}

function archiveArticleByLink(link) {
    const art = allArticles.find(a => a.link === link) || archivedArticles.find(a => a.link === link);
    if(!art) return;
    if(!archivedArticles.find(a => a.link === link)) {
        archivedArticles.push(art);
        localStorage.setItem('archivedArticlesList', JSON.stringify(archivedArticles));
        syncToCloud(); 
    }
    document.getElementById('toastText').innerText = `💾 Haber Arşive Eklendi!`;
    document.getElementById('toastNotification').classList.add('show'); setTimeout(() => { document.getElementById('toastNotification').classList.remove('show'); }, 3000);
}

function setGridSize(size, btnElement) {
    document.querySelectorAll('.view-btn:not(.theme-btn)').forEach(b => b.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');
    
    const grid = document.getElementById('newsGrid');
    grid.className = 'news-grid grid-' + size;
    
    if (size === 'shorts') document.body.classList.add('shorts-mode');
    else document.body.classList.remove('shorts-mode');
}

function syncSearchInputs(val) {
    document.getElementById('searchInput').value = val;
    handleSearch();
}

function popupRefresh() {
    document.getElementById('popupFilterList').innerHTML = '<div style="color:var(--accent); width:100%; text-align:center; padding:20px; font-weight:bold;">🔄 Kaynaklar ağda taranıyor...</div>';
    checkNewArticlesInBackground(true).then(() => { renderChips(); });
}

function switchLangTab(lang) {
    if (currentLang === lang) return;
    currentLang = lang;
    document.getElementById('tabLangTR').classList.remove('active'); document.getElementById('tabLangEN').classList.remove('active');
    document.getElementById('tabLang' + lang).classList.add('active');
    
    localStorage.removeItem('activeSourcesList');
    loadCustomFeeds(); fetchAllRSS(true); 
}

function filterCategory(cat, btnElement) {
    isArchiveView = (cat === 'Arşiv');
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');
    currentCategory = cat; 
    document.getElementById('searchInput').value = isArchiveView ? "" : cat;
    document.getElementById('popupSearchInput').value = isArchiveView ? "" : cat;
    handleSearch();
}

function openSourceFilterModal(event) {
    if(event) event.stopPropagation();
    document.getElementById('sourceFilterModal').style.display = 'flex';
    document.getElementById('popupSearchInput').value = document.getElementById('searchInput').value;
    renderChips();
}

function closeSourceModal() {
    document.getElementById('sourceFilterModal').style.display = 'none';
    handleSearch(); 
}

function loadCustomFeeds() {
    RSS_FEEDS = currentLang === 'TR' ? [...FEEDS_TR] : [...FEEDS_EN];
    const savedFeeds = JSON.parse(localStorage.getItem('customRSSFeeds')) || [];
    const langFeeds = savedFeeds.filter(f => (f.lang || 'TR') === currentLang);
    RSS_FEEDS.push(...langFeeds);
    
    const savedActive = JSON.parse(localStorage.getItem('activeSourcesList'));
    if (savedActive && savedActive.length > 0) {
        activeSources = savedActive;
    } else {
        activeSources = RSS_FEEDS.map(f => f.name); 
    }
    renderChips();
}

function saveActiveSources() {
    localStorage.setItem('activeSourcesList', JSON.stringify(activeSources));
    syncToCloud();
}

function addCustomRSS() {
    const nameInput = document.getElementById('newRssName'); const urlInput = document.getElementById('newRssUrl');
    const name = nameInput.value.trim(); const url = urlInput.value.trim();
    if(!name || !url) return alert("Lütfen hem kaynak adı hem de RSS bağlantısı girin.");
    const newFeed = { id: 'custom_' + Date.now(), name: name, url: url, isCustom: true, lang: currentLang };
    const savedFeeds = JSON.parse(localStorage.getItem('customRSSFeeds')) || [];
    savedFeeds.push(newFeed); localStorage.setItem('customRSSFeeds', JSON.stringify(savedFeeds));
    
    activeSources.push(name);
    saveActiveSources();
    
    loadCustomFeeds(); nameInput.value = ''; urlInput.value = ''; document.getElementById('addRssForm').classList.remove('show');
    syncToCloud();
    fetchAllRSS(true); 
}

function deleteCustomRSS(id, event) {
    event.stopPropagation();
    if(!confirm("Bu özel RSS kaynağını silmek istediğinize emin misiniz?")) return;
    let savedFeeds = JSON.parse(localStorage.getItem('customRSSFeeds')) || [];
    savedFeeds = savedFeeds.filter(f => f.id !== id); localStorage.setItem('customRSSFeeds', JSON.stringify(savedFeeds));
    syncToCloud();
    loadCustomFeeds(); handleSearch();
}

function toggleSourceState(sourceName) {
    if(activeSources.includes(sourceName)) { activeSources = activeSources.filter(s => s !== sourceName); } 
    else { activeSources.push(sourceName); }
    saveActiveSources();
    renderChips(); 
    handleSearch();
}

function toggleAllSourcesState(event) {
    if(event) event.stopPropagation();
    if(activeSources.length === RSS_FEEDS.length) { activeSources = []; } 
    else { activeSources = RSS_FEEDS.map(f => f.name); }
    saveActiveSources();
    renderChips(); handleSearch();
}

function renderChips() {
    const listMain = document.getElementById('filterList');
    const listPopup = document.getElementById('popupFilterList');
    if(listMain) listMain.innerHTML = '';
    if(listPopup) listPopup.innerHTML = '';

    RSS_FEEDS.forEach(feed => {
        const isActive = activeSources.includes(feed.name);
        let deleteBtn = feed.isCustom ? `<span class="chip-delete" onclick="deleteCustomRSS('${feed.id}', event)" title="Kaynağı Sil">✕</span>` : '';
        
        const htmlStr = `<input type="checkbox" value="${feed.name}" ${isActive ? 'checked' : ''} onchange="toggleSourceState('${feed.name}')"> ${feed.name} ${deleteBtn}`;
        
        const labelMain = document.createElement('label'); 
        labelMain.className = `chip ${isActive ? 'active' : ''}`;
        labelMain.innerHTML = htmlStr;
        if(listMain) listMain.appendChild(labelMain);

        const labelPopup = document.createElement('label'); 
        labelPopup.className = `chip ${isActive ? 'active' : ''}`;
        labelPopup.innerHTML = htmlStr;
        if(listPopup) listPopup.appendChild(labelPopup);
    });
}

let isDragging = false;
let touchStartX = 0; let touchStartY = 0; 
let pullDistance = 0;
let swipingCard = null; let swipeCurrentX = 0; let isVerticalScroll = false;

const ptrEl = document.getElementById('pullToRefresh'); const ptrIcon = document.getElementById('ptrIcon'); const ptrText = document.getElementById('ptrText');

function handleDragStart(clientX, clientY, target) {
    if (window.scrollY <= 5) touchStartY = clientY; 
    const card = target.closest('.news-card');
    if(card) {
        swipingCard = card; touchStartX = clientX; touchStartY = clientY;
        swipeCurrentX = 0; isVerticalScroll = false; card.classList.add('swiping');
    }
}

function handleDragMove(clientX, clientY) {
    if (window.scrollY <= 5 && touchStartY > 0 && !swipingCard) {
        pullDistance = clientY - touchStartY;
        if (pullDistance > 0 && pullDistance < 150) {
            ptrEl.style.opacity = Math.min(pullDistance / 80, 1); ptrEl.style.transform = `translateX(-50%) translateY(${pullDistance * 0.5}px)`;
            if (pullDistance > 80) { ptrIcon.innerText = "🔄"; ptrText.innerText = "Yenilemek için bırakın"; } 
            else { ptrIcon.innerText = "⬇️"; ptrText.innerText = "Yenilemek için çekin"; }
        }
    }

    if (swipingCard) {
        const diffX = clientX - touchStartX;
        const diffY = clientY - touchStartY;
        if(!isVerticalScroll && Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 10) {
            isVerticalScroll = true; swipingCard.style.transform = `translateX(0px)`; swipingCard.classList.remove('swiping'); swipingCard = null; return;
        }
        if(isVerticalScroll) return;
        swipeCurrentX = diffX; swipingCard.style.transform = `translateX(${swipeCurrentX}px)`;
    }
}

function handleDragEnd() {
    if (pullDistance > 80 && !isFetchingRefresh && !swipingCard) { ptrIcon.innerText = "⏳"; ptrText.innerText = "Ağ taranıyor..."; checkNewArticlesInBackground(true); } 
    else { resetPullToRefresh(); }

    if (swipingCard) {
        const wrapper = swipingCard.closest('.swipe-wrapper');
        const link = wrapper.dataset.link;
        swipingCard.classList.remove('swiping');

        if(swipeCurrentX > 100) {
            swipingCard.style.transform = `translateX(100%)`;
            setTimeout(() => { archiveArticleByLink(link); wrapper.style.display = 'none'; }, 300);
        } else if(swipeCurrentX < -100) {
            swipingCard.style.transform = `translateX(-100%)`;
            setTimeout(() => { markAsRead(link, true); wrapper.style.display = 'none'; }, 300);
        } else {
            swipingCard.style.transform = `translateX(0px)`;
        }
        swipingCard = null;
    }
}

document.addEventListener('touchstart', e => handleDragStart(e.touches[0].clientX, e.touches[0].clientY, e.target), {passive: true});
document.addEventListener('touchmove', e => handleDragMove(e.touches[0].clientX, e.touches[0].clientY), {passive: true});
document.addEventListener('touchend', e => handleDragEnd());

document.addEventListener('mousedown', e => { 
    const card = e.target.closest('.news-card');
    if(card) { isDragging = true; handleDragStart(e.clientX, e.clientY, e.target); }
});
document.addEventListener('mousemove', e => { if (!isDragging) return; handleDragMove(e.clientX, e.clientY); });
document.addEventListener('mouseup', e => { if (!isDragging) return; isDragging = false; handleDragEnd(); });

function resetPullToRefresh() { ptrEl.style.transform = `translateX(-50%) translateY(0)`; ptrEl.style.opacity = 0; touchStartY = 0; pullDistance = 0; setTimeout(() => { ptrIcon.innerText = "⬇️"; ptrText.innerText = "Yenilemek için çekin"; }, 300); }

window.addEventListener('scroll', () => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 400) {
        if (displayedCount < filteredArticles.length) {
            const spinner = document.getElementById('scrollSpinner'); spinner.style.display = 'block';
            setTimeout(() => { renderNextBatch(); spinner.style.display = 'none'; }, 100);
        } else if (filteredArticles.length > 0 && !isFetchingRefresh) {
            isFetchingRefresh = true; document.getElementById('endRefreshSpinner').style.display = 'block';
            checkNewArticlesInBackground(false); 
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const newsGrid = document.getElementById('newsGrid');
    newsGrid.addEventListener('scroll', () => {
        if(document.body.classList.contains('shorts-mode')) {
            if ((newsGrid.scrollTop + newsGrid.clientHeight) >= newsGrid.scrollHeight - 600) {
                if (displayedCount < filteredArticles.length) { renderNextBatch(); }
                else if (filteredArticles.length > 0 && !isFetchingRefresh) { checkNewArticlesInBackground(false); }
            }
        }
    });
});

function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); document.getElementById('toastNotification').classList.remove('show'); }
function trToLowerCase(text) { if (!text) return ""; return String(text).replace(/I/g, 'ı').replace(/İ/g, 'i').replace(/Ğ/g, 'ğ').replace(/Ü/g, 'ü').replace(/Ş/g, 'ş').replace(/Ö/g, 'ö').replace(/Ç/g, 'ç').toLowerCase(); }
function getDomain(urlStr) { try { return new URL(urlStr).hostname.replace('www.', ''); } catch(e) { return ''; } }

const fetchWithTimeout = (url, timeout = 7000) => { return Promise.race([fetch(url), new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))]); };

async function findRssFromUrl() {
    const urlInput = document.getElementById('searchRssUrl').value.trim();
    if (!urlInput) return alert("Lütfen bir site adresi veya takip etmek istediğiniz konuyu yazın.");
    const resultsDiv = document.getElementById('rssSearchResults');
    resultsDiv.innerHTML = '<span style="color:var(--accent); font-size:0.9rem;">⏳ İşleniyor, lütfen bekleyin...</span>';
    
    const isUrl = urlInput.includes('.') && !urlInput.includes(' ');
    if (!isUrl) {
        const googleRssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(urlInput)}&hl=tr&gl=TR&ceid=TR:tr`;
        resultsDiv.innerHTML = '<span style="color:#10b981; font-size:0.9rem; font-weight:bold;">✅ Konu akışı hazır. Eklemek için tıklayın:</span>';
        const btn = document.createElement('button');
        btn.style.background = 'var(--surface-light)'; btn.style.textAlign = 'left'; btn.style.fontSize = '0.85rem'; btn.style.color = 'white'; btn.style.padding = '8px 12px'; btn.style.marginTop = '8px'; btn.style.borderRadius = '5px'; btn.style.width = '100%';
        btn.innerHTML = `➕ '${urlInput}' Konu Takibi`;
        btn.onclick = () => { document.getElementById('newRssName').value = urlInput; document.getElementById('newRssUrl').value = googleRssUrl; addCustomRSS(); resultsDiv.innerHTML = ''; };
        resultsDiv.appendChild(btn); return;
    }
    
    let targetUrl = urlInput.startsWith('http') ? urlInput : 'https://' + urlInput;
    try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
        const res = await fetch(proxyUrl); const data = await res.json();
        if (data.contents) {
            const parser = new DOMParser(); const doc = parser.parseFromString(data.contents, 'text/html');
            const rssLinks = doc.querySelectorAll('link[type="application/rss+xml"], link[type="application/atom+xml"]');
            if (rssLinks.length > 0) {
                resultsDiv.innerHTML = '<span style="color:#10b981; font-size:0.9rem; font-weight:bold;">✅ Kaynaklar bulundu. Eklemek için tıklayın:</span>';
                rssLinks.forEach((link) => {
                    let href = link.getAttribute('href'); let title = link.getAttribute('title') || 'Ana RSS Akışı';
                    if(href.startsWith('/')) { href = new URL(targetUrl).origin + href; } 
                    else if (!href.startsWith('http')) { href = targetUrl.replace(/\/$/, '') + '/' + href; }
                    const btn = document.createElement('button');
                    btn.style.background = 'var(--surface-light)'; btn.style.textAlign = 'left'; btn.style.fontSize = '0.85rem'; btn.style.color = 'white'; btn.style.padding = '8px 12px'; btn.style.marginTop = '8px'; btn.style.borderRadius = '5px'; btn.style.width = '100%';
                    btn.innerHTML = `➕ ${title}`;
                    btn.onclick = () => { document.getElementById('newRssName').value = title; document.getElementById('newRssUrl').value = href; addCustomRSS(); resultsDiv.innerHTML = ''; };
                    resultsDiv.appendChild(btn);
                });
            } else { resultsDiv.innerHTML = '<span style="color:var(--warning); font-size:0.9rem;">⚠️ Bu sitede otomatik RSS sinyali bulunamadı.</span>'; }
        }
    } catch (err) { resultsDiv.innerHTML = '<span style="color:var(--danger); font-size:0.9rem;">❌ Site taranırken güvenlik hatası oluştu.</span>'; }
}

async function fetchFeedData(feed) {
    let articles = []; const domain = getDomain(feed.url);
    const fallbackGoogleRss = `https://news.google.com/rss/search?q=site:${domain}&hl=tr&gl=TR&ceid=TR:tr`;
    const cb = `_cb=${Date.now()}`;
    const urlWithCb = feed.url.includes('?') ? `${feed.url}&${cb}` : `${feed.url}?${cb}`;

    const proxies = [ 
        `https://api.allorigins.win/get?url=${encodeURIComponent(urlWithCb)}`, 
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(urlWithCb)}`, 
        `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(urlWithCb)}` 
    ];
    
    for (let proxy of proxies) {
        try {
            const res = await fetchWithTimeout(proxy, 6000); if (!res.ok) continue;
            if (proxy.includes('rss2json') || proxy.includes('allorigins')) {
                const data = await res.json();
                if (data.status === 'ok' && data.items) {
                    return data.items.map(item => {
                        let img = "";
                        if (item.enclosure && item.enclosure.link) img = item.enclosure.link;
                        else if (item.thumbnail) img = item.thumbnail;
                        else { 
                            const descMatch = (item.description || "").match(/<img[^>]+src=["']([^"']+)["']/i); 
                            const contentMatch = (item.content || "").match(/<img[^>]+src=["']([^"']+)["']/i);
                            if (contentMatch) img = contentMatch[1]; else if (descMatch) img = descMatch[1]; 
                        }
                        if (img && img.startsWith('http:')) img = img.replace('http:', 'https:');
                        if (!img) img = PLACEHOLDER_IMG;
                        
                        let pubDate = new Date((item.pubDate||"").replace(/-/g, '/')); if (isNaN(pubDate.getTime())) pubDate = new Date();
                        if (pubDate.getTime() > Date.now() + 3600000) { pubDate = new Date(); }
                        
                        let cats = item.categories || [];
                        return { title: item.title, description: (item.description||"").replace(/<[^>]*>?/gm, '').trim().substring(0, 180) + '...', link: item.link, image: img, source: feed.name, date: pubDate, timestamp: pubDate.getTime(), categories: cats };
                    });
                }
                if (data.contents && data.contents.includes('<rss')) { articles = parseXMLToArticles(data.contents, feed); if (articles.length > 0) return articles; }
            } else {
                const text = await res.text();
                if (text.includes("<rss") || text.includes("<feed")) { articles = parseXMLToArticles(text, feed); if (articles.length > 0) return articles; }
            }
        } catch(e) { } 
    }
    return [];
}

function parseXMLToArticles(textData, feed) {
    const parser = new DOMParser(); 
    const xmlDoc = parser.parseFromString(textData, "text/xml"); 
    const items = xmlDoc.querySelectorAll("item, entry"); 
    let result = [];
    let baseUrl = ""; try { baseUrl = new URL(feed.url).origin; } catch(e){}
    
    items.forEach(item => {
        const title = item.querySelector("title")?.textContent || "Başlıksız";
        let link = "#"; const linkNode = item.querySelector("link"); 
        if (linkNode) { link = linkNode.textContent.trim(); if(!link) link = linkNode.getAttribute("href") || "#"; }
        
        let desc = item.querySelector("description, summary")?.textContent || "";
        
        let contentEnc = item.getElementsByTagName("content:encoded");
        if (contentEnc.length === 0) contentEnc = item.getElementsByTagNameNS("*", "encoded");
        let fullText = desc + " " + (contentEnc.length > 0 ? contentEnc[0].textContent : "");
        
        let pubDate = new Date(); const pubNodes = item.getElementsByTagName('pubDate'); if(pubNodes.length > 0) { const parsed = new Date(pubNodes[0].textContent); if(!isNaN(pubDate.getTime())) pubDate = parsed; }
        if (pubDate.getTime() > Date.now() + 3600000) { pubDate = new Date(); }
        
        let image = ""; 
        const enclosure = item.querySelector("enclosure"); 
        let mediaContent = item.getElementsByTagName("media:content");
        if(mediaContent.length === 0) mediaContent = item.getElementsByTagNameNS("*", "content");
        let mediaThumbnail = item.getElementsByTagName("media:thumbnail");
        if(mediaThumbnail.length === 0) mediaThumbnail = item.getElementsByTagNameNS("*", "thumbnail");
        const imageTag = item.querySelector("image url");
        
        if (enclosure && enclosure.getAttribute("url")) { image = enclosure.getAttribute("url"); } 
        else if (mediaContent.length > 0 && mediaContent[0].getAttribute("url")) { image = mediaContent[0].getAttribute("url"); } 
        else if (mediaThumbnail.length > 0 && mediaThumbnail[0].getAttribute("url")) { image = mediaThumbnail[0].getAttribute("url"); } 
        else if (imageTag) { image = imageTag.textContent; }
        else { const imgMatch = fullText.match(/<img[^>]+src=["']([^"']+)["']/i); if (imgMatch && imgMatch[1]) image = imgMatch[1]; }
        
        if (image && image.startsWith('/')) image = baseUrl + image; 
        if (image && image.startsWith('http:')) image = image.replace('http:', 'https:');
        if (!image) image = PLACEHOLDER_IMG;
        
        let categories = []; const catNodes = item.querySelectorAll("category"); catNodes.forEach(c => categories.push(c.textContent));
        desc = desc.replace(/<[^>]*>?/gm, '').trim().substring(0, 180) + '...';
        result.push({ title, description: desc, link, image, source: feed.name, date: pubDate, timestamp: pubDate.getTime(), categories });
    });
    return result;
}

function saveToLocalMemory() {
    const toSave = allArticles.slice(0, 300); 
    localStorage.setItem('savedNewsArticles', JSON.stringify(toSave));
}

async function fetchAllRSS(isInitialLoad = false) {
    const grid = document.getElementById('newsGrid'); const btn = document.getElementById('fetchBtn'); btn.disabled = true; btn.innerText = 'GÜNCELLENİYOR...';
    if(!isInitialLoad) {
        grid.innerHTML = `<div class="status-msg"><span id="loadingText" style="color:white; font-weight:600;">Ağdan taze haberler çekiliyor...</span><div class="loading-bar"><div class="loading-fill" id="loadingFill"></div></div></div>`;
    }
    
    allArticles = []; let completedCount = 0;
    const fetchPromises = RSS_FEEDS.map(async (feed) => {
        try {
            const feedArticles = await fetchFeedData(feed);
            if (feedArticles.length > 0) allArticles.push(...feedArticles);
        } catch (error) {} finally {
            completedCount++; const fillObj = document.getElementById('loadingFill'); const textObj = document.getElementById('loadingText');
            if(fillObj) fillObj.style.width = `${(completedCount / RSS_FEEDS.length) * 100}%`;
            if(textObj) textObj.innerText = `${feed.name} Taranıyor (${completedCount} / ${RSS_FEEDS.length})`;
        }
    });
    
    await Promise.all(fetchPromises);
    allArticles.sort((a, b) => b.timestamp - a.timestamp);
    saveToLocalMemory(); 
    btn.disabled = false; btn.innerText = 'AĞDAN YENİ HABERLERİ ÇEK';
    handleSearch(); 
}

async function checkNewArticlesInBackground(isTopRefresh = false) {
    isFetchingRefresh = true; const endSpinner = document.getElementById('endRefreshSpinner'); let newCount = 0;
    const fetchPromises = RSS_FEEDS.map(async (feed) => {
        try {
            const feedArticles = await fetchFeedData(feed);
            feedArticles.forEach(newArt => { const exists = allArticles.find(a => a.link === newArt.link); if(!exists) { allArticles.push(newArt); newCount++; } });
        } catch(e) {}
    });
    await Promise.all(fetchPromises);
    if (newCount > 0) {
        allArticles.sort((a, b) => b.timestamp - a.timestamp); 
        saveToLocalMemory();
        handleSearch(true); 
        document.getElementById('toastText').innerText = `${newCount} yeni haber eklendi! Basa dönün.`;
        document.getElementById('toastNotification').classList.add('show'); setTimeout(() => { document.getElementById('toastNotification').classList.remove('show'); }, 6000);
    } else if (isTopRefresh) {
        document.getElementById('toastText').innerText = `Şu an yeni haber yok. En günceldesiniz.`;
        document.getElementById('toastNotification').classList.add('show'); setTimeout(() => { document.getElementById('toastNotification').classList.remove('show'); }, 3000);
    }
    if (isTopRefresh) { resetPullToRefresh(); } else { endSpinner.innerText = "Tüm geçmiş gösterildi. Yeni haberler bekleniyor..."; setTimeout(() => { endSpinner.style.display = 'none'; }, 4000); }
    isFetchingRefresh = false;
}

function handleSearch(isSilentRefresh = false) {
    const searchText = trToLowerCase(document.getElementById('searchInput').value.trim()); const searchTerms = searchText.split(' ').filter(t => t.length > 0);
    document.getElementById('popupSearchInput').value = document.getElementById('searchInput').value; 

    let sourceArray = isArchiveView ? archivedArticles : allArticles;

    filteredArticles = sourceArray.filter(art => {
        if (!isArchiveView && !showReadArticles && readArticles.includes(art.link)) return false;

        const sourceMatch = isArchiveView ? true : activeSources.includes(art.source); 
        if(!sourceMatch) return false;

        const titleLower = trToLowerCase(art.title); 
        const descLower = trToLowerCase(art.description);
        const catLower = art.categories ? trToLowerCase(art.categories.join(' ')) : "";
        const sourceLower = trToLowerCase(art.source);
        
        const searchSpace = titleLower + " " + descLower + " " + catLower + " " + sourceLower;
        const textMatch = searchTerms.length === 0 || searchTerms.every(term => searchSpace.includes(term)); 
        return textMatch;
    });
    
    if (!isSilentRefresh) { document.getElementById('newsGrid').innerHTML = ''; displayedCount = 0; } 
    else { document.getElementById('newsGrid').innerHTML = ''; displayedCount = 0; }
    if (filteredArticles.length === 0) { document.getElementById('newsGrid').innerHTML = `<div class="status-msg"><div style="font-size:3rem; margin-bottom:15px;">🔍</div>Bu kriterlere uyan haber bulunamadı.</div>`; return; }
    renderNextBatch();
}

function renderNextBatch() {
    const grid = document.getElementById('newsGrid');
    const nextBatch = filteredArticles.slice(displayedCount, displayedCount + ITEMS_PER_PAGE);
    nextBatch.forEach(art => {
        const wrapper = document.createElement('div');
        wrapper.className = 'swipe-wrapper';
        wrapper.dataset.link = art.link;
        
        const isRead = readArticles.includes(art.link);
        const isArchived = !!archivedArticles.find(a=> a.link === art.link);
        
        const dateObj = new Date(art.date); const today = new Date();
        let dateStr = (dateObj.getDate() === today.getDate() && dateObj.getMonth() === today.getMonth()) ? "Bugün, " + dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }) + " " + dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        
        wrapper.innerHTML = `
            <div class="swipe-bg swipe-bg-left">💾 ${isArchived ? 'Arşivlendi' : 'Arşivle'}</div>
            <div class="swipe-bg swipe-bg-right">👁️ Gizle</div>
            <div class="news-card ${isRead && !isArchiveView ? 'read-article' : ''}">
                <a href="${art.link}" target="_blank" class="external-link-btn" onclick="event.stopPropagation(); markAsRead('${art.link}');" title="Orijinal Sitede Aç">↗️</a>
                <div class="card-img-wrapper img-skeleton"><div class="source-badge" onclick="openSourceFilterModal(event)">${art.source}</div><img src="${art.image}" onload="this.style.opacity=1; this.parentElement.classList.remove('img-skeleton');" onerror="this.src='${PLACEHOLDER_IMG}'; this.style.opacity=1; this.parentElement.classList.remove('img-skeleton');"></div>
                <div class="news-content"><h3>${art.title}</h3><div class="meta"><span>🕒 ${dateStr}</span><span class="read-more">Haberi Oku →</span></div></div>
            </div>
        `;

        const card = wrapper.querySelector('.news-card');
        let clickTimer = null;
        card.onclick = (e) => {
            if(e.target.tagName === 'A' || e.target.closest('.source-badge')) return;
            if(e.detail === 1) {
                clickTimer = setTimeout(() => { markAsRead(art.link); openModal(art); }, 250);
            } else if(e.detail === 2) {
                clearTimeout(clickTimer); markAsRead(art.link); window.open(art.link, '_blank');
            }
        };

        grid.appendChild(wrapper);
    });
    displayedCount += nextBatch.length;
}

function switchTab(tab) {
    document.getElementById('tabReader').classList.remove('active'); document.getElementById('tabWeb').classList.remove('active');
    if(tab === 'reader') { document.getElementById('tabReader').classList.add('active'); document.getElementById('readerView').style.display = 'block'; document.getElementById('iframeView').style.display = 'none'; } 
    else { document.getElementById('tabWeb').classList.add('active'); document.getElementById('readerView').style.display = 'none'; document.getElementById('iframeView').style.display = 'flex'; }
}

async function openModal(art) {
    // Eski özeti gizle ve butonu geri getir
    document.getElementById('aiSummaryBox').style.display = 'none';
    document.getElementById('aiSummaryBtn').style.display = 'flex';
    document.getElementById('aiSummaryBtn').innerHTML = `✨ <span style="font-weight: 800; letter-spacing: 1px;">Yapay Zeka ile Özetle</span>`;
    document.getElementById('aiSummaryBtn').style.opacity = "1";
    document.getElementById('aiSummaryBtn').style.pointerEvents = "auto";

    const modal = document.getElementById('newsModal');
    document.getElementById('modalSource').innerText = art.source; document.getElementById('modalLinkExt').href = art.link; document.getElementById('modalTitle').innerText = art.title; document.getElementById('modalDesc').innerText = art.description;
    const imgEl = document.getElementById('modalImg'); imgEl.src = art.image; imgEl.style.display = art.image.includes('svg+xml') ? 'none' : 'block';
    switchTab('reader'); modal.style.display = 'flex'; document.body.style.overflow = 'hidden'; 
    
    const textContainer = document.getElementById('fullTextContainer'); textContainer.innerHTML = `<div class="loading-pulse">Haber metni analiz ediliyor...</div>`;
    const iframe = document.getElementById('modalIframe'); const banner = document.getElementById('iframeBanner');
    iframe.removeAttribute('srcdoc'); iframe.src = 'about:blank'; banner.innerHTML = `<span style="animation: pulse 1.5s infinite;">⏳</span> Orijinal site bağlantısı kuruluyor...`;

    try {
        if(art.link.includes('news.google.com')) throw new Error("Google Redirect");
        const proxies = [ `https://api.allorigins.win/raw?url=${encodeURIComponent(art.link)}`, `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(art.link)}&_t=${Date.now()}` ];
        let html = null;
        for (let proxy of proxies) {
            try {
                const res = await fetchWithTimeout(proxy, 8000);
                if (res.ok) { const text = await res.text(); if (text && !text.includes('security service to protect itself') && !text.includes('Cloudflare')) { html = text; break; } }
            } catch(e) {}
        }
        if (!html) throw new Error("Sayfa kopyalanamadı");

        const parser = new DOMParser(); const doc = parser.parseFromString(html, 'text/html');
        const paragraphs = Array.from(doc.querySelectorAll('p, .content p, .news-text p, article p'));
        const validText = paragraphs.map(p => p.textContent.trim()).filter(t => t.length > 70 && !t.toLowerCase().includes("tüm hakları saklıdır") && !t.toLowerCase().includes("copyright"));
        const uniqueText = [...new Set(validText)];
        if (uniqueText.length > 0) textContainer.innerHTML = uniqueText.map(t => `<p>${t}</p>`).join('');
        else textContainer.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:20px;">Tam metin ayıklanamadı. Sağ üstten site görünümüne geçebilirsiniz.</div>`;

        html = html.replace(/<meta[^>]+http-equiv=['"]?refresh['"]?[^>]*>/gi, ''); html = html.replace(/window\.location\.replace/gi, 'console.log'); html = html.replace(/window\.location\.href\s*=/gi, 'console.log=');
        const urlObj = new URL(art.link); const baseUrl = urlObj.protocol + "//" + urlObj.host + "/";
        if (html.toLowerCase().includes('<head>')) { html = html.replace(/<head>/i, `<head><base href="${baseUrl}">`); } else { html = `<base href="${baseUrl}">` + html; }
        const scriptFix = `<script> window.onload = function() { const links = document.querySelectorAll('a'); links.forEach(l => l.setAttribute('target', '_blank')); }; <\/script>`;
        html = html.replace(/<\/body>/i, scriptFix + '</body>');
        
        iframe.srcdoc = html; iframe.onload = () => { banner.innerHTML = `✅ Orijinal site yüklendi.`; setTimeout(()=>{ banner.style.display='none'; }, 3000); };
    } catch (err) {
        textContainer.innerHTML = `<div style="background: rgba(245, 158, 11, 0.1); border-left: 4px solid var(--warning); padding: 15px; margin-top: 15px; border-radius: 0 var(--radius-md) var(--radius-md) 0;"><strong style="color:var(--warning);">⚠️ Tam Metin Koruması:</strong> <span style="color:var(--text-muted); font-size:0.95rem;">Bu site tam metnin çekilmesini engelliyor. Yukarıdan orijinal site görünümüne geçebilirsiniz.</span></div>`;
        banner.innerHTML = `<span style="color:var(--warning);">⚠️ Bu site içeride görüntülenmeye izin vermiyor.</span> <a href="${art.link}" target="_blank" style="background:var(--accent); color:white; padding:4px 12px; border-radius:4px; text-decoration:none; font-weight:bold; font-size:0.75rem;">↗️ Tarayıcıda Aç</a>`;
        iframe.removeAttribute('srcdoc');
    }
}

function closeModal() {
    document.getElementById('newsModal').style.display = 'none'; document.body.style.overflow = 'auto'; document.getElementById('fullTextContainer').innerHTML = ''; 
    const iframe = document.getElementById('modalIframe'); iframe.removeAttribute('srcdoc'); iframe.src = 'about:blank'; document.getElementById('iframeBanner').style.display = 'flex'; 
}

let tapCount = 0; let tapTimeout;
document.getElementById('modalBodyArea').addEventListener('click', (e) => {
    if(e.target.tagName === 'A' || e.target.tagName === 'BUTTON') return; 
    tapCount++; clearTimeout(tapTimeout);
    if(tapCount >= 3) { closeModal(); tapCount = 0; } 
    else { tapTimeout = setTimeout(() => { tapCount = 0; }, 600); } 
});

window.onclick = (e) => { 
    if(e.target.className === 'modal') closeModal(); 
    if(e.target.id === 'sourceFilterModal') closeSourceModal(); 
};

// --- NLP (DOĞAL DİL İŞLEME) İLE İSTEMCİ TABANLI ÖZETLEME ALGORİTMASI ---
function generateAISummary() {
    const textContainer = document.getElementById('fullTextContainer');
    const rawText = textContainer.innerText.trim();
    const btn = document.getElementById('aiSummaryBtn');
    const summaryBox = document.getElementById('aiSummaryBox');

    // Eğer metin henüz yüklenmediyse veya çok kısaysa
    if (!rawText || rawText.includes("Haber metni analiz ediliyor") || rawText.length < 300) {
        alert("Özet çıkarabilmek için haber tam metninin yüklenmesi veya metnin yeterince uzun olması gerekiyor.");
        return;
    }

    // Butona yükleniyor efekti ver
    btn.innerHTML = `⏳ <span style="font-weight: 800; letter-spacing: 1px;">Analiz Ediliyor...</span>`;
    btn.style.opacity = "0.7";
    btn.style.pointerEvents = "none";

    // Arayüzü dondurmamak için işlemi küçük bir gecikmeyle yapıyoruz
    setTimeout(() => {
        // Cümleleri ayır
        const sentences = rawText.match(/[^.!?]+[.!?]+/g) || [rawText];
        
        // Türkçe dolgu (stop) kelimeleri
        const stopWords = ['ve', 'veya', 'ile', 'ama', 'fakat', 'için', 'bir', 'bu', 'şu', 'o', 'da', 'de', 'mı', 'mi', 'çok', 'en', 'gibi', 'kadar', 'daha', 'olan', 'olarak', 'sonra', 'önce', 'göre', 'kendi', 'diye', 'ise', 'her', 'tüm', 'bütün', 'bazı', 'gibi', 'hem', 'içinde', 'arasında', 'tarafından'];
        
        const wordFreq = {};
        
        // 1. Kelime Frekanslarını Hesapla
        sentences.forEach(sentence => {
            const words = sentence.toLowerCase().match(/[a-zçğıöşü]+/g) || [];
            words.forEach(word => {
                if (!stopWords.includes(word) && word.length > 3) {
                    wordFreq[word] = (wordFreq[word] || 0) + 1;
                }
            });
        });

        // 2. Cümleleri Puanla
        const scoredSentences = sentences.map((sentence, index) => {
            const words = sentence.toLowerCase().match(/[a-zçğıöşü]+/g) || [];
            let score = 0;
            words.forEach(word => {
                if (wordFreq[word]) score += wordFreq[word];
            });
            score = score / (words.length || 1); 
            if(index < 3) score *= 1.5; // Baştaki cümleler daha önemlidir
            
            return { sentence: sentence.trim(), score: score, index: index };
        });

        // 3. En yüksek puanlı cümleleri seç
        scoredSentences.sort((a, b) => b.score - a.score);
        const topSentences = scoredSentences.slice(0, 4).sort((a, b) => a.index - b.index);

        // 4. Görselleştirme ve Vurgulama
        let htmlList = '<h4>✨ Akıllı NLP Özeti</h4><ul>';
        
        topSentences.forEach(item => {
            let processedSentence = item.sentence;
            const words = processedSentence.split(' ');
            
            for (let i = 0; i < words.length; i++) {
                let cleanWord = words[i].toLowerCase().replace(/[^a-zçğıöşü]/g, '');
                if (cleanWord.length > 5 && wordFreq[cleanWord] > 2) {
                    words[i] = `<span class="ai-highlight">${words[i]}</span>`;
                } else if (cleanWord.length > 7 && Math.random() > 0.7) {
                    words[i] = `<span class="ai-highlight-2">${words[i]}</span>`;
                }
            }
            htmlList += `<li>${words.join(' ')}</li>`;
        });
        
        htmlList += '</ul>';

        // 5. Ekrana Bas
        summaryBox.innerHTML = htmlList;
        summaryBox.style.display = 'block';
        btn.style.display = 'none'; 
        
    }, 400); 
}

// Service Worker Kaydı (PWA için)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker başarıyla kaydedildi! Kapsam:', reg.scope))
      .catch(err => console.log('Service Worker kayıt hatası:', err));
  });
}
