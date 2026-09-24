import React from 'react';

export default function TypingIndicator() {
  return (
    <article className="message message-agent typing-message" id="typing-message">
      <span className="message-avatar" aria-hidden="true">A</span>
      <div className="message-content typing-indicator" aria-label="Eco está escribiendo">
        <span/><span/><span/>
      </div>
    </article>
  );
}
