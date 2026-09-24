import React from 'react';
import MessageList from './MessageList';
import QuickPrompts from './QuickPrompts';
import ChatComposer from './ChatComposer';

export default function ChatPanel({ messages, isTyping, onSendMessage, onResetDemo, onScrollToMap, showToast }) {
  return (
    <article className="chat-card" aria-labelledby="chat-title">
      <header className="panel-header chat-header">
        <div className="agent-identity">
          <span className="agent-avatar" aria-hidden="true">
            <svg viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20"/>
              <path d="M14 26c4-8 16-8 20 0M17 18h.01M31 18h.01"/>
              <path d="M18 31c4 3 8 3 12 0"/>
            </svg>
          </span>
          <div>
            <div className="agent-title-row">
              <h2 id="chat-title">Eco</h2>
              <span className="online-badge">IA · Demo</span>
            </div>
            <p>Asistente de movilidad</p>
          </div>
        </div>
        <button
          className="icon-button"
          id="reset-demo"
          type="button"
          aria-label="Reiniciar demostración"
          title="Reiniciar demostración"
          onClick={onResetDemo}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 12a8 8 0 1 1-2.34-5.66L20 8.68"/>
            <path d="M20 4v4.68h-4.68"/>
          </svg>
        </button>
      </header>

      <MessageList messages={messages} isTyping={isTyping} onScrollToMap={onScrollToMap} />

      <QuickPrompts onPrompt={onSendMessage} />

      <ChatComposer onSend={onSendMessage} showToast={showToast} />
    </article>
  );
}
