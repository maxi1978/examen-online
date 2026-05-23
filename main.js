// Deshabilitar clic derecho en toda la app
document.addEventListener('contextmenu', e => e.preventDefault());

// Prevenir atajos de teclado comunes
document.addEventListener('keydown', function(e) {
  // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
  if (e.key === 'F12' || 
      (e.ctrlKey && e.shiftKey && ['I','i','J','j','C','c'].includes(e.key)) ||
      (e.ctrlKey && e.key === 'u') ||
      (e.ctrlKey && e.key === 'U')) {
    e.preventDefault();
    return false;
  }
});