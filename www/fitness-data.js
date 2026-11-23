/* Care Me — home workout library.
   Each exercise has: name, body areas, level (1 beginner, 2 intermediate, 3 pro), kind (reps|time),
   base amount per level, MET (for calories), equipment, conditions it should be avoided with,
   coaching cues, and animation keyframes for the built-in demo figure.

   Pose = [torso, upperArmNear, forearmNear, upperArmFar, forearmFar, thighNear, shinNear, thighFar, shinFar, opts]
   Angles in degrees for each body segment: 0 = pointing right (the way the figure faces), 90 = down, -90 = up, 180 = left.
   opts: ax = joint kept still ('foot' | 'hip' | 'hand' | 'head'), lift = px off the floor. */

const AREAS = [
  { id: 'full', label: 'Full body' }, { id: 'belly', label: 'Belly & abs' }, { id: 'arms', label: 'Arms' },
  { id: 'chest', label: 'Chest' }, { id: 'back', label: 'Back & posture' }, { id: 'shoulders', label: 'Shoulders' },
  { id: 'thighs', label: 'Thighs & legs' }, { id: 'glutes', label: 'Glutes & hips' }, { id: 'flex', label: 'Flexibility' }
];
const FIT_GOALS = [
  { id: 'tone', label: 'Tone & shape', desc: 'Firm up target areas' }, { id: 'burn', label: 'Burn fat', desc: 'More cardio, higher heart rate' },
  { id: 'strength', label: 'Build strength', desc: 'Harder moves, more sets' }, { id: 'stamina', label: 'Stamina', desc: 'Longer, steady sessions' },
  { id: 'mobility', label: 'Mobility & pain-free', desc: 'Stretching, posture, joints' }
];
const FIT_LEVELS = [
  { id: 'beg', label: 'Beginner', desc: 'New or returning after a break' },
  { id: 'int', label: 'Intermediate', desc: 'Exercise 2–3× a week already' },
  { id: 'pro', label: 'Pro', desc: 'Fit and want a real challenge' }
];
const EQUIP = [{ id: 'chair', label: 'Sturdy chair' }, { id: 'wall', label: 'Free wall' }, { id: 'weights', label: 'Dumbbells / water bottles' }, { id: 'mat', label: 'Yoga mat' }];
const LIMITS = [{ id: 'knee', label: 'Knee pain' }, { id: 'back', label: 'Lower-back pain' }, { id: 'wrist', label: 'Wrist pain' }, { id: 'shoulder', label: 'Shoulder pain' }, { id: 'noJump', label: 'No jumping (neighbours / joints)' }];

const STAND = [-90, 85, 88, 85, 88, 90, 90, 90, 90];
const PLANK = [-10, 90, 90, 90, 90, 172, 172, 172, 172];
const TABLE = [0, 90, 90, 90, 90, 90, 180, 90, 180];
const BACK = [180, 0, 0, 0, 0, -45, 70, -45, 70];
const PRONE = [0, 0, 0, 0, 0, 180, 180, 180, 180];
const p = (base, ch = {}, opts) => { const a = base.slice(); for (const k in ch) a[+k] = ch[k]; if (opts) a[9] = opts; return a; };
const sym = (t, ua, fa, th, sh, o) => [t, ua, fa, ua, fa, th, sh, th, sh, o];

