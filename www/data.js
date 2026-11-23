/* Static data: goals, health conditions, food preferences, guidance. Shared by engine.js and app.js. */

const WGOALS = [
  { id: 'lose', label: 'Weight loss', desc: 'Lose body weight steadily' },
  { id: 'fat', label: 'Fat loss', desc: 'Lose fat, keep muscle (higher protein)' },
  { id: 'maintain', label: 'Maintain', desc: 'Stay at current weight, eat better' },
  { id: 'gain', label: 'Weight gain', desc: 'Healthy weight gain' },
  { id: 'muscle', label: 'Muscle gain', desc: 'Lean gain with strength training' }
];

const FOCUS = [
  { id: 'sugar', label: 'Sugar cut' }, { id: 'salt', label: 'Low salt' }, { id: 'protein', label: 'High protein' },
  { id: 'fibre', label: 'High fibre' }, { id: 'lowcarb', label: 'Low carb' }, { id: 'heart', label: 'Heart healthy' },
  { id: 'gut', label: 'Better digestion' }, { id: 'energy', label: 'More energy' }, { id: 'skin', label: 'Skin & hair' }
];

const CONDITIONS = [
  { id: 't2d', label: 'Type 2 diabetes' }, { id: 'prediab', label: 'Prediabetes' }, { id: 't1d', label: 'Type 1 diabetes' },
  { id: 'bp', label: 'High blood pressure' }, { id: 'chol', label: 'High cholesterol / triglycerides' }, { id: 'heartd', label: 'Heart disease' },
  { id: 'hypo', label: 'Hypothyroidism' }, { id: 'hyper', label: 'Hyperthyroidism' }, { id: 'pcos', label: 'PCOS / PCOD' },
  { id: 'liver', label: 'Fatty liver' }, { id: 'ckd', label: 'Kidney disease' }, { id: 'gout', label: 'Gout / high uric acid' },
  { id: 'gerd', label: 'Acidity / GERD' }, { id: 'ibs', label: 'IBS' }, { id: 'anaemia', label: 'Anaemia (low Hb)' },
  { id: 'vitd', label: 'Low vitamin D / B12' }, { id: 'lactose', label: 'Lactose intolerance' }, { id: 'gluten', label: 'Gluten intolerance / celiac' },
  { id: 'preg', label: 'Pregnant' }, { id: 'bf', label: 'Breastfeeding' }
];

const DIETS = [
  { id: 'veg', label: 'Vegetarian' }, { id: 'nonveg', label: 'Non-vegetarian' }, { id: 'egg', label: 'Eggetarian' },
  { id: 'vegan', label: 'Vegan' }, { id: 'jain', label: 'Jain' }
];

const REGIONS = ['South Indian – Tamil Nadu', 'South Indian – Kerala', 'South Indian – Karnataka', 'South Indian – Andhra/Telangana',
  'North Indian – Punjabi', 'North Indian – UP/Bihar', 'Gujarati', 'Maharashtrian', 'Bengali', 'Rajasthani', 'Mixed Indian', 'Continental / International'];

const ACTIVITY = [
  { v: '1.2', label: 'Mostly sitting (desk work, little walking)' },
  { v: '1.375', label: 'Lightly active (walking, standing work)' },
  { v: '1.55', label: 'Active (exercise 3–5 days a week)' },
  { v: '1.725', label: 'Very active (hard exercise daily / physical job)' }
];

const labelOf = (list, id) => (list.find(x => x.id === id) || {}).label || id;

