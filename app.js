/**
 * إعدادات المشروع
 */
const CONFIG = {
    RAWG_API_KEY: '4ea2968a10604ee0bacd122f1ad00cee', 
};

/**
 * نظام التخزين
 */
const StorageDB = {
    saveGame: function(gameData) {
        let games = this.getGames();
        if (!games.find(g => g.id === gameData.id)) {
            games.push(gameData);
            localStorage.setItem('myGames', JSON.stringify(games));
            return true;
        }
        return false;
    },
    getGames: function() {
        return JSON.parse(localStorage.getItem('myGames')) || [];
    },
    deleteGame: function(id) {
        let games = this.getGames();
        games = games.filter(g => g.id !== id);
        localStorage.setItem('myGames', JSON.stringify(games));
    }
};

// عناصر واجهة المستخدم
const searchModal = document.getElementById('searchModal');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const upcomingList = document.getElementById('upcomingList');

// تفعيل شريط التنقل السفلي
const navItems = document.querySelectorAll('.bottom-nav .nav-item');
const pages = document.querySelectorAll('.page');

navItems.forEach((item, index) => {
    item.addEventListener('click', () => {
        // إزالة التفعيل من جميع الأزرار وإخفاء الصفحات
        navItems.forEach(nav => nav.classList.remove('active'));
        pages.forEach(page => page.style.display = 'none');

        // تفعيل الزر المضغوط وإظهار الصفحة الخاصة به
        item.classList.add('active');
        if(pages[index]) pages[index].style.display = 'block';
    });
});

// فتح وإغلاق البحث
function openSearch() {
    searchModal.classList.add('active');
    searchInput.focus();
}

function closeSearch() {
    searchModal.classList.remove('active');
    searchInput.value = '';
    searchResults.innerHTML = '';
}

// ميزة البحث الفوري مع Debounce
let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    
    if (query.length < 2) {
        searchResults.innerHTML = '';
        return;
    }

    searchResults.innerHTML = '<div style="padding:20px; text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> جاري البحث...</div>';

    searchTimeout = setTimeout(() => {
        fetchGamesFromAPI(query);
    }, 500);
});

// جلب البيانات الأساسية من RAWG
async function fetchGamesFromAPI(query) {
    try {
        const response = await fetch(`https://api.rawg.io/api/games?search=${query}&key=${CONFIG.RAWG_API_KEY}&page_size=6`);
        const data = await response.json();
        renderSearchResults(data.results);
    } catch (error) {
        searchResults.innerHTML = '<div style="padding:20px; color:#e50914;">حدث خطأ في الاتصال بالخادم.</div>';
    }
}

// عرض نتائج البحث 
function renderSearchResults(games) {
    searchResults.innerHTML = '';
    if (!games || games.length === 0) {
        searchResults.innerHTML = '<div style="padding:20px; text-align:center;">لم يتم العثور على ألعاب.</div>';
        return;
    }

    games.forEach(game => {
        const item = document.createElement('div');
        item.className = 'search-item';
        
        const platforms = game.platforms ? game.platforms.map(p => p.platform.name).slice(0, 3).join(', ') : 'غير محدد';
        
        item.innerHTML = `
            <img src="${game.background_image || 'https://via.placeholder.com/60x80?text=No+Image'}" alt="${game.name}">
            <div class="search-item-info">
                <h4>${game.name}</h4>
                <p>إصدار: ${game.released ? game.released.split('-')[0] : 'غير معروف'}</p>
                <p>${platforms}</p>
            </div>
        `;
        
        item.onclick = () => fetchAndAddGameDetails(game.id);
        searchResults.appendChild(item);
    });
}

// جلب تفاصيل اللعبة بالكامل
async function fetchAndAddGameDetails(gameId) {
    searchResults.innerHTML = '<div style="padding:20px; text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> جاري استيراد بيانات اللعبة...</div>';
    
    try {
        const response = await fetch(`https://api.rawg.io/api/games/${gameId}?key=${CONFIG.RAWG_API_KEY}`);
        const fullGame = await response.json();

        const newGame = {
            id: fullGame.id,
            name: fullGame.name,
            image: fullGame.background_image,
            released: fullGame.released,
            platforms: fullGame.platforms ? fullGame.platforms.map(p => p.platform.name) : [],
            genres: fullGame.genres ? fullGame.genres.map(g => g.name) : [],
            developers: fullGame.developers ? fullGame.developers.map(d => d.name) : [],
            description: fullGame.description_raw,
            status: 'upcoming'
        };

        if (StorageDB.saveGame(newGame)) {
            closeSearch();
            renderUpcomingGames();
        } else {
            searchResults.innerHTML = '<div style="padding:20px; color:#10b981; text-align:center;">اللعبة موجودة مسبقاً في قائمتك.</div>';
            setTimeout(closeSearch, 1500);
        }

    } catch (error) {
        searchResults.innerHTML = '<div style="padding:20px; color:#e50914; text-align:center;">حدث خطأ أثناء جلب التفاصيل.</div>';
    }
}

