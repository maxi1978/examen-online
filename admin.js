(function() {
  let questions = JSON.parse(localStorage.getItem('examQuestions') || '[]');
  let optionIndex = 0;

  // Cargar URL de GAS
  const savedGasUrl = localStorage.getItem('gasUrl');
  if (savedGasUrl) document.getElementById('gasUrl').value = savedGasUrl;

  renderQuestionsList();
  updateCorrectOptions();

  window.saveGasUrl = function() {
    const url = document.getElementById('gasUrl').value.trim();
    if (url) {
      localStorage.setItem('gasUrl', url);
      alert('URL de Google Apps Script guardada.');
    }
  };

  window.addOption = function() {
    optionIndex++;
    const container = document.getElementById('optionsList');
    const div = document.createElement('div');
    div.className = 'option-input-row';
    div.innerHTML = `
      <input type="text" class="option-text" placeholder="Opción ${optionIndex}" data-index="${optionIndex - 1}">
      <button class="btn btn-small btn-danger" onclick="this.parentElement.remove(); updateCorrectOptions();">✕</button>
    `;
    container.appendChild(div);
    updateCorrectOptions();
  };

  window.toggleCorrectOptions = updateCorrectOptions;

  function updateCorrectOptions() {
    const type = document.getElementById('qType').value;
    const options = document.querySelectorAll('.option-text');
    const container = document.getElementById('correctOptions');
    container.innerHTML = '';

    options.forEach(opt => {
      const idx = opt.dataset.index;
      const label = document.createElement('label');
      label.className = 'option-label';
      const inputType = type === 'single' ? 'radio' : 'checkbox';
      label.innerHTML = `
        <input type="${inputType}" name="correctOption" value="${idx}">
        ${opt.placeholder || opt.value || `Opción ${parseInt(idx) + 1}`}
      `;
      container.appendChild(label);
    });
  }

  window.addQuestion = function() {
    const text = document.getElementById('qText').value.trim();
    if (!text) { alert('Ingrese el enunciado.'); return; }

    const type = document.getElementById('qType').value;
    const points = parseFloat(document.getElementById('qPoints').value) || 1;
    const time = parseInt(document.getElementById('qTime').value) || 60;

    const options = [];
    document.querySelectorAll('.option-text').forEach(el => {
      if (el.value.trim()) options.push(el.value.trim());
    });

    if (options.length < 2) { alert('Ingrese al menos 2 opciones.'); return; }

    const correct = [];
    document.querySelectorAll('input[name="correctOption"]:checked').forEach(el => {
      correct.push(parseInt(el.value));
    });

    if (correct.length === 0) { alert('Seleccione al menos una respuesta correcta.'); return; }

    questions.push({ text, type, options, correct, points, time });
    localStorage.setItem('examQuestions', JSON.stringify(questions));

    // Limpiar formulario
    document.getElementById('qText').value = '';
    document.getElementById('qPoints').value = '1';
    document.getElementById('qTime').value = '60';
    document.getElementById('optionsList').innerHTML = '';
    optionIndex = 0;
    updateCorrectOptions();
    renderQuestionsList();
  };

  function renderQuestionsList() {
    const list = document.getElementById('questionsList');
    document.getElementById('qCount').textContent = questions.length;

    if (questions.length === 0) {
      list.innerHTML = '<p>No hay preguntas cargadas.</p>';
      return;
    }

    list.innerHTML = questions.map((q, i) => `
      <div class="question-item">
        <strong>P${i + 1}:</strong> ${q.text}
        <span class="badge">${q.type === 'single' ? 'Única' : 'Múltiple'}</span>
        <span class="badge">${q.points} pts</span>
        <span class="badge">${q.time}s</span>
        <button class="btn btn-small btn-danger" onclick="removeQuestion(${i})">✕</button>
      </div>
    `).join('');
  }

  window.removeQuestion = function(index) {
    questions.splice(index, 1);
    localStorage.setItem('examQuestions', JSON.stringify(questions));
    renderQuestionsList();
  };

  window.clearQuestions = function() {
    if (confirm('¿Eliminar todas las preguntas?')) {
      questions = [];
      localStorage.removeItem('examQuestions');
      renderQuestionsList();
    }
  };

  window.publishExam = function() {
    if (questions.length === 0) { alert('Agregue al menos una pregunta.'); return; }
    localStorage.setItem('examPublished', JSON.stringify({
      published: true,
      date: Date.now()
    }));
    alert('✅ Examen publicado y listo para que los alumnos accedan.');
  };

  // Tabs
  window.showTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    event.target.classList.add('active');

    if (tabName === 'results') loadResults();
    if (tabName === 'feedback') checkFeedbackStatus();
  };

  // Resultados
  function loadResults() {
    const container = document.getElementById('resultsList');
    let html = '';
    let found = false;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('examResult_')) {
        found = true;
        const data = JSON.parse(localStorage.getItem(key));
        const pct = ((data.totalScore / data.maxScore) * 100).toFixed(1);
        html += `
          <div class="result-item">
            <strong>${data.student.apellido}, ${data.student.nombre}</strong> — DNI: ${data.student.dni}<br>
            Puntaje: ${data.totalScore} / ${data.maxScore} (${pct}%)<br>
            Fecha: ${new Date(data.timestamp).toLocaleString()}
          </div>
        `;
      }
    }

    if (!found) {
      // Intentar cargar desde GAS si hay URL
      const gasUrl = localStorage.getItem('gasUrl');
      if (gasUrl) {
        html = '<p><em>Intentando cargar resultados desde Google Sheets...</em></p>';
        fetchResultsFromSheets(gasUrl);
      } else {
        html = '<p>No hay resultados disponibles. Los alumnos aún no completaron el examen.</p>';
      }
    }

    container.innerHTML = html || '<p>No hay resultados.</p>';
  }

  async function fetchResultsFromSheets(url) {
    try {
      // Ajustar URL para GET
      const getUrl = url + '?action=getResults';
      const response = await fetch(getUrl);
      const data = await response.json();
      if (data && data.results && data.results.length > 0) {
        let html = '';
        data.results.forEach(r => {
          const pct = ((r.totalScore / r.maxScore) * 100).toFixed(1);
          html += `
            <div class="result-item">
              <strong>${r.student.apellido}, ${r.student.nombre}</strong> — DNI: ${r.student.dni}<br>
              Puntaje: ${r.totalScore} / ${r.maxScore} (${pct}%)<br>
              Fecha: ${new Date(r.timestamp).toLocaleString()}
            </div>
          `;
        });
        document.getElementById('resultsList').innerHTML = html;
      }
    } catch (e) {
      document.getElementById('resultsList').innerHTML += '<p style="color:#e74c3c;">Error al cargar desde Sheets. Revise la URL del Apps Script.</p>';
    }
  }

  // Feedback
  window.enableFeedback = function() {
    localStorage.setItem('feedbackEnabled', 'true');
    document.getElementById('feedbackStatus').textContent = '✅ Feedback habilitado. Los alumnos pueden ver sus resultados.';
    document.getElementById('feedbackStatus').style.color = '#2ecc71';
  };

  window.disableFeedback = function() {
    localStorage.removeItem('feedbackEnabled');
    document.getElementById('feedbackStatus').textContent = '❌ Feedback deshabilitado.';
    document.getElementById('feedbackStatus').style.color = '#e74c3c';
  };

  function checkFeedbackStatus() {
    const enabled = localStorage.getItem('feedbackEnabled');
    const el = document.getElementById('feedbackStatus');
    if (enabled === 'true') {
      el.textContent = '✅ Feedback habilitado actualmente.';
      el.style.color = '#2ecc71';
    } else {
      el.textContent = '❌ Feedback no habilitado.';
      el.style.color = '#e74c3c';
    }
  }

  // Agregar opciones iniciales
  addOption();
  addOption();
  addOption();
  addOption();
})();