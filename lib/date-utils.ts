/**
 * Converte uma string de data no formato "YYYY-MM-DD" para um objeto Date
 * no timezone local, evitando problemas de diferença de dias causados por UTC.
 * 
 * @param dateString - String de data no formato "YYYY-MM-DD"
 * @returns Date object no timezone local
 */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  // Month é 0-indexed no JavaScript Date
  return new Date(year, month - 1, day);
}

/**
 * Converte um Date/string ISO do banco de dados para um Date local.
 * Evita problemas de timezone ao ler datas armazenadas no PostgreSQL.
 * 
 * @param dateValue - Date object ou string ISO do banco
 * @returns Date object no timezone local
 */
export function parseDateFromDB(dateValue: Date | string): Date {
  if (!dateValue) {
    throw new Error('dateValue is required');
  }
  
  const dateObj = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  
  // Extrai ano, mês e dia SEM conversão de timezone
  // Isso garante que 15/04/1994 no banco = 15/04/1994 no navegador
  // independente do timezone do usuário
  const year = dateObj.getUTCFullYear();
  const month = dateObj.getUTCMonth();
  const day = dateObj.getUTCDate();
  
  return new Date(year, month, day);
}

/**
 * Formata um objeto Date para o formato "YYYY-MM-DD" usado em inputs type="date"
 * 
 * @param date - Date object
 * @returns String no formato "YYYY-MM-DD"
 */
export function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Verifica se uma data string (YYYY-MM-DD) é um sábado.
 * Usado para validação backend de agendamentos de optometrista.
 * 
 * @param dateString - String de data no formato "YYYY-MM-DD"
 * @returns boolean - true se for sábado
 */
export function isSaturdayDate(dateString: string): boolean {
  const date = parseLocalDate(dateString);
  return date.getDay() === 6; // 6 = sábado
}
