# PulseConnect — Full-Stack Facebook-Style Social Network

A production-ready, full-stack social media platform built with TypeScript, React, GraphQL, WebSockets, and MongoDB. Features real-time streaming, virtual scroll, and a complete Facebook-like UX.

---

## 🗂️ Project Structure

```
pluseconnect/
├── backend/                   # Node.js + Apollo GraphQL API
│   └── src/
│       ├── config/
│       │   └── database.ts        # MongoDB connection
│       ├── models/
│       │   ├── User.ts            # User schema
│       │   ├── Post.ts            # Post + media + reactions
│       │   ├── Comment.ts         # Nested comments
│       │   ├── Message.ts         # Conversations + messages
│       │   ├── Notification.ts    # Notification system
│       │   └── Story.ts           # 24h stories (TTL index)
│       ├── graphql/
│       │   ├── typedefs/          # Full GraphQL schema
│       │   ├── resolvers/
│       │   │   ├── auth.resolvers.ts
│       │   │   ├── post.resolvers.ts
│       │   │   ├── user.resolvers.ts
│       │   │   ├── message.resolvers.ts
│       │   │   ├── subscription.resolvers.ts
│       │   │   └── other.resolvers.ts  # Comments, notifs, stories
│       │   └── context.ts         # Auth + PubSub context
│       ├── scripts/
│       │   └── seed.ts            # Demo data seeder
│       └── index.ts               # Express + Apollo + WS server
│
├── frontend/                  # React + Vite SPA
│   └── src/
│       ├── lib/
│       │   ├── apollo.ts          # Apollo client + WS split link
│       │   └── graphql.ts         # All GQL queries/mutations/subs
│       ├── store/
│       │   └── index.ts           # Zustand: auth, UI, notifications
│       ├── utils/index.ts         # Helpers, formatters, constants
│       ├── components/
│       │   ├── Feed/
│       │   │   └── Feed.tsx       # Virtual scroll feed + live updates
│       │   ├── Post/
│       │   │   ├── PostCard.tsx   # Post with reactions, media, menu
│       │   │   ├── CreatePost.tsx # Composer with visibility picker
│       │   │   └── CommentSection.tsx  # Nested comments
│       │   ├── Stories/
│       │   │   └── StoriesBar.tsx # Story rings + full-screen viewer
│       │   ├── Chat/
│       │   │   └── ChatPanel.tsx  # Floating chat window
│       │   ├── Sidebar/
│       │   │   ├── Navbar.tsx     # Top nav + search + notifications
│       │   │   ├── LeftSidebar.tsx
│       │   │   └── RightSidebar.tsx
│       │   └── UI/
│       │       ├── Avatar.tsx     # Avatar with online indicator
│       │       └── Skeleton.tsx   # Shimmer loaders
│       └── pages/
│           ├── Home.tsx           # Feed page + layout
│           ├── Auth.tsx           # Login + Register
│           ├── Profile.tsx        # User profile page
│           └── Messages.tsx       # Full messenger page
│
└── shared/                    # Shared TypeScript types
```

---

## ⚡ Tech Stack

### Backend
| Tech | Role |
|------|------|
| **Node.js + Express** | HTTP server |
| **Apollo Server 4** | GraphQL API |
| **graphql-ws** | WebSocket subscriptions |
| **Mongoose** | MongoDB ODM |
| **graphql-subscriptions** | PubSub for real-time events |
| **bcryptjs** | Password hashing |
| **jsonwebtoken** | JWT authentication |
| **Zod** | Input validation |
| **DataLoader** | N+1 query batching |

### Frontend
| Tech | Role |
|------|------|
| **React 18** | UI framework |
| **Vite** | Build tool |
| **@apollo/client** | GraphQL + subscriptions |
| **graphql-ws** | WebSocket transport |
| **@tanstack/react-virtual** | Virtual scrolling |
| **Zustand** | Global state |
| **Framer Motion** | Animations |
| **Tailwind CSS** | Styling |
| **React Router v6** | Routing |
| **Radix UI** | Accessible primitives |
| **react-hot-toast** | Toast notifications |
| **date-fns** | Date formatting |
| **Lucide React** | Icons |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Redis (optional, for distributed PubSub)

