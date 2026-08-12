declare module "franc-min" {
  interface FrancOptions {
    minLength?: number;
    only?: string[];
    ignore?: string[];
  }

  /** Detect the language of `value`; returns an ISO 639-3 code or "und". */
  function franc(value: string, options?: FrancOptions): string;

  export default franc;
}
