document.addEventListener('DOMContentLoaded', () => {
    // === SELEKTORY ELEMENTÓW DOM ===
    const scriptListContainer = document.getElementById('script-list-container');
    const scriptDetailsContainer = document.getElementById('script-details-container');
    const scriptList = document.getElementById('script-list');
    const scriptNameDetails = document.getElementById('script-name-details');
    const scriptDescription = document.getElementById('script-description');
    const backButton = document.getElementById('back-button');
    const copyButton = document.getElementById('copy-button');

    // Kontenery i listy zależności
    const requiresContainer = document.getElementById('requires-scripts-container');
    const requiresList = document.getElementById('requires-scripts-list');
    const requiredByContainer = document.getElementById('required-by-container');
    const requiredByList = document.getElementById('required-by-list');
    
   
    const scripts = [
        { id: 1, name: "Skrypt do pobierania kolorów ze strony głównej drzwi", description: "Na stronie głównej produktu z drzwiami otwórz konsolę przeglądarki i wklej skrypt. Skrypt wyszuka sekcję z kolorami (apo-kolor), odczyta tylko widoczne kafelki kolorów i zwróci listę ich nazw w tablicy descriptions. Wynik zobaczysz w tabeli w konsoli — możesz go też skopiować do zmiennej, a następnie wkleić do skryptu w panelu admina w zmiennej COLORS, żeby automatycznie zaznaczyć te same kolory.", 
            script: `(function () {
const container = document.querySelector('.apo-kolor .mw-apo-control');
if (!container) { console.warn("Nie znaleziono .mw-apo-control wewnątrz .apo-kolor!"); return []; }
const tiles = Array.from(
  container.querySelectorAll('div[x-show="value.isshow"], div[x-show="value.isShow"]')
);
const visibleTiles = tiles.filter(el =>
  el.getClientRects().length > 0 &&
  window.getComputedStyle(el).visibility !== 'hidden'
);
const raw = visibleTiles.map(tile => {
  const p = tile.querySelector('p.font-bold') || tile.querySelector('p');
  return p ? p.textContent.trim() : '';
}).filter(Boolean);
const seen = new Set();
const descriptions = raw.filter(txt => {
  const key = txt.toLowerCase().normalize("NFD").replace(/\\p{Diacritic}/gu,"").replace(/\\s+/g," ").trim();
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});
console.table(descriptions);
if (typeof copy === 'function') copy(JSON.stringify(descriptions, null, 2));
return descriptions;
})();`,  dependencies: [2] },
        { id: 2, name: "Skrypt do automatycznego wybierania kolorów w panelu admina w drzwiach w cesze kolor-producenta", description: "W panelu admina po wejściu w General Information otwórz konsolę przeglądarki, wklej skrypt i w zmiennej COLORS podmień listę kolorów, które wcześniej pobrałeś ze strony głównej produktu z drzwiami. Skrypt sam wyszuka pole Kolor producenta i zaznaczy wewnątrz niego odpowiednie opcje.", script: `(function () {
  /* === PODMIEŃ TĘ TABLICĘ NA SWOJĄ === */
  const COLORS = [
    'Śnieżnobiały GREKO',
    'Kamiennoszary ST CPL',
    'Dąb szary ST CPL'
  ];
  /* === NIC PONIŻEJ NIE ZMIENIAJ === */

  // Ręczna normalizacja polskich znaków + czyszczenie białych znaków
  const mapPL = {
    'ą':'a','ć':'c','ę':'e','ł':'l','ń':'n','ó':'o','ś':'s','ż':'z','ź':'z',
    'Ą':'a','Ć':'c','Ę':'e','Ł':'l','Ń':'n','Ó':'o','Ś':'s','Ż':'z','Ź':'z'
  };
  const normalize = (s) => (s||'')
    .toString()
    .replace(/[\u00C0-\u024F]/g, ch => mapPL[ch] ?? ch) // zdejmij PL diakrytyki ręcznie
    .normalize('NFD')                                   // i ewentualne inne akcenty
    .replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/\s+/g,' ')
    .trim();

  const wanted = (Array.isArray(COLORS) ? COLORS : [])
    .map(x => typeof x === 'string' ? x : (x?.title || x?.description || ''))
    .map(s => s.trim())
    .filter(Boolean);

  if (!wanted.length) { console.warn('Brak kolorów do zaznaczenia.'); return; }

  // Znajdź właściwy select w podanym polu
  const select =
    document.querySelector('.admin__field[data-index="kolor_producenta_drzwi_wewnetrzne"] select.admin__control-multiselect') ||
    document.querySelector('#W79G1C7') ||
    document.querySelector('select[name="product[kolor_producenta_drzwi_wewnetrzne]"]');

  if (!select) { console.warn("Nie znaleziono selecta pola 'Kolor producenta'."); return; }

  const options = Array.from(select.options);

  // Zbuduj warianty porównawcze dla każdej opcji (text + data-title)
  const optionData = options.map(opt => {
    const text = (opt.textContent || '').trim();
    const title = (opt.getAttribute('data-title') || '').trim();
    const normText  = normalize(text);
    const normTitle = normalize(title);
    // czasem tekst i data-title różnią się – miej oba
    return { opt, text, title, normText, normTitle };
  });

  // Wyczyść zaznaczenia
  options.forEach(o => o.selected = false);

  // Strategia dopasowania: exact po text, exact po data-title, zawieranie w obie strony
  function findMatch(targetRaw) {
    const t = normalize(targetRaw);

    let idx = optionData.findIndex(o => o.normText === t || o.normTitle === t);
    if (idx !== -1) return idx;

    idx = optionData.findIndex(o => o.normText.includes(t) || o.normTitle.includes(t));
    if (idx !== -1) return idx;

    idx = optionData.findIndex(o => t.includes(o.normText) || t.includes(o.normTitle));
    if (idx !== -1) return idx;

    return -1;
  }

  const results = wanted.map(raw => {
    const i = findMatch(raw);
    if (i !== -1) {
      optionData[i].opt.selected = true;
      return { input: raw, matched: optionData[i].text, value: optionData[i].opt.value };
    }
    return { input: raw, matched: null, value: null };
  });

  // Wyzwól eventy, aby Magento/KO zareagowało
  select.dispatchEvent(new Event('input',  { bubbles: true }));
  select.dispatchEvent(new Event('change', { bubbles: true }));

  // Podsumowanie
  console.log('Użyty select:', select);
  console.table(results);
})();
`, dependencies: [1]},
        { id: 3, name: "Główny skrypt: Rejestracja użytkownika", description: "Rejestruje użytkownika, również walidując email.", script: "const registerUser = (email) => { if (isValidEmail(email)) { console.log('Rejestracja...'); } };",  },
        { id: 4, name: "Skrypt niezależny: Generator haseł", description: "Tworzy losowe, bezpieczne hasło.", script: "const generatePassword = () => Math.random().toString(36).slice(-8);" }
    ];


    let currentScript = null;

    // === GŁÓWNE FUNKCJE WYŚWIETLAJĄCE ===

    const renderScriptList = () => {
        scriptList.innerHTML = '';
        
        scripts.forEach(script => {
            const li = document.createElement('li');
            li.className = 'script-item';
            li.dataset.id = script.id;
            
            // Główna część elementu listy
            const mainDiv = document.createElement('div');
            mainDiv.className = 'script-item-main';
            mainDiv.innerHTML = `<i class="fa-solid fa-file-code"></i> <span>${script.name}</span>`;
            mainDiv.addEventListener('click', () => showDetailsView(script.id));
            li.appendChild(mainDiv);

            // Jeśli skrypt ma zależności, stwórz zagnieżdżoną listę
            if (script.dependencies && script.dependencies.length > 0) {
                const depList = document.createElement('ul');
                depList.className = 'dependencies-list';

                script.dependencies.forEach(depId => {
                    const dependency = scripts.find(s => s.id === depId);
                    if (dependency) {
                        const depLi = document.createElement('li');
                        depLi.innerHTML = `<i class="fa-solid fa-puzzle-piece"></i> ${dependency.name}`;
                        depLi.addEventListener('click', (e) => {
                            e.stopPropagation(); // Zapobiegaj kliknięciu w rodzica
                            showDetailsView(dependency.id);
                        });
                        depList.appendChild(depLi);
                    }
                });
                li.appendChild(depList);
            }
            scriptList.appendChild(li);
        });
    };
    
    const showDetailsView = (id) => {
        currentScript = scripts.find(script => script.id === id);
        if (!currentScript) return;

        // Resetuj widok
        requiresContainer.classList.add('hidden');
        requiredByContainer.classList.add('hidden');
        requiresList.innerHTML = '';
        requiredByList.innerHTML = '';
        
        // Ustaw podstawowe info
        scriptNameDetails.innerHTML = `<i class="fa-solid fa-code-branch"></i> ${currentScript.name}`;
        scriptDescription.textContent = currentScript.description;

        // Sekcja 1: Czego ten skrypt wymaga (dependencies)
        if (currentScript.dependencies && currentScript.dependencies.length > 0) {
            currentScript.dependencies.forEach(depId => {
                const dependency = scripts.find(s => s.id === depId);
                if (dependency) {
                    const li = document.createElement('li');
                    li.textContent = dependency.name;
                    li.addEventListener('click', () => showDetailsView(dependency.id));
                    requiresList.appendChild(li);
                }
            });
            requiresContainer.classList.remove('hidden');
        }

        // Sekcja 2: Jakie skrypty wymagają tego (dependents)
        const dependents = scripts.filter(s => s.dependencies && s.dependencies.includes(currentScript.id));
        if (dependents.length > 0) {
            dependents.forEach(dep => {
                const li = document.createElement('li');
                li.textContent = dep.name;
                li.addEventListener('click', () => showDetailsView(dep.id));
                requiredByList.appendChild(li);
            });
            requiredByContainer.classList.remove('hidden');
        }
        
        scriptListContainer.classList.add('hidden');
        scriptDetailsContainer.classList.remove('hidden');
    };
    
    const showListView = () => {
        scriptDetailsContainer.classList.add('hidden');
        scriptListContainer.classList.remove('hidden');
        currentScript = null;
    };
    
    // === PODPIĘCIE EVENTÓW ===
    backButton.addEventListener('click', showListView);
    
    copyButton.addEventListener('click', () => {
        if (currentScript) {
            navigator.clipboard.writeText(currentScript.script).then(() => {
                copyButton.innerHTML = `<i class="fa-solid fa-check"></i> Skopiowano!`;
                setTimeout(() => {
                    copyButton.innerHTML = `<i class="fa-regular fa-copy"></i> Skopiuj kod`;
                }, 2000);
            });
        }
    });

    // === INICJALIZACJA APLIKACJI ===
    renderScriptList(); 
});