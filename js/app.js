/* ======================================================
   V-Bucks Store — Telegram Mini App (макет)
   Чистый JS, без зависимостей.
   ====================================================== */
(function () {
'use strict';

/* ---------- Telegram WebApp (безопасно и вне телеграма) ---------- */
var tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;

function haptic(type) {
  if (!tg || !tg.HapticFeedback) return;
  try {
    if (type === 'select') tg.HapticFeedback.selectionChanged();
    else if (type === 'success' || type === 'error' || type === 'warning') tg.HapticFeedback.notificationOccurred(type);
    else tg.HapticFeedback.impactOccurred(type || 'light');
  } catch (e) {}
}

/* ---------- Данные (макет) ---------- */
var PACKS = [
  { id: 'p1000',  amount: 1000,  price: 649,  old: 790,  tag: null },
  { id: 'p2800',  amount: 2800,  price: 1690, old: 1990, tag: 'хит' },
  { id: 'p5000',  amount: 5000,  price: 2890, old: 3390, tag: null },
  { id: 'p13500', amount: 13500, price: 6990, old: 8290, tag: 'выгодно' }
];

// Код страны рисуем сами: флаги-эмодзи не отображаются в Windows/Telegram Desktop
var REGIONS = [
  { id: 'ru', code: 'RU', name: 'Россия' },
  { id: 'ua', code: 'UA', name: 'Украина' },
  { id: 'kz', code: 'KZ', name: 'Казахстан' },
  { id: 'by', code: 'BY', name: 'Беларусь' },
  { id: 'tr', code: 'TR', name: 'Турция' },
  { id: 'eu', code: 'EU', name: 'Европа' }
];

// w — вес выпадения (чем больше, тем чаще)
var PRIZES = [
  { id: 'd5',    type: 'discount', value: 5,    title: '−5%',  sub: 'скидка',  w: 26 },
  { id: 'v100',  type: 'vbucks',   value: 100,  title: '100',  sub: 'V-Bucks', w: 18 },
  { id: 'none',  type: 'none',     value: 0,    title: 'Мимо', sub: 'ещё раз', w: 24 },
  { id: 'd10',   type: 'discount', value: 10,   title: '−10%', sub: 'скидка',  w: 16 },
  { id: 'v500',  type: 'vbucks',   value: 500,  title: '500',  sub: 'V-Bucks', w: 9 },
  { id: 'd15',   type: 'discount', value: 15,   title: '−15%', sub: 'скидка',  w: 5 },
  { id: 'v1000', type: 'vbucks',   value: 1000, title: '1000', sub: 'V-Bucks', w: 1.6 },
  { id: 'd25',   type: 'discount', value: 25,   title: '−25%', sub: 'скидка',  w: 0.4 }
];

// Лента отзывов (макет). ago — «сколько минут назад», проставляется при запуске.
var REVIEWS = [
  { name: 'Sh4dowFN',   stars: 5, text: 'Пришло за 3 минуты, всё честно' },
  { name: 'kartoshka',  stars: 5, text: 'Взял 2800, код рабочий. Спасибо' },
  { name: 'NoScope_99', stars: 5, text: 'Сначала боялся, но всё ок. Буду брать ещё' },
  { name: 'PumpOrDie',  stars: 5, text: 'Выбил −10% в рулетке, приятная мелочь' },
  { name: 'zxc_meow',   stars: 4, text: 'Второй заказ, оба раза быстро' },
  { name: 'Ghostik',    stars: 5, text: 'Поддержка ответила ночью, помогли с регионом' },
  { name: 'lootgoblin', stars: 5, text: 'Дешевле, чем в других ботах' },
  { name: 'TiltedTwr',  stars: 5, text: '13 500 закинули минут за пять' },
  { name: 'cr1nge',     stars: 5, text: 'Не просили пароль — это подкупило' },
  { name: 'BuildFight', stars: 4, text: 'Всё дошло, но ждал чуть дольше обещанного' }
];

/* ---------- Состояние ---------- */
var state = {
  screen: 'home',
  stack: [],
  pack: null,
  region: null,
  nick: '',
  discount: null,      // {value, prizeId}
  prizes: loadPrizes()
};

/* ---------- Хелперы ---------- */
var $  = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

function money(n) { return n.toLocaleString('ru-RU') + ' ₽'; }
function num(n)   { return n.toLocaleString('ru-RU'); }
function esc(s)   { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function ico(id, cls) { return '<svg class="ico ' + (cls || '') + '"><use href="#' + id + '"></use></svg>'; }

function loadPrizes() {
  try { return JSON.parse(localStorage.getItem('vbs_prizes') || '[]'); }
  catch (e) { return []; }
}
function savePrizes() {
  try { localStorage.setItem('vbs_prizes', JSON.stringify(state.prizes)); } catch (e) {}
}

var toastTimer = null;
function toast(text) {
  var el = $('#toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.hidden = true; }, 2200);
}

/* ======================================================
   1. Экран загрузки
   ====================================================== */
var LOADER_STEPS = [
  'Подключаемся к магазину…',
  'Проверяем наличие карт…',
  'Готовим ваши бонусы…'
];

function runLoader(done) {
  var bar  = $('#loaderBar');
  var hint = $('#loaderHint');
  var p = 0, step = 0;

  var tick = setInterval(function () {
    p = Math.min(100, p + 6 + Math.random() * 10);
    bar.style.width = p + '%';

    var next = p > 70 ? 2 : (p > 35 ? 1 : 0);
    if (next !== step) { step = next; hint.textContent = LOADER_STEPS[step]; }

    if (p >= 100) {
      clearInterval(tick);
      setTimeout(function () {
        $('#loader').classList.add('loader--out');
        $('#app').hidden = false;
        done();
      }, 320);
    }
  }, 170);
}

/* ======================================================
   2. Навигация
   ====================================================== */
function go(name, opts) {
  opts = opts || {};
  if (name === state.screen) return;

  if (!opts.back && !opts.root) state.stack.push(state.screen);
  if (opts.root) state.stack = [];

  $$('.screen').forEach(function (s) { s.hidden = s.dataset.screen !== name; });
  state.screen = name;

  var scroll = $('.screen[data-screen="' + name + '"] .scroll');
  if (scroll) scroll.scrollTop = 0;

  if (tg && tg.BackButton) {
    try { state.stack.length ? tg.BackButton.show() : tg.BackButton.hide(); } catch (e) {}
  }
  if (name === 'prizes') renderPrizes();
  if (name === 'home')   updatePrizesBadge();
}

function back() {
  var prev = state.stack.pop() || 'home';
  go(prev, { back: true });
  haptic('light');
}

/* ======================================================
   3. Каталог
   ====================================================== */
function renderPacks() {
  $('#packs').innerHTML = PACKS.map(function (p) {
    return '' +
      '<button class="pack' + (p.tag ? ' pack--hot' : '') + '" data-pack="' + p.id + '">' +
        (p.tag ? '<span class="pack__badge">' + p.tag + '</span>' : '') +
        '<span class="pack__ic"><img src="assets/vbuck.svg" alt=""></span>' +
        '<span class="pack__body">' +
          '<span class="pack__amount">' + num(p.amount) + ' V-Bucks</span>' +
          '<span class="pack__meta">Подарочная карта · код в чат</span>' +
        '</span>' +
        '<span class="pack__price">' +
          '<span class="pack__now">' + money(p.price) + '</span>' +
          '<span class="pack__old">' + money(p.old) + '</span>' +
        '</span>' +
      '</button>';
  }).join('');

  $$('#packs .pack').forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.pack = PACKS.filter(function (p) { return p.id === btn.dataset.pack; })[0];
      haptic('light');
      openCheckout();
    });
  });
}

