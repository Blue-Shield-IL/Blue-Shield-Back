import seedData from "./data.json";
import { QueryRunner } from "typeorm";
import { registerSeed } from "../registry";

registerSeed("Topics & Keywords", async (queryRunner: QueryRunner) => {
  await Promise.all(
    ["topic_keywords", "user_keywords", "keywords", "topics"].map(table =>
      queryRunner.query(`DELETE FROM ${table}`)
    )
  );

  const topicRows = await Promise.all(
    seedData.map(async ({ name, icon }) => {
      const [row] = await queryRunner.query(
        "INSERT INTO topics (id, name, icon, created_at) VALUES (gen_random_uuid(), $1, $2, NOW()) RETURNING id",
        [name, icon]
      );

      return [name, row.id] as [string, string];
    })
  );

  const topicMap = new Map(topicRows);
  console.log(`  📝 ${topicMap.size} topics`);

  const uniqueKeywords = [
    ...new Set(seedData.flatMap(({ keywords }) => keywords)),
  ];

  const keywordRows = await Promise.all(
    uniqueKeywords.map(async word => {
      const [row] = await queryRunner.query(
        "INSERT INTO keywords (id, word, created_at) VALUES (gen_random_uuid(), $1, NOW()) RETURNING id",
        [word]
      );

      return [word, row.id] as [string, string];
    })
  );

  const keywordMap = new Map(keywordRows);
  console.log(`  📝 ${keywordMap.size} keywords`);

  const linksToInsert = seedData.flatMap(({ name, keywords }) =>
    keywords.map(word => [topicMap.get(name), keywordMap.get(word)!])
  );

  await Promise.all(
    linksToInsert.map(([topicId, keywordId]) =>
      queryRunner.query(
        "INSERT INTO topic_keywords (topic_id, keyword_id) VALUES ($1, $2)",
        [topicId, keywordId]
      )
    )
  );

  console.log(`  🔗 ${linksToInsert.length} links`);
});
