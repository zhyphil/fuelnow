import { Type, type TSchema } from "@sinclair/typebox";

export const NonBlankStringSchema = Type.String({
  minLength: 1,
  maxLength: 500,
  pattern: ".*\\S.*",
});

export const UtcTimestampSchema = Type.String({
  description: "ISO 8601 timestamp normalized to UTC",
  pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?Z$",
});

export function nullable<T extends TSchema>(schema: T) {
  return Type.Union([schema, Type.Null()]);
}
