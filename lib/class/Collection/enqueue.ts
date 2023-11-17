import {CollDispatchVal, CollEnqueueType} from '../../../mod.ts'
import {Def, match, zod} from '../../dep.ts'

export const add_log_hook = <S extends zod.Schema>(that: any) => {
  const fn = (
    name: 'insert_enqueue' | 'remove_enqueue' | 'update_enqueue',
    type: 'set' | 'delete'
  ) => {
    that[name].push((info: CollDispatchVal<S>) => {
      const piefix = info.prefix
      that.db.log_hook([piefix[0], piefix[1]], [{type, key: piefix[2], value: info.value}])
    })
  }
  fn('insert_enqueue', 'set')
  fn('update_enqueue', 'set')
  fn('remove_enqueue', 'delete')
}

export const add_event_listener = <S extends zod.Schema>(
  that: any,
  type: CollEnqueueType,
  handler: (value: CollDispatchVal<S>) => any
) => {
  match(
    type,
    ['insert', () => that.insert_enqueue.push(handler)],
    ['remove', () => that.remove_enqueue.push(handler)],
    ['update', () => that.update_enqueue.push(handler)],
    [Def, () => {}]
  )()
}

export const remove_event_listener = (that: any, type: CollEnqueueType, handler: Function) => {
  match(
    type,
    ['insert', () => (that.insert_enqueue as any[]).filter(item => item !== handler)],
    ['remove', () => (that.remove_enqueue as any[]).filter(item => item !== handler)],
    ['update', () => (that.update_enqueue as any[]).filter(item => item !== handler)],
    [Def, () => {}]
  )()
}

export const dispatch = <S extends zod.Schema>(
  that: any,
  type: CollEnqueueType,
  value: CollDispatchVal<S>,
  option?: {
    delay?: number
  }
) => {
  option?.delay
    ? setTimeout(
        match(
          type,
          ['insert', () => (that.insert_enqueue as any[]).forEach(item => item(value))],
          ['remove', () => (that.remove_enqueue as any[]).forEach(item => item(value))],
          ['update', () => (that.update_enqueue as any[]).forEach(item => item(value))],
          [Def, () => {}]
        ),
        option.delay
      )
    : match(
        type,
        ['insert', () => (that.insert_enqueue as any[]).forEach(item => item(value))],
        ['remove', () => (that.remove_enqueue as any[]).forEach(item => item(value))],
        ['update', () => (that.update_enqueue as any[]).forEach(item => item(value))],
        [Def, () => {}]
      )()
}