/* ======================================================
   4. Регион + ник + оформление
   ====================================================== */
function renderRegions() {
  $('#regions').innerHTML = REGIONS.map(function (r) {
    return '<button class="region" data-region="' + r.id + '">' +
             '<span class="region__code">' + r.code + '</span>' + r.name +
           '</button>';
  }).join('');

  $$('#regions .region').forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.region = REGIONS.filter(function (r) { return r.id === btn.dataset.region; })[0];
      $$('#regions .region').forEach(function (b) { b.classList.toggle('is-on', b === btn); });
      haptic('select');
      updateSummary();
    });
  });
}

function bestDiscount() {
  var best = null;
  state.prizes.forEach(function (p) {
    if (p.type === 'discount' && !p.used && (!best || p.value > best.value)) best = p;
  });
  return best;
}

function openCheckout() {
  var p = state.pack;

  $('#orderCard').innerHTML = '' +
    '<div class="order__ic"><img src="assets/vbuck.svg" alt=""></div>' +
    '<div class="order__t"><b>' + num(p.amount) + ' V-Bucks</b><small>Подарочная карта Epic Games</small></div>' +
    '<div class="order__p">' + money(p.price) + '</div>';

  // сбрасываем выбор при новом заказе
  state.region = null;
  state.nick = '';
  $('#nickInput').value = '';
  $$('#regions .region').forEach(function (b) { b.classList.remove('is-on'); });

  // автоматически подставляем лучшую выигранную скидку
  var d = bestDiscount();
  state.discount = d ? { value: d.value, prizeId: d.id } : null;

  updatePromoRow();
  updateSummary();
  go('checkout');
}

