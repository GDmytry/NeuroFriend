# Build APK and IPA

This project is prepared for EAS Build.

## What you can get

- Android `apk` for direct installation on devices
- Android `aab` for Google Play
- iOS build for internal distribution and App Store workflows

## Important notes

- `apk` can be installed directly on Android devices
- `ipa` requires an Apple Developer account
- direct iPhone installation usually uses internal distribution / Ad Hoc or TestFlight
- on Windows, the easiest path is cloud builds with EAS

## First-time setup

1. Install Expo and EAS tooling:

```powershell
npm.cmd install
npx.cmd eas-cli login
```

2. Initialize EAS for the project:

```powershell
npx.cmd eas-cli init
```

## Build Android APK

```powershell
npx.cmd eas-cli build --platform android --profile preview
```

Result:

- EAS will produce an installable `.apk`

## Build Android AAB for Play Store

```powershell
npx.cmd eas-cli build --platform android --profile production
```

Result:

- EAS will produce an `.aab`

## Build iOS binary

```powershell
npx.cmd eas-cli build --platform ios --profile preview
```

Result:

- EAS will prepare an iOS internal distribution build
- Expo will ask for Apple credentials / certificates if needed

## If you need a classic .ipa

For iOS, the actual installation flow depends on signing:

- internal distribution / Ad Hoc
- TestFlight
- App Store

EAS will guide you through the available signing flow for your Apple account.

## Recommended path for your project

For quick manual installation on devices:

- Android: use `preview` profile to get `.apk`
- iPhone: use `preview` profile with internal distribution, then install from the EAS link on the device
