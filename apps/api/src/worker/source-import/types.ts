export type JsonPrimitive = boolean | null | number | string;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue;
}

export type RawPayload = JsonObject | JsonValue[];

export interface SourceRecordInput {
  sourceRecordId: string;
  servicePointId: string | null;
  rawPayload: RawPayload;
  sourceObservedAt: string | null;
  sourcePublishedAt: string | null;
  fetchedAt: string;
}

export interface SourceCheckpoint {
  cursor: JsonObject | null;
  highWatermark: string | null;
}

export interface SourcePage {
  records: readonly SourceRecordInput[];
  nextCheckpoint: SourceCheckpoint;
  done: boolean;
}

export interface SourcePageRequest {
  sourceId: string;
  checkpoint: SourceCheckpoint | null;
  signal?: AbortSignal;
}

export interface SourcePageReader {
  readPage(request: SourcePageRequest): Promise<SourcePage>;
}

export interface PersistSourcePageRequest {
  sourceId: string;
  records: readonly SourceRecordInput[];
  nextCheckpoint: SourceCheckpoint;
}

export interface SourceImportStore {
  getCheckpoint(sourceId: string): Promise<SourceCheckpoint | null>;
  persistPage(request: PersistSourcePageRequest): Promise<void>;
}

export interface IncrementalImportResult {
  sourceId: string;
  initialCheckpoint: SourceCheckpoint | null;
  finalCheckpoint: SourceCheckpoint;
  pagesRead: number;
  recordsProcessed: number;
}
