/* Care Me — diet engine: daily targets from profile, AI calls, prompts. */

const has = (p, ...ids) => ids.some(i => (p.conds || []).includes(i) || (p.focus || []).includes(i));

function computeTargets(p) {
  const w = +p.w || 70, h = +p.h || 170, age = +p.age || 30, female = p.sex === 'f';
  const bmr = 10 * w + 6.25 * h - 5 * age + (female ? -161 : 5);
  const tdee = bmr * (+p.act || 1.375);
  const bmi = w / ((h / 100) ** 2);
  const why = [], warn = [];
  const pregnant = has(p, 'preg'), bf = has(p, 'bf');
  const step = p.pace === 'gentle' ? 0.5 : 1;
  let adj = { lose: -500, fat: -350, maintain: 0, gain: 350, muscle: 250 }[p.wgoal] || 0;
  if (adj < 0) adj *= step; else if (adj > 0 && p.pace === 'gentle') adj = Math.round(adj * 0.6);
  if (pregnant || bf) {
    if (adj < 0) warn.push('Calorie deficit switched off during ' + (pregnant ? 'pregnancy' : 'breastfeeding') + '.');
    adj = pregnant ? 300 : 400; why.push(`+${adj} kcal for ${pregnant ? 'pregnancy (2nd/3rd trimester)' : 'breastfeeding'}`);
  } else if (adj) why.push(`${adj > 0 ? '+' : ''}${adj} kcal/day for ${labelOf(WGOALS, p.wgoal).toLowerCase()}`);
  if (adj < 0 && bmi < 18.5) { adj = 0; warn.push('Your BMI is below 18.5, so the app will not set a weight-loss deficit. Please speak to a doctor.'); }
  const floor = female ? 1200 : 1500;
  let kcal = Math.round((tdee + adj) / 10) * 10;
  if (kcal < floor) { kcal = floor; warn.push(`Calories kept at the safe minimum of ${floor} kcal.`); }
  if (+p.targetOverride >= 800) { kcal = +p.targetOverride; why.push('Using the calorie target you set'); }

  // protein g/kg (use target weight if lower than current for overweight people)
  const refW = p.tw && +p.tw < w && bmi > 25 ? Math.max(+p.tw, w * 0.85) : w;
  let pk = 1.0;
  if (p.wgoal === 'fat') pk = 1.6; if (p.wgoal === 'muscle') pk = 1.8; if (has(p, 'protein')) pk = Math.max(pk, 1.5);
  if (pregnant || bf) pk = Math.max(pk, 1.1);
  if (has(p, 'ckd')) { pk = Math.min(pk, 0.8); why.push('Protein kept moderate (0.8 g/kg) for kidney disease — follow your renal diet chart'); }
  else if (pk > 1) why.push(`Protein ${pk} g per kg for ${pk >= 1.8 ? 'muscle gain' : pk >= 1.6 ? 'fat loss' : 'your goal'}`);
  const prot = Math.round(pk * refW);

  // fat 25–30 %, carbs = remainder (capped for diabetes / low carb)
  const fatPct = has(p, 'lowcarb') ? 0.35 : has(p, 'chol', 'heartd', 'liver') ? 0.25 : 0.28;
  const fat = Math.round(kcal * fatPct / 9);
  let carb = Math.round((kcal - prot * 4 - fat * 9) / 4);
  const carbCapPct = has(p, 'lowcarb') ? 0.30 : has(p, 't2d', 'prediab', 'pcos', 'liver') ? 0.45 : 0.6;
  if (carb * 4 > kcal * carbCapPct) { carb = Math.round(kcal * carbCapPct / 4); why.push(`Carbs capped at ${Math.round(carbCapPct * 100)}% of calories`); }

  // sugar (free/added), sodium, fibre
  let sug = Math.round(kcal * 0.10 / 4);
  if (has(p, 'sugar', 't2d', 'prediab', 'pcos', 'liver', 't1d')) { sug = Math.round(kcal * 0.05 / 4); why.push(`Added sugar limit ${sug} g (5% of calories) — ${['sugar', 't2d', 'prediab', 'pcos', 'liver', 't1d'].filter(i => has(p, i)).map(i => labelOf([...CONDITIONS, ...FOCUS], i)).join(', ')}`); }
  let na = 2000;
  if (has(p, 'salt', 'bp', 'heartd', 'ckd')) { na = 1500; why.push('Sodium 1,500 mg (about 3.75 g salt) for ' + ['salt', 'bp', 'heartd', 'ckd'].filter(i => has(p, i)).map(i => labelOf([...CONDITIONS, ...FOCUS], i)).join(', ')); }
  let fib = Math.max(25, Math.round(kcal / 1000 * 14));
  if (has(p, 'fibre', 't2d', 'prediab', 'chol', 'pcos', 'liver')) fib = Math.max(fib, 35);
  if (has(p, 'ibs')) why.push('IBS: increase fibre slowly and note your trigger foods');

  // weight timeline
  let eta = '';
  if (p.tw && Math.abs(+p.tw - w) >= 0.5 && adj) {
    const perWeek = Math.abs(adj) * 7 / 7700;
    if (Math.sign(+p.tw - w) === Math.sign(adj)) eta = `About ${Math.ceil(Math.abs(+p.tw - w) / perWeek)} weeks to reach ${+p.tw} kg at ${r1(perWeek)} kg/week`;
  }
  if (p.tw) { const tb = +p.tw / ((h / 100) ** 2); if (tb < 18.5) warn.push(`A target of ${p.tw} kg gives BMI ${r1(tb)}, which is underweight. Consider a higher target.`); }
  return { kcal, prot, carb, fat, sug, na, fib, bmr: Math.round(bmr), tdee: Math.round(tdee), bmi: r1(bmi), why, warn, eta, water: +p.waterGoal || 8 };
}
function r1(n) { return Math.round(n * 10) / 10; }

