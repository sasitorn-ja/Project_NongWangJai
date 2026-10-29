import assert from "node:assert/strict";
import test from "node:test";
import { formatNumber, formatVolume } from "../src/lib/number";

test("volumes always show two decimals and full quantities", () => {
  assert.equal(formatVolume(0), "0.00");
  assert.equal(formatVolume(10), "10.00");
  assert.equal(formatVolume(10.5), "10.50");
  assert.equal(formatVolume(1234567.89), "1,234,567.89");
});

test("extra decimals are discarded without rounding or losing exact hundredths", () => {
  assert.equal(formatVolume(1234.5678), "1,234.56");
  assert.equal(formatVolume(9.999), "9.99");
  assert.equal(formatVolume(0.009), "0.00");
  assert.equal(formatVolume(1.15), "1.15");
  assert.equal(formatVolume(0.29), "0.29");
  assert.equal(formatVolume(1.005), "1.00");
  assert.equal(formatVolume(0.1 + 0.2), "0.30");
});

test("negative volumes truncate toward zero without displaying negative zero", () => {
  assert.equal(formatVolume(-1234.5678), "-1,234.56");
  assert.equal(formatVolume(-1.15), "-1.15");
  assert.equal(formatVolume(-0.009), "0.00");
  assert.equal(formatVolume(-0), "0.00");
});

test("scientific notation and invalid values have a stable display", () => {
  assert.equal(formatVolume(1e-7), "0.00");
  assert.equal(formatVolume(1.234e21), "1,234,000,000,000,000,000,000.00");
  assert.equal(formatVolume(Number.MIN_VALUE), "0.00");
  assert.equal(formatVolume(NaN), "0.00");
  assert.equal(formatVolume(Infinity), "0.00");
});

test("counts keep their existing display without volume decimal padding", () => {
  assert.equal(formatNumber(1234), "1,234");
});
