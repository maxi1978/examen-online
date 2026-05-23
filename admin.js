let bank = JSON.parse(localStorage.getItem('examBank') || '[]');
let optCount = 0;

document.getElementById('gasUrl').value = localStorage.getItem('gasUrl') || '';
renderBank();

window.showTab = t => {
  document.querySelectorAll('.tab-content').forEach(e => e.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(e => e.classList.remove('active'));
  document.getElementById(`tab-${t}`).classList.add('active');
  event.target.classList.add('active');
};

window.addOpt = () => {
  optCount++;
  const c = document.getElementById('optsContainer');
  const d = document.createElement('div'); d.className = 'opt-row';
  d.innerHTML = `<input type="text" class="opt-text" data-id="${optCount-1}" placeholder="Opción ${optCount}"><button class="btn btn-small btn-danger" onclick="this.parentElement.remove(); updateCorrectUI()">✕</button>`;
  c.appendChild(d); updateCorrectUI();
};

window.updateCorrectUI = () => {
  const type = document.getElementById('qType').value;
  const c = document.getElementById('correctUI'); c.innerHTML = '<label>Marcar correcta/s:</label>';
  document.querySelectorAll('.opt-text').forEach(o => {
    const t = type === 'single' ? 'radio' : 'checkbox';
    c.innerHTML += `<label class="opt-label"><input type="${t}" name="correct" value="${o.dataset.id}"> ${o.placeholder}</label> `;
  });
};

window.addToBank = () => {
  const text = document.getElementById('qText').value.trim();
  const type = document.getElementById('qType').value;
  const points = parseFloat(document.getElementById('qPoints').value) || 1;
  const options = [...document.querySelectorAll('.opt-text')].map(e => e.value.trim()).filter(v => v);
  const correct = [...document.querySelectorAll('input[name="correct"]:checked')].map(e => parseInt(e.value));

  if (!text || options.length < 2 || correct.length === 0) return alert('Complete correctamente enunciado, opciones y respuesta/s.');
  if (type === 'single' && correct.length > 1) return alert('Opción única solo permite 1 correcta.');

  bank.push({ text, type, options, correct, points });
  localStorage.setItem('examBank', JSON.stringify(bank));
  document.getElementById('qText').value = '';
  document.getElementById('optsContainer').innerHTML = '';
  optCount = 0; updateCorrectUI(); renderBank();
};

function renderBank() {
  document.getElementById('bankCount').textContent = bank.length;
  document.getElementById('bankList').innerHTML = bank.map((q,i) => `<div class="q-item"><strong>P${i+1}</strong> (${q.type==='single'?'Única':'Múltiple'}) ${q.text.substring(0,40)}... <button class="btn btn-small btn-danger" onclick="bank.splice(${i},1); localStorage.setItem('examBank', JSON.stringify(bank)); renderBank();">✕</button></div>`).join('');
}

window.generateExam = () => {
  const nS = parseInt(document.getElementById('nSingle').value) || 0;
  const nM = parseInt(document.getElementById('nMulti').value) || 0;
  const singles = bank.filter(q => q.type === 'single');
  const multis = bank.filter(q => q.type === 'multiple');

  if (singles.length < nS || multis.length < nM) return alert(`Faltan preguntas en el banco. Necesitas al menos ${nS} únicas y ${nM} múltiples.`);

  const shuffle = arr => arr.sort(() => Math.random() - 0.5);
  const exam = [...shuffle(singles).slice(0, nS), ...shuffle(multis).slice(0, nM)];
  localStorage.setItem('examQuestions', JSON.stringify(exam));
  localStorage.setItem('examConfig', JSON.stringify({ totalTime: (parseInt(document.getElementById('totalTime').value) || 45) * 60 }));
  
  document.getElementById('examPreview').innerHTML = `✅ Examen generado: ${exam.length} preguntas (${nS} única, ${nM} múltiple). Tiempo: ${document.getElementById('totalTime').value} min.`;
};