function bmiLabel(b) { return b < 18.5 ? 'Underweight' : b < 23 ? 'Healthy (Asian range)' : b < 25 ? 'Overweight (Asian range)' : 'Obese range'; }

/* ---------- AI ---------- */
const MODELS = { gemini: 'gemini-flash-latest', claude: 'claude-sonnet-5-5' };
let sampleCap = null;
if (window.claude?.use) Promise.resolve(window.claude.use('sample')).then(s => { sampleCap = s; document.dispatchEvent(new Event('ai-ready')); }).catch(() => {});

function parseJSON(t) {
  const s = String(t).replace(/```json|```/g, ''); const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('The AI did not return readable data. Please try again.');
  return JSON.parse(s.slice(a, b + 1));
}
const blobToB64 = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(b); });

/* AI routing:
   1. Your own API key (Profile → Advanced), if you set one.
   2. Android app, signed in: Gemini Nano on the phone for short tasks when available, else Gemini in the cloud
      through the Care Me Firebase project (no key needed).
   3. claude.ai web preview: Claude's built-in analysis. */
const CareAI = () => window.Capacitor?.Plugins?.CareAI;
const isNative = () => !!window.Capacitor?.isNativePlatform?.();
const AI_STATE = { onDevice: 'UNKNOWN', lastSource: '' };
async function refreshAIState() {
  if (!isNative() || !CareAI()) return AI_STATE;
  try { const r = await CareAI().status(); AI_STATE.onDevice = r.onDevice || 'UNAVAILABLE'; } catch (e) { AI_STATE.onDevice = 'UNAVAILABLE'; }
  document.dispatchEvent(new Event('ai-ready')); return AI_STATE;
}
function friendlyAiError(e) {
  const m = String(e?.message || e || '');
  if (/app ?check|attestation|integrity|PERMISSION_DENIED|403/i.test(m)) return new Error('Google could not verify this copy of Care Me (App Check). Make sure Google Play services are up to date; if it continues, the app owner needs to check App Check settings in Firebase.');
  if (/quota|RESOURCE_EXHAUSTED|429|rate/i.test(m)) return Object.assign(new Error('The free AI limit is busy right now. Please try again in a minute.'), { code: 'rate_limited' });
  if (/network|Unable to resolve host|timeout|UnknownHost|offline/i.test(m)) return new Error('No internet connection. Photo analysis on this phone needs internet.');
  return new Error(m || 'The AI request failed. Please try again.');
}

