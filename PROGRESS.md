# NP Car Rental — Project Progress

## Project Overview

A peer-to-peer car rental marketplace (Airbnb-style) connecting car owners (hosts) and renters. Built with React + Vite (frontend) and Node.js + Express (backend).

---

## Step 1 — Install Dependencies

### Server (`server/`)
| Package | Purpose |
|---------|---------|
| `express` | Web framework for building REST APIs |
| `cors` | Allows cross-origin requests from frontend |
| `dotenv` | Loads `.env` variables into `process.env` |
| `firebase-admin` | Server-side SDK to interact with Firebase Firestore & Auth |
| `jsonwebtoken` | Creates & verifies JWT tokens for auth |
| `bcryptjs` | Hashes passwords before storing in DB |
| `express-validator` | Validates & sanitizes incoming request data |
| `cookie-parser` | Parses cookies from incoming requests for HttpOnly JWT cookies |

### Client (`client/`)
| Package | Purpose |
|---------|---------|
| `react-router-dom` | Client-side routing (no full page reloads) |
| `axios` → REMOVED | Replaced with native `fetch` API to reduce dependencies |

### Why `fetch` instead of `axios`?
- No extra dependency — smaller bundle
- Native browser API — no learning curve
- Easy to wrap with a utility function

---

## Step 2 — Environment Variables

### `server/.env`
Stores sensitive config like DB credentials, JWT secret, Firebase keys. Never committed to Git.

### `client/.env`
Stores public-facing config like API URL. Must be prefixed with `VITE_` for Vite to expose it.

---

## Step 3 — Server Folder Structure

```
server/
├── config/
│   └── firebase.js      # Initializes Firebase Admin SDK using service account
├── controllers/
│   └── authController.js # Handles login/register logic
├── middleware/
│   ├── auth.js           # Verifies JWT token on protected routes
│   └── errorHandler.js   # Global error handler (catches thrown errors)
├── routes/
│   └── authRoutes.js     # Defines API endpoints for auth (/api/auth/...)
├── utils/
│   └── AppError.js       # Custom error class with status codes
├── .env                  # Environment variables (gitignored)
├── index.js              # Express app entry point
└── package.json          # Dependencies & scripts
```

### Folder Purpose
| Folder | Purpose |
|--------|---------|
| `config/` | App configuration (Firebase, Stripe, etc.) |
| `controllers/` | Business logic for each feature |
| `middleware/` | Express middleware (auth checks, error handling, rate limiting) |
| `routes/` | Maps URLs to controller functions |
| `utils/` | Reusable utility functions and classes |

---

## Step 4 — Express Server Entry Point (`server/index.js`)

- Imports Express, CORS, dotenv
- Registers middleware (`cors`, `json`)
- Exports health check route (`GET /`)
- Listens on port from `.env` or default `5000`

**Scripts added:**
- `npm start` → runs `node index.js`
- `npm run dev` → runs with `--watch` (auto-restarts on file changes)

---

## Step 5 — Firebase Admin Config (`server/config/firebase.js`)

- Initializes Firebase Admin SDK using service account credentials from `.env`
- Exports `db` (Firestore) and `auth` (Firebase Auth) for use across the app
- **Note:** The service account JSON file can also be placed directly in `config/` as `serviceAccountKey.json`

---

## Step 6 — Utility Classes & Middleware

### `server/utils/AppError.js`
Custom error class that extends `Error` with a `statusCode` property. Used across all controllers to throw consistent errors.

### `server/middleware/errorHandler.js`
Global Express error handler. Catches errors thrown via `next(err)` and returns a JSON response with the correct HTTP status code.

### `server/middleware/auth.js`
JWT verification middleware (`protect`):
- Reads `access_token` from HttpOnly cookie (`req.cookies.access_token`)
- Verifies token using `JWT_SECRET`
- Attaches decoded payload (`req.user`) for downstream use
- Throws 401 if token is missing or invalid

---

## Step 7 — Auth Controller & Routes

