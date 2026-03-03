// Utilidades
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

// Escape seguro para usar texto del usuario dentro de un RegExp.
function escapeRegExp(str){
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Botones de copiar código
function setupCopy(){
  $$('.copy').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-copy');
      const el = document.getElementById(id);
      if(!el) return;
      const text = el.innerText;
      try{
        await navigator.clipboard.writeText(text);
        const old = btn.textContent;
        btn.textContent = '¡Copiado!';
        setTimeout(()=> btn.textContent = old, 900);
      }catch(e){
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        const old = btn.textContent;
        btn.textContent = '¡Copiado!';
        setTimeout(()=> btn.textContent = old, 900);
      }
    });
  });
}

// Navegación con scroll spy
function setupScrollSpy(){
  const links = $$('.navlink');
  const mainSections = $$('main section[id]');
  const sectionById = new Map(mainSections.map(s => [s.id, s]));

  const OFFSET = 14;
  const ACTIVATE_AT = 120;

  // Scroll suave + aterrizaje exacto
  links.forEach(a => {
    a.addEventListener('click', (e) => {
      const hash = a.getAttribute('href');
      if(!hash || !hash.startsWith('#')) return;
      e.preventDefault();

      if(hash === '#top'){
        history.replaceState(null, '', hash);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const id = hash.slice(1);
      const target = sectionById.get(id) || document.getElementById(id);
      if(!target) return;

      history.replaceState(null, '', hash);
      const top = target.getBoundingClientRect().top + window.scrollY - OFFSET;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  function setActive(id){
    links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#'+id));
  }

  function onScroll(){
    if(!mainSections.length) return;
    const y = window.scrollY + ACTIVATE_AT;
    let currentId = mainSections[0].id;

    for(const s of mainSections){
      if(s.offsetTop <= y) currentId = s.id;
      else break;
    }

    setActive(currentId);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  requestAnimationFrame(() => {
    if(location.hash && location.hash !== '#top'){
      const id = location.hash.slice(1);
      const target = sectionById.get(id);
      if(target){
        const top = target.getBoundingClientRect().top + window.scrollY - OFFSET;
        window.scrollTo({ top });
      }
    }
    onScroll();
  });
}

// Progreso de lectura
function setupProgress(){
  const bar = $('#progressBar');
  const label = $('#progressLabel');
  const main = $('#main');

  function onScroll(){
    const total = main.scrollHeight - window.innerHeight;
    const scrolled = window.scrollY;
    const pct = total > 0 ? Math.min(100, Math.max(0, (scrolled / total) * 100)) : 0;
    bar.style.width = pct.toFixed(0) + '%';
    label.textContent = pct.toFixed(0) + '%';
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();
}

// Resaltado de búsqueda
function clearMarks(){
  $$('mark').forEach(m => {
    const parent = m.parentNode;
    const text = document.createTextNode(m.textContent);
    parent.replaceChild(text, m);
    parent.normalize();
  });
}

function highlight(term){
  if(!term) return;

  const root = $('#main');
  if(!root) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node){
      if(!node.parentElement) return NodeFilter.FILTER_REJECT;
      const tag = node.parentElement.tagName;
      if(['SCRIPT','STYLE','NOSCRIPT'].includes(tag)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodes = [];
  while(walker.nextNode()) nodes.push(walker.currentNode);

  const escaped = escapeRegExp(term);
  const re = new RegExp(escaped, 'ig');

  nodes.forEach(node => {
    if(!node.nodeValue || node.nodeValue.trim().length === 0) return;

    const parent = node.parentNode;
    if(parent && parent.closest && parent.closest('code')) return;

    const val = node.nodeValue;
    re.lastIndex = 0;
    if(!re.test(val)) return;
    re.lastIndex = 0;

    const frag = document.createDocumentFragment();
    let lastIndex = 0;

    val.replace(re, (match, offset) => {
      frag.appendChild(document.createTextNode(val.slice(lastIndex, offset)));
      const mark = document.createElement('mark');
      mark.textContent = match;
      frag.appendChild(mark);
      lastIndex = offset + match.length;
    });

    frag.appendChild(document.createTextNode(val.slice(lastIndex)));
    parent.replaceChild(frag, node);
  });
}

function setupSearch(){
  const input = $('#search');
  const clear = $('#clear');
  if(!input || !clear) return;

  function run(){
    clearMarks();
    const term = input.value.trim();
    highlight(term);
  }

  input.addEventListener('input', () => {
    window.clearTimeout(input._t);
    input._t = window.setTimeout(run, 120);
  });

  clear.addEventListener('click', () => {
    input.value = '';
    clearMarks();
    input.focus();
  });
}

// Botón imprimir
function setupButtons(){
  $('#print')?.addEventListener('click', () => window.print());
}

// Auto-tests (consola del navegador)
function runSelfTests(){
  const samples = [
    'indentación',
    'if',
    '[test]',
    'a+b',
    '(x)',
    'foo\\bar',
    '$money',
    'dot.',
    '^start$',
    'pipe|or'
  ];

  samples.forEach(s => {
    const esc = escapeRegExp(s);
    const re = new RegExp(esc, 'ig');
    console.assert(re.test('___' + s + '___'), 'SelfTest RegExp falló para:', s);
  });

  console.assert(typeof highlight === 'function', 'SelfTest: highlight no existe');
  console.assert(typeof clearMarks === 'function', 'SelfTest: clearMarks no existe');
}

// Inicialización
setupCopy();
setupButtons();
setupScrollSpy();
setupProgress();
setupSearch();
runSelfTests();
