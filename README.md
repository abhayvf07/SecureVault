# SecureVault — File Storage & Sharing Platform

A full-stack file storage and sharing app I built using the MERN stack, inspired by Google Drive. Users can upload, manage and share files securely. I focused a lot on getting the auth, file handling and backend structure right — not just making something that runs, but something that's actually built properly.

---

## Preview

### Dashboard
Overview of your files, folders and recent activity.
<img width="1920" height="923" alt="Dashboard" src="Screenshots/Dashboard.png" />

---

### File Sharing
Share files using unique secure links — with optional password and expiry.
<img width="1920" height="923" alt="Share" src="Screenshots/Share.png" />

---

### Activity Tracking
See everything that happened — uploads, deletes, shares, logins.
<img width="1920" height="923" alt="Activity" src="Screenshots/Activity.png" />

---

### Admin Dashboard
Manage users, files, and platform settings — suspend accounts, promote admins, delete files.
<img width="1920" height="923" alt="Admin" src="Screenshots/Admin.png" />

---

## Why I Built This

I wanted to build something that actually feels like a real-world project. Most beginner projects are just basic CRUD apps and I wanted to go beyond that. File storage seemed like a great challenge because there's so much to think about — how do you handle auth properly? How do you make sharing safe? How do you structure the backend so it doesn't become a nightmare to maintain?

Building this taught me a lot about JWT refresh token rotation, secure cookie handling, file validation, modular backend design and more. I'm genuinely proud of how this turned out.

---

## Features

### Authentication & Security
- JWT-based auth with access + refresh tokens
- Role-based access control (user/admin roles)
- Protected API routes
- Input validation using Zod
- Environment variable protection

### Admin Dashboard
- Platform-wide stats (users, files, storage)
- User management — search, suspend/activate, promote/demote
- File oversight — view and delete any file across all users
- Self-lockout prevention (can't demote last admin, can't suspend yourself)
- Full audit trail — every admin action is logged
- CLI bootstrap script for first admin (zero HTTP attack surface)

### File Management
- Upload files with proper validation
- Organize into folders
- Download and delete files
- File metadata handling

### File Sharing
- Share files via unique generated links (token-based)
- Optional password protection on share links
- Set expiry time on share links (configurable hours)
- Download limit tracking — see how many times files were downloaded
- Secure download endpoint — passwords always submitted via POST
- When using Cloudinary, downloads stream directly from CDN

### Activity Tracking
- Logs every user action — upload, delete, share, login
- Logs admin actions — suspend, promote, file deletions
- Backend logging system

