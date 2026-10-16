> **Working repository: [cmasked/vanya](https://github.com/cmasked/vanya).**
> This full-project branch includes Person 5's voice and offline integration. The complete combined app is on
> [integration/yogya-complete](https://github.com/cmasked/vanya/tree/integration/yogya-complete).
> Read [the working repository guide](docs/WORKING_REPOSITORY.md) before starting.

# Yogya (योग्य) — AI-Powered Opportunity Navigator
**Citi India Hackathon Project**

Welcome to **Yogya**, an AI-powered opportunity navigation platform built to help students across rural and urban India discover verified government scholarships, skill development training programs, youth welfare schemes, and industrial apprenticeships.

---

## 🏗️ Project Architecture & Subsystems

This monorepo contains the core subsystems of the Yogya platform:

```
Yogya-AI-Powered-Oppurtunity-Navigator/
├── yogya-data/             # Component 1: Data extraction, validation & DDL pipeline
│   ├── config/             # Pipeline configuration
│   ├── data/processed/     # 14 verified official government schemes (JSON/CSV)
│   ├── docs/               # Data dictionary, source verification & API contract
│   ├── schemas/            # Pydantic & JSON validation schemas
│   ├── scripts/            # Python automated ingestion pipeline
│   ├── sql/                # PostgreSQL relational database schema
│   └── tests/              # Pytest verification suites
│
└── yogya-mobile/           # Component 3: React Native / Expo mobile application
    ├── assets/             # Branding icons & splash assets
    ├── src/
    │   ├── app/            # Expo Router file-based screens & tab navigation
    │   ├── components/     # Handcrafted SVG illustrations & UI tokens
    │   ├── constants/      # Earth-tone theme palette & typography tokens
    │   ├── context/        # StudentProfile & SavedBookmarks state management
    │   ├── data/           # Verified fallback catalog (NAPS, PMKVY, Begum Hazrat Mahal, etc.)
    │   └── services/       # AsyncStorage persistence & API client
    ├── package.json        # Dependencies (React Native 0.86, Expo SDK 57, React Native SVG)
    └── README.md           # Mobile-specific documentation
```

---

## 📱 How to View and Test the Deployed App on Expo Go

You can run and test the complete Yogya mobile experience on your physical smartphone using the free **Expo Go** app without setting up Android Studio or Xcode.

### Step 1: Install Expo Go on Your Phone
* **Android**: Download [Expo Go from Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
* **iOS**: Download [Expo Go from Apple App Store](https://apps.apple.com/app/expo-go/id982107779)

### Step 2: Start the Development Server
Open your terminal in the `yogya-mobile` directory and run:

```bash
cd yogya-mobile
npm install
npx expo start
```

This will launch the Metro bundler and generate a large interactive **QR Code** in your terminal.

> 💡 **Tunneling (Recommended for different Wi-Fi networks / cellular data):**
> If your smartphone and computer are connected to different Wi-Fi networks, run with the tunnel flag:
> ```bash
> npx expo start --tunnel
> ```

### Step 3: Scan the QR Code on Your Device
* **Android**:
  1. Open the **Expo Go** app.
  2. Tap **"Scan QR code"**.
  3. Scan the QR code shown in your terminal.
* **iOS**:
  1. Open the native **Camera app**.
  2. Point the camera at the terminal QR code.
  3. Tap the yellow **"Open in Expo Go"** banner that appears at the top.
* **Web Browser**:
  * Press <kbd>w</kbd> in your terminal or run `npm run web` to preview in Chrome/Edge/Firefox.

---

## ✨ Mobile Key Features & Testing Guide

Once loaded in Expo Go, you can test all core student flows:

1. **Welcome Screen (`/`)**:
   * Warm ivory (`#F7F4ED`) canvas with bilingual identity (**Yogya** / **योग्य**).
   * Hand-drawn sunrise and seedling SVG illustration.
   * Smart button: shows **"Get Started"** for first-time students or **"Continue to Opportunities"** for returning students with a saved profile.
2. **Multi-Step Onboarding (`/onboarding`)**:
   * 4-step progress tracking with soft sage surfaces.
   * **Language Selection**: English + 7 Indian regional languages (हिंदी, தமிழ், ಕನ್ನಡ, తెలుగు, etc.) with native scripts.
   * **Education Levels**: Visual radio cards with grade badges (`IX`, `X`, `XI`, `XII`, `DIP`, `UG`).
   * **Goals & Interests**: Interactive multi-select interest chips with counter and checkmarks. Category tags sit as clean overline badges that adapt to any screen size.
   * **Review & Confirm**: Summary cards with inline "Edit" links and privacy protection notice (*no Aadhaar or bank account requested*).
3. **Home Dashboard (`/home`)**:
   * Personalized student greeting (*"Namaste, [Name]"*) + monogram avatar.
   * Live/Demo data indicator banner.
   * Instant search field with one-tap clear button.
   * Category filter chips (*All, Scholarships, Govt Schemes, Skill Training, Jobs*).
   * 4 shortcut category cards with compact handcrafted SVG illustrations.
   * Opportunity cards showing title, provider, benefit tag, deadline with calendar icon, and persistent bookmark toggle.
4. **Explore Pathways (`/explore`)**:
   * Deep-dive roadmap cards for Scholarships, Skill Training, Govt Schemes, and Apprenticeships.
   * Key benefits, target audience breakdown, and student guidance callout.
5. **Saved Bookmarks (`/saved`)**:
   * Synchronized in real time with `AsyncStorage` (persists across app restarts).
   * Live badge counter on the bottom navigation tab.
   * Warm empty-state illustration (`SavedEmptyIllustration`) when no items are bookmarked.
   * "Clear All" with confirmation alert.
6. **Student Profile (`/profile`)**:
   * Clean overview of current education, location, goals, and selected interests.
   * "Edit Profile Details" action to update onboarding fields.
7. **Opportunity Details (`/opportunity/[id]`)**:
   * Detailed breakdown: *About*, *Benefits & Financial Support*, *Eligibility Requirements*, *Required Documents*, and *How to Apply* numbered steps.
   * **"Check My Fit"**: Interactive student self-check comparing profile criteria with eligibility rules.
   * Official application portal link with external browser opening.

---

## 🛠️ Data Pipeline & Backend Integration

For data pipeline operations and database administration, refer to the documentation inside `yogya-data/`:

* **Data Pipeline Documentation:** [yogya-data/README.md](yogya-data/README.md)
* **API & Eligibility Contract:** [yogya-data/docs/API_CONTRACT.md](yogya-data/docs/API_CONTRACT.md)
* **Data Dictionary:** [yogya-data/docs/DATA_DICTIONARY.md](yogya-data/docs/DATA_DICTIONARY.md)
* **Source Verification:** [yogya-data/docs/SOURCE_VERIFICATION.md](yogya-data/docs/SOURCE_VERIFICATION.md)
* **PostgreSQL DDL Schema:** [yogya-data/sql/schema.sql](yogya-data/sql/schema.sql)
* **Team Handoff Guide:** [yogya-data/docs/TEAM_HANDOFF.md](yogya-data/docs/TEAM_HANDOFF.md)

### Running Pipeline Tests
```bash
cd yogya-data
python -m pytest tests/ -v
```

