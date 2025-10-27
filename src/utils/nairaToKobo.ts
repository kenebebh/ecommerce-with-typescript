export function nairaToKobo(nairaAmount: number): number {
  if (typeof nairaAmount !== "number" || isNaN(nairaAmount)) {
    throw new Error("Invalid input: Amount must be a number.");
  }
  if (nairaAmount < 0) {
    throw new Error("Invalid input: Amount cannot be negative.");
  }

  // Multiply by 100 and use Math.round to handle potential floating-point
  // issues and correctly round the value.
  const koboAmount = Math.round(nairaAmount * 100);

  return koboAmount;
}
