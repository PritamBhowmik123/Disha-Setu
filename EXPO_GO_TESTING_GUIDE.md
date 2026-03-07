# 🧪 EXPO GO TESTING GUIDE

## Quick Start - Testing on Android Expo Go

### Prerequisites:
1. ✅ Backend running on `localhost:3000`
2. ✅ Expo Go app installed on Android device
3. ✅ Same WiFi network for computer and phone

### Testing Steps:

#### 1. Start the App in Expo Go Mode

```bash
cd "c:\Users\DELL\Desktop\Disha-Setu\frontend"
npx expo start
```

**Expected Output:**
```
› Metro waiting on exp://192.168.x.x:8081
› Scan the QR code above with Expo Go (Android)
```

#### 2. Scan QR Code with Expo Go

1. Open **Expo Go** app on Android
2. Tap **Scan QR code**
3. Point camera at QR code in terminal
4. Wait for app to load

**Expected Result:** 
- App builds and loads (30-60 seconds first time)
- No crash
- Splash screen → Landing page appears

#### 3. Check for Error Messages

**Old Errors (Should NOT appear):** ❌
- ❌ "Cannot find native module 'ExpoCryptoAES'"
- ❌ "Socket connect error: Native module is null"
- ❌ App crashes on startup

**Acceptable Warnings:** ✅
- ⚠️ "SafeAreaView has been deprecated" (cosmetic, already using correct package)
- ⚠️ "Metro bundling" logs

#### 4. Test Authentication Flow

##### Guest Login:
1. On landing page, tap **"Get Started"** → Onboarding screens
2. After onboarding, tap **"Continue as Guest"**
3. Should navigate to **Home screen with project list**

**Check:**
- ✅ No crashes
- ✅ Home screen renders
- ✅ Bottom tabs visible
- ✅ Projects load from API

##### OTP Login:
1. Back to auth screen
2. Enter 10-digit phone number
3. Tap **"Send OTP"**
4. Should navigate to OTP verification screen

**Check:**
- ✅ OTP screen appears
- ✅ Can enter numbers
- ✅ API call works (check backend logs)

##### Google Sign-In:
1. Tap **"Continue with Google"**
2. Browser opens for Google OAuth
3. Select account
4. Redirects back to app

**Check:**
- ✅ OAuth flow works
- ✅ Returns to app
- ✅ User logged in

#### 5. Test Core Features

**Navigation:**
- [ ] Bottom tabs work (Home, Search, Notifications, Activity, Settings)
- [ ] Can navigate between screens
- [ ] Back button works
- [ ] Drawer navigation (if admin)

**API Calls:**
- [ ] Projects load on Home screen
- [ ] Search works
- [ ] Project details page loads
- [ ] Admin dashboard loads (if logged in as admin)

**Socket.io (Real-time):**
- [ ] Check Metro logs for "[Socket] Connected: XXXXXXXX"
- [ ] Should connect after ~500ms delay
- [ ] No connection errors

**Storage:**
- [ ] Login persists after closing/reopening app
- [ ] User data saved
- [ ] Token persists

#### 6. Test Admin Features (if admin)

```bash
# Login as admin using guest mode with role
# Or use OTP with admin phone number
```

1. Navigate to Admin Dashboard
2. Check **Indoor Navigation** page
3. Try **Add Room** functionality
4. Check **Feedback** management
5. Check **Analytics**

**Check:**
- [ ] Admin pages render
- [ ] Data loads
- [ ] CRUD operations work
- [ ] Modals open/close

### 7. Performance Checks

**App Performance:**
- [ ] Smooth scrolling
- [ ] No UI lag
- [ ] Images load
- [ ] Animations work

**Network:**
- [ ] API calls complete
- [ ] Loading states show
- [ ] Error messages appear for failed calls

### 8. Console Monitoring

**Open Metro bundler console, watch for:**

