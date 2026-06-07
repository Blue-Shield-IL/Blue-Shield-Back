import "reflect-metadata";
import { resolve } from "path";
import { config } from "dotenv";
import { seeds } from "./registry";
import "./stub-topics/topics.seed";
import { DataSource } from "typeorm";

config({ path: resolve(__dirname, "../../../.env") });

const runner = async () => {
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
  console.log("✅ Connected to database\n");

  const queryRunner = dataSource.createQueryRunner();

  for (const seed of seeds) {
    console.log(`▶ Running: ${seed.name}`);
    await queryRunner.startTransaction();

    try {
      await seed.run(queryRunner);
      await queryRunner.commitTransaction();

      console.log(`✓ ${seed.name} completed\n`);
    } catch (error) {
      await queryRunner.rollbackTransaction();

      console.error(`✗ ${seed.name} failed:`, error);
      process.exit(1);
    }
  }

  await queryRunner.release();
  await dataSource.destroy();

  console.log("🎉 All seeds completed!");
};

runner();
