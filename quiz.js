const student = JSON.parse(localStorage.getItem('examStudent'));
if (!student) window.location.href = 'index.html';

document.getElementById('studentInfo').textContent = `${student.apellido}, ${student.nombre} (DNI: ${student.dni})`;

const questions = JSON.parse(localStorage.getItem('examQuestions') || '[]');
const config = JSON.parse(localStorage.getItem('examConfig') || '{}');
if (!questions.length) { alert('No hay examen configurado.'); window.location.href='index.html'; }

let current = 0, answers = {}, timerInt, timeLeft = config.totalTime || 2700;
window.quizSubmitted = false;

function startTimer() {
  const upd = () => {
    const m = Math.floor(timeLeft/60), s = timeLeft%60;
    document.getElementById('timer').textContent = `⏱️ ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    document.getElementById('timer').style.color = timeLeft < 120 ? '#e74c3c' : '#2ecc71';
  };
  upd();
  timerInt = setInterval(() => {
    timeLeft--; upd();
    if (timeLeft <= 0) { clearInterval(timerInt); document.getElementById('timeModal').style.display='flex'; }
  }, 1000);
}

function render() {
  const q = questions[current];
  const ans = answers[current] || [];
  let html = `<div class="q-card"><h3>Pregunta ${current+1}</h3><p>${q.text} <span class="badge">${q.type==='single'?'Única':'Múltiple'}</span></p>`;
  q.options.forEach((o,i) => {
    const checked = ans.includes(i) ? 'checked' : '';
    const type = q.type === 'single' ? 'radio' : 'checkbox';
    html += `<label class="opt-label"><input type="${type}" name="q${current}" value="${i}" ${checked} onchange="save(${current},${i})"> ${o}</label>`;
  });
  html += `</div>`;
  document.getElementById('quizContent').innerHTML = html;
  document.getElementById('qCounter').textContent = `${current+1} / ${questions.length}`;
  document.getElementById('btnPrev').style.display = current ? 'inline-block' : 'none';
  document.getElementById('btnNext').style.display = current < questions.length-1 ? 'inline-block' : 'none';
  document.getElementById('btnSubmit').style.display = current === questions.length-1 ? 'inline-block' : 'none';
}

window.save = (q,i) => {
  if (!answers[q]) answers[q] = [];
  if (questions[q].type === 'single') { answers[q] = [i]; }
  else { const idx = answers[q].indexOf(i); idx > -1 ? answers[q].splice(idx,1) : answers[q].push(i); }
};

window.prev = () => { if(current>0){current--; render();} };
window.next = () => { if(current<questions.length-1){current++; render();} };

window.submit = () => {
  if (window.quizSubmitted) return;
  window.quizSubmitted = true;
  clearInterval(timerInt);
  document.getElementById('timeModal').style.display = 'none';

  let raw = 0, maxRaw = 0;
  const results = questions.map((q,i) => {
    maxRaw += q.points;
    const user = answers[i] || [];
    let score = 0;
    if (q.type === 'single') {
      score = user[0] === q.correct[0] ? q.points : 0;
    } else {
      const correctSet = new Set(q.correct);
      const w = q.points / correctSet.size;
      let hits = 0, misses = 0;
      user.forEach(u => correctSet.has(u) ? hits++ : misses++);
      score = Math.max(0, (hits - misses) * w);
    }
    raw += score;
    return { questionIndex: i, userAnswer: user, correct: q.correct, score };
  });

  const nota10 = maxRaw > 0 ? (raw / maxRaw * 10) : 0;
  const payload = { student, results, rawScore: raw, maxRawScore: maxRaw, finalScore10: parseFloat(nota10.toFixed(2)), timestamp: Date.now() };
  localStorage.setItem(`exam_${student.dni}`, JSON.stringify(payload));
  sendToSheets(payload);

  document.querySelector('.container').innerHTML = `<div class="res-card"><h2>✅ Examen enviado</h2><p>Puede ver su nota cuando el profesor lo habilite.</p><a href="index.html" class="btn btn-primary">Volver</a></div>`;
};

function sendToSheets(data) {
  const url = localStorage.getItem('gasUrl');
  if (!url) return;
  fetch(url, { method:'POST', mode:'no-cors', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }).catch(console.error);
}

startTimer(); render();