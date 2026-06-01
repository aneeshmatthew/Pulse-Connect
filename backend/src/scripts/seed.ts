import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Post } from '../models/Post';
import { Comment } from '../models/Comment';
import { Story } from '../models/Story';
import { Conversation, Message } from '../models/Message';

// ── Assets ────────────────────────────────────────────────────────────────────

const AVATARS = [
  'https://i.pravatar.cc/150?img=1',  // demo
  'https://i.pravatar.cc/150?img=5',  // alice
  'https://i.pravatar.cc/150?img=8',  // bob
  'https://i.pravatar.cc/150?img=11', // carol
  'https://i.pravatar.cc/150?img=15', // david
  'https://i.pravatar.cc/150?img=20', // emma
  'https://i.pravatar.cc/150?img=25', // frank
  'https://i.pravatar.cc/150?img=32', // grace
  'https://i.pravatar.cc/150?img=44', // henry
  'https://i.pravatar.cc/150?img=57', // iris
];

const IMAGES = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=700&q=80', // mountain
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=700&q=80', // forest
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=700&q=80', // valley
  'https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?w=700&q=80', // trees
  'https://images.unsplash.com/photo-1518791841217-8f162f1912da?w=700&q=80', // cat
  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=700&q=80', // dog
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=700&q=80', // food
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=700&q=80', // restaurant
  'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=700&q=80', // paris
  'https://images.unsplash.com/photo-1538970272646-f61fabb3a8a2?w=700&q=80', // tokyo
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=700&q=80', // travel
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=700&q=80', // café
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=700&q=80', // workout
  'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=700&q=80', // yoga
  'https://images.unsplash.com/photo-1511988617509-a57c8a288659?w=700&q=80', // friends
  'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=700&q=80', // party
  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=700&q=80', // concert
  'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=700&q=80', // apples
  'https://images.unsplash.com/photo-1464219551459-ac14ae01fbe0?w=700&q=80', // beach
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=700&q=80', // sunset
];

