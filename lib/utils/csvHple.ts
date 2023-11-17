import {CSV, Ok, Path} from '../dep.ts'
import {CSVValue, IOError} from '../mod.ts'

export const numm = null

export const insert_csv = async (
  base: string,
  prefix: [string, string],
  values: Array<CSVValue>
) => {
  const csv = CSV.stringify(values, {columns: ['type', 'key', 'value']})
  //追加数据到path里面
  await Deno.mkdir(Path.join(base, prefix[0]), {recursive: true})
  await Deno.writeTextFile(Path.join(base, prefix[0], prefix[1] + '.csv'), csv, {
    append: true,
    create: true,
  })
}

export const resume_csv = async (
  kv: Deno.Kv,
  db_name: string,
  coll_name: string,
  base_path: string
) => {
  const real_path = Path.join(base_path, db_name, coll_name + '.csv')
  try {
    const csv = await Deno.readTextFile(real_path)
    const values = CSV.parse(csv, {columns: ['type', 'key', 'value']})
    for (const item of values) {
      switch (item.type) {
        case 'delete':
          await kv.delete([db_name, coll_name, item.key])
          break
        case 'set':
          await kv.set([db_name, coll_name, item.key], item.value)
      }
    }
    return Ok()
  } catch (e) {
    return IOError.new()
  }
}
