/* Care Me — UI. Depends on data.js and engine.js. */
{
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r0 = n => Math.round(n || 0);
const fmt = n => r0(n).toLocaleString('en-IN');
const dayKey = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const today = () => dayKey(Date.now());
const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const Cap = window.Capacitor;
const plugin = n => Cap?.Plugins?.[n];
const native = !!Cap?.isNativePlatform?.();

/* ---------- state ---------- */
const KEY = 'careme.v2';
const DEF = { v: 2, onboarded: false, profile: structuredClone(DEF_PROFILE), ai: { prov: 'gemini', key: '', model: '' },
  meals: [], water: {}, weights: [], readings: [], plan: null, review: null, rem: { meals: false, water: false, weigh: false },
  hc: { linked: false, eatBack: false, writeMeals: true, last: 0, day: '', data: {} }, fast: { start: 0, goalH: 14, last: null } };
let S;
function load() {
  let raw = null; try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  if (!raw) { // migrate from the earlier Food Calorie Analyzer
    try { const o = JSON.parse(localStorage.getItem('fca.v1') || 'null');
      if (o) raw = { meals: o.meals || [], water: o.water || {}, ai: o.ai, profile: { ...o.profile, targetOverride: o.profile?.target || '', waterGoal: o.profile?.water || 8 } }; } catch (e) {}
  }
  S = Object.assign(structuredClone(DEF), raw || {});
  S.profile = Object.assign(structuredClone(DEF_PROFILE), S.profile); S.ai = Object.assign({}, DEF.ai, S.ai);
  S.hc = Object.assign({}, DEF.hc, S.hc); S.fast = Object.assign({}, DEF.fast, S.fast); S.rem = Object.assign({}, DEF.rem, S.rem);
}
load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Phone storage is full — delete some old meals'); } };
const T = () => computeTargets(S.profile);
const ctx = () => userContext(S.profile, T());
const ai = (prompt, blob, big) => aiCall(S.ai, prompt, blob, big);

/* ---------- small helpers ---------- */
let toastT;
function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2600); }
function setStatus(id, t, kind) { const el = $(id); el.textContent = t; el.className = 'status' + (kind ? ' ' + kind : ''); }
function ask(text, yes = 'Delete') { return new Promise(res => { $('confirmTxt').textContent = text; $('cYes').textContent = yes; $('confirm').hidden = false;
  const done = v => { $('confirm').hidden = true; $('cYes').onclick = $('cNo').onclick = null; res(v); };
  $('cYes').onclick = () => done(true); $('cNo').onclick = () => done(false); }); }
function canvasFrom(src, max) {
  const w = src.videoWidth || src.width, h = src.videoHeight || src.height, sc = Math.min(1, max / Math.max(w, h));
  const cv = document.createElement('canvas'); cv.width = Math.round(w * sc); cv.height = Math.round(h * sc);
  cv.getContext('2d').drawImage(src, 0, 0, cv.width, cv.height); return cv;
}
const totOf = it => ({ k: it.kcal * it.qty, p: it.p * it.qty, c: it.c * it.qty, f: it.f * it.qty, sug: (it.sug || 0) * it.qty, fib: (it.fib || 0) * it.qty, na: (it.na || 0) * it.qty });
const sumOf = list => list.reduce((a, it) => { const t = totOf(it); for (const k in t) a[k] += t[k]; return a; }, { k: 0, p: 0, c: 0, f: 0, sug: 0, fib: 0, na: 0 });
const mealsOn = k => S.meals.filter(m => dayKey(m.ts) === k);
const dayTotals = k => sumOf(mealsOn(k).flatMap(m => m.items));
const mealType = (d = new Date()) => { const h = d.getHours(); return h < 11 ? 'Breakfast' : h < 16 ? 'Lunch' : h < 19 ? 'Snacks' : 'Dinner'; };
const errMsg = e => e?.code === 'rate_limited' ? 'Too many requests — wait a minute and try again.' : (e?.message || 'Something went wrong');
function handleAiErr(e, statusId) {
  if (e?.code === 'nokey') { setStatus(statusId, e.message, 'err'); toast('Set up the AI engine first'); setTimeout(() => { go('profile'); $('aiForm').scrollIntoView({ behavior: 'smooth' }); }, 900); }
  else setStatus(statusId, errMsg(e), 'err');
}
function budget() { const t = T(), ex = S.hc.linked && S.hc.eatBack && S.hc.day === today() ? r0((S.hc.data.active || 0) * 0.5) : 0; return { kcal: t.kcal + ex, ex }; }
function streak() {
  const days = new Set(S.meals.map(m => dayKey(m.ts))); let n = 0, d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); } return n;
}

/* ---------- navigation ---------- */
const TITLES = { today: 'Care Me', scan: 'Scan meal', plan: 'Diet plan', progress: 'Progress', profile: 'Profile' };
let tab = 'today';
function go(t) {
  tab = t;
  for (const k in TITLES) $('v-' + k).hidden = k !== t;
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.go === t));
  $('title').textContent = TITLES[t];
  $('camStage').hidden = t === 'scan' && !!editing;
  if (t === 'scan' && !shotBlob && !editing) startCam(); else stopCam();
  ({ today: renderToday, scan: renderQuick, plan: renderPlan, progress: renderProgress, profile: renderProfile })[t]();
  window.scrollTo(0, 0);
}
document.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) go(b.dataset.go); });
plugin('App')?.addListener('backButton', () => {
  if (!$('confirm').hidden) return $('cNo').click();
  if (!$('sheet').hidden) return closeSheet();
  if (!$('onb').hidden) { if (onbStep > 0) return onbMove(-1); return; }
  if (tab !== 'today') return go('today');
  plugin('App').exitApp();
});
plugin('App')?.addListener('appStateChange', s => { if (s.isActive) { maybeSync(); if (tab === 'today') renderToday(); } });

/* ================= TODAY ================= */
function ring(eaten, tgt) {
  const pct = Math.min(1, eaten / tgt), R = 62, C = 2 * Math.PI * R, over = eaten > tgt;
  return `<svg viewBox="0 0 150 150"><circle cx="75" cy="75" r="${R}" fill="none" stroke="var(--turSoft)" stroke-width="16"/>
   <circle cx="75" cy="75" r="${R}" fill="none" stroke="${over ? 'var(--chili)' : 'var(--tur)'}" stroke-width="16" stroke-linecap="round" stroke-dasharray="${C * pct} ${C}" transform="rotate(-90 75 75)"/>
   <text x="75" y="72" text-anchor="middle" font-family="Baloo 2,system-ui" font-weight="800" font-size="28" fill="var(--ink)">${r0(eaten / tgt * 100)}%</text>
   <text x="75" y="94" text-anchor="middle" font-size="12" fill="var(--mute)">of budget</text></svg>`;
}
function bar(label, v, t, color, mode = 'max', unit = 'g') {
  const over = mode === 'max' && v > t, pct = Math.min(100, v / t * 100);
  return `<div class="nut"><div class="split2"><span>${label}</span><span class="${over ? 'over' : 'meta'}">${fmt(v)} / ${fmt(t)} ${unit}${mode === 'min' ? ' goal' : mode === 'max' && label !== 'Protein' ? ' max' : ''}</span></div>
   <div class="bar"><i style="width:${pct}%;background:${over ? 'var(--chili)' : color}"></i></div></div>`;
}
function insights(s, t, b) {
  const h = new Date().getHours(), out = [], p = S.profile, n = mealsOn(today()).length;
  if (!n) out.push(h < 11 ? ['Good morning!', 'Snap your breakfast to start today\'s log.'] : ['Nothing logged yet', 'Scan your last meal to keep your streak going.']);
  if (s.sug > t.sug) out.push(['Sugar is over today\'s limit', `${r0(s.sug)} g eaten vs ${t.sug} g. Skip sweets and sweetened tea for the rest of the day.`]);
  if (s.na > t.na) out.push(['High salt today', `${fmt(s.na)} mg sodium. Avoid pickle, papad and packaged snacks at dinner; drink water.`]);
  if (s.k > b.kcal) out.push(['Over your calorie budget', `${fmt(s.k - b.kcal)} kcal over. A 30-minute walk burns about 120–150 kcal.`]);
  if (h >= 17 && n && s.p < t.prot * 0.6) out.push(['Protein is low', `Only ${r0(s.p)} g so far. Add dal, curd, egg, paneer, chicken or sundal to dinner.`]);
  if (h >= 18 && n && s.fib < t.fib * 0.5) out.push(['Add fibre', 'Include a vegetable poriyal, salad or keerai at dinner.']);
  const w = S.water[today()] || 0; if (h >= 15 && w < t.water / 2) out.push(['Drink some water', `${w} of ${t.water} glasses so far.`]);
  const last = S.readings.filter(r => r.type !== 'bp').sort((a, b) => b.ts - a.ts)[0];
  if (last && Date.now() - last.ts < 864e5 && readingHigh(last)) out.push(['Recent sugar reading was high', 'Keep the next meal low in rice/sweets and check with your doctor if it stays high.']);
  if (!out.length && n) out.push(['You\'re on track', `Calories, sugar and salt are within your limits. ${streak() > 1 ? streak() + '-day logging streak — keep going!' : ''}`]);
  return out.slice(0, 2);
}
function renderToday() {
  const t = T(), b = budget(), s = dayTotals(today()), p = S.profile;
  $('hello').textContent = p.name ? p.name.split(' ')[0] : 'Set up';
  $('ring').innerHTML = ring(s.k, b.kcal);
  $('tEaten').textContent = fmt(s.k);
  $('goalLbl').textContent = labelOf(WGOALS, p.wgoal) + (streak() ? ` · 🔥 ${streak()}-day streak` : '');
  $('tLeft').textContent = (s.k <= b.kcal ? `of ${fmt(b.kcal)} kcal · ${fmt(b.kcal - s.k)} left` : `${fmt(s.k - b.kcal)} kcal over ${fmt(b.kcal)}`) + (b.ex ? ` (incl. ${b.ex} from exercise)` : '');
  const ins = insights(s, t, b);
  $('insight').hidden = !ins.length; $('insight').innerHTML = ins.map(([h, x]) => `<div><b>${esc(h)}</b>${esc(x)}</div>`).join('<hr style="border:0;border-top:1px dashed var(--line);margin:10px 0">');
  $('nutri').innerHTML = bar('Protein', s.p, t.prot, 'var(--p)', 'min') + bar('Carbs', s.c, t.carb, 'var(--c)') + bar('Fat', s.f, t.fat, 'var(--f)') +
    bar('Sugar', s.sug, t.sug, '#b06ab3') + bar('Sodium', s.na, t.na, '#5c8a8a', 'max', 'mg') + bar('Fibre', s.fib, t.fib, 'var(--veg)', 'min');
  renderActivity(); renderWater(); renderFast();
  const ms = mealsOn(today());
  $('todayMeals').innerHTML = ms.length ? ms.slice().reverse().map(mealRow).join('') : '<p class="empty">Nothing logged yet today. Tap Scan to photograph your meal.</p>';
  maybeSync();
}
function renderWater() {
  const goal = T().water, w = S.water[today()] || 0;
  $('water').innerHTML = Array.from({ length: goal }, (_, i) => `<button class="${i < w ? 'on' : ''}" data-w="${i}" aria-label="Glass ${i + 1}"></button>`).join('');
  $('waterTxt').textContent = `${w} of ${goal} glasses`;
}
$('water').addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (!b) return; const k = today(), i = +b.dataset.w;
  S.water[k] = (S.water[k] || 0) === i + 1 ? i : i + 1; save(); renderWater(); });
