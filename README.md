# 🎴 Chakadi - Indian Card Game (PWA)

A modern, mobile-first, installable Progressive Web App (PWA) implementation of the classic Indian card game **Chakadi**.

Built with a framework-independent core engine, React 19, GSAP card animations, Web Audio sound synthesis, and serverless P2P WebRTC room code multiplayer.

---

## 🌟 Key Features

* **Game Variants:**
  * **6 Players (3v3):** 48-card deck with all four 2s removed (8 cards per player, 8 tricks per hand).
  * **4 Players (2v2):** Full 52-card deck (13 cards per player, 13 tricks per hand).
* **Authentic Indian Rules & Terminology:**
  * **Boli (बोली):** Compulsory opening bid and strictly increasing contract bidding.
  * **Kaat (काट):** Trump suit declaration by the winning declarer.
  * **Hukum (हुकूम):** Spades suit (`♠`).
  * **Gunti (गुंती):** Penalty points accumulated by failing or succeeding contracts.
  * **Kot / Coat (कोट):** Major loss tally awarded when a team reaches **48 Gunti** (points wrap around and same-team dealer rotation applies).
* **GSAP Animations & Mobile Table:**
  * Responsive circular table layout.
  * Silky 60 FPS GSAP animations when playing cards onto the central trick table (`Haath`).
  * Active player hand rail highlighting legal cards during your turn.
* **Audio & Haptic Feedback:**
  * Zero-dependency Web Audio API synthesizer for card play thuds, deal swishes, and trick win chimes.
  * Touch device haptic vibration feedback (`navigator.vibrate`).
  * **Settings Modal (⚙️):** Toggle sound effects and haptic vibration on or off.
* **Serverless P2P Multiplayer:**
  * 4-digit Room Code system (`CHAK-4821`).
  * Custom player names and team selection.
  * Operates 100% serverless over WebRTC (PeerJS + Google STUN).
* **Progressive Web App (PWA):**
  * Installable directly on iOS (Safari "Add to Home Screen") and Android (Chrome "Install App").

---

## 📖 Game Terminology Glossary

| Term | Hindi | Description |
| --- | --- | --- |
| `Boli` | बोली | Contract bidding phase after dealing. |
| `Kaat` | काट | Trump suit for the hand (declared by Boli winner). |
| `Haath` | हाथ | A trick (one card played per player). |
| `Chaal` | चाल | Move / card played in a turn. |
| `Patti` | पत्ती | Playing card. |
| `Rung` | रंग | Card suit (Spades ♠, Hearts ♥, Diamonds ♦, Clubs ♣). |
| `Hukum` | हुकूम | Spades suit (`♠`) specifically. |
| `Gunti` | गुंती | Accumulated penalty points (lower is better). |
| `Kot / Coat` | कोट | Major penalty marker awarded at 48 Gunti. |

---

## 🛠️ Technology Stack

* **Core:** React 19, TypeScript, Vite
* **Game Engine:** Independent TypeScript State Machine
* **Animations:** GSAP (`@gsap/react`, `gsap`)
* **Styling:** Tailwind CSS v4
* **State Management:** Zustand
* **Networking:** WebRTC / PeerJS
* **Audio & Haptics:** Web Audio API & Web Vibration API
* **PWA:** `vite-plugin-pwa`
* **Testing:** Node 22 Test Runner (`node:test`, `node:assert`)

---

## 🚀 Getting Started

### Prerequisites
* Node.js v18+

### Installation & Local Setup

```bash
# 1. Clone the repository
git clone git@github.com:ssanidhya/Chakadi.git
cd Chakadi

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

### Running Unit Tests

Run the test suite covering game engine rules, bidding flow, trick evaluation, 48-point Kot wrap-around, and networking:

```bash
npm test
```

### Building & Deploying to GitHub Pages

```bash
# Deploy to GitHub Pages gh-pages branch
npm run deploy
```

---

## 📄 License

MIT License - feel free to use, modify, and share!
