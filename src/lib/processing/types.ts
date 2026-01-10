export type ContentProvider = (ref: string, path: string) => Promise<null | string>

export interface ProcessingContext {
  contentProvider: ContentProvider
  refs: {base: string; head: string}
}
