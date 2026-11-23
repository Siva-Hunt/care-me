/* Care Me — Workout: human demo-figure animator, personalised 4-week courses, guided player,
   quick workouts, 30-day challenges, body measurements. Uses window.CM (set by app.js) at run time. */
(() => {
const $ = id => document.getElementById(id);
const C = () => window.CM;
const LV = { beg: 1, int: 2, pro: 3 };
const LVN = { beg: 'Beginner', int: 'Intermediate', pro: 'Pro' };
const rad = d => d * Math.PI / 180;
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const lerpA = (a, b, t) => a + (b - a) * t;
const yt = name => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(name + ' home exercise proper form');

/* ================= demo figure ================= */
const LEN = { torso: 46, head: 9, ua: 25, fa: 23, th: 34, sh: 33 };
function joints(pz) {
  const [t, uaN, faN, uaF, faF, thN, shN, thF, shF] = pz, d = a => [Math.cos(rad(a)), Math.sin(rad(a))];
  const add = (pt, a, l) => { const v = d(a); return [pt[0] + v[0] * l, pt[1] + v[1] * l]; };
  const hip = [0, 0], neck = add(hip, t, LEN.torso), head = add(neck, t, LEN.head + 4), sh = add(neck, t, -4);
  const eN = add(sh, uaN, LEN.ua), hN = add(eN, faN, LEN.fa), eF = add(sh, uaF, LEN.ua), hF = add(eF, faF, LEN.fa);
  const kN = add(hip, thN, LEN.th), fN = add(kN, shN, LEN.sh), kF = add(hip, thF, LEN.th), fF = add(kF, shF, LEN.sh);
  return { hip, neck, head, sh, eN, hN, eF, hF, kN, fN, kF, fF };
}
const FLOOR = 172;
function place(pz, anchorX) {
  const j = joints(pz), o = pz[9] || {};
  const ys = [j.hip, j.sh, j.eN, j.hN, j.eF, j.hF, j.kN, j.fN, j.kF, j.fF].map(q => q[1]).concat(j.head[1] + LEN.head);
  const dy = FLOOR - Math.max(...ys) - (o.lift || 0);
  const ref = { foot: j.fN, hand: j.hN, head: j.head, hip: j.hip }[o.ax || 'hip'] || j.hip;
  const dx = anchorX - ref[0];
  for (const k in j) j[k] = [j[k][0] + dx, j[k][1] + dy];
  return j;
}
function anchorFor(ex) {
  // choose anchor x so the first frame is centred in the 200-wide box
  const j = place(ex.frames[0], 0), xs = Object.values(j).map(q => q[0]);
  return 100 - (Math.min(...xs) + Math.max(...xs)) / 2;
}
function propsFor(ex, ax) {
  const kinds = new Set(ex.frames.map(f => f[9]?.prop).filter(Boolean)); if (!kinds.size) return '';
  let out = '';
  for (const k of kinds) {
    if (k === 'db') continue;
    const all = ex.frames.map(f => place(f, ax));
    if (k === 'wallL' || k === 'wallR') {
      const xs = all.flatMap(j => Object.values(j).map(q => q[0]));
      const x = k === 'wallL' ? Math.min(...xs) - 5 : Math.max(...xs) + 5;
      out += `<line x1="${x}" y1="40" x2="${x}" y2="${FLOOR}" stroke="var(--line)" stroke-width="6"/>`;
    } else {
      // box/chair: under the most raised contact point (hand, foot or hip)
      let best = null;
      for (const j of all) for (const pt of k === 'chairL' ? [j.hip] : [j.hN, j.fN, j.hip]) {
        const el = FLOOR - pt[1]; if (el > 10 && el < 75 && (!best || el > best.el)) best = { el, x: pt[0], y: pt[1] + (k === 'chairL' ? 5 : 3) };
      }
      if (best) out += `<rect x="${best.x - 16}" y="${best.y}" width="32" height="${FLOOR - best.y}" rx="3" fill="var(--turSoft)" stroke="var(--line)" stroke-width="2"/>`;
    }
  }
  return out;
}
/* Human-style figure: solid limbs with rounded joints, skin, hair and face, T-shirt, shorts and shoes.
   Far-side limbs are drawn first in a darker shade so the body reads in 3-D. */
const f1 = n => n.toFixed(1);
const unit = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
function cap(a, b, ra, rb, c) { // tapered limb: quad + round ends
  const [ux, uy] = unit(a, b), nx = -uy, ny = ux;
  return `<path d="M${f1(a[0] + nx * ra)} ${f1(a[1] + ny * ra)}L${f1(b[0] + nx * rb)} ${f1(b[1] + ny * rb)}L${f1(b[0] - nx * rb)} ${f1(b[1] - ny * rb)}L${f1(a[0] - nx * ra)} ${f1(a[1] - ny * ra)}Z" fill="${c}"/>` +
    `<circle cx="${f1(a[0])}" cy="${f1(a[1])}" r="${ra}" fill="${c}"/><circle cx="${f1(b[0])}" cy="${f1(b[1])}" r="${rb}" fill="${c}"/>`;
}
const dot = (p, r, c) => `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${r}" fill="${c}"/>`;
function arm(sh, el, hd, far) {
  const skin = far ? 'var(--skinFar)' : 'var(--skin)', shirt = far ? 'var(--shirtFar)' : 'var(--shirt)';
  return cap(sh, el, 5.2, 4.2, skin) + cap(el, hd, 4.2, 3.2, skin) + cap(sh, mix(sh, el, .5), 6.4, 5.4, shirt) + dot(hd, 4.1, skin);
}
function leg(hip, kn, ft, far, front) {
  const skin = far ? 'var(--skinFar)' : 'var(--skin)', sho = far ? 'var(--shortsFar)' : 'var(--shorts)', shoe = far ? 'var(--shoeFar)' : 'var(--shoe)';
  const [sx, sy] = unit(kn, ft); let fx = sy, fy = -sx; if (fx * front[0] + fy * front[1] < 0) { fx = -fx; fy = -fy; }
  let base = ft;
  if (FLOOR - ft[1] < 6 && Math.abs(sy) > .55) { fx = Math.sign(fx || front[0] || 1); fy = 0; base = [ft[0], ft[1] - 1.5]; } // flat on the floor
  const toe = [base[0] + fx * 9, base[1] + fy * 9], heel = [base[0] - fx * 2.5, base[1] - fy * 2.5];
  return cap(hip, kn, 7, 5, skin) + cap(kn, ft, 5, 3.6, skin) + cap(hip, mix(hip, kn, .55), 8, 6.8, sho) + cap(heel, toe, 4.2, 3.4, shoe);
}
function figSVG(j, ex, ax, props) {
  const t = unit(j.hip, j.neck), front = [-t[1], t[0]]; // body faces 90° clockwise of the spine
  const at = (p, u, f) => [p[0] + t[0] * u + front[0] * f, p[1] + t[1] * u + front[1] * f];
  const chest = at(j.hip, 30, 2.5), waist = at(j.hip, 8, 0), hc = j.head;
  const db = ex.frames[0][9]?.prop === 'db' ? [j.hF, j.hN].map(h => `<rect x="${f1(h[0] - 8)}" y="${f1(h[1] - 3.5)}" width="16" height="7" rx="2.5" fill="var(--chili)"/>`).join('') : '';
  const face = dot(at(hc, 1.5, -1.5), 10.6, 'var(--hair)') + dot(at(hc, 0, 1), 9.6, 'var(--skin)') +
    `<path d="M${f1(at(hc, 2, -10.2)[0])} ${f1(at(hc, 2, -10.2)[1])}A10.4 10.4 0 0 1 ${f1(at(hc, 8.6, 6)[0])} ${f1(at(hc, 8.6, 6)[1])}L${f1(at(hc, 5, 3)[0])} ${f1(at(hc, 5, 3)[1])}Z" fill="var(--hair)"/>` +
    dot(at(hc, 0, -3), 2.3, 'var(--skinFar)') + dot(at(hc, 2, 5.8), 1.25, 'var(--hair)') + dot(at(hc, -1, 10.2), 1.6, 'var(--skin)');
  return `${props}<line x1="8" y1="${FLOOR + 2}" x2="192" y2="${FLOOR + 2}" stroke="var(--line)" stroke-width="2"/>` +
    `<ellipse cx="${f1((j.fN[0] + j.fF[0] + j.hip[0]) / 3)}" cy="${FLOOR + 1}" rx="34" ry="3" fill="#000" opacity=".08"/>` +
    arm(j.sh, j.eF, j.hF, true) + leg(j.hip, j.kF, j.fF, true, front) +
    cap(j.sh, hc, 4.2, 4.2, 'var(--skin)') + // neck
    cap(waist, chest, 9.6, 11.2, 'var(--shirt)') + cap(chest, at(j.sh, -1, 0), 11.2, 8.5, 'var(--shirt)') +
    cap(j.hip, waist, 9.4, 9.8, 'var(--shorts)') + face +
    leg(j.hip, j.kN, j.fN, false, front) + arm(j.sh, j.eN, j.hN, false) + db;
}
const thumbCache = {};
function thumb(ex) {
  if (thumbCache[ex.id]) return thumbCache[ex.id];
  const ax = anchorFor(ex), f = ex.frames[ex.frames.length > 1 ? 1 : 0];
  return thumbCache[ex.id] = `<svg viewBox="0 0 200 180" aria-hidden="true">${figSVG(place(f, ax), ex, ax, propsFor(ex, ax))}</svg>`;
}
class Fig {
  constructor(svg, ex) { this.svg = svg; this.set(ex); }
  set(ex) { this.ex = ex; this.ax = anchorFor(ex); this.props = propsFor(ex, this.ax); this.t0 = performance.now(); this.paused = false; this.draw(0); }
  draw(ms) {
    const ex = this.ex, n = ex.frames.length, per = ex.ms || 800;
    let pz;
    if (n === 1) pz = ex.frames[0];
    else { const pos = (ms / per) % n, i = Math.floor(pos), a = ex.frames[i], b = ex.frames[(i + 1) % n], t = ease(pos - i);
      pz = a.slice(0, 9).map((v, k) => lerpA(v, b[k], t)); pz[9] = { ...a[9], lift: lerpA(a[9]?.lift || 0, b[9]?.lift || 0, t) }; }
    this.svg.innerHTML = figSVG(place(pz, this.ax), ex, this.ax, this.props);
  }
  start() { const loop = now => { if (!this.on) return; if (!this.paused) this.draw(now - this.t0); this.raf = requestAnimationFrame(loop); }; this.on = true; this.raf = requestAnimationFrame(loop); return this; }
  pause(p) { if (p) { this.pausedAt = performance.now(); } else if (this.pausedAt) { this.t0 += performance.now() - this.pausedAt; this.pausedAt = 0; } this.paused = p; }
  stop() { this.on = false; cancelAnimationFrame(this.raf); }
}

/* ================= personalised course ================= */
function limitsOf(p) {
  const s = new Set(p.fLimits || []);
  for (const c of ['bp', 'heartd', 'preg']) if ((p.conds || []).includes(c)) s.add(c);
  if (+p.age >= 60) s.add('noJump');
  return s;
}
const allowed = (ex, lim, eq) => !ex.avoid.some(a => lim.has(a)) && (!ex.equip || eq.has(ex.equip));
function rng(seed) { let x = seed % 2147483647; if (x <= 0) x += 2147483646; return () => (x = x * 16807 % 2147483647) / 2147483647; }
function shuffle(a, r) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(r() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; } return a; }
const PATTERN = { 3: [0, 2, 4], 4: [0, 1, 3, 5], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5] };

