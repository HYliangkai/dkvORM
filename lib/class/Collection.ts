import {Def, Ok, match, rjx, ulid, zod} from 'dep'
import {
  AsyncResult,
  CollDispatchVal,
  DataBase,
  DataExistError,
  NoDataError,
  Schema,
  SchemaKVType,
  SchemaParseError,
  SchemaType,
  Ulid,
  UnknownError,
} from 'lib'

/** database --> collection */
export class Collection<D extends string, C extends string, S extends zod.Schema> {
  readonly db: DataBase<D>
  readonly name: C
  private readonly shema: Schema<S>

  private insert_enqueue: Array<Function>
  private remove_enqueue: Array<Function>
  private update_enqueue: Array<Function>

  constructor(db: DataBase<D>, coll_name: C, cell_schema: Schema<S>) {
    this.name = coll_name
    this.shema = cell_schema
    this.db = db
    this.insert_enqueue = []
    this.remove_enqueue = []
    this.update_enqueue = []

    {
      const add_log_hook = (
        name: 'insert_enqueue' | 'remove_enqueue' | 'update_enqueue',
        type: 'set' | 'delete'
      ) => {
        this[name].push((info: CollDispatchVal<S>) => {
          const piefix = info.prefix
          this.db.log_hook([piefix[0], piefix[1]], [{type, key: piefix[2], value: info.value}])
        })
      }
      add_log_hook('insert_enqueue', 'set')
      add_log_hook('update_enqueue', 'set')
      add_log_hook('remove_enqueue', 'delete')
    }
  }

  /** @enqueue */

  add_event_listener(
    type: 'insert' | 'remove' | 'update',
    handler: (value: CollDispatchVal<S>) => any
  ) {
    match(
      type,
      ['insert', () => this.insert_enqueue.push(handler)],
      ['remove', () => this.remove_enqueue.push(handler)],
      ['update', () => this.update_enqueue.push(handler)],
      [Def, () => {}]
    )()
  }

  remove_event_listener(type: 'insert' | 'remove' | 'update', handler: Function) {
    match(
      type,
      ['insert', () => this.insert_enqueue.filter(item => item !== handler)],
      ['remove', () => this.remove_enqueue.filter(item => item !== handler)],
      ['update', () => this.update_enqueue.filter(item => item !== handler)],
      [Def, () => {}]
    )()
  }

  dispatch(
    type: 'insert' | 'remove' | 'update',
    value: CollDispatchVal<S>,
    option?: {
      delay?: number
    }
  ) {
    option?.delay
      ? setTimeout(
          match(
            type,
            ['insert', () => this.insert_enqueue.forEach(item => item(value))],
            ['remove', () => this.remove_enqueue.forEach(item => item(value))],
            ['update', () => this.update_enqueue.forEach(item => item(value))],
            [Def, () => {}]
          ),
          option.delay
        )
      : match(
          type,
          ['insert', () => this.insert_enqueue.forEach(item => item(value))],
          ['remove', () => this.remove_enqueue.forEach(item => item(value))],
          ['update', () => this.update_enqueue.forEach(item => item(value))],
          [Def, () => {}]
        )()
  }

  /** @operate */

  /** 
  @insert 插入数据
  @error SchemaParseError | DataExistError
  */
  async insert(
    info: {
      primary_key?: Ulid | string
      value: SchemaType<S>
    },
    options: {
      overload: boolean /* 是否覆盖原有数据,默认为true; */
    } = {overload: true}
  ): AsyncResult<string, SchemaParseError | DataExistError> {
    const pk = info.primary_key || ulid()
    const piefix: [string, string, string] = [this.db.name, this.name, pk]
    if (!options.overload) {
      const res = await this.db.kv.get(piefix)
      if (res.versionstamp !== null) return DataExistError.new()
    }
    try {
      this.shema.validate(info.value).unwarp()
      this.dispatch('insert', {prefix: piefix, value: info.value, timestamp: Date.now()})
      await this.db.kv.set(piefix, info.value)
      return Ok(pk)
    } catch (e) {
      return e
    }
  }

  /** 
  @remove 移除数据
  @error UnknownError
   */
  async remove(primary_key: string): AsyncResult<string, UnknownError> {
    const piefix: [string, string, string] = [this.db.name, this.name, primary_key]
    try {
      this.dispatch('remove', {prefix: piefix, value: null, timestamp: Date.now()})
      await this.db.kv.delete(piefix)
      return Ok(primary_key)
    } catch (e) {
      return UnknownError.new()
    }
  }

  /** 
  @update 更新数据
  @error SchemaParseError | NoDataError 
   */
  async update(
    primary_key: string,
    value: SchemaType<S>
  ): AsyncResult<string, SchemaParseError | NoDataError> {
    const piefix: [string, string, string] = [this.db.name, this.name, primary_key]
    {
      const res = await this.db.kv.get(piefix)
      if (res.versionstamp === null) return NoDataError.new()
    }
    try {
      this.shema.validate(value).unwarp()
      this.dispatch('update', {prefix: piefix, value: value, timestamp: Date.now()})
      await this.db.kv.set(piefix, value)
      return Ok(primary_key)
    } catch (e) {
      return e
    }
  }
  //Todo 查

  /** find with primary_key , the simple way */
  async get(primary_key: string): AsyncResult<SchemaKVType<S>, NoDataError> {
    const res = await this.db.kv.get([this.db.name, this.name, primary_key])
    return res.versionstamp === null ? NoDataError.new() : Ok(res)
  }

  /** find many with primary_keys  */
  async get_many(primary_keys: Array<string>): AsyncResult<Array<SchemaKVType<S>>, NoDataError> {
    const res = await this.db.kv.getMany(primary_keys.map(item => [this.db.name, this.name, item]))
    const data = res.filter(item => item.versionstamp !== null)
    return data.length === 0 ? NoDataError.new() : Ok(data as Array<SchemaKVType<S>>)
  }

  /** list for rxjs Observable */
  observable_list() {
    const list = this.db.kv.list({prefix: [this.db.name, this.name]})
    return new rjx.Observable(subscribe => {
      ;(async () => {
        for await (const item of list) {
          subscribe.next(item)
        }
        subscribe.complete()
      })()
    })
  }

  // /** find condition进行筛选 */
  // async list_for(
  //   condition: (item: SchemaType<S>) => boolean
  // ): Promise<Array<{key: string; value: SchemaType<S>}>> {
  //   const prefix = [this.db.name, this.name]
  //   const list = this.db.kv.list({prefix: prefix})
  //   const res: Array<{key: string; value: SchemaType<S>}> = []
  //   for await (const item of list) {
  //     if (condition(item.value)) res.push({key: String(item.key), value: item.value})
  //   }
  //   return res
  // }
}
