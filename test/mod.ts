import {DataBase} from 'lib'

export * from 'https://deno.land/std@0.206.0/assert/mod.ts'

export const init_kv = async () => {
  const kv = await Deno.openKv()
  const db = new DataBase(kv, 'testdb')
  return {kv, db}
}