function updatePromoRow() {
  var row = $('#promoRow');
  if (!state.discount) { row.hidden = true; return; }
  row.hidden = false;
  $('#promoText').textContent = 'Приз из рулетки: скидка ' + state.discount.value + '%';
}

var NICK_RE = /^[A-Za-z0-9._-]{3,16}$/;

function nickValid() { return NICK_RE.test(state.nick); }

function updateSummary() {
  var p = state.pack;
  if (!p) return;

  var disc  = state.discount ? Math.round(p.price * state.discount.value / 100) : 0;
  var total = p.price - disc;

  $('#sumAmount').textContent = num(p.amount) + ' V-Bucks';
  $('#sumRegion').textContent = state.region ? state.region.name + ' · ' + state.region.code : 'не выбран';
  $('#sumDiscountRow').hidden = !disc;
  $('#sumDiscount').textContent = '−' + money(disc);
  $('#sumTotal').textContent = money(total);

  $('#payBtn').disabled = !(state.region && nickValid());
}

function bindNick() {
  var input = $('#nickInput');
  var wrap  = $('#nickWrap');
  var hint  = $('#nickHint');

  input.addEventListener('input', function () {
    state.nick = input.value.trim();
    var bad = state.nick.length > 0 && !nickValid();
    wrap.classList.toggle('input--err', bad);
    hint.classList.toggle('field__hint--err', bad);
    hint.textContent = bad
      ? 'Ник не подходит: 3–16 символов, латиница, цифры, _ . -'
      : '3–16 символов: латиница, цифры, _ и -';
    updateSummary();
  });
}

/* ======================================================
   5. Успех
   ====================================================== */
function pay() {
  var p = state.pack;
  var disc = state.discount ? Math.round(p.price * state.discount.value / 100) : 0;
  var order = 'FN-' + Math.floor(100000 + Math.random() * 899999);

  $('#successCard').innerHTML = '' +
    '<div class="summary__row"><span>Заказ</span><b>' + order + '</b></div>' +
    '<div class="summary__row"><span>Номинал</span><b>' + num(p.amount) + ' V-Bucks</b></div>' +
    '<div class="summary__row"><span>Регион</span><b>' + state.region.name + ' · ' + state.region.code + '</b></div>' +
    '<div class="summary__row"><span>Ник</span><b>' + esc(state.nick) + '</b></div>' +
    '<div class="summary__row summary__row--total"><span>Оплачено</span><b>' + money(p.price - disc) + '</b></div>';

  // скидка израсходована
  if (state.discount) {
    state.prizes.forEach(function (pr) { if (pr.id === state.discount.prizeId) pr.used = true; });
    savePrizes();
    state.discount = null;
  }

  haptic('success');
  state.stack = [];
  go('success', { root: true });

  if (tg && tg.BackButton) { try { tg.BackButton.hide(); } catch (e) {} }
}