const POST_TEMPLATES = [
  // Travel
  { content: "Just landed in Tokyo 🇯🇵 The city is absolutely electric at night. First time here and I'm already in love — the food, the lights, the people! Where should I go first?", imageIdx: 9, feeling: '😍 loved', location: 'Tokyo, Japan' },
  { content: "Paris never disappoints 🗼 Sat by the Seine for two hours just watching the world go by. Sometimes travel teaches you to slow down.", imageIdx: 8, location: 'Paris, France' },
  { content: "Weekend beach trip was exactly what I needed 🌊 Salt water fixes everything. Back to reality Monday...", imageIdx: 18 },
  { content: "Golden hour at the valley 🌄 Woke up at 5am for this shot. Worth every second of lost sleep.", imageIdx: 2, feeling: '😊 happy' },
  { content: "Mountain hiking day 3 complete! My legs hate me but my soul is full 🏔️ #adventure #hiking #nature", imageIdx: 0, location: 'Rocky Mountains' },
  { content: "Forest bathing is a real thing and I'm fully converted 🌲 Two hours in the woods and I feel like a new person.", imageIdx: 1 },
  { content: "Sunset chasing should be a professional sport. I'd be world champion 🌅", imageIdx: 19 },
  { content: "The ocean has a way of making your problems feel small 🌊 Needed this reset badly.", imageIdx: 18, feeling: '🙏 grateful' },

  // Food
  { content: "Made homemade pasta from scratch for the first time 🍝 It took 3 hours and looked nothing like the tutorial but honestly? It slapped.", imageIdx: 6, feeling: '🥳 celebrating' },
  { content: "This restaurant has been on my list for 2 years. Finally made it. The tasting menu was 9 courses and I finished every single one 🍴", imageIdx: 7, location: 'The French Laundry' },
  { content: "Sunday morning coffee ritual ☕ Some things are non-negotiable.", imageIdx: 11 },
  { content: "Tried making sourdough bread again. This time it actually rose!! Week 6 of this obsession 🍞", imageIdx: 17 },
  { content: "Meal prepped for the whole week 💪 Future me is going to be so grateful. Present me is exhausted.", imageIdx: 6 },

  // Fitness & Wellness
  { content: "6 months of consistent training and I finally hit my goal weight 🏋️ Not about the number — about how strong and alive I feel every single day.", imageIdx: 12, feeling: '💪 motivated' },
  { content: "Morning yoga before the city wakes up. The silence is sacred 🧘", imageIdx: 13, feeling: '🙏 grateful' },
  { content: "PR on deadlifts today 💥 The gym is therapy and the results are just the side effect.", imageIdx: 12 },
  { content: "Half marathon done ✅ 13.1 miles. 2 hours 4 minutes. A year ago I could barely run 1K. Time and consistency change everything.", feeling: '🥳 celebrating', location: 'Central Park, NYC' },

  // Life & Thoughts
  { content: "Turned 30 today 🎂 Honestly? The best thing that's happened to me. I care less about the wrong things and so much more about the right ones.", feeling: '🥳 celebrating' },
  { content: "Had a conversation with my 80-year-old neighbor today. She told me she wished she'd worried less and laughed more. Taking notes.", feeling: '🤔 thoughtful' },
  { content: "Reminder: you don't have to have it all figured out. Nobody does. We're all just winging it with varying levels of confidence 😅" },
  { content: "Cleaned out my apartment today and donated 4 boxes of stuff. Why does getting rid of things feel so liberating? Less really is more.", feeling: '😊 happy' },
  { content: "Book recommendation: just finished 'The Midnight Library' and I'm still thinking about it 3 days later 📚 Some stories change the way you see choices." },
  { content: "Called my parents just to chat today, not for any reason. Watched the silence on both ends turn into an hour of stories. Do this more.", feeling: '😍 loved' },
  { content: "Sometimes the best plan is no plan. Drove with no destination today and stumbled across the most beautiful little town 🏡" },
  { content: "The art of doing nothing is underrated. Spent Sunday on the couch, zero guilt. My brain needed the downtime.", feeling: '😊 happy' },

  // Friends & Social
  { content: "Friend group reunion after 2 years 🥂 Some friendships don't need maintenance — you just pick up right where you left off.", imageIdx: 14, feeling: '🥳 celebrating' },
  { content: "Birthday dinner for my best friend of 15 years 🎉 So grateful for the people who've seen all your versions and stayed.", imageIdx: 15, feeling: '😍 loved' },
  { content: "Live music last night was unreal 🎵 There's something about watching someone pour their soul into their art that resets something in you.", imageIdx: 16, location: 'Blue Note Jazz Club' },
  { content: "House party at my place tonight turned into a 6-hour deep conversation about everything and nothing. Those are the best kinds.", imageIdx: 15 },

  // Work & Growth
  { content: "Just shipped a feature I've been building for 3 months 🚀 The feeling of watching something you built go live never gets old.", feeling: '🥳 celebrating' },
  { content: "Gave my first public talk today 😤 My hands were shaking the whole time. But I did it. Next time will be better.", feeling: '💪 motivated' },
  { content: "Switched careers at 34. Everyone told me it was crazy. Six months in — it was the sanest thing I've ever done.", feeling: '😊 happy' },
  { content: "Rejected from a job I really wanted today. Spent an hour feeling sorry for myself, then updated my portfolio. Onto the next one 💪" },

  // Pets
  { content: "This is Oliver. He has claimed every single pillow in the house and somehow I'm okay with it 🐱", imageIdx: 4 },
  { content: "Adopted this boy from the shelter 3 weeks ago and I genuinely don't know what I did without him 🐶 His name is Biscuit and he's perfect.", imageIdx: 5, feeling: '😍 loved' },
  { content: "My cat has been sitting on my laptop keyboard for 20 minutes. Productivity: zero. Happiness: immeasurable 🐈", imageIdx: 4 },
  { content: "Biscuit discovered the garden today and lost his entire mind 🌱 Pure joy in dog form.", imageIdx: 5 },

  // Tech & Interests
  { content: "Started learning to code 6 months ago. Built my first full web app today 💻 It's ugly and barely works but it's MINE.", feeling: '🥳 celebrating' },
  { content: "The more I learn, the more I realize how much I don't know. Comfortable with that feeling now — it means I'm growing 🧠" },
  { content: "Unplugged for 48 hours this weekend. No phone, no social media. It felt terrifying and then incredibly peaceful. Try it." },
  { content: "Started journaling again. Three pages, stream of consciousness, every morning. It's the cheapest therapy that actually works 📝", feeling: '🙏 grateful' },

  // Misc / Funny
  { content: "Accidentally made eye contact with a pigeon for way too long today and now I think we have an understanding 🐦" },
  { content: "My Spotify Wrapped is 90% lo-fi hip hop and 10% embarrassing early 2000s pop. I stand by all of it." },
  { content: "Caught myself narrating my own life in third person while cooking dinner. 'And then he added the garlic...' I need more human contact 😂" },
  { content: "Plot twist: the 'quick errand' took 3 hours. Every. Single. Time. This is my villain origin story." },
  { content: "Pro tip: if you want to feel productive, reorganize your desk. Your actual to-do list hasn't moved but somehow you feel better 📋" },
  { content: "Ordered 'just a salad' at lunch and spent $28. Salads have no business being that expensive. And it was good. I'm furious." },
  { content: "Walked into the store for one thing. Left with eleven things. Not the one thing. Classic." },
  { content: "The audacity of Mondays. Genuinely cannot believe it's already another week. Time is a flat circle and we're all just here 😤" },
];

