import {Result, zod} from 'dep'

export type SchemaType<S extends zod.Schema> = zod.infer<S>

export type SchemaKVType<S extends zod.Schema> = Deno.KvEntry<SchemaType<S>>

export type CollDispatchVal<S extends zod.Schema> = {
  prefix: [string, string, string]
  value: SchemaType<S>
  timestamp: number
}

export type Ulid = string

/** 异步的Result值 */
export type AsyncResult<OK, Err> = Promise<Result<OK, Err>>

export * from './error.ts'

export type CSVValue = {
  type: 'delete' | 'set'
  key: string
  value: any
}

export type MustKey<T, K extends keyof T> = {
  [P in K]-?: T[P]
}
