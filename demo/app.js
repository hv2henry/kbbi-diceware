'use strict';
/*
 * demo/app.js — Diceware KBBI, Indonesian passphrase generator.
 *
 * 100% client-side: the page loads only this repository's own files
 * (style.css, app.js, kbbi-wordlist.txt) — nothing third-party, no analytics, no
 * cookies, no storage. A Content-Security-Policy meta tag in index.html
 * locks that down (default-src 'none'; no 'unsafe-inline' anywhere).
 *
 * Randomness: window.crypto.getRandomValues() with rejection sampling.
 * A byte is accepted only when b < 252 (252 = 6 * 42), then the die face is
 * (b % 6) + 1 — so every face 1..6 has exactly 42 accepted byte values and
 * there is no modulo bias. The weak browser PRNG behind M-a-t-h dot r-a-n-d-o-m
 * is never touched. Exception: eMudhra Mode, a satire of the October 2026
 * eMudhra intermediate-CA keys (one private key was the number 4; see xkcd
 * #221) — its roller returns 4 on every call, on purpose.
 *
 * Dice -> word mapping: the word list is alphabetical and has exactly 6^5 =
 * 7776 entries, so a roll of five dice d1..d5 is the base-6 representation of
 * the word's 0-based index (11111 -> index 0, 66666 -> index 7775). This is the
 * same mapping used by kbbi-diceware-wordlist.txt, which is why the tester
 * needs no dice codes at runtime — only the plain word list.
 */

// The ?v= query busts the GitHub Pages CDN cache (max-age=600) so the tester
// never serves a stale list after a release. Bump it with every list version.
const WORDLIST_URL = '../kbbi-wordlist.txt?v=22.7';
const SIDES = 6;             // die faces: 1..6
const DICE_PER_WORD = 5;     // 5 dice per word
const EXPECTED_WORDS = 7776; // 6^5 — the mapping is only valid at this exact size
const MIN_WORDS = 4;
const MAX_WORDS = 12;
const DEFAULT_WORDS = 5;

