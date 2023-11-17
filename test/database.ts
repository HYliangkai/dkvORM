import {init_kv} from './mod.ts'

Deno.test('db-delete-collection', async () => {
  const {kv, coll} = await init_kv()
  const test_list = Array(50)
    .fill(0)
    .map((_, i) => coll.insert({value: {name: 'test', age: i}}))

  await Promise.all(test_list)
  console.log('加入完毕')
  kv.close()
})
