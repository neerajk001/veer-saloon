/**
 * Feature test script for Veer Salon.
 * Run with: node scripts/test-features.mjs
 * Requires dev server: npm run dev (in another terminal)
 */
const BASE = process.env.BASE_URL || 'http://localhost:3000';

const log = (msg, ok = null) => {
  const icon = ok === true ? '✓' : ok === false ? '✗' : '·';
  const color = ok === true ? '\x1b[32m' : ok === false ? '\x1b[31m' : '';
  console.log(`${color}${icon}\x1b[0m ${msg}`);
};

async function get(path, label) {
  try {
    const r = await fetch(`${BASE}${path}`);
    const ok = r.ok;
    log(`${label} GET ${path} → ${r.status}`, ok);
    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
    return { ok, status: r.status, data };
  } catch (e) {
    log(`${label} GET ${path} → Error: ${e.message}`, false);
    return { ok: false, error: e.message };
  }
}

async function post(path, body, label) {
  try {
    const r = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const ok = r.ok;
    log(`${label} POST ${path} → ${r.status}`, ok);
    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
    return { ok, status: r.status, data };
  } catch (e) {
    log(`${label} POST ${path} → Error: ${e.message}`, false);
    return { ok: false, error: e.message };
  }
}

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

async function run() {
  console.log('\n--- Veer Salon feature tests ---\n');
  let passed = 0;
  let failed = 0;

  // 1) Services
  const servicesRes = await get('/api/services/all', 'Services');
  if (servicesRes.ok && servicesRes.data?.services) {
    passed++;
  } else if (servicesRes.status === 404) {
    log('  (no services in DB – OK)', true);
    passed++;
  } else {
    failed++;
  }

  // 2) Daily count
  const today = new Date().toISOString().split('T')[0];
  const dailyRes = await get(`/api/appointments/daily-count?date=${today}`, 'Daily count');
  if (dailyRes.ok && typeof dailyRes.data?.total === 'number') {
    passed++;
  } else {
    failed++;
  }

  // 3) Monthly count
  const monthlyRes = await get('/api/appointments/monthly-count', 'Monthly count');
  if (monthlyRes.ok && typeof monthlyRes.data?.total === 'number') {
    passed++;
  } else {
    failed++;
  }

  // 4) Appointments for a date (requires date param)
  const dateForApp = tomorrow();
  const appRes = await get(`/api/appointments?date=${dateForApp}`, 'Appointments by date');
  if (appRes.ok && Array.isArray(appRes.data)) {
    passed++;
  } else if (appRes.status === 400) {
    log('  (date required – OK)', true);
    passed++;
  } else {
    failed++;
  }

  // 5) Slots (need valid date + serviceId)
  let serviceId = null;
  if (servicesRes.data?.services?.length) {
    serviceId = servicesRes.data.services[0]._id;
  }
  if (serviceId) {
    const slotsRes = await get(
      `/api/appointments/slots?date=${dateForApp}&serviceId=${serviceId}`,
      'Slots'
    );
    if (slotsRes.ok && Array.isArray(slotsRes.data?.availableSlots)) {
      passed++;
      log(`  availableSlots.length = ${slotsRes.data.availableSlots.length}`, true);
    } else {
      failed++;
    }
  } else {
    const slotsRes = await get(
      `/api/appointments/slots?date=${dateForApp}&serviceId=000000000000000000000001`,
      'Slots (no services)'
    );
    if (slotsRes.status === 404) {
      passed++;
    } else {
      failed++;
    }
  }

  // 6) Closures list
  const closuresRes = await get('/api/admin/closures', 'Closures list');
  if (closuresRes.ok && Array.isArray(closuresRes.data)) {
    passed++;
  } else {
    failed++;
  }

  // 7) Appointments GET without date → 400
  const appNoDate = await get('/api/appointments', 'Appointments no date');
  if (appNoDate.status === 400) {
    passed++;
  } else {
    failed++;
  }

  // 8) Closure validation: invalid 5-min (e.g. 10:07) should be rejected
  const invalidClosure = await post(
    '/api/admin/closures',
    {
      startDate: dateForApp,
      endDate: dateForApp,
      isFullDay: false,
      startTime: '10:07',
      endTime: '11:00',
      reason: 'Test',
    },
    'Closure invalid 5-min'
  );
  if (invalidClosure.status === 400 && invalidClosure.data?.message?.toLowerCase().includes('5')) {
    passed++;
    log('  (rejected non–5-min time)', true);
  } else {
    failed++;
  }

  // 9) Closure validation: end before start
  const badRange = await post(
    '/api/admin/closures',
    {
      startDate: dateForApp,
      endDate: dateForApp,
      isFullDay: false,
      startTime: '11:00',
      endTime: '10:00',
      reason: 'Test',
    },
    'Closure end before start'
  );
  if (badRange.status === 400) {
    passed++;
  } else {
    failed++;
  }

  // 10) Config
  const configRes = await get('/api/config', 'Config');
  if (configRes.ok && configRes.data != null) {
    passed++;
  } else if (configRes.status === 404) {
    log('  (no config – OK)', true);
    passed++;
  } else {
    failed++;
  }

  // 11) Booking dates: slots for tomorrow (UI shows tomorrow & day after only)
  const tomorrowSlots = await get(
    `/api/appointments/slots?date=${dateForApp}&serviceId=${serviceId || '000000000000000000000001'}`,
    'Slots tomorrow'
  );
  if (tomorrowSlots.ok || tomorrowSlots.status === 404) {
    passed++;
  } else {
    failed++;
  }

  console.log('\n--- Summary ---');
  console.log(`Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
