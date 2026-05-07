const VEHICLE_CONFIG = {
  MOTORCYCLE: { rate_per_km: 2700,  max_capacity_kg: 50,   label: 'Motor' },
  VAN:        { rate_per_km: 13000, max_capacity_kg: 500,  label: 'Van' },
  PICKUP_BOX: { rate_per_km: 20000, max_capacity_kg: 1500, label: 'Pickup Box' },
};

const ADDON_DOOR_TO_DOOR   = 20_000;
const ADDON_EXTRA_HELPER   = 75_000;
const SURCHARGE_HIGH_FLOOR = 20_000;
const SURCHARGE_HEAVY_TYPE = 40_000;
const MIN_PRICE            = 30_000;
const REVIEW_PRICE_BUFFER  = 0.3;

function roundUpTo5000(amount) {
  return Math.ceil(amount / 5000) * 5000;
}

function calculatePrice({
  distance_km,
  vehicle_type,
  move_type,
  pickup_floor    = 1,
  dropoff_floor   = 1,
  has_lift        = false,
  is_round_trip   = false,
  is_door_to_door = false,
  extra_helper    = false,
}) {
  const vehicle = VEHICLE_CONFIG[vehicle_type];
  if (!vehicle) throw new Error(`vehicle_type tidak valid: ${vehicle_type}`);

  const base_price = Math.round(distance_km * vehicle.rate_per_km);

  let addon_price = 0;
  if (is_door_to_door) addon_price += ADDON_DOOR_TO_DOOR;
  if (extra_helper)    addon_price += ADDON_EXTRA_HELPER;

  let surcharge = 0;
  const maxFloor = Math.max(pickup_floor, dropoff_floor);
  if (maxFloor >= 3 && !has_lift) surcharge += SURCHARGE_HIGH_FLOOR;
  if (move_type === 'BERAT')      surcharge += SURCHARGE_HEAVY_TYPE;

  const subtotal         = base_price + addon_price + surcharge;
  const round_trip_addon = is_round_trip ? Math.ceil(subtotal * 0.5) : 0;

  const raw             = subtotal + round_trip_addon;
  const bounded         = Math.max(raw, MIN_PRICE);
  const estimated_price = roundUpTo5000(bounded);

  return { base_price, surcharge, addon_price, round_trip_addon, estimated_price };
}

/**
 * @deprecated Admin review dihapus pada Mei 2026 — fungsi ini selalu return false.
 * Dipertahankan agar kolom `requires_review` & status `REVIEW_REQUIRED` tetap kompatibel
 * dengan order legacy. JANGAN dipanggil dari kode baru.
 */
function determineRequiresReview() {
  return false;
}

/**
 * @deprecated Tidak pernah dipanggil sejak admin review dihapus.
 * Dipertahankan untuk dokumentasi rumus harga lama.
 */
function getPriceRange(estimated_price) {
  return {
    price_min: estimated_price,
    price_max: roundUpTo5000(Math.ceil(estimated_price * (1 + REVIEW_PRICE_BUFFER))),
  };
}

/**
 * Peringatan kendaraan vs barang.
 * - Motor + barang besar = warning (terlalu kecil)
 * - Pickup Box tanpa barang besar = warning (terlalu besar / boros)
 */
function getVehicleWarning({ vehicle_type, has_large_items }) {
  const warnings = [];
  if (has_large_items && vehicle_type === 'MOTORCYCLE') {
    warnings.push('Ada barang besar — motor tidak cukup. Gunakan Van atau Pickup Box.');
  }
  if (!has_large_items && vehicle_type === 'PICKUP_BOX') {
    warnings.push('Pickup Box terlalu besar untuk barang ringan. Motor atau Van lebih efisien.');
  }
  return warnings.length > 0 ? warnings : null;
}

function getRecommendedUpgrade({ has_large_items, current_vehicle }) {
  if (current_vehicle === 'MOTORCYCLE') return 'VAN';
  if (current_vehicle === 'VAN' && has_large_items) return 'PICKUP_BOX';
  return null;
}

module.exports = {
  VEHICLE_CONFIG,
  calculatePrice,
  determineRequiresReview,
  getPriceRange,
  getVehicleWarning,
  getRecommendedUpgrade,
};
