import "reflect-metadata";
import { DataSource } from "typeorm";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../../../.env") });

const topicIcons: Record<string, string> = {
  "Antisemitism Monitoring": "🛡️",
  "Public Diplomacy": "🌐",
  "Social Media Analysis": "📱",
  "News & Media Coverage": "📰",
  "Academic Discourse": "🎓",
  "Government & Policy": "🏛️",
  "International Organizations": "🤝",
  "Community Responses": "💬",
};

const topicsWithKeywords: Record<string, string[]> = {
  "Antisemitism Monitoring": [
    "antisemitism",
    "hate speech",
    "holocaust denial",
    "BDS",
    "anti-zionism",
    "blood libel",
    "conspiracy theories",
  ],
  "Public Diplomacy": [
    "hasbara",
    "israel advocacy",
    "public opinion",
    "media bias",
    "narrative",
    "soft power",
  ],
  "Social Media Analysis": [
    "twitter",
    "tiktok",
    "instagram",
    "viral content",
    "influencers",
    "bot networks",
    "trending",
  ],
  "News & Media Coverage": [
    "mainstream media",
    "press coverage",
    "editorial bias",
    "fact checking",
    "misinformation",
    "breaking news",
  ],
  "Academic Discourse": [
    "university",
    "campus",
    "academic boycott",
    "research",
    "professors",
    "student activism",
  ],
  "Government & Policy": [
    "legislation",
    "sanctions",
    "foreign policy",
    "UN resolutions",
    "diplomacy",
    "bilateral relations",
  ],
  "International Organizations": [
    "UN",
    "UNESCO",
    "UNHRC",
    "ICC",
    "EU",
    "NGO",
  ],
  "Community Responses": [
    "diaspora",
    "community organizing",
    "counter-narrative",
    "education",
    "solidarity",
    "interfaith",
  ],
};

const seed = async () => {
  const dataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "blue_shield",
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();
  console.log("✅ Connected to database");

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.startTransaction();

  try {
    // Clear existing data (order matters due to foreign keys)
    console.log("🗑️  Clearing existing topic_keywords...");
    await queryRunner.query("DELETE FROM topic_keywords");

    console.log("🗑️  Clearing existing keywords...");
    await queryRunner.query("DELETE FROM keywords");

    console.log("🗑️  Clearing existing topics...");
    await queryRunner.query("DELETE FROM topics");

    // Insert topics
    console.log("📝 Inserting topics...");
    const topicNames = Object.keys(topicsWithKeywords);
    const insertedTopics: { id: string; name: string }[] = [];

    for (const name of topicNames) {
      const icon = topicIcons[name] || null;
      const result = await queryRunner.query(
        "INSERT INTO topics (id, name, icon, created_at) VALUES (gen_random_uuid(), $1, $2, NOW()) RETURNING id, name",
        [name, icon]
      );
      insertedTopics.push(result[0]);
      console.log(`  ✓ Topic: ${icon || ""} ${name}`);
    }

    // Insert keywords (deduplicated)
    console.log("📝 Inserting keywords...");
    const allKeywords = [...new Set(Object.values(topicsWithKeywords).flat())];
    const insertedKeywords: { id: string; word: string }[] = [];

    for (const word of allKeywords) {
      const result = await queryRunner.query(
        "INSERT INTO keywords (id, word, created_at) VALUES (gen_random_uuid(), $1, NOW()) RETURNING id, word",
        [word]
      );
      insertedKeywords.push(result[0]);
    }
    console.log(`  ✓ Inserted ${insertedKeywords.length} keywords`);

    // Create topic_keywords links
    console.log("🔗 Linking topics to keywords...");
    let linkCount = 0;

    for (const [topicName, keywords] of Object.entries(topicsWithKeywords)) {
      const topic = insertedTopics.find(t => t.name === topicName);
      if (!topic) continue;

      for (const word of keywords) {
        const keyword = insertedKeywords.find(k => k.word === word);
        if (!keyword) continue;

        await queryRunner.query(
          "INSERT INTO topic_keywords (topic_id, keyword_id, created_at) VALUES ($1, $2, NOW())",
          [topic.id, keyword.id]
        );
        linkCount++;
      }
    }
    console.log(`  ✓ Created ${linkCount} topic-keyword links`);

    await queryRunner.commitTransaction();
    console.log("\n🎉 Seed completed successfully!");
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error("❌ Seed failed, transaction rolled back:", error);
    process.exit(1);
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
    console.log("🔌 Disconnected from database");
  }
};

seed();
