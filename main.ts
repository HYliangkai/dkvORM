import 'https://deno.land/std@0.206.0/dotenv/load.ts'
import {Collection, DataBase, Schema} from 'lib'
import {zod} from 'dep'
console.log(Deno.env.get('DENO_KV_ACCESS_TOKEN'))

const kv = await Deno.openKv(
  'https://api.deno.com/databases/79eb6d9d-c008-42ba-a3a7-bbc91d3efc5e/connect'
)

const db = new DataBase(kv, 'deno-test')

const schema = new Schema(
  zod.object({
    name: zod.string(),
    aeg: zod.number(),
  })
)

const coll = new Collection(db, 'test', schema)

const res = await coll.insert({
  value: {
    name: 'jiojio',
    aeg: 18,
  },
})
console.log(res.unwarp_or('失败'))