function focusRotation(p) {
  const a = new Set(p.fAreas || []), list = [];
  if (a.has('thighs') || a.has('glutes')) list.push('lower');
  if (a.has('belly')) list.push('core');
  if (['arms', 'chest', 'back', 'shoulders'].some(x => a.has(x))) list.push('upper');
  if (a.has('full') || !list.length || p.fGoal === 'burn') list.push('full');
  for (const f of ['full', 'lower', 'core', 'upper']) if (list.length < Math.min(+p.fDays || 3, 4) && !list.includes(f)) list.push(f);
  return list;
}
function weekPlan(p) {
  const days = Math.min(6, Math.max(3, +p.fDays || 3)), rot = focusRotation(p), out = [];
  for (let i = 0; i < days; i++) out.push(rot[i % rot.length]);
  if (p.fGoal === 'mobility' || (days >= 5 && p.fGoal !== 'burn') || (p.fAreas || []).includes('flex')) out[days - 1] = 'mobility';
  return out.map((f, i) => ({ focus: f, dow: PATTERN[days][i] }));
}
function amountFor(ex, lvl, wk, p, adj) {
  const li = Math.min(2, Math.max(0, lvl - 1)), base = ex.base[li];
  let f = (1 + 0.1 * wk) * (1 + 0.1 * (adj || 0));
  if (p.fGoal === 'strength' && ex.kind === 'reps') f *= 1.2;
  if (p.fGoal === 'stamina' && ex.kind === 'time') f *= 1.15;
  if (limitsOf(p).has('heartd')) f *= 0.8;
  return ex.kind === 'time' ? Math.max(15, Math.round(base * f / 5) * 5) : Math.max(4, Math.round(base * f));
}
const estSecs = (ex, amt) => ex.kind === 'time' ? amt : Math.round(amt * (ex.cat === 'cardio' ? 2 : 3));

