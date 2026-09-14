import { useEffect, useState } from 'react';

import { cartStore, type CartLine } from './cart-store';

export function useCart(): readonly CartLine[] {
  const [lines, setLines] = useState<readonly CartLine[]>(() => cartStore.snapshot());
  useEffect(() => cartStore.subscribe(() => setLines(cartStore.snapshot())), []);
  return lines;
}
