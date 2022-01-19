# 0.5.1

### Bug Fix
- Fix error when moving nodes from sketch
- Fix `Any` type data when trying to drop cable to the node header
- Fix incorrect cable arrangement when the sketch is being reimported
- Fix cable order when being connected from input port
- Fix port value that was not updated because of cache

### Performance
- Skip if the port value was unchanged

# 0.5.0

### Features
- Add `instance.ref` where the `instance` can be `new Blackprint.Engine` or `new Blackprint.Sketch` this `ref` will have reference to `Output` or `Input` port
- Add `node.destroy` as an alternative for `iface.destroy`, this will be called by the engine and shouldn't be manually called
- Add `instance.deleteNode` to delete node manually by using code
- Add options for `importJSON`
- Reuse port and event listener from an iface that have an ID

### Breaking Changes
- `iface.const` and `node.const` now changed into `iface.ref` and `node.ref`
- `importJSON` now will clear the instance first
- `Validator` port type was removed

### Bug Fix
- Fix error when using sQuery
- Fix error when the node doesn't have input port
- Fix `iface.destroy` that was not being called when the nodes was cleared

# 0.4.5

### Feature
- Use cache when obtaining data from input port

### Bug Fix
- Fix data flow visualization
- Fix cable connection from port with type of array
- Fix `node.update` function that being called when port value haven't been defined

# 0.4.4

### Bug Fix
- Fix incorrect default value
- Move `iface.imported` call order near `node.imported`
- Fix incorrect port event data (`target` should be `port`)
- Fix `*` event that was not being called

### Feature
- `Blackprint.Engine` is now using `CustomEvent`
- You can now connect cable with script

# 0.4.3

### Bug Fix
- Avoid multiple constructor call
- Fix undefined cable value when being connected from input to output from sketch editor

### Feature
- Add `input` and `output` properties for `Cable`
- Port `value` event can be retrieved from IFace object with `port.value`
- You now can use `.emit` for triggering your custom event for IFace/Node/Port

### Breaking Changes
- Port event data will be wrapped with object

```js
// Before
Input.Port.Stuff.on('value', function(target){});

// After
Input.Port.Stuff.on('value', function({ target, cable }){
	// cable.value === target.value
	// cable.value: is more recommended than using `target.value`
});
```

# 0.3.0

### Feature
- Interfaces now can be accessed from `instance.iface[id]`
- Add custom environment data
- Load module from URL (default to disabled)
- Add support for using Decorator when registering node/interface
- Add support for listening to all event with "\*"

### Breaking Changes
Because the implementation will be similar with [engine-php](https://github.com/Blackprint/engine-php) and [engine-go](https://github.com/Blackprint/engine-go).
This changes is supposed to improve efficiency, and reduce possible future breaking changes.<br>

- `.outputs, .inputs, .properties` field is changed into `.output, .input, .property` for `node` and `iface`
- `outputs:[]` field is now changed to `output:[]` for JSON export
- `Instance.importJSON()` now returning promise and need to be `await`-ed before using `.getNode` or `.getNodes`
- `Blackprint.Engine.registerNode()` will now being merged and replaced with `Blackprint.registerNode()`
- When using class for `Blackprint.registerNode` it must extends `Blackprint.Node`
- When constructing Node, `node.interface = '...'` now must be changed to `node.setInterface('...')` before accessing the target interface
- `Blackprint.Addons` was changed to `Blackprint.getContext`
- `Blackprint.Node` was changed to `Blackprint.Interface`
- For sketch (browser only): `Blackprint.registerInterface()` was renamed to `Blackprint.Sketch.registerInterface()`
- For non-sketch: `Blackprint.Engine.registerInterface()` was renamed to `Blackprint.registerInterface()`
- When using class for `Blackprint.registerInterface` or `Blackprint.Sketch.registerInterface`, the class must extends `Blackprint.Interface`
- `BPAO` must be changed to `BPIC`
- `Blackprint.PortArrayOf` now changed to `Blackprint.Port.ArrayOf`
- `Blackprint.PortDefault` now changed to `Blackprint.Port.Default`
- `Blackprint.PortSwitch` now changed to `Blackprint.Port.Switch`
- `Blackprint.PortTrigger` now changed to `Blackprint.Port.Trigger`
- `Blackprint.PortUnion` now changed to `Blackprint.Port.Union`
- `Blackprint.PortValidator` now changed to `Blackprint.Port.Validator`
- Events emitted from node/iface/sketch will now only have one object parameter, therefore `._trigger` will only accept `(eventName, ?object)` parameter.

# 0.2.0

### Breaking Changes
- `Blackprint.Interpreter` is changed into `Blackprint.Engine`
- Package on NPM registry was moved to `@blackprint/...`
- `iface.options` now changed to `iface.data`, you will need to replace `options` from the exported JSON into `data`
- `iface.id` now changed to `iface.i`, you will need to replace `id` from the exported JSON into `i`
- `iface.id` now being used for named ID, and `iface.i` still being the generated index for the nodes

# 0.1.1

### Notes
- Still in development, any contribution welcome
- Please always specify the fixed version when using for your project
- Usually v0.\*.0 will have breaking changes, while v0.0.\* can have new feature or bug fixes