const I18N = {
  id: {
    pageTitle: 'Diceware KBBI',
    title: 'Diceware KBBI',
    tagline: 'Pembuat frasa sandi Bahasa Indonesia',
    pageTitleEmudhra: 'Diceware KBBI // Mode eMudhra',
    taglineEmudhra: 'Pembuat frasa sandi Bahasa Indonesia—ditenagai RNG terbaik yang pernah dipakai di produksi: angka 4.',
    navbarLabel: 'Pengaturan tampilan',
    themeLabel: 'Tema',
    themeLight: 'Tema terang',
    themeDark: 'Tema gelap',
    language: 'Bahasa',
    generateHeading: 'Buat frasa sandi',
    wordCount: 'Jumlah kata',
    countValue: '{n} kata',
    separator: 'Penghubung',
    sepSpace: 'spasi',
    sepHyphen: 'strip',
    sepCustomAria: 'Penghubung pilihan sendiri',
    generate: 'Lempar dadu',
    passphraseLabel: 'Frasa sandi',
    copy: 'Salin',
    copied: 'Tersalin ✓',
    copyFailed: 'Gagal menyalin—blok teksnya lalu salin manual.',
    entropy: 'Entropi <b>{bits} bit</b> ({per} bit per kata)—{verdict}',
    entropyEmudhra: 'Entropi <b>384 bit</b>—ukuran penuh kunci P-384, persis seperti kunci yang ditenagai angka 4. Jumlah kata tidak memengaruhinya; hasilnya selalu sama.',
    verdictMin: 'batas minimum yang umum dipakai',
    verdictDefault: 'nyaman untuk akun sehari-hari',
    verdictHigh: 'untuk akun penting/jangka panjang',
    colDice: 'dadu',
    colCode: 'kode',
    colWord: 'kata',
    manualTitle: 'Cocokkan Kocokan Dadumu',
    manualHint: 'Lempar dadu sungguhan? Klik tiap dadu sampai sama dengan hasil kocokanmu, atau ketik langsung kodenya, lalu baca kata yang muncul—persis seperti mencari kodenya di kbbi-wordlist.txt.',
    manualLocked: 'Dadu dikunci di angka 4—seperti kunci privat EM OV TLS CA-G3C. Hasilnya selalu sama; tidak ada yang perlu dicocokkan.',
    manualDiceGroup: 'Lima dadu, klik untuk mengubah nilainya',
    manualCode: 'Kode',
    manualWord: 'Kata',
    manualLine: 'Baris {line} di kbbi-wordlist.txt (kata ke-{index} dari {total})',
    manualEmpty: 'Daftar kata belum dimuat.',
    dieFace: 'Dadu {n}',
    statusLoading: 'Memuat kbbi-wordlist.txt…',
    statusReady: '{total} kata dimuat · urut alfabetis · 1 kata = 5 dadu (kode {first}–{last})',
    statusError: 'Gagal memuat kbbi-wordlist.txt ({reason}).',
    statusErrorCount: 'jumlah katanya bukan 7.776, jadi pemetaan 5 dadu tidak berlaku',
    statusErrorOrder: 'daftarnya tidak urut alfabetis, jadi pemetaan 5 dadu tidak berlaku',
    statusErrorCharset: 'ada baris yang mengandung karakter di luar huruf kecil a–z',
    statusErrorFetch: 'berkas tidak ditemukan atau fetch diblokir',
    statusHint: 'Sajikan lewat GitHub Pages, atau jalankan <code>python3 -m http.server</code> di root repo lalu buka <code>http://localhost:8000/demo/</code>. Membuka berkas lewat <code>file://</code> membuat browser memblokir fetch.',
    statusNoCrypto: 'Browser ini tidak menyediakan crypto.getRandomValues()—pembuatan frasa sandi dinonaktifkan. Panel dadu tetap dapat dipakai.',
    statusRngBroken: 'RNG browser tidak menghasilkan byte yang dapat dipakai—pembuatan frasa sandi dihentikan (tanpa fallback). Muat ulang halaman atau coba browser lain.',
    privacy: 'Tanpa server, tanpa analitik, tanpa cookie, tanpa penyimpanan lokal. Tidak ada permintaan ke pihak ketiga—hanya berkas dari repo ini.',
    rng: 'Keacakan: crypto.getRandomValues() + rejection sampling (252 = 6 × 42), tanpa modulo bias.',
    rngEmudhra: 'Keacakan: return 4;—dipilih oleh kocokan dadu yang jujur, dijamin acak. Tahan brute-force: kandidatnya cuma satu dan tidak pernah salah.',
    source: 'Daftar kata: kbbi-diceware-wordlist.txt (7.776 kata)—dikurasi dari Kamus Besar Bahasa Indonesia.',
    emudhraToggle: 'Mode eMudhra',
    emudhraHeading: 'Mode eMudhra: delapan bit kepercayaan',
    emudhraContext: 'Oktober 2026: peneliti Scott Helme menemukan bahwa kunci privat sebuah sertifikat CA intermediet eMudhra adalah angka 4. Kunci kurva P-384 seharusnya memuat 384 bit entropi, tetapi delapan kunci yang terdampak masing-masing muat dalam satu byte—maksimal 8 bit—dan semuanya berhasil dipulihkan dari sertifikat publiknya dalam kurang dari satu detik, setelah sekitar 18 bulan beredar.',
    emudhraSnippet: 'int getRandomNumber() {\n    return 4; // chosen by fair dice roll\n              // guaranteed to be random\n}',
    emudhraCredit: 'Cuplikan: xkcd #221 "Random Number" karya Randall Munroe, CC BY-NC 2.5 (xkcd.com/221). Fakta insiden: Scott Helme, "Eight Bits of Trust" (scotthelme.co.uk, Oktober 2026).'
  },
  en: {
    pageTitle: 'KBBI Diceware',
    title: 'KBBI Diceware',
    tagline: 'Indonesian Passphrase Generator',
    pageTitleEmudhra: 'KBBI Diceware // eMudhra Mode',
    taglineEmudhra: 'Indonesian Passphrase Generator—powered by the finest RNG ever deployed in production: the number 4.',
    navbarLabel: 'Display settings',
    themeLabel: 'Theme',
    themeLight: 'Light theme',
    themeDark: 'Dark theme',
    language: 'Language',
    generateHeading: 'Generate a passphrase',
    wordCount: 'Word count',
    countValue: '{n} words',
    separator: 'Separator',
    sepSpace: 'space',
    sepHyphen: 'hyphen',
    sepCustomAria: 'Custom separator',
    generate: 'Roll the dice',
    passphraseLabel: 'Passphrase',
    copy: 'Copy',
    copied: 'Copied ✓',
    copyFailed: 'Copy failed—select the text and copy it manually.',
    entropy: 'Entropy <b>{bits} bits</b> ({per} bits per word)—{verdict}',
    entropyEmudhra: 'Entropy <b>384 bits</b>—the full P-384 size, exactly like the key powered by the number 4. Word count does not affect it; the result is always the same.',
    verdictMin: 'the commonly accepted minimum',
    verdictDefault: 'comfortable for everyday accounts',
    verdictHigh: 'for high-value/long-term accounts',
    colDice: 'dice',
    colCode: 'code',
    colWord: 'word',
    manualTitle: 'Check Your Dice Roll',
    manualHint: 'Rolling real dice? Click each die until it matches your roll, or type the code directly, then read the word—exactly like looking it up in kbbi-wordlist.txt.',
    manualLocked: 'The dice are locked to 4—just like the EM OV TLS CA-G3C private key. The answer is always the same; there is nothing to check.',
    manualDiceGroup: 'Five dice, click to change the value',
    manualCode: 'Code',
    manualWord: 'Word',
    manualLine: 'Line {line} of kbbi-wordlist.txt (word {index} of {total})',
    manualEmpty: 'The word list has not been loaded yet.',
    dieFace: 'Die {n}',
    statusLoading: 'Loading kbbi-wordlist.txt…',
    statusReady: '{total} words loaded · alphabetical · 1 word = 5 dice (codes {first}–{last})',
    statusError: 'Could not load kbbi-wordlist.txt ({reason}).',
    statusErrorCount: 'the word count is not 7,776, so the 5-dice mapping does not apply',
    statusErrorOrder: 'the list is not in alphabetical order, so the 5-dice mapping does not apply',
    statusErrorCharset: 'a line contains characters outside lowercase a–z',
    statusErrorFetch: 'file not found or the fetch was blocked',
    statusHint: 'Serve it from GitHub Pages, or run <code>python3 -m http.server</code> at the repo root and open <code>http://localhost:8000/demo/</code>. Opening the file via <code>file://</code> makes the browser block the fetch.',
    statusNoCrypto: 'This browser does not expose crypto.getRandomValues()—passphrase generation is disabled. The dice panel still works.',
    statusRngBroken: 'The browser RNG is not producing usable bytes—passphrase generation has stopped (no fallback). Reload the page or try another browser.',
    privacy: 'No server, no analytics, no cookies, no local storage. No third-party requests—only the files of this repository.',
    rng: 'Randomness: crypto.getRandomValues() + rejection sampling (252 = 6 × 42), no modulo bias.',
    rngEmudhra: 'Randomness: return 4;—chosen by fair dice roll, guaranteed to be random. Brute-force resistant: there is exactly one candidate, and it is never wrong.',
    source: 'Word list: kbbi-diceware-wordlist.txt (7,776 words)—curated from Kamus Besar Bahasa Indonesia.',
    emudhraToggle: 'eMudhra Mode',
    emudhraHeading: 'eMudhra Mode: eight bits of trust',
    emudhraContext: 'October 2026: researcher Scott Helme found that the private key of an eMudhra intermediate CA certificate was the number 4. A P-384 key is supposed to hold 384 bits of entropy, yet the eight affected keys each fit in a single byte—at most 8 bits—and all of them were recovered from their public certificates in under a second, after roughly 18 months in the wild.',
    emudhraSnippet: 'int getRandomNumber() {\n    return 4; // chosen by fair dice roll\n              // guaranteed to be random\n}',
    emudhraCredit: 'Snippet: xkcd #221 "Random Number" by Randall Munroe, CC BY-NC 2.5 (xkcd.com/221). Incident facts: Scott Helme, "Eight Bits of Trust" (scotthelme.co.uk, October 2026).'
  }
};

const PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8]
};

/* Navbar icons — inline SVG (no icon font, no external asset, CSP-safe).
   Flags keep the official 3:2 ratio at 18×12; theme icons are 18×18. */
const THEME_ICONS = {
  light: '<svg class="icon-sun" aria-hidden="true" fill="none" height="18" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="18"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
  dark: '<svg class="icon-moon" aria-hidden="true" fill="none" height="18" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="18"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
};
const FLAG_ICONS = {
  id: '<svg class="flag" aria-hidden="true" width="18" height="12" viewBox="0 0 30 20"><rect width="30" height="10" fill="#CE1126"/><rect y="10" width="30" height="10" fill="#FFF"/></svg>',
  en: '<svg class="flag" aria-hidden="true" width="18" height="12" viewBox="0 0 30 20"><rect width="30" height="20" fill="#012169"/><path d="M0,0 L30,20 M30,0 L0,20" stroke="#FFF" stroke-width="4"/><path d="M0,0 L13,8.5 M30,0 L17,8.5 M0,20 L13,11.5 M30,20 L17,11.5" stroke="#C8102E" stroke-width="2"/><path d="M15,0 V20 M0,10 H30" stroke="#FFF" stroke-width="6"/><path d="M15,0 V20 M0,10 H30" stroke="#C8102E" stroke-width="3.5"/></svg>'
};