function buildSession(focus, wk, dayIdx, p, opts = {}) {
  const lim = limitsOf(p), eq = new Set(p.fEquip || []), lvl = Math.min(LV[p.fLevel] || 1, lim.has('heartd') ? 1 : 3);
  const adj = C()?.S.fit?.adj || 0, mins = +p.fMins || 20;
  const pace = { 1: { rest: 30 }, 2: { rest: 20 }, 3: { rest: 15 } }[lvl];
  let rest = pace.rest + (p.fGoal === 'strength' ? 10 : 0) - (p.fGoal === 'burn' ? 5 : 0);
  const r = rng((wk + 1) * 97 + dayIdx * 13 + focus.length * 7 + lvl);
  const ok = ex => allowed(ex, lim, eq);
  const steps = [], push = (id, phase, round, amt) => { const ex = EXI[id]; steps.push({ id, phase, round, amt: amt ?? amountFor(ex, lvl, wk, p, adj) }); };
  // warm-up
  const warm = ['march', 'armcircles', lvl >= 2 && ok(EXI.jacks) ? 'jacks' : 'stepjacks'];
  if (focus === 'lower' || focus === 'mobility') warm[1] = 'catcow';
  warm.filter(id => ok(EXI[id])).forEach(id => push(id, 'warm', 0, 30));
  // main block
  if (focus === 'mobility') {
    const mob = shuffle(EX.filter(e => (e.cat === 'stretch' || ['birddog', 'deadbug', 'bridge', 'snowangel'].includes(e.id)) && ok(e)), r).slice(0, 7);
    const rounds = mins >= 30 ? 2 : 1;
    for (let rd = 1; rd <= rounds; rd++) mob.forEach(e => push(e.id, 'main', rd, e.kind === 'time' ? 40 : undefined));
    rest = 10;
  } else {
    const areas = FOCUS_DAYS[focus].areas;
    let pool = EX.filter(e => !['warm', 'stretch'].includes(e.cat) && e.areas.some(a => areas.includes(a)) && ok(e) && e.lvl <= lvl && e.lvl >= lvl - 1);
    if (pool.length < 5) pool = EX.filter(e => !['warm', 'stretch'].includes(e.cat) && e.areas.some(a => areas.includes(a)) && ok(e) && e.lvl <= lvl);
    const target = new Set(p.fAreas || []);
    pool = shuffle(pool, r).sort((a, b) => (b.areas.some(x => target.has(x)) ? 1 : 0) - (a.areas.some(x => target.has(x)) ? 1 : 0));
    const k = Math.min(pool.length, mins <= 10 ? 4 : mins <= 20 ? 5 : 6);
    let pick = pool.slice(0, k);
    if ((p.fGoal === 'burn' || focus === 'full') && !pick.some(e => e.cat === 'cardio')) {
      const cardio = shuffle(EX.filter(e => e.cat === 'cardio' && ok(e) && e.lvl <= lvl), r)[0] || EXI.boxing;
      pick.splice(Math.floor(k / 2), 0, cardio); pick = pick.slice(0, k + 1);
    }
    const perRound = pick.reduce((a, e) => a + estSecs(e, amountFor(e, lvl, wk, p, adj)) + rest, 0);
    const budget = mins * 60 - 4 * 60;
    const rounds = Math.max(1, Math.min(lvl + 2, Math.round(budget / perRound)));
    for (let rd = 1; rd <= rounds; rd++) pick.forEach(e => push(e.id, 'main', rd));
  }
  // cool-down
  const cool = { lower: ['hamstring', 'quad', 'hipflexor'], upper: ['chest', 'neck', 'child'], core: ['cobra', 'child', 'catcow'], full: ['hamstring', 'child', 'chest'], mobility: ['child'] }[focus];
  cool.map(id => ok(EXI[id]) ? id : 'child').filter((v, i, a) => a.indexOf(v) === i).forEach(id => push(id, 'cool', 0, 30));
  return finalize({ title: opts.title || FOCUS_DAYS[focus].name, focus, steps, restS: rest, wk, dayIdx }, p);
}
function finalize(s, p) {
  const kg = +p.w || 70; let secs = 0, kcal = 0;
  s.steps.forEach((st, i) => { const ex = EXI[st.id], t = estSecs(ex, st.amt) + (i < s.steps.length - 1 && st.phase === 'main' ? s.restS : 5); secs += t; kcal += ex.met * 3.5 * kg / 200 * t / 60; });
  s.mins = Math.max(1, Math.round(secs / 60)); s.kcal = Math.round(kcal); return s;
}
function quickSession(q, p) {
  const lim = limitsOf(p), eq = new Set(p.fEquip || []);
  const sub = id => { let e = EXI[id]; let guard = 0; while (e && !allowed(e, lim, eq) && guard++ < 3) e = EXI[e.easier] || null; return e && allowed(e, lim, eq) ? e.id : (allowed(EXI.march, lim, eq) ? 'march' : 'neck'); };
  const steps = []; for (let rd = 1; rd <= (q.rounds || 1); rd++) q.list.forEach(id => { const s = sub(id), ex = EXI[s]; steps.push({ id: s, phase: 'main', round: rd, amt: ex.kind === 'time' ? q.work : Math.max(6, Math.round(q.work / 3)) }); });
  return finalize({ title: q.name, focus: 'quick', steps, restS: q.rest }, p);
}
function course(p) {
  const S = C().S; S.fit = S.fit || {};
  if (!S.fit.start || S.fit.level !== p.fLevel) { S.fit.start = C().today(); S.fit.level = p.fLevel; C().save(); }
  const start = new Date(S.fit.start + 'T00:00'), idx = Math.floor((new Date(C().today() + 'T00:00') - start) / 864e5);
  return { start, idx, week: Math.floor(idx / 7), plan: weekPlan(p) };
}
function sessionFor(p, week, dow) {
  const wp = weekPlan(p), i = wp.findIndex(d => d.dow === dow); if (i < 0) return null;
  return buildSession(wp[i].focus, week % 4, i, p);
}
function todaySession(p) {
  const c = course(p); if (c.week >= 4) return { courseDone: true };
  const s = sessionFor(p, c.week, c.idx % 7); return s ? Object.assign(s, { week: c.week, dayNo: c.plan.findIndex(d => d.dow === c.idx % 7) + 1 }) : { rest: true, week: c.week };
}
const doneOn = d => (C().S.fit?.history || []).filter(h => h.d === d);
function todayWorkoutKcal() { return doneOn(C().today()).reduce((a, h) => a + (h.kcal || 0), 0); }

