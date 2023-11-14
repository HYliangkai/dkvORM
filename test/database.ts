import {Collection, Schema} from 'lib'
import {init_kv} from './mod.ts'
import {zod} from 'dep'

Deno.test('db-delete-collection', async () => {
  const {kv, db} = await init_kv()
  const schema = new Schema(
    zod.object({
      name: zod.string(),
      age: zod.number(),
    })
  )
  const coll = new Collection(db, 'testcoll2', schema)
  const test_list = Array(50)
    .fill(0)
    .map((_, i) => coll.insert({value: {name: 'test', age: i}}))

  await Promise.all(test_list)
  console.log('加入完毕')
  kv.close()
})
