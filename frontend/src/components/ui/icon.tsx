import type { CSSProperties } from 'react';
import { assets } from '../../lib/assets';

export function AssetIcon({ src }: { src: string }) {
  return <img className="asset-icon" src={src} alt="" aria-hidden="true" />;
}

const categorySources: Record<string, string> = {
  'briefcase-business': assets.categoryDialog['briefcase-business'],
  'car-front': assets.categoryDialog['car-front'],
  'heart-pulse': assets.categoryDialog['heart-pulse'],
  'piggy-bank': assets.categoryDialog['piggy-bank'],
  'shopping-cart': assets.categoryDialog['shopping-cart'],
  ticket: assets.categoryDialog.ticket,
  'tool-case': assets.categoryDialog['tool-case'],
  utensils: assets.categoryDialog.utensils,
  'paw-print': assets.categoryDialog['paw-print'],
  house: assets.categoryDialog.house,
  gift: assets.categoryDialog.gift,
  dumbbell: assets.categoryDialog.dumbbell,
  'book-open': assets.categoryDialog['book-open'],
  'baggage-claim': assets.categoryDialog['baggage-claim'],
  mailbox: assets.categoryDialog.mailbox,
  'receipt-text': assets.categoryDialog['receipt-text'],
};

export const iconOptions = [
  ['briefcase-business', 'Trabalho'],
  ['car-front', 'Transporte'],
  ['heart-pulse', 'Saúde'],
  ['piggy-bank', 'Investimentos'],
  ['shopping-cart', 'Compras'],
  ['ticket', 'Lazer'],
  ['tool-case', 'Serviços'],
  ['utensils', 'Alimentação'],
  ['paw-print', 'Animais'],
  ['house', 'Casa'],
  ['gift', 'Presentes'],
  ['dumbbell', 'Exercícios'],
  ['book-open', 'Educação'],
  ['baggage-claim', 'Viagens'],
  ['mailbox', 'Correspondência'],
  ['receipt-text', 'Contas'],
] as const;

export function CategoryIcon({
  icon,
  color = 'green',
  plain = false,
}: {
  icon: string;
  color?: string;
  plain?: boolean;
}) {
  const url = categorySources[icon] ?? assets.categoryDialog['receipt-text'];
  return (
    <span
      className={`${plain ? 'category-icon-plain' : 'category-icon'} color-${color}`}
      aria-hidden="true"
    >
      <span
        className="category-mask"
        style={{ '--icon-url': `url("${url}")` } as CSSProperties}
      />
    </span>
  );
}
