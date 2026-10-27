import assert from "node:assert/strict";
import test from "node:test";
import { resolveCustomerDealer } from "../scripts/lib/customer-dealer.js";

const storedDealer = { dealer_code: "3005514", dealer_name: "Stored dealer" };

test("uses the top-level CPAC dealer when customer items omit dealer fields", () => {
  assert.deepEqual(resolveCustomerDealer({}, {
    dealer_code: "3005514",
    dealer_name: "Current dealer"
  }, storedDealer), { dealer_code: "3005514", dealer_name: "Current dealer" });
});

test("supports dealer identity on items in a legacy array response", () => {
  assert.deepEqual(resolveCustomerDealer({
    dealer_code: "3005514",
    dealer_name: "Item dealer"
  }, undefined, storedDealer), { dealer_code: "3005514", dealer_name: "Item dealer" });
});

test("falls back per field when upstream dealer fields are null or blank", () => {
  assert.deepEqual(resolveCustomerDealer({ dealer_code: null, dealer_name: "  " }, {
    dealer_code: " 3005514 ", dealer_name: null
  }, storedDealer), storedDealer);
});

test("prefers the response dealer over conflicting item or stored names", () => {
  assert.equal(resolveCustomerDealer({ dealer_name: "Old item name" }, {
    dealer_name: "Current dealer"
  }, storedDealer).dealer_name, "Current dealer");
});

test("leaves genuinely unavailable identity null", () => {
  assert.deepEqual(resolveCustomerDealer({}, undefined, {}), {
    dealer_code: null, dealer_name: null
  });
});
