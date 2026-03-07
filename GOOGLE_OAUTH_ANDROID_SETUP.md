# Fix Google OAuth for Android/iOS Expo Go

## Current Issue

Your Google Client ID (`821266969114-kihsrvi0uehnfv265ij0c02av1bl4b5l`) is configured as **Web Application** type. Android/iOS apps need their own OAuth client IDs.

## Solution: Create Native OAuth Clients

### Step 1: Go to Google Cloud Console

1. Visit: https://console.cloud.google.com/apis/credentials
2. Select your project (or create one)

### Step 2: Create Android OAuth Client

1. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
2. Application type: **Android**
3. Name: `DishaSetu Android`
4. Package name: `host.exp.exponent` (for Expo Go)
5. SHA-1 certificate fingerprint: Get from command below

**For Expo Go (Development):**
```
SHA-1: 25:92:D2:D9:55:89:96:FB:12:5A:B9:8A:8F:55:AB:5A:0D:8D:E0:5D
```

6. Click **Create**
7. Copy the **Android Client ID** (will look like `xxx-xxx.apps.googleusercontent.com`)

### Step 3: Create iOS OAuth Client

1. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
2. Application type: **iOS**
3. Name: `DishaSetu iOS`
4. Bundle ID: `host.exp.Exponent` (for Expo Go)
5. Click **Create**
6. Copy the **iOS Client ID**

### Step 4: Update Frontend Code

Edit [`app/auth.jsx`](frontend/app/auth.jsx) line 23:

```javascript
// BEFORE (single web client ID):
const GOOGLE_CLIENT_ID = '821266969114-kihsrvi0uehnfv265ij0c02av1bl4b5l.apps.googleusercontent.com';

// AFTER (separate IDs for each platform):
const GOOGLE_WEB_CLIENT_ID = '821266969114-kihsrvi0uehnfv265ij0c02av1bl4b5l.apps.googleusercontent.com';
const GOOGLE_ANDROID_CLIENT_ID = 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com'; // From Step 2
const GOOGLE_IOS_CLIENT_ID = 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com'; // From Step 3
```

Then update line 40:

```javascript
// BEFORE:
const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: GOOGLE_CLIENT_ID,
    iosClientId: GOOGLE_CLIENT_ID,
    webClientId: GOOGLE_CLIENT_ID,
    redirectUri: Platform.OS === 'web' ? 'http://localhost:8081' : undefined,
});

// AFTER:
const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    redirectUri: Platform.OS === 'web' ? 'http://localhost:8081' : undefined,
});
```

### Step 5: Test

1. Clear cache: `npx expo start --clear`
2. Scan QR code with Expo Go on Android
3. Tap "Continue with Google"
4. Should open Google sign-in successfully

---

## Temporary Workaround (Skip Google Setup)

If you want to **test other features first without Google Sign-In**, you can:

### Option A: Hide Google Button on Mobile

Edit [`app/auth.jsx`](frontend/app/auth.jsx), find the Google button (around line 300) and wrap it:

```javascript
{Platform.OS === 'web' && (
  <TouchableOpacity
    style={{...}}
    onPress={handleGoogleSignIn}
    disabled={!request || loading}
  >
    {/* Google button content */}
  </TouchableOpacity>
)}
```

### Option B: Use OTP or Guest Login

These work on all platforms without extra setup:
- **Guest Login** - Tap "Continue as Guest"
- **OTP Login** - Enter phone number (e.g., `+919876543210`)

Both are fully functional on Android Expo Go.

---

## For Production App (After Testing)

When you build a standalone app (not Expo Go), you'll need:

1. Get your app's actual package name and SHA-1:
   ```bash
   cd android
   ./gradlew signingReport
   ```

2. Create new Android OAuth client with:
   - Your app's package name (e.g., `com.dishasetu.app`)
   - Your app's SHA-1 fingerprint

3. Update `GOOGLE_ANDROID_CLIENT_ID` in code

---

## Quick Reference

| Platform | Current Status | Client ID Type | Works in Expo Go? |
|----------|---------------|---------------|-------------------|
| **Web** | ✅ Working | Web Application | N/A |
| **Android** | ❌ Blocked | Needs Android client | After setup |
| **iOS** | ❌ Blocked | Needs iOS client | After setup |

---

## Need Help?

**Expo Go SHA-1 for Android:** `25:92:D2:D9:55:89:96:FB:12:5A:B9:8A:8F:55:AB:5A:0D:8D:E0:5D`  
**Expo Go Bundle ID for iOS:** `host.exp.Exponent`  
**Expo Go Package Name for Android:** `host.exp.exponent`

Use these when creating Android/iOS OAuth clients for development with Expo Go.