### 1. Clone & Install

```bash
git clone <repo>
cd pluseconnect
npm run setup
```

### 2. Configure Environment

```bash
# backend/.env (already created)
MONGODB_URI=mongodb://localhost:27017/pluseconnect
JWT_SECRET=your-super-secret-key
PORT=4000
FRONTEND_URL=http://localhost:5173

NODE_ENV=development
PORT=4000

# Your Atlas connection string
MONGODB_URI=mongodb+srv://mathewanm_db_user:<db_password>@cluster0.p3auebr.mongodb.net/pluseconnect?retryWrites=true&serverSelectionTimeoutMS=5000

# CHANGE THIS in production — at least 32 random characters
JWT_SECRET=change-me-to-a-long-random-secret-in-production
JWT_EXPIRES_IN=7d

# Frontend URL (used for CORS)
FRONTEND_URL=http://localhost:5173

# Cloudinary (photo/video upload) — from cloudinary.com/console dashboard
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret


### 3. Seed Demo Data

```bash
cd backend
npm run seed
# 👤 Created 10 users
# 🤝 Created 22 friendships
# 📝 Created 49 posts
# 💬 Created 58 comments
# 📸 Created 10 stories
# 💌 Created sample conversation
# Login: demo@example.com / password123
```

### 4. Start Development

```bash
# From root — starts both backend and frontend
npm run dev

