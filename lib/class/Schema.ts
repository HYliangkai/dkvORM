import {Err, Ok, Result, Some, zod} from '../dep.ts'
import {SchemaParseError, SchemaType} from '../mod.ts'

export class Schema<S extends zod.Schema> {
  private readonly schema: S
  constructor(schema: S) {
    this.schema = schema
  }

  /** 数据验证 */
  validate(data: SchemaType<S>): Result<SchemaType<S>, SchemaParseError> {
    const res = this.schema.safeParse(data)
    if (res.success) return Ok(res.data)
    return SchemaParseError.new(res.error.message, Some(res.error))
  }
}
