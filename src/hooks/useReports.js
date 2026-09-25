import { useCallback, useState } from 'react';
import { STORAGE_KEY } from '../data/routes';

function isCurrentReport(report, now = Date.now()) {
  if (!report || ['rejected', 'expired'].includes(report.status)) return false;
  const expiresAt = Date.parse(report.expiresAt || '');
  return Number.isFinite(expiresAt) && expiresAt > now;
}

function loadReports() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((report) => isCurrentReport(report)).slice(0, 12) : [];
  } catch {
    return [];
  }
}

function saveReports(reports) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch (error) {
    console.warn('No se pudo guardar en localStorage', error);
  }
}

export function useReports() {
  const [reports, setReports] = useState(loadReports);

  const addReport = useCallback((newReport) => {
    setReports((previous) => {
      const next = [newReport, ...previous].slice(0, 12);
      saveReports(next);
      return next;
    });
  }, []);

  const clearReports = useCallback(() => {
    setReports([]);
    saveReports([]);
  }, []);

  const pruneExpiredReports = useCallback(() => {
    setReports((previous) => {
      const next = previous.filter((report) => isCurrentReport(report));
      if (next.length !== previous.length) saveReports(next);
      return next;
    });
  }, []);

  return { reports, addReport, clearReports, pruneExpiredReports };
}