const prefersDark = typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

const state = {
  lang: 'en',
  count: DEFAULT_WORDS,
  separator: ' ',
  theme: prefersDark ? 'dark' : 'light', // effective theme; the toggle pins it via <html data-theme>
  emudhra: false, // satirical mode: the roller always returns 4 (xkcd #221)
  words: null,
  rolls: [],
  manual: [1, 1, 1, 1, 1],
  status: { kind: '', key: 'statusLoading', vars: null, hint: false },
  hasCrypto: !!(window.crypto && typeof window.crypto.getRandomValues === 'function')
};

const $ = (sel) => document.querySelector(sel);

/* Controls are created once and only updated afterwards, so keyboard focus and
 * the DOM identity of a pressed button survive a re-render. */
const refs = { themeBtns: [], sepBtns: [], langBtns: [], manualDice: [] };

function t(key, vars) {
  let s = (I18N[state.lang] && I18N[state.lang][key]) || I18N.en[key] || key;
  if (vars) for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}

function num(value, digits) {
  const locale = state.lang === 'id' ? 'id-ID' : 'en-US';
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits, maximumFractionDigits: digits
  }).format(value);
}

const int = (value) => num(value, 0);

/* ---------- dice <-> index mapping ---------- */

function indexFromDice(dice) {
  let i = 0;
  for (const face of dice) i = i * SIDES + (face - 1);
  return i;
}

function diceFromIndex(index) {
  const dice = new Array(DICE_PER_WORD);
  let n = index;
  for (let k = DICE_PER_WORD - 1; k >= 0; k--) { dice[k] = (n % SIDES) + 1; n = Math.floor(n / SIDES); }
  return dice;
}

