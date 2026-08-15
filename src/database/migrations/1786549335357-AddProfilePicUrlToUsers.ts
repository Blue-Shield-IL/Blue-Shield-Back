import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProfilePicUrlToUsers1786549335357 implements MigrationInterface {
  name = "AddProfilePicUrlToUsers1786549335357";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE users ADD COLUMN profile_pic_url varchar NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN profile_pic_url`);
  }
}