### `server/controllers/authController.js`
- `register` — validates email uniqueness, hashes password with bcryptjs (12 rounds), stores user in Firestore with role `"renter"`, returns JWT
- `login` — finds user by email, compares password hash, returns JWT

### `server/routes/authRoutes.js`
- `POST /api/auth/register`
- `POST /api/auth/login`

---

## Step 8 — Client Folder Structure

```
src/
├── assets/            # Images, icons, SVGs
├── components/        # Reusable UI pieces (buttons, cards, inputs)
├── context/           # React context providers (AuthContext)
├── data/              # Static data files (Philippine geography)
├── hooks/             # Custom hooks (useAuth)
├── layouts/           # Layout wrappers (MainLayout with navbar/footer)
├── pages/             # Page-level components (Home, SignIn, SignUp, etc.)
├── routes/            # Route definitions & ProtectedRoute wrapper
├── services/          # API calls using native fetch wrapper
├── App.jsx
├── index.css
└── main.jsx
```

---

## Step 9 — API Service (`client/src/services/api.js`)

Native `fetch` wrapper that:
- Prepends `VITE_API_URL` to all endpoints
- Sends cookies with `credentials: "include"` (HttpOnly JWT in cookie, not header)
- Reads CSRF token from cookie and adds `X-CSRF-Token` header for mutating requests
- Auto-refreshes expired access tokens via `/api/auth/refresh` on 401 (with queue for concurrent requests)
- Handles JSON serialization/parsing
- Throws errors with server message

---

## Step 10 — Auth Context (`client/src/context/AuthContext.jsx`)

React context that manages auth state globally:
- `user` — current user object (null when logged out), fetched from `/api/profile` on mount via HttpOnly cookie
- `loading` — true while fetching profile on mount (prevents flash redirects)
- `login(email, password)` — calls API (server sets HttpOnly cookies), then fetches user profile
- `register(fullName, email, password)` — sends registration request, no state change
- `updateUser(updates)` — updates React state only (no localStorage)
- `logout()` — calls `/api/auth/logout` to clear cookies server-side, clears state
- Listens for `auth:expired` custom event (dispatched by api.js when refresh fails) to auto-open sign-in modal

---

## Step 11 — React Router Setup

### `client/src/main.jsx`
Wraps the app in `<BrowserRouter>` and `<AuthProvider>`.

### `client/src/routes/index.jsx`
Route definitions inside `<MainLayout>`:
| Path | Page | Protected |
|------|------|-----------|
| `/` | Home | No |
| `/signin` | SignIn | No |
| `/signup` | SignUp | No |
| `/profile` | Profile | Yes |
| `/become-host` | BecomeHost | Yes |
| `/add-vehicle` | AddVehicle | Yes |

### `client/src/routes/ProtectedRoute.jsx`
Redirects unauthenticated users to `/signin`. Uses `loading` state from AuthContext to avoid flash redirects on page reload.

---

## Step 12 — Main Layout (`client/src/layouts/MainLayout.jsx`)

Sticky navbar with conditional links:
| User State | Links Shown |
|------------|-------------|
| Logged out | Browse, Sign In, Sign Up |
| Logged in as **renter** | Browse, Become a Host, Profile, {name}, Logout |
| Logged in as **host** | Browse, List a Car, Profile, {name}, Logout |

Footer is always visible.

---

## Step 13 — Auth Pages

### `client/src/pages/SignIn.jsx`
Email + password form. Calls `login()` from AuthContext. Redirects to `/` on success.

### `client/src/pages/SignUp.jsx`
Full name + email + password form. Calls `register()` from AuthContext. Redirects to `/` on success.

---

## Step 14 — Home Page (`client/src/pages/Home.jsx`)

- Fetches available vehicles from `GET /api/vehicles` on mount
- Displays loading state while fetching
- Shows "No vehicles available" when empty
- Renders vehicle cards in a responsive 3-column grid with: brand, model, year, price, transmission, seats, fuel type

