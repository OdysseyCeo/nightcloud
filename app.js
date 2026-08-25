const tg = window.Telegram ? window.Telegram.WebApp : null;

if (tg) {
  tg.ready();
  tg.expand();
  try {
    tg.setHeaderColor('#07080b');
    tg.setBackgroundColor('#07080b');
  } catch (e) {}
}

/* Имя пользователя из Telegram */
function currentUserName() {
  const u = tg && tg.initDataUnsafe ? tg.initDataUnsafe.user : null;
  if (!u) return 'guest';
  if (u.username) return '@' + u.username;
  return [u.first_name, u.last_name].filter(Boolean).join(' ') || 'guest';
}
document.getElementById('userName').textContent = currentUserName();

/* Ссылки на Telegram открываем внутри клиента */
document.querySelectorAll('[data-tg-link]').forEach((a) => {
  a.addEventListener('click', (e) => {
    if (!tg || !tg.openTelegramLink) return;
    e.preventDefault();
    tg.openTelegramLink(a.href);
  });
});

/* Прогресс загрузки */
const DURATION = 1800; // мс
const splash = document.getElementById('splash');
const fill = document.getElementById('loaderFill');
const app = document.getElementById('app');
let finished = false;

function finish() {
  if (finished) return;
  finished = true;
  fill.style.width = '100%';
  splash.classList.add('splash--hidden');
  app.classList.add('app--visible');
  if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}

// линию гоним через CSS-переход: работает и когда вкладка свёрнута
fill.style.transition = 'width ' + DURATION + 'ms linear';
setTimeout(() => { fill.style.width = '100%'; }, 30);
setTimeout(finish, DURATION + 250);
