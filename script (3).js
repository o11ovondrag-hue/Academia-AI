document.addEventListener('DOMContentLoaded', () => {
  const GEMINI_API_KEY = "AQ.Ab8RN6IFSY0xzB-s1bjwu_ON44n5FeeQKLuVzRb0p1GHuFCJ8g";

  // Хранилище сгенерированных силлабусов
  const savedSyllabi = [];

  // --- 1. ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК ---
  const navItems = document.querySelectorAll('.nav-item');
  const tabContents = document.querySelectorAll('.tab-content');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.getAttribute('data-tab');

      navItems.forEach(nav => nav.classList.remove('active'));
      tabContents.forEach(tab => tab.classList.remove('active'));

      item.classList.add('active');
      const activeContent = document.getElementById(`tab-${targetTab}`);
      if (activeContent) activeContent.classList.add('active');
    });
  });

  // --- 2. ФУНКЦИЯ ЗАПРОСА К GEMINI API ---
  async function callGemini(promptText) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Ошибка API Gemini");

    let raw = data.candidates[0].content.parts[0].text;
    return raw.replace(/```json/g, '').replace(/```/g, '').trim();
  }

  // Вспомогательная функция для генерации HTML структуры силлабуса
  function renderSyllabusHTML(data) {
    return `
      <div class="syllabus-card-content" style="padding: 16px; background: #ffffff; border-radius: 8px; margin-top: 12px; border: 1px solid #e2e8f0;">
        <h2 style="margin-top: 0; color: #0f172a;">🎓 ${data.course_title}</h2>
        <p><strong>Уровень:</strong> ${data.academic_level} | <strong>Длительность:</strong> ${data.weeks_count} недель</p>
        <p style="margin-top: 8px; color: #334155;"><strong>Описание:</strong> ${data.summary}</p>
        <hr style="margin: 16px 0; border: 0; border-top: 1px solid #e2e8f0;">
        <h3 style="color: #1e293b;">Программа занятий по неделям:</h3>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${data.schedule.map(s => `
            <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #cbd5e1;">
              <strong style="color: #0284c7;">Неделя ${s.week}: ${s.topic}</strong>
              <p style="margin: 6px 0; color: #334155;">📖 ${s.lecture}</p>
              <small style="color: #64748b;">📚 Литература: ${s.reading}</small>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // --- 3. ГЕНЕРАЦИЯ СИЛЛАБУСА В SINGLE-PROMPT ---
  const generatorForm = document.getElementById('generator-form');
  const loader = document.getElementById('loader');
  const resultContainer = document.getElementById('result-container');
  const outputContent = document.getElementById('output-content');
  const btnGenerate = document.getElementById('btn-generate');

  if (generatorForm) {
    generatorForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = document.getElementById('course-title').value.trim();
      const level = document.getElementById('course-level').value;
      const domain = document.getElementById('course-domain').value;
      const weeks = document.getElementById('course-weeks').value;
      const lang = document.getElementById('course-lang').value;

      if (!title) return;

      loader.classList.remove('hidden');
      resultContainer.classList.add('hidden');
      btnGenerate.disabled = true;

      const prompt = `Сформируй академический курс на языке "${lang}".
Название: "${title}"
Уровень: ${level}
Область: ${domain}
Длительность: ${weeks} недель.

Верни СТРОГО валидный JSON следующей структуры без Markdown-оформления:
{
  "course_title": "${title}",
  "academic_level": "${level}",
  "weeks_count": ${weeks},
  "summary": "Краткое описание курса",
  "schedule": [
    {"week": 1, "topic": "Тема недели", "lecture": "Содержание лекции", "reading": "Рекомендуемая литература"}
  ]
}`;

      try {
        const responseText = await callGemini(prompt);
        const data = JSON.parse(responseText);

        outputContent.innerHTML = renderSyllabusHTML(data);
        resultContainer.classList.remove('hidden');

        saveSyllabusToRegistry(data);

      } catch (err) {
        alert("Ошибка генерации: " + err.message);
      } finally {
        loader.classList.add('hidden');
        btnGenerate.disabled = false;
      }
    });
  }

  // --- 4. РЕЕСТР СИЛЛАБУСОВ ---
  function saveSyllabusToRegistry(syllabusData) {
    syllabusData.id = Date.now();
    syllabusData.createdAt = new Date().toLocaleDateString();
    savedSyllabi.unshift(syllabusData);
    renderSyllabiList();
  }

  function renderSyllabiList() {
    const listContainer = document.getElementById('syllabi-list');
    if (!listContainer) return;

    if (savedSyllabi.length === 0) {
      listContainer.innerHTML = `<li style="padding: 16px; color: #64748b;">Сохраненных силлабусов пока нет. Сформируйте курс во вкладке Single-Prompt.</li>`;
      return;
    }

    listContainer.innerHTML = savedSyllabi.map(item => `
      <li style="padding: 16px; border-bottom: 1px solid #e2e8f0; list-style: none;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="font-size: 16px; color: #0f172a;">${item.course_title}</strong>
            <div style="font-size: 13px; color: #64748b; margin-top: 4px;">
              Уровень: ${item.academic_level} • Недель: ${item.weeks_count} • Создан: ${item.createdAt}
            </div>
          </div>
          <button class="btn-secondary toggle-syllabus-btn" data-id="${item.id}">📖 Открыть полностью</button>
        </div>
        <div id="details-${item.id}" class="hidden" style="margin-top: 12px;">
          ${renderSyllabusHTML(item)}
        </div>
      </li>
    `).join('');

    document.querySelectorAll('.toggle-syllabus-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const detailsEl = document.getElementById(`details-${id}`);
        if (detailsEl) {
          const isHidden = detailsEl.classList.contains('hidden');
          detailsEl.classList.toggle('hidden');
          e.target.textContent = isHidden ? '🔼 Свернуть' : '📖 Открыть полностью';
        }
      });
    });
  }

  renderSyllabiList();

  // --- 5. ОБРАБОТКА И АНАЛИЗ ФАЙЛОВ / ТЕКСТА ---
  const fileInput = document.getElementById('file-input');
  const fileStatus = document.getElementById('file-status');
  const textInput = document.getElementById('source-text-input');
  const btnAnalyzeText = document.getElementById('btn-analyze-text');
  const analyticsLoader = document.getElementById('analytics-loader');
  const analyticsOutput = document.getElementById('analytics-output');

  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      fileStatus.textContent = `Чтение файла: ${file.name}...`;

      if (file.type === "application/pdf" || file.name.endsWith('.pdf')) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          let fullText = "";

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            fullText += content.items.map(item => item.str).join(" ") + "\n";
          }

          textInput.value = fullText;
          fileStatus.textContent = `Успешно загружено: ${file.name} (${pdf.numPages} стр.)`;
        } catch (err) {
          fileStatus.textContent = "Ошибка чтения PDF файла.";
          console.error(err);
        }
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          textInput.value = event.target.result;
          fileStatus.textContent = `Успешно загружено: ${file.name}`;
        };
        reader.readAsText(file);
      }
    });
  }

  if (btnAnalyzeText) {
    btnAnalyzeText.addEventListener('click', async () => {
      const text = textInput ? textInput.value.trim() : '';
      const category = document.getElementById('source-category')?.value || 'Journal Article';
      const identifier = document.getElementById('source-identifier')?.value || '';

      if (!text) {
        alert("Пожалуйста, загрузите файл или вставьте текст для анализа.");
        return;
      }

      analyticsLoader.classList.remove('hidden');
      analyticsOutput.classList.add('hidden');
      btnAnalyzeText.disabled = true;

      const prompt = `Проведи максимальный глубокий академический 8-уровневый разбор следующего текста.
Категория: ${category}
Идентификатор (DOI/ISSN): ${identifier}

Текст:
"""
${text.slice(0, 12000)}
"""

Верни СТРОГО валидный JSON (без маркдаун оберток) со следующей структурой:
{
  "title": "Название или ключевая тема статьи",
  "summary": "Развернутая концептуальная аннотация",
  "methodology": "Подробный разбор методологии, подходов и теоретической рамки",
  "key_arguments": [
    "Подробный тезис 1 с раскрытием внутренней логики автора",
    "Подробный тезис 2",
    "Подробный тезис 3"
  ],
  "sources_and_citations": [
    "Автор, Год — Теория / Концепция / Роль источника в исследовании",
    "Автор, Год — Теория / Концепция / Роль источника в исследовании"
  ],
  "empirical_base": "Эмпирическая база, кейсы, статистика, нормативные акты или архивы",
  "limitations": "Источниковедческая критика, ограничения исследования и пропущенные аспекты",
  "practical_value": "Практическая ценность для академической работы и преподавания"
}`;

      try {
        const responseText = await callGemini(prompt);
        const data = JSON.parse(responseText);

        analyticsOutput.innerHTML = `
          <div style="background: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #cbd5e1; font-family: sans-serif; color: #1e293b; line-height: 1.6;">
            <h2 style="margin-top: 0; color: #0284c7; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
              🧠 Глубокий 8-уровневый академический разбор
            </h2>
            
            ${data.title ? `<h3 style="color: #0f172a; margin-top: 16px;">📌 ${data.title}</h3>` : ''}

            <p style="margin-top: 12px;"><strong>1. Концептуальная аннотация:</strong><br>${data.summary}</p>

            <p style="margin-top: 12px;"><strong>2. Методология и теоретическая рамка:</strong><br>${data.methodology}</p>

            <div style="margin-top: 12px;">
              <strong>3. Ключевые аргументы и тезисы:</strong>
              <ul style="margin-top: 6px; padding-left: 20px;">
                ${data.key_arguments.map(arg => `<li style="margin-bottom: 6px;">${arg}</li>`).join('')}
              </ul>
            </div>

            <div style="margin-top: 12px;">
              <strong>4. Источниковая база и теоретические ссылки:</strong>
              <ul style="margin-top: 6px; padding-left: 20px; font-size: 14px; color: #334155;">
                ${data.sources_and_citations.map(src => `<li style="margin-bottom: 4px;">${src}</li>`).join('')}
              </ul>
            </div>

            <p style="margin-top: 12px;"><strong>5. Эмпирический корпус и данные:</strong><br>${data.empirical_base || 'Не указано'}</p>

            <p style="margin-top: 12px; background: #fff1f2; padding: 12px; border-left: 4px solid #f43f5e; border-radius: 4px;">
              <strong>6. Критика, ограничения и риски:</strong><br>${data.limitations}
            </p>

            <p style="margin-top: 12px; background: #f0fdf4; padding: 12px; border-left: 4px solid #22c55e; border-radius: 4px;">
              <strong>7. Практическая ценность для исследования:</strong><br>${data.practical_value || 'Заслуживает внедрения в учебный курс.'}
            </p>
          </div>
        `;

        analyticsOutput.classList.remove('hidden');
      } catch (err) {
        alert("Ошибка при разборе: " + err.message);
      } finally {
        analyticsLoader.classList.add('hidden');
        btnAnalyzeText.disabled = false;
      }
    });
  }

  // --- 6. КАЛЬКУЛЯТОР НАГРУЗКИ (ИСПРАВЛЕННЫЙ ДИНАМИЧЕСКИЙ ПЕРЕСЧЕТ) ---
  function calculateReadingLoad() {
    const tab = document.querySelector('.tab-content.active') || document;
    const inputs = tab.querySelectorAll('input[type="number"], input');

    if (inputs.length < 2) return;

    const pages = parseFloat(inputs[0].value) || 0;
    const weeks = parseFloat(inputs[1].value) || 0;

    if (pages <= 0 || weeks <= 0) return;

    let displayArea = document.getElementById('calc-live-result');
    if (!displayArea) {
      displayArea = document.createElement('div');
      displayArea.id = 'calc-live-result';
      const calcButton = Array.from(tab.querySelectorAll('button')).find(b => b.textContent.toLowerCase().includes('рассчитать') || b.textContent.toLowerCase().includes('calculate'));
      if (calcButton && calcButton.parentElement) {
        calcButton.parentElement.appendChild(displayArea);
      } else {
        tab.appendChild(displayArea);
      }
    }

    const pagesPerWeek = (pages / weeks).toFixed(1);
    const pagesPerDay = (pagesPerWeek / 5).toFixed(1);
    const hoursPerWeek = (pagesPerWeek / 10).toFixed(1);
    const ectsCredits = (hoursPerWeek * weeks / 30).toFixed(1);

    displayArea.innerHTML = `
      <div style="padding: 18px; background: #ffffff; border: 1px solid #0284c7; border-radius: 8px; margin-top: 16px; font-family: sans-serif; color: #1e293b; line-height: 1.5; box-shadow: 0 2px 6px rgba(0,0,0,0.05);">
        <h3 style="margin: 0 0 12px 0; color: #0284c7; font-size: 16px; display: flex; align-items: center; gap: 6px;">
          📊 Подробный расчет учебной нагрузки
        </h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; margin-bottom: 12px;">
          <div style="background: #f0f9ff; padding: 10px; border-radius: 6px; border: 1px solid #bae6fd;">
            <small style="color: #0369a1; display: block;">Страниц в неделю</small>
            <strong style="font-size: 18px; color: #0284c7;">${pagesPerWeek} стр.</strong>
          </div>
          <div style="background: #f0f9ff; padding: 10px; border-radius: 6px; border: 1px solid #bae6fd;">
            <small style="color: #0369a1; display: block;">Дневная норма (5 дн/нед)</small>
            <strong style="font-size: 18px; color: #0284c7;">~${pagesPerDay} стр/день</strong>
          </div>
          <div style="background: #f0f9ff; padding: 10px; border-radius: 6px; border: 1px solid #bae6fd;">
            <small style="color: #0369a1; display: block;">Время на чтение</small>
            <strong style="font-size: 18px; color: #0284c7;">~${hoursPerWeek} ч / нед</strong>
          </div>
        </div>
        <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #334155;">
          <li><strong>Оценка в ECTS:</strong> Данный объем академического чтения соответствует <strong>~${ectsCredits} ECTS</strong> трудоемкости.</li>
          <li><strong>Рекомендация:</strong> Для повышения усвоения материала распределяйте ${pagesPerDay} страниц на блоки по 25-30 минут чтения.</li>
        </ul>
      </div>
    `;
  }

  // Отслеживание кликов по кнопке
  document.addEventListener('click', (e) => {
    const targetBtn = e.target.closest('button');
    if (!targetBtn) return;

    const btnText = targetBtn.textContent.toLowerCase();
    if (btnText.includes('рассчитать') || btnText.includes('calculate')) {
      e.preventDefault();
      calculateReadingLoad();
    }
  });

  // Живое обновление при вводе любого числа в инпуты
  document.addEventListener('input', (e) => {
    if (e.target.tagName === 'INPUT') {
      calculateReadingLoad();
    }
  });
});