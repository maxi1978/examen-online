(function() {
  // Verificar autenticación
  const student = JSON.parse(localStorage.getItem('examStudent'));
  if (!student) {
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('studentInfo').textContent = `${student.apellido}, ${student.nombre} (DNI: ${student.dni})`;

  // Cargar preguntas
  let questions = [];
  try {
    const data = localStorage.getItem('examQuestions');
    if (!data) {
      alert('No hay examen configurado. Contacte al profesor.');
      window.location.href = 'index.html';
      return;
    }
    questions = JSON.parse(data);
  } catch(e) {
    alert('Error al cargar el examen.');
    window.location.href = 'index.html';
    return;
  }

  let currentQuestion = 0;
  let answers = {};
  let timers = {};
  let quizSubmitted = false;
  window.quizSubmitted = false;

  // Renderizar pregunta
  function renderQuestion() {
    const q = questions[currentQuestion];
    const container = document.getElementById('quizContent');
    const answered = answers[currentQuestion] || [];

    let html = `<div class="question-card">`;
    html += `<h3>Pregunta ${currentQuestion + 1} de ${questions.length}</h3>`;
    html += `<p class="question-text">${q.text}</p>`;
    html += `<p class="question-info">Puntaje: ${q.points} pts | Tiempo: ${q.time}s</p>`;

    if (q.type === 'single') {
      q.options.forEach((opt, i) => {
        const checked = answered.includes(i) ? 'checked' : '';
        html += `<label class="option-label">
          <input type="radio" name="q${currentQuestion}" value="${i}" ${checked} onchange="saveAnswer(${currentQuestion}, ${i})">
          ${opt}
        </label>`;
      });
    } else if (q.type === 'multiple') {
      q.options.forEach((opt, i) => {
        const checked = answered.includes(i) ? 'checked' : '';
        html += `<label class="option-label">
          <input type="checkbox" name="q${currentQuestion}" value="${i}" ${checked} onchange="toggleMultiAnswer(${currentQuestion}, ${i})">
          ${opt}
        </label>`;
      });
    }

    html += `</div>`;
    container.innerHTML = html;

    // Actualizar botones
    document.getElementById('prevBtn').style.display = currentQuestion === 0 ? 'none' : 'inline-block';
    document.getElementById('nextBtn').style.display = currentQuestion === questions.length - 1 ? 'none' : 'inline-block';
    document.getElementById('submitBtn').style.display = currentQuestion === questions.length - 1 ? 'inline-block' : 'none';

    // Iniciar timer
    startTimer(currentQuestion);
  }

  // Timer
  function startTimer(index) {
    if (timers[index]) clearInterval(timers[index]);

    let timeLeft = questions[index].time;
    const timerEl = document.getElementById('timer');

    function updateDisplay() {
      const min = Math.floor(timeLeft / 60);
      const sec = timeLeft % 60;
      timerEl.textContent = `⏱️ ${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
      timerEl.style.color = timeLeft <= 10 ? '#e74c3c' : timeLeft <= 30 ? '#f39c12' : '#2ecc71';
    }

    updateDisplay();
    timers[index] = setInterval(() => {
      timeLeft--;
      updateDisplay();
      if (timeLeft <= 0) {
        clearInterval(timers[index]);
        if (index === questions.length - 1) {
          submitQuiz();
        } else {
          document.getElementById('timeUpModal').style.display = 'flex';
        }
      }
    }, 1000);
  }

  // Guardar respuesta single
  window.saveAnswer = function(qIndex, optIndex) {
    answers[qIndex] = [optIndex];
  };

  // Guardar respuesta multiple
  window.toggleMultiAnswer = function(qIndex, optIndex) {
    if (!answers[qIndex]) answers[qIndex] = [];
    const idx = answers[qIndex].indexOf(optIndex);
    if (idx > -1) {
      answers[qIndex].splice(idx, 1);
    } else {
      answers[qIndex].push(optIndex);
    }
  };

  // Navegación
  window.nextQuestion = function() {
    if (currentQuestion < questions.length - 1) {
      currentQuestion++;
      renderQuestion();
    }
  };

  window.prevQuestion = function() {
    if (currentQuestion > 0) {
      currentQuestion--;
      renderQuestion();
    }
  };

  // Enviar examen
  window.submitQuiz = function() {
    if (quizSubmitted) return;
    quizSubmitted = true;
    window.quizSubmitted = true;

    // Cerrar todos los timers
    Object.values(timers).forEach(t => clearInterval(t));

    // Calcular puntaje
    let totalScore = 0;
    let maxScore = 0;
    let results = questions.map((q, i) => {
      maxScore += q.points;
      const userAnswer = answers[i] || [];
      let score = 0;

      if (q.type === 'single') {
        if (userAnswer[0] === q.correct[0]) {
          score = q.points;
        }
      } else if (q.type === 'multiple') {
        const correctSet = new Set(q.correct);
        const userSet = new Set(userAnswer);
        if (correctSet.size === userSet.size && [...correctSet].every(c => userSet.has(c))) {
          score = q.points;
        } else {
          // Puntaje parcial: aciertos menos errores
          let hits = 0, penalties = 0;
          userSet.forEach(u => { if (correctSet.has(u)) hits++; else penalties++; });
          score = Math.max(0, (hits - penalties) * (q.points / q.correct.length));
        }
      }

      totalScore += score;
      return { questionIndex: i, userAnswer, correct: q.correct, score, maxScore: q.points };
    });

    const examData = {
      student,
      results,
      totalScore,
      maxScore,
      timestamp: Date.now()
    };

    // Enviar a Google Sheets
    sendToGoogleSheets(examData);

    // Guardar localmente para feedback
    localStorage.setItem(`examResult_${student.dni}`, JSON.stringify(examData));

    // Mostrar resultado temporal
    const container = document.getElementById('quizContent');
    container.innerHTML = `
      <div class="result-card">
        <h2>✅ Examen enviado correctamente</h2>
        <p>Sus respuestas han sido registradas.</p>
        <p>Podrá ver sus resultados cuando el profesor habilite el feedback.</p>
        <button class="btn btn-primary" onclick="window.location.href='index.html'">Volver al inicio</button>
      </div>
    `;
    document.querySelector('.quiz-footer').style.display = 'none';
    document.getElementById('timer').textContent = '✅ Enviado';
  };

  // Enviar a Google Sheets vía Apps Script
  function sendToGoogleSheets(data) {
    const GAS_URL = localStorage.getItem('gasUrl') || '';
    if (!GAS_URL) {
      console.warn('Google Apps Script URL no configurada. Los datos se guardan solo localmente.');
      return;
    }

    fetch(GAS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(err => console.error('Error enviando a Sheets:', err));
  }

  // Iniciar
  renderQuestion();
})();