# Care Me — diet & fitness companion

Care Me is an Android app for Indian and international food and home fitness. You photograph a meal, and the AI lists every dish with its calories, protein, carbs, fat, sugar, fibre and sodium, then checks it against your goal and health conditions. Around that sit:
- personal targets, diet plans and a "can I eat this?" checker
- home-workout courses from beginner to pro
- weight, blood sugar, BP and body-measurement tracking
- fitness-device sync and reminders

## Install on your phone

1. Open **Releases** (right side of this repo page) and pick the latest **Care Me v1.0.x**.
2. Download `CareMe-v1.0.x.apk` on your Android phone (Android 8.0 or newer) and open it.
3. Allow "Install unknown apps" for your browser when Android asks.
4. Future versions install over the old one, and your data is kept.

Every push to `main` builds a new APK automatically (**Actions** tab → *Build Care Me APK*). If a build fails, its log is saved to the `build-logs` branch.

## First-time setup in the app (about 3 minutes)

1. **Sign in with Google.** This switches on photo analysis, diet plans and food checks. No API key or payment is needed.
2. **About you:** age, sex, height, weight, target weight, activity.
3. **Goal:** weight loss / fat loss / maintain / weight gain / muscle gain, plus focus areas: sugar cut, low salt, high protein, high fibre, low carb, heart healthy, digestion, energy, skin & hair.
4. **Health & diagnosis:** diabetes (type 1/2, prediabetes), BP, cholesterol, heart disease, thyroid, PCOS, fatty liver, kidney disease, gout, acidity, IBS, anaemia, vitamin D/B12, lactose/gluten intolerance, pregnancy, breastfeeding. Also allergies, medicines, HbA1c, fasting sugar, BP and your doctor's diet advice.
5. **Fitness & toning:** level, workout goal, areas to tone, days per week, minutes, home equipment, any pain or limits.
6. **Food preferences:** veg / non-veg / eggetarian / vegan / Jain, home cuisine, foods you dislike.
7. **Connect a device** (optional): watch, band, scale, BP monitor or glucometer via Health Connect.

### How the AI works

- **Phones with built-in Gemini Nano** (Pixel 9/10, Galaxy S25/S26, OnePlus 13/15 and others): quick tasks run privately on the phone.
- **All other phones:** Google Gemini in the cloud through the Care Me Firebase project (free tier), protected by App Check.
- **Profile → Account & AI → Advanced:** use your own Gemini or Claude API key instead. This is only needed on phones without Google Play services.

### Fitness devices

Care Me reads data through **Health Connect**, Android's health hub. First, in your device's app (Fitbit, Samsung Health, Mi Fitness, Zepp/Amazfit, NoiseFit, boAt Crest, Fire-Boltt, Garmin Connect, Withings, Omron, Accu-Chek…), turn on **sync with Health Connect**. Then in Care Me go to **Profile → Fitness devices → Link**.

## Features

| Screen | What you get |
|---|---|
| **Today** | Calorie ring against your budget (can include half of your exercise or workout calories), protein/carbs/fat, sugar/sodium/fibre limits, smart insights, today's workout, activity from your watch, fasting timer, water tracker, today's meals, logging streak |
| **Scan** | Live camera with flash and front/back switch, or pick from gallery. Each dish gets a veg/non-veg mark, GI rating, warnings for you, a 1–10 *fit for your goal* score and a tip. Edit quantities, add missed dishes, re-log frequent meals with one tap |
| **Diet** | "Can I eat this?", AI diet plan for 1 or 7 days in your home cuisine with *Log* buttons, tips and a shopping list, and a food guide for each of your conditions |
| **Workout** | Personalised 4-week home courses (Beginner / Intermediate / Pro) built from the areas you want to tone, your goal, days per week, minutes, home equipment and any pain or health limits. Also includes: <ul><li>a guided player with timers, beeps, voice cues, rest screens and an animated demo figure</li><li>automatic warm-up and cool-down</li><li>weekly progression that adapts to your "too easy / too hard" feedback</li><li>quick workouts and 30-day challenges</li><li>a 45-move exercise library with step-by-step cues and YouTube demo links</li><li>body-measurement tracking</li></ul> |
| **Progress** | Weight chart with target line and time-to-goal, blood sugar and BP log with high/low alerts, weekly stats, AI weekly review (food + workouts), full food diary |
| **Profile** | Daily targets with reasons, editable profile, Account & AI, fitness devices, reminders (meals, water, weigh-in, workouts), CSV export, delete all data |

### How targets are calculated

- Calories: Mifflin-St Jeor BMR × activity, then ±250–500 kcal for your goal and pace. Never below 1,200 (women) or 1,500 (men). No deficit during pregnancy or breastfeeding, or if your BMI is under 18.5.
- Protein: 1.0 g/kg by default, 1.6 for fat loss, 1.8 for muscle gain. Capped at 0.8 g/kg for kidney disease.
- Carbs: capped for diabetes, prediabetes, PCOS and fatty liver (45%), and for low carb (30%).
- Added sugar: at most 10% of calories, or 5% for sugar cut, diabetes, PCOS and fatty liver.
- Sodium: 2,000 mg, or 1,500 mg for low salt, BP, heart disease and kidney disease.
- Fibre: at least 25–35 g.

### Workout safety rules

- Moves that don't suit knee, back, wrist or shoulder pain, high BP, heart disease or pregnancy are removed automatically. Easier moves replace them in quick workouts.
- People aged 60+ and anyone who ticks "no jumping" get no jumping moves.
- Heart disease keeps the intensity at beginner level.
- The app always reminds users to stop if they feel chest pain, dizziness or unusual breathlessness.

## Privacy

All data stays on the phone. Photos and (if you allow it) your goals and conditions go only to Google Gemini when the cloud is used. Your name is never sent. See `www/privacypolicy.html`.

**Disclaimer:** Care Me gives general nutrition and exercise guidance. It is not a medical device. Always follow your doctor's, dietitian's or physiotherapist's advice.

## Developer notes

```
www/               the app (HTML/CSS/JS, no build step)
  fitness-data.js  exercise library (cues, levels, safety flags, demo-figure keyframes), quick workouts, challenges
  data.js          goals, conditions, profile form, food guides
  engine.js        target calculation, AI routing and prompts
  fitness.js       course generator, Workout tab, guided player, demo-figure animator
  app.js           screens and logic
capacitor.config.json      app id in.sivashankaran.careme, name "Care Me"
android-config/            google-services.json (Firebase config)
tools/android/CareAIPlugin.kt  native AI bridge (Gemini Nano on-device / Gemini cloud via Firebase AI Logic)
tools/patch-android.mjs    permissions, minSdk 26, Kotlin 2.3, Firebase, signing, version numbers
tools/make_icons.py        launcher icon and splash (plate + leaf + dumbbell)
tools/debug.keystore.b64   shared SIDELOAD signing key (debug-type, password "android"), created by the first build
.github/workflows/build-apk.yml  builds the APK, publishes a GitHub Release, saves logs on failure
```

The `android/` folder is generated on each build. To work locally: `npm install`, then `npm run android:setup`, then `npm run open`.

**Google Play:** the sideload key above is public, so don't use it for Play. Create a private upload key, then complete the Health Connect declaration, a hosted privacy policy and the data-safety form.