# Or separately:
npm run dev:backend   # http://localhost:4000/graphql
npm run dev:frontend  # http://localhost:5173
```

---

## 🔑 Key Features

### Real-Time (WebSockets)
- **Live feed** — new posts appear as toast banners
- **Instant messaging** — chat with typing indicators
- **Live notifications** — friend requests, likes, comments
- **Online presence** — green dots update in real time

### Performance
- **Virtual scroll** with `@tanstack/react-virtual` — renders only visible posts/messages, handles 10,000+ items
- **Cursor-based pagination** — efficient infinite scroll
- **Apollo cache** — smart normalization + merge policies
- **Optimistic updates** — messages appear instantly before server confirms

### Facebook-Like Features
- 📖 **News Feed** — posts from friends, infinite scroll
- 📸 **Stories** — 24h stories with ring UI and full-screen viewer
- ❤️ **Reactions** — Like/Love/Haha/Wow/Sad/Angry with hover picker
- 💬 **Comments** — nested replies, threaded
- 👥 **Friends** — requests, accept/decline, suggestions
- 🔔 **Notifications** — all activity, real-time badge
- 💌 **Messenger** — floating chat panel + full-page messages
- 👤 **Profiles** — cover photo, bio, friends grid, posts tab
- 🌙 **Dark mode** — full dark theme
- 🔍 **Search** — users by name/username

### Data Architecture
- **6 MongoDB models** with proper indexes
- **TTL index** on Stories (auto-expire after 24h)
- **Cursor-based** feed pagination
- **PubSub events** for all subscription types
- **JWT auth** on both HTTP and WebSocket connections

---

## 📡 GraphQL API

### Key Queries
```graphql
query { feed(cursor: String, limit: Int) { posts hasMore nextCursor } }
query { me { id fullName avatar } }
query { stories { user hasUnviewed stories { id media } } }
query { conversations { id unreadCount lastMessage } }
query { notifications(limit: 15) { type message isRead } }
```

### Key Mutations
```graphql
mutation { createPost(input: { content, media, visibility }) { id } }
mutation { reactToPost(postId: ID!, type: ReactionType!) { reactionSummary } }
mutation { sendMessage(input: { conversationId, content }) { id } }
mutation { sendFriendRequest(userId: ID!) { id } }
```

### Subscriptions
```graphql
subscription { newPost { id content author { fullName } } }
subscription { newMessage(conversationId: ID!) { id content sender } }
subscription { typingStatus(conversationId: ID!) { userId isTyping } }
subscription { newNotification { type message sender { fullName } } }
```

---

## 🏗️ Architecture Decisions

**Virtual Scroll**: The feed uses `@tanstack/react-virtual` with dynamic measurement. Each `PostCard` is measured after mount so the virtualizer handles variable heights correctly. Overscan of 3 items prevents blank flash on fast scroll.

**Apollo Split Link**: HTTP for queries/mutations, WebSocket for subscriptions. The split is determined by operation type at link creation time.

**Cursor Pagination**: Uses base64-encoded ISO timestamps as cursors. MongoDB query: `{ createdAt: { $lt: decodedCursor } }`. Apollo cache merge policy deduplicates appended pages.

**Subscription Namespacing**: Conversation-specific subs use `${EVENT_NAME}.${conversationId}` channels to avoid broadcasting to all users.

**Optimistic Messages**: Messages are inserted optimistically with a temp ID; Apollo reconciles when the real response arrives.

---

## 🐛 Known Gaps / Bug Log

Running log of gaps found during review, kept up to date as issues are found and fixed. Newest entries at the top.

### 2026-08-22 — Todo list (working through one at a time)

- [x] `Post.tags` had no field resolver and was silently returned as `null` outside the single-post query — same class of bug as the `User.friends` fix. Fixed.
- [x] Six nav destinations (Friends, Watch, Marketplace, Saved, Events, Settings) had no matching routes — clicking silently bounced back to Home. Added placeholder pages so navigation no longer fails silently.
- [ ] Floating chat popup (`ChatPanel`/`ChatWindow`) reported as having no way to close it. **Deferred at the user's request** — see notes below; needs a repro before diagnosing further, since the code as written does have a close button wired to `closeChat()`.
- [ ] Build real Friends / Watch / Marketplace / Saved / Events / Settings pages to replace the "Coming Soon" placeholders (no backend schema exists yet for any of these either — this is new feature work, not a bug fix).

### 2026-08-22 (2) — `Post.tags` — same "unpopulated list, no field resolver" bug as `User.friends`

**Symptom:** Not yet user-visible — caught during a proactive gap audit, not reported by the user. `tags: [User!]` on `Post` had no GraphQL field resolver, and only the single-post `post(id)` query populated it (`.populate('tags', ...)`); the `feed`, `exploreFeed`, and `userPosts` queries all left it as raw ObjectIds. Because `User!` list elements are non-nullable, this would have silently nulled out the whole `tags` array anywhere else it was queried — identical failure mode to the `User.friends` bug fixed on 2026-08-21. It hadn't surfaced yet only because the frontend's feed fragment doesn't currently request `tags` at all.

**Fix:** added a `Post.tags` field resolver (`backend/src/graphql/resolvers/post.resolvers.ts`) that batch-loads via the existing `userLoader` DataLoader — same pattern as `User.friends` and `Reaction.user` — so it now resolves correctly no matter which query returned the post, instead of depending on every query author remembering to add `.populate('tags')`.

**Note — related but out of scope:** the frontend has no UI to actually tag people when creating a post, and `GET_POST` (the query that already requests `tags`) isn't used anywhere — there's no single-post detail page/route. Fixing the resolver closes the backend correctness gap; building tagging UI and a post detail page is separate feature work.

**Files touched:** `backend/src/graphql/resolvers/post.resolvers.ts`

**Status:** ✅ Fixed, typechecked clean.

### 2026-08-22 (1) — Friends / Watch / Marketplace / Saved / Events / Settings nav links went nowhere

**Symptom (found during gap audit, confirmed against the UI):** Both the top navbar (`Navbar.tsx`'s `NAV_TABS`) and left sidebar (`LeftSidebar.tsx`'s `NAV_ITEMS`) link to `/friends`, `/watch`, `/marketplace`, `/saved`, `/events`, and `/settings`. None of these routes exist in `App.tsx`, which only defines `/`, `/profile/:username`, and `/messages` plus a catch-all `<Route path="*" element={<Navigate to="/" replace />} />`. Clicking any of the six silently redirected back to Home — no 404, no explanation, just an unexplained bounce that looks like a bug even though technically "nothing crashed."

**Root cause:** these are genuinely unbuilt features, not just a missing route wire-up — there's no backend GraphQL schema support for marketplace listings, videos, events, or saved posts either. The nav was built ahead of the features it points to.

**Fix (interim):** added `frontend/src/pages/ComingSoon.tsx`, a reusable placeholder page (keeps the app shell/nav via `AppLayout`, shows an icon + short description + a "Back to Home" button), and routed all six paths to it in `App.tsx`. This stops the silent failure — visiting any of these now clearly tells the person the feature isn't built yet instead of looking broken.

**Not done, and intentionally so:** actually building these six features (schema, resolvers, pages) is substantial new feature work, not a bug fix — logged as its own open item below rather than attempted here.

**Files touched:** `frontend/src/pages/ComingSoon.tsx` (new), `frontend/src/App.tsx`

**Status:** ✅ Interim fix (placeholder pages) done and typechecked clean. Real features remain unbuilt — see "Open items" below.

### 2026-08-21 (4) — Media upload moved off local disk to Cloudinary (production-ready on Vercel)

**Context:** Entry (2) below shipped a working Photo/Video upload pipeline, but explicitly flagged it as **not production-ready** — it used `multer` to write files to this server's local disk, which doesn't persist on Vercel serverless (ephemeral, per-invocation filesystem, no shared volume). This entry replaces that implementation with real cloud object storage, closing that gap.

**What changed:** Switched to **Cloudinary** using the same signed direct-upload pattern real platforms use (Facebook, Instagram, etc.) — the browser uploads the file bytes straight to Cloudinary; our backend never receives them at all, it only issues a short-lived signature proving the request came from a logged-in user.

1. `backend/src/config/cloudinary.ts` (new) — configures the Cloudinary SDK from `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` env vars. Missing config logs a warning and disables uploads instead of crashing the whole server.
2. `backend/src/routes/upload.ts` (rewritten) — was a `multer` disk-storage file receiver at `POST /api/upload`; is now a signature issuer at `POST /api/upload/signature` (still behind `requireAuthHeader`). Returns `{ signature, timestamp, folder, apiKey, cloudName }`, nothing else.
3. `frontend/src/utils/index.ts`'s `uploadMedia()` — now a two-step flow: fetch a signature from our backend, then `POST` the file directly to `https://api.cloudinary.com/v1_1/<cloud>/auto/upload` with that signature. Returns Cloudinary's `secure_url` (CDN-backed) instead of a URL pointing at our own server.
4. `backend/src/index.ts` — dropped `express.static('/uploads')` (nothing to serve locally anymore) and the unused `path` import.
5. `backend/api/_app.ts` — the upload signature route is now mounted here too. It was deliberately **not** mounted before because the old disk-based route couldn't survive on serverless; the new one has no disk dependency at all, so it's safe on Vercel.
6. Removed the now-unused `multer`/`@types/multer` dependencies from `backend/package.json`.

