
## An ORM framework based on denoKV, providing native fast storage.


### Usage

1. setup env , to save the log file
```.env
DATABASE_LOGS_DIR="Absolute path"
```
2. start to use
```ts
  const kv = await Deno.openKv()
  /** init dataBase */
  const db = new DataBase(kv, 'testdb')
  /** create a schema */
  const schema = new Schema(
    zod.object({
      name: zod.string(),
      age: zod.number(),
    })
  )
  /** init collection */
  const coll = new Collection(db, 'testcoll', schema)
  /** insert value */
  const res = await coll.insert({value: {name: 'jiojio', age: 18}})
  /** get the primary_key */
  const key = res.unwarp()
```

### Organization
![Construct](https://chzky-1312081881.cos.ap-nanjing.myqcloud.com/note/image-20231114140726459.png)
