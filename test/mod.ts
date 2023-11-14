import {Collection, DataBase, Schema} from 'lib'
import {zod} from 'dep'

export * from 'https://deno.land/std@0.206.0/assert/mod.ts'

export const init_kv = async () => {
  const kv = await Deno.openKv()
  const db = new DataBase(kv, 'testdb')
  const schema = new Schema(
    zod.object({
      name: zod.string(),
      age: zod.number(),
    })
  )
  const coll = new Collection(db, 'testcoll', schema)
  return {kv, coll}
}