/* Profile form schema — used by the onboarding wizard and the Profile screen. */
const SECTIONS = [
  { id: 'basics', title: 'About you', sub: 'Used to calculate your daily calorie needs.', fields: [
    { k: 'name', t: 'text', label: 'Name', ac: 'given-name' },
    { row: [{ k: 'age', t: 'num', label: 'Age', min: 12, max: 100 }, { k: 'sex', t: 'select', label: 'Sex', opts: [['m', 'Male'], ['f', 'Female']] }] },
    { row: [{ k: 'h', t: 'num', label: 'Height (cm)', min: 120, max: 230 }, { k: 'w', t: 'num', label: 'Weight (kg)', min: 30, max: 250, step: 0.1 }] },
    { k: 'tw', t: 'num', label: 'Target weight (kg)', min: 30, max: 250, step: 0.1, hint: 'Leave blank if you only want to eat healthier' },
    { k: 'act', t: 'select', label: 'Daily activity', opts: ACTIVITY.map(a => [a.v, a.label]) }
  ] },
  { id: 'goals', title: 'Your goal', sub: 'Pick one main goal, then any extra focus areas.', fields: [
    { k: 'wgoal', t: 'cards', label: 'Main goal', opts: WGOALS },
    { k: 'pace', t: 'select', label: 'Pace', opts: [['gentle', 'Gentle (about 0.25 kg a week)'], ['std', 'Standard (about 0.5 kg a week)']], show: p => ['lose', 'fat', 'gain', 'muscle'].includes(p.wgoal) },
    { k: 'focus', t: 'chips', label: 'Extra focus (choose any)', opts: FOCUS }
  ] },
  { id: 'health', title: 'Health & diagnosis', sub: 'Optional. It tunes your sugar, salt, protein and fibre limits and the advice you get.', fields: [
    { k: 'conds', t: 'chips', label: 'Conditions you are diagnosed with or being treated for', opts: CONDITIONS },
    { k: 'allergies', t: 'text', label: 'Food allergies', ph: 'e.g. peanuts, prawns' },
    { k: 'meds', t: 'text', label: 'Regular medicines (optional)', ph: 'e.g. metformin, thyroxine' },
    { group: 'Latest test results (optional)', row: [{ k: 'hba1c', t: 'num', label: 'HbA1c %', step: 0.1 }, { k: 'fbs', t: 'num', label: 'Fasting sugar mg/dL' }] },
    { row: [{ k: 'bps', t: 'num', label: 'BP systolic' }, { k: 'bpd', t: 'num', label: 'BP diastolic' }] },
    { k: 'docNote', t: 'area', label: 'Diet advice from your doctor or dietitian', ph: 'e.g. salt under 5 g, no sweets, protein 50 g' },
    { k: 'shareHealth', t: 'toggle', label: 'Use my health details for personalised AI advice', hint: 'Sends your goals and conditions (never your name) with food photos to the AI service you choose.' }
  ] },
  { id: 'fitness', title: 'Fitness & toning', sub: 'Builds your home-workout course. No gym needed.', fields: [
    { k: 'fLevel', t: 'cards', label: 'Your fitness level', opts: FIT_LEVELS },
    { k: 'fGoal', t: 'cards', label: 'Workout goal', opts: FIT_GOALS },
    { k: 'fAreas', t: 'chips', label: 'Which areas do you want to tone?', opts: AREAS },
    { row: [{ k: 'fDays', t: 'select', label: 'Workout days a week', opts: [['3', '3 days'], ['4', '4 days'], ['5', '5 days'], ['6', '6 days']] },
      { k: 'fMins', t: 'select', label: 'Minutes per workout', opts: [['10', '10 min'], ['20', '20 min'], ['30', '30 min'], ['45', '45 min']] }] },
    { k: 'fEquip', t: 'chips', label: 'What do you have at home? (optional)', opts: EQUIP },
    { k: 'fLimits', t: 'chips', label: 'Any pain or limits? (optional)', opts: LIMITS },
    { k: 'fEat', t: 'toggle', label: 'Add half of my workout calories to my food budget' }
  ] },
  { id: 'food', title: 'Food preferences', sub: 'So suggestions match what you actually eat.', fields: [
    { k: 'diet', t: 'cards', label: 'Diet type', opts: DIETS },
    { k: 'region', t: 'select', label: 'Home cuisine', opts: REGIONS.map(r => [r, r]) },
    { k: 'dislikes', t: 'text', label: 'Foods you avoid or dislike', ph: 'e.g. mushroom, brinjal' },
    { row: [{ k: 'waterGoal', t: 'num', label: 'Water goal (glasses)', min: 1, max: 20 }, { k: 'targetOverride', t: 'num', label: 'Fixed kcal target', hint: 'Only if your doctor set one' }] }
  ] }
];

const DEF_PROFILE = { name: '', age: 30, sex: 'm', h: 170, w: 70, tw: '', act: '1.375', wgoal: 'maintain', pace: 'std', focus: [], conds: [],
  allergies: '', meds: '', hba1c: '', fbs: '', bps: '', bpd: '', docNote: '', shareHealth: true, diet: 'nonveg', region: REGIONS[0], dislikes: '', waterGoal: 8, targetOverride: '',
  fLevel: 'beg', fGoal: 'tone', fAreas: [], fDays: '3', fMins: '20', fEquip: [], fLimits: [], fEat: false };

