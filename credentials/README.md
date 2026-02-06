# Firebase Credentials

This folder contains Firebase configuration files required for push notifications.

## Required Files

### 1. `google-services.json` (Android)
Download from Firebase Console:
1. Go to https://console.firebase.google.com/
2. Select your project (or create one)
3. Click "Add app" → Android
4. Package name: `com.noxchat.app`
5. Download `google-services.json`
6. Place it in this folder

### 2. `GoogleService-Info.plist` (iOS)
Download from Firebase Console:
1. Go to https://console.firebase.google.com/
2. Select your project
3. Click "Add app" → iOS
4. Bundle ID: `com.noxchat.app`
5. Download `GoogleService-Info.plist`
6. Place it in this folder

## Firebase Project Setup

### Enable Cloud Messaging
1. In Firebase Console, go to Project Settings
2. Click "Cloud Messaging" tab
3. Ensure Firebase Cloud Messaging API (V1) is enabled

### For iOS (APNs)
1. Go to Project Settings → Cloud Messaging
2. Under "Apple app configuration", upload your APNs Authentication Key
   - Get this from Apple Developer Portal → Keys → Create a new key with APNs enabled

## After Adding Files

Run these commands to rebuild:
```bash
npx expo prebuild --clean
npx expo run:android
# or for iOS:
npx expo run:ios
```

## Note
These files are gitignored for security. Each developer needs their own copies.