**What you need to do to enable it:** sign up for Cloudinary, grab your **Cloud Name / API Key / API Secret** from the Console dashboard, and set them as env vars — `backend/.env` locally, and Vercel Project Settings → Environment Variables for production. See `backend/.env.example` for the exact variable names. `CLOUDINARY_API_SECRET` must only ever be set server-side.

**Files touched:** `backend/src/config/cloudinary.ts` (new), `backend/src/routes/upload.ts`, `backend/src/index.ts`, `backend/api/_app.ts`, `backend/package.json`, `backend/.env.example`, `frontend/src/utils/index.ts`, `.gitignore`

**Status:** ✅ Fixed, typechecked clean on both `frontend` and `backend`. Requires Cloudinary credentials to be set before upload will actually work — without them the signature endpoint returns a clear 503 instead of a silent failure.

### 2026-08-21 (3) — Check-in used the browser's native `window.prompt()`

**Symptom (reported by user):** Clicking "Check in" in the post composer popped up the browser's default `prompt()` dialog to ask for a location. Flagged as bad UX — native prompts can't be styled, block the main thread, look inconsistent across browsers, and don't fit the app's design language.

**Root cause:** `frontend/src/components/Post/CreatePost.tsx`'s "Check in" button called `window.prompt('Enter your location:')` directly instead of using an in-app UI — a placeholder implementation that was never replaced with a real component. Everything else in the composer (Feeling picker, Visibility picker) already used custom `framer-motion` popovers; check-in was the odd one out.

