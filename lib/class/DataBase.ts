import {
  AsyncResult,
  CSVValue,
  Collection,
  IOError,
  UnknownError,
  insert_csv,
  resume_csv,
} from '../mod.ts'
import {None, Ok, Option, Some, zod} from '../dep.ts'

/** 数据库datebase */
export class DataBase<D extends string> {
  readonly name: D
  readonly log_base: Option<string> /* 记录文件夹 */
  readonly kv: Deno.Kv
  constructor(
    kv: Deno.Kv,
    db_name: D,
    option?: {
      log?: boolean /* 是否log记录 */
      log_base?: string /* log地址 */
    }
  ) {
    option = {
      ...{
        log: true,
        log_base: `${Deno.env.get('DATABASE_LOGS_DIR') || '.'}`,
      },
      ...option,
    }
    this.kv = kv
    this.name = db_name
    this.log_base = option.log ? Some(option.log_base as string) : None
  }

  /** 外部调用,插入log数据 */
  async log_hook(prefix: [string, string], value: Array<CSVValue>) {
    return this.log_base ? await insert_csv(this.log_base.unwarp(), prefix, value) : null
  }

  /** 恢复csv数据 */
  async resume(coll_name: string): AsyncResult<void, IOError> {
    try {
      const base = this.log_base.unwarp()
      if (base === undefined) return IOError.new('DATABASE_LOGS_DIR is undefined')
      return await resume_csv(this.kv, this.name, coll_name, base)
    } catch (e) {
      return IOError.new()
    }
  }

  /** @static */

  /** 删除collection */
  static async clear_collection<D extends string, C extends string, S extends zod.Schema>(
    coll: Collection<D, C, S>
  ): AsyncResult<number, UnknownError> {
    try {
      const kv = coll.db.kv
      const list = kv.list({prefix: [this.name, coll.name]})
      const task = []
      const keys: Array<string> = []

      for await (const {key} of list) {
        task.push(kv.delete(key))
        keys.push(String(key))
      }
      /* add log */
      coll.db.log_base.some_do(path => {
        task.push(
          insert_csv(
            path,
            [coll.db.name, coll.name],
            keys.map(item => ({
              type: 'delete',
              key: item,
              value: null,
            }))
          )
        )
      })
      await Promise.all(task)
      return Ok(keys.length)
    } catch (e) {
      return UnknownError.new()
    }
  }
}
