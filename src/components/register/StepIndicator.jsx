import React from 'react';

/**
 * Indicador visual de pasos para los formularios de registro progresivo.
 */
export default function StepIndicator({ steps = [], currentStep = 1 }) {
  return (
    <nav className="step-indicator" aria-label="Progreso del registro">
      <ol className="step-indicator-list">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCurrent = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;

          return (
            <li
              key={stepNumber}
              className={`step-indicator-item ${
                isCurrent ? 'is-current' : isCompleted ? 'is-completed' : 'is-upcoming'
              }`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <div className="step-indicator-bullet">
                {isCompleted ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="step-check-icon">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span>{stepNumber}</span>
                )}
              </div>
              <span className="step-indicator-title">{step.title || step}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