---

## Step 15 — Profile Page (`client/src/pages/Profile.jsx`)

Fetches user profile from `GET /api/profile` and displays editable form:
- Full Name (text)
- Contact Number (text)
- **Address section:**
  - Province (dropdown — all 81 Philippine provinces from `client/src/data/philippines.js`)
  - City/Municipality (cascading dropdown — filters by selected province)
  - Barangay (text input)
  - Street/Building (text input)
  - Zip Code (text input)
- All fields required
- On save: calls `PUT /api/profile` + `updateUser()` to sync navbar name immediately

### `client/src/data/philippines.js`
Static data file containing all 17 regions, 81 provinces, and their cities/municipalities. Exports helper functions:
- `getProvinces()` — returns array of all province names
- `getCitiesByProvince(name)` — returns cities for a given province

---

## Step 16 — Become a Host (`client/src/pages/BecomeHost.jsx`)

Multi-step form:
- **Step 1:** Personal Information (full legal name, contact number, address)
- **Step 2:** Review & Submit
- On submit: calls `POST /api/profile/become-host` which updates user role to `"host"` and stores `hostInfo` with `status: "pending"`

---

## Step 17 — Vehicle Listing (`server/controllers/vehicleController.js`)

### Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/vehicles` | No | Returns all available vehicles |
| POST | `/api/vehicles` | Yes (host) | Creates a new vehicle listing |
| GET | `/api/vehicles/mine` | Yes (host) | Returns host's own listings |

### Vehicle fields stored in Firestore
`brand`, `model`, `year`, `transmission`, `seatingCapacity`, `fuelType`, `plateNumber`, `pricePerDay`, `description`, `status` ("available"), `images` ([]), `hostId`, `createdAt`

### `client/src/pages/AddVehicle.jsx`
Form with fields: Brand, Model, Year, Transmission (dropdown), Seats, Fuel Type (dropdown), Plate Number, Price per day, Description.

---

## Step 18 — Bugs Fixed During Development

| Bug | File | Fix |
|-----|------|-----|
| Protected route redirects on reload | `ProtectedRoute.jsx` | Added `loading` check — returns null while loading instead of redirecting |
| Navbar name not updating after profile edit | `AuthContext.jsx`, `Profile.jsx` | Added `updateUser()` to sync context state with Firestore updates |
| `req.header` (singular) | `auth.js:5` | Changed to `req.headers` (plural) |
| `role: host` (variable, not string) | `profileController.js:37` | Changed to `role: "host"` |
| Navbar "Become a Host" visible to guests | `MainLayout.jsx` | Moved inside `{user ? (...)}` block with `user.role === "renter"` check |
| Error handler message logic inverted | `errorHandler.js` | Fixed `err.message \|\| "Internal server error"` |
| Auth modal not showing on first load after cookie migration | `AuthContext.jsx` | Merged `auth:expired` listener and profile fetch into one effect to fix React StrictMode double-invoke race condition |

---

## Current Feature Summary

| Feature | Status | Files |
|---------|--------|-------|
| Auth (register/login) | ✅ Done | `authController.js`, `authRoutes.js`, `SignIn.jsx`, `SignUp.jsx` |
| Profile (view/edit + PH address) | ✅ Done | `profileController.js`, `profileRoutes.js`, `Profile.jsx`, `philippines.js` |
| Become a Host | ✅ Done | `BecomeHost.jsx`, `profileController.js` |
| Vehicle Listing | ✅ Done | `vehicleController.js`, `vehicleRoutes.js`, `AddVehicle.jsx` |
| Browse Vehicles (from Firestore) | ✅ Done | `Home.jsx`, `vehicleController.js` |
| Protected Routes | ✅ Done | `ProtectedRoute.jsx` |
| Auth Context with updateUser | ✅ Done | `AuthContext.jsx` |

---

## Step 19 â€” Vehicle Details Page