const EX = [
  /* ---------- warm-up / cardio ---------- */
  { id: 'march', name: 'March in place', areas: ['full'], lvl: 1, kind: 'time', base: [30, 40, 45], met: 3.5, cat: 'warm', avoid: [],
    cues: ['Stand tall, core lightly braced', 'Lift knees to hip height one at a time', 'Swing opposite arm forward'], mistake: 'Leaning back or stomping heavily', breath: 'Breathe steadily through the nose',
    frames: [p(STAND, { 1: 120, 2: 100, 3: 45, 4: 10, 5: 15, 6: 95 }, { ax: 'hip' }), p(STAND, { 1: 45, 2: 10, 3: 120, 4: 100, 7: 15, 8: 95 }, { ax: 'hip' })], ms: 450 },
  { id: 'highknees', name: 'High knees', areas: ['full', 'belly', 'thighs'], lvl: 2, kind: 'time', base: [20, 30, 40], met: 8, cat: 'cardio', avoid: ['knee', 'noJump', 'preg', 'heartd'],
    cues: ['Run on the spot on the balls of your feet', 'Drive knees above hip height', 'Pump the arms'], mistake: 'Knees staying low', breath: 'Quick, rhythmic breaths',
    frames: [p(STAND, { 1: 130, 2: 95, 3: 30, 4: -40, 5: -10, 6: 90 }, { ax: 'hip', lift: 4 }), p(STAND, { 1: 30, 2: -40, 3: 130, 4: 95, 7: -10, 8: 90 }, { ax: 'hip', lift: 4 })], ms: 260, easier: 'march' },
  { id: 'jacks', name: 'Jumping jacks', areas: ['full'], lvl: 1, kind: 'time', base: [25, 35, 45], met: 8, cat: 'cardio', avoid: ['knee', 'noJump', 'preg'],
    cues: ['Jump feet wide as arms sweep overhead', 'Land softly with bent knees', 'Jump back together, arms down'], mistake: 'Landing stiff-legged', breath: 'Breathe out as arms go up',
    frames: [p(STAND, {}, { ax: 'hip' }), p(STAND, { 1: -100, 2: -95, 3: -80, 4: -85, 5: 80, 7: 100 }, { ax: 'hip', lift: 8 })], ms: 380, easier: 'stepjacks' },
  { id: 'stepjacks', name: 'Step jacks (no jump)', areas: ['full'], lvl: 1, kind: 'time', base: [30, 40, 45], met: 4.5, cat: 'warm', avoid: [],
    cues: ['Step one foot out to the side', 'Raise both arms overhead', 'Step back in, arms down; alternate sides'], mistake: 'Shrugging shoulders', breath: 'Breathe out as arms rise',
    frames: [p(STAND, {}, { ax: 'hip' }), p(STAND, { 1: -100, 2: -95, 3: -80, 4: -85, 5: 75 }, { ax: 'hip' })], ms: 600 },
  { id: 'buttkicks', name: 'Butt kicks', areas: ['full', 'thighs'], lvl: 1, kind: 'time', base: [25, 35, 40], met: 7, cat: 'cardio', avoid: ['knee', 'noJump'],
    cues: ['Jog on the spot', 'Kick heels up towards your glutes', 'Stay light on your feet'], mistake: 'Leaning forward', breath: 'Steady rhythm',
    frames: [p(STAND, { 1: 110, 2: 60, 3: 60, 4: 20, 5: 100, 6: 215 }, { ax: 'hip', lift: 3 }), p(STAND, { 1: 60, 2: 20, 3: 110, 4: 60, 7: 100, 8: 215 }, { ax: 'hip', lift: 3 })], ms: 300, easier: 'march' },
  { id: 'armcircles', name: 'Arm circles', areas: ['shoulders'], lvl: 1, kind: 'time', base: [30, 30, 30], met: 2.5, cat: 'warm', avoid: [],
    cues: ['Arms straight out', 'Draw big slow circles', 'Switch direction halfway'], mistake: 'Rushing small circles', breath: 'Relaxed breathing',
    frames: [sym(-90, 0, 0, 90, 90, { ax: 'foot' }), sym(-90, -90, -90, 90, 90, { ax: 'foot' }), sym(-90, -175, -175, 90, 90, { ax: 'foot' }), sym(-90, 95, 95, 90, 90, { ax: 'foot' })], ms: 550 },
  { id: 'boxing', name: 'Shadow boxing', areas: ['full', 'arms', 'shoulders'], lvl: 1, kind: 'time', base: [30, 40, 45], met: 6, cat: 'cardio', avoid: [],
    cues: ['Stagger your stance, knees soft', 'Punch straight out, then back to guard', 'Rotate your hips with each punch'], mistake: 'Locking the elbows hard', breath: 'Breathe out with each punch',
    frames: [[-85, 0, 0, 60, -70, 80, 92, 100, 88, { ax: 'hip' }], [-85, 60, -70, 0, 0, 80, 92, 100, 88, { ax: 'hip' }]], ms: 330 },
  { id: 'climbers', name: 'Mountain climbers', areas: ['belly', 'full', 'shoulders'], lvl: 2, kind: 'time', base: [20, 30, 40], met: 8, cat: 'cardio', avoid: ['wrist', 'preg', 'heartd'],
    cues: ['Start in a high plank, hands under shoulders', 'Drive one knee to your chest, then switch fast', 'Keep hips level with your shoulders'], mistake: 'Hips bouncing up high', breath: 'Short quick breaths',
    frames: [p(PLANK, { 5: 30, 6: 125 }, { ax: 'hand' }), p(PLANK, { 7: 30, 8: 125 }, { ax: 'hand' })], ms: 280, easier: 'kneeplank' },
  { id: 'burpee', name: 'Burpees', areas: ['full', 'chest', 'thighs'], lvl: 3, kind: 'reps', base: [6, 10, 15], met: 10, cat: 'cardio', avoid: ['knee', 'back', 'wrist', 'noJump', 'preg', 'heartd', 'bp'],
    cues: ['Squat down and place hands on the floor', 'Jump feet back to a plank', 'Jump feet in and explode up, arms overhead'], mistake: 'Sagging hips in the plank', breath: 'Breathe out on the jump',
    frames: [p(STAND, {}, { ax: 'hip' }), [-40, 90, 90, 90, 90, 10, 120, 10, 120, { ax: 'hand' }], p(PLANK, {}, { ax: 'hand' }), [-40, 90, 90, 90, 90, 10, 120, 10, 120, { ax: 'hand' }], p(STAND, { 1: -95, 2: -95, 3: -85, 4: -85 }, { ax: 'hip', lift: 14 })], ms: 420, easier: 'squat' },
  { id: 'squatjump', name: 'Squat jumps', areas: ['thighs', 'glutes', 'full'], lvl: 3, kind: 'reps', base: [8, 12, 15], met: 8.5, cat: 'cardio', avoid: ['knee', 'noJump', 'preg', 'heartd'],
    cues: ['Lower into a squat, arms forward', 'Explode up and jump', 'Land softly back into the squat'], mistake: 'Knees caving inward on landing', breath: 'Breathe out as you jump',
    frames: [[-55, 5, 5, 5, 5, 15, 115, 15, 115, { ax: 'foot' }], p(STAND, { 1: -95, 2: -95, 3: -85, 4: -85 }, { ax: 'foot', lift: 16 })], ms: 450, easier: 'squat' },

  /* ---------- legs & glutes ---------- */
  { id: 'squat', name: 'Bodyweight squat', areas: ['thighs', 'glutes', 'full'], lvl: 1, kind: 'reps', base: [10, 15, 20], met: 5, cat: 'legs', avoid: [],
    cues: ['Feet shoulder-width, toes slightly out', 'Sit hips back and down like into a chair', 'Push through heels to stand tall'], mistake: 'Heels lifting or knees caving in', breath: 'Breathe in going down, out coming up',
    frames: [p(STAND, {}, { ax: 'foot' }), [-55, 5, 5, 5, 5, 15, 115, 15, 115, { ax: 'foot' }]], ms: 900, harder: 'squatjump', easier: 'chairsquat' },
  { id: 'chairsquat', name: 'Chair sit-to-stand', areas: ['thighs', 'glutes'], lvl: 1, kind: 'reps', base: [8, 12, 15], met: 4, cat: 'legs', avoid: [], equip: 'chair',
    cues: ['Sit on the front half of a chair', 'Lean forward slightly and stand up without using hands', 'Sit back down slowly'], mistake: 'Dropping down fast', breath: 'Breathe out as you stand',
    frames: [[-70, 0, 0, 0, 0, 0, 95, 0, 95, { ax: 'foot', prop: 'chairL' }], p(STAND, { 1: 0, 2: 0, 3: 0, 4: 0 }, { ax: 'foot', prop: 'chairL' })], ms: 1100, harder: 'squat' },
  { id: 'sumo', name: 'Sumo squat', areas: ['thighs', 'glutes'], lvl: 1, kind: 'reps', base: [10, 15, 20], met: 5, cat: 'legs', avoid: [],
    cues: ['Wide stance, toes turned out', 'Hands together at chest', 'Lower straight down, knees track over toes'], mistake: 'Leaning forward', breath: 'In on the way down, out on the way up',
    frames: [p(STAND, { 1: 60, 2: -60, 3: 60, 4: -60 }, { ax: 'foot' }), [-80, 60, -60, 60, -60, 25, 110, 25, 110, { ax: 'foot' }]], ms: 900 },
  { id: 'lunge', name: 'Reverse lunge', areas: ['thighs', 'glutes'], lvl: 2, kind: 'reps', base: [8, 12, 16], met: 5.5, cat: 'legs', avoid: ['knee'],
    cues: ['Step one foot back', 'Lower until both knees bend about 90°', 'Push through the front heel to return; alternate'], mistake: 'Front knee shooting past toes', breath: 'In going down, out coming up',
    frames: [p(STAND, { 1: 120, 2: 20, 3: 120, 4: 20 }, { ax: 'foot' }), [-90, 120, 20, 120, 20, 5, 90, 115, 178, { ax: 'foot' }]], ms: 900, easier: 'splitsquat' },
  { id: 'splitsquat', name: 'Split squat (static)', areas: ['thighs', 'glutes'], lvl: 1, kind: 'reps', base: [8, 10, 14], met: 5, cat: 'legs', avoid: ['knee'],
    cues: ['Stand in a long stride', 'Lower your back knee towards the floor', 'Rise up, repeat, then switch legs'], mistake: 'Torso leaning forward', breath: 'In down, out up',
    frames: [[-90, 120, 20, 120, 20, 40, 95, 120, 150, { ax: 'foot' }], [-90, 120, 20, 120, 20, 8, 90, 112, 176, { ax: 'foot' }]], ms: 900, harder: 'lunge' },
  { id: 'bridge', name: 'Glute bridge', areas: ['glutes', 'back', 'thighs'], lvl: 1, kind: 'reps', base: [12, 15, 20], met: 3.5, cat: 'legs', avoid: ['preg'],
    cues: ['Lie on your back, knees bent, feet flat', 'Squeeze glutes and lift hips up', 'Pause at the top, lower slowly'], mistake: 'Arching the lower back', breath: 'Breathe out as you lift',
    frames: [[180, 0, 0, 0, 0, -50, 72, -50, 72, { ax: 'head' }], [162, 0, 0, 0, 0, -12, 92, -12, 92, { ax: 'head' }]], ms: 900, harder: 'slbridge' },
  { id: 'slbridge', name: 'Single-leg glute bridge', areas: ['glutes', 'back'], lvl: 3, kind: 'reps', base: [6, 10, 12], met: 4, cat: 'legs', avoid: ['preg', 'back'],
    cues: ['Bridge position, lift one leg straight', 'Drive through the planted heel', 'Keep hips level; switch sides'], mistake: 'Hips tilting', breath: 'Out on the lift',
    frames: [[180, 0, 0, 0, 0, -50, 72, -40, -40, { ax: 'head' }], [162, 0, 0, 0, 0, -12, 92, -15, -15, { ax: 'head' }]], ms: 900, easier: 'bridge' },
  { id: 'donkey', name: 'Donkey kicks', areas: ['glutes'], lvl: 1, kind: 'reps', base: [10, 15, 20], met: 3.5, cat: 'legs', avoid: ['wrist'],
    cues: ['On hands and knees', 'Keep the knee bent and kick the foot up to the ceiling', 'Squeeze the glute; switch sides after reps'], mistake: 'Arching the lower back', breath: 'Out as you kick',
    frames: [p(TABLE, {}, { ax: 'hand' }), p(TABLE, { 5: 195, 6: -90 }, { ax: 'hand' })], ms: 700 },
  { id: 'wallsit', name: 'Wall sit', areas: ['thighs'], lvl: 2, kind: 'time', base: [20, 40, 60], met: 4, cat: 'legs', avoid: ['knee', 'bp', 'heartd'], equip: 'wall',
    cues: ['Back flat against a wall', 'Slide down until knees are at 90°', 'Hold; keep breathing'], mistake: 'Holding your breath', breath: 'Keep breathing slowly — never hold it',
    frames: [[-90, 90, 90, 90, 90, 0, 90, 0, 90, { ax: 'hip', prop: 'wallL' }], [-91, 88, 92, 88, 92, 0, 90, 0, 90, { ax: 'hip', prop: 'wallL' }]], ms: 1200 },
  { id: 'calf', name: 'Calf raises', areas: ['thighs'], lvl: 1, kind: 'reps', base: [15, 20, 25], met: 3, cat: 'legs', avoid: [],
    cues: ['Stand tall, hold a wall for balance if needed', 'Rise onto your toes', 'Lower slowly'], mistake: 'Bouncing', breath: 'Out on the rise',
    frames: [p(STAND, {}, { ax: 'foot' }), p(STAND, {}, { ax: 'foot', lift: 7 })], ms: 700 },
  { id: 'stepup', name: 'Chair step-ups', areas: ['thighs', 'glutes', 'full'], lvl: 2, kind: 'reps', base: [8, 12, 16], met: 6, cat: 'legs', avoid: ['knee'], equip: 'chair',
    cues: ['Use a stable, low chair or step', 'Step up with one foot, press through the heel', 'Step down with control; alternate legs'], mistake: 'Pushing off the bottom foot', breath: 'Out as you step up',
    frames: [[-88, 100, 80, 70, 70, 25, 100, 90, 90, { ax: 'hip', prop: 'boxR' }], p(STAND, {}, { ax: 'hip', lift: 22, prop: 'boxR' })], ms: 900 },

  /* ---------- chest, arms, shoulders ---------- */
  { id: 'wallpush', name: 'Wall push-up', areas: ['chest', 'arms'], lvl: 1, kind: 'reps', base: [10, 15, 20], met: 3.5, cat: 'upper', avoid: [], equip: 'wall',
    cues: ['Hands on a wall at chest height', 'Bend elbows to bring chest to the wall', 'Push back to straight arms'], mistake: 'Hips sagging', breath: 'In going in, out pushing away',
    frames: [[-70, 0, 0, 0, 0, 105, 105, 105, 105, { ax: 'foot', prop: 'wallR' }], [-55, 70, -50, 70, -50, 108, 108, 108, 108, { ax: 'foot', prop: 'wallR' }]], ms: 900, harder: 'kneepush' },
  { id: 'kneepush', name: 'Knee push-up', areas: ['chest', 'arms', 'shoulders'], lvl: 1, kind: 'reps', base: [6, 10, 15], met: 4, cat: 'upper', avoid: ['wrist'],
    cues: ['Hands under shoulders, knees on the floor', 'Lower chest towards the floor, elbows at 45°', 'Push back up in one straight line'], mistake: 'Bottom sticking up', breath: 'In down, out up',
    frames: [[-25, 90, 90, 90, 90, 160, 180, 160, 180, { ax: 'hand' }], [-3, 168, 62, 168, 62, 172, 182, 172, 182, { ax: 'hand' }]], ms: 900, harder: 'pushup', easier: 'wallpush' },
  { id: 'pushup', name: 'Push-up', areas: ['chest', 'arms', 'shoulders', 'belly'], lvl: 2, kind: 'reps', base: [5, 10, 20], met: 5, cat: 'upper', avoid: ['wrist', 'shoulder'],
    cues: ['High plank, hands slightly wider than shoulders', 'Lower your chest to just above the floor', 'Press up, body stays straight'], mistake: 'Hips dropping or flaring elbows wide', breath: 'In down, out up',
    frames: [p(PLANK, {}, { ax: 'hand' }), [0, 168, 62, 168, 62, 178, 178, 178, 178, { ax: 'hand' }]], ms: 900, harder: 'diamond', easier: 'kneepush' },
  { id: 'diamond', name: 'Diamond push-up', areas: ['arms', 'chest'], lvl: 3, kind: 'reps', base: [4, 8, 15], met: 6, cat: 'upper', avoid: ['wrist', 'shoulder'],
    cues: ['Hands together under your chest, thumbs and index fingers touching', 'Lower with elbows close to your body', 'Press back up'], mistake: 'Elbows flaring out', breath: 'In down, out up',
    frames: [p(PLANK, { 1: 95, 2: 95, 3: 95, 4: 95 }, { ax: 'hand' }), [0, 172, 58, 172, 58, 178, 178, 178, 178, { ax: 'hand' }]], ms: 1000, easier: 'pushup' },
  { id: 'inclinepush', name: 'Incline push-up (chair)', areas: ['chest', 'arms'], lvl: 1, kind: 'reps', base: [8, 12, 15], met: 4, cat: 'upper', avoid: ['wrist'], equip: 'chair',
    cues: ['Hands on the seat of a chair braced against a wall', 'Lower chest to the edge', 'Push back up, body straight'], mistake: 'Chair slipping — brace it first', breath: 'In down, out up',
    frames: [[-35, 70, 70, 70, 70, 150, 150, 150, 150, { ax: 'foot', prop: 'boxR' }], [-20, 150, 30, 150, 30, 160, 160, 160, 160, { ax: 'foot', prop: 'boxR' }]], ms: 900, harder: 'pushup' },
  { id: 'dips', name: 'Chair dips', areas: ['arms', 'shoulders'], lvl: 2, kind: 'reps', base: [6, 10, 15], met: 4.5, cat: 'upper', avoid: ['shoulder', 'wrist'], equip: 'chair',
    cues: ['Hands on the chair edge behind you, fingers forward', 'Bend elbows to lower your hips', 'Press back up without locking elbows'], mistake: 'Shoulders shrugging up to ears', breath: 'In down, out up',
    frames: [[-90, 100, 90, 100, 90, 0, 90, 0, 90, { ax: 'hand', prop: 'boxL' }], [-85, 200, 75, 200, 75, -15, 75, -15, 75, { ax: 'hand', prop: 'boxL' }]], ms: 900 },
  { id: 'pikepush', name: 'Pike push-up', areas: ['shoulders', 'arms'], lvl: 3, kind: 'reps', base: [4, 8, 12], met: 5.5, cat: 'upper', avoid: ['shoulder', 'wrist', 'bp', 'heartd', 'preg'],
    cues: ['Hips high in an upside-down V', 'Bend elbows to lower the top of your head towards the floor', 'Press back up'], mistake: 'Head-down too long if you feel dizzy', breath: 'In down, out up',
    frames: [[55, 90, 90, 90, 90, 125, 125, 125, 125, { ax: 'hand' }], [65, 165, 60, 165, 60, 128, 128, 128, 128, { ax: 'hand' }]], ms: 1000 },
  { id: 'curls', name: 'Bottle biceps curls', areas: ['arms'], lvl: 1, kind: 'reps', base: [10, 15, 20], met: 3, cat: 'upper', avoid: [], equip: 'weights',
    cues: ['Hold a dumbbell or filled 1-litre bottle in each hand', 'Elbows tucked at your sides, curl up', 'Lower slowly'], mistake: 'Swinging the body', breath: 'Out on the curl',
    frames: [p(STAND, { 1: 92, 2: 92, 3: 92, 4: 92 }, { ax: 'foot', prop: 'db' }), p(STAND, { 1: 95, 2: -70, 3: 95, 4: -70 }, { ax: 'foot', prop: 'db' })], ms: 900 },
  { id: 'press', name: 'Overhead press (bottles)', areas: ['shoulders', 'arms'], lvl: 2, kind: 'reps', base: [10, 12, 15], met: 3.5, cat: 'upper', avoid: ['shoulder', 'bp'], equip: 'weights',
    cues: ['Weights at shoulder height, palms forward', 'Press straight overhead', 'Lower back to shoulders'], mistake: 'Arching the lower back', breath: 'Out on the press',
    frames: [p(STAND, { 1: 15, 2: -85, 3: 15, 4: -85 }, { ax: 'foot', prop: 'db' }), p(STAND, { 1: -88, 2: -90, 3: -88, 4: -90 }, { ax: 'foot', prop: 'db' })], ms: 900 },
  { id: 'rows', name: 'Bent-over rows (bottles)', areas: ['back', 'arms'], lvl: 2, kind: 'reps', base: [10, 12, 15], met: 3.5, cat: 'upper', avoid: ['back'], equip: 'weights',
    cues: ['Hinge at the hips, back flat', 'Pull weights to your ribs, squeezing shoulder blades', 'Lower with control'], mistake: 'Rounding the back', breath: 'Out on the pull',
    frames: [[-30, 90, 90, 90, 90, 98, 88, 98, 88, { ax: 'foot', prop: 'db' }], [-30, 165, 90, 165, 90, 98, 88, 98, 88, { ax: 'foot', prop: 'db' }]], ms: 900 },

  /* ---------- core ---------- */
  { id: 'plank', name: 'Forearm plank', areas: ['belly', 'back', 'shoulders'], lvl: 1, kind: 'time', base: [20, 40, 60], met: 3.5, cat: 'core', avoid: ['bp', 'preg'],
    cues: ['Elbows under shoulders, forearms on the floor', 'Body in a straight line from head to heels', 'Squeeze glutes and brace your belly'], mistake: 'Hips sagging or piking up', breath: 'Keep breathing — don\'t hold your breath',
    frames: [[-6, 90, 0, 90, 0, 176, 176, 176, 176, { ax: 'hand' }], [-7, 90, 0, 90, 0, 175, 176, 175, 176, { ax: 'hand' }]], ms: 1200, easier: 'kneeplank' },
  { id: 'kneeplank', name: 'Knee plank', areas: ['belly'], lvl: 1, kind: 'time', base: [15, 25, 40], met: 3, cat: 'core', avoid: ['preg'],
    cues: ['Forearms down, knees on the floor', 'Straight line from head to knees', 'Brace your belly'], mistake: 'Bottom sticking up', breath: 'Breathe steadily',
    frames: [[-15, 90, 0, 90, 0, 165, 180, 165, 180, { ax: 'hand' }], [-16, 90, 0, 90, 0, 164, 180, 164, 180, { ax: 'hand' }]], ms: 1200, harder: 'plank' },
  { id: 'taps', name: 'Plank shoulder taps', areas: ['belly', 'shoulders', 'arms'], lvl: 2, kind: 'reps', base: [10, 16, 24], met: 4.5, cat: 'core', avoid: ['wrist', 'shoulder', 'preg'],
    cues: ['High plank, feet a little wider', 'Tap the opposite shoulder with one hand', 'Keep hips still; alternate'], mistake: 'Hips rocking side to side', breath: 'Steady breathing',
    frames: [p(PLANK, {}, { ax: 'hand' }), p(PLANK, { 1: 10, 2: 175 }, { ax: 'hand' })], ms: 600 },
  { id: 'crunch', name: 'Crunches', areas: ['belly'], lvl: 1, kind: 'reps', base: [10, 15, 25], met: 3.5, cat: 'core', avoid: ['back', 'preg'],
    cues: ['On your back, knees bent', 'Curl shoulders off the floor towards your knees', 'Lower slowly; don\'t pull on your neck'], mistake: 'Yanking the head forward', breath: 'Out as you curl up',
    frames: [p(BACK, { 1: -25, 2: -25, 3: -25, 4: -25 }, { ax: 'hip' }), p(BACK, { 0: 205, 1: -20, 2: -20, 3: -20, 4: -20 }, { ax: 'hip' })], ms: 800, harder: 'bicycle' },
  { id: 'bicycle', name: 'Bicycle crunches', areas: ['belly'], lvl: 2, kind: 'reps', base: [12, 20, 30], met: 4.5, cat: 'core', avoid: ['back', 'preg'],
    cues: ['Hands lightly behind head, shoulders lifted', 'Bring one knee in as the opposite elbow turns to meet it', 'Extend the other leg; alternate'], mistake: 'Rushing the movement', breath: 'Out on each twist',
    frames: [[205, -150, 20, -150, 20, -60, 20, -12, -12, { ax: 'hip' }], [205, -150, 20, -150, 20, -12, -12, -60, 20, { ax: 'hip' }]], ms: 600, easier: 'crunch' },
  { id: 'legraise', name: 'Leg raises', areas: ['belly'], lvl: 2, kind: 'reps', base: [8, 12, 16], met: 4, cat: 'core', avoid: ['back', 'preg'],
    cues: ['Lie flat, hands under your hips', 'Raise straight legs to vertical', 'Lower slowly without touching the floor'], mistake: 'Lower back lifting off the floor', breath: 'Out as legs rise',
    frames: [[180, 0, 0, 0, 0, -8, -8, -8, -8, { ax: 'head' }], [180, 0, 0, 0, 0, -85, -85, -85, -85, { ax: 'head' }]], ms: 1000 },
  { id: 'flutter', name: 'Flutter kicks', areas: ['belly'], lvl: 2, kind: 'time', base: [20, 30, 40], met: 4, cat: 'core', avoid: ['back', 'preg'],
    cues: ['Lie flat, legs straight and just off the floor', 'Kick legs up and down in small fast movements', 'Press lower back into the floor'], mistake: 'Arching the back', breath: 'Steady breaths',
    frames: [[180, 0, 0, 0, 0, -25, -25, -8, -8, { ax: 'head' }], [180, 0, 0, 0, 0, -8, -8, -25, -25, { ax: 'head' }]], ms: 300 },
  { id: 'deadbug', name: 'Dead bug', areas: ['belly', 'back'], lvl: 1, kind: 'reps', base: [8, 12, 16], met: 3, cat: 'core', avoid: ['preg'],
    cues: ['On your back, arms to the ceiling, knees bent at 90° in the air', 'Lower opposite arm and leg slowly', 'Return and switch sides'], mistake: 'Back arching off the floor', breath: 'Out as you extend',
    frames: [[180, -90, -90, -90, -90, -90, 0, -90, 0, { ax: 'hip' }], [180, 188, 188, -90, -90, -90, 0, -12, -12, { ax: 'hip' }]], ms: 900 },
  { id: 'twist', name: 'Russian twists', areas: ['belly'], lvl: 2, kind: 'reps', base: [12, 20, 30], met: 4, cat: 'core', avoid: ['back', 'preg'],
    cues: ['Sit, lean back slightly, feet on the floor (or lifted)', 'Rotate your chest side to side', 'Move from the waist, not just the arms'], mistake: 'Rounding the back', breath: 'Out on each turn',
    frames: [[-125, 30, 0, -10, -10, -40, 60, -40, 60, { ax: 'hip' }], [-125, -10, -10, 30, 0, -40, 60, -40, 60, { ax: 'hip' }]], ms: 600 },
  { id: 'birddog', name: 'Bird dog', areas: ['back', 'belly', 'glutes'], lvl: 1, kind: 'reps', base: [8, 12, 16], met: 3, cat: 'core', avoid: ['wrist'],
    cues: ['On hands and knees', 'Reach one arm forward and the opposite leg back', 'Pause, return, switch sides'], mistake: 'Twisting the hips', breath: 'Out as you reach',
    frames: [p(TABLE, {}, { ax: 'hand' }), p(TABLE, { 1: -5, 2: -5, 7: 180, 8: 180 }, { ax: 'hand' })], ms: 1000 },
  { id: 'superman', name: 'Superman', areas: ['back', 'glutes'], lvl: 1, kind: 'reps', base: [8, 12, 15], met: 3, cat: 'core', avoid: ['back', 'preg'],
    cues: ['Lie face down, arms forward', 'Lift arms, chest and legs a few centimetres', 'Hold 2 seconds, lower'], mistake: 'Cranking the neck up', breath: 'Out as you lift',
    frames: [p(PRONE, {}, { ax: 'hip' }), p(PRONE, { 0: -14, 1: -18, 2: -18, 3: -18, 4: -18, 5: 192, 6: 192, 7: 192, 8: 192 }, { ax: 'hip' })], ms: 1000 },
  { id: 'snowangel', name: 'Reverse snow angels', areas: ['back', 'shoulders'], lvl: 1, kind: 'reps', base: [8, 12, 15], met: 3, cat: 'core', avoid: ['preg'],
    cues: ['Lie face down, arms by your sides, palms down', 'Lift arms slightly and sweep them overhead', 'Sweep back down; keep them off the floor'], mistake: 'Shrugging the shoulders', breath: 'Slow and steady',
    frames: [p(PRONE, { 0: -6, 1: 178, 2: 178, 3: 178, 4: 178 }, { ax: 'hip' }), p(PRONE, { 0: -6, 1: -8, 2: -8, 3: -8, 4: -8 }, { ax: 'hip' })], ms: 1200 },

  /* ---------- mobility / cool-down ---------- */
  { id: 'catcow', name: 'Cat–cow', areas: ['back', 'flex'], lvl: 1, kind: 'time', base: [30, 30, 40], met: 2.3, cat: 'stretch', avoid: ['wrist'],
    cues: ['On hands and knees', 'Round your back up like a cat, chin to chest', 'Then drop your belly and lift your chest'], mistake: 'Moving too fast', breath: 'In for cow, out for cat',
    frames: [p(TABLE, { 0: -12 }, { ax: 'hand' }), p(TABLE, { 0: 10 }, { ax: 'hand' })], ms: 1500 },
  { id: 'hamstring', name: 'Seated hamstring stretch', areas: ['flex', 'thighs'], lvl: 1, kind: 'time', base: [30, 30, 40], met: 2.3, cat: 'stretch', avoid: [],
    cues: ['Sit with legs straight out', 'Hinge forward from the hips', 'Reach towards your toes and hold'], mistake: 'Bouncing', breath: 'Breathe out to sink deeper',
    frames: [[-90, 30, 20, 30, 20, 0, 0, 0, 0, { ax: 'hip' }], [-25, 0, 0, 0, 0, 0, 0, 0, 0, { ax: 'hip' }]], ms: 2200 },
  { id: 'child', name: 'Child\'s pose', areas: ['flex', 'back'], lvl: 1, kind: 'time', base: [30, 40, 45], met: 2, cat: 'stretch', avoid: [],
    cues: ['Kneel, sit back on your heels', 'Fold forward, arms stretched ahead', 'Rest your forehead down and relax'], mistake: 'Tensing the shoulders', breath: 'Slow belly breaths',
    frames: [[22, 8, 0, 8, 0, 42, 180, 42, 180, { ax: 'hip' }], [30, 10, 0, 10, 0, 46, 180, 46, 180, { ax: 'hip' }]], ms: 2000 },
  { id: 'cobra', name: 'Cobra stretch', areas: ['flex', 'back', 'belly'], lvl: 1, kind: 'time', base: [20, 30, 30], met: 2, cat: 'stretch', avoid: ['back', 'preg'],
    cues: ['Lie face down, hands under shoulders', 'Gently press your chest up, hips stay down', 'Hold and breathe'], mistake: 'Shrugging into your ears', breath: 'Breathe into your belly',
    frames: [p(PRONE, { 0: -5, 1: 165, 2: 60, 3: 165, 4: 60 }, { ax: 'hip' }), p(PRONE, { 0: -32, 1: 100, 2: 90, 3: 100, 4: 90 }, { ax: 'hip' })], ms: 2000 },
  { id: 'hipflexor', name: 'Kneeling hip-flexor stretch', areas: ['flex', 'glutes', 'thighs'], lvl: 1, kind: 'time', base: [30, 30, 40], met: 2, cat: 'stretch', avoid: ['knee'],
    cues: ['Kneel on one knee, other foot in front', 'Tuck your pelvis and shift hips forward', 'Hold, then switch sides'], mistake: 'Arching the lower back', breath: 'Breathe slowly',
    frames: [[-90, 120, 20, 120, 20, 5, 90, 110, 180, { ax: 'foot' }], [-92, 120, 20, 120, 20, -5, 100, 120, 180, { ax: 'foot' }]], ms: 2000 },
  { id: 'quad', name: 'Standing quad stretch', areas: ['flex', 'thighs'], lvl: 1, kind: 'time', base: [30, 30, 30], met: 2, cat: 'stretch', avoid: [],
    cues: ['Stand tall, hold a wall for balance', 'Pull one heel towards your glute', 'Knees together; hold, then switch'], mistake: 'Leaning forward', breath: 'Relaxed breathing',
    frames: [p(STAND, { 1: 120, 2: 100, 5: 92, 6: 245 }, { ax: 'hip' }), p(STAND, { 1: 122, 2: 100, 5: 95, 6: 248 }, { ax: 'hip' })], ms: 2000 },
  { id: 'chest', name: 'Doorway chest stretch', areas: ['flex', 'chest', 'shoulders'], lvl: 1, kind: 'time', base: [30, 30, 30], met: 2, cat: 'stretch', avoid: [],
    cues: ['Forearm on a door frame or wall, elbow at shoulder height', 'Step forward gently until you feel the chest open', 'Hold, then switch sides'], mistake: 'Pushing into pain', breath: 'Slow breaths',
    frames: [p(STAND, { 1: 180, 2: -90 }, { ax: 'foot' }), p(STAND, { 0: -85, 1: 185, 2: -90 }, { ax: 'foot' })], ms: 2000 },
  { id: 'neck', name: 'Neck & shoulder rolls', areas: ['flex', 'shoulders'], lvl: 1, kind: 'time', base: [30, 30, 30], met: 2, cat: 'stretch', avoid: [],
    cues: ['Sit or stand tall', 'Roll shoulders slowly back 5 times, then forward', 'Gently tilt ear to shoulder each side'], mistake: 'Rolling the neck in full circles fast', breath: 'Breathe slowly',
    frames: [p(STAND, { 1: 80, 3: 80 }, { ax: 'foot' }), p(STAND, { 1: 95, 3: 95 }, { ax: 'foot', lift: 0 })], ms: 1400 }
];
const EXI = Object.fromEntries(EX.map(e => [e.id, e]));