/* ======================================================
   6. Рулетка
   ====================================================== */
var REPEATS  = 12;   // сколько раз повторяем ленту призов
var LAND_REP = 9;    // в каком повторе останавливаемся
var REST_REP = 3;    // куда «перематываем» после остановки

var reelEl, trackEl, slots = [], spinning = false, lastX = 0;

function prizeIcon(p) {
  if (p.type === 'discount') return 'i-percent';
  if (p.type === 'vbucks')   return 'i-vbuck';
  return 'i-empty';
}

function slotHTML(p) {
  var cls = 'slot';
  if (p.type === 'none') cls += ' slot--dud';
  else if (p.w <= 5) cls += ' slot--rare';
  return '<div class="' + cls + '">' +
           '<span class="slot__ic">' + ico(prizeIcon(p)) + '</span>' +
           '<span class="slot__t">' + p.title + '</span>' +
           '<span class="slot__s">' + p.sub + '</span>' +
         '</div>';
}

function buildReel() {
  reelEl  = $('#reel');
  trackEl = $('#reelTrack');

  var html = '';
  for (var r = 0; r < REPEATS; r++) {
    for (var i = 0; i < PRIZES.length; i++) html += slotHTML(PRIZES[i]);
  }
  trackEl.innerHTML = html;
  slots = $$('.slot', trackEl);

  requestAnimationFrame(function () { setX(offsetFor(REST_REP * PRIZES.length), false); });
}

// сдвиг, при котором центр слота i совпадает с указателем
function offsetFor(i) {
  var el = slots[i];
  if (!el || !reelEl) return 0;
  return -(el.offsetLeft + el.offsetWidth / 2 - reelEl.clientWidth / 2);
}

function setX(x, animate) {
  if (!trackEl) return; // лента ещё не построена (например, ресайз во время загрузки)
  trackEl.style.transition = animate ? 'transform 4.6s cubic-bezier(.12,.72,.14,1)' : 'none';
  trackEl.style.transform  = 'translate3d(' + x + 'px,0,0)';
  lastX = x;
}

function pickPrize() {
  var total = PRIZES.reduce(function (s, p) { return s + p.w; }, 0);
  var r = Math.random() * total;
  for (var i = 0; i < PRIZES.length; i++) {
    r -= PRIZES[i].w;
    if (r <= 0) return i;
  }
  return 0;
}

function spin() {
  if (spinning) return;
  spinning = true;

  var btn = $('#spinBtn');
  btn.disabled = true;
  btn.textContent = 'Крутим…';
  $$('.slot.is-win', trackEl).forEach(function (s) { s.classList.remove('is-win'); });
  haptic('medium');

  var n       = PRIZES.length;
  var winIdx  = pickPrize();
  var landIdx = LAND_REP * n + winIdx;
  var restIdx = REST_REP * n + winIdx;
  // лёгкий сдвиг внутри слота, чтобы остановка не была «идеальной»
  var jitter  = (Math.random() * 2 - 1) * (slots[0].offsetWidth * 0.26);

  setX(offsetFor(landIdx) + jitter, true);

  var finished = false;
  var onEnd = function (e) {
    // transitionend всплывает и от слотов (снятие .is-win), поэтому слушаем
    // только transform самой ленты — иначе прокрутка обрывается через 0.3 с
    if (e && (e.target !== trackEl || e.propertyName !== 'transform')) return;
    if (finished) return;
    finished = true;
    trackEl.removeEventListener('transitionend', onEnd);

    slots[landIdx].classList.add('is-win');
    slots[restIdx].classList.add('is-win');

    // перематываем на такой же слот ближе к началу — чтобы крутить можно было бесконечно
    setX(offsetFor(restIdx) + jitter, false);
    void trackEl.offsetWidth;

    awardPrize(PRIZES[winIdx]);

    btn.disabled = false;
    btn.textContent = 'Крутить ещё';
    spinning = false;
  };

  trackEl.addEventListener('transitionend', onEnd);
  setTimeout(onEnd, 5000); // страховка, если transitionend не придёт
}