### Backend
Added single vehicle lookup endpoint:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/vehicles/:id` | No | Returns one vehicle by Firestore document ID |

### `server/controllers/vehicleController.js`
Added `getVehicleById` controller:
- Reads vehicle ID from `req.params.id`
- Fetches matching Firestore document from `vehicles`
- Returns 404 if vehicle does not exist
- Returns vehicle data with document ID when found

### `server/routes/vehicleRoutes.js`
Added route:
- `GET /api/vehicles/:id`

Kept `/mine` before `/:id` so `"mine"` is not treated as a vehicle ID.

### `client/src/pages/VehicleDetails.jsx`
New page that:
- Reads vehicle ID from the URL using `useParams`
- Fetches vehicle data from `GET /api/vehicles/:id`
- Displays vehicle brand, model, year, price, transmission, seats, fuel type, status, and description
- Shows loading and error states
- Includes a placeholder "Request to Book" button for the future booking flow

### `client/src/pages/Home.jsx`
Updated vehicle cards so each card links to its details page.

### `client/src/routes/index.jsx`
Added route:
- `/vehicles/:id`

---

## Step 20 — Enhanced Host Application Form

### `client/src/pages/BecomeHost.jsx`
Updated the Become a Host form from a simple full-name/address form into a structured host application:
- Replaced `fullLegalName` with legal name fields:
  - Prefix (optional)
  - First Name
  - Middle Name
  - Last Name
- Added complete Philippine owner house/business address fields:
  - Region
  - Province
  - City/Municipality
  - Barangay
  - House No., Street, Subdivision
  - Unit/Floor/Building (optional)
  - Zip Code
- Added identity verification fields:
  - Driver's license or primary Philippine government-issued ID type
  - ID number
  - ID file upload field
  - Selfie holding physical ID upload field
- Updated the review step to show legal name, contact number, complete address, ID details, and selfie file name before submission.

### `client/src/data/philippines.js`
Added helper functions for cascading Philippine address dropdowns:
- `getRegions()`
- `getProvincesByRegion(regionName)`

### `server/controllers/profileController.js`
Updated `becomeHost` controller:
- Accepts structured `name`, `address`, `validId`, and `selfieWithId` objects
- Validates required host application fields before saving
- Stores host application data under `hostInfo`
- Keeps host application status as `"pending"`
- Adds `submittedAt` timestamp

### Note
The current implementation stores selected ID/selfie file names as application metadata. Actual file storage will need a future upload flow using Firebase Storage or another secure file storage service.

---

## Step 21 — Selfie Upload Source Option

### `client/src/pages/BecomeHost.jsx`
Updated the selfie holding physical ID field:
- Replaced radio buttons with a modern Add Photo flow
- Opens a choice sheet when Add Photo is clicked
- Choice sheet options:
  - Upload from photos
  - Take a selfie
- Upload from photos opens the device file picker
- Take a selfie opens an in-page live camera preview
- Uses `navigator.mediaDevices.getUserMedia()` when camera mode is selected
- Shows a live video preview before capture
- Captures the selfie into a canvas-generated image preview
- Shows a selected selfie preview with a Change action
- Keeps selfie image required before host application review/submission

### Note
Camera access requires browser permission and works only in secure browser contexts such as HTTPS or localhost.

---

## Step 22 — Modern UI/UX Refresh

### Visual Direction
Updated the app toward a modern, simple marketplace interface using a 60/30/10 color balance:
- 60% soft neutral background and white surfaces
- 30% deep slate/ink text, navigation, and structure
- 10% amber accent for primary actions and highlights

### `client/src/layouts/MainLayout.jsx`
Redesigned the main layout:
- Updated sticky navbar with cleaner brand treatment
- Changed navbar Sign In and Sign Up from route links into modal triggers
- Added logged-in account button with avatar/name
- Moved Profile and Logout into an account dropdown
- Kept role-based actions:
  - Renters see Become a Host
  - Hosts see List a Car
- Prepared avatar display for future profile image support using `photoURL`, `profileImage`, or `avatarUrl`
- Falls back to initials when no profile image exists

### `client/src/components/AuthModal.jsx`
Added reusable authentication modal:
- Supports Sign In and Sign Up modes
- Allows switching between modes inside the modal
- Handles login/register through `AuthContext`
- Closes after successful authentication
- Supports Escape key close

### `client/src/index.css`
Replaced starter CSS with app-wide base styling:
- Modern system font stack
- Soft neutral page background
- Consistent text rendering
- Amber selection highlight

### `client/src/pages/Home.jsx`
Updated the home page:
- Added cleaner hero section
- Restored and redesigned vehicle cards
- Added modern listing cards with status, price, and vehicle specs
- Matched the new 60/30/10 visual system

### `client/src/pages/VehicleDetails.jsx`
Updated vehicle details page:
- Modernized vehicle detail layout
- Added larger visual area and thumbnail placeholders
- Restyled price, specs, description, and request button
- Matched the refreshed marketplace visual style

---

## Step 23 — Vehicle Image Selection

### `client/src/pages/AddVehicle.jsx`
Updated the List a Car page:
- Redesigned the form to match the modern 60/30/10 UI direction
- Added vehicle image picker
- Allows up to 3 vehicle images
- Supports PNG, JPG, and WEBP image selection
- Shows image previews before submitting
- Allows removing selected images before submission
- Sends selected image files with the vehicle listing request using `FormData`

### `client/src/services/api.js`
Updated API helper:
- Added `postForm()` for multipart form submissions
- Avoids setting `Content-Type: application/json` when sending `FormData`

### `server/controllers/vehicleController.js`
Updated `createVehicle` controller:
- Accepts image files from `multipart/form-data`
- Uploads image files to Firebase Storage
- Limits vehicle images to a maximum of 3
- Stores image URLs, storage paths, and metadata under the vehicle document

### `server/routes/vehicleRoutes.js`
Added `multer` upload middleware:
- Uses memory storage for incoming image files
- Allows up to 3 files
- Limits each image to 5 MB
- Accepts image MIME types only

### `server/config/firebase.js`
Updated Firebase Admin setup:
- Configures Firebase Storage bucket
- Exports `bucket` for server-side uploads

### `client/src/pages/Home.jsx`
Updated vehicle cards:
- Renders the first vehicle image from `images[0].url`
- Keeps gradient placeholder when a vehicle has no uploaded image URL

### `client/src/pages/VehicleDetails.jsx`
Updated vehicle details gallery:
- Renders main vehicle image from `images[0].url`
- Renders up to 3 thumbnail images from stored image URLs
- Keeps placeholders when image URLs are missing

### Bug Fix
Fixed `res.jso` typo in `getVehicleById` so vehicle details can return JSON correctly.

### Note
New vehicle listings now upload actual image files to Firebase Storage and store download URLs in Firestore. Existing vehicles created before this step only have file metadata, so their images will not display until those vehicle documents are updated with real image URLs.

---

## Step 24 — Host Dashboard and Car Management

### `client/src/pages/HostDashboard.jsx`
Added host dashboard page:
- Shows host summary cards for total cars, available cars, and pending bookings
- Links hosts to car management
- Moves the List a Car action into the host dashboard area

### `client/src/pages/HostCars.jsx`
Added host car management page:
- Fetches host-owned cars from `GET /api/vehicles/mine`
- Displays each car with image, status, price, and key details
- Provides actions to view, edit, and delete car listings
- Includes List a Car button for adding new vehicles

### `client/src/pages/EditVehicle.jsx`
Added edit car page:
- Loads selected vehicle details
- Allows updating brand, model, year, transmission, seats, fuel type, plate number, price, status, and description
- Saves changes through `PUT /api/vehicles/:id`

### `client/src/routes/index.jsx`
Added protected host routes:
- `/host/dashboard`
- `/host/cars`
- `/host/cars/:id/edit`

### `client/src/layouts/MainLayout.jsx`
Updated host navigation:
- Replaced top-level "List a Car" button with "Dashboard"
- Added Manage Cars option inside the account dropdown
- Keeps List a Car inside the host dashboard/car management pages

### `server/controllers/vehicleController.js`
Added host-owned vehicle management:
- `updateVehicle` updates only vehicles owned by the logged-in host
- `deleteVehicle` deletes only vehicles owned by the logged-in host
- Deletes stored vehicle images from Firebase Storage when image paths are available

### `server/routes/vehicleRoutes.js`
Added protected vehicle management endpoints:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PUT | `/api/vehicles/:id` | Yes (owner host) | Updates host-owned vehicle listing |
| DELETE | `/api/vehicles/:id` | Yes (owner host) | Deletes host-owned vehicle listing |

---

## Step 25 — Migrated Images to Cloudinary

Replaced Firebase Storage + multer with Cloudinary unsigned upload:

- Removed `multer` from server, removed `postForm`/`putForm` from api.js
- Images stored as plain URL strings (`["https://..."]`) instead of objects
- All display code handles both old `[{url:"..."}]` and new `["url"]` formats

---

## Step 26 — Email Verification System

Added email verification using `nodemailer` + Gmail SMTP:

- New users get `emailVerified: false` and a verification token
- Login blocked until email is verified
- `resend-verification` endpoint for requesting a new email
- `/verify-email` callback page handles token from email link
- Falls back to console log when SMTP credentials not configured

---

## Step 27 — Booking System

Full booking lifecycle with Firestore `bookings` collection:

- **Flow:** pending → confirmed → completed (with rejected/cancelled branches)
- Availability checked on-the-fly against confirmed bookings (no stale data on vehicle)
- 15% platform fee calculated on booking total
- Host earnings endpoint with per-vehicle breakdown
- Client pages: VehicleDetails date picker, MyBookings, HostDashboard stats, HostBookings management

---

## Step 28 — Search & Filter

Home page live search with:

- Keyword search across brand, model, year, description, fuel, transmission
- City autocomplete dropdown sourced from `getAllCities()` in philippines.js
- Sticky search bar that locks below navbar on scroll past hero

---

## Step 29 — Admin Role System

Introduced admin role for platform oversight. Admin accounts are created manually via Firebase Console (`role: "admin"`).

### Backend

| File | Purpose |
|------|---------|
| `middleware/adminAuth.js` | Queries Firestore — throws 403 if `role !== "admin"` |
| `controllers/adminController.js` | 10 endpoints for platform management |
| `routes/adminRoutes.js` | All routes under `/api/admin`, protected by `protect` + `adminAuth` |

### Admin API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Platform overview (users, vehicles, bookings, revenue, role breakdown) |
| GET | `/api/admin/users` | All users with optional search/role filter |
| PUT | `/api/admin/users/:id/role` | Change role (`"renter"` or `"host"` only — cannot set admin via API) |
| GET | `/api/admin/host-applications` | Users with `hostInfo.status === "pending"` |
| PUT | `/api/admin/host-applications/:id/approve` | Sets `role: "host"`, `hostInfo.status: "approved"` |
| PUT | `/api/admin/host-applications/:id/reject` | Sets `hostInfo.status: "rejected"`, role stays `"renter"` |
| GET | `/api/admin/vehicles` | All vehicles with host info |
| DELETE | `/api/admin/vehicles/:id` | Delete any vehicle (no owner check) |
| GET | `/api/admin/bookings` | All bookings with renter/host/vehicle names |
| GET+PUT | `/api/admin/settings` | Read/write platform fee percentage |

### Frontend

| File | Purpose |
|------|---------|
| `components/AdminRoute.jsx` | Route guard — checks `user.role === "admin"`, redirects otherwise |
| `pages/AdminDashboard.jsx` | 5-tab dashboard: Stats, Users, Host Applications, Bookings, Settings |
| `layouts/MainLayout.jsx` | Admin button (desktop) + dropdown link (mobile) when role is `"admin"` |
| `pages/BecomeHost.jsx` | Guard against pending/approved users; shows "Application Under Review" screen |
| `pages/Profile.jsx` | Host status banner — pending/approved/rejected with appropriate messaging |

### Host Application Flow Change

```
BEFORE: Fill form → role becomes "host" instantly → redirect to /profile
AFTER:  Fill form → hostInfo saved (status: "pending"), role stays "renter"
        Admin reviews → approves → role becomes "host"
                     → rejects → status "rejected", role stays "renter"