/* Short, conservative guidance shown on the Plan screen. */
const GUIDE = {
  t2d: { t: 'Diabetes', more: 'Millets (ragi, kambu, thinai), dal, sundal, vegetables at every meal, curd, eggs/fish/chicken if you eat them', less: 'White rice in large heaps, maida, sweets, fruit juice, sugary tea/coffee', tip: 'Fill half the plate with vegetables, a quarter with protein and a quarter with grains. Eat at regular times, especially if you take tablets or insulin.' },
  prediab: { t: 'Prediabetes', more: 'Whole grains and millets, legumes, vegetables, nuts in small amounts', less: 'Sweets, bakery items, sweetened drinks, refined flour', tip: 'Losing 5–7% of body weight and walking 30 minutes a day can bring sugar back to normal.' },
  t1d: { t: 'Type 1 diabetes', more: 'Consistent carbs at each meal, fibre-rich foods', less: 'Sugary drinks except when treating a low', tip: 'Match carbs to your insulin plan. Follow your diabetologist on carb counting.' },
  bp: { t: 'High BP', more: 'Fresh vegetables, fruits, curd, dal, unsalted nuts, coconut water (ask your doctor if you have kidney issues)', less: 'Pickles, papad, chips, namkeen, instant noodles, extra salt at the table', tip: 'Keep total salt under 5 g a day — about one level teaspoon, including what is used in cooking.' },
  chol: { t: 'Cholesterol', more: 'Oats, barley, dal, rajma, vegetables, fish, a small handful of nuts', less: 'Deep-fried snacks, vanaspati, ghee and butter in excess, red meat, bakery items', tip: 'Use 3–4 teaspoons of oil per person a day, and rotate between groundnut, gingelly and mustard oil.' },
  heartd: { t: 'Heart health', more: 'Vegetables, fruits, whole grains, fish, legumes', less: 'Salt, fried foods, trans fats, processed meat', tip: 'Follow your cardiologist on fluid and salt limits.' },
  hypo: { t: 'Hypothyroid', more: 'Iodised salt in normal amounts, eggs, dairy, protein at each meal', less: 'Very large amounts of raw cabbage/cauliflower, soy in excess', tip: 'Take thyroxine on an empty stomach and wait 30–60 minutes before tea, coffee or food.' },
  hyper: { t: 'Hyperthyroid', more: 'Enough calories and protein, calcium-rich foods', less: 'Excess iodine (seaweed, iodine supplements), caffeine', tip: 'Weight loss may be from the condition itself — review with your endocrinologist.' },
  pcos: { t: 'PCOS', more: 'High-protein breakfast, millets, vegetables, seeds, legumes', less: 'Sweets, refined carbs, sugary drinks, frequent snacking on biscuits', tip: 'Combine carbs with protein and fat to reduce sugar spikes. Strength training helps insulin sensitivity.' },
  liver: { t: 'Fatty liver', more: 'Vegetables, whole grains, legumes, fish, coffee without sugar', less: 'Sugar, fructose drinks, fried foods, alcohol', tip: 'Even 5–10% weight loss reduces liver fat.' },
  ckd: { t: 'Kidney disease', more: 'Only what your nephrologist/renal dietitian allows', less: 'Salt, packaged foods; potassium and phosphorus foods if advised (bananas, tender coconut, colas)', tip: 'Protein, potassium and fluid limits depend on your stage. This app keeps protein moderate — follow your renal diet chart first.' },
  gout: { t: 'Gout', more: 'Water, low-fat dairy, vegetables, cherries', less: 'Organ meat, red meat, shellfish, sardines, alcohol (beer), sugary drinks', tip: 'Drink enough water through the day. Most dals are fine in normal portions.' },
  gerd: { t: 'Acidity', more: 'Small frequent meals, buttermilk, banana, oats', less: 'Very spicy or oily food, late dinners, excess tea/coffee, carbonated drinks', tip: 'Finish dinner 2–3 hours before lying down.' },
  ibs: { t: 'IBS', more: 'Regular meal times, cooked vegetables, curd if tolerated', less: 'Trigger foods you have noticed (often onion, garlic, rajma, very spicy food)', tip: 'A food-symptom diary helps — use the meal notes.' },
  anaemia: { t: 'Anaemia', more: 'Greens (keerai, palak), dates, ragi, jaggery in small amounts, eggs, meat, citrus with meals', less: 'Tea or coffee within an hour of meals', tip: 'Vitamin C (lemon, amla, guava) with iron-rich food improves absorption.' },
  vitd: { t: 'Vitamin D / B12', more: 'Morning sunlight, eggs, fish, dairy, fortified foods', less: '—', tip: 'Vegetarians often need B12 supplements — check with your doctor.' },
  lactose: { t: 'Lactose intolerance', more: 'Curd, buttermilk, paneer (usually tolerated), lactose-free milk', less: 'Large glasses of milk, milk sweets', tip: 'Small amounts of milk with meals are often fine.' },
  gluten: { t: 'Gluten', more: 'Rice, millets, besan, rice/ragi dosa and idli', less: 'Wheat roti, maida, rava/sooji, barley, bakery', tip: 'Check packaged masalas and asafoetida (hing), which can contain wheat.' },
  preg: { t: 'Pregnancy', more: 'Protein, iron, calcium, folate foods; well-cooked meat/eggs', less: 'Raw papaya, unpasteurised dairy, alcohol, high-mercury fish, excess caffeine', tip: 'This is not a time to diet. The app does not set a calorie deficit. Follow your obstetrician.' },
  bf: { t: 'Breastfeeding', more: 'Extra protein, fluids, calcium', less: 'Alcohol, excess caffeine', tip: 'You need about 400–500 kcal more a day. The app does not set a deficit.' },
  sugar: { t: 'Sugar cut', more: 'Unsweetened tea/coffee, whole fruit, nuts, makhana, sundal', less: 'Sweets, biscuits, juices, soft drinks, sweetened curd', tip: 'Cut sugar in tea gradually — half a spoon less each week.' },
  salt: { t: 'Low salt', more: 'Lemon, herbs, pepper, jeera to add flavour', less: 'Pickle, papad, chips, sauces, instant mixes', tip: 'Taste before adding salt at the table.' },
  protein: { t: 'High protein', more: 'Eggs, chicken, fish, paneer, curd, dal, sundal, soya chunks, sprouts', less: '—', tip: 'Spread protein across meals — about 20–30 g each.' },
  fibre: { t: 'High fibre', more: 'Vegetables, keerai, millets, whole pulses, fruits with skin, flaxseed', less: 'Maida, polished rice in large amounts', tip: 'Increase fibre slowly and drink more water.' },
  lowcarb: { t: 'Low carb', more: 'Vegetables, eggs, paneer, meat, fish, nuts', less: 'Large rice/roti portions, sweets, juices', tip: 'Keep at least some whole grains for fibre and energy.' }
};