function awardPrize(prize) {
  if (prize.type === 'none') {
    haptic('warning');
    showWin('i-empty', 'Почти!', 'В этот раз приза нет — попробуйте ещё раз.');
    return;
  }

  var item = {
    id: prize.id + '-' + Date.now(),
    type: prize.type,
    value: prize.value,
    title: prize.type === 'discount' ? 'Скидка ' + prize.value + '%' : num(prize.value) + ' V-Bucks',
    date: Date.now(),
    used: false
  };
  state.prizes.unshift(item);
  savePrizes();
  updatePrizesBadge();
  haptic('success');

  showWin(
    prizeIcon(prize),
    'Приз ваш!',
    prize.type === 'discount'
      ? 'Скидка ' + prize.value + '% подставится автоматически при следующем заказе.'
      : num(prize.value) + ' V-Bucks зачислим бонусом к следующей покупке.'
  );
}

function showWin(iconId, title, text) {
  $('#winIc').innerHTML = ico(iconId);
  $('#winTitle').textContent = title;
  $('#winText').textContent = text;
  $('#winModal').hidden = false;
}

/* ======================================================
   7. Призы
   ====================================================== */
function updatePrizesBadge() {
  var active = state.prizes.filter(function (p) { return !p.used; }).length;
  $('#prizesCount').textContent = active ? active + ' шт.' : 'пусто';
  $('#prizesDot').hidden = !active;
}

function renderPrizes() {
  var list = $('#prizesList');

  if (!state.prizes.length) {
    list.innerHTML = '<div class="empty">' + ico('i-gift') +
      '<b>Пока пусто</b><small>Крутите колесо удачи на главном экране — призы появятся здесь.</small></div>';
    return;
  }

  list.innerHTML = state.prizes.map(function (p) {
    var d = new Date(p.date);
    var when = d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }) + ', ' +
               d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return '<div class="prize">' +
             '<div class="prize__ic">' + ico(p.type === 'discount' ? 'i-percent' : 'i-vbuck') + '</div>' +
             '<div class="prize__t"><b>' + p.title + '</b><small>' + when + '</small></div>' +
             '<div class="prize__tag">' + (p.used ? 'использован' : 'активен') + '</div>' +
           '</div>';
  }).join('');
}

/* ======================================================
   8. Живая лента отзывов + счётчики
   ====================================================== */
var FEED_SPEED = 15; // px в секунду

function agoText(min) {
  if (min < 1)  return 'только что';
  if (min < 60) return min + ' мин';
  return Math.floor(min / 60) + ' ч';
}

function reviewHTML(r) {
  return '<div class="review">' +
           '<div class="review__av">' + r.name.charAt(0).toUpperCase() + '</div>' +
           '<div class="review__b">' +
             '<div class="review__top">' +
               '<span class="review__name">' + r.name + '</span>' +
               '<span class="review__st">' + new Array(r.stars + 1).join('★') + '</span>' +
               '<span class="review__ago">' + agoText(r.ago) + '</span>' +
             '</div>' +
             '<div class="review__txt">' + r.text + '</div>' +
           '</div>' +
         '</div>';
}