/* ================= Workout tab ================= */
let libArea = 'all', libLvl = 0, thumbFig = null;
function safetyNotes(p) {
  const n = [], c = new Set(p.conds || []), L = new Set(p.fLimits || []);
  n.push('Stop if you feel chest pain, dizziness, faintness or unusual breathlessness.');
  if (c.has('heartd')) n.push('Heart condition: get your doctor\'s clearance first. Care Me keeps the intensity low.');
  if (c.has('bp')) n.push('High BP: keep breathing during every move — long holds and head-down moves are left out.');
  if (c.has('preg')) n.push('Pregnancy: no jumping, crunches or lying flat on your back after the first trimester. Follow your obstetrician.');
  if (c.has('t1d') || c.has('t2d')) n.push('Diabetes: if you take insulin or sugar-lowering tablets, check sugar before exercise and keep a sweet snack nearby. A walk or workout 1–2 h after meals lowers sugar spikes.');
  if (L.has('knee')) n.push('Knee pain: jumps, lunges and deep squats are replaced with gentler moves.');
  if (L.has('back')) n.push('Lower-back pain: sit-ups and back-extensions are left out; core work uses dead bugs and bird dogs.');
  return n;
}
function render() {
  const cm = C(), S = cm.S, p = S.profile, esc = cm.esc, fmt = cm.fmt; S.fit = S.fit || {};
  const ts = todaySession(p), c = course(p), hist = S.fit.history || [];
  const doneToday = doneOn(cm.today());
  let hero;
  if (ts.courseDone) hero = `<h2>🏆 Course complete!</h2><p class="meta">You finished 4 weeks at ${LVN[p.fLevel]} level. Start the next level or repeat with harder settings.</p>
    <div class="row">${p.fLevel !== 'pro' ? `<button class="hot grow" data-lv="${p.fLevel === 'beg' ? 'int' : 'pro'}">Start ${LVN[p.fLevel === 'beg' ? 'int' : 'pro']} course</button>` : ''}<button class="alt grow" id="fitRestart">Repeat course</button></div>`;
  else if (ts.rest) hero = `<h2>Rest day 😌</h2><p class="meta">Recovery builds results. A 20-minute walk or gentle mobility keeps you moving.</p><div class="row"><button class="hot grow" data-quick="qmorning">Morning mobility · 8 min</button></div>`;
  else hero = `<div class="split2"><span class="meta">Week ${ts.week + 1} · Workout ${ts.dayNo} of ${c.plan.length}</span>${doneToday.length ? '<span class="pill ok">✓ Done today</span>' : ''}</div>
    <h2 class="wtitle">${esc(ts.title)}</h2><p class="meta">≈ ${ts.mins} min · ~${ts.kcal} kcal · ${new Set(ts.steps.filter(s => s.phase === 'main').map(s => s.id)).size} exercises · ${LVN[p.fLevel]}</p>
    <div class="exrow">${[...new Set(ts.steps.filter(s => s.phase === 'main').map(s => s.id))].map(id => `<button class="exmini" data-ex="${id}">${thumb(EXI[id])}<span>${esc(EXI[id].name)}</span></button>`).join('')}</div>
    <div class="row"><button class="hot grow" id="fitStart">${doneToday.length ? 'Do it again' : '▶ Start workout'}</button></div>`;
  const grid = [0, 1, 2, 3].map(w => `<div class="wkrow"><span class="meta">W${w + 1}</span>${c.plan.map((d, i) => {
    const date = new Date(c.start); date.setDate(date.getDate() + w * 7 + d.dow); const k = cm.dayKey(date), done = doneOn(k).length, isT = k === cm.today();
    return `<span class="cell ${done ? 'done' : ''} ${isT ? 'today' : ''}" title="${FOCUS_DAYS[d.focus].name}">${done ? '✓' : FOCUS_DAYS[d.focus].short}</span>`; }).join('')}</div>`).join('');
  const wkMins = hist.filter(h => Date.now() - h.ts < 7 * 864e5).reduce((a, h) => a + h.mins, 0);
  const chal = S.fit.chal || {};
  $('v-workout').innerHTML = `
  <div class="card whero">${hero}</div>
  <div class="card">
    <div class="split2"><h2>Your course</h2><button class="link" id="fitEdit">Change goals</button></div>
    <p class="meta">${LVN[p.fLevel]} · ${esc((FIT_GOALS.find(g => g.id === p.fGoal) || {}).label || '')}${(p.fAreas || []).length ? ' · tone ' + esc(p.fAreas.map(a => labelOf(AREAS, a).toLowerCase()).join(', ')) : ''} · ${p.fDays || 3} days/week · ${p.fMins || 20} min</p>
    <div class="wkgrid">${grid}</div>
    <p class="meta">This week: ${wkMins} min trained · ${hist.length} workouts total${streakW() > 1 ? ` · 🔥 ${streakW()}-week streak` : ''}</p>
  </div>
  <h2 class="sect">Courses</h2>
  <div class="courses">${FIT_LEVELS.map(l => `<button class="course ${p.fLevel === l.id ? 'on' : ''}" data-lv="${l.id}"><b>${l.label}</b><small>${l.desc}</small><small>${{ beg: '30 s work · 30 s rest · gentle moves', int: '40 s work · 20 s rest · more rounds', pro: '45 s work · 15 s rest · plyometrics' }[l.id]}</small>${p.fLevel === l.id ? '<span class="pill ok">Current</span>' : ''}</button>`).join('')}</div>
  <h2 class="sect">Quick workouts</h2>
  <div class="quick">${QUICK.map(q => { const s = quickSession(q, p); return `<button class="qcard" data-quick="${q.id}"><b>${esc(q.name)}</b><small>${esc(q.desc)}</small><span class="meta">${s.mins} min · ~${s.kcal} kcal</span></button>`; }).join('')}</div>
  <h2 class="sect">30-day challenges</h2>
  <div class="quick">${CHALLENGES.map(ch => { const st = chal[ch.id]; const day = st ? Math.min(30, (st.done || []).length + 1) : 1, fin = st && (st.done || []).length >= 30, doneTd = st?.done?.includes(cm.today());
    return `<div class="qcard"><b>${esc(ch.name)}</b><small>${esc(ch.desc)}</small>${st ? `<div class="bar"><i style="width:${(st.done.length / 30) * 100}%;background:var(--veg)"></i></div><span class="meta">Day ${day} target: ${fmt(ch.target(day))} ${ch.unit}</span>` : ''}
      <div class="row">${!st ? `<button class="alt grow" data-chal="${ch.id}">Join</button>` : fin ? '<span class="pill ok">🏆 Completed</span>' : doneTd ? '<span class="pill ok">✓ Done today</span>' : `${ch.id !== 'walk30' ? `<button class="hot grow" data-chgo="${ch.id}">Start day ${day}</button>` : ''}<button class="alt grow" data-chdone="${ch.id}">Mark done</button>`}</div></div>`; }).join('')}</div>
  <h2 class="sect">Exercise library</h2>
  <div class="card">
    <div class="chips">${[{ id: 'all', label: 'All' }, ...AREAS].map(a => `<button class="chip ${libArea === a.id ? 'on' : ''}" data-larea="${a.id}">${esc(a.label)}</button>`).join('')}</div>
    <div class="chips" style="margin-top:8px">${[[0, 'All levels'], [1, 'Beginner'], [2, 'Intermediate'], [3, 'Pro']].map(([v, l]) => `<button class="chip ${libLvl === v ? 'on' : ''}" data-llvl="${v}">${l}</button>`).join('')}</div>
    <div class="lib">${EX.filter(e => (libArea === 'all' || e.areas.includes(libArea)) && (!libLvl || e.lvl === libLvl)).map(e => `<button class="libitem" data-ex="${e.id}">${thumb(e)}<b>${esc(e.name)}</b><span class="meta">${['', 'Beginner', 'Intermediate', 'Pro'][e.lvl]}${e.equip ? ' · ' + labelOf(EQUIP, e.equip).split(' ')[0].toLowerCase() : ''}</span></button>`).join('')}</div>
  </div>
  <div class="card" id="measCard"><h2>Body measurements</h2><p class="meta">Toning shows in centimetres before kilos. Measure every 2 weeks, same time of day.</p>
    <div class="meas">${MEAS.map(m => `<label>${m[1]}<input type="number" inputmode="decimal" step="0.5" id="m_${m[0]}" placeholder="cm"></label>`).join('')}</div>
    <div class="row"><button class="hot grow" id="measSave">Save measurements</button></div><div id="measOut">${measHTML()}</div></div>
  <div class="card"><h2>Safety</h2><ul class="plain">${safetyNotes(p).map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>
  ${hist.length ? `<div class="card"><h2>Recent workouts</h2>${hist.slice(-6).reverse().map(h => `<div class="rd"><span>${new Date(h.ts).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · ${esc(h.title)}</span><span>${h.mins} min · ${h.kcal} kcal${h.feel ? ' · ' + ({ easy: '😌', ok: '💪', hard: '🥵' }[h.feel]) : ''}</span></div>`).join('')}</div>` : ''}`;
}
function streakW() { const h = C().S.fit?.history || []; let n = 0; for (let w = 0; w < 52; w++) { const from = Date.now() - (w + 1) * 7 * 864e5, to = Date.now() - w * 7 * 864e5; if (h.some(x => x.ts > from && x.ts <= to)) n++; else break; } return n; }
const MEAS = [['waist', 'Waist'], ['hips', 'Hips'], ['chest', 'Chest'], ['arm', 'Upper arm'], ['thigh', 'Thigh']];
function measHTML() {
  const m = C().S.fit?.meas || []; if (!m.length) return '';
  const first = m[0], last = m.at(-1);
  return `<div class="tgrid" style="margin-top:12px">${MEAS.map(([k, l]) => last[k] ? `<div><b>${last[k]} cm</b><small>${l}${first[k] && m.length > 1 ? ` · <span style="color:${last[k] < first[k] ? 'var(--veg)' : last[k] > first[k] ? 'var(--chili)' : 'inherit'}">${last[k] - first[k] > 0 ? '+' : ''}${Math.round((last[k] - first[k]) * 10) / 10}</span>` : ''}</small></div>` : '').join('')}</div><p class="meta">Last measured ${new Date(last.d + 'T12:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}${m.length > 1 ? ' · change since ' + new Date(first.d + 'T12:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</p>`;
}