**Fix:** replaced it with an inline popover matching the existing Feeling/Visibility picker pattern — a small `MapPin`-icon text field with a confirm button, opened directly under the "Check in" button. It autofocuses on open, submits on Enter, closes on outside-click or Escape, and prefills with the current location when reopened to edit it. No native dialogs involved.

**Files touched:** `frontend/src/components/Post/CreatePost.tsx`

**Status:** ✅ Fixed, typechecked clean.

### 2026-08-21 (2) — Friend request notifications had no Accept/Decline action; Photo/Video composer button was decorative

**Symptom (reported by user):** Two separate issues from the same screenshot/testing pass:
1. The bell icon showed a new friend request notification, but there was no way to accept or decline it from the dropdown — clicking the notification did nothing.
2. The "Photo/Video" button in the post composer had no effect when clicked. Asked whether this was a database limitation.

**Root causes:**
1. **Notification dropdown was read-only** (`frontend/src/components/Sidebar/Navbar.tsx`): each notification just rendered `n.message` as text. The backend already had working `acceptFriendRequest` and `declineFriendRequest` mutations (used elsewhere on the Profile page), and the frontend already had an `ACCEPT_FRIEND_REQUEST` mutation defined — but neither was wired into the notification list, and `DECLINE_FRIEND_REQUEST` wasn't even defined on the frontend at all.
   - *Fix:* added `DECLINE_FRIEND_REQUEST` to `lib/graphql.ts`, and added Confirm/Delete buttons under any `FRIEND_REQUEST`-type notification that call the accept/decline mutations, refetch notifications, and swap to an "Accepted"/"Declined" status inline.
2. **Photo/Video button had no `onClick` at all** (`frontend/src/components/Post/CreatePost.tsx`) — it was pure UI chrome. This is **not a database limitation**: `Post.media` was already a fully-modeled array (`url`, `type`, `thumbnail`, `width`, `height`, `duration`) in both the Mongoose schema and the GraphQL schema, `createPost` already accepted a `media` array and would happily save it, and `PostCard.tsx` already had full rendering logic for image/video grids. The entire pipeline existed except for two things: nothing on the frontend ever opened a file picker or called `createPost` with `media` populated, and — the actual missing piece — **there was no upload endpoint anywhere to turn a picked file into a URL**. `multer` was sitting in `backend/package.json` as an unused dependency; a `scalar Upload` was declared in the GraphQL schema but never given a resolver or used by any mutation.
   - *Fix (v1):* added a REST upload endpoint using `multer` disk storage, serving files back out via `express.static('/uploads')`. **Superseded by entry (4) above**, which replaces local disk storage with Cloudinary so this actually works in production on Vercel.

**Files touched:** `frontend/src/lib/graphql.ts`, `frontend/src/components/Sidebar/Navbar.tsx`, `frontend/src/components/Post/CreatePost.tsx`, `frontend/src/utils/index.ts`, `backend/src/lib/authMiddleware.ts` (new), `backend/src/index.ts`

**Status:** ✅ Notification accept/decline fixed and typechecked. Photo/Video upload: see entry (4) for the production-ready version.