// دالة حذف اللعبة
window.removeGame = function(id) {
    if (confirm('هل أنت متأكد من حذف هذه اللعبة من قائمتك؟')) {
        StorageDB.deleteGame(id);
        renderUpcomingGames(); // تحديث الشاشة بعد الحذف
    }
};

// تحويل التاريخ 
function getHijriDate(dateString) {
    if (!dateString) return 'غير محدد';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {day: 'numeric', month: 'long', year : 'numeric'}).format(date);
}

// حساب العداد التنازلي
function getCountdown(releaseDate) {
    if (!releaseDate) return null;
    const now = new Date().getTime();
    const release = new Date(releaseDate).getTime();
    const distance = release - now;

    if (distance < 0) return null;

    return {
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
    };
}

// عرض قائمة الألعاب القادمة
function renderUpcomingGames() {
    const games = StorageDB.getGames().filter(g => g.status === 'upcoming');
    
    games.sort((a, b) => new Date(a.released) - new Date(b.released));
    
    document.getElementById('upcomingCount').innerText = `${games.length} قادمة`;
    upcomingList.innerHTML = '';

    if (games.length === 0) {
        upcomingList.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 40px;">لا توجد ألعاب قادمة. اضغط على العدسة أو + لإضافة ألعاب جديدة!</div>';
        return;
    }

    games.forEach(game => {
        const card = document.createElement('div');
        card.className = 'game-card';
        
        const isOut = !getCountdown(game.released);
        
        card.innerHTML = `
            <img class="game-cover" src="${game.image || 'https://via.placeholder.com/400x200?text=No+Image'}" loading="lazy">
            <div class="game-details">
                <h3 class="game-title">${game.name}</h3>
                <p style="font-size: 0.8rem; color: #a0a0a5; margin-bottom: 5px;">
                    <i class="fa-regular fa-calendar"></i> ${game.released || 'غير معروف'} | 🌙 ${getHijriDate(game.released)}
                </p>
                
                ${!isOut ? `
                <div class="countdown" data-date="${game.released}">
                    <div class="time-box"><span class="days">0</span><label>أيام</label></div>
                    <div class="time-box"><span class="hours">0</span><label>ساعات</label></div>
                    <div class="time-box"><span class="minutes">0</span><label>دقائق</label></div>
                    <div class="time-box"><span class="seconds">0</span><label>ثواني</label></div>
                </div>
                ` : '<div style="margin:15px 0; color:#10b981; font-weight:bold; text-align:center; background: rgba(16, 185, 129, 0.1); padding: 10px; border-radius: 8px;">متوفرة الآن!</div>'}
                
                <p style="font-size: 0.8rem; color: var(--primary-light);">
                    ${game.platforms.slice(0, 4).join(' • ')}
                </p>
                
                <!-- أزرار التحكم باللعبة -->
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button class="icon-btn primary" style="flex: 1; border-radius: 8px; height: auto; padding: 10px;">
                        التفاصيل
                    </button>
                    <button class="icon-btn" style="background: rgba(229, 9, 20, 0.1); color: var(--danger); border: 1px solid var(--danger); border-radius: 8px; width: 45px; height: auto;" onclick="removeGame(${game.id})">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        upcomingList.appendChild(card);
    });
}

// تحديث العدادات التنازلية
setInterval(() => {
    document.querySelectorAll('.countdown').forEach(el => {
        const date = el.getAttribute('data-date');
        const time = getCountdown(date);
        if (time) {
            el.querySelector('.days').innerText = time.days;
            el.querySelector('.hours').innerText = time.hours;
            el.querySelector('.minutes').innerText = time.minutes;
            el.querySelector('.seconds').innerText = time.seconds;
        } else {
            el.outerHTML = '<div style="margin:15px 0; color:#10b981; font-weight:bold; text-align:center; background: rgba(16, 185, 129, 0.1); padding: 10px; border-radius: 8px;">متوفرة الآن!</div>';
        }
    });
}, 1000);

window.onload = () => {
    renderUpcomingGames();
};