/* Quick, ready-made workouts. */
const QUICK = [
  { id: 'q7', name: '7-minute full body', mins: 7, list: ['jacks', 'wallsit', 'pushup', 'crunch', 'stepup', 'squat', 'dips', 'plank', 'highknees', 'lunge', 'taps', 'bridge'], work: 30, rest: 5, desc: 'The classic quick circuit — 12 moves, 30 s each.' },
  { id: 'qabs', name: '10-min belly blast', mins: 10, list: ['crunch', 'bicycle', 'legraise', 'plank', 'flutter', 'deadbug', 'twist', 'climbers'], work: 40, rest: 20, rounds: 1, desc: 'Core moves for a flatter, stronger midsection.' },
  { id: 'qcardio', name: '15-min fat burn (no jump)', mins: 15, list: ['march', 'boxing', 'stepjacks', 'squat', 'boxing', 'chairsquat', 'march', 'stepjacks'], work: 45, rest: 15, rounds: 2, desc: 'Low-impact cardio, apartment-friendly.' },
  { id: 'qmorning', name: 'Morning mobility', mins: 8, list: ['neck', 'armcircles', 'catcow', 'hipflexor', 'hamstring', 'child'], work: 45, rest: 10, desc: 'Wake up stiff joints gently.' },
  { id: 'qdesk', name: 'Desk-break reset', mins: 5, list: ['neck', 'chest', 'quad', 'calf', 'chairsquat'], work: 40, rest: 10, desc: 'For long hours at a desk or control room.' },
  { id: 'qglutes', name: '12-min glutes & thighs', mins: 12, list: ['squat', 'bridge', 'donkey', 'sumo', 'splitsquat', 'calf'], work: 40, rest: 20, rounds: 2, desc: 'Shape and strengthen the lower body.' }
];

