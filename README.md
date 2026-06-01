# SocialApp — Full-Stack Facebook-Style Social Network

A production-ready, full-stack social media platform built with TypeScript, React, GraphQL, WebSockets, and MongoDB. Features real-time streaming, virtual scroll, and a complete Facebook-like UX.

---

## 🗂️ Project Structure

```
socialapp/
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
cd socialapp
npm install
npm install --workspace=backend
npm install --workspace=frontend
```

### 2. Configure Environment

```bash
# backend/.env (already created)
MONGODB_URI=mongodb://localhost:27017/socialapp
JWT_SECRET=your-super-secret-key
PORT=4000
FRONTEND_URL=http://localhost:5173
```

### 3. Seed Demo Data

```bash
cd backend
npm run seed
# Creates 6 demo users, posts, stories, and a conversation
# Login: demo@example.com / Password1
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
