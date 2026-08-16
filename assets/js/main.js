/* ==========================================================================
   Настройки отправки заявок
   --------------------------------------------------------------------------
   Заявка уходит письмом на почту через FormSubmit — сервису не нужны ни
   регистрация, ни свой сервер. Посетитель никуда не переходит и ничего
   не открывает: нажал кнопку, увидел «спасибо».

   ВАЖНО: первое письмо сервис задержит, пока адрес не подтверждён. После
   первой отправки на почту придёт письмо со ссылкой активации — по ней нужно
   перейти один раз. Подробности в README.

   После активации FormSubmit выдаёт «скрытый» адрес вида
   https://formsubmit.co/ajax/abc123… — его стоит подставить вместо почты,
   чтобы адрес не лежал в открытом коде и его не собрали спам-боты.
   ========================================================================== */
const CONFIG = {
  ENDPOINT: 'https://formsubmit.co/ajax/Nokhrina_y@mail.ru',
  EMAIL: 'Nokhrina_y@mail.ru',
  TELEGRAM: 'https://t.me/yuliyanokhrina',
};

/* ---------- Меню ---------- */
const nav = document.getElementById('nav');
const burger = document.querySelector('.nav__burger');
const links = document.querySelector('.nav__links');

burger.addEventListener('click', (e) => {
  e.stopPropagation();
  const open = links.classList.toggle('is-open');
  burger.setAttribute('aria-expanded', String(open));
});
const closeMenu = () => {
  links.classList.remove('is-open');
  burger.setAttribute('aria-expanded', 'false');
};

links.addEventListener('click', (e) => { if (e.target.tagName === 'A') closeMenu(); });
document.addEventListener('click', (e) => {
  if (links.classList.contains('is-open') && !e.target.closest('.nav')) closeMenu();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

const onScroll = () => nav.classList.toggle('is-stuck', window.scrollY > 8);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

const calmMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Появление блоков ---------- */
/* Порог маленький, а нижний отступ отрицательный: анимация стартует чуть раньше,
   чем блок доедет до центра, — при быстрой прокрутке не выглядит рывком. */
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (!entry.isIntersecting) return;
    entry.target.style.transitionDelay = `${Math.min(i * 55, 220)}ms`;
    entry.target.classList.add('is-in');
    io.unobserve(entry.target);
  });
}, { threshold: 0.05, rootMargin: '0px 0px -8%' });

document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

/* ---------- FAQ ---------- */
/* Штатный <details> схлопывается мгновенно: браузер убирает содержимое из потока
   раньше, чем отработает transition. Поэтому высотой управляем вручную. */
const faqItems = [...document.querySelectorAll('.faq details')];

const expand = (item) => {
  const body = item.querySelector('.faq__body');
  item.open = true;
  if (calmMotion) { body.style.height = 'auto'; return; }
  body.style.height = '0px';
  requestAnimationFrame(() => { body.style.height = `${body.scrollHeight}px`; });
  body.addEventListener('transitionend', function done(e) {
    if (e.propertyName !== 'height') return;
    body.style.height = 'auto';           // чтобы текст мог свободно переверстаться
    body.removeEventListener('transitionend', done);
  });
};

const collapse = (item) => {
  const body = item.querySelector('.faq__body');
  if (calmMotion) { body.style.height = '0px'; item.open = false; return; }
  body.style.height = `${body.scrollHeight}px`;
  requestAnimationFrame(() => { body.style.height = '0px'; });
  body.addEventListener('transitionend', function done(e) {
    if (e.propertyName !== 'height') return;
    item.open = false;                    // закрываем только после анимации
    body.removeEventListener('transitionend', done);
  });
};

faqItems.forEach((item) => {
  item.querySelector('summary').addEventListener('click', (e) => {
    e.preventDefault();
    if (item.open) { collapse(item); return; }
    faqItems.forEach((other) => { if (other !== item && other.open) collapse(other); });
    expand(item);
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
  const name = d.get('name').trim();
  return {
    'Имя': name,
    'Контакт': d.get('contact').trim(),
    'Формат': d.get('format'),
    'Удобное время': d.get('time').trim() || 'не указано',
    'Запрос': d.get('message').trim() || 'не указан',
    _subject: `Заявка с сайта — ${name}`,
    _template: 'table',   // письмо приходит аккуратной таблицей
    _captcha: 'false',    // капча не нужна: заявку отправляет наш скрипт
    _gotcha: d.get('_gotcha'),
  };
};

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  status.className = 'form__status';
  status.textContent = '';
  if (!validate()) return;

  const payload = buildPayload();
  if (payload._gotcha) return; // бот заполнил скрытое поле

  const btn = form.querySelector('button[type="submit"]');
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Отправляем…';

  try {
    const res = await fetch(CONFIG.ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === 'false' || data.success === false) {
      throw new Error(data.message || res.status);
    }

    form.reset();
    form.querySelector('.chips input').checked = true;   // вернуть формат по умолчанию
    status.className = 'form__status is-ok';
    status.textContent = 'Спасибо! Заявка отправлена — я отвечу в течение дня.';
  } catch (err) {
    // не теряем человека: показываем прямые контакты прямо в сообщении
    status.className = 'form__status is-err';
    status.innerHTML =
      'Не получилось отправить — возможно, пропала связь. ' +
      `Напишите, пожалуйста, в <a href="${CONFIG.TELEGRAM}" target="_blank" rel="noopener">Telegram</a> ` +
      `или на <a href="mailto:${CONFIG.EMAIL}">${CONFIG.EMAIL}</a>.`;
  } finally {
    btn.disabled = false;
    btn.textContent = label;
  }
});

/* ---------- Мелочи ---------- */
document.getElementById('year').textContent = new Date().getFullYear();