const codeFromDice = (dice) => dice.join('');

/* ---------- CSPRNG die roller ---------- */

/* The crypto roller is built once and cached for the page's lifetime, so the
 * 256-byte buffer is consumed to the end before a refill instead of being
 * discarded after every generate() call. */
let cryptoRoller = null;

function buildCryptoRoller() {
  let buffer = new Uint8Array(0);
  let pos = 0;
  const LIMIT = SIDES * 42; // 252: only bytes below it are used -> no modulo bias
  return function rollDie() {
    for (let guard = 0; guard < 100000; guard++) {
      if (pos >= buffer.length) {
        buffer = new Uint8Array(256);
        window.crypto.getRandomValues(buffer);
        pos = 0;
      }
      const byte = buffer[pos++]; // consumed whether accepted or rejected
      if (byte < LIMIT) return (byte % SIDES) + 1;
    }
    throw new Error('crypto.getRandomValues() is not producing usable output');
  };
}

function makeRoller() {
  if (state.emudhra) {
    // eMudhra Mode: chosen by fair dice roll, guaranteed to be random (xkcd #221).
    return function rollDie() { return 4; };
  }
  if (!state.hasCrypto) return null;
  if (!cryptoRoller) cryptoRoller = buildCryptoRoller();
  return cryptoRoller;
}

/* ---------- dice faces ---------- */

function paintDie(el, value) {
  while (el.firstChild) el.removeChild(el.firstChild);
  for (let cell = 0; cell < 9; cell++) {
    const pip = document.createElement('i');
    if (PIPS[value].indexOf(cell) !== -1) pip.className = 'pip';
    el.appendChild(pip);
  }
  el.setAttribute('aria-label', t('dieFace', { n: value }));
}

function makeDie(value, interactive) {
  const die = document.createElement(interactive ? 'button' : 'span');
  die.className = 'die' + (interactive ? ' big' : '');
  if (interactive) die.type = 'button';
  else die.setAttribute('role', 'img');
  paintDie(die, value);
  return die;
}

/* ---------- status line ---------- */

function setStatus(kind, key, vars, hint) {
  state.status = { kind: kind, key: key, vars: vars || null, hint: !!hint };
}

function paintStatus() {
  const el = $('#status');
  const s = state.status;
  el.className = 'status' + (s.kind ? ' ' + s.kind : '');
  // Interpolation happens at paint time — not at set time — so numbers and
  // reason strings follow a language switch (7.776 <-> 7,776). Only strings
  // from the local I18N table ever reach innerHTML (the hint carries <code>
  // markup); nothing from the word list or from user input is interpolated.
  const raw = s.vars || {};
  const vars = {};
  for (const k of Object.keys(raw)) {
    vars[k] = typeof raw[k] === 'number' ? int(raw[k]) : raw[k];
  }
  if (raw.reasonKey) vars.reason = t(raw.reasonKey);
  el.innerHTML = t(s.key, vars) + (s.hint ? ' ' + t('statusHint') : '');
}

/* ---------- controls (built once) ---------- */

function makeSegButton(label, onPick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = label;
  btn.addEventListener('click', () => { onPick(btn); });
  return btn;
}