function mealRow(m) {
  const s = sumOf(m.items), t = new Date(m.ts);
  return `<button class="meal" data-meal="${m.id}">${m.thumb ? `<img src="${m.thumb}" alt="">` : '<span class="ph"></span>'}
   <span><b>${esc(m.type)}${m.score ? ` <span class="gi ${m.score >= 7 ? 'gi-low' : m.score >= 4 ? 'gi-med' : 'gi-high'}">${m.score}/10</span>` : ''}</b><span class="meta">${t.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })} · ${esc(m.items.map(i => i.name.split(' (')[0]).slice(0, 3).join(', '))}${m.items.length > 3 ? '…' : ''}</span></span>
   <span class="k">${fmt(s.k)} kcal</span></button>`;
}

/* ----- fasting timer (lives inside the activity card area) ----- */
let fastTick;
function renderFast() {
  clearInterval(fastTick);
  const el = $('fastBox'); if (!el) return;
  const f = S.fast;
  if (f.start) {
    const draw = () => { const h = (Date.now() - f.start) / 36e5, pct = Math.min(100, h / f.goalH * 100);
      el.innerHTML = `<div class="split2"><b>Fasting ${Math.floor(h)}h ${String(Math.floor(h % 1 * 60)).padStart(2, '0')}m</b><span class="meta">goal ${f.goalH} h</span></div>
       <div class="bar"><i style="width:${pct}%;background:${pct >= 100 ? 'var(--veg)' : 'var(--tur)'}"></i></div>
       <div class="row"><button class="alt grow" id="fastEnd">${pct >= 100 ? 'Goal reached — end fast' : 'End fast'}</button></div>`; };
    draw(); fastTick = setInterval(() => { if (tab === 'today') draw(); }, 30000);
  } else {
    el.innerHTML = `<div class="split2"><b>Fasting timer</b><span class="meta">${f.last ? 'Last: ' + f.last : 'Optional — e.g. 14:10 overnight'}</span></div>
     <div class="row"><select id="fastGoal" aria-label="Fasting goal" style="width:auto">${[12, 13, 14, 16, 18].map(h => `<option ${h === f.goalH ? 'selected' : ''} value="${h}">${h} hours</option>`).join('')}</select><button class="alt grow" id="fastStart">Start fast now</button></div>`;
  }
}
document.addEventListener('click', e => {
  if (e.target.id === 'fastStart') { if (S.profile.conds.some(c => ['t1d', 'preg', 'bf'].includes(c))) toast('Check with your doctor before fasting'); S.fast.goalH = +$('fastGoal').value; S.fast.start = Date.now(); save(); renderFast(); }
  if (e.target.id === 'fastEnd') { const h = (Date.now() - S.fast.start) / 36e5; S.fast.last = `${Math.floor(h)}h ${Math.floor(h % 1 * 60)}m on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`; S.fast.start = 0; save(); renderFast(); toast('Fast ended — well done'); }
});

/* ================= FITNESS DEVICES (Health Connect) ================= */
const HC = () => plugin('Health');
const HC_READ = ['steps', 'calories', 'heartRate', 'restingHeartRate', 'sleep', 'weight', 'workouts', 'distance', 'bloodGlucose', 'bloodPressure'];
const HC_WRITE = ['weight', 'dietaryEnergyConsumed'];
const DEVICES = ['Fitbit', 'Samsung Galaxy Watch', 'Mi Band / Mi Fitness', 'Amazfit (Zepp)', 'Noise', 'boAt', 'Fire-Boltt', 'Garmin', 'Pixel Watch', 'OnePlus Watch', 'Withings scale', 'Omron BP monitor', 'Accu-Chek glucometer', 'Google Fit'];
function renderActivity() {
  const el = $('activity'), d = S.hc.day === today() ? S.hc.data : {};
  if (!S.hc.linked) {
    el.innerHTML = `<h2>Activity</h2><p class="meta">Link your smartwatch, fitness band or smart scale to see steps, calories burned, sleep and heart rate here.</p>
     <div class="row"><button class="alt grow" data-go="profile" id="toDevices">Link a fitness device</button></div><div id="fastBox" style="margin-top:14px"></div>`;
    return;
  }
  const sl = d.sleep ? `${Math.floor(d.sleep / 60)}h ${r0(d.sleep % 60)}m` : '—';
  el.innerHTML = `<div class="split2"><h2>Activity</h2><button class="link" id="hcSync">${S.hc.last ? 'Synced ' + new Date(S.hc.last).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : 'Sync now'}</button></div>
   <div class="act"><div><b>${d.steps != null ? fmt(d.steps) : '—'}</b><small>steps · goal 8,000</small><div class="bar"><i style="width:${Math.min(100, (d.steps || 0) / 80)}%;background:var(--veg)"></i></div></div>
   <div><b>${d.active != null ? fmt(d.active) : '—'}</b><small>active kcal burned</small></div>
   <div><b>${sl}</b><small>sleep last night</small></div>
   <div><b>${d.rhr ? r0(d.rhr) : '—'}</b><small>${d.rhrResting ? 'resting' : 'latest'} heart rate (bpm)</small></div></div>
   ${d.workouts?.length ? `<p class="meta" style="margin-top:10px">Workouts: ${d.workouts.map(w => `${esc(w.type)} ${r0(w.min)} min${w.kcal ? ' · ' + r0(w.kcal) + ' kcal' : ''}`).join(' · ')}</p>` : ''}
   <div id="fastBox" style="margin-top:14px"></div>`;
}
document.addEventListener('click', e => { if (e.target.id === 'hcSync') syncHC(true); if (e.target.id === 'toDevices') setTimeout(() => $('devices').scrollIntoView({ behavior: 'smooth' }), 50); });

function renderDevices() {
  const el = $('devices'), avail = !!HC();
  el.innerHTML = `<h2>Fitness devices</h2>
   <p class="meta">Care Me connects through <b>Health Connect</b>, Android's health hub. Any watch, band, scale, BP monitor or glucometer whose app syncs to Health Connect works, including:</p>
   <div class="devs">${DEVICES.map(d => `<span>${d}</span>`).join('')}</div>
   ${S.hc.linked ? `<p><b style="color:var(--veg)">● Linked</b> <span class="meta">${S.hc.last ? 'last sync ' + new Date(S.hc.last).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : ''}</span></p>
    <label class="tog"><input type="checkbox" id="hcEat" ${S.hc.eatBack ? 'checked' : ''}><span>Add half of my exercise calories to today's food budget</span></label>
    <label class="tog"><input type="checkbox" id="hcWrite" ${S.hc.writeMeals ? 'checked' : ''}><span>Send my logged meal calories and weight to Health Connect</span></label>
    <div class="row"><button class="alt grow" id="hcSync2">Sync now</button><button class="alt grow" id="hcSettings">Manage permissions</button><button class="alt danger" id="hcUnlink">Unlink</button></div>`
    : `<div class="row"><button class="hot grow" id="hcLink">Link fitness device</button></div>
    <p class="meta">${avail ? 'Setup: 1) In your watch app (Fitbit, Samsung Health, Mi Fitness, Zepp, NoiseFit…) turn on "Sync with Health Connect". 2) Tap Link above and allow access.' : 'Available in the Android app. (Not in this web preview.)'}</p>`}
   <p class="status" id="hcStatus"></p>`;
}
document.addEventListener('click', async e => {
  const id = e.target.id;
  if (id === 'hcLink') linkHC();
  if (id === 'hcSync2') syncHC(true);
  if (id === 'hcSettings') { try { await HC().openHealthConnectSettings(); } catch (err) { toast('Open the Health Connect app from Settings'); } }
  if (id === 'hcUnlink') { S.hc.linked = false; S.hc.data = {}; save(); renderDevices(); toast('Unlinked. You can also remove access in Health Connect.'); }
});
document.addEventListener('change', e => { if (e.target.id === 'hcEat') { S.hc.eatBack = e.target.checked; save(); } if (e.target.id === 'hcWrite') { S.hc.writeMeals = e.target.checked; save(); } });

