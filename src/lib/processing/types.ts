export type ContentProvider = (ref: string, path: string) => Promise<null | string>

export interface ProcessingContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  concerns: Record<string, Record<string, any>>
  contentProvider: ContentProvider
  refs: {base: string; head: string}
}
