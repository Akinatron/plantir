# Plantir

Plantir is a mobile app for iOS and Android that helps groups of friends organize trips from creation through date voting, destination voting, expenses, balances, and settlements.

This repository is currently in Phase 3: repository and project setup. The app shell is intentionally placeholder-only; no real business logic is implemented yet.

## Stack

- Expo + React Native
- TypeScript strict mode
- Expo Router
- React Hook Form + Zod
- TanStack Query
- Supabase Auth, PostgreSQL, Storage, RLS, Realtime, and Edge Functions
- Jest + React Native Testing Library
- ESLint + Prettier

## Setup

1. Install dependencies:

```sh
npm install
```

2. Create a local env file:

```sh
cp .env.example .env
```

3. Fill in:

```sh
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Only `EXPO_PUBLIC_*` values are exposed to the mobile client. Do not put service-role keys or other secrets in Expo public variables.

## Scripts

```sh
npm run start
npm run ios
npm run android
npm run web
npm run typecheck
npm run lint
npm run test
npm run test:watch
```

## Initial Phase 3 Commands

The project was initialized with:

```sh
npx create-expo-app@latest plantir-scaffold --template blank-typescript
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-secure-store expo-image-picker @react-native-async-storage/async-storage react-native-svg
npx expo install react-dom react-native-web @expo/metro-runtime
npm install @supabase/supabase-js react-native-url-polyfill @tanstack/react-query react-hook-form zod @hookform/resolvers zustand date-fns lucide-react-native
npm install --save-dev react-test-renderer@19.2.3
npm install --save-dev eslint prettier eslint-config-expo jest jest-expo @types/jest @types/node @testing-library/react-native
```

## Project Structure

```text
app/
src/
  components/
  config/
  features/
  hooks/
  lib/
  providers/
  services/
  types/
docs/
```

## Current App Shell

- Welcome screen
- Login placeholder
- Trips tab placeholder
- Notifications tab placeholder
- Profile tab placeholder