function initControls() {
  const themeGroup = $('#theme-group');
  [['light', 'themeLight'], ['dark', 'themeDark']].forEach((pair) => {
    const btn = makeSegButton('', () => { setTheme(pair[0]); });
    btn.innerHTML = THEME_ICONS[pair[0]]; // icon-only; the accessible name is the aria-label
    btn.setAttribute('aria-label', t(pair[1]));
    btn.dataset.value = pair[0];
    btn.dataset.labelKey = pair[1];
    themeGroup.appendChild(btn);
    refs.themeBtns.push(btn);
  });

  const slider = $('#count-slider');
  slider.min = String(MIN_WORDS);
  slider.max = String(MAX_WORDS);
  slider.step = '1';
  slider.value = String(state.count);
  slider.addEventListener('input', () => {
    const n = parseInt(slider.value, 10);
    state.count = isNaN(n) ? DEFAULT_WORDS : Math.min(MAX_WORDS, Math.max(MIN_WORDS, n));
    generate();
    render();
  });

  const sepCustom = $('#sep-custom');
  const sepGroup = $('#sep-group');
  [[' ', 'sepSpace'], ['-', 'sepHyphen']].forEach((pair) => {
    const btn = makeSegButton(t(pair[1]), () => {
      state.separator = pair[0];
      sepCustom.value = '';
      render();
    });
    btn.dataset.value = pair[0];
    btn.dataset.labelKey = pair[1];
    sepGroup.appendChild(btn);
    refs.sepBtns.push(btn);
  });
  sepCustom.addEventListener('input', () => {
    // Any non-empty text becomes the separator; clearing the box falls back to a space.
    state.separator = sepCustom.value.length > 0 ? sepCustom.value : ' ';
    render();
  });

  const langGroup = $('#lang-group');
  ['id', 'en'].forEach((code) => {
    const btn = makeSegButton('', () => {
      if (state.lang !== code) { state.lang = code; render(); }
    });
    btn.innerHTML = FLAG_ICONS[code] + '<span>' + code.toUpperCase() + '</span>';
    btn.dataset.value = code;
    langGroup.appendChild(btn);
    refs.langBtns.push(btn);
  });

  const manualGroup = $('#manual-dice');
  state.manual.forEach((value, i) => {
    const die = makeDie(value, true);
    die.addEventListener('click', () => {
      if (state.emudhra) return; // dice are locked to 4 in eMudhra Mode
      state.manual[i] = (state.manual[i] % SIDES) + 1;
      paintDie(die, state.manual[i]);
      renderManual();
    });
    manualGroup.appendChild(die);
    refs.manualDice.push(die);
  });

  const codeInput = $('#manual-code-input');
  codeInput.addEventListener('input', () => {
    if (state.emudhra) return; // locked to 44444 in eMudhra Mode
    const clean = codeInput.value.replace(/[^1-6]/g, '').slice(0, 5);
    for (let i = 0; i < clean.length; i++) state.manual[i] = Number(clean[i]);
    if (codeInput.value !== clean) codeInput.value = clean;
    refs.manualDice.forEach((die, i) => paintDie(die, state.manual[i]));
    renderManual();
  });
  // Leaving the box resyncs it with the full five-die code (partial input
  // keeps the untouched dice, so the field may lag behind the shown code).
  codeInput.addEventListener('blur', () => { renderManual(); });

  $('#emudhra-toggle').addEventListener('click', () => { setEmudhra(!state.emudhra); });
  $('#generate').addEventListener('click', () => { generate(); render(); });
  $('#copy').addEventListener('click', copyPassphrase);
}

/* ---------- theme toggle ---------- */

function setTheme(value) {
  state.theme = value;
  document.documentElement.dataset.theme = value; // pinned until reload; never stored
  render();
}

/* ---------- eMudhra Mode (satire) ---------- */

