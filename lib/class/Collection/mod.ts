import {Def, Ok, match, rjx, ulid, zod} from '../../dep.ts'
import {
  AsyncResult,
  CollDispatchVal,
  CollEnqueueType,
  DataBase,
  DataExistError,
  NoDataError,
  Schema,
  SchemaKVType,
  SchemaParseError,
  SchemaType,
  Ulid,
  UnknownError,
} from '../../mod.ts'
import {add_event_listener, add_log_hook, dispatch, remove_event_listener} from './enqueue.ts'

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

    add_log_hook(this)
  }

  /** @enqueue */

  /**
  ## add event listener 
  ### Example:
  ```ts
  const db = new DataBase('test')
  const coll = db.create_collection('test', zod.string())
  coll.add_event_listener('insert', (value) => {
    console.log(value)
  })
  ```
  */
  add_event_listener(type: CollEnqueueType, handler: (value: CollDispatchVal<S>) => any) {
    add_event_listener(this, type, handler)
  }

  /**
  ## remove event listener
  ### Example:
  ```ts
  const db = new DataBase('test')
  const coll = db.create_collection('test', zod.string())
  const handler = (value) => {
    console.log(value)
  }
  coll.add_event_listener('insert', handler)
  coll.remove_event_listener('insert', handler)
  ```
  */
  remove_event_listener(type: CollEnqueueType, handler: Function) {
    remove_event_listener(this, type, handler)
  }

  /**
  ## dispatch event
  ### Example:
  ```ts
  const db = new DataBase('test')
  const coll = db.create_collection('test', zod.string())
  coll.dispatch('insert', {prefix: ['test', 'test', 'test'], value: 'test', timestamp: Date.now()})
  ```
   */
  dispatch(
    type: CollEnqueueType,
    value: CollDispatchVal<S>,
    option?: {
      delay?: number
    }
  ) {
    dispatch(this, type, value, option)
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
      lifetime?: number /** 数据到期时间 */
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
      await this.db.kv.set(piefix, info.value, {expireIn: options?.lifetime})
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
    value: SchemaType<S>,
    options?: {
      lifetime?: number /** 数据到期时间 */
    }
  ): AsyncResult<string, SchemaParseError | NoDataError> {
    const piefix: [string, string, string] = [this.db.name, this.name, primary_key]
    {
      const res = await this.db.kv.get(piefix)
      if (res.versionstamp === null) return NoDataError.new()
    }
    try {
      this.shema.validate(value).unwarp()
      this.dispatch('update', {prefix: piefix, value: value, timestamp: Date.now()})
      await this.db.kv.set(piefix, value, {expireIn: options?.lifetime})
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

  /** can get value by Secondary index */
  get_value_by(key: keyof SchemaType<S>) {}
}
