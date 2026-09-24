import { useState, useCallback } from 'react';
import { STORAGE_KEY } from '../data/routes';

function loadReports() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, 12) : [];
  } catch {
    return [];
  }
}

function saveReports(reports) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch (err) {
    console.warn('No se pudo guardar en localStorage', err);
  }
}

/** Manages the reports array: load from localStorage, add, clear */
export function useReports() {
  const [reports, setReports] = useState(loadReports);

  const addReport = useCallback((newReport) => {
    setReports((prev) => {
      const next = [newReport, ...prev];
      saveReports(next);
      return next;
    });
  }, []);

  const clearReports = useCallback(() => {
    setReports([]);
    saveReports([]);
  }, []);

  return { reports, addReport, clearReports };
}
