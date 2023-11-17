/** 
## return a kv client ; then you can use using 
### Example
need to close
```ts
const kv=await Deno.openKv()
//...do more things
kv.close()
```
don't need to close
```ts
using  client  = await connect_kv()
const {kv}=client
//...do more things,don't need use kv.close()
```
*/
export const connect_kv = async (path?: string) => {
  const kv = await Deno.openKv(path)
  return {
    kv,
    [Symbol.dispose]() {
      kv.close()
    },
  }
}
