export interface CartProduct {
  id: string;
  name: string;
  price: number | string;
  stock: number;
  pharmacyId: string;
  requiresPrescription: boolean;
}

export interface CartLine extends CartProduct {
  quantity: number;
}

export class SinglePharmacyError extends Error {
  constructor() {
    super('One pharmacy per order. Finish this cart first.');
    this.name = 'SinglePharmacyError';
  }
}

function unitPrice(line: CartLine): number {
  return typeof line.price === 'string' ? Number(line.price) : line.price;
}

/** Catalog-price estimate for display only. The charged total always comes from the server. */
export function lineEstimate(line: CartLine): number {
  return unitPrice(line) * line.quantity;
}

class CartStore {
  private lines: CartLine[] = [];
  private listeners = new Set<() => void>();

  private emit() {
    for (const listener of this.listeners) listener();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  snapshot = (): readonly CartLine[] => this.lines;

  getLines(): CartLine[] {
    return [...this.lines];
  }

  getCount(): number {
    return this.lines.reduce((sum, line) => sum + line.quantity, 0);
  }

  add(product: CartProduct, quantity = 1): void {
    const existing = this.lines.find((line) => line.id === product.id);
    const otherPharmacy = this.lines.find((line) => line.pharmacyId !== product.pharmacyId);
    if (otherPharmacy && !existing) throw new SinglePharmacyError();
    const capped = Math.max(1, Math.min(quantity, product.stock));
    if (existing) {
      existing.quantity = Math.min(existing.quantity + capped, product.stock);
      existing.stock = product.stock;
    } else if (capped > 0) {
      this.lines.push({ ...product, quantity: capped });
    }
    this.emit();
  }

  setQuantity(productId: string, quantity: number): void {
    const line = this.lines.find((l) => l.id === productId);
    if (!line) return;
    if (quantity <= 0) {
      this.lines = this.lines.filter((l) => l.id !== productId);
    } else {
      line.quantity = Math.min(quantity, line.stock);
    }
    this.emit();
  }

  remove(productId: string): void {
    this.lines = this.lines.filter((l) => l.id !== productId);
    this.emit();
  }

  clear(): void {
    this.lines = [];
    this.emit();
  }

  needsPrescription(): boolean {
    return this.lines.some((line) => line.requiresPrescription);
  }
}

export const cartStore = new CartStore();
