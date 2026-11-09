export function formatMoney(cents: string) {
  const value = BigInt(cents);
  const absolute = value < 0n ? -value : value;
  const whole = (absolute / 100n).toLocaleString('pt-BR');
  const fraction = (absolute % 100n).toString().padStart(2, '0');
  return `${value < 0n ? '- ' : ''}R$ ${whole},${fraction}`;
}

export function parseMoney(input: string) {
  const cleaned = input.trim();
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(cleaned))
    throw new Error('Informe um valor como 150,00.');
  const [whole = '', fraction = ''] = cleaned.replaceAll('.', '').split(',');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (cents <= 0n || cents > 9223372036854775807n)
    throw new Error('Informe um valor positivo dentro do limite permitido.');
  return cents.toString();
}

export function moneyInput(cents: string) {
  const value = BigInt(cents);
  return `${value / 100n},${(value % 100n).toString().padStart(2, '0')}`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function monthPeriod(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { startDate: localDate(start), endDate: localDate(end) };
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => [...part].at(0) ?? '')
    .join('')
    .toUpperCase();
}
