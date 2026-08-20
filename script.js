document.addEventListener('DOMContentLoaded', () => {
  console.log("Academia-AI Script loaded: v3.1.0");

  // Расшифровка API ключа Gemini
  const ENCODED_KEY = "QVEuQWI4Uk42TDAxWUxxNUJzOGNDcloyLUFIMzJfZlZGSlN2dVpTbGVybEc1bXVTRjFGZ3c="; 
  const GEMINI_API_KEY = atob(ENCODED_KEY);

  // Хранилище сгенерированных силлабусов
  const savedSyllabi = [];

  // --- 1. НАДЕЖНОЕ ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК (Event Delegation) ---
  document.body.addEventListener('click', (e) => {
    const navBtn = e.target.closest('.nav-item');
    if (!navBtn) return;

    e.preventDefault();

    const targetTab = navBtn.getAttribute('data-tab');
    if (!targetTab) return;

    // Снимаем подсвечивание со всех кнопок
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    navBtn.classList.add('active');

    // Скрываем все страницы
    document.querySelectorAll('.tab-content').forEach(tab => {
      tab.classList.remove('active');
      tab.classList.add('hidden');
    });

    // Показываем целевую страницу
    const activeSection = document.getElementById(`tab-${targetTab}`);
    if (activeSection) {
      activeSection.classList.add('active');
      activeSection.classList.remove('hidden');
    }
  });

// --- 2. ЗАПРОС К API GEMINI ---
  async function callGemini(promptText) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }]
        })
      });

      const data = await response.json();

      if (response.ok && data.candidates && data.candidates[0]) {
        let raw = data.candidates[0].content.parts[0].text;
        return raw.replace(/```json/g, '').replace(/```/g, '').trim();
      } else {
        throw new Error(data.error?.message || "Ошибка API");
      }
    } catch (e) {
      throw new Error(e.message || "Не удалось подключиться к Gemini API.");
    }
  }
  // Рендер шаблона силлабуса
  function renderSyllabusHTML(data) {
    return `
      <div style="padding: 16px; background: #ffffff; border-radius: 8px; margin-top: 12px; border: 1px solid #e2e8f0;">
        <h2 style="margin-top: 0; color: #0f172a;">🎓 ${data.course_title}</h2>
        <p><strong>Уровень:</strong> ${data.academic_level} | <strong>Длительность:</strong> ${data.weeks_count} недель</p>
        <p style="margin-top: 8px; color: #334155;"><strong>Описание:</strong> ${data.summary}</p>
        <hr style="margin: 16px 0; border: 0; border-top: 1px solid #e2e8f0;">
        <h3 style="color: #1e293b; margin-bottom: 10px;">Программа занятий по неделям:</h3>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${data.schedule ? data.schedule.map(s => `
            <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #cbd5e1;">
              <strong style="color: #0284c7;">Неделя ${s.week}: ${s.topic}</strong>
              <p style="margin: 6px 0; color: #334155;">📖 ${s.lecture}</p>
              <small style="color: #64748b;">📚 Литература: ${s.reading}</small>
            </div>
          `).join('') : ''}
        </div>
      </div>
    `;
  }

  // --- 3. ГЕНЕРАЦИЯ СИЛЛАБУСА ---
  const generatorForm = document.getElementById('generator-form');
  if (generatorForm) {
    generatorForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = document.getElementById('course-title').value.trim();
      const level = document.getElementById('course-level').value;
      const domain = document.getElementById('course-domain').value;
      const weeks = document.getElementById('course-weeks').value;
      const lang = document.getElementById('course-lang').value;

      const loader = document.getElementById('loader');
      const resultContainer = document.getElementById('result-container');
      const outputContent = document.getElementById('output-content');
      const btnGenerate = document.getElementById('btn-generate');

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

        // Сохраняем в реестр
        data.id = Date.now();
        data.createdAt = new Date().toLocaleDateString();
        savedSyllabi.unshift(data);
        renderSyllabiList();

      } catch (err) {
        alert("Ошибка генерации: " + err.message);
      } finally {
        loader.classList.add('hidden');
        btnGenerate.disabled = false;
      }
    });
  }

  // --- 4. РЕЕСТР СИЛЛАБУСОВ ---
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
          <button class="btn-secondary toggle-syllabus-btn" data-id="${item.id}">📖 Открыть</button>
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
          e.target.textContent = isHidden ? '🔼 Свернуть' : '📖 Открыть';
        }
      });
    });
  }

  renderSyllabiList();

  // --- 5. ЧТЕНИЕ PDF/TXT И 8-УРОВНЕВЫЙ АНАЛИЗ ---
  const fileInput = document.getElementById('file-input');
  const fileStatus = document.getElementById('file-status');
  const textInput = document.getElementById('source-text-input');
  const btnAnalyzeText = document.getElementById('btn-analyze-text');

  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      fileStatus.textContent = `Чтение файла: ${file.name}...`;

      if (file.type === "application/pdf" || file.name.endsWith('.pdf')) {
        try {
          if (typeof pdfjsLib === 'undefined') {
            throw new Error("Библиотека PDF.js еще не загружена.");
          }
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

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
      const analyticsLoader = document.getElementById('analytics-loader');
      const analyticsOutput = document.getElementById('analytics-output');

      if (!text) {
        alert("Загрузите файл или вставьте текст для анализа.");
        return;
      }

      analyticsLoader.classList.remove('hidden');
      analyticsOutput.classList.add('hidden');
      btnAnalyzeText.disabled = true;

      const prompt = `Проведи академический 8-уровневый разбор следующего текста.
Категория: ${category}
Идентификатор: ${identifier}

Текст:
"""
${text.slice(0, 12000)}
"""

Верни СТРОГО валидный JSON (без маркдаун оберток) структуры:
{
  "title": "Тема статьи",
  "summary": "Концептуальная аннотация",
  "methodology": "Методология и рамка",
  "key_arguments": ["Тезис 1", "Тезис 2"],
  "sources_and_citations": ["Источник 1", "Источник 2"],
  "empirical_base": "Эмпирическая база",
  "limitations": "Критика и ограничения",
  "practical_value": "Практическая ценность"
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
            <p style="margin-top: 12px;"><strong>1. Аннотация:</strong><br>${data.summary}</p>
            <p style="margin-top: 12px;"><strong>2. Методология:</strong><br>${data.methodology}</p>
            <div style="margin-top: 12px;">
              <strong>3. Ключевые аргументы:</strong>
              <ul style="margin-top: 6px; padding-left: 20px;">
                ${data.key_arguments ? data.key_arguments.map(arg => `<li style="margin-bottom: 6px;">${arg}</li>`).join('') : ''}
              </ul>
            </div>
            <p style="margin-top: 12px; background: #fff1f2; padding: 12px; border-left: 4px solid #f43f5e; border-radius: 4px;">
              <strong>6. Критика и ограничения:</strong><br>${data.limitations}
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

  // --- 6. КАЛЬКУЛЯТОР НАГРУЗКИ ---
  const btnCalc = document.getElementById('btn-calc');
  if (btnCalc) {
    btnCalc.addEventListener('click', () => {
      const pages = parseFloat(document.getElementById('calc-pages')?.value) || 0;
      const weeks = parseFloat(document.getElementById('calc-weeks')?.value) || 0;

      if (pages <= 0 || weeks <= 0) {
        alert("Введите правильное число страниц и недель.");
        return;
      }

      const pagesPerWeek = (pages / weeks).toFixed(1);
      const pagesPerDay = (pagesPerWeek / 5).toFixed(1);
      const hoursPerWeek = (pagesPerWeek / 10).toFixed(1);
      const ectsCredits = (hoursPerWeek * weeks / 30).toFixed(1);

      let displayArea = document.getElementById('calc-live-result');
      if (!displayArea) {
        displayArea = document.createElement('div');
        displayArea.id = 'calc-live-result';
        document.getElementById('tab-time').appendChild(displayArea);
      }

      displayArea.innerHTML = `
        <div style="padding: 18px; background: #ffffff; border: 1px solid #0284c7; border-radius: 8px; margin-top: 16px;">
          <h3 style="margin: 0 0 12px 0; color: #0284c7; font-size: 16px;">📊 Расчет учебной нагрузки</h3>
          <p><strong>Страниц в неделю:</strong> ${pagesPerWeek} стр.</p>
          <p><strong>Дневная норма (5 дн/нед):</strong> ~${pagesPerDay} стр/день</p>
          <p><strong>Оценка в ECTS:</strong> ~${ectsCredits} ECTS credits</p>
        </div>
      `;
    });
  }
});