/* 30-day challenges: target for day n (1-based). */
const CHALLENGES = [
  { id: 'plank30', name: '30-day plank', ex: 'plank', unit: 's', target: n => 20 + Math.floor((n - 1) / 3) * 10 - (n % 7 === 0 ? 10 : 0), desc: 'From 20 s to over 2 minutes.' },
  { id: 'squat30', name: '30-day squat', ex: 'squat', unit: 'reps', target: n => 15 + (n - 1) * 3 - (n % 7 === 0 ? 10 : 0), desc: 'Build strong legs and glutes.' },
  { id: 'push30', name: '30-day push-up', ex: 'kneepush', unit: 'reps', target: n => 5 + Math.floor((n - 1) * 0.8) - (n % 7 === 0 ? 3 : 0), desc: 'Knee push-ups → full push-ups by day 30.' },
  { id: 'walk30', name: '30-day steps', ex: 'march', unit: 'steps', target: n => 5000 + (n - 1) * 150, desc: 'Grow daily steps to ~9,500 (uses your watch if linked).' }
];

/* Session focus templates (exercise categories + areas). */
const FOCUS_DAYS = {
  lower: { short: 'Legs', name: 'Legs & glutes', areas: ['thighs', 'glutes'] },
  upper: { short: 'Upper', name: 'Arms, chest & back', areas: ['arms', 'chest', 'back', 'shoulders'] },
  core: { short: 'Core', name: 'Belly & core', areas: ['belly', 'back'] },
  full: { short: 'Full', name: 'Full-body burn', areas: ['full', 'thighs', 'chest', 'belly'] },
  mobility: { short: 'Stretch', name: 'Mobility & stretch', areas: ['flex', 'back'] }
};
