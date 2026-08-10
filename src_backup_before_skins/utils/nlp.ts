// NLP parsing and heuristics for TimeNest

export type ParseResultType = 'event' | 'task_deadline' | 'task_flexible';

export interface ParseResult {
  type: ParseResultType;
  title: string;
  date?: string;
  time?: string;
  recurrenceRule?: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  confidence: number;
}

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s]/gi, '') // Remove punctuation
    .replace(/\b(o|a|os|as|um|uma|uns|umas|de|do|da|dos|das|em|no|na|nos|nas|para|pro|pra|com)\b/g, '') // Remove stop words
    .replace(/\s+/g, ' ')
    .trim();
}

export function getSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeTitle(str1);
  const norm2 = normalizeTitle(str2);
  
  if (norm1 === norm2) return 1.0;
  
  const words1 = norm1.split(' ');
  const words2 = norm2.split(' ');
  
  const intersection = words1.filter(x => words2.includes(x));
  const union = new Set([...words1, ...words2]);
  
  if (union.size === 0) return 0;
  return intersection.length / union.size;
}

export function estimateDuration(title: string): { minutes: number; size: 'Pequena' | 'Média' | 'Grande' } {
  const norm = normalizeTitle(title);
  
  if (norm.match(/\b(rapid|ligar|responder|email|mensagem|pagar|pix)\b/i)) {
    return { minutes: 15, size: 'Pequena' };
  }
  
  if (norm.match(/\b(estudar|projeto|relatorio|faxina|limpar|apresentacao|desenvolver)\b/i)) {
    return { minutes: 90, size: 'Grande' };
  }
  
  if (norm.match(/\b(reuniao|supermercado|compras|treino|academia)\b/i)) {
    return { minutes: 60, size: 'Média' };
  }
  
  return { minutes: 30, size: 'Média' };
}

import { getLocalDateString } from './time';

export function parseNLPInput(text: string, referenceDate: Date = new Date()): ParseResult {
  let cleanText = text;
  let confidence = 0.5;
  
  // Time Regexes (15:30, 15h43, 20h43, às 20h43, às 20:43, 20h, etc.)
  const timeRegexes = [
    /\b(?:às|as)\s+(\d{1,2})(?:[:h](\d{2}))?(?:\s*(?:h|horas|m|min)?)?\b/i,
    /\b(\d{1,2})h(\d{2})?\b/i,
    /\b(\d{1,2}):(\d{2})\b/i,
    /\b(\d{1,2})\s*h(?:oras?)?\b/i,
  ];
  
  // Date Regexes (amanha, hoje, dia 15, proxima segunda, etc.)
  const dateRegexes = [
    /\b(?:para\s+)?amanhã\b/i,
    /\b(?:para\s+)?hoje\b/i,
    /\b(?:na\s+)?(?:próxima\s+)?(segunda|terça|quarta|quinta|sexta|sábado|domingo)(?:-feira)?\b/i,
    /\bdia\s+(\d{1,2})(?:\s+de\s+(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro))?\b/i
  ];
  
  // Recurrence Regexes
  const recurrenceRegexes = [
    { regex: /\b(?:todo\s+dia|diariamente|todos\s+os\s+dias)\b/i, rule: 'DAILY' },
    { regex: /\b(?:toda\s+semana|semanalmente|toda\s+(?:segunda|terça|quarta|quinta|sexta|sábado|domingo)|toda\s+terca|toda\s+sabado|todo\s+domingo|todo\s+sabado)\b/i, rule: 'WEEKLY' },
    { regex: /\b(?:todo\s+mês|mensalmente|todos\s+os\s+meses)\b/i, rule: 'MONTHLY' }
  ];

  let timeMatch: RegExpMatchArray | null = null;
  for (let i = 0; i < timeRegexes.length; i++) {
    const match = cleanText.match(timeRegexes[i]);
    if (match) {
      timeMatch = match;
      break;
    }
  }
  
  let dateMatch: RegExpMatchArray | null = null;
  for (let i = 0; i < dateRegexes.length; i++) {
    const match = cleanText.match(dateRegexes[i]);
    if (match) {
      dateMatch = match;
      break;
    }
  }
  
  const getDayOffset = (targetDayName: string): number => {
    const days = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    const normTarget = targetDayName.toLowerCase().replace('-feira', '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const currentDay = referenceDate.getDay();
    
    const targetIdx = days.findIndex(d => d.includes(normTarget) || normTarget.includes(d));
    if (targetIdx === -1) return 1;
    
    let diff = targetIdx - currentDay;
    if (diff <= 0) diff += 7;
    return diff;
  };
  
  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  
  let resultDate: string | undefined = undefined;
  if (dateMatch) {
    cleanText = cleanText.replace(dateMatch[0], '');
    confidence += 0.2;
    
    const str = dateMatch[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const targetDate = new Date(referenceDate);
    
    if (str.includes('amanha')) {
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (str.includes('hoje')) {
      // Keep today
    } else if (dateMatch[1] && (dateMatch[1].includes('feira') || ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'].includes(dateMatch[1].normalize('NFD').replace(/[\u0300-\u036f]/g, '')))) {
      const offset = getDayOffset(dateMatch[1]);
      targetDate.setDate(targetDate.getDate() + offset);
    } else if (str.includes('dia')) {
      const day = parseInt(dateMatch[1], 10);
      targetDate.setDate(day);
      if (dateMatch[2]) {
        const monthName = dateMatch[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const monthIdx = months.findIndex(m => m.normalize('NFD').replace(/[\u0300-\u036f]/g, '') === monthName);
        if (monthIdx !== -1) {
          targetDate.setMonth(monthIdx);
          if (targetDate < referenceDate && targetDate.getMonth() < referenceDate.getMonth()) {
            targetDate.setFullYear(targetDate.getFullYear() + 1);
          }
        }
      } else if (targetDate < referenceDate) {
        targetDate.setMonth(targetDate.getMonth() + 1);
      }
    }
    
    resultDate = getLocalDateString(targetDate);
  }
  
  let resultRecurrence: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' = 'NONE';
  for (const r of recurrenceRegexes) {
    const match = cleanText.match(r.regex);
    if (match) {
      resultRecurrence = r.rule as any;
      cleanText = cleanText.replace(match[0], '');
      confidence += 0.2;
      break;
    }
  }

  let resultTime: string | undefined = undefined;
  if (timeMatch) {
    cleanText = cleanText.replace(timeMatch[0], '');
    confidence += 0.2;
    
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    
    // Simple heuristic for PM vs AM if am/pm isn't specified but hours < 7
    if (hours > 0 && hours <= 6) {
      hours += 12;
    }
    
    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    resultTime = `${hh}:${mm}`;
  }
  
  cleanText = cleanText.replace(/\s+/g, ' ').trim();
  if (cleanText.endsWith(',')) cleanText = cleanText.slice(0, -1).trim();
  
  let type: ParseResultType = 'task_flexible';
  if (resultTime) {
    type = 'event';
    if (!resultDate) resultDate = getLocalDateString(referenceDate);
  } else if (resultDate) {
    type = 'task_deadline';
  }
  
  if (confidence > 1) confidence = 1.0;
  if (confidence < 0) confidence = 0.0;
  
  return {
    type,
    title: cleanText || text,
    date: resultDate,
    time: resultTime,
    recurrenceRule: resultRecurrence,
    confidence
  };
}
