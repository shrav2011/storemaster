# StoreMaster - Setup Instructions

## 1. Firebase Setup
This app requires Firebase for Authentication and Firestore Database.

1.  Go to [Firebase Console](https://console.firebase.google.com/) and create a new project.
2.  **Authentication**: Enable **Email/Password** sign-in method in the Authentication section.
3.  **Firestore Database**: Create a Firestore database. Start in **Test Mode** for initial development, or set up strict security rules for production.
    *   *Recommended Basic Rules (allows authenticated users to access their own data if you separate by user, for this simple demo we allow all authenticated users to read/write everything)*:
        ```
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /{document=**} {
              allow read, write: if request.auth != null;
            }
          }
        }
        ```
4.  **Project Settings**: Go to Project Settings > General > Your apps > Add web app. Copy the `firebaseConfig` object.
5.  **Update Code**: Open `firebase.ts` in this project and replace the placeholder `firebaseConfig` with your actual configuration values.

## 2. Deployment
This app is a static React SPA (Single Page Application).

1.  **Build**: Run `npm run build` (or equivalent depending on your bundler setup if you were running this locally outside of this environment).
2.  **Hosting**: Deploy the `dist` or `build` folder to any static host:
    *   **Firebase Hosting** (Recommended): `firebase deploy --only hosting`
    *   **Netlify / Vercel**: Drag and drop the build folder.
    *   **GitHub Pages**: Suitable since we use `HashRouter`.
