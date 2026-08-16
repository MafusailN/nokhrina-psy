/* ==========================================================================
   Настройки отправки заявок
   --------------------------------------------------------------------------
   ENDPOINT — адрес, куда уходит форма. Проще всего Formspree:
     1. formspree.io → зарегистрироваться на почту Юлии
     2. New form → скопировать адрес вида https://formspree.io/f/abcdwxyz
     3. вставить его ниже вместо строки-заглушки
   Пока ENDPOINT не заменён, форма открывает почтовый клиент (запасной режим).

   TELEGRAM — если позже захотим дублировать заявки в Telegram, см. README.
   ========================================================================== */
const CONFIG = {
  ENDPOINT: 'https://formspree.io/f/ВАШ_ID',
  FALLBACK_EMAIL: 'Nokhrina_y@mail.ru',
};

/* ---------- Меню ---------- */
const nav = document.getElementById('nav');
const burger = document.querySelector('.nav__burger');
const links = document.querySelector('.nav__links');

burger.addEventListener('click', () => {
  const open = links.classList.toggle('is-open');
  burger.setAttribute('aria-expanded', String(open));
});
links.addEventListener('click', (e) => {
  if (e.target.tagName === 'A') {
    links.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
  }
});

const onScroll = () => nav.classList.toggle('is-stuck', window.scrollY > 8);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

/* ---------- Появление блоков ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (!entry.isIntersecting) return;
    entry.target.style.transitionDelay = `${Math.min(i * 70, 350)}ms`;
    entry.target.classList.add('is-in');
    io.unobserve(entry.target);
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px' });

document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

/* ---------- FAQ: открыт только один пункт ---------- */
const faqItems = document.querySelectorAll('.faq details');
faqItems.forEach((item) => {
  item.addEventListener('toggle', () => {
    if (!item.open) return;
    faqItems.forEach((other) => { if (other !== item) other.open = false; });
  });
});

/* ---------- Форма записи ---------- */
const form = document.getElementById('booking-form');
const status = document.getElementById('form-status');

const setError = (input, text) => {
  const field = input.closest('.field') || input.closest('.check');
  if (!field) return;
  field.classList.toggle('is-invalid', Boolean(text));
  const slot = field.querySelector('.field__error');
  if (slot) slot.textContent = text || '';
};

const validate = () => {
  let firstBad = null;
  const checks = [
    [form.name, form.name.value.trim().length >= 2, 'Напишите, пожалуйста, имя'],
    [form.contact, form.contact.value.trim().length >= 3, 'Укажите, куда вам ответить'],
    [form.consent, form.consent.checked, ''],
  ];
  checks.forEach(([input, ok, msg]) => {
    setError(input, ok ? '' : msg);
    if (!ok && !firstBad) firstBad = input;
  });
  if (firstBad) {
    firstBad.focus();
    if (!form.consent.checked) status.textContent = 'Нужно согласие на обработку данных';
  }
  return !firstBad;
};

['input', 'change'].forEach((evt) =>
  form.addEventListener(evt, (e) => {
    if (e.target.matches('[name="name"],[name="contact"],[name="consent"]')) setError(e.target, '');
  })
);

const buildPayload = () => {
  const d = new FormData(form);
  return {
    'Имя': d.get('name').trim(),
    'Контакт': d.get('contact').trim(),
    'Формат': d.get('format'),
    'Удобное время': d.get('time').trim() || '—',
    'Запрос': d.get('message').trim() || '—',
    _subject: `Заявка с сайта — ${d.get('name').trim()}`,
    _gotcha: d.get('_gotcha'),
  };
};

const mailtoFallback = (payload) => {
  const body = Object.entries(payload)
    .filter(([k]) => !k.startsWith('_'))
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  window.location.href =
    `mailto:${CONFIG.FALLBACK_EMAIL}?subject=${encodeURIComponent(payload._subject)}` +
    `&body=${encodeURIComponent(body)}`;
  status.className = 'form__status is-ok';
  status.textContent = 'Открылся почтовый клиент — осталось нажать «Отправить».';
};

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  status.className = 'form__status';
  status.textContent = '';
  if (!validate()) return;

  const payload = buildPayload();
  if (payload._gotcha) return; // бот

  const btn = form.querySelector('button[type="submit"]');
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Отправляем…';

  try {
    if (CONFIG.ENDPOINT.includes('ВАШ_ID')) {
      mailtoFallback(payload);
      return;
    }
    const res = await fetch(CONFIG.ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(res.status);

    form.reset();
    status.className = 'form__status is-ok';
    status.textContent = 'Спасибо! Заявка отправлена — я отвечу в течение дня.';
  } catch (err) {
    status.className = 'form__status is-err';
    status.textContent = 'Не получилось отправить. Напишите, пожалуйста, в Telegram или на почту.';
  } finally {
    btn.disabled = false;
    btn.textContent = label;
  }
});

/* ---------- Мелочи ---------- */
document.getElementById('year').textContent = new Date().getFullYear();