const COMMENT_BANK = [
  "This is beautiful! 😍",
  "Okay I'm so jealous right now 😩",
  "This made my day ❤️",
  "Need the full story!!",
  "Goals honestly 🙏",
  "So proud of you! 🎉",
  "This is everything 👏",
  "I felt this deeply",
  "You're living the dream",
  "Tag me next time!! 😤",
  "This is the content I'm here for",
  "Screenshotted this for motivation",
  "Wait this is hilarious 😂",
  "Can confirm, was there, it was incredible",
  "Sending love your way ❤️",
  "Where is this?? Need to go asap",
  "The caption + the photo = perfect",
  "Didn't expect to need this today but here we are",
  "Following for more of this energy",
  "Okay but WHERE did you get that",
];

const REACTION_TYPES = ['like', 'love', 'haha', 'wow', 'sad', 'angry'] as const;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickSome<T>(arr: T[], min: number, max: number): T[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function daysAgo(days: number, jitterHours = 12): Date {
  const jitter = (Math.random() - 0.5) * jitterHours * 3600 * 1000;
  return new Date(Date.now() - days * 24 * 3600 * 1000 + jitter);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function seed() {
  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) { console.error('❌ MONGODB_URI not set'); process.exit(1); }

  console.log('🔗 Connecting to MongoDB…');
  await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 15000 });
  console.log('✅ Connected\n');

  // Wipe
  await Promise.all([
    User.deleteMany({}), Post.deleteMany({}), Comment.deleteMany({}),
    Story.deleteMany({}), Conversation.deleteMany({}), Message.deleteMany({}),
  ]);
  console.log('🧹 Cleared existing data');

  // ── 1. Users ─────────────────────────────────────────────────────────────
  const userDefs = [
    { username: 'demo',      email: 'demo@example.com',   firstName: 'Demo',    lastName: 'User',    bio: 'Demo account — feel free to explore everything!', location: 'San Francisco, CA', isVerified: true, isOnline: true },
    { username: 'alice_j',   email: 'alice@example.com',  firstName: 'Alice',   lastName: 'Johnson', bio: 'Photographer & world traveler 📸✈️', location: 'New York, NY' },
    { username: 'bob_smith', email: 'bob@example.com',    firstName: 'Bob',     lastName: 'Smith',   bio: 'Full-stack dev by day, home chef by night 💻🍳', location: 'Austin, TX' },
    { username: 'carol_w',   email: 'carol@example.com',  firstName: 'Carol',   lastName: 'White',   bio: 'Fitness coach & wellness advocate 💪', location: 'Los Angeles, CA' },
    { username: 'david_b',   email: 'david@example.com',  firstName: 'David',   lastName: 'Brown',   bio: 'Music producer & vinyl collector 🎵', location: 'Nashville, TN' },
    { username: 'emma_d',    email: 'emma@example.com',   firstName: 'Emma',    lastName: 'Davis',   bio: 'Chef, food blogger, professional eater 🍴', location: 'Chicago, IL' },
    { username: 'frank_m',   email: 'frank@example.com',  firstName: 'Frank',   lastName: 'Miller',  bio: 'Startup founder | coffee snob | dog dad ☕🐕', location: 'Seattle, WA' },
    { username: 'grace_l',   email: 'grace@example.com',  firstName: 'Grace',   lastName: 'Lee',     bio: 'UX designer & plant lady 🌿', location: 'Portland, OR' },
    { username: 'henry_k',   email: 'henry@example.com',  firstName: 'Henry',   lastName: 'Kim',     bio: 'Architect who draws for fun and profit 🏛️', location: 'Boston, MA' },
    { username: 'iris_p',    email: 'iris@example.com',   firstName: 'Iris',    lastName: 'Park',    bio: 'Yoga instructor & mindfulness writer 🧘', location: 'Denver, CO' },
  ];

  const users: any[] = [];
  for (let i = 0; i < userDefs.length; i++) {
    const doc = new User({
      ...userDefs[i],
      password: 'Password1',
      avatar: AVATARS[i] ?? AVATARS[0],
    });
    await doc.save();
    users.push(doc);
  }
  console.log(`👤 Created ${users.length} users`);

  // ── 2. Friendships (dense social graph) ───────────────────────────────────
  const [demo, alice, bob, carol, david, emma, frank, grace, henry, iris] = users;

  const friendPairs = [
    // demo is friends with everyone for maximum feed content
    [demo, alice], [demo, bob], [demo, carol], [demo, david],
    [demo, emma], [demo, frank], [demo, grace], [demo, henry], [demo, iris],
    // Others also interconnected
    [alice, bob], [alice, carol], [alice, grace],
    [bob, frank], [bob, henry],
    [carol, emma], [carol, iris],
    [david, frank], [david, henry],
    [emma, grace], [emma, iris],
    [frank, henry], [grace, iris],
  ];

  for (const [a, b] of friendPairs) {
    await Promise.all([
      User.findByIdAndUpdate(a._id, { $addToSet: { friends: b._id } }),
      User.findByIdAndUpdate(b._id, { $addToSet: { friends: a._id } }),
    ]);
  }
  console.log(`🤝 Created ${friendPairs.length} friendships`);

  // ── 3. Posts — 60+ posts spread over 14 days ──────────────────────────────
  const postDocs: any[] = [];

  for (let i = 0; i < POST_TEMPLATES.length; i++) {
    const tmpl = POST_TEMPLATES[i];
    const author = users[i % users.length];
    const reactors = pickSome(users.filter((u: any) => u._id.toString() !== author._id.toString()), 1, 7);

    const post = new Post({
      author: author._id,
      content: tmpl.content,
      media: (tmpl as any).imageIdx !== undefined
        ? [{ url: IMAGES[(tmpl as any).imageIdx], type: 'image' }]
        : [],
      visibility: 'public',
      location: (tmpl as any).location,
      feeling: (tmpl as any).feeling,
      reactions: reactors.map((r: any) => ({
        user: r._id,
        type: pick(REACTION_TYPES as unknown as string[]),
        createdAt: new Date(),
      })),
      viewCount: Math.floor(Math.random() * 1200) + 50,
      createdAt: daysAgo(Math.floor(i / 4), 8), // spread over ~14 days
    });
    await post.save();
    postDocs.push(post);
  }
  console.log(`📝 Created ${postDocs.length} posts`);

  // ── 4. Comments on a third of posts ───────────────────────────────────────
  let commentCount = 0;
  for (const post of postDocs) {
    if (Math.random() > 0.35) continue; // skip ~35%
    const commenters = pickSome(users, 1, 4);
    for (const commenter of commenters) {
      const comment = await Comment.create({
        post: post._id,
        author: commenter._id,
        content: pick(COMMENT_BANK),
        createdAt: new Date(post.createdAt.getTime() + Math.random() * 3600 * 1000 * 6),
      });
      await Post.findByIdAndUpdate(post._id, { $push: { comments: comment._id } });
      commentCount++;

      // 25% chance of a reply
      if (Math.random() < 0.25) {
        const replier = pick(users.filter((u: any) => u._id.toString() !== commenter._id.toString()));
        const reply = await Comment.create({
          post: post._id,
          author: replier._id,
          content: pick(COMMENT_BANK),
          parentComment: comment._id,
          createdAt: new Date(comment.createdAt.getTime() + Math.random() * 1800 * 1000),
        });
        await Comment.findByIdAndUpdate(comment._id, { $push: { replies: reply._id } });
        commentCount++;
      }
    }
  }
  console.log(`💬 Created ${commentCount} comments`);

  // ── 5. Stories ────────────────────────────────────────────────────────────
  const storyTexts = [
    'Have an amazing day! ✨', 'Living my best life 🌟', 'Good vibes only 🙏',
    'Grateful for everything ❤️', 'Smiling today 😊', 'Hello from here 👋',
    'Make it count 💪', 'Chase the light 🌅', 'Stay curious 🧠', 'Be kind 🌿',
  ];
  await Story.insertMany(
    users.map((u: any, i: number) => ({
      author: u._id,
      media: { url: IMAGES[i % IMAGES.length], type: 'image' },
      text: storyTexts[i % storyTexts.length],
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      isActive: true,
    }))
  );
  console.log(`📸 Created ${users.length} stories`);

  // ── 6. Sample conversation ────────────────────────────────────────────────
  const conv = await Conversation.create({
    participants: [demo._id, alice._id],
    isGroup: false,
    lastMessageAt: new Date(),
  });

  const msgThreads = [
    { sender: alice._id, content: "Hey Demo! Welcome to SocialApp 👋 How's it going?",          minsAgo: 12 },
    { sender: demo._id,  content: "Alice! Great to be here 😊 The feed looks amazing already.",  minsAgo: 10 },
    { sender: alice._id, content: "Right?! Make sure you check out the stories, they're so fun", minsAgo: 9  },
    { sender: demo._id,  content: "Just added mine! Did you see the virtual scroll on the feed? So smooth 🔥", minsAgo: 7 },
    { sender: alice._id, content: "Yes!! Loads instantly no matter how far you scroll. Impressive tech 💻", minsAgo: 5  },
    { sender: demo._id,  content: "Let me know if you want to grab coffee and catch up properly ☕", minsAgo: 2  },
    { sender: alice._id, content: "100%! This weekend? 🙌",                                       minsAgo: 1  },
  ];

  let lastMsg: any;
  for (const m of msgThreads) {
    lastMsg = await Message.create({
      conversation: conv._id,
      sender: m.sender,
      content: m.content,
      createdAt: new Date(Date.now() - m.minsAgo * 60 * 1000),
    });
  }
  await Conversation.findByIdAndUpdate(conv._id, { lastMessage: lastMsg._id, lastMessageAt: lastMsg.createdAt });
  console.log('💌 Created sample conversation');

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n✅ Seed complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  👤 Users:         ${users.length}`);
  console.log(`  📝 Posts:         ${postDocs.length}  (enough to test virtual scroll)`);
  console.log(`  💬 Comments:      ${commentCount}`);
  console.log(`  📸 Stories:       ${users.length}`);
  console.log(`  🤝 Friendships:   ${friendPairs.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  📧 Email:         demo@example.com');
  console.log('  🔑 Password:      Password1');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message ?? err);
  mongoose.disconnect().finally(() => process.exit(1));
});