async function linkHC() {
  const H = HC(); if (!H) return toast('Fitness devices work in the Android app');
  setStatus('hcStatus', 'Checking Health Connect…', 'busy');
  try {
    const av = await H.isAvailable();
    if (!av.available) {
      $('hcStatus').className = 'status err';
      $('hcStatus').innerHTML = `Health Connect isn't ready on this phone${av.reason ? ' (' + esc(av.reason) + ')' : ''}. Install or update <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata">Health Connect from the Play Store</a>, then tap Link again.`;
      return;
    }
    const st = await H.requestAuthorization({ read: HC_READ, write: HC_WRITE });
    if (!st.readAuthorized?.length) { setStatus('hcStatus', 'No access was granted. Tap Link again and allow at least Steps.', 'err'); return; }
    S.hc.linked = true; save(); renderDevices(); await syncHC(true);
    toast(`Linked — ${st.readAuthorized.length} data types shared`);
  } catch (err) { setStatus('hcStatus', 'Could not link: ' + errMsg(err), 'err'); }
}
function maybeSync() { if (S.hc.linked && Date.now() - S.hc.last > 10 * 60e3) syncHC(false); }
let syncing = false;
async function syncHC(loud) {
  const H = HC(); if (!H || !S.hc.linked || syncing) return; syncing = true;
  const now = new Date(), sod = startOfDay(), iso = d => d.toISOString(), d = {};
  const sumAgg = async type => { const r = await H.queryAggregated({ dataType: type, startDate: iso(sod), endDate: iso(now), bucket: 'day', aggregation: 'sum' }); return (r.samples || []).reduce((a, s) => a + (s.value || 0), 0); };
  try { d.steps = r0(await sumAgg('steps')); } catch (e) {}
  try { d.active = r0(await sumAgg('calories')); } catch (e) {}
  try { const r = await H.readSamples({ dataType: 'restingHeartRate', startDate: iso(new Date(Date.now() - 2 * 864e5)), endDate: iso(now), limit: 1 }); if (r.samples?.[0]) { d.rhr = r.samples[0].value; d.rhrResting = true; } } catch (e) {}
  if (!d.rhr) try { const r = await H.readSamples({ dataType: 'heartRate', startDate: iso(sod), endDate: iso(now), limit: 1 }); if (r.samples?.[0]) d.rhr = r.samples[0].value; } catch (e) {}
  try { const from = new Date(sod); from.setHours(-6); const r = await H.readSamples({ dataType: 'sleep', startDate: iso(from), endDate: iso(now), limit: 50 });
    d.sleep = (r.samples || []).filter(s => s.sleepState !== 'awake' && s.sleepState !== 'outOfBed').reduce((a, s) => a + (new Date(s.endDate) - new Date(s.startDate)) / 6e4, 0) || null; } catch (e) {}
  try { const r = await H.queryWorkouts({ startDate: iso(sod), endDate: iso(now), limit: 10 });
    d.workouts = (r.workouts || []).map(w => ({ type: String(w.workoutType || 'Workout').replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()), min: (w.duration || 0) / 60, kcal: w.totalEnergyBurned })); } catch (e) {}
  const monthAgo = iso(new Date(Date.now() - 30 * 864e5));
  try { const r = await H.readSamples({ dataType: 'weight', startDate: monthAgo, endDate: iso(now), limit: 30 });
    for (const s of r.samples || []) addWeight(dayKey(s.startDate), s.value, 'device');
    const latest = (r.samples || []).sort((a, b) => new Date(b.startDate) - new Date(a.startDate))[0]; if (latest && dayKey(latest.startDate) >= (S.weights.at(-1)?.d || '')) S.profile.w = r1(latest.value); } catch (e) {}
  try { const r = await H.readSamples({ dataType: 'bloodGlucose', startDate: monthAgo, endDate: iso(now), limit: 30 });
    for (const s of r.samples || []) addReading({ ts: +new Date(s.startDate), type: 'rbs', val: r0(s.unit === 'mg/dL' ? s.value : s.value * 18), src: 'device' }); } catch (e) {}
  try { const r = await H.readSamples({ dataType: 'bloodPressure', startDate: monthAgo, endDate: iso(now), limit: 30 });
    for (const s of r.samples || []) if (s.systolic) addReading({ ts: +new Date(s.startDate), type: 'bp', sys: r0(s.systolic), dia: r0(s.diastolic), src: 'device' }); } catch (e) {}
  S.hc.data = d; S.hc.day = today(); S.hc.last = Date.now(); save(); syncing = false;
  if (loud) toast('Fitness data synced');
  if (tab === 'today') { renderActivity(); renderFast(); } if (tab === 'profile') renderDevices(); if (tab === 'progress') renderProgress();
}
async function hcWrite(opts) { if (!S.hc.linked || !S.hc.writeMeals || !HC()) return; try { await HC().saveSample(opts); } catch (e) {} }

/* ================= CAMERA ================= */
let stream = null, facing = 'environment', shotBlob = null, shotURL = '', torchOn = false;
async function startCam() {
  if (stream) return;
  $('camMsg').textContent = 'Starting camera…';
  if (!navigator.mediaDevices?.getUserMedia) { $('camMsg').textContent = 'Live camera not available here — use the gallery button.'; return; }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
    if (tab !== 'scan' || shotBlob || editing) { stopCam(); return; }
    $('video').srcObject = stream; await $('video').play().catch(() => {});
    $('camMsg').textContent = 'Fit the whole plate inside the circle, from above';
    const tr = stream.getVideoTracks()[0], cap = tr.getCapabilities?.() || {};
    $('torch').hidden = !cap.torch; torchOn = false; $('torch').classList.remove('on');
  } catch (e) {
    stream = null;
    $('camMsg').textContent = e.name === 'NotAllowedError' ? 'Camera permission denied. Allow it in Settings → Apps → Care Me → Permissions, or use the gallery.' : 'Could not open the camera — use the gallery button.';
  }
}
function stopCam() { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } $('video').srcObject = null; }
$('flip').addEventListener('click', () => { facing = facing === 'environment' ? 'user' : 'environment'; stopCam(); startCam(); });
$('torch').addEventListener('click', async () => { const tr = stream?.getVideoTracks()[0]; if (!tr) return; torchOn = !torchOn;
  try { await tr.applyConstraints({ advanced: [{ torch: torchOn }] }); $('torch').classList.toggle('on', torchOn); } catch (e) { torchOn = false; } });
$('snap').addEventListener('click', async () => { const v = $('video'); if (!stream || !v.videoWidth) { $('file').click(); return; }
  const cv = canvasFrom(v, 1280); setShot(await new Promise(r => cv.toBlob(r, 'image/jpeg', .85))); });
$('gallery').addEventListener('click', () => $('file').click());
$('file').addEventListener('change', async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try { const bmp = await createImageBitmap(f); const cv = canvasFrom(bmp, 1280); setShot(await new Promise(r => cv.toBlob(r, 'image/jpeg', .85))); } catch (err) { setShot(f); } });
function setShot(b) {
  shotBlob = b; if (shotURL) URL.revokeObjectURL(shotURL); shotURL = URL.createObjectURL(b);
  stopCam(); $('shot').src = shotURL; $('shot').hidden = false; $('video').hidden = true; $('torch').hidden = true; $('camMsg').textContent = '';
  $('camBar').hidden = true; $('shotBar').hidden = false; setStatus('status', 'Looks good? Tap Analyse.');
}
function resetShot() {
  shotBlob = null; $('shot').hidden = true; $('video').hidden = false; $('camBar').hidden = false; $('shotBar').hidden = true; setStatus('status', '');
  items = []; meta = {}; editing = null; $('review').hidden = true; $('camStage').hidden = false; if (tab === 'scan') startCam();
}
$('retake').addEventListener('click', resetShot);

/* quick re-log of frequent meals */
function renderQuick() {
  let el = $('quick'); if (!el) { el = document.createElement('div'); el.id = 'quick'; $('v-scan').append(el); }
  const seen = new Map();
  S.meals.slice().sort((a, b) => b.ts - a.ts).forEach(m => { const key = m.items.map(i => i.name).sort().join('|'); if (!seen.has(key)) seen.set(key, { m, n: 0 }); seen.get(key).n++; });
  const top = [...seen.values()].sort((a, b) => b.n - a.n || b.m.ts - a.m.ts).slice(0, 6);
  el.innerHTML = top.length && !editing ? `<div class="card"><h2>Eat this often?</h2><p class="meta">Tap to log again without a photo.</p><div class="chips">${top.map(({ m }) =>
    `<button class="chip" data-relog="${m.id}">${esc(m.items.map(i => i.name.split(' (')[0]).slice(0, 2).join(' + '))}${m.items.length > 2 ? ' +' + (m.items.length - 2) : ''} · ${fmt(sumOf(m.items).k)}</button>`).join('')}</div></div>` : '';
}
document.addEventListener('click', e => { const b = e.target.closest('[data-relog]'); if (!b) return; const m = S.meals.find(x => x.id === b.dataset.relog); if (!m) return;
  stopCam(); shotBlob = null; editing = null; items = m.items.map(i => ({ ...i })); meta = { score: m.score, verdict: m.verdict, tip: m.tip, thumb: m.thumb };
  $('mealType').value = mealType(); renderBill(); setStatus('status', 'Loaded — adjust quantities, then save.'); $('review').scrollIntoView({ behavior: 'smooth' }); });

