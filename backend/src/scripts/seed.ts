import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Post } from '../models/Post';
import { Story } from '../models/Story';
import { Conversation, Message } from '../models/Message';

const AVATARS = Array.from({ length: 8 }, (_, i) => `https://i.pravatar.cc/150?img=${i + 1}`);
const POST_IMAGES = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&q=80',
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=80',
  'https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?w=600&q=80',
  'https://images.unsplash.com/photo-1518791841217-8f162f1912da?w=600&q=80',
];
const POST_CONTENTS = [
  "Just got back from the most amazing hike! Nature never fails to impress 🏔️ #adventure",
  "Trying out a new recipe tonight. Wish me luck! 🍳 Anyone have good pasta suggestions?",
  "Can't believe it's already Friday. This week flew by! Happy weekend everyone 🎉",
  "Some days you just need a good coffee and good company ☕ Grateful for the small things.",
  "Excited to share that I just got promoted! Hard work really does pay off 🚀 #grateful",
  "Anyone else feel like they need a vacation from their vacation? 😅 Back to reality!",
  "Grateful for all the amazing people in my life. You know who you are ❤️",
  "Just finished an incredible book. My mind is blown. Highly recommend 📚 #booklover",
  "Golden hour hits different when you're at the beach 🌅 Living for these moments.",
  "Sunday = meal prep day! Getting organized for the week ahead 💪 #healthyeating",
];

async function seed() {
  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    console.error('❌ MONGODB_URI not set in .env');
    process.exit(1);
  }

  console.log('🔗 Connecting to MongoDB Atlas…');
  await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 10000 });
  console.log('✅ Connected');

  // Wipe existing seed data
  await Promise.all([
    User.deleteMany({}),
    Post.deleteMany({}),
    Story.deleteMany({}),
    Conversation.deleteMany({}),
    Message.deleteMany({}),
  ]);
  console.log('🧹 Cleared existing data');

  // ── Create users (password will be hashed by pre-save hook) ───────────────
  const usersRaw = [
    { username: 'demo',     email: 'demo@example.com',  password: 'Password1', firstName: 'Demo',   lastName: 'User',    avatar: AVATARS[0], bio: 'This is the demo account!', location: 'San Francisco, CA', isVerified: true, isOnline: true },
    { username: 'alice_j',  email: 'alice@example.com', password: 'Password1', firstName: 'Alice',  lastName: 'Johnson', avatar: AVATARS[1], bio: 'Photographer & traveler 📸', location: 'New York, NY' },
    { username: 'bob_smith',email: 'bob@example.com',   password: 'Password1', firstName: 'Bob',    lastName: 'Smith',   avatar: AVATARS[2], bio: 'Software engineer | Coffee addict', location: 'Austin, TX' },
    { username: 'carol_w',  email: 'carol@example.com', password: 'Password1', firstName: 'Carol',  lastName: 'White',   avatar: AVATARS[3], bio: 'Fitness enthusiast 💪', location: 'Los Angeles, CA' },
    { username: 'david_b',  email: 'david@example.com', password: 'Password1', firstName: 'David',  lastName: 'Brown',   avatar: AVATARS[4], bio: 'Music producer 🎵', location: 'Nashville, TN' },
    { username: 'emma_d',   email: 'emma@example.com',  password: 'Password1', firstName: 'Emma',   lastName: 'Davis',   avatar: AVATARS[5], bio: 'Chef & food blogger 🍴', location: 'Chicago, IL' },
  ];

  const users: any[] = [];
  for (const u of usersRaw) {
    const doc = new User(u);
    await doc.save(); // triggers password hashing
    users.push(doc);
  }
  console.log(`👤 Created ${users.length} users`);

  // ── Establish friendships ─────────────────────────────────────────────────
  const [demo, alice, bob, carol, david, emma] = users;
  const friendPairs = [
    [demo, alice], [demo, bob], [demo, carol],
    [alice, bob], [bob, carol], [carol, david], [david, emma],
  ];
  for (const [a, b] of friendPairs) {
    await User.findByIdAndUpdate(a._id, { $addToSet: { friends: b._id } });
    await User.findByIdAndUpdate(b._id, { $addToSet: { friends: a._id } });
  }
  console.log('🤝 Connected friends');

  // ── Create posts ──────────────────────────────────────────────────────────
  const postDocs: any[] = [];
  for (let i = 0; i < users.length; i++) {
    for (let j = 0; j < 4; j++) {
      const withImage = Math.random() > 0.35;
      const reactionTypes = ['like', 'love', 'haha', 'wow'];
      const reactors = users
        .filter(() => Math.random() > 0.5)
        .slice(0, 3);

      const post = new Post({
        author: users[i]._id,
        content: POST_CONTENTS[(i * 4 + j) % POST_CONTENTS.length],
        media: withImage
          ? [{ url: POST_IMAGES[j % POST_IMAGES.length], type: 'image' }]
          : [],
        visibility: 'public',
        reactions: reactors.map(r => ({
          user: r._id,
          type: reactionTypes[Math.floor(Math.random() * reactionTypes.length)],
          createdAt: new Date(),
        })),
        viewCount: Math.floor(Math.random() * 800),
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      });
      await post.save();
      postDocs.push(post);
    }
  }
  console.log(`📝 Created ${postDocs.length} posts`);

  // ── Create stories ────────────────────────────────────────────────────────
  const storyCount = await Story.insertMany(
    users.map((u, i) => ({
      author: u._id,
      media: { url: POST_IMAGES[i % POST_IMAGES.length], type: 'image' },
      text: ['Have a great day! ✨', 'Living my best life 🌟', 'Good vibes only 🙏', 'Grateful today ❤️', 'Smile! 😊', 'Hello world 👋'][i % 6],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      isActive: true,
    }))
  );
  console.log(`📸 Created ${storyCount.length} stories`);

  // ── Create a sample conversation ──────────────────────────────────────────
  const conv = await Conversation.create({
    participants: [demo._id, alice._id],
    isGroup: false,
    lastMessageAt: new Date(),
  });
  const msgs = [
    { sender: alice._id, content: "Hey Demo! How's it going? 👋", delay: 5 },
    { sender: demo._id,  content: "Hey Alice! Doing great, thanks for asking 😊 How about you?", delay: 3 },
    { sender: alice._id, content: "Pretty good! Loving the new SocialApp 🎉 Have you seen the stories feature?", delay: 1 },
    { sender: demo._id,  content: "Yeah it's amazing! Just posted my first one.", delay: 0 },
  ];
  for (const m of msgs) {
    await Message.create({
      conversation: conv._id,
      sender: m.sender,
      content: m.content,
      createdAt: new Date(Date.now() - m.delay * 60 * 1000),
    });
  }
  await Conversation.findByIdAndUpdate(conv._id, { lastMessage: (await Message.findOne({ conversation: conv._id }).sort({ createdAt: -1 }))!._id });
  console.log('💬 Created sample conversation');

  console.log('\n✅ Seed complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Email:    demo@example.com');
  console.log('🔑 Password: Password1');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
