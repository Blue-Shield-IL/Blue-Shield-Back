import { QueryRunner } from "typeorm";

export type SeedFn = (queryRunner: QueryRunner) => Promise<void>;

export const seeds: { name: string; run: SeedFn }[] = [];

export const registerSeed = (name: string, run: SeedFn) => {
  seeds.push({ name, run });
};
