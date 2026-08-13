// Username Management & Reserved Registry Utility for TimeNest

const RESERVED_USERNAMES = new Set([
  'admin', 'administrator', 'timenest', 'official', 'support', 'help',
  'system', 'root', 'api', 'null', 'undefined', 'profile', 'config',
  'settings', 'user', 'guest', 'visitante', 'app', 'timenestapp'
]);

export interface UsernameValidationResult {
  isValid: boolean;
  error: string | null;
  formatted: string;
}

/**
 * Clean raw input to remove spaces, uppercase letters, and invalid leading characters
 */
export function cleanUsernameInput(input: string): string {
  if (!input) return '';
  return input
    .trim()
    .replace(/^@+/, '') // Remove leading @
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, ''); // Keep only alphanumeric, dot, underscore
}

/**
 * Full validation of a username format and rules
 */
export function validateUsernameFormat(username: string): UsernameValidationResult {
  const cleaned = cleanUsernameInput(username);

  if (!cleaned) {
    return { isValid: false, error: 'O username não pode ficar vazio.', formatted: '' };
  }

  if (cleaned.length < 3) {
    return { isValid: false, error: 'O username deve ter pelo menos 3 caracteres.', formatted: `@${cleaned}` };
  }

  if (cleaned.length > 20) {
    return { isValid: false, error: 'O username pode ter no máximo 20 caracteres.', formatted: `@${cleaned.substring(0, 20)}` };
  }

  if (/^[._]/.test(cleaned) || /[._]$/.test(cleaned)) {
    return { isValid: false, error: 'Não pode começar ou terminar com ponto ou underline.', formatted: `@${cleaned}` };
  }

  if (/\.\.|\_\_|\.\_|\_\./.test(cleaned)) {
    return { isValid: false, error: 'Não pode conter pontos ou underlines seguidos.', formatted: `@${cleaned}` };
  }

  if (RESERVED_USERNAMES.has(cleaned)) {
    return { isValid: false, error: 'Este username é reservado pelo sistema.', formatted: `@${cleaned}` };
  }

  return { isValid: true, error: null, formatted: `@${cleaned}` };
}

/**
 * Registry database helper (localStorage based for persistence across sessions and accounts)
 */
export function getUsernameRegistry(): Record<string, string> {
  try {
    if (typeof localStorage === 'undefined') return (globalThis as any).__mock_registry__ || {};
    const saved = localStorage.getItem('timenest_username_registry');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Error reading username registry', e);
  }
  return (globalThis as any).__mock_registry__ || {};
}

/**
 * Check if a username is available or owned by current user
 */
export function isUsernameAvailable(username: string, ownerId: string): { available: boolean; reason?: string } {
  const formatValidation = validateUsernameFormat(username);
  if (!formatValidation.isValid) {
    return { available: false, reason: formatValidation.error || 'Formato inválido.' };
  }

  const cleaned = cleanUsernameInput(username);
  const registry = getUsernameRegistry();
  const existingOwner = registry[cleaned];

  if (existingOwner && existingOwner !== ownerId) {
    return { available: false, reason: 'Este username já está em uso por outra conta.' };
  }

  return { available: true };
}

/**
 * Reserve a username for a specific ownerId (releasing previous username if changed)
 */
export function reserveUsername(newUsername: string, ownerId: string, oldUsername?: string): boolean {
  const cleanedNew = cleanUsernameInput(newUsername);
  if (!cleanedNew || !ownerId) return false;

  const availability = isUsernameAvailable(cleanedNew, ownerId);
  if (!availability.available) return false;

  try {
    const registry = getUsernameRegistry();

    // Release old username if present and different
    if (oldUsername) {
      const cleanedOld = cleanUsernameInput(oldUsername);
      if (cleanedOld && registry[cleanedOld] === ownerId) {
        delete registry[cleanedOld];
      }
    }

    // Assign new username
    registry[cleanedNew] = ownerId;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('timenest_username_registry', JSON.stringify(registry));
    }
    (globalThis as any).__mock_registry__ = registry;
    return true;
  } catch (e) {
    console.error('Error reserving username', e);
    return false;
  }
}

/**
 * Generate automatic username suggestions derived from name or email
 */
export function generateUsernameSuggestions(nameOrEmail: string, ownerId?: string): string[] {
  if (!nameOrEmail) return ['@usuario', '@nest_user', '@timenester'];

  let base = nameOrEmail.split('@')[0];
  base = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ''); // Keep alphanumeric

  if (!base || base.length < 2) base = 'nestuser';

  const parts = nameOrEmail.trim().split(/\s+/);
  const firstName = parts[0] ? parts[0].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '') : base;
  const lastName = parts.length > 1 ? parts[parts.length - 1].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '') : '';

  const candidates: string[] = [];

  if (lastName) {
    candidates.push(`${firstName}${lastName}`);
    candidates.push(`${firstName}_${lastName}`);
    candidates.push(`${firstName}.${lastName}`);
    candidates.push(`${firstName}${lastName.charAt(0)}`);
  } else {
    candidates.push(base);
    candidates.push(`${base}_nest`);
    candidates.push(`${base}.app`);
    candidates.push(`${base}1`);
  }

  // Filter candidates for valid format and availability
  const registry = getUsernameRegistry();
  const validSuggestions = candidates
    .map(c => cleanUsernameInput(c))
    .filter(c => {
      const valid = validateUsernameFormat(c).isValid;
      if (!valid) return false;
      const existingOwner = registry[c];
      return !existingOwner || (ownerId && existingOwner === ownerId);
    })
    .slice(0, 3)
    .map(c => `@${c}`);

  if (validSuggestions.length === 0) {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    return [`@${base}${randomSuffix}`];
  }

  return Array.from(new Set(validSuggestions));
}
