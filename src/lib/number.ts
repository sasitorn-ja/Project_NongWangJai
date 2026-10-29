export function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 1 }).format(value);
}

/** Display full cubic-metre quantities with two decimals, truncating toward zero. */
export function formatVolume(value: number) {
  if (!Number.isFinite(value)) return "0.00";

  // Slice decimal digits instead of multiplying by 100: floating-point arithmetic
  // can turn an exact input such as 1.15 into 114.99999999999999 before truncation.
  const [coefficient, exponent = "0"] = Math.abs(value).toString().split("e");
  const [whole, fraction = ""] = coefficient.split(".");
  const digits = whole + fraction;
  const decimalPosition = whole.length + Number(exponent);
  const integer = decimalPosition > 0
    ? digits.slice(0, decimalPosition).padEnd(decimalPosition, "0")
    : "0";
  const decimals = (decimalPosition < 0
    ? "0".repeat(-decimalPosition) + digits
    : digits.slice(decimalPosition)
  ).padEnd(2, "0").slice(0, 2);
  const sign = value < 0 && (integer !== "0" || decimals !== "00") ? "-" : "";

  return `${sign}${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${decimals}`;
}
