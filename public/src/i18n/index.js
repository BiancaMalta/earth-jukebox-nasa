// AI-assisted: OpenAI Codex. Translate presentation without changing dataset keys.
let locale = 'en';
let translator = value => String(value ?? '');
const texts = new WeakMap();
export const getLocale = () => locale;
export const t = value => locale === 'pt-BR' ? translator(value) : String(value ?? '');

// Use this for live announcements and text focused in the same event handler.
// Retain its English source so a later language change is still reversible.
export function setLocalizedText(element, value) {
  if (!element) return;
  const source = String(value ?? ''), last = t(source);
  element.textContent = last;
  if (element.firstChild) texts.set(element.firstChild, {source, last});
}

export function createTranslator(catalogue) {
  const messages = catalogue.messages ?? {};
  const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = Object.entries(catalogue.templates ?? {}).map(([source, target]) => {
    const names = [], pieces = source.split(/(\{\w+\})/);
    const expression = pieces.map(piece => {
      if (/^\{\w+\}$/.test(piece)) {
        const name = piece.slice(1, -1);
        names.push(name);
        // Date fragments must not swallow the rest of a sentence or timestamp.
        const constraint = { year: '\\d{4}', day: '\\d{1,2}', time: '\\d{2}:\\d{2}(?::\\d{2})?' }[name];
        return '(' + (constraint ?? '[\\s\\S]*?') + ')';
      }
      return escape(piece);
    }).join('');
    return { regex: new RegExp('^' + expression + '$'), target, names, specificity: source.replace(/\{\w+\}/g, '').length };
  }).sort((a,b) => b.specificity - a.specificity);
  function translate(value, depth = 0) {
    const text = String(value ?? '');
    if (depth > 8 || !text.trim()) return text;
    const source = text.trim().replace(/\s+/g, ' ');
    const before = text.match(/^\s*/)[0], after = text.match(/\s*$/)[0];
    if (Object.hasOwn(messages, source)) return before + messages[source] + after;
    for (const { regex, target, names } of patterns) {
      const match = regex.exec(source);
      if (!match) continue;
      const variables = Object.fromEntries(names.map((name,index) => [name, translate(match[index + 1], depth + 1)]));
      return before + target.replace(/\{(\w+)\}/g, (_, name) => variables[name] ?? '') + after;
    }
    // Compose existing, complete phrases; never substitute arbitrary words.
    for (const separator of [' · ', '; ', '. ']) {
      if (!source.includes(separator)) continue;
      const pieces = source.split(separator);
      const converted = pieces.map(piece => translate(piece, depth + 1));
      if (converted.some((piece,index) => piece !== pieces[index])) return before + converted.join(separator) + after;
    }
    return text;
  }
  return translate;
}

export async function initI18n(doc = document) {
  let catalogue = {}, available = true;
  try {
    const response = await fetch(new URL('./pt.json', import.meta.url));
    if (!response.ok) throw Error('Could not load the language catalogue.');
    catalogue = await response.json();
  } catch (error) {
    // A missing translation must not prevent maps or audio from loading.
    available = false;
    console.warn('Portuguese translations unavailable:', error);
    const button = doc.querySelector('[data-language="pt-BR"]');
    if (button) {
      button.disabled = true;
      button.title = 'Português indisponível. Recarregue a página para tentar novamente.';
    }
  }
  translator = createTranslator(catalogue);
  const attributes = new WeakMap();
  const names = ['aria-label', 'aria-valuetext', 'data-spoken-label', 'data-spoken-description', 'title', 'alt', 'placeholder'];
  const ignored = element => element?.closest?.('script,style,noscript,[data-i18n-ignore]');
  const originalTitle = doc.title, meta = doc.querySelector('meta[name="description"]'), originalDescription = meta?.content;
  function text(node) {
    if (ignored(node.parentElement)) return;
    const record = texts.get(node);
    const source = record && node.data === record.last ? record.source : node.data;
    const last = t(source);
    texts.set(node, { source, last });
    if (node.data !== last) node.data = last;
  }
  function attrs(element) {
    if (ignored(element)) return;
    const saved = attributes.get(element) ?? new Map();
    for (const name of names) {
      if (!element.hasAttribute(name)) continue;
      const current = element.getAttribute(name), record = saved.get(name);
      const source = record && current === record.last ? record.source : current;
      const last = t(source);
      saved.set(name, { source, last });
      if (current !== last) element.setAttribute(name, last);
    }
    attributes.set(element, saved);
  }
  function visit(root) {
    if (root.nodeType === 3) return text(root);
    if (root.nodeType !== 1 || ignored(root)) return;
    attrs(root);
    const walker = doc.createTreeWalker(root, 5); // Elements and text.
    while (walker.nextNode()) {
      if (walker.currentNode.nodeType === 3) text(walker.currentNode);
      else attrs(walker.currentNode);
    }
  }
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'characterData') text(record.target);
      else if (record.type === 'attributes') attrs(record.target);
      else record.addedNodes.forEach(visit);
    }
  });
  observer.observe(doc.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: names });
  let initialized = false;
  function setLanguage(next) {
    if (!['en', 'pt-BR'].includes(next) || (!available && next !== 'en')) return;
    if (initialized && next === locale) return;
    initialized = true;
    locale = next;
    doc.documentElement.lang = next;
    try { localStorage.setItem('earth-jukebox-language', next); } catch { /* Storage can be unavailable. */ }
    visit(doc.body);
    doc.title = t(originalTitle);
    if (meta) meta.content = t(originalDescription);
    doc.querySelector('.language-switch')?.setAttribute('aria-label', next === 'pt-BR' ? 'Idioma' : 'Language');
    doc.querySelectorAll('[data-language]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.language === next)));
    doc.dispatchEvent(new CustomEvent('jukebox:languagechange', { detail: { language: next } }));
  }
  doc.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.language)));
  let initial = 'en';
  try { initial = localStorage.getItem('earth-jukebox-language') ?? 'en'; } catch { /* Default to English. */ }
  setLanguage(available && ['en', 'pt-BR'].includes(initial) ? initial : 'en');
  return { setLanguage, disconnect: () => observer.disconnect() };
}
