# Care Me — diet & calorie companion

Care Me is an Android app for Indian and international food. You photograph a meal, and the AI lists every dish with its calories, protein, carbs, fat, sugar, fibre and sodium. It then checks the meal against your goal and health conditions. Around that sits a complete diet routine: personal targets, diet plans, a "can I eat this?" checker, weight, blood sugar and BP tracking, fitness-device sync and reminders.

## Install on your phone

1. Open **Releases** (right side of this repo page) and pick the latest **Care Me v1.0.x**.
2. Download `CareMe-v1.0.x.apk` on your Android phone (Android 8.0 or newer) and open it.
3. Allow "Install unknown apps" for your browser when Android asks.
4. Future versions install over the old one, and your data is kept.

Every push to `main` builds a new APK automatically (**Actions** tab → *Build Care Me APK*, about 6–10 minutes).

## First-time setup in the app (about 2 minutes)

1. **About you:** age, sex, height, weight, target weight, activity.
2. **Goal:** weight loss / fat loss / maintain / weight gain / muscle gain, plus focus areas: sugar cut, low salt, high protein, high fibre, low carb, heart healthy, digestion, energy, skin & hair.
3. **Health & diagnosis:** diabetes (type 1/2, prediabetes), BP, cholesterol, heart disease, thyroid, PCOS, fatty liver, kidney disease, gout, acidity, IBS, anaemia, vitamin D/B12, lactose/gluten intolerance, pregnancy, breastfeeding. Also allergies, medicines, HbA1c, fasting sugar, BP and your doctor's diet advice.
4. **Food preferences:** veg / non-veg / eggetarian / vegan / Jain, home cuisine, foods you dislike.
5. **Connect:** AI key and fitness device (both optional, and can be done later in Profile).

### AI key

- **Google Gemini (free tier):** https://aistudio.google.com/apikey → *Create API key*.
- **Anthropic Claude (paid):** https://console.anthropic.com.

Paste the key in **Profile → AI engine** and tap **Test connection**. Leave *Model* empty to use the default; type a newer model name there later if the default is retired.

### Fitness devices

Care Me reads data through **Health Connect**, Android's health hub. First, in your device's app (Fitbit, Samsung Health, Mi Fitness, Zepp/Amazfit, NoiseFit, boAt Crest, Fire-Boltt, Garmin Connect, Withings, Omron, Accu-Chek…), turn on **sync with Health Connect**. Then in Care Me go to **Profile → Fitness devices → Link**. On Android 13 and older, install *Health Connect* from the Play Store first.

What it reads: steps, active calories, heart rate / resting HR, sleep, workouts, distance, weight, blood glucose, blood pressure.
What it writes (optional): meal calories and logged weight.

## Features

| Screen | What you get |
|---|---|
| **Today** | Calorie ring against your budget (can include half of your exercise calories), protein/carbs/fat, sugar/sodium/fibre limits, smart insights (e.g. "sugar over limit", "protein low"), activity from your watch, fasting timer, water tracker, today's meals, logging streak |
| **Scan** | Live camera with flash and front/back switch, or pick from gallery. Each dish gets a veg/non-veg mark, GI rating, warnings for you (allergy, high GI for diabetes, not in your diet), a 1–10 *fit for your goal* score and a tip. Edit quantities, add missed dishes by name, re-log frequent meals with one tap |
| **Plan** | "Can I eat this?" (yes / in moderation / avoid, with a portion and better options). AI diet plan for 1 or 7 days in your home cuisine, with *Log* buttons, tips and a shopping list. Food guide for each of your conditions |
| **Progress** | Weight chart with target line and time-to-goal, blood sugar and BP log with high/low alerts, weekly stats, AI weekly review, full food diary |
| **Profile** | Daily targets with the reason behind each one, editable profile, fitness devices, reminders (meals, water, weekly weigh-in), AI engine, CSV export, delete all data |

### How targets are calculated

- Calories: Mifflin-St Jeor BMR × activity, then ±250–500 kcal for your goal and pace. Never below 1,200 (women) or 1,500 (men). No deficit during pregnancy or breastfeeding, or if your BMI is under 18.5.
- Protein: 1.0 g/kg by default, 1.6 for fat loss, 1.8 for muscle gain, 1.5 with the high-protein focus. Capped at 0.8 g/kg for kidney disease.
- Carbs: capped at 45% of calories for diabetes, prediabetes, PCOS and fatty liver, and 30% for low carb.
- Added sugar: at most 10% of calories, or 5% for sugar cut, diabetes, PCOS and fatty liver.
- Sodium: 2,000 mg, or 1,500 mg for low salt, BP, heart disease and kidney disease.
- Fibre: at least 25–35 g.
- A fixed calorie target from your doctor overrides the calculation.

## Privacy

All data stays on the phone. Photos and (if you allow it) your goals and conditions go only to the AI provider you choose. Your name is never sent. See `www/privacypolicy.html`, which Health Connect also shows.

**Disclaimer:** Care Me gives general nutrition guidance. It is not a medical device. Always follow your doctor's or dietitian's advice.

## Developer notes

```
www/            the app (HTML/CSS/JS, no build step)
  data.js       goals, conditions, profile form, food guides
  engine.js     target calculation, AI calls and prompts
  app.js        screens and logic
capacitor.config.json   app id in.sivashankaran.careme, name "Care Me"
tools/patch-android.mjs camera/notification permissions, minSdk 26, signing, version numbers
tools/make_icons.py     launcher icon and splash screen
tools/debug.keystore.b64 shared SIDELOAD signing key (debug-type, password "android"), created by the first build
.github/workflows/build-apk.yml  builds the APK and publishes a GitHub Release
```

The `android/` folder is not stored in the repo; it is generated on each build. To work locally with Android Studio:

```
npm install
npm run android:setup
npm run open
```

**Google Play:** the sideload key above is public inside this repo, so don't use it for Play. Create a private upload key in Android Studio (*Build → Generate Signed App Bundle*), keep it safe, and upload the `.aab`. Play also requires the Health Connect permission declaration form, a hosted privacy policy URL, and the data-safety form. For a public release, replace users' own API keys with a small server that holds yours.
