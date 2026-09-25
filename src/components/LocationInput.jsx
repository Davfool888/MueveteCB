import React, { useEffect, useState } from 'react';
import useLocationSuggestions from '../hooks/useLocationSuggestions';

export default function LocationInput({
  id,
  label,
  secondaryLabel,
  value,
  onChange,
  onSelect,
  placeholder,
  icon,
  required = false,
  onUseCurrentLocation,
  isLocating = false,
  locationStatus = '',
  locationError = '',
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const { suggestions, isSearching, error: searchError, retry } = useLocationSuggestions(value, {
    enabled: isFocused,
  });
  const listId = `${id}-suggestions`;
  const query = String(value || '').trim();
  const showSuggestions = isFocused && query.length >= 2;
  const describedBy = [
    locationError ? `${id}-location-error` : '',
    locationStatus ? `${id}-location-status` : '',
    searchError ? `${id}-search-error` : '',
    showSuggestions && !isSearching && suggestions.length === 0 ? `${id}-no-results` : '',
  ].filter(Boolean).join(' ') || undefined;

  useEffect(() => {
    setActiveIndex(-1);
  }, [suggestions]);

  function handleSelect(location) {
    onSelect?.(location);
    setIsFocused(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      setIsFocused(false);
      setActiveIndex(-1);
      return;
    }

    if (!suggestions.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    }

    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      handleSelect(suggestions[activeIndex]);
    }
  }

  return (
    <div className="location-field">
      <div className="location-label-row">
        <label className="location-label" htmlFor={id}>
          {label}
        </label>
        {secondaryLabel && <span className="location-secondary-label">{secondaryLabel}</span>}
      </div>

      <div className="location-input-container">
        <div className={`location-input-wrap${isFocused ? ' is-focused' : ''}`}>
          <span className="location-input-icon" aria-hidden="true">
            {icon}
          </span>
          <input
            id={id}
            name={id}
            type="text"
            value={value || ''}
            onChange={onChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => window.setTimeout(() => setIsFocused(false), 140)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoComplete="off"
            required={required}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showSuggestions}
            aria-controls={showSuggestions ? listId : undefined}
            aria-describedby={describedBy}
            aria-activedescendant={
              activeIndex >= 0 ? `${id}-suggestion-${activeIndex}` : undefined
            }
            aria-busy={isSearching}
          />
          {isSearching && (
            <>
              <span className="location-search-spinner" aria-hidden="true" />
              <span className="sr-only">Buscando sugerencias de ubicación</span>
            </>
          )}
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div className="location-suggestions" id={listId} role="listbox">
            {suggestions.map((location, index) => (
              <button
                key={`${location.label}-${location.latitude}-${location.longitude}`}
                id={`${id}-suggestion-${index}`}
                className={`location-suggestion${activeIndex === index ? ' is-active' : ''}`}
                type="button"
                role="option"
                aria-selected={activeIndex === index}
                onMouseDown={(event) => event.preventDefault()}
                onPointerDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => handleSelect(location)}
              >
                <span className="location-suggestion-icon" aria-hidden="true">📍</span>
                <span className="location-suggestion-copy">
                  <strong>{location.label}</strong>
                  <small>{location.detail || 'Bogotá, Colombia'}</small>
                </span>
              </button>
            ))}
          </div>
        )}

        {showSuggestions && !isSearching && !searchError && suggestions.length === 0 && (
          <p id={`${id}-no-results`} className="location-no-results" role="status">
            No encontramos ubicaciones con ese texto. Prueba con otra dirección o lugar.
          </p>
        )}

        {searchError && (
          <div id={`${id}-search-error`} className="location-search-error" role="alert">
            <span>{searchError}</span>
            <button type="button" onClick={retry}>Reintentar</button>
          </div>
        )}
      </div>

      {onUseCurrentLocation && (
        <button
          className="location-gps-button"
          type="button"
          onClick={onUseCurrentLocation}
          disabled={isLocating}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          <span>
            {isLocating ? 'Obteniendo tu ubicación...' : 'Usar mi ubicación actual'}
          </span>
        </button>
      )}

      {locationStatus && !locationError && (
        <p id={`${id}-location-status`} className="location-status" role="status">
          {locationStatus}
        </p>
      )}

      {locationError && (
        <p id={`${id}-location-error`} className="location-error" role="alert">
          {locationError}
        </p>
      )}
    </div>
  );
}