/* ================= REVIEW / BILL ================= */
let items = [], meta = {}, editing = null, busy = false;
const stepOf = u => /^(g|ml)$/i.test(u) ? 10 : 0.5;
const clean = x => {
  const it = { name: String(x.name || 'Dish').slice(0, 80), cuisine: String(x.cuisine || '').slice(0, 40), veg: ['veg', 'nonveg', 'egg'].includes(x.veg) ? x.veg : '',
    unit: String(x.unit || 'serving').slice(0, 24), qty: +x.qty > 0 ? +x.qty : 1, kcal: Math.max(0, +x.kcal || 0), p: Math.max(0, +x.p || 0), c: Math.max(0, +x.c || 0), f: Math.max(0, +x.f || 0),
    sug: Math.max(0, +x.sug || 0), fib: Math.max(0, +x.fib || 0), na: Math.max(0, +x.na || 0), gi: ['low', 'med', 'high'].includes(x.gi) ? x.gi : '',
    flags: (Array.isArray(x.flags) ? x.flags : []).map(f => String(f).slice(0, 60)).slice(0, 3), conf: x.conf != null && isFinite(+x.conf) ? Math.max(0, Math.min(1, +x.conf)) : null };
  const d = S.profile.diet;
  if ((['veg', 'jain', 'vegan'].includes(d) && it.veg === 'nonveg') || (['veg', 'jain', 'vegan'].includes(d) && it.veg === 'egg') || (d === 'egg' && it.veg === 'nonveg'))
    if (!it.flags.some(f => /veg/i.test(f))) it.flags.unshift('Not in your ' + labelOf(DIETS, d).toLowerCase() + ' diet');
  return it;
};
function renderBill() {
  $('review').hidden = false;
  $('items').innerHTML = items.length ? items.map((it, i) => `<div class="item">
   <div><div class="nm">${it.veg ? `<span class="dot ${it.veg}" title="${it.veg}"></span>` : ''}${esc(it.name)}${it.gi ? `<span class="gi gi-${it.gi}">${it.gi === 'med' ? 'medium' : it.gi} GI</span>` : ''}${it.conf != null ? `<span class="conf">${r0(it.conf * 100)}% sure</span>` : ''}</div>
    <div class="meta">${esc(it.cuisine)}${it.cuisine ? ' · ' : ''}${r1(it.kcal)} kcal per ${esc(it.unit)}</div>
    ${it.flags?.length ? `<div class="flags">${it.flags.map(f => `<span class="flag">${esc(f)}</span>`).join('')}</div>` : ''}</div>
   <div class="kc">${fmt(it.kcal * it.qty)} kcal</div>
   <div class="qty"><button class="alt" data-a="dec" data-i="${i}" aria-label="Less">−</button>
    <input type="number" inputmode="decimal" min="0" step="${stepOf(it.unit)}" value="${it.qty}" data-i="${i}" aria-label="Quantity of ${esc(it.name)}">
    <button class="alt" data-a="inc" data-i="${i}" aria-label="More">+</button><span class="u">${esc(it.unit)}</span>
    <button class="del" data-a="del" data-i="${i}">Remove</button></div></div>`).join('') : '<p class="empty">No dishes yet — add one below.</p>';
  const s = sumOf(items);
  $('tot').textContent = fmt(s.k) + ' kcal';
  $('fit').hidden = !meta.score;
  if (meta.score) $('fit').innerHTML = `<span class="score ${meta.score >= 7 ? 's-good' : meta.score >= 4 ? 's-mid' : 's-bad'}">${meta.score}</span><div><b>Fit for your goal: ${meta.score}/10</b><div class="meta">${esc(meta.verdict || '')}</div></div>`;
  $('tip').hidden = !meta.tip; $('tip').innerHTML = meta.tip ? '<b>Tip:</b> ' + esc(meta.tip) : '';
  $('save').textContent = editing ? 'Update diary entry' : 'Save to diary';
  $('save').disabled = $('report').disabled = !items.some(i => i.qty > 0);
}
$('items').addEventListener('click', e => { const b = e.target.closest('button[data-a]'); if (!b) return; const i = +b.dataset.i, it = items[i];
  if (b.dataset.a === 'inc') it.qty = r1(it.qty + stepOf(it.unit)); if (b.dataset.a === 'dec') it.qty = Math.max(0, r1(it.qty - stepOf(it.unit)));
  if (b.dataset.a === 'del') items.splice(i, 1); renderBill(); });
$('items').addEventListener('change', e => { if (e.target.tagName !== 'INPUT') return; const v = parseFloat(e.target.value); items[+e.target.dataset.i].qty = isFinite(v) && v >= 0 ? v : 0; renderBill(); });

$('analyze').addEventListener('click', async () => {
  if (!shotBlob || busy) return; busy = true; $('analyze').disabled = true; setStatus('status', 'Identifying each dish and checking it against your goals…', 'busy');
  try {
    const out = await ai(scanPrompt(ctx()), shotBlob);
    items = (Array.isArray(out?.items) ? out.items : []).map(clean);
    meta = { score: Math.max(1, Math.min(10, r0(+out?.score || 0))) || null, verdict: String(out?.verdict || '').slice(0, 160), tip: String(out?.tip || '').slice(0, 240) };
    $('mealType').value = mealType(); renderBill();
    if (items.length) { setStatus('status', `Found ${items.length} item${items.length > 1 ? 's' : ''}. Adjust quantities to what you actually ate.${out.note ? ' ' + out.note : ''}`); $('review').scrollIntoView({ behavior: 'smooth' }); }
    else setStatus('status', out?.note || 'No food recognised — try a clearer, top-down photo in good light.', 'err');
  } catch (e) { handleAiErr(e, 'status'); }
  finally { busy = false; $('analyze').disabled = false; }
});

async function addDish() {
  const name = $('addName').value.trim(); if (!name) return; const k = parseFloat($('addKcal').value);
  if (isFinite(k) && k >= 0) items.push(clean({ name, cuisine: 'Added by you', unit: 'serving', qty: 1, kcal: k }));
  else {
    $('addBtn').disabled = true; setStatus('status', 'Looking up ' + name + '…', 'busy');
    try { items.push(clean(await ai(lookupPrompt(ctx(), name)))); setStatus('status', ''); }
    catch (e) { setStatus('status', e.code === 'nokey' ? 'Enter the calories yourself, or set up the AI engine in Profile.' : 'Could not look that up — enter the calories yourself.', 'err'); $('addBtn').disabled = false; return; }
    $('addBtn').disabled = false;
  }
  $('addName').value = ''; $('addKcal').value = ''; renderBill();
}
$('addBtn').addEventListener('click', addDish);
$('addName').addEventListener('keydown', e => { if (e.key === 'Enter') addDish(); });

async function thumbOf(blob) { if (!blob) return ''; try { const bmp = await createImageBitmap(blob); return canvasFrom(bmp, 220).toDataURL('image/jpeg', .7); } catch (e) { return ''; } }
$('save').addEventListener('click', async () => {
  const live = items.filter(i => i.qty > 0); if (!live.length) return;
  if (editing) { const m = S.meals.find(m => m.id === editing); if (m) Object.assign(m, { items: live, type: $('mealType').value, ...meta, thumb: m.thumb }); }
  else {
    const m = { id: Date.now().toString(36), ts: Date.now(), type: $('mealType').value, items: live, score: meta.score || null, verdict: meta.verdict || '', tip: meta.tip || '', thumb: shotBlob ? await thumbOf(shotBlob) : (meta.thumb || '') };
    S.meals.push(m);
    const k = r0(sumOf(live).k); hcWrite({ dataType: 'dietaryEnergyConsumed', value: k, unit: 'kilocalorie', startDate: new Date(m.ts - 60e3).toISOString(), endDate: new Date(m.ts).toISOString() });
  }
  save(); toast(editing ? 'Diary entry updated' : 'Saved to your diary'); resetShot(); go('today');
});
$('report').addEventListener('click', () => openReport({ ts: Date.now(), type: $('mealType').value, items: items.filter(i => i.qty > 0), ...meta, thumb: shotURL || meta.thumb }));
$('demo').addEventListener('click', () => {
  stopCam(); shotBlob = null; editing = null; items = SAMPLE_MEAL.map(x => clean(x));
  meta = { score: 6, verdict: 'Good protein from chicken and dal; rice portion and payasam add a lot of fast carbs and sugar.', tip: 'Have 1 cup rice instead of 1.5 and swap payasam for a fruit — saves about 280 kcal and 20 g sugar.' };
  $('mealType').value = mealType(); renderBill(); setStatus('status', 'Sample meal loaded (example data).'); $('review').scrollIntoView({ behavior: 'smooth' });
});