✅ **Good Messages:**
```
[Socket] Socket initialized successfully
[Socket] Connected: abc123xyz  
[API] GET /projects 200
[Auth] User logged in successfully
```

❌ **Bad Messages (Should NOT appear):**
```
ERROR [Error: Cannot find native module 'ExpoCryptoAES']
WARN [Layout] Socket connect error: Native module is null
ERROR AsyncStorage encryption not available
```

---

## Debugging Tips

### If App Crashes on Startup:

1. **Clear Metro cache:**
   ```bash
   npx expo start --clear
   ```

2. **Restart Expo Go app** on phone

3. **Check Metro logs** for specific error

4. **Verify backend is running:**
   ```bash
   # In another terminal
   curl http://localhost:3000/api/projects
   ```

### If Socket Errors Appear:

```javascript
// Check if socket is connected
[Socket] Connect error: Network unreachable
```

**Solution:**
- Ensure phone and computer on same WiFi
- Check firewall isn't blocking port 3000
- Backend should be running

### If Authentication Fails:

```javascript
[API] POST /auth/guest 404
```

**Solution:**
- Backend not running on port 3000
- Check backend logs
- Verify API_BASE_URL in services/api.js

---

## Web Testing (Verify No Regression)

### 1. Start Web Version:

```bash
cd frontend
npx expo start --web
```

### 2. Open Browser:
`http://localhost:8081`

### 3. Test Same Features:

- [ ] App loads without errors
- [ ] Socket connects immediately (no delay)
- [ ] Authentication works
- [ ] All pages render correctly
- [ ] Admin features work
- [ ] No console errors
- [ ] Performance is same as before

### 4. Check Browser Console:

**Expected:**
```
[Socket] Connected: xxxxx (immediate, no delay)
[Platform] Initializing web platform...
```

**Should NOT see:**
```
500ms delay (web has 0ms delay)
AsyncStorage errors
Platform-specific warnings
```

---

## Comparison Matrix

| Feature | Web (Before) | Web (After) | Android (Before) | Android (After) |
|---------|--------------|-------------|------------------|-----------------|
| Startup | ✅ Works | ✅ Works | ❌ Crashes | ✅ Works |
| Socket Init | Immediate | Immediate | Crashes | 500ms delay |
| Auth | ✅ Works | ✅ Works | ❌ Crashes | ✅ Works |
| API Calls | ✅ Works | ✅ Works | ❌ Crashes | ✅ Works |
| Navigation | ✅ Works | ✅ Works | ❌ Crashes | ✅ Works |
| Storage | ✅ Works | ✅ Works | ❌ Crashes | ✅ Works |

---

## Success Criteria

### ✅ Android Expo Go Success:
1. App launches without crashing
2. No `ExpoCryptoAES` error
3. No `Native module null` error
4. Can create guest account
5. Home screen loads
6. Projects visible
7. Navigation works
8. Socket connects (check logs)

### ✅ Web Unchanged:
1. App loads same as before
2. No new errors
3. All features work
4. Performance identical
5. No visual changes
6. Socket connects immediately

---

## Next Steps After Testing

### If Tests Pass:
1. ✅ Mark Android as working
2. ✅ Update README with Expo Go instructions
3. ✅ Consider adding development build guide
4. ✅ Deploy to production

### If Tests Fail:
1. Check which specific error appears
2. Review Metro logs
3. Check backend connectivity
4. Verify WiFi network
5. Report specific error for debugging

---

## Additional Testing (Optional)

### Test Offline Mode:
1. Enable airplane mode
2. Check app behavior
3. Should show cached data
4. Graceful error messages

### Test Slow Network:
1. Enable network throttling on phone
2. Check loading states
3. Timeout handling
4. User feedback

### Test Dark Mode:
1. Toggle system dark mode
2. Check all screens
3. Verify colors
4. Icon visibility

---

**Remember:** The changes made are minimal guards and delays. The core app logic is unchanged, so if something doesn't work, it's likely a network/backend issue rather than compatibility.
