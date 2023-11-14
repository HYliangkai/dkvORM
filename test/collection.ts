import {Collection, DataBase, Schema} from 'lib'
import {zod} from 'dep'
import {assertEquals, init_kv} from './mod.ts'

Deno.test('test-insert', async () => {
  const {kv, db} = await init_kv()
  const schema = new Schema(
    zod.object({
      name: zod.string(),
      age: zod.number(),
    })
  )
  const coll = new Collection(db, 'testcoll', schema)

  /* test1 */
  const res = await coll.insert({value: {name: 'jiojio', age: 18}})
  const key = res.unwarp()
  assertEquals(res.is_ok, true, 'no-pass')

  /* test2 */
  const erres = await coll.insert(
    {primary_key: key, value: {name: 'jiojio', age: 18}},
    {overload: false}
  )
  assertEquals(erres.is_err, true, 'no-pass')
  kv.close()
})

Deno.test('test-remove', async () => {
  const {kv, db} = await init_kv()
  const schema = new Schema(
    zod.object({
      name: zod.string(),
      age: zod.number(),
    })
  )

  const coll = new Collection(db, 'testcoll', schema)
  const res = await coll.insert({value: {name: 'jiojio', age: 18}})
  const key = res.unwarp()

  const mvd = await coll.remove(key)
  assertEquals(mvd.is_ok, true, 'no-pass')
  kv.close()
})

Deno.test('test-get', async () => {
  const {kv, db} = await init_kv()

  const schema = new Schema(
    zod.object({
      name: zod.string(),
      age: zod.number(),
      address: zod.string(),
    })
  )
  const coll = new Collection(db, 'testcoll', schema)
  const res = await coll.insert({value: {name: 'jiojio', age: 18, address: 'beijing'}})
  const key = res.unwarp()

  const rres = await coll.get(key)
  assertEquals(rres.unwarp().key.at(-1), key), 'no-pass'

  kv.close()
})

Deno.test('test-rob', async () => {
  const {kv, db} = await init_kv()
  let index = 0
  await new Promise(reso => {
    const schema = new Schema(
      zod.object({
        name: zod.string(),
        age: zod.number(),
        address: zod.string(),
      })
    )
    const coll = new Collection(db, 'testcoll', schema)
    const obs = coll.observable_list()
    obs.subscribe({
      next(val) {
        index++
      },
      complete() {
        reso(void 0)
      },
    })
  })
  kv.close()
})

Deno.test('test-enqueue', async () => {
  const {db, kv} = await init_kv()
  const schema = new Schema(
    zod.object({
      name: zod.string(),
      age: zod.number(),
      address: zod.string(),
    })
  )
  const coll = new Collection(db, 'testcoll', schema)
  coll.add_event_listener('insert', val => {
    console.log('接收插入', val.timestamp)
  })
  await coll.insert({primary_key: 'niga', value: {name: 'dio', age: 18, address: '息屏'}})
  kv.close()
})
