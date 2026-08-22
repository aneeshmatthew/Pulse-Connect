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
   - *Fix:* added a REST upload endpoint (`backend/src/routes/upload.ts`, mounted at `POST /api/upload` in `backend/src/index.ts`) using `multer` disk storage + JWT auth (`backend/src/lib/authMiddleware.ts`), serving saved files back out via `express.static('/uploads')`. Wired the frontend composer with a hidden file input, upload progress/preview grid, and remove buttons (`utils/index.ts`'s new `uploadMedia()` helper posts to this endpoint and returns `{ url, type }`, which then goes straight into the existing `createPost` mutation's `media` field).
   - **Caveat — this only works for the standalone/self-hosted backend (`npm run dev`, or `node dist/index.js` on a normal host).** It will **not** persist on the Vercel serverless deployment (`backend/api/`): serverless function instances have an ephemeral, per-invocation filesystem with no shared volume, so a file saved in one invocation isn't guaranteed to exist for the next request that tries to serve it. Production deployment on Vercel needs this endpoint swapped for real object storage (S3, Cloudinary, Vercel Blob, R2, etc.), typically via signed/presigned upload URLs so the browser uploads directly to the bucket instead of through the API function. This is called out in a code comment at the top of `routes/upload.ts`.

**Files touched:** `frontend/src/lib/graphql.ts`, `frontend/src/components/Sidebar/Navbar.tsx`, `frontend/src/components/Post/CreatePost.tsx`, `frontend/src/utils/index.ts`, `backend/src/routes/upload.ts` (new), `backend/src/lib/authMiddleware.ts` (new), `backend/src/index.ts`, `.gitignore`

**Status:** ✅ Notification accept/decline fixed and typechecked. ⚠️ Photo/Video upload fixed and typechecked for local/self-hosted dev; **not yet production-ready on the Vercel deployment** — needs an object-storage provider wired in before shipping.

### Open items to verify next
- [ ] Wire a real object-storage provider (S3/Cloudinary/Vercel Blob/R2) for `POST /api/upload` before relying on media uploads in the Vercel-deployed backend; until then, uploaded media will work locally but may 404 in production.
- [ ] `backend/api/_app.ts` (the Vercel serverless entrypoint) does not mount the new upload route at all yet — it was intentionally left off rather than shipping a route that silently loses files in production.
- [ ] Notification click-through (tapping a non-friend-request notification, e.g. `POST_LIKE`/`POST_COMMENT`, to navigate to the relevant post) is still not implemented — only the friend-request action buttons were added.
- [ ] Audit other non-nullable `User!`/`Post!` list fields (e.g. `Post.reactions[].user`, `Comment.author`) for the same "lean doc without a field resolver" pattern — the friends bug suggests this may not be isolated.
- [ ] No automated test currently guards against a populated-list field silently returning `null`; consider a resolver-level integration test for `GET_USER` with a seeded user that has friends.
- [ ] Avatar component has no visual regression/story coverage, so size-variant mismatches like this aren't caught until manual QA.

### 2026-08-21 (1) — Profile page: avatar off-center + Friends tab empty despite correct count

**Symptom:** On `/profile/:username`, the avatar photo rendered small and shifted toward the top-left corner of its circular frame instead of filling it, and the Friends tab showed "No friends to show" even though the header correctly read "9 friends".

**Root causes:**
1. **Avatar sizing mismatch** (`frontend/src/components/UI/Avatar.tsx`): the `xl` size variant rendered at `64px` (`w-16 h-16`), but `Profile.tsx` wrapped it in a hard-coded `112px` (`w-28 h-28`) frame div with no flex centering. The smaller avatar was left-aligned inside the larger frame instead of filling or centering within it.
   - *Fix:* resized the `xl` variant to `112px` (`w-28 h-28`) to match the frame, and changed the frame div in `Profile.tsx` to size itself to its content (`inline-flex`, no hard-coded `w-28 h-28`) instead of double-hard-coding dimensions in two places.
2. **`User.friends` GraphQL field had no resolver** (`backend/src/graphql/resolvers/auth.resolvers.ts`): the schema declares `friends: [User!]`, but with `.lean()` queries `parent.friends` is just an array of raw Mongo `ObjectId`s, not populated documents. With no field resolver, GraphQL's default resolver returned those raw ObjectIds and tried to resolve each one as a full `User`. Every non-nullable `User` field (`username: String!`, `firstName: String!`, `isOnline: Boolean!`, etc.) resolved to `null` on an ObjectId, which per GraphQL null-propagation rules nulled out the entire `friends` list — while `friendsCount` (a separate resolver that just does `parent.friends?.length`) stayed correct since it only needs the array length, not populated docs.
   - *Fix:* added a `friends` field resolver on `User` that batch-loads real user docs via the existing (previously unused for this purpose) `loaders.userLoader` DataLoader, avoiding an N+1 query.

**Files touched:** `frontend/src/components/UI/Avatar.tsx`, `frontend/src/pages/Profile.tsx`, `backend/src/graphql/resolvers/auth.resolvers.ts`

**Status:** ✅ Fixed, typechecked clean on both `frontend` and `backend`.
