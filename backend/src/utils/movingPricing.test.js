// Unit tests untuk movingPricing — gunakan node:test built-in (Node ≥ 18).
// Jalankan: `node --test src/utils/movingPricing.test.js`
const test = require('node:test');
const assert = require('node:assert');

const {
  calculatePrice,
  getVehicleWarning,
  getRecommendedUpgrade,
} = require('./movingPricing');

// ── calculatePrice ───────────────────────────────────────────────────

test('Motor 5km: base = 5 × 2700 = 13500 → di-bound MIN_PRICE 30000 → roundUp 30000', () => {
  const r = calculatePrice({
    distance_km: 5,
    vehicle_type: 'MOTORCYCLE',
    move_type: 'RINGAN',
  });
  assert.strictEqual(r.base_price, 13500);
  assert.strictEqual(r.surcharge, 0);
  assert.strictEqual(r.addon_price, 0);
  assert.strictEqual(r.round_trip_addon, 0);
  assert.strictEqual(r.estimated_price, 30000);
});

test('Van 10km RINGAN: base = 130000, no surcharge, roundUp 130000', () => {
  const r = calculatePrice({
    distance_km: 10,
    vehicle_type: 'VAN',
    move_type: 'RINGAN',
  });
  assert.strictEqual(r.base_price, 130000);
  assert.strictEqual(r.estimated_price, 130000);
});

test('extra_helper menambah 75000 di addon_price', () => {
  const r = calculatePrice({
    distance_km: 10,
    vehicle_type: 'VAN',
    move_type: 'RINGAN',
    extra_helper: true,
  });
  assert.strictEqual(r.addon_price, 75000);
  assert.strictEqual(r.estimated_price, 205000); // 130000 + 75000
});

test('door_to_door menambah 20000 di addon_price', () => {
  const r = calculatePrice({
    distance_km: 10,
    vehicle_type: 'VAN',
    move_type: 'RINGAN',
    is_door_to_door: true,
  });
  assert.strictEqual(r.addon_price, 20000);
});

test('Lantai >= 3 tanpa lift → surcharge 20000', () => {
  const r = calculatePrice({
    distance_km: 10,
    vehicle_type: 'VAN',
    move_type: 'RINGAN',
    pickup_floor: 1,
    dropoff_floor: 4,
    has_lift: false,
  });
  assert.strictEqual(r.surcharge, 20000);
});

test('Lantai >= 3 dengan lift → tidak ada surcharge', () => {
  const r = calculatePrice({
    distance_km: 10,
    vehicle_type: 'VAN',
    move_type: 'RINGAN',
    dropoff_floor: 5,
    has_lift: true,
  });
  assert.strictEqual(r.surcharge, 0);
});

test('move_type BERAT → surcharge helper 40000', () => {
  const r = calculatePrice({
    distance_km: 10,
    vehicle_type: 'PICKUP_BOX',
    move_type: 'BERAT',
  });
  assert.strictEqual(r.surcharge, 40000);
});

test('Round trip = +50% dari subtotal (bukan 2× jarak)', () => {
  // base 130000, subtotal 130000, round_trip = 65000, total 195000
  const r = calculatePrice({
    distance_km: 10,
    vehicle_type: 'VAN',
    move_type: 'RINGAN',
    is_round_trip: true,
  });
  assert.strictEqual(r.base_price, 130000);
  assert.strictEqual(r.round_trip_addon, 65000);
  assert.strictEqual(r.estimated_price, 195000);
});

test('Round trip dihitung dari subtotal termasuk addon & surcharge', () => {
  // base 130000 + addon 75000 + surcharge 20000 = 225000 subtotal
  // round_trip = ceil(225000 × 0.5) = 112500
  // total = 337500 → roundUpTo5000 = 340000
  const r = calculatePrice({
    distance_km: 10,
    vehicle_type: 'VAN',
    move_type: 'RINGAN',
    extra_helper: true,
    dropoff_floor: 4,
    is_round_trip: true,
  });
  assert.strictEqual(r.base_price, 130000);
  assert.strictEqual(r.addon_price, 75000);
  assert.strictEqual(r.surcharge, 20000);
  assert.strictEqual(r.round_trip_addon, 112500);
  assert.strictEqual(r.estimated_price, 340000);
});

test('Harga akhir selalu dibulatkan ke kelipatan 5000', () => {
  // base = 1.2 × 2700 = 3240 → MIN_PRICE 30000 → 30000
  const r = calculatePrice({
    distance_km: 1.2,
    vehicle_type: 'MOTORCYCLE',
    move_type: 'RINGAN',
  });
  assert.strictEqual(r.estimated_price % 5000, 0);
});

test('vehicle_type tidak valid → throw', () => {
  assert.throws(() => calculatePrice({
    distance_km: 5,
    vehicle_type: 'BUS',
    move_type: 'RINGAN',
  }));
});

// ── getVehicleWarning ────────────────────────────────────────────────

test('Motor + barang besar → warning', () => {
  const w = getVehicleWarning({ vehicle_type: 'MOTORCYCLE', has_large_items: true });
  assert.ok(Array.isArray(w) && w.length === 1);
});

test('Pickup Box tanpa barang besar → warning (terlalu boros)', () => {
  const w = getVehicleWarning({ vehicle_type: 'PICKUP_BOX', has_large_items: false });
  assert.ok(Array.isArray(w) && w.length === 1);
});

test('Van + barang ringan → no warning', () => {
  const w = getVehicleWarning({ vehicle_type: 'VAN', has_large_items: false });
  assert.strictEqual(w, null);
});

test('Pickup Box + barang besar → no warning', () => {
  const w = getVehicleWarning({ vehicle_type: 'PICKUP_BOX', has_large_items: true });
  assert.strictEqual(w, null);
});

// ── getRecommendedUpgrade ────────────────────────────────────────────

test('Motor → upgrade Van', () => {
  assert.strictEqual(getRecommendedUpgrade({ current_vehicle: 'MOTORCYCLE' }), 'VAN');
});

test('Van + barang besar → upgrade Pickup Box', () => {
  assert.strictEqual(
    getRecommendedUpgrade({ current_vehicle: 'VAN', has_large_items: true }),
    'PICKUP_BOX'
  );
});

test('Pickup Box → null (sudah optimal)', () => {
  assert.strictEqual(getRecommendedUpgrade({ current_vehicle: 'PICKUP_BOX' }), null);
});