function setEmudhra(on) {
  state.emudhra = on;
  document.body.className = on ? 'emudhra' : '';
  $('#emudhra-toggle').setAttribute('aria-pressed', String(on));
  // eMudhra Mode locks the whole panel: dice ignore clicks, the code box is disabled.
  $('#manual-code-input').disabled = on;
  state.manual = on ? [4, 4, 4, 4, 4] : [1, 1, 1, 1, 1];
  refs.manualDice.forEach((die) => {
    if (on) die.setAttribute('aria-disabled', 'true');
    else die.removeAttribute('aria-disabled');
  });
  // Swap the texts the mode rewrites; the generic render loop re-fills them.
  $('#tagline').dataset.i18n = on ? 'taglineEmudhra' : 'tagline';
  $('#manual-hint').dataset.i18n = on ? 'manualLocked' : 'manualHint';
  $('#rng-line').dataset.i18n = on ? 'rngEmudhra' : 'rng';
  if (state.words) {
    if (!state.hasCrypto) {
      // Without a CSPRNG the normal mode cannot generate, but eMudhra Mode can.
      if (on) {
        setStatus('ok', 'statusReady', {
          total: state.words.length,
          first: codeFromDice(diceFromIndex(0)),
          last: codeFromDice(diceFromIndex(state.words.length - 1))
        });
      } else {
        setStatus('err', 'statusNoCrypto');
      }
    }
    generate();
  }
  render();
}

/* ---------- rendering ---------- */

function render() {
  document.documentElement.lang = state.lang;
  document.title = t(state.emudhra ? 'pageTitleEmudhra' : 'pageTitle');
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });

  refs.themeBtns.forEach((btn) => {
    btn.setAttribute('aria-label', t(btn.dataset.labelKey));
    btn.setAttribute('aria-pressed', String(btn.dataset.value === state.theme));
  });
  $('#count-slider').value = String(state.count);
  $('#count-value').textContent = t('countValue', { n: int(state.count) });
  refs.sepBtns.forEach((btn) => {
    btn.textContent = t(btn.dataset.labelKey);
    btn.setAttribute('aria-pressed', String(btn.dataset.value === state.separator));
  });
  // The custom box mirrors the active preset: space -> empty, hyphen -> -.
  $('#sep-custom').setAttribute('placeholder', state.separator === '-' ? '-' : '');
  refs.langBtns.forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.value === state.lang));
  });
  $('#lang-group').setAttribute('aria-label', t('language'));
  $('#manual-dice').setAttribute('aria-label', t('manualDiceGroup'));
  refs.manualDice.forEach((die, i) => paintDie(die, state.manual[i]));

  paintStatus();

  const ready = !!state.words;
  $('#generate').disabled = !(ready && (state.hasCrypto || state.emudhra));
  $('#copy').disabled = !(ready && state.rolls.length > 0);

  $('#passphrase').textContent = state.rolls.map((r) => r.word).join(state.separator);

  if (state.emudhra) {
    // Satire consistency: the mode that brags about "return 4" also brags
    // about the full P-384 size, regardless of the word count.
    $('#entropy').innerHTML = t('entropyEmudhra');
  } else {
    const perWord = Math.log2(EXPECTED_WORDS);
    const verdict = state.count <= MIN_WORDS ? t('verdictMin')
      : state.count <= DEFAULT_WORDS ? t('verdictDefault') : t('verdictHigh');
    $('#entropy').innerHTML = t('entropy', {
      bits: num(state.count * perWord, 1), per: num(perWord, 2), verdict: verdict
    });
  }

  const rolls = $('#rolls');
  while (rolls.firstChild) rolls.removeChild(rolls.firstChild);
  state.rolls.forEach((roll) => {
    const li = document.createElement('li');

    const dice = document.createElement('span');
    dice.className = 'dice';
    roll.dice.forEach((face) => dice.appendChild(makeDie(face, false)));

    const code = document.createElement('span');
    code.className = 'code';
    code.textContent = roll.code;

    const word = document.createElement('span');
    word.className = 'word';
    word.lang = 'id';
    word.textContent = roll.word;

    li.appendChild(dice);
    li.appendChild(code);
    li.appendChild(word);
    rolls.appendChild(li);
  });

  renderManual();
}