### Open items to verify next
- [ ] **Chat popup close button** — user reports the floating chat window (`ChatPanel`/`ChatWindow`) has no way to close it. Deferred at their request. Note for whoever picks this up: the code as currently written *does* have a close button (`aria-label="Close chat"`, wired to `closeChat()` in the UI store, which unmounts the panel) — so this needs a fresh repro/screenshot before diagnosing further, since the described symptom doesn't match what's in the code. Possibilities to check: a stale build, a CSS z-index/overflow issue hiding the button, or a different chat entry point than `ChatPanel.tsx`.
- [ ] Build real Friends / Watch / Marketplace / Saved / Events / Settings pages — currently "Coming Soon" placeholders (see 2026-08-22 (1)). No backend schema exists yet for marketplace listings, videos, events, or saved posts, so this is new feature work each time, not a quick fix.
- [ ] Notification click-through (tapping a non-friend-request notification, e.g. `POST_LIKE`/`POST_COMMENT`, to navigate to the relevant post) is still not implemented — only the friend-request action buttons were added.
- [x] ~~Audit other non-nullable `User!`/`Post!` list fields for the same "lean doc without a field resolver" pattern~~ — done for `Post.tags` (2026-08-22 (2)); `Reaction.user`, `Comment.author`, and `Conversation.participants` were checked and are already populated/resolved correctly everywhere they're used.
- [ ] No automated test currently guards against a populated-list field silently returning `null`; consider a resolver-level integration test for `GET_USER` with a seeded user that has friends, and one for `feed`/`post` with a seeded post that has tags.
- [ ] Avatar component has no visual regression/story coverage, so size-variant mismatches like this aren't caught until manual QA.
- [ ] Uploaded media currently has no server-side validation beyond what Cloudinary's client SDK enforces (file type/size); consider an `eager` transformation or moderation add-on if user-generated content moderation becomes a concern.

### 2026-08-21 (1) — Profile page: avatar off-center + Friends tab empty despite correct count

**Symptom:** On `/profile/:username`, the avatar photo rendered small and shifted toward the top-left corner of its circular frame instead of filling it, and the Friends tab showed "No friends to show" even though the header correctly read "9 friends".

**Root causes:**
1. **Avatar sizing mismatch** (`frontend/src/components/UI/Avatar.tsx`): the `xl` size variant rendered at `64px` (`w-16 h-16`), but `Profile.tsx` wrapped it in a hard-coded `112px` (`w-28 h-28`) frame div with no flex centering. The smaller avatar was left-aligned inside the larger frame instead of filling or centering within it.
   - *Fix:* resized the `xl` variant to `112px` (`w-28 h-28`) to match the frame, and changed the frame div in `Profile.tsx` to size itself to its content (`inline-flex`, no hard-coded `w-28 h-28`) instead of double-hard-coding dimensions in two places.
2. **`User.friends` GraphQL field had no resolver** (`backend/src/graphql/resolvers/auth.resolvers.ts`): the schema declares `friends: [User!]`, but with `.lean()` queries `parent.friends` is just an array of raw Mongo `ObjectId`s, not populated documents. With no field resolver, GraphQL's default resolver returned those raw ObjectIds and tried to resolve each one as a full `User`. Every non-nullable `User` field (`username: String!`, `firstName: String!`, `isOnline: Boolean!`, etc.) resolved to `null` on an ObjectId, which per GraphQL null-propagation rules nulled out the entire `friends` list — while `friendsCount` (a separate resolver that just does `parent.friends?.length`) stayed correct since it only needs the array length, not populated docs.
   - *Fix:* added a `friends` field resolver on `User` that batch-loads real user docs via the existing (previously unused for this purpose) `loaders.userLoader` DataLoader, avoiding an N+1 query.

**Files touched:** `frontend/src/components/UI/Avatar.tsx`, `frontend/src/pages/Profile.tsx`, `backend/src/graphql/resolvers/auth.resolvers.ts`

**Status:** ✅ Fixed, typechecked clean on both `frontend` and `backend`.