const SAMPLE_MEAL = [
  { name: 'Steamed Rice', cuisine: 'South Indian', veg: 'veg', unit: 'cup', qty: 1.5, kcal: 205, p: 4.3, c: 45, f: .4, sug: .1, fib: .6, na: 2, gi: 'high', flags: [], conf: .92 },
  { name: 'Sambar', cuisine: 'South Indian', veg: 'veg', unit: 'bowl (~150 g)', qty: 1, kcal: 140, p: 6, c: 18, f: 5, sug: 4, fib: 5, na: 520, gi: 'low', flags: [], conf: .88 },
  { name: 'Chettinad Chicken Curry', cuisine: 'Chettinad', veg: 'nonveg', unit: 'bowl (~150 g)', qty: 1, kcal: 290, p: 22, c: 8, f: 19, sug: 3, fib: 2, na: 680, gi: 'low', flags: [], conf: .8 },
  { name: 'Beans Poriyal', cuisine: 'South Indian', veg: 'veg', unit: 'bowl (~100 g)', qty: 1, kcal: 95, p: 2.5, c: 9, f: 6, sug: 3, fib: 3.5, na: 260, gi: 'low', flags: [], conf: .78 },
  { name: 'Appalam (papad)', cuisine: 'South Indian', veg: 'veg', unit: 'piece', qty: 2, kcal: 55, p: 1.5, c: 5, f: 3.3, sug: 0, fib: .5, na: 230, gi: 'med', flags: ['High salt'], conf: .9 },
  { name: 'Curd', cuisine: 'Indian', veg: 'veg', unit: 'bowl (~100 g)', qty: 1, kcal: 98, p: 3.5, c: 4.7, f: 4.3, sug: 4.7, fib: 0, na: 40, gi: 'low', flags: [], conf: .85 },
  { name: 'Payasam', cuisine: 'South Indian sweet', veg: 'veg', unit: 'bowl (~100 g)', qty: 1, kcal: 180, p: 4, c: 28, f: 6, sug: 20, fib: .5, na: 45, gi: 'high', flags: ['High sugar'], conf: .7 }
];
