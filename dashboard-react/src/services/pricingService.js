// PricingService — modular, configurable trip pricing engine.
//
// This module keeps pricing RULES as data (config), not hard-coded throughout
// the app. Different vehicle classes and future transport modes (taxi/auto/bus/
// truck/delivery/rental) can be added by expanding the CONFIG, not the code.
//
// NOTE: Rates are illustrative defaults. In production they should be loaded
// from a database / official data source and can be edited by admins.

const VEHICLE_TYPES = {
  auto: { label: 'Auto', base: 20, perKm: 9, fuelPerKm: 1.1, fuel: 'CNG' },
  car: { label: 'Car', base: 40, perKm: 12, fuelPerKm: 6.5, fuel: 'Petrol' },
  suv: { label: 'SUV', base: 60, perKm: 16, fuelPerKm: 8.5, fuel: 'Diesel' },
  bike: { label: 'Bike', base: 15, perKm: 5, fuelPerKm: 2.0, fuel: 'Petrol' },
  truck: { label: 'Truck', base: 120, perKm: 22, fuelPerKm: 16, fuel: 'Diesel' },
  bus: { label: 'Bus', base: 150, perKm: 30, fuelPerKm: 24, fuel: 'Diesel' }
};

export const pricingConfig = {
  waitingPerMin: 2,
  driverCharge: 10,
  serviceChargePct: 5,
  tollRatePerKm: 0, // overridden per vehicle below
  currency: 'INR'
};

// Fuel price per litre (INR) — configurable, updatable from an official source later.
const FUEL_PRICE = {
  Petrol: 104,
  Diesel: 95,
  CNG: 76,
  Electric: 10
};

export function getVehicleTypes() {
  return Object.entries(VEHICLE_TYPES).map(([id, v]) => ({ id, ...v }));
}

/**
 * Estimate the full trip cost for a vehicle type given distance and duration.
 * @param {{type: string, distanceKm: number, durationMin: number, waitingMin?: number, tollKm?: number}} input
 */
export function estimateTripCost(input) {
  const vt = VEHICLE_TYPES[input.type] || VEHICLE_TYPES.car;
  const distanceKm = input.distanceKm || 0;
  const waitingMin = input.waitingMin || 0;
  const tollKm = input.tollKm || distanceKm * 0.5;

  const base = vt.base;
  const perKm = Math.round(distanceKm * vt.perKm);
  const toll = Math.round(tollKm * 1.8); // INR toll estimate
  const fuelLitres = (distanceKm * vt.fuelPerKm) / 100;
  const fuel = Math.round(fuelLitres * (FUEL_PRICE[vt.fuel] || 100));
  const waiting = Math.round(waitingMin * pricingConfig.waitingPerMin);
  const serviceCharge = Math.round(
    ((base + perKm + toll + fuel + waiting) * pricingConfig.serviceChargePct) /
      100
  );
  const total = base + perKm + toll + fuel + waiting + serviceCharge;

  return {
    vehicle: vt,
    base,
    perKm,
    toll,
    fuel,
    fuelLitres: +fuelLitres.toFixed(2),
    waiting,
    serviceCharge,
    total,
    currency: pricingConfig.currency,
    breakdown: {
      baseFare: base,
      distanceCharge: perKm,
      tollCharge: toll,
      fuelCharge: fuel,
      waitingCharge: waiting,
      serviceCharge
    }
  };
}

export default { getVehicleTypes, estimateTripCost, VEHICLE_TYPES, pricingConfig };
