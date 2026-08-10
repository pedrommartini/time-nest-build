// Backup and Data Export/Import Utilities for TimeNest

import type { Task, Event } from './time';

interface BackupData {
  tasks: Task[];
  events: Event[];
  focusSessions: any[];
  preferences: any;
  repetitionSuggestions: any[];
  version: string;
  timestamp: string;
}

export function validateAndParseBackup(jsonString: string): BackupData | null {
  try {
    const data = JSON.parse(jsonString);
    
    // Basic validation
    if (!data || typeof data !== 'object') return null;
    if (!Array.isArray(data.tasks)) return null;
    if (!Array.isArray(data.events)) return null;
    
    return data as BackupData;
  } catch (e) {
    return null;
  }
}

export function exportTasksToCSV(tasks: Task[]): string {
  if (!tasks || tasks.length === 0) return '';
  
  const headers = ['ID', 'Título', 'Descrição', 'Duração Estimada (min)', 'Tamanho', 'Prioridade', 'Status', 'Categoria', 'Data Criação', 'Origem'];
  
  const escapeCSV = (str: string) => {
    if (!str) return '';
    const clean = str.replace(/"/g, '""');
    return `"${clean}"`;
  };
  
  const rows = tasks.map(t => [
    t.id,
    escapeCSV(t.title),
    escapeCSV(t.description || ''),
    t.estimatedDuration,
    t.size,
    t.priority,
    t.status,
    escapeCSV(t.category),
    t.createdAt,
    t.source
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');
  
  return csvContent;
}

export function downloadFile(content: string, fileName: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