function renderManual() {
  const index = indexFromDice(state.manual);
  const codeInput = $('#manual-code-input');
  const code = codeFromDice(state.manual);
  // Never clobber the box while the user is typing in it; otherwise keep it
  // in sync with the dice (clicks, mode switches, language-independent).
  if (document.activeElement !== codeInput && codeInput.value !== code) codeInput.value = code;
  const wordEl = $('#manual-word');
  const lineEl = $('#manual-line');
  if (!state.words) {
    wordEl.textContent = '—';
    wordEl.removeAttribute('lang');
    lineEl.textContent = t('manualEmpty');
    return;
  }
  wordEl.lang = 'id';
  wordEl.textContent = state.words[index];
  lineEl.textContent = t('manualLine', {
    line: int(index + 1), index: int(index + 1), total: int(state.words.length)
  });
}

/* ---------- actions ---------- */

function setReadyStatus() {
  // Shared by loadWordList and every successful generate(), so an RNG error
  // status never sticks: the ready line always returns after a good roll.
  setStatus('ok', 'statusReady', {
    total: state.words.length, // formatted at paint time so the locale can change
    first: codeFromDice(diceFromIndex(0)),
    last: codeFromDice(diceFromIndex(state.words.length - 1))
  });
}

function generate() {
  if (!state.words) return;
  const rollDie = makeRoller();
  if (!rollDie) return;
  const rolls = [];
  try {
    for (let w = 0; w < state.count; w++) {
      const dice = [];
      for (let d = 0; d < DICE_PER_WORD; d++) dice.push(rollDie());
      const index = indexFromDice(dice);
      rolls.push({ dice: dice, code: codeFromDice(dice), word: state.words[index] });
    }
    state.rolls = rolls;
    setReadyStatus(); // clears a previous statusRngBroken, if any
  } catch (err) {
    // The guard tripped: the CSPRNG is not producing usable bytes. Fail
    // closed — keep the previous rolls, say so in the status line, and
    // never fall back to a weaker source.
    setStatus('err', 'statusRngBroken');
  }
}

async function copyPassphrase() {
  const text = state.rolls.map((r) => r.word).join(state.separator);
  if (!text) return;
  const btn = $('#copy');
  let ok = false;
  if (navigator.clipboard && window.isSecureContext) {
    try { await navigator.clipboard.writeText(text); ok = true; } catch (err) { ok = false; }
  }
  if (!ok) {
    // Fallback for non-secure contexts (plain http, file://).
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    document.body.removeChild(area);
  }
  btn.textContent = ok ? t('copied') : t('copyFailed');
  window.setTimeout(() => { btn.textContent = t('copy'); }, 1600);
}

async function loadWordList() {
  setStatus('', 'statusLoading');
  render();

  let response;
  try {
    response = await fetch(WORDLIST_URL, { cache: 'no-store' });
  } catch (err) {
    return failLoad('statusErrorFetch');
  }
  if (!response.ok) {
    setStatus('err', 'statusError', { reason: 'HTTP ' + response.status }, true);
    reset();
    return;
  }

  const text = await response.text();
  const words = text.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);

  if (words.length !== EXPECTED_WORDS) return failLoad('statusErrorCount');
  if (!words.every((w) => /^[a-z]+$/.test(w))) return failLoad('statusErrorCharset');
  for (let i = 1; i < words.length; i++) {
    if (words[i - 1] >= words[i]) return failLoad('statusErrorOrder');
  }

  state.words = words;
  state.rolls = [];
  if (!state.hasCrypto) {
    setStatus('err', 'statusNoCrypto');
    render();
    return;
  }
  setReadyStatus();
  generate();
  render();
}

function failLoad(reasonKey) {
  setStatus('err', 'statusError', { reasonKey: reasonKey }, reasonKey === 'statusErrorFetch');
  reset();
}

function reset() {
  state.words = null;
  state.rolls = [];
  render();
}

/* ---------- init ---------- */

(function init() {
  const navLang = navigator.language || (navigator.languages && navigator.languages[0]) || 'en';
  state.lang = String(navLang).toLowerCase().indexOf('id') === 0 ? 'id' : 'en';
  initControls();
  loadWordList();
})();
