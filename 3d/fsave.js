export function pack(engine){
    const obj = {objs:engine.objs,rbs:engine.rbs}
    return JSON.parse(obj)
}