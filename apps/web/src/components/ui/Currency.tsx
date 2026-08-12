import { formatRp } from '@/lib/format';

export function Currency({
  value,
  signed,
  className = '',
}: {
  value: number;
  signed?: 'income' | 'expense' | false;
  className?: string;
}) {
  const prefix = signed === 'income' ? '+' : signed === 'expense' ? '-' : '';
  const tone =
    signed === 'income' ? 'ui-income' : signed === 'expense' ? 'ui-expense' : '';

  return <span className={`${tone} ${className}`.trim()}>{`${prefix}${formatRp(value)}`}</span>;
}
