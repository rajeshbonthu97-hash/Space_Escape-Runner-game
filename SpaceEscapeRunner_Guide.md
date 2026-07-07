# SpaceEscapeRunner — Full Development & Publishing Guide

Welcome to the **SpaceEscapeRunner** development guide! This document is structured for complete beginners in React Native and Expo. It breaks down the complete codebase, installation, mechanics, and the step-by-step process of building and publishing your game to the Google Play Store.

---

## Phase 1 — Project Setup & First Screen

### 1. Installation Prerequisites
Before writing code, you need to install the core software development tools on your computer:
- **Node.js**: The JavaScript runtime environment that lets you execute JS commands and run package managers. Download the **LTS (Long Term Support)** version from [nodejs.org](https://nodejs.org/).
- **Git**: A version control tool used to track project changes. Download it from [git-scm.com](https://git-scm.com/).
- **Expo Go (on your mobile device)**: A free developer app available in the Apple App Store or Google Play Store. It allows you to run and preview your application on a physical phone in real-time.
- **VS Code**: A lightweight code editor recommended for writing code.

### 2. Commands to Create the Project
To create the project from scratch, open your terminal (PowerShell, Command Prompt, or terminal in VS Code) and run the following command:

```bash
# Create a new Expo project with a minimal JavaScript template
npx create-expo-app SpaceEscapeRunner --template blank --yes
```

### 3. Commands to Run the Project
Navigate into your new project directory and start the local Expo bundler server:

```bash
# Navigate to the project folder
cd SpaceEscapeRunner

# Start the Expo development server
npx expo start
```

### 4. What Each Command Does
- `npx`: Node Package Runner. Instead of installing a tool globally on your computer, `npx` downloads and executes it temporarily to perform a task.
- `create-expo-app`: A command-line utility that sets up a standardized, pre-configured React Native folder structure.
- `--template blank`: Instructs the tool to install a minimal template containing only a single main code file (`App.js`), rather than a complex template with advanced navigation configurations.
- `--yes`: Skips interactive terminal prompts, applying default configuration settings.
- `npx expo start`: Fires up Metro, the JavaScript bundler for React Native. Metro packages your code into a single bundle and hosts a local server that your testing device reads.

### 5. How to Test Using Expo Go
1. Run `npx expo start` in your terminal. You will see a large **QR code** printed on the screen.
2. Ensure your computer and your phone are connected to the **same Wi-Fi network**.
3. **On Android**: Open the Expo Go app and tap "Scan QR Code". Scan the terminal QR code.
4. **On iOS**: Open the built-in Camera app and scan the QR code. Tap the pop-up link to open it in Expo Go.
5. The app will fetch the JavaScript bundle, load the screen, and reload instantly whenever you save changes in your code editor.

---

## Phase 2 — The Spaceship & Movement

### 1. Drawing the Spaceship Using React Native Views
In this game, the spaceship is constructed using pure CSS shapes inside React Native `View` components. This removes the need for loading bulky image assets.

#### Visual Hierarchy
```
[Spaceship Container]
   ├── [Thruster Flame] (rendered conditionally with flickering state)
   ├── [Wings Base] (purple rectangle)
   ├── [Central Cabin Body] (cyan rectangle with curved top edges)
   └── [Cockpit Window] (translucent white capsule)
```

#### Styling and Positioning CSS Logic
- **`position: 'absolute'`**: Places the spaceship relative to the canvas container, allowing us to position it with explicit coordinate properties (`left` and `top`) and move it programmatically.
- **`borderTopLeftRadius` & `borderTopRightRadius`**: Setting these on the main cyan cabin body (`shipBody`) creates a streamlined rocket-nose cone.
- **Layering (`zIndex`)**: We use higher `zIndex` values for foreground parts (e.g. cockpit window: `4`) and lower values for background details (e.g., wings: `2`, thruster flame: `1`) so they overlap properly.

### 2. Left / Right Controller Logic (State & Refs)
To move the spaceship on a mobile screen, we use two control pads at the bottom.

#### The Problem with standard Tap buttons
A simple `onPress` trigger only moves the spaceship once per tap, which makes control feel sluggish. Instead, we want **hold-to-move** mechanics: the ship slides continuously as long as you hold down the button.

#### The Solution: React Refs and the Game Loop
1. We create two Refs: `moveLeftActive = useRef(false)` and `moveRightActive = useRef(false)`.
2. On the control buttons, we use `Pressable`:
   - `onPressIn={() => { moveLeftActive.current = true; }}`: Fires the instant the finger touches the screen.
   - `onPressOut={() => { moveLeftActive.current = false; }}`: Fires the instant the finger is lifted.
3. Every single frame of the game loop, we check if these refs are `true`. If `moveLeftActive.current` is true, we update the coordinates of the ship:
   `currentX = Math.max(10, currentX - SPACESHIP_SPEED);`
4. The `Math.max(10, ...)` and `Math.min(SCREEN_WIDTH - SPACESHIP_WIDTH - 10, ...)` calculations act as boundaries to prevent the ship from moving off the left or right edges of the screen.

---

## Phase 3 — Asteroids, Game Loop & Collisions

### 1. Falling Asteroids & Game Loop
The game uses a **game loop** powered by `requestAnimationFrame`. This is a built-in browser/mobile function that instructs the device to execute an animation update frame before the next screen repaint (usually 60 times a second, or every 16.6ms).

#### Loop Architecture
```
updateGameFrame()
   ├── Check moveLeftActive / moveRightActive -> Move Spaceship
   ├── Loop through Asteroids -> Increase Y position by Speed
   ├── If Asteroid Y > SCREEN_HEIGHT
   │      ├── Increment score +1
   │      └── Respawn Asteroid at random X above top of screen
   └── requestAnimationFrame(updateGameFrame) -> Loop again
```

Each asteroid is generated with a random size and falling speed:
```javascript
const size = Math.random() * (ASTEROID_MAX_SIZE - ASTEROID_MIN_SIZE) + ASTEROID_MIN_SIZE;
const speed = Math.random() * (ASTEROID_MAX_SPEED - ASTEROID_MIN_SPEED) + ASTEROID_MIN_SPEED;
```
This ensures the player faces a continuous, unpredictable wave of rocks!

### 2. Step-by-Step Collision Detection (AABB)
To detect if the spaceship hits an asteroid, we use **AABB (Axis-Aligned Bounding Box)** collision detection, which checks if two rectangular boxes overlap.

```
       [Asteroid Box] (left, top, right, bottom)
            ┌───────────┐
            │           │
            │     ┌─────┼──────┐
            └─────┼─────┘      │
                  │            │
                  └────────────┘
             [Spaceship Box] (left, top, right, bottom)
```

The algorithm evaluates four boundary checks:
1. Is the ship's **left** edge to the left of the asteroid's **right** edge? (`ship.left < asteroid.right`)
2. Is the ship's **right** edge to the right of the asteroid's **left** edge? (`ship.right > asteroid.left`)
3. Is the ship's **top** edge above the asteroid's **bottom** edge? (`ship.top < asteroid.bottom`)
4. Is the ship's **bottom** edge below the asteroid's **top** edge? (`ship.bottom > asteroid.top`)

If **all four** conditions are true simultaneously, the two objects overlap, causing a collision!
```javascript
if (
  shipBox.left < asteroidBox.right &&
  shipBox.right > asteroidBox.left &&
  shipBox.top < asteroidBox.bottom &&
  shipBox.bottom > asteroidBox.top
) {
  // COLLISION!
}
```
*Note: To make the game feel fair, we contract the asteroid's hit box boundary slightly (`buffer = ast.size * 0.15`) so that grazing the visual edge of an asteroid doesn't cause an immediate game over.*

---

## Phase 4 — Restart & High Score

### 1. Resetting State
When the player clicks "Start Mission" or "Relaunch Ship", we trigger `startGame()`:
1. Reset the `score` state to `0`.
2. Move the spaceship back to the bottom center.
3. Spawn a fresh array of randomized asteroids off-screen.
4. Set the `gameState` to `'PLAYING'`.
5. Trigger `requestAnimationFrame(updateGameFrame)` to start updating positions.

### 2. High Scores with AsyncStorage
**AsyncStorage** is a simple, asynchronous, unencrypted key-value storage system for React Native apps. It functions similarly to `localStorage` in web browsers, persisting data even if the player closes the app or restarts their phone.

#### How It Works:
- **Load High Score**: When the app starts, we run `AsyncStorage.getItem('@high_score')`. If a score exists, we update our React state `highScore`.
- **Save High Score**: When a player crashes, we compare the current `score` with the saved `highScore`. If it is higher, we update the state and save it locally using `AsyncStorage.setItem('@high_score', newScore.toString())`.
- **Data type conversion**: AsyncStorage only stores strings, so we must call `.toString()` when saving and `parseInt(value, 10)` when loading.

---

## Phase 5 — Visual Polish
To give the app a premium, high-quality feel, we implemented:
- **Deep Space Gradient**: Using `LinearGradient` from `expo-linear-gradient` to blend navy, purple, and magenta.
- **Flickering Thruster**: A state-timer toggles the thruster flame visibility every 100 milliseconds to simulate active engine firing.
- **Flickering Stars**: 45 random static stars are generated at launch, layered behind the game canvas.
- **Glassmorphism UI**: High score counters and control bars use translucent panels with a white border (`rgba(255,255,255,0.05)`) and low opacity, blending smoothly with the background.
- **Neon Glows**: Styling shadows are tinted with neon cyan `#00F0FF` and pink `#FF0055` to pop on OLED displays.

---

## Phase 6 — Build with EAS

Once the game is complete, you can bundle it into a standalone file for installation or app store publishing. We use **EAS (Expo Application Services)**, a cloud build service provided by Expo.

### 1. Create an Expo Account
1. Visit [expo.dev](https://expo.dev/) and click **Sign Up** to create a free account.
2. In your computer's terminal, log in to your account:
   ```bash
   npx eas-cli login
   ```
   Provide your Expo credentials when prompted.

### 2. Configure EAS
Configure your React Native project for cloud builds. Navigate to the `SpaceEscapeRunner` folder and run:
```bash
npx eas-cli build:configure
```
- When asked: `Which platforms would you like to configure?`, select **All** or **Android**.
- This creates an `eas.json` file in your project root, which contains build profiles (development, preview, production).

### 3. Setup Android Credentials & Generate an Android APK (for testing)
An **APK** is an executable file you can transfer directly to an Android phone to install and test the game manually.
1. Open the generated `eas.json` file.
2. In the `"preview"` profile, add `"developmentClient": false` and `"distribution": "internal"` if they aren't already set. Make sure it also includes `"android": { "buildType": "apk" }`. It should look like this:
   ```json
   {
     "build": {
       "preview": {
         "distribution": "internal",
         "android": {
           "buildType": "apk"
         }
       },
       "production": {}
     }
   }
   ```
3. Run the build command:
   ```bash
   npx eas build --platform android --profile preview
   ```
4. EAS will prompt: `Generate a new Android Keystore?`. Press **Yes**. This keystore is a digital signature file that authenticates your app.
5. The build runs on Expo's remote servers (taking 5-15 minutes). When finished, the terminal outputs a **download link** and a **QR code**. Scan this QR code with your phone to download and install the APK file.

### 4. Generate an Android AAB (for Play Store publishing)
An **AAB (Android App Bundle)** is the official publishing format required by Google Play. It contains your compiled code and assets, letting Google generate optimized APKs tailored to each user's device configuration.
1. Run the production build command:
   ```bash
   npx eas build --platform android --profile production
   ```
2. EAS will build the app bundle. Once completed, download the `.aab` file using the terminal link and save it to your computer.

---

## Phase 7 — Publish to Google Play Console

### 1. Google Play Developer Account Setup
1. Go to the [Google Play Console](https://play.google.com/console/signup).
2. Sign in with a Google account.
3. Choose your account type: **Personal** (for individuals/indie devs) or **Organization** (for registered businesses).
4. Pay the **one-time $25 USD registration fee**. Google charges this fee to reduce spam submissions and verify publisher identities.
5. **Identity Verification**:
   - Google requires submitting a government ID (Passport, Driver's License, or National ID) and proof of address.
   - Verification typically takes **1 to 7 business days**. You cannot publish apps until this process is completed.

### 2. Creating the App in Play Console
1. Log in to the Play Console and click the blue **Create app** button.
2. Fill out the initial app details:
   - **App Name**: `SpaceEscape Runner` (Limit: 50 characters).
   - **Default Language**: Select your primary language (e.g., English).
   - **App or Game**: Select **Game**.
   - **Free or Paid**: Select **Free** (Note: You cannot change a free game to a paid game later; you would have to submit a new app).
3. Accept the declarations (Developer Program Policies, US Export Laws) and click **Create app**.

### 3. Store Listing Setup
Users see these details when browsing your app page. Navigate to **Grow** > **Store presence** > **Main store listing** in the left sidebar.

#### Required Visual Assets
- **App Icon**: Must be exactly **512 x 512 pixels**, 32-bit PNG, maximum size 1MB.
- **Feature Graphic**: Must be exactly **1024 x 500 pixels**, PNG or JPEG, maximum size 1MB. This is the banner displayed at the top of your store page.
- **Phone Screenshots**: Upload between 2 and 8 screenshots. Dimensions must be between 320px and 3840px (16:9 or 9:16 aspect ratio).
- **Tablet Screenshots**: If you want your game marked as tablet-ready, upload screenshots for 7-inch and 10-inch screen sizes.

#### Text Fields
- **Short Description**: (Limit: 80 characters) A brief hook. E.g., *"Evade falling asteroids in this neon-themed arcade space runner!"*
- **Full Description**: (Limit: 4000 characters) Explain game features, control schemes, score tracking, and gameplay loops.
- **Category**: Games > **Arcade** or **Casual**.
- **Contact Details**: A public email address where players can reach you for support.

### 4. Content and Compliance Forms
Before uploading, you must declare details about safety and content. Navigate to **Policy** > **App content** in the sidebar.

1. **Privacy Policy**:
   - Google requires a link to a privacy policy web page.
   - For a simple free game that does not collect personal data, generate a generic template policy using online privacy policy generators, host the markdown/HTML on a free hosting tool (like GitHub Pages or Google Sites), and paste the URL.
2. **Content Rating**:
   - Complete a questionnaire about violence, fear, sexual themes, and offensive language.
   - Because `SpaceEscapeRunner` is a simple block-evasion game with no graphic violence or communication, it will receive an **Everyone (ESRB)** or **PEGI 3** rating.
3. **Target Audience and Age**:
   - Declare who your game is for. If you target children under 13, you must comply with strict COPPA laws. For an indie game, setting the target age to **13 and older** simplifies requirements.
4. **Data Safety Form**:
   - Declare what user data your app collects. Since our game runs purely offline and stores high scores locally using AsyncStorage, answer **No, this app does not collect or share any user data**.
5. **Ads Declaration**:
   - Select **No, my app does not contain ads** (unless you integrate ad packages later).
6. **Government App**:
   - Select **No, this app does not represent a government entity**.

### 5. Uploading the Build & Testing Tracks
Navigate to **Release** > **Production** or **Testing** in the sidebar.

#### Understanding Release Tracks
- **Production**: Accessible to everyone on Google Play.
- **Open Testing**: Public beta. Anyone can join and download the game to provide feedback.
- **Closed Testing**: Private beta. Available only to a specific list of email addresses.
- **Internal Testing**: Fastest path. Shares the app with up to 100 internal testers instantly, bypassing Google's review queue.

> [!IMPORTANT]
> **Google's Personal Account Policy Update (2023)**: If you created your personal developer account after November 9, 2023, Google **requires** you to run a Closed Test with at least **20 testers opted-in continuously for 14 days** before you are permitted to request access to the Production track. 

#### Uploading the Build:
1. Navigate to **Testing** > **Closed testing** > **Create track**.
2. Click **Create release**.
3. Under **App bundles**, upload your `.aab` file.
4. Google will extract the version number (e.g. `1.0.0`) and build code.
5. Provide release notes (e.g., *"Initial release of Space Escape Runner"*).
6. Click **Save** and then **Review release**.

### 6. App Signing
- **Google Play App Signing**: When you upload your AAB, Google removes your temporary developer signing key and signs the app with an official Google security certificate stored on their secure servers.
- **EAS Keystore Relation**: The keystore generated by EAS during your first build is your **Upload Keystore**. It is used to prove to Google that subsequent app updates are submitted by you.
- **CAUTION**: Do not lose your EAS account or the keystore! If you delete the keystore or lose access to your credentials, you cannot upload updates to your existing app page on the Play Store; you would have to upload it as a completely new game with a different package name.

### 7. Release and Review
1. Once your build is uploaded, and all forms/compliance checks are completed, click **Start roll-out**.
2. **Review Queue**:
   - All app submissions (including updates) go through an automated scan and a manual review by Google policy agents.
   - For your **first release**, review typically takes **3 to 7 days**. Subsequence updates are usually approved in 1 to 2 days.
3. **Common Rejection Pitfalls and Prevention**:
   - **Missing Privacy Policy**: If your privacy policy link is broken, expired, or doesn't match the app name, Google will reject it. Ensure your link is active.
   - **Copyright Violation**: Do not use trademarked names (like "Star Wars" or "Asteroids") or copyrighted assets. Since our game uses custom shapes and names, it is safe.
   - **Broken Functionality**: If the game crashes on launch on the reviewer's emulator, it will be rejected. Always verify your build locally by testing the APK before uploading the AAB.
   - **Incorrect Store Rating Declarations**: If you claim the game has zero violence but it contains graphic elements, Google will flag it. Since our game uses color blocks, it is safe.

Congratulations! Your game is configured, built, and ready to take off. You now have a complete, fully functioning space game and the keys to publish it to millions of players!
