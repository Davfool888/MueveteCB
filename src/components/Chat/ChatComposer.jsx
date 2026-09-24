import React, { useRef, useCallback, useState } from 'react';

export default function ChatComposer({ onSend, showToast }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);

  // Auto-resize textarea
  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 90)}px`;
  }

  function handleInput(e) {
    setText(e.target.value);
    autoResize();
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  const startDictation = useCallback(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      showToast('La voz no está disponible en este navegador. Puedes escribir tu pregunta.');
      textareaRef.current?.focus();
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = 'es-CO';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.addEventListener('start', () => {
      setIsListening(true);
      showToast('Te escucho…');
    });
    recognition.addEventListener('result', (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      setText(transcript);
      autoResize();
      textareaRef.current?.focus();
    });
    recognition.addEventListener('error', (event) => {
      const message =
        event.error === 'not-allowed'
          ? 'El navegador no permitió el micrófono.'
          : 'No pude escuchar. Intenta de nuevo o escribe tu pregunta.';
      showToast(message);
    });
    recognition.addEventListener('end', () => {
      setIsListening(false);
      recognitionRef.current = null;
    });
    recognition.start();
  }, [showToast]);

  return (
    <form className="chat-composer" id="chat-form" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="chat-input">Escribe una pregunta para Ángel</label>
      <textarea
        id="chat-input"
        ref={textareaRef}
        name="message"
        rows={1}
        maxLength={240}
        placeholder="Pregunta por una ruta…"
        value={text}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        required
      />
      <button
        className={`composer-button mic-button${isListening ? ' is-listening' : ''}`}
        id="mic-button"
        type="button"
        aria-label="Dictar mensaje"
        title="Dictar mensaje"
        onClick={startDictation}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="8" y="3" width="8" height="12" rx="4"/>
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/>
        </svg>
      </button>
      <button
        className="composer-button send-button"
        type="submit"
        aria-label="Enviar mensaje"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m4 4 17 8-17 8 3-8-3-8Z"/>
          <path d="M7 12h14"/>
        </svg>
      </button>
    </form>
  );
}