document.addEventListener('click', async e => {
  const cm = C(); if (!cm) return; const S = cm.S, p = S.profile;
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'fitStart') { const s = todaySession(p); if (s.steps) play(s); }
  if (b.dataset.quick) play(quickSession(QUICK.find(q => q.id === b.dataset.quick), p));
  if (b.dataset.ex && !b.closest('#player')) openEx(b.dataset.ex);
  if (b.dataset.lv && b.dataset.lv !== p.fLevel) { if (!await cm.ask(`Switch to the ${LVN[b.dataset.lv]} course? It starts again from week 1.`, 'Switch')) return; p.fLevel = b.dataset.lv; S.fit.level = ''; cm.save(); render(); cm.toast(LVN[b.dataset.lv] + ' course started'); }
  if (b.id === 'fitRestart') { S.fit.start = cm.today(); cm.save(); render(); }
  if (b.id === 'fitEdit') { cm.go('profile'); setTimeout(() => document.querySelector('[data-sec="fitness"]')?.scrollIntoView({ behavior: 'smooth' }), 80); }
  if (b.dataset.larea) { libArea = b.dataset.larea; render(); document.querySelector('.lib')?.scrollIntoView({ block: 'nearest' }); }
  if (b.dataset.llvl != null && b.dataset.llvl !== undefined && b.hasAttribute('data-llvl')) { libLvl = +b.dataset.llvl; render(); document.querySelector('.lib')?.scrollIntoView({ block: 'nearest' }); }
  if (b.dataset.chal) { S.fit.chal = S.fit.chal || {}; S.fit.chal[b.dataset.chal] = { start: cm.today(), done: [] }; cm.save(); render(); cm.toast('Challenge joined — day 1 today!'); }
  if (b.dataset.chdone) { const st = S.fit.chal[b.dataset.chdone]; if (!st.done.includes(cm.today())) st.done.push(cm.today()); cm.save(); render(); cm.toast('Nice! Challenge day logged'); }
  if (b.dataset.chgo) { const ch = CHALLENGES.find(c => c.id === b.dataset.chgo), st = S.fit.chal[ch.id], day = st.done.length + 1, ex = EXI[ch.ex];
    play(finalize({ title: `${ch.name} · day ${day}`, focus: 'challenge', chal: ch.id, restS: 0, steps: [{ id: 'march', phase: 'warm', round: 0, amt: 30 }, { id: ex.id, phase: 'main', round: 1, amt: ch.target(day) }] }, p)); }
  if (b.id === 'measSave') { const rec = { d: cm.today() }; let any = false; MEAS.forEach(([k]) => { const v = parseFloat($('m_' + k).value); if (v > 10 && v < 300) { rec[k] = v; any = true; } });
    if (!any) return cm.toast('Enter at least one measurement in cm'); S.fit.meas = (S.fit.meas || []).filter(m => m.d !== rec.d).concat(rec); cm.save(); $('measOut').innerHTML = measHTML(); MEAS.forEach(([k]) => $('m_' + k).value = ''); cm.toast('Measurements saved'); }
});