```

---

## Step 30 — Rate Limiting & Input Validation

### Rate Limiters

| Endpoint | Window | Max Requests | Type | Purpose |
|----------|--------|-------------|------|---------|
| `POST /api/auth/login` | 15 min | 5 | **Per-user** (Firestore-backed) | Brute force protection — each email gets its own counter, other users unaffected |
| `POST /api/auth/register` | 1 hour | 3 | Global (`express-rate-limit`) | Registration spam |
| `POST /api/profile/become-host` | 1 hour | 2 | Global (`express-rate-limit`) | Host application spam |
| All `/api/admin/*` | 1 min | 30 | Global (`express-rate-limit`) | General API abuse |

**Login rate limiter** (`server/middleware/loginLimiter.js`):
- Uses Firestore `loginAttempts` collection — persists across Vercel serverless instances
- Keyed by SHA-256 hash of email (no raw emails in doc IDs)
- Counter resets on successful login for that email
- Counter resets automatically after 15-minute window expires
- Includes `Retry-After` header on 429 responses

### Input Validation (`express-validator`)

| Endpoint | Validates |
|----------|-----------|
| `POST /api/auth/register` | `fullName` non-empty, `email` valid + normalized, `password` min 6 chars |
| `POST /api/auth/login` | `email` valid, `password` non-empty |
| `POST /api/profile/become-host` | Status gate — rejects if existing `hostInfo.status` is `"pending"` or `"approved"` |
| `PUT /api/admin/users/:id/role` | Role must be `"renter"` or `"host"` (cannot escalate to admin) |
| `PUT /api/admin/settings` | `platformFee` must be a number between 0 and 1 |

### UI Rate Limit Feedback

- Submit button on BecomeHost shows `"Submitting..."` and disables on first click
- "Pending host request" (disabled, no link) shown in navbar while application is under review
- Backend status gate prevents duplicate submissions even if frontend guard is bypassed

---

## Step 31 — Cookie-Based JWT Authentication & CSRF Protection

Migrated from localStorage-based JWT storage to HttpOnly cookies with refresh token rotation and CSRF defense.

### Problem
- JWT stored in `localStorage` — accessible to any JavaScript (XSS vulnerable)
- No CSRF protection — any cross-origin request could mutate data
- Token lived for 7 days with no rotation mechanism
- No refresh token — if stolen, the token was valid for a full week

### Solution

| Layer | Before | After |
|-------|--------|-------|
| **Storage** | `localStorage` | HttpOnly cookie (inaccessible to JS) |
| **Access token lifetime** | 7 days | 15 minutes |
| **Refresh token** | None | 7 days, single-use with rotation |
| **CSRF** | None | Double-submit cookie pattern |
| **Token theft detection** | None | On reuse, marks all sessions of that user as compromised |

### Server Changes

| File | Change |
|------|--------|
| `server/package.json` | Added `cookie-parser` dependency |
| `server/.env` | Added `CLIENT_URL` for CORS origin |
| `server/index.js` | Added `cookieParser()`, CORS `credentials: true`, CSRF middleware |
| `server/middleware/auth.js` | Reads `access_token` from cookie instead of `Authorization` header |
| `server/middleware/csrf.js` | **New** — auto-sets CSRF cookie + validates `X-CSRF-Token` for mutating non-auth requests |
| `server/controllers/authController.js` | Rewritten — 15min access token, 7d rotating refresh token, login sets 3 cookies, logout clears them |
| `server/controllers/refreshTokenBlacklist.js` | **New** — Firestore `usedJtis` collection for refresh token rotation (serverless-safe) |
| `server/routes/authRoutes.js` | Added `POST /refresh`, `POST /logout` |

### Client Changes

| File | Change |
|------|--------|
| `client/src/services/api.js` | Removed localStorage/Authorization — uses `credentials: "include"`, CSRF header from cookie, 401 auto-refresh with queue |
| `client/src/context/AuthContext.jsx` | Removed all localStorage — fetches user from `/profile` on mount via HttpOnly cookie |

### Bug Fix
Fixed React StrictMode race condition in `AuthContext.jsx` — `auth:expired` event listener must be registered before the profile fetch to catch first-load 401s.

---

## Step 32 — Per-User Login Rate Limiting

Replaced the global `express-rate-limit` login limiter with a **per-user Firestore-backed** version.

### Problem
The old `express-rate-limit` counted requests globally — if user A hit the limit, user B was also blocked. A malicious actor could lock out all users with a few rapid failed attempts across different emails.

### Solution
New `server/middleware/loginLimiter.js`:
- Tracks failed attempts **per email** (keyed by SHA-256 hash of email)
- Works across Vercel serverless instances (Firestore-backed)
- Counter resets on successful login for that specific email
- Counter resets automatically after 15-minute window
- Includes `Retry-After` header on 429 responses
- Only counts actual credential failures (401), not validation errors or email-not-verified

### Files Changed
| File | Change |
|------|--------|
| `server/middleware/loginLimiter.js` | **New** — Firestore `loginAttempts/{emailHash}` collection |
| `server/routes/authRoutes.js` | Added `loginLimiter` middleware to `POST /login` |
| `server/controllers/authController.js` | Calls `resetLoginAttempts` on success, `recordFailedAttempt` on credential failure |

---

## Current Feature Summary

| Feature | Status | Files |
|---------|--------|-------|
| Auth (register/login) | ✅ Done | `authController.js`, `authRoutes.js`, `AuthModal.jsx` |
| Profile (view/edit + PH address) | ✅ Done | `profileController.js`, `profileRoutes.js`, `Profile.jsx`, `philippines.js` |
| Become a Host (with application flow) | ✅ Done | `BecomeHost.jsx`, `profileController.js` |
| Vehicle Listing | ✅ Done | `vehicleController.js`, `vehicleRoutes.js`, `AddVehicle.jsx` |
| Browse Vehicles | ✅ Done | `Home.jsx`, `vehicleController.js` |
| Vehicle Details | ✅ Done | `VehicleDetails.jsx`, `vehicleController.js` |
| Protected Routes | ✅ Done | `ProtectedRoute.jsx` |
| Auth Context with updateUser | ✅ Done | `AuthContext.jsx` |
| Email Verification | ✅ Done | `authController.js`, `email.js`, `VerifyEmail.jsx` |
| Booking System | ✅ Done | `bookingController.js`, `MyBookings.jsx`, `HostBookings.jsx` |
| Search & Filter | ✅ Done | `Home.jsx`, `philippines.js` |
| **Admin System** | **✅ Done** | `adminController.js`, `adminAuth.js`, `adminRoutes.js`, `AdminDashboard.jsx`, `AdminRoute.jsx` |
| **Rate Limiting** | **✅ Done** | `loginLimiter.js` + `server/index.js` with `express-rate-limit` |
| **Input Validation** | **✅ Done** | `authController.js`, `adminController.js`, `profileController.js` |
| **Cookie Auth + CSRF** | **✅ Done** | `csrf.js`, `refreshTokenBlacklist.js`, `authController.js`, `auth.js`, `api.js`, `AuthContext.jsx` |
| Stripe Connect / Payments | 🔜 Pending | — |
| Reviews & Ratings | 🔜 Pending | — |
| Legal Pages | 🔜 Pending | — |
