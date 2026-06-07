import { DefaultNamingStrategy, NamingStrategyInterface } from "typeorm";

export class SnakeNamingStrategy
  extends DefaultNamingStrategy
  implements NamingStrategyInterface
{
  tableName = (className: string, customName?: string): string =>
    customName || this.toSnake(className);

  columnName = (propertyName: string, customName?: string): string =>
    customName || this.toSnake(propertyName);

  relationName = (propertyName: string) => this.toSnake(propertyName);

  joinColumnName = (relationName: string, referencedColumnName: string) =>
    this.toSnake(relationName) + "_" + this.toSnake(referencedColumnName);

  joinTableColumnName = (
    tableName: string,
    _propertyName: string,
    columnName?: string
  ) => this.toSnake(tableName) + "_" + this.toSnake(columnName || "id");

  private toSnake = (str: string) =>
    str.replace(/([A-Z])/g, (_, c, i) => (i > 0 ? "_" : "") + c.toLowerCase());
}