async function aiCall(cfg, prompt, blob, big) {
  const { prov, key } = cfg, model = cfg.model || MODELS[prov];
  if (!key && isNative() && CareAI()) {
    if (!cfg.signedIn) throw Object.assign(new Error('Sign in with Google (Profile → Account & AI) to use the AI features.'), { code: 'nologin' });
    const image = blob ? await blobToB64(blob) : undefined;
    let lastErr;
    if (!big && cfg.deviceAI !== false && AI_STATE.onDevice === 'AVAILABLE') {
      try {
        const r = await CareAI().generate({ prompt, image, mode: 'device', json: true, maxTokens: 1024 });
        const j = parseJSON(r.text); AI_STATE.lastSource = 'device'; return Object.assign(j, { __source: 'device' });
      } catch (e) { lastErr = e; }
    }
    for (const m of [cfg.cloudModel || 'gemini-3.5-flash', 'gemini-flash-latest']) {
      try {
        const r = await CareAI().generate({ prompt, image, mode: 'cloud', json: true, maxTokens: big ? 12000 : 3000, model: m });
        const j = parseJSON(r.text); AI_STATE.lastSource = r.source || 'cloud'; return Object.assign(j, { __source: AI_STATE.lastSource });
      } catch (e) { lastErr = e; if (!/not found|404|not supported|unsupported|invalid model/i.test(e?.message || '')) break; }
    }
    throw friendlyAiError(lastErr);
  }
  if (!key) {
    if (sampleCap) return sampleCap.json(prompt, blob ? { images: [blob], modelTier: 'default' } : { modelTier: big ? 'default' : 'quick' });
    throw Object.assign(new Error('Photo analysis works in the Care Me Android app after you sign in with Google.'), { code: 'nologin' });
  }
  const b64 = blob ? await blobToB64(blob) : null;
  let r, j;
  try {
    if (prov === 'claude') {
      const content = []; if (b64) content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } });
      content.push({ type: 'text', text: prompt });
      r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model, max_tokens: big ? 8000 : 3000, messages: [{ role: 'user', content }] }) });
      j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error?.message || 'Claude error ' + r.status);
      return parseJSON((j.content || []).map(c => c.text || '').join(''));
    }
    const parts = []; if (b64) parts.push({ inline_data: { mime_type: 'image/jpeg', data: b64 } }); parts.push({ text: prompt });
    r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent', { method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: 'application/json', temperature: 0.3, maxOutputTokens: big ? 16000 : 4000 } }) });
    j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.error?.message || 'Gemini error ' + r.status);
    return parseJSON((j.candidates?.[0]?.content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join(''));
  } catch (e) {
    if (e instanceof TypeError) throw new Error('No internet connection, or the AI service could not be reached.');
    throw e;
  }
}

/* What the AI is told about the user. Never includes name. */
function userContext(p, T) {
  const base = `Diet type: ${labelOf(DIETS, p.diet)}. Home cuisine: ${p.region}. Main goal: ${labelOf(WGOALS, p.wgoal)}.` +
    (p.focus?.length ? ` Focus: ${p.focus.map(f => labelOf(FOCUS, f)).join(', ')}.` : '') +
    ` Daily targets: ${T.kcal} kcal, protein ${T.prot} g, carbs ≤${T.carb} g, fat ${T.fat} g, added sugar ≤${T.sug} g, sodium ≤${T.na} mg, fibre ≥${T.fib} g.` +
    (p.dislikes ? ` Avoids/dislikes: ${p.dislikes}.` : '');
  if (!p.shareHealth) return base;
  return base + ` Age ${p.age}, ${p.sex === 'f' ? 'female' : 'male'}, ${p.w} kg, ${p.h} cm.` +
    (p.conds?.length ? ` Health conditions: ${p.conds.map(c => labelOf(CONDITIONS, c)).join(', ')}.` : ' No diagnosed conditions.') +
    (p.allergies ? ` FOOD ALLERGIES: ${p.allergies}.` : '') + (p.meds ? ` Medicines: ${p.meds}.` : '') +
    (p.hba1c ? ` HbA1c ${p.hba1c}%.` : '') + (p.fbs ? ` Fasting sugar ${p.fbs} mg/dL.` : '') + (p.bps ? ` BP ${p.bps}/${p.bpd}.` : '') +
    (p.docNote ? ` Doctor's diet advice (follow this first): ${p.docNote}.` : '');
}