/* ================= REPORT SHEET ================= */
let reportText = '';
function openReport(m) {
  const live = m.items, s = sumOf(live), t = T(), pct = s.k / t.kcal * 100;
  const pk = s.p * 4, ck = s.c * 4, fk = s.f * 9, mk = pk + ck + fk || 1, when = new Date(m.ts).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  $('receipt').innerHTML = `<div class="receipt"><div class="rhead">${m.thumb ? `<img src="${m.thumb}" alt="">` : ''}<div><h2 id="repT">${esc(m.type)} report</h2><div class="meta">${esc(when)} · ${live.length} item${live.length > 1 ? 's' : ''}</div></div></div>
   ${m.score ? `<div class="fit"><span class="score ${m.score >= 7 ? 's-good' : m.score >= 4 ? 's-mid' : 's-bad'}">${m.score}</span><div><b>Fit for your goal</b><div class="meta">${esc(m.verdict || '')}</div></div></div>` : ''}
   <div class="big"><div><b style="color:var(--chili)">${fmt(s.k)}</b><small>kcal</small></div><div><b>${r0(s.p)} g</b><small>protein</small></div><div><b>${r0(s.c)} g</b><small>carbs</small></div><div><b>${r0(s.f)} g</b><small>fat</small></div></div>
   <div class="tgrid"><div><b style="color:${s.sug > t.sug / 3 ? 'var(--chili)' : 'inherit'}">${r0(s.sug)} g</b><small>sugar (day max ${t.sug})</small></div><div><b>${r0(s.fib)} g</b><small>fibre (day goal ${t.fib})</small></div><div><b style="color:${s.na > t.na / 2 ? 'var(--chili)' : 'inherit'}">${fmt(s.na)}</b><small>mg sodium (max ${fmt(t.na)})</small></div></div>
   ${pk + ck + fk ? `<div class="stripe"><i style="width:${pk / mk * 100}%;background:var(--p)"></i><i style="width:${ck / mk * 100}%;background:var(--c)"></i><i style="width:${fk / mk * 100}%;background:var(--f)"></i></div>
   <div class="legend"><span><i style="background:var(--p)"></i>Protein ${r0(pk / mk * 100)}%</span><span><i style="background:var(--c)"></i>Carbs ${r0(ck / mk * 100)}%</span><span><i style="background:var(--f)"></i>Fat ${r0(fk / mk * 100)}%</span></div>` : ''}
   <div class="nut"><div class="meta">${r0(pct)}% of your ${fmt(t.kcal)} kcal daily target</div><div class="bar"><i style="width:${Math.min(100, pct)}%;background:var(--chili)"></i></div></div>
   <table class="small"><thead><tr><th>Dish</th><th>Qty</th><th>Protein</th><th>Carbs</th><th>Sugar</th><th>kcal</th></tr></thead><tbody>
   ${live.map(it => { const x = totOf(it); return `<tr><td>${it.veg ? `<span class="dot ${it.veg}"></span>` : ''}${esc(it.name)}</td><td>${r1(it.qty)} ${esc(it.unit)}</td><td>${r1(x.p)}g</td><td>${r1(x.c)}g</td><td>${r1(x.sug)}g</td><td>${fmt(x.k)}</td></tr>`; }).join('')}
   </tbody><tfoot><tr><td>Total</td><td></td><td>${r0(s.p)}g</td><td>${r0(s.c)}g</td><td>${r0(s.sug)}g</td><td>${fmt(s.k)}</td></tr></tfoot></table>
   ${m.tip ? `<div class="tip"><b>Tip:</b> ${esc(m.tip)}</div>` : ''}
   <p class="meta">Photo-based estimates, typically within ±20%. Not medical advice.</p></div>
   ${m.id ? `<div class="row center"><button class="alt" id="mEdit">Edit quantities</button><button class="alt danger" id="mDel">Delete meal</button></div>` : ''}`;
  reportText = `🍽 ${m.type} — ${when}\n` + live.map((it, i) => `${i + 1}. ${it.name} — ${r1(it.qty)} ${it.unit} — ${fmt(totOf(it).k)} kcal`).join('\n') +
    `\nTOTAL: ${fmt(s.k)} kcal | Protein ${r0(s.p)}g · Carbs ${r0(s.c)}g · Fat ${r0(s.f)}g · Sugar ${r0(s.sug)}g · Fibre ${r0(s.fib)}g · Sodium ${fmt(s.na)}mg` +
    (m.score ? `\nFit for my goal: ${m.score}/10 — ${m.verdict}` : '') + (m.tip ? `\nTip: ${m.tip}` : '') + '\n— Care Me';
  $('sheet').hidden = false;
  if (m.id) {
    $('mDel').onclick = async () => { if (!await ask('Delete this meal from your diary?')) return; S.meals = S.meals.filter(x => x.id !== m.id); save(); closeSheet(); toast('Meal deleted'); go(tab); };
    $('mEdit').onclick = () => { closeSheet(); editing = m.id; shotBlob = null; items = m.items.map(i => ({ ...i })); meta = { score: m.score, verdict: m.verdict, tip: m.tip }; go('scan'); $('mealType').value = m.type; renderBill(); };
  }
}
function closeSheet() { $('sheet').hidden = true; }
$('closeSheet').addEventListener('click', closeSheet);
$('sheet').addEventListener('click', e => { if (e.target === $('sheet')) closeSheet(); });
async function shareText(text, title) {
  try { if (plugin('Share')) { await plugin('Share').share({ title, text, dialogTitle: title }); return; } } catch (e) { if (/cancel/i.test(e?.message || '')) return; }
  try { if (navigator.share) { await navigator.share({ title, text }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(text); toast('Copied — paste it anywhere'); } catch (e) { toast('Sharing not available here'); }
}
$('share').addEventListener('click', () => shareText(reportText, 'Meal report'));
document.addEventListener('click', e => { const b = e.target.closest('[data-meal]'); if (!b) return; const m = S.meals.find(x => x.id === b.dataset.meal); if (m) openReport(m); });

/* ================= PLAN ================= */
let planDay = 0;
function renderPlan() {
  const p = S.profile, keys = [...new Set([...p.conds, ...p.focus])].filter(k => GUIDE[k]);
  $('guides').innerHTML = keys.length ? `<h2 class="sect">Your food guide</h2>` + keys.map(k => { const g = GUIDE[k];
    return `<div class="card guide"><h2>${esc(g.t)}</h2><p><span class="k">Eat more:</span> ${esc(g.more)}</p>${g.less !== '—' ? `<p><span class="k">Limit:</span> ${esc(g.less)}</p>` : ''}<p class="meta">${esc(g.tip)}</p></div>`; }).join('')
    : `<div class="card"><p class="meta">Add health conditions or focus areas in Profile to see a personal food guide here.</p></div>`;
  renderPlanOut();
}
function renderPlanOut() {
  const pl = S.plan; if (!pl?.days?.length) { $('planOut').innerHTML = ''; $('planMeta').textContent = ''; return; }
  planDay = Math.min(planDay, pl.days.length - 1); const d = pl.days[planDay];
  $('planMeta').textContent = 'Made ' + new Date(pl.created).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  $('planOut').innerHTML = (pl.days.length > 1 ? `<div class="daychips">${pl.days.map((x, i) => `<button class="chip ${i === planDay ? 'on' : ''}" data-pday="${i}">${esc(x.day || 'Day ' + (i + 1))}</button>`).join('')}</div>` : '') +
    (d.meals || []).map((m, i) => `<div class="pmeal"><div class="split2"><b>${esc(m.slot)} <span class="meta">${esc(m.time || '')}</span></b><button class="alt" data-plog="${i}">Log</button></div>
     <ul>${(m.items || []).map(it => `<li>${esc(it.name)} <span>— ${esc(it.qty || '')}${it.kcal ? ' · ' + r0(it.kcal) + ' kcal' : ''}</span></li>`).join('')}</ul></div>`).join('') +
    (d.total ? `<div class="ptot"><span>${fmt(d.total.kcal)} kcal</span><span>P ${r0(d.total.p)} g</span><span>C ${r0(d.total.c)} g</span><span>F ${r0(d.total.f)} g</span></div>` : '') +
    (pl.tips?.length ? `<h2 style="margin-top:16px">Tips for you</h2><ul class="plain">${pl.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '') +
    (pl.shopping?.length ? `<details style="margin-top:12px"><summary><b>Shopping list</b></summary><ul class="plain">${pl.shopping.map(t => `<li>${esc(t)}</li>`).join('')}</ul><button class="alt" id="shopShare" style="margin-top:8px">Share list</button></details>` : '');
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-pday]'); if (c) { planDay = +c.dataset.pday; renderPlanOut(); }
  const l = e.target.closest('[data-plog]'); if (l) {
    const m = S.plan.days[planDay].meals[+l.dataset.plog];
    const its = (m.items || []).map(it => clean({ name: `${it.name}${it.qty ? ' (' + it.qty + ')' : ''}`, cuisine: 'From your plan', unit: 'serving', qty: 1, kcal: it.kcal, p: it.p, c: it.c, f: it.f, veg: '' }));
    const slot = /break/i.test(m.slot) ? 'Breakfast' : /lunch/i.test(m.slot) ? 'Lunch' : /dinner/i.test(m.slot) ? 'Dinner' : 'Snacks';
    S.meals.push({ id: Date.now().toString(36), ts: Date.now(), type: slot, items: its, score: null, verdict: '', tip: '', thumb: '' }); save();
    hcWrite({ dataType: 'dietaryEnergyConsumed', value: r0(sumOf(its).k), unit: 'kilocalorie', startDate: new Date(Date.now() - 60e3).toISOString(), endDate: new Date().toISOString() });
    toast(`${m.slot} logged — ${fmt(sumOf(its).k)} kcal`);
  }
  if (e.target.id === 'shopShare') shareText('🛒 Care Me shopping list\n' + S.plan.shopping.map(s => '• ' + s).join('\n'), 'Shopping list');
});
async function makePlan(days) {
  setStatus('planStatus', days > 1 ? 'Creating your 7-day plan… this can take 30–60 seconds.' : 'Creating today\'s plan…', 'busy');
  $('plan1').disabled = $('plan7').disabled = true;
  try {
    const out = await ai(planPrompt(ctx(), days), null, true);
    if (!out?.days?.length) throw new Error('The plan came back empty. Please try again.');
    S.plan = { created: Date.now(), days: out.days, tips: out.tips || [], shopping: out.shopping || [] }; planDay = 0; save(); renderPlanOut(); setStatus('planStatus', '');
  } catch (e) { handleAiErr(e, 'planStatus'); }
  finally { $('plan1').disabled = $('plan7').disabled = false; }
}
$('plan1').addEventListener('click', () => makePlan(1));
$('plan7').addEventListener('click', () => makePlan(7));
async function canEat() {
  const f = $('canFood').value.trim(); if (!f) return; $('canBtn').disabled = true;
  $('canOut').innerHTML = '<p class="status busy">Checking for you…</p>';
  try {
    const x = await ai(checkPrompt(ctx(), f)); const a = ['yes', 'limit', 'avoid'].includes(x.answer) ? x.answer : 'limit';
    $('canOut').innerHTML = `<div class="verdict v-${a}"><b>${a === 'yes' ? '✓ Yes' : a === 'limit' ? '≈ In moderation' : '✕ Better to avoid'} — ${esc(x.headline || f)}</b><p>${esc(x.why || '')}</p>${x.portion ? `<p><b style="font-size:15px;display:inline">Portion:</b> ${esc(x.portion)}</p>` : ''}${x.better ? `<p><b style="font-size:15px;display:inline">Better:</b> ${esc(x.better)}</p>` : ''}</div>`;
  } catch (e) { $('canOut').innerHTML = `<p class="status err">${esc(e.code === 'nokey' ? e.message : errMsg(e))}</p>`; }
  $('canBtn').disabled = false;
}
$('canBtn').addEventListener('click', canEat);
$('canFood').addEventListener('keydown', e => { if (e.key === 'Enter') canEat(); });

/* ================= PROGRESS ================= */
function addWeight(d, kg, src) { kg = r1(+kg); if (!(kg > 20 && kg < 400)) return; const ex = S.weights.find(w => w.d === d); if (ex) { if (src !== 'device' || ex.src === 'device') { ex.kg = kg; ex.src = src; } } else S.weights.push({ d, kg, src }); S.weights.sort((a, b) => a.d < b.d ? -1 : 1); }
function addReading(r) { if (S.readings.some(x => Math.abs(x.ts - r.ts) < 60e3 && x.type === r.type)) return; S.readings.push(r); S.readings.sort((a, b) => a.ts - b.ts); if (S.readings.length > 300) S.readings.shift(); }
const readingHigh = r => r.type === 'bp' ? (r.sys >= 140 || r.dia >= 90) : r.type === 'fbs' ? r.val >= 126 : r.type === 'ppbs' ? r.val >= 200 : r.val >= 200;
const readingLow = r => r.type !== 'bp' && r.val < 70;
let wRO;
function drawWeight() {
  const fig = $('wFig'), ws = S.weights.slice(-60), tw = +S.profile.tw;
  if (!ws.length) { fig.innerHTML = '<p class="empty">Log your weight to see your trend. A weekly weigh-in at the same time of day works best.</p>'; return; }
  const W = fig.clientWidth || 320, H = fig.clientHeight || 190, padL = 34, padB = 22, vals = ws.map(w => w.kg).concat(tw ? [tw] : []);
  let lo = Math.min(...vals), hi = Math.max(...vals); if (hi - lo < 2) { lo -= 1; hi += 1; }
  const x = i => padL + (ws.length === 1 ? (W - padL) / 2 : i / (ws.length - 1) * (W - padL - 8)), y = v => 8 + (hi - v) / (hi - lo) * (H - padB - 8);
  const ticks = [lo, (lo + hi) / 2, hi];
  fig.innerHTML = `<svg viewBox="0 0 ${W} ${H}">${ticks.map(t => `<line x1="${padL}" x2="${W}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line)"/><text x="${padL - 6}" y="${y(t) + 4}" text-anchor="end" font-size="11" fill="var(--mute)">${r1(t)}</text>`).join('')}
   ${tw ? `<line x1="${padL}" x2="${W}" y1="${y(tw)}" y2="${y(tw)}" stroke="var(--veg)" stroke-dasharray="5 4" stroke-width="1.5"/><text x="${W - 4}" y="${y(tw) - 5}" text-anchor="end" font-size="11" fill="var(--veg)">target ${tw}</text>` : ''}
   <polyline fill="none" stroke="var(--chili)" stroke-width="2.5" stroke-linejoin="round" points="${ws.map((w, i) => x(i) + ',' + y(w.kg)).join(' ')}"/>
   ${ws.map((w, i) => `<circle cx="${x(i)}" cy="${y(w.kg)}" r="${ws.length > 30 ? 2 : 3.5}" fill="var(--chili)"/>`).join('')}
   <text x="${padL}" y="${H - 5}" font-size="11" fill="var(--mute)">${new Date(ws[0].d + 'T12:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</text>
   <text x="${W - 4}" y="${H - 5}" text-anchor="end" font-size="11" fill="var(--mute)">${new Date(ws.at(-1).d + 'T12:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</text></svg>`;
}
function renderProgress() {
  const t = T(), p = S.profile, ws = S.weights, cur = ws.at(-1)?.kg || +p.w;
  $('wMeta').textContent = `${r1(cur)} kg · BMI ${t.bmi} (${bmiLabel(t.bmi)})`;
  const first = ws[0]?.kg; let eta = t.eta;
  if (first && ws.length > 1) eta = `${cur < first ? 'Down' : 'Up'} ${r1(Math.abs(cur - first))} kg since ${new Date(ws[0].d + 'T12:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}. ` + (eta || '');
  if (p.tw) eta += ` ${r1(Math.abs(cur - p.tw))} kg to go.`;
  $('wEta').textContent = eta;
  drawWeight(); if (!wRO) { wRO = new ResizeObserver(drawWeight); wRO.observe($('wFig')); }
  // readings
  const rs = S.readings.slice(-8).reverse();
  $('readList').innerHTML = rs.length ? rs.map(r => { const hi = readingHigh(r), lo = readingLow(r), i = S.readings.indexOf(r);
    return `<div class="rd"><span>${new Date(r.ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} · ${{ fbs: 'Fasting sugar', ppbs: 'After meal', rbs: 'Sugar', bp: 'BP' }[r.type]}${r.src === 'device' ? ' ⌚' : ''}</span>
     <span><span class="${hi || lo ? 'hi' : ''}">${r.type === 'bp' ? r.sys + '/' + r.dia : r.val + ' mg/dL'}${hi ? ' ↑' : lo ? ' ↓ low' : ''}</span>${r.src !== 'device' ? ` <button data-rdel="${i}" aria-label="Delete reading">✕</button>` : ''}</span></div>`; }).join('') : '';
  // week stats
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return dayKey(d); });
  const tots = days.map(dayTotals), logged = tots.filter(x => x.k > 0);
  const onT = tots.filter(x => x.k > 0 && x.k <= t.kcal * 1.1 && x.sug <= t.sug && x.na <= t.na).length;
  const avg = k => logged.length ? logged.reduce((a, x) => a + x[k], 0) / logged.length : 0;
  $('wkStats').innerHTML = `<div><b>${fmt(avg('k'))}</b><small>avg kcal / day</small></div><div><b>${onT}/7</b><small>days on target</small></div><div><b>🔥 ${streak()}</b><small>day logging streak</small></div>
   <div><b>${r0(avg('p'))} g</b><small>avg protein</small></div><div><b>${r0(avg('sug'))} g</b><small>avg sugar</small></div><div><b>${fmt(avg('na'))}</b><small>avg sodium mg</small></div>`;
  const mx = Math.max(t.kcal * 1.15, ...tots.map(x => x.k));
  $('week').innerHTML = `<div class="tl" style="bottom:${18 + t.kcal / mx * 116}px" title="Daily target"></div>` + days.map((d, i) =>
    `<div class="col"><span class="v">${tots[i].k ? fmt(tots[i].k) : ''}</span><span class="b ${tots[i].k > t.kcal ? 'over' : ''}" style="height:${tots[i].k / mx * 116}px"></span><span>${new Date(d + 'T12:00').toLocaleDateString('en-IN', { weekday: 'narrow' })}</span></div>`).join('');
  $('reviewOut').innerHTML = S.review ? reviewHTML(S.review) : '';
  // diary
  if (!S.meals.length) { $('diary').innerHTML = '<div class="card"><p class="empty">Your diary is empty. Scan a meal and tap “Save to diary”.</p></div>'; return; }
  const by = {}; S.meals.slice().sort((a, b) => b.ts - a.ts).slice(0, 150).forEach(m => (by[dayKey(m.ts)] ||= []).push(m));
  $('diary').innerHTML = Object.entries(by).map(([k, ms]) => { const tot = dayTotals(k).k;
    return `<div class="day"><span>${new Date(k + 'T12:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span><span style="color:${tot > t.kcal ? 'var(--chili)' : 'var(--mute)'}">${fmt(tot)} kcal</span></div><div class="card">${ms.map(mealRow).join('')}</div>`; }).join('');
}
$('wBtn').addEventListener('click', () => { const v = parseFloat($('wIn').value); if (!(v > 20 && v < 400)) return toast('Enter weight in kg');
  addWeight(today(), v, 'manual'); S.profile.w = r1(v); save(); $('wIn').value = ''; renderProgress(); toast('Weight logged');
  hcWrite({ dataType: 'weight', value: v, unit: 'kilogram', startDate: new Date().toISOString() }); });
$('rBtn').addEventListener('click', () => {
  const type = $('rType').value, v = $('rVal').value.trim();
  if (type === 'bp') { const m = v.match(/(\d{2,3})\s*[\/\- ]\s*(\d{2,3})/); if (!m) return toast('Enter BP like 120/80'); addReading({ ts: Date.now(), type, sys: +m[1], dia: +m[2], src: 'manual' }); }
  else { const n = parseFloat(v); if (!(n > 20 && n < 700)) return toast('Enter sugar in mg/dL'); addReading({ ts: Date.now(), type, val: r0(n), src: 'manual' }); }
  save(); $('rVal').value = ''; renderProgress();
  const last = S.readings.at(-1); if (readingLow(last)) toast('Low sugar — take 15 g fast sugar (3 tsp sugar in water) and recheck in 15 min');
  else if (readingHigh(last)) toast('That reading is high. If it stays high, contact your doctor.');
});
document.addEventListener('click', e => { const b = e.target.closest('[data-rdel]'); if (!b) return; S.readings.splice(+b.dataset.rdel, 1); save(); renderProgress(); });
function reviewHTML(r) {
  return `<div class="verdict v-${r.grade === 'good' ? 'yes' : r.grade === 'poor' ? 'avoid' : 'limit'}"><b>${esc(r.headline || '')}</b>
   ${r.wins?.length ? `<p><b style="font-size:15px;display:inline">Going well:</b></p><ul class="plain">${r.wins.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
   ${r.fixes?.length ? `<p><b style="font-size:15px;display:inline">Improve:</b></p><ul class="plain">${r.fixes.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
   ${r.focus ? `<p><b style="font-size:15px;display:inline">Focus this week:</b> ${esc(r.focus)}</p>` : ''}<p class="meta">${new Date(r.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p></div>`;
}
document.addEventListener('click', async e => {
  if (e.target.id !== 'aiReview') return; const btn = e.target; btn.disabled = true; btn.textContent = 'Reviewing your week…';
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return dayKey(d); });
  const data = days.map(k => { const s = dayTotals(k); return { day: k, kcal: r0(s.k), protein: r0(s.p), carbs: r0(s.c), sugar: r0(s.sug), sodium: r0(s.na), fibre: r0(s.fib), water: S.water[k] || 0, meals: mealsOn(k).map(m => m.type + ': ' + m.items.map(i => i.name.split(' (')[0]).join(', ')) }; });
  const wt = S.weights.slice(-6).map(w => `${w.d}: ${w.kg} kg`).join('; '), rd = S.readings.slice(-10).map(r => r.type === 'bp' ? `BP ${r.sys}/${r.dia}` : `${r.type} ${r.val}`).join('; ');
  try {
    const x = await ai(`You are a supportive, practical dietitian. USER PROFILE: ${ctx()}
Last 7 days of food logs: ${JSON.stringify(data)}. Weights: ${wt || 'none'}. Readings: ${rd || 'none'}. Activity today: ${JSON.stringify(S.hc.data || {})}.
Review the week against their targets. Return ONLY JSON {"grade":"good|ok|poor","headline":"max 12 words","wins":["2–3 specific things"],"fixes":["2–3 specific, doable changes with Indian food examples"],"focus":"one habit for next week"}. If few days are logged, say so kindly and encourage logging.`);
    S.review = { ...x, at: Date.now() }; save(); $('reviewOut').innerHTML = reviewHTML(S.review);
  } catch (err) { $('reviewOut').innerHTML = `<p class="status err">${esc(err.code === 'nokey' ? err.message : errMsg(err))}</p>`; }
  btn.disabled = false; btn.textContent = 'Get AI weekly review';
});

/* ================= PROFILE FORM (schema driven) ================= */
function fieldHTML(f, p) {
  if (f.row) return (f.group ? `<div class="grp">${esc(f.group)}</div>` : '') + `<div class="two">${f.row.map(x => fieldHTML(x, p)).join('')}</div>`;
  if (f.show && !f.show(p)) return '';
  const v = p[f.k] ?? '', hint = f.hint ? `<span class="hint">${esc(f.hint)}</span>` : '';
  switch (f.t) {
    case 'text': return `<label>${esc(f.label)}<input data-k="${f.k}" value="${esc(v)}" placeholder="${esc(f.ph || '')}" ${f.ac ? `autocomplete="${f.ac}"` : ''}>${hint}</label>`;
    case 'num': return `<label>${esc(f.label)}<input data-k="${f.k}" type="number" inputmode="decimal" value="${esc(v)}" ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''} step="${f.step || 1}">${hint}</label>`;
    case 'area': return `<label>${esc(f.label)}<textarea data-k="${f.k}" placeholder="${esc(f.ph || '')}">${esc(v)}</textarea>${hint}</label>`;
    case 'select': return `<label>${esc(f.label)}<select data-k="${f.k}">${f.opts.map(([a, b]) => `<option value="${esc(a)}" ${String(v) === String(a) ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select>${hint}</label>`;
    case 'toggle': return `<label class="tog"><input type="checkbox" data-k="${f.k}" ${v ? 'checked' : ''}><span>${esc(f.label)}${hint}</span></label>`;
    case 'chips': return `<div class="grp">${esc(f.label)}</div><div class="chips">${f.opts.map(o => `<button type="button" class="chip ${(v || []).includes(o.id) ? 'on' : ''}" data-ck="${f.k}" data-v="${o.id}" aria-pressed="${(v || []).includes(o.id)}">${esc(o.label)}</button>`).join('')}</div>`;
    case 'cards': return `<div class="grp">${esc(f.label)}</div><div class="cards">${f.opts.map(o => `<button type="button" class="cardopt ${v === o.id ? 'on' : ''}" data-rk="${f.k}" data-v="${o.id}" aria-pressed="${v === o.id}">${esc(o.label)}${o.desc ? `<small>${esc(o.desc)}</small>` : ''}</button>`).join('')}</div>`;
  }
  return '';
}
const sectionHTML = (sec, p, head = true) => (head ? `<h2>${esc(sec.title)}</h2><p class="meta secSub">${esc(sec.sub)}</p>` : '') + sec.fields.map(f => fieldHTML(f, p)).join('');
function bindForm(root, p, onChange) {
  root.addEventListener('input', e => { const k = e.target.dataset?.k; if (!k) return; p[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; onChange(false); });
  root.addEventListener('change', e => { const k = e.target.dataset?.k; if (!k) return; p[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; onChange(e.target.tagName === 'SELECT'); });
  root.addEventListener('click', e => {
    const c = e.target.closest('[data-ck]'); if (c) { const k = c.dataset.ck, v = c.dataset.v, arr = new Set(p[k] || []); arr.has(v) ? arr.delete(v) : arr.add(v);
      if (k === 'conds') { if (v === 't1d' && arr.has('t1d')) arr.delete('t2d'); if (v === 't2d' && arr.has('t2d')) arr.delete('t1d'); if (v === 'hypo' && arr.has('hypo')) arr.delete('hyper'); if (v === 'hyper' && arr.has('hyper')) arr.delete('hypo'); }
      p[k] = [...arr]; onChange(true); }
    const r = e.target.closest('[data-rk]'); if (r) { p[r.dataset.rk] = r.dataset.v; onChange(true); }
  });
}

/* ----- profile screen ----- */
let profDraft = null;
function targetsHTML(p) {
  const t = computeTargets(p);
  return `<div class="split2"><h2>Your daily targets</h2><span class="meta">BMI ${t.bmi}</span></div>
   <p class="meta">${esc(labelOf(WGOALS, p.wgoal))}${p.focus.length ? ' · ' + p.focus.map(f => labelOf(FOCUS, f)).join(', ') : ''}${p.conds.length ? ' · ' + p.conds.length + ' health condition' + (p.conds.length > 1 ? 's' : '') : ''}</p>
   <div class="tgrid"><div><b style="color:var(--chili)">${fmt(t.kcal)}</b><small>kcal</small></div><div><b>${t.prot} g</b><small>protein</small></div><div><b>${t.carb} g</b><small>carbs max</small></div>
   <div><b>${t.fat} g</b><small>fat</small></div><div><b>${t.sug} g</b><small>added sugar max</small></div><div><b>${fmt(t.na)}</b><small>mg sodium max</small></div>
   <div><b>${t.fib} g</b><small>fibre min</small></div><div><b>${t.water}</b><small>glasses water</small></div><div><b>${fmt(t.tdee)}</b><small>kcal you burn</small></div></div>
   ${t.eta ? `<p class="meta">${esc(t.eta)}</p>` : ''}
   ${t.why.length ? `<ul class="why">${t.why.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
   ${t.warn.map(w => `<div class="warn">${esc(w)}</div>`).join('')}`;
}
function renderProfile() {
  profDraft = structuredClone(S.profile);
  $('targets').innerHTML = targetsHTML(profDraft);
  const f = $('profForm');
  f.innerHTML = SECTIONS.map(s => `<div class="card form" data-sec="${s.id}">${sectionHTML(s, profDraft)}</div>`).join('') +
    `<div class="row" style="margin:-4px 0 14px"><button class="hot grow" type="submit">Save profile</button></div>`;
  if (!f.dataset.bound) { f.dataset.bound = 1;
    bindForm(f, new Proxy({}, { get: (_, k) => profDraft[k], set: (_, k, v) => (profDraft[k] = v, true) }), rerender => {
      $('targets').innerHTML = targetsHTML(profDraft);
      if (rerender) SECTIONS.forEach(s => { const el = f.querySelector(`[data-sec="${s.id}"]`); const y = window.scrollY; el.innerHTML = sectionHTML(s, profDraft); window.scrollTo(0, y); });
    });
    f.addEventListener('submit', e => { e.preventDefault(); if (!validBasics(profDraft)) return; S.profile = structuredClone(profDraft); save(); toast('Profile saved — targets updated'); renderProfile(); });
  }
  renderDevices();
  $('remMeals').checked = S.rem.meals; $('remWater').checked = S.rem.water; $('remWeigh').checked = S.rem.weigh;
  $('remNote').textContent = plugin('LocalNotifications') ? '' : 'Reminders work in the Android app.';
  $('aiProv').value = S.ai.prov; $('aiKey').value = S.ai.key; $('aiModel').value = S.ai.model; $('aiModel').placeholder = MODELS[S.ai.prov] + ' (default)'; renderAiNote();
}
function validBasics(p) {
  const bad = [[+p.age >= 12 && +p.age <= 100, 'age (12–100)'], [+p.h >= 120 && +p.h <= 230, 'height in cm'], [+p.w >= 30 && +p.w <= 250, 'weight in kg']].find(x => !x[0]);
  if (bad) { toast('Please enter a valid ' + bad[1]); return false; } return true;
}
function renderAiNote() { $('aiNote').textContent = (sampleCap && !S.ai.key ? 'Preview mode: Claude analyses photos for you here. In the Android app, add your own key. ' : '') +
  'Food photos and (if allowed) your goals and conditions are sent to the AI provider you choose. Your name is never sent. The key stays on this phone.'; }
document.addEventListener('ai-ready', () => { if (tab === 'profile') renderAiNote(); });
$('aiProv').addEventListener('change', () => { $('aiModel').placeholder = MODELS[$('aiProv').value] + ' (default)'; });
const readAi = () => { S.ai = { prov: $('aiProv').value, key: $('aiKey').value.trim(), model: $('aiModel').value.trim() }; };
$('aiForm').addEventListener('submit', e => { e.preventDefault(); readAi(); save(); renderAiNote(); toast('AI settings saved'); });
$('aiTest').addEventListener('click', async () => { readAi(); save(); setStatus('aiStatus', 'Testing…', 'busy');
  try { const x = await ai('Return ONLY JSON {"ok":true,"dish":"name one healthy Tamil Nadu breakfast"}'); setStatus('aiStatus', '✓ Connected. ' + (x.dish ? 'Sample answer: ' + x.dish : '')); }
  catch (e) { setStatus('aiStatus', errMsg(e), 'err'); } });

/* ----- reminders ----- */
async function applyReminders() {
  const LN = plugin('LocalNotifications'); if (!LN) { toast('Reminders work in the Android app'); return; }
  try {
    const perm = await LN.requestPermissions(); if (perm.display !== 'granted') { toast('Allow notifications for Care Me in Android settings'); S.rem = { meals: false, water: false, weigh: false }; save(); renderProfile(); return; }
    const ids = [101, 102, 103, ...[9, 11, 13, 15, 17, 19, 21].map(h => 200 + h), 301];
    await LN.cancel({ notifications: ids.map(id => ({ id })) });
    const n = [];
    if (S.rem.meals) [[101, 8, 30, 'Breakfast'], [102, 13, 30, 'Lunch'], [103, 20, 30, 'Dinner']].forEach(([id, hour, minute, m]) => n.push({ id, title: `Log your ${m.toLowerCase()} 🍽`, body: 'Snap a photo in Care Me — it takes 10 seconds.', schedule: { on: { hour, minute }, allowWhileIdle: true } }));
    if (S.rem.water) [9, 11, 13, 15, 17, 19, 21].forEach(h => n.push({ id: 200 + h, title: 'Water break 💧', body: 'Have a glass of water and tap it in Care Me.', schedule: { on: { hour: h, minute: 0 }, allowWhileIdle: true } }));
    if (S.rem.weigh) n.push({ id: 301, title: 'Weekly weigh-in ⚖️', body: 'Weigh yourself before breakfast and log it in Progress.', schedule: { on: { weekday: 2, hour: 7, minute: 0 }, allowWhileIdle: true } });
    if (n.length) await LN.schedule({ notifications: n });
    toast(n.length ? 'Reminders set' : 'Reminders off');
  } catch (e) { toast('Could not set reminders: ' + errMsg(e)); }
}
['remMeals', 'remWater', 'remWeigh'].forEach(id => $(id).addEventListener('change', () => { S.rem = { meals: $('remMeals').checked, water: $('remWater').checked, weigh: $('remWeigh').checked }; save(); applyReminders(); }));
plugin('LocalNotifications')?.addListener('localNotificationActionPerformed', a => { const id = a?.notification?.id; go(id >= 300 ? 'progress' : id >= 200 ? 'today' : 'scan'); });

/* ----- data ----- */
$('export').addEventListener('click', () => {
  if (!S.meals.length) return toast('No meals to export yet');
  const rows = [['date', 'time', 'meal', 'dish', 'qty', 'unit', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'sugar_g', 'fibre_g', 'sodium_mg']];
  S.meals.forEach(m => m.items.forEach(it => { const t = totOf(it), d = new Date(m.ts); rows.push([dayKey(d), d.toTimeString().slice(0, 5), m.type, it.name, it.qty, it.unit, r0(t.k), r1(t.p), r1(t.c), r1(t.f), r1(t.sug), r1(t.fib), r0(t.na)]); }));
  shareText(rows.map(r => r.map(v => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v).join(',')).join('\n'), 'Care Me diary (CSV)');
});
$('wipe').addEventListener('click', async () => { if (!await ask('Delete all meals, weights, readings, plans and settings from this phone? This cannot be undone.')) return;
  try { localStorage.removeItem('fca.v1'); } catch (e) {} S = structuredClone(DEF); save(); toast('All data deleted'); openOnb(); });
$('redoOnb').addEventListener('click', openOnb);

/* ================= ONBOARDING ================= */
let onbStep = 0, onbDraft = null;
const ONB = ['welcome', ...SECTIONS.map(s => s.id), 'connect', 'done'];
function openOnb() { onbDraft = structuredClone(S.profile); onbStep = 0; stopCam(); $('onb').hidden = false; renderOnb(); }
function renderOnb() {
  const id = ONB[onbStep], body = $('onbBody');
  $('onbDots').innerHTML = ONB.map((_, i) => `<i class="${i <= onbStep ? 'on' : ''}"></i>`).join('');
  $('onbBack').style.visibility = onbStep ? 'visible' : 'hidden';
  $('onbNext').textContent = id === 'welcome' ? 'Get started' : id === 'done' ? 'Start using Care Me' : 'Next';
  $('onbSkip').hidden = id === 'welcome' || id === 'done';
  if (id === 'welcome') body.innerHTML = `<div class="welcome"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="56" fill="var(--tur)"/><circle cx="60" cy="62" r="38" fill="#fff" stroke="#e1d6be" stroke-width="3"/><circle cx="47" cy="52" r="10" fill="var(--tur)"/><circle cx="73" cy="51" r="9" fill="var(--chili)"/><circle cx="58" cy="75" r="9" fill="#78aa3c"/><path d="M60 30c6-8 16-8 18 0-6 6-12 5-18 0z" fill="#1e8e3e"/></svg>
    <h2>Welcome to Care Me</h2><p class="meta">Your personal diet companion for Indian and international food.</p>
    <ul><li>📸 Photo → calories for every dish</li><li>🎯 Targets built for your goal and health</li><li>🥗 Personal diet plans in your home cuisine</li><li>⌚ Works with your smartwatch and scale</li><li>📈 Weight, sugar and BP tracking</li></ul><p class="meta">Setup takes about 2 minutes.</p></div>`;
  else if (id === 'connect') body.innerHTML = `<h2>Connect</h2><p class="meta secSub">Both optional — you can do this later in Profile.</p>
    <div class="card form"><h2>AI engine</h2><p class="meta">Needed to recognise food from photos. Get a free key from <b>aistudio.google.com/apikey</b> and paste it below.</p>
     <label>Provider<select id="oProv"><option value="gemini">Google Gemini (free tier)</option><option value="claude">Anthropic Claude</option></select></label>
     <label>API key<input id="oKey" type="password" autocomplete="off" value="${esc(S.ai.key)}"></label></div>
    <div class="card"><h2>Fitness device</h2><p class="meta">Link your watch, band or smart scale through Health Connect.</p><div class="row"><button class="alt grow" id="oLink">${S.hc.linked ? '✓ Linked' : 'Link now'}</button></div></div>`;
  else if (id === 'done') body.innerHTML = `<h2>You're all set${onbDraft.name ? ', ' + esc(onbDraft.name.split(' ')[0]) : ''}!</h2><div class="card">${targetsHTML(onbDraft)}</div>
    <p class="meta disclaimer">Care Me gives general guidance and is not a medical device. Always follow your doctor's or dietitian's advice.</p>`;
  else { const sec = SECTIONS.find(s => s.id === id); body.innerHTML = `<div class="form" data-sec="${id}">${sectionHTML(sec, onbDraft)}</div>`;
    if (id === 'health') body.insertAdjacentHTML('beforeend', `<p class="meta disclaimer">Your health details stay on this phone. Care Me adjusts general limits; it doesn't replace your doctor's diet chart.</p>`); }
  $('oProv') && ($('oProv').value = S.ai.prov);
  body.scrollTop = 0;
}
bindForm($('onbBody'), new Proxy({}, { get: (_, k) => onbDraft?.[k], set: (_, k, v) => (onbDraft[k] = v, true) }), rerender => {
  if (!rerender) return; const id = ONB[onbStep], sec = SECTIONS.find(s => s.id === id), el = $('onbBody').querySelector('[data-sec]'); if (sec && el) { const y = $('onbBody').scrollTop; el.innerHTML = sectionHTML(sec, onbDraft); $('onbBody').scrollTop = y; }
});
$('onbBody').addEventListener('click', e => { if (e.target.id === 'oLink') linkHC().then(() => { if (S.hc.linked) e.target.textContent = '✓ Linked'; }); });
function onbMove(d) {
  const id = ONB[onbStep];
  if (d > 0 && id === 'basics' && !validBasics(onbDraft)) return;
  if (id === 'connect') { const k = $('oKey')?.value.trim(); S.ai.prov = $('oProv').value; if (k != null) S.ai.key = k; save(); }
  if (d > 0 && id === 'done') { S.profile = structuredClone(onbDraft); S.onboarded = true; if (!S.weights.length) addWeight(today(), S.profile.w, 'manual'); save(); $('onb').hidden = true; go('today'); return; }
  onbStep = Math.max(0, Math.min(ONB.length - 1, onbStep + d)); renderOnb();
}
$('onbNext').addEventListener('click', () => onbMove(1));
$('onbBack').addEventListener('click', () => onbMove(-1));
$('onbSkip').addEventListener('click', () => { onbStep = ONB.length - 1; renderOnb(); });

/* ================= START ================= */
go('today');
if (!S.onboarded) openOnb();
window.addEventListener('offline', () => toast('You are offline — photo analysis needs internet'));
}
