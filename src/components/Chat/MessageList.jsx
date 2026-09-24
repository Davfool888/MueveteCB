import React, { useEffect, useRef } from 'react';
import Message from './Message';
import TypingIndicator from './TypingIndicator';

export default function MessageList({ messages, isTyping, onScrollToMap }) {
  const listRef = useRef(null);

  // Auto-scroll to bottom when messages or typing changes
  useEffect(() => {
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    });
  }, [messages, isTyping]);

  return (
    <div
      className="messages"
      id="messages"
      ref={listRef}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-label="Conversación con Ángel"
    >
      {messages.map((msg) => (
        <Message key={msg.id} msg={msg} onScrollToMap={onScrollToMap} />
      ))}
      {isTyping && <TypingIndicator />}
    </div>
  );
}
