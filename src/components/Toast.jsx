import React from 'react';

export default function Toast({ message, visible }) {
  return (
    <div
      className={`toast${visible ? ' is-visible' : ''}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {message}
    </div>
  );
}