/* ================= exercise detail sheet ================= */
let sheetFig;
function openEx(id) {
  const cm = C(), ex = EXI[id], esc = cm.esc, lim = limitsOf(cm.S.profile), warn = ex.avoid.filter(a => lim.has(a));
  const sh = $('exSheet');
  sh.querySelector('.sheetIn').innerHTML = `<div class="split2"><h2>${esc(ex.name)}</h2><button class="alt" id="exClose">Close</button></div>
    <div class="figbox"><svg viewBox="0 0 200 180" id="exFig" aria-label="Animated demonstration of ${esc(ex.name)}"></svg></div>
    <div class="chips">${ex.areas.map(a => `<span class="pill">${esc(labelOf(AREAS, a))}</span>`).join('')}<span class="pill">${['', 'Beginner', 'Intermediate', 'Pro'][ex.lvl]}</span>${ex.equip ? `<span class="pill">${esc(labelOf(EQUIP, ex.equip))}</span>` : ''}</div>
    ${warn.length ? `<div class="warn">Not recommended for you (${warn.map(w => ({ knee: 'knee pain', back: 'back pain', wrist: 'wrist pain', shoulder: 'shoulder pain', noJump: 'no jumping', bp: 'high BP', heartd: 'heart condition', preg: 'pregnancy' }[w])).join(', ')}).${ex.easier ? ' Try the easier option below.' : ''}</div>` : ''}
    <h2 style="margin-top:14px">How to do it</h2><ol class="plain">${ex.cues.map(c => `<li>${esc(c)}</li>`).join('')}</ol>
    <p><b>Common mistake:</b> ${esc(ex.mistake)}</p><p><b>Breathing:</b> ${esc(ex.breath)}</p>
    <p class="meta">${ex.kind === 'time' ? `Hold/move for ${ex.base.join(' / ')} s` : `${ex.base.join(' / ')} reps`} (beginner / intermediate / pro) · ${ex.met} MET</p>
    <div class="row">${ex.easier ? `<button class="alt grow" data-ex="${ex.easier}">Easier: ${esc(EXI[ex.easier].name)}</button>` : ''}${ex.harder ? `<button class="alt grow" data-ex="${ex.harder}">Harder: ${esc(EXI[ex.harder].name)}</button>` : ''}</div>
    <div class="row"><a class="btnlink grow" href="${yt(ex.name)}">▶ Watch video demos</a></div>
    <p class="meta">Videos open YouTube (search results from other creators).</p>`;
  sh.hidden = false; sheetFig?.stop(); sheetFig = new Fig($('exFig'), ex).start();
}
document.addEventListener('click', e => { if (e.target.id === 'exClose' || e.target.id === 'exSheet') { $('exSheet').hidden = true; sheetFig?.stop(); } });