const ITEM_SCHEMA = `{"name":"common name (regional name in brackets if useful)","cuisine":"e.g. Chettinad, Punjabi, Italian","veg":"veg|nonveg|egg","unit":"piece|g|ml|cup|bowl (~150 g)|glass","qty":number,"kcal":per ONE unit,"p":protein g per unit,"c":carbs g,"f":fat g,"sug":total sugars g,"fib":fibre g,"na":sodium mg,"gi":"low|med|high","flags":["short warnings for THIS user, e.g. 'High GI – limit for diabetes', 'Contains peanuts – allergy', 'Not vegetarian', 'High salt'"],"conf":0..1}`;

const scanPrompt = (ctx) => `You are an expert clinical nutritionist for Indian (all regions, street food, sweets) and international cuisine.
USER PROFILE: ${ctx}
Look at the food photo. Identify EVERY distinct dish, side, bread, rice, drink, chutney, pickle, papad or dessert, as separate items (in a thali each katori is its own item). Estimate the visible portion in a natural unit ("piece" for countable items like roti/idli/dosa/samosa, "bowl (~N g)" or "cup" for curries, rice and dal, else g/ml). For unit g/ml give values per 1 g/ml. Include typical oil/ghee.
Then judge how well this meal fits THIS user's goal and health conditions.
Return ONLY JSON: {"items":[${ITEM_SCHEMA}],"score":1-10 fit score for this user,"verdict":"one line, e.g. 'Good protein, but rice portion is large for diabetes'","tip":"one practical swap or portion change for this user, max 30 words","note":"caveat or empty"}
If no food is visible return {"items":[],"note":"No food found"}.`;

const lookupPrompt = (ctx, name) => `Nutrition estimate for "${name}" as typically served (Indian first, else international). If a count is given (e.g. "2 roti") set qty. USER PROFILE: ${ctx}
Return ONLY JSON ${ITEM_SCHEMA}`;

const checkPrompt = (ctx, food) => `You are a careful clinical nutritionist. USER PROFILE: ${ctx}
The user asks: can I eat "${food}"? Answer for THIS user.
Return ONLY JSON {"answer":"yes|limit|avoid","headline":"max 12 words","why":"2 short sentences, specific to their goal/conditions","portion":"a safe portion, e.g. '1 small katori, once a week'","better":"1–2 better alternatives common in their cuisine"}.
If allergies or doctor's advice conflict, answer avoid. Be practical, not preachy.`;

const planPrompt = (ctx, days) => `You are an expert Indian clinical dietitian. Create a ${days}-day meal plan for this user. USER PROFILE: ${ctx}
Rules: match daily calories within ±5% and meet protein; respect diet type strictly (Jain: no onion, garlic, root vegetables; vegan: no dairy/honey); never include allergens; follow the doctor's advice; use everyday dishes from their home cuisine with realistic home portions in Indian measures (katori, cup, piece, tsp oil). Vary dishes across days. Slots: Early morning, Breakfast, Mid-morning, Lunch, Evening snack, Dinner.
Return ONLY compact JSON:
{"days":[{"day":"Day 1","meals":[{"slot":"Breakfast","time":"8:00 AM","items":[{"name":"Ragi dosa","qty":"2 pieces","kcal":220,"p":6,"c":38,"f":5}],"kcal":number,"p":number}],"total":{"kcal":n,"p":n,"c":n,"f":n}}],"tips":["3–5 short tips specific to their goal and conditions"],"shopping":["8–15 key groceries for the week"]}`;
