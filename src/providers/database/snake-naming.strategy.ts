import { DefaultNamingStrategy, NamingStrategyInterface } from "typeorm";

export class SnakeNamingStrategy
  extends DefaultNamingStrategy
  implements NamingStrategyInterface
{
  tableName = (className: string, customName?: string): string =>
    customName || this.toSnake(className);

  columnName = (propertyName: string, customName?: string): string =>
    customName || this.toSnake(propertyName);

  relationName = (propertyName: string): string => this.toSnake(propertyName);

  joinColumnName = (
    relationName: string,
    referencedColumnName: string
  ): string => this.toSnake(relationName) + "_" + referencedColumnName;

  joinTableColumnName = (
    tableName: string,
    _propertyName: string,
    columnName?: string
  ): string => this.toSnake(tableName) + "_" + (columnName || "id");

  private toSnake = (str: string): string =>
    str.replace(/([A-Z])/g, (_, c, i) => (i > 0 ? "_" : "") + c.toLowerCase());
}