/* ================= guided player ================= */
let P = null;
let actx;
function beep(f = 880, d = .12) { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = f; o.connect(g); g.connect(actx.destination); g.gain.setValueAtTime(.2, actx.currentTime); g.gain.exponentialRampToValueAtTime(.001, actx.currentTime + d); o.start(); o.stop(actx.currentTime + d); } catch (e) {} }
function say(t) { try { if (C().S.fit?.voice === false || !window.speechSynthesis) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'en-IN'; u.rate = 1; speechSynthesis.speak(u); } catch (e) {} }
const vib = ms => { try { navigator.vibrate?.(ms); } catch (e) {} };
function play(session) {
  const pl = $('player'); pl.hidden = false; C().stopCam?.();
  P = { s: session, i: 0, mode: 'ex', left: 0, timer: null, paused: false, started: Date.now(), done: 0 };
  try { navigator.wakeLock?.request('screen').then(l => P && (P.lock = l)).catch(() => {}); } catch (e) {}
  pl.innerHTML = `<div class="ptop"><button class="icon" id="pClose" aria-label="End workout">✕</button><div class="pttl"><b>${C().esc(session.title)}</b><div class="bar"><i id="pBar"></i></div></div><button class="icon" id="pVoice" aria-label="Voice on or off">${C().S.fit?.voice === false ? '🔇' : '🔊'}</button></div>
    <div class="pphase" id="pPhase"></div><div class="figbox big"><svg viewBox="0 0 200 180" id="pFig"></svg></div>
    <h2 class="pname" id="pName"></h2><div class="pcount" id="pCount"></div><p class="pcue" id="pCue"></p>
    <div class="pnext" id="pNext"></div>
    <div class="pctl"><button class="icon" id="pPrev" aria-label="Previous">⏮</button><button class="hot pmain" id="pMain">Pause</button><button class="icon" id="pSkip" aria-label="Skip">⏭</button></div>
    <div class="row center"><button class="link" id="pInfo">How to do this exercise</button></div>`;
  P.fig = new Fig($('pFig'), EXI[session.steps[0].id]).start();
  step(0);
}
function step(i) {
  const s = P.s; clearInterval(P.timer);
  if (i >= s.steps.length) return finish();
  P.i = Math.max(0, i); P.mode = 'ex'; const st = s.steps[P.i], ex = EXI[st.id];
  P.fig.set(ex); $('pBar').style.width = (P.i / s.steps.length * 100) + '%';
  const totalRounds = Math.max(...s.steps.map(x => x.round || 0));
  $('pPhase').textContent = st.phase === 'warm' ? 'Warm-up' : st.phase === 'cool' ? 'Cool-down' : totalRounds > 1 ? `Round ${st.round} of ${totalRounds}` : 'Workout';
  $('pName').textContent = ex.name; $('pCue').textContent = ex.cues[0];
  const nx = s.steps[P.i + 1]; $('pNext').textContent = nx ? 'Next: ' + EXI[nx.id].name : 'Last one!';
  let ci = 0; P.cueT = setInterval(() => { ci = (ci + 1) % ex.cues.length; const el = $('pCue'); if (el) el.textContent = ex.cues[ci]; }, 5000);
  if (ex.kind === 'time') {
    P.left = st.amt; $('pMain').textContent = 'Pause'; renderCount(); say(`${ex.name}. ${st.amt} seconds.`); beep(660);
    P.timer = setInterval(() => { if (P.paused) return; P.left--; if (P.left <= 3 && P.left > 0) beep(880, .08); renderCount(); if (P.left <= 0) { beep(1200, .25); vib(200); clearInterval(P.cueT); next(); } }, 1000);
  } else {
    $('pCount').innerHTML = `<b>${st.amt}</b><small>reps${/alternate|switch/i.test(ex.cues.join(' ')) ? ' (total, both sides)' : ''}</small>`; $('pMain').textContent = '✓ Done'; say(`${ex.name}. ${st.amt} reps.`); beep(660);
  }
}
function renderCount() { $('pCount').innerHTML = `<b>${P.left}</b><small>seconds</small>`; if (P.left === Math.floor(P.s.steps[P.i].amt / 2) && P.left > 10) say('Halfway'); }
function next() {
  clearInterval(P.timer); clearInterval(P.cueT); P.done = Math.max(P.done, P.i + 1);
  const st = P.s.steps[P.i], nx = P.s.steps[P.i + 1];
  if (!nx) return finish();
  const restS = st.phase === 'main' && nx.phase === 'main' ? P.s.restS : st.phase !== nx.phase ? 10 : 5;
  if (restS <= 0) return step(P.i + 1);
  P.mode = 'rest'; P.left = restS; P.fig.set(EXI[nx.id]);
  $('pPhase').textContent = 'Rest'; $('pName').textContent = 'Rest · next: ' + EXI[nx.id].name; $('pCue').textContent = EXI[nx.id].cues[0];
  $('pNext').innerHTML = '<button class="alt" id="pMore">+10 s</button>'; $('pMain').textContent = 'Skip rest';
  say('Rest. Next, ' + EXI[nx.id].name);
  const tick = () => { $('pCount').innerHTML = `<b>${P.left}</b><small>rest</small>`; };
  tick(); P.timer = setInterval(() => { if (P.paused) return; P.left--; if (P.left <= 3 && P.left > 0) beep(880, .08); tick(); if (P.left <= 0) { clearInterval(P.timer); step(P.i + 1); } }, 1000);
}
function finish() {
  clearInterval(P.timer); clearInterval(P.cueT); P.fig.stop(); try { P.lock?.release(); } catch (e) {}
  const s = P.s, frac = Math.max(.15, P.done / s.steps.length), realMin = Math.max(1, Math.round((Date.now() - P.started) / 60000));
  const mins = Math.min(realMin, Math.round(s.mins * 1.5)) || s.mins, kcal = Math.round(s.kcal * frac);
  say('Workout complete. Great job!'); beep(1000, .3); vib([150, 80, 150]);
  $('player').innerHTML = `<div class="pdone"><div class="big">🎉</div><h2>Workout complete!</h2><p class="meta">${C().esc(s.title)}</p>
    <div class="tgrid"><div><b>${mins}</b><small>minutes</small></div><div><b>${kcal}</b><small>kcal burned (est.)</small></div><div><b>${P.done}/${s.steps.length}</b><small>moves done</small></div></div>
    <h2 style="margin-top:16px">How did it feel?</h2><p class="meta">Care Me adjusts your next workouts.</p>
    <div class="row"><button class="alt grow" data-feel="easy">😌 Too easy</button><button class="alt grow" data-feel="ok">💪 Just right</button><button class="alt grow" data-feel="hard">🥵 Too hard</button></div></div>`;
  P.result = { mins, kcal };
}
function save(feel) {
  const cm = C(), S = cm.S, s = P.s; S.fit = S.fit || {}; S.fit.history = S.fit.history || [];
  S.fit.history.push({ d: cm.today(), ts: Date.now(), title: s.title, focus: s.focus, mins: P.result.mins, kcal: P.result.kcal, feel });
  if (S.fit.history.length > 400) S.fit.history.shift();
  if (s.focus !== 'quick' && s.focus !== 'challenge') S.fit.adj = Math.max(-3, Math.min(3, (S.fit.adj || 0) + (feel === 'easy' ? 1 : feel === 'hard' ? -1 : 0)));
  if (s.chal) { const st = S.fit.chal?.[s.chal]; if (st && !st.done.includes(cm.today())) st.done.push(cm.today()); }
  cm.save(); close(); cm.toast(`Saved — ${P.result.kcal} kcal burned`); cm.go(cm.tab === 'workout' ? 'workout' : cm.tab);
}
function close() { clearInterval(P?.timer); clearInterval(P?.cueT); P?.fig?.stop(); try { P?.lock?.release(); speechSynthesis?.cancel(); } catch (e) {} $('player').hidden = true; $('player').innerHTML = ''; }
document.addEventListener('click', async e => {
  if (!P || $('player').hidden) return; const id = e.target.closest('button')?.id, feel = e.target.closest('[data-feel]')?.dataset.feel;
  if (feel) return save(feel);
  if (id === 'pMain') { if (P.mode === 'rest') { clearInterval(P.timer); step(P.i + 1); } else if (EXI[P.s.steps[P.i].id].kind === 'reps') { beep(1200, .15); next(); } else { P.paused = !P.paused; P.fig.pause(P.paused); $('pMain').textContent = P.paused ? 'Resume' : 'Pause'; } }
  if (id === 'pSkip') { if (P.mode === 'rest') step(P.i + 1); else next(); }
  if (id === 'pPrev') step(P.mode === 'rest' ? P.i : P.i - 1);
  if (id === 'pMore') P.left += 10;
  if (id === 'pVoice') { const S = C().S; S.fit = S.fit || {}; S.fit.voice = S.fit.voice === false; C().save(); e.target.textContent = S.fit.voice === false ? '🔇' : '🔊'; }
  if (id === 'pInfo') { P.paused = true; P.fig.pause(true); $('pMain').textContent = P.mode === 'rest' ? 'Skip rest' : 'Resume'; openEx(P.s.steps[P.i].id); }
  if (id === 'pClose') { if (P.done && !P.result) { if (await C().ask('End the workout now? Your progress so far will be saved.', 'End & save')) { finish(); } } else if (!P.result) close(); else save('ok'); }
});

window.FIT = { render, todaySession, todayWorkoutKcal, doneOn, weekPlan, course, isOpen: () => !$('player').hidden || !$('exSheet').hidden,
  back: () => { if (!$('exSheet').hidden) { $('exSheet').hidden = true; sheetFig?.stop(); return true; } if (!$('player').hidden) { document.getElementById('pClose')?.click(); return true; } return false; },
  workoutDays: p => weekPlan(p).map(d => d.dow), summaryForAI: () => (C().S.fit?.history || []).filter(h => Date.now() - h.ts < 7 * 864e5).map(h => `${h.d}: ${h.title} ${h.mins} min ${h.kcal} kcal ${h.feel || ''}`).join('; '),
  _test: { buildSession, quickSession, frame: (id, i) => { const ex = EXI[id], ax = anchorFor(ex); return figSVG(place(ex.frames[i], ax), ex, ax, propsFor(ex, ax)); } } };
})();
