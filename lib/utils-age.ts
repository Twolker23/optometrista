export function calculateAge(birthDate: Date): { years: number; months: number } {
  const today = new Date();
  const birth = new Date(birthDate);
  
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  // Ajustar se o dia do mês ainda não passou
  if (today.getDate() < birth.getDate()) {
    months--;
    if (months < 0) {
      years--;
      months += 12;
    }
  }
  
  return { years, months };
}

export function formatAge(birthDate: Date): string {
  const { years, months } = calculateAge(birthDate);
  return `${years} anos e ${months} ${months === 1 ? 'mês' : 'meses'}`;
}