### Performance & Scalability
- Pagination on file listings (12 items/page, up to 50)
- MongoDB aggregation for folder counts (replaces N+1 query pattern)
- Optimized database queries with proper indexing
- Modular backend so adding new features doesn't break existing ones
- Safe activity logging with fallback (failures don't cascade to user operations)
- File download locking prevents delete race conditions

---

## Improvements (June 2026)

- **Query Optimization**: Replaced N+1 folder file-count queries with MongoDB aggregation (50x faster for 50 folders)
- **Download Safety**: File locking prevents deletion race conditions; download flag released after stream completes
- **Share Route Security**: Removed legacy GET endpoint; share downloads now require POST with password submission
- **Logging Reliability**: Activity logging wrapped in safe try-catch so database failures don't cascade to user operations
- **Search UX**: Fixed dashboard search debounce to apply consistently on all queries (not just when typing)
- **Blob Cleanup**: Delayed object URL revocation prevents browser download race conditions
- **Path Portability**: Local file paths stored as relative (`uploads/uuid.jpg`) instead of absolute for server migration support

---

## Tech Stack

**Frontend**
- React 19 + Vite
- Tailwind CSS
- Axios
- React Router DOM

**Backend**
- Node.js + Express.js
- MongoDB + Mongoose
- JWT (access + refresh token auth)
- bcryptjs
- Multer
- Zod
- Cloudinary (optional)
- Helmet
- express-rate-limit
- cookie-parser
- uuid, cors, dotenv
- file-type (magic-byte file validation).

---

## How I Structured It

The backend is service-oriented — routes handle HTTP, controllers handle request/response, and services have the actual business logic. Storage is abstracted into its own layer which means switching between local and Cloudinary is just an env variable change, no code change needed.

**Storage options:**
- **Local** — files go to the `uploads/` folder on the server, good for dev and cheap hosting
- **Cloudinary** — just add credentials in `.env` and it switches automatically

The frontend also has a clean structure — pages, reusable components, hooks/context and API clients are all kept separate.

### API Endpoints

| Method | Route | What it does |
|--------|-------|--------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get logged in user |
| POST | `/api/files/upload` | Upload a file |
| GET | `/api/files` | List all files |
| DELETE | `/api/files/:id` | Delete a file |
| PUT | `/api/files/:id/rename` | Rename a file |
| GET | `/api/files/download/:id` | Download a file |
| POST | `/api/share/:fileId` | Create a share link |
| GET | `/api/share/:token/info` | Get share link info (no password needed) |
| POST | `/api/share/:token/download` | Download via share link (with optional password) |
| GET | `/api/activity` | Get activity log |
| GET | `/api/activity/analytics` | Get analytics |
| POST | `/api/folders` | Create a new folder |
| GET | `/api/folders` | List all folders |
| DELETE | `/api/folders/:id` | Delete a folder (files move to root) |
| GET | `/api/admin/stats` | Get platform-wide stats (admin) |
| GET | `/api/admin/users` | List all users (admin) |
| PATCH | `/api/admin/users/:id/status` | Suspend/activate a user (admin) |
| PATCH | `/api/admin/users/:id/role` | Promote/demote user role (admin) |
| GET | `/api/admin/files` | List all files across users (admin) |
| DELETE | `/api/admin/files/:id` | Admin delete any file (admin) |

I'll add a proper Postman collection soon — it's on my to-do list.

---

## Project Structure

```
SecureVault/
├── client/                # Frontend (React + Vite)
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminRoute.jsx
│   │   │   ├── AnalyticsPanel.jsx
│   │   │   ├── FileCard.jsx
│   │   │   ├── FileIcon.jsx
│   │   │   ├── FolderList.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── SkeletonLoader.jsx
│   │   │   └── UploadZone.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── useAuth.js
│   │   ├── pages/
│   │   │   ├── ActivityPage.jsx
│   │   │   ├── AdminDashboardPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   └── SharedFilePage.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .env
│   ├── .env.example
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   └── vite.config.js
|
├── server/                # Backend (Node + Express)
│   ├── controllers/
│   │   ├── activityController.js
│   │   ├── adminController.js
│   │   ├── authController.js
│   │   ├── fileController.js
│   │   ├── folderController.js
│   │   └── shareController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   ├── upload.js
│   │   └── validate.js
│   ├── models/
│   │   ├── ActivityLog.js
│   │   ├── File.js
│   │   ├── Folder.js
│   │   ├── RefreshToken.js
│   │   ├── SharedLink.js
│   │   └── User.js
│   ├── routes/
│   │   ├── activityRoutes.js
│   │   ├── adminRoutes.js
│   │   ├── authRoutes.js
│   │   ├── fileRoutes.js
│   │   ├── folderRoutes.js
│   │   └── shareRoutes.js
│   ├── scripts/
│   │   └── createAdmin.js
│   ├── services/
│   │   ├── activityService.js
│   │   └── uploadService.js
│   ├── utils/
│   │   ├── generateToken.js
│   │   ├── logger.js
│   │   ├── streamRemoteFile.js
│   │   └── timeParser.js
│   ├── .env
│   ├── .env.example
│   ├── app.js
│   ├── package-lock.json
│   ├── package.json
│   └── server.js
├── .gitignore
└── README.md
```

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/abhayvf07/securevault.git
cd securevault
```

### 2. Setup the backend

```bash
cd server
npm install
```

Create a `.env` file (you can copy `.env.example` and fill in the values):

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://your_user:your_password@cluster.mongodb.net/securevault
JWT_SECRET=generate_random_secret_here
JWT_REFRESH_SECRET=generate_another_random_secret_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
MAX_FILE_SIZE=5242880
CLIENT_URL=http://localhost:5173

# leave blank if you want to use local storage
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

You can generate secure JWT secrets like this:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Start the backend:
```bash
npm run dev
```

It'll run on `http://localhost:5000`. If that port is busy it'll automatically try the next one.

#### Admin Setup

After registering your first account normally, promote it to admin via the CLI:

```bash
cd server
node scripts/createAdmin.js your@email.com
```

This is intentionally CLI-only — you need shell access to run it, which is the correct security bar for creating the first admin. Once an admin exists, they can promote other users from the Admin Dashboard in the UI.

---

### 3. Setup the frontend

```bash
cd client
npm install
```

Optionally create a `.env` file (defaults to `http://localhost:5000/api` if you skip this):
```env
VITE_API_URL=http://localhost:5000/api
```

```bash
npm run dev
```

Frontend runs on `http://localhost:5173`.

---

### 4. Running Tests

Test coverage is currently being restored — see the "What I Want to Add Next" section.

---

## Security — what I implemented and why

This was honestly the most fun part to work on. Security is usually treated as an afterthought in student projects so I made it a priority here.

**Auth & Authorization**
- Access token lives in memory only — not localStorage, so XSS can't steal it
- Refresh token stored in httpOnly cookie — JavaScript can't access it at all
- Token rotation on every refresh, old tokens are invalidated
- Role-based access control — admin routes check `req.user.role` via live DB lookup (no stale-token window)
- Admin-only middleware (`requireAdmin`) gates all `/api/admin/*` endpoints
- Self-lockout prevention — admins can't demote themselves or the last remaining admin
- Every file operation checks ownership — can't access someone else's file by guessing an ID (IDOR protection)
- Invalid or expired tokens automatically log the user out

**File Security**
- Magic byte validation — I check the actual file content, not just the extension (so you can't rename a `.exe` to `.jpg` and sneak it through)
- Dangerous extensions are blocked — `.exe`, `.bat`, `.sh`, `.dll` etc.
- Files get a UUID name on disk — original filename never touches storage
- Path traversal protection — uploads can't escape their directory
- File locking during download prevents deletion race conditions
- Local file paths stored as relative paths for portability across servers
- File size limit — 5MB by default, configurable in env

**API Security**
- Rate limiting — 100 req/15min general, 5 req/15min on auth routes, 10 req/min on uploads
- Share download route is POST-only (prevents direct link bypass of password protection)
- Zod validates all user input before it reaches business logic
- Helmet sets security headers automatically
- CORS is locked to the configured `CLIENT_URL` only
- Activity logging is non-blocking so database errors don't break user operations

**Passwords**
- Strong password policy enforced at signup
- Share link passwords are bcrypt hashed with 12 salt rounds — never stored as plain text

---

## Deployment

**Frontend** → Vercel or Netlify. Just run `npm run build` and deploy the `dist/` folder.

**Backend** → Render or Railway. Set all env variables in the dashboard before deploying.

Things to do before going to production:
1. Generate new JWT secrets — never reuse dev ones in production
2. Set `NODE_ENV=production`
3. Set up MongoDB with a replica set (needed for transactions)
4. Enable HTTPS and set `secure: true` on cookies
5. Update `CLIENT_URL` to your real frontend URL
6. Set up proper logging and monitoring

---

## What I Want to Add Next

- Deploy the whole stack (frontend + backend + database)
- Unit tests for auth, file operations, and share links
- File move between folders
- Real-time notifications for shared file downloads
- Swagger/OpenAPI docs for easier API exploration
- Activity log archival strategy for large deployments

### Expert-Level Improvements I'm Planning

These are the deeper, production-grade changes I want to tackle once the core features are stable. They're the kind of things that separate a project that "works on my machine" from one that survives years of real-world use.

**Database-Level Atomicity & Transactional Uploads**
Right now the share-link download counter and the file-delete lock work fine, but they're not using true database-level atomic operations — under heavy concurrent load there's a theoretical window for race conditions. I want to move both to MongoDB's native atomic operators (`$inc`, `findOneAndUpdate`) so the database itself guarantees correctness, no matter how many requests hit at the same time. Beyond that, the upload flow today does three things in sequence: save the file to disk, create the database record, and log the activity. If the server crashes between any of those steps, you could end up with an orphaned file on disk with no matching DB row, or a database entry pointing to a file that never finished writing. The fix is wrapping that entire sequence in a MongoDB transaction (which requires a replica set — something the deployment notes already recommend) or using a short-lived distributed lock. Either way, the goal is making the upload pipeline all-or-nothing: it either fully succeeds or fully rolls back, no in-between states.

**Background Reconciliation Worker**
Even with transactions, things can go wrong over months and years of production use — a deploy gone bad, a manual fix that missed a step, a disk that filled up mid-write. I want to add a lightweight background job (cron-style or using MongoDB change streams) that periodically scans the `uploads/` directory and compares it against the `File` collection. Any file on disk without a matching database document gets flagged (and optionally cleaned up), and any database record pointing to a missing file gets reported. It's the kind of operational tooling that gives you confidence the system is healthy without having to manually dig through logs.

**S3 (or Object Store) as a True Third Storage Backend**
The existing storage abstraction already makes switching between local and Cloudinary a one-line env change, which means adding S3 as a third option is a clean extension rather than a rewrite. But I don't just want to proxy uploads through the Node server the way local storage does — the real win is using presigned URLs so clients upload directly to S3 and download directly from S3, completely bypassing the server for the heavy data transfer. This would meaningfully improve throughput and cut server memory pressure for larger files, since the Node process never has to buffer file contents in memory at all.

**SVG Upload Hardening**
This one's a security gap I'm aware of. `image/svg+xml` is currently in the allowed MIME types list, which makes sense since SVGs are a common image format. But SVGs are XML under the hood, and they can embed `<script>` tags, event handlers, and external resource references — making them a known stored-XSS vector if they're ever served back to a browser with a renderable content type. The fix is either running every uploaded SVG through a server-side sanitizer (something like DOMPurify or sanitize-html configured to strip scripts and dangerous attributes) before persisting it, or simply removing SVG from the allowed list entirely and offering a server-side PNG/JPEG rendering fallback for icon use cases. Either approach closes the gap cleanly without hurting the user experience.

---

## Testing

Test coverage is planned and the project structure supports it cleanly. Priority tests to add: auth endpoints, share link download-limit enforcement, and file upload validation.

---

## Contributing

Feel free to fork and open a PR if you want to add something or fix a bug. If it's a bigger change, open an issue first so we can talk about it.

---

## Contact

GitHub: [https://github.com/abhayvf07](https://github.com/abhayvf07)

If you liked this project, a star on GitHub would mean a lot to me — it keeps me motivated to keep building!