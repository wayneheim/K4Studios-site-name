export function dollarsToCents(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new TypeError("Money values must be finite, non-negative numbers.");
  }
  return Math.round((amount + Number.EPSILON) * 100);
}

export function centsToDecimal(cents) {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new TypeError("Cents must be a non-negative integer.");
  }
  return (cents / 100).toFixed(2);
}

export function sumCents(values) {
  return values.reduce((total, value) => {
    if (!Number.isInteger(value)) throw new TypeError("Every money value must be integer cents.");
    return total + value;
  }, 0);
}