function renderFeed() {
  var track = $('#feedTrack');
  if (!track) return;

  // возраст отзывов: от «только что» вверху до пары часов внизу
  var min = 1;
  REVIEWS.forEach(function (r) {
    r.ago = min;
    min += 3 + Math.floor(Math.random() * 22);
  });

  var html = REVIEWS.map(reviewHTML).join('');
  track.innerHTML = html + html; // два одинаковых блока — для бесшовной прокрутки

  // rAF не выполняется в фоновой вкладке, поэтому меряем сразу и при
  // необходимости повторяем — скорость держим постоянной в px/с
  (function measure(tries) {
    var half = track.scrollHeight / 2;
    if (half > 0) {
      track.style.setProperty('--feed-dur', Math.round(half / FEED_SPEED) + 's');
    } else if (tries < 10) {
      setTimeout(function () { measure(tries + 1); }, 300);
    }
  })(0);
}

// счётчик онлайна слегка «дышит», счётчик заказов изредка растёт
function startLive() {
  var online = $('#onlineNow');
  var orders = $('#ordersCount');
  var count  = 12480;

  (function drift() {
    setTimeout(function () {
      if (online) {
        var v = parseInt(online.textContent, 10) + (Math.floor(Math.random() * 7) - 3);
        online.textContent = Math.max(23, Math.min(96, v));
      }
      drift();
    }, 4000 + Math.random() * 5000);
  })();

  (function sale() {
    setTimeout(function () {
      if (orders) {
        count += 1;
        orders.textContent = num(count);
        orders.classList.add('is-tick');
        setTimeout(function () { orders.classList.remove('is-tick'); }, 700);
      }
      sale();
    }, 7000 + Math.random() * 9000);
  })();
}

/* ======================================================
   9. Инициализация
   ====================================================== */
function initTelegram() {
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
    if (tg.setHeaderColor)     tg.setHeaderColor('#06120c');
    if (tg.setBackgroundColor) tg.setBackgroundColor('#06120c');
    if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
    if (tg.BackButton) {
      tg.BackButton.onClick(back);
      tg.BackButton.hide();
    }

    var u = tg.initDataUnsafe && tg.initDataUnsafe.user;
    if (u) {
      var name = u.first_name || u.username || 'игрок';
      $('#userName').textContent = name;
      var av = $('#userAvatar');
      if (u.photo_url) {
        av.textContent = '';
        av.style.backgroundImage = 'url(' + u.photo_url + ')';
      } else {
        av.textContent = name.charAt(0).toUpperCase();
      }
    }
  } catch (e) {}
}

function bindUI() {
  // переходы по data-go / data-back
  document.addEventListener('click', function (e) {
    var goBtn = e.target.closest('[data-go]');
    if (goBtn) { haptic('light'); go(goBtn.dataset.go, goBtn.dataset.go === 'home' ? { root: true } : {}); return; }

    var backBtn = e.target.closest('[data-back]');
    if (backBtn) { back(); return; }

    var close = e.target.closest('[data-close]');
    if (close) { $('#winModal').hidden = true; haptic('light'); return; }
  });

  $('#spinBtn').addEventListener('click', spin);
  $('#payBtn').addEventListener('click', pay);

  $('#promoDrop').addEventListener('click', function () {
    state.discount = null;
    updatePromoRow();
    updateSummary();
    haptic('light');
    toast('Скидка снята — приз остался в «Моих призах»');
  });

  $('#supportBtn').addEventListener('click', function () {
    haptic('light');
    toast('Макет: здесь откроется чат поддержки');
  });

  // при повороте/ресайзе держим ленту на месте
  var t;
  window.addEventListener('resize', function () {
    clearTimeout(t);
    t = setTimeout(function () { if (!spinning) setX(offsetFor(REST_REP * PRIZES.length), false); }, 150);
  });
}

function init() {
  initTelegram();
  renderPacks();
  renderRegions();
  bindNick();
  bindUI();
  updatePrizesBadge();

  runLoader(function () {
    buildReel();   // измерения возможны только когда #app уже показан
    renderFeed();
    startLive();
  });
}

document.addEventListener('DOMContentLoaded', init);
})();
