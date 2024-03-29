# 0.9.2

### Bug Fix
- Fix validation to avoid prototype pollution

# 0.9.1

### Features
- Add function to rename events, variable name, and function namespace
- Add feature to delete function, function port, variable, and event
- Add `.stop` property to stop data flow in the instance
- Emit `ready` event when function node is initialized
- Emit event when creating event and handle environment variable deletion
- Watch function node's port name changes when renaming from other node
- Watch event namespace changes when renaming from other node
- Improve utils for set and delete object property
- Add and improve Bun and Node.js loader
- Add `.ready` function for waiting until first `json.imported` instance event
- Auto trigger `node.update` when `initUpdate` static class property exist
- Improve TypeScript definition file

### Bug Fix
- Avoid emitting non-object data when emitting event data
- Avoid creating a function node inside of the node itself
- Emit some event and avoid trigger resave on function node
- Fix import error because duplicated event export
- Fix error when renaming port name for function node
- Make sure the event `schema` option is object
- Rename environment node inside all function node
- Some modification for remote collaboration
- Stop execution order inside function if root is stopped
- Use default port output value as input value if exist

# 0.9.0

### Breaking Changes
- Change callable output port type with Trigger type
    - Renamed type: `Function` to `Blackprint.Types.Trigger`
- Renamed type: `Blackprint.Port.Route` to `Blackprint.Types.Route`

### Features
- Allow function node to be paused on creation
- Add feature to linking variable between instances

### Bug Fix
- Fix error when using var node for trigger type port
- Fix function input port that was created 2 times
- Fix cable input's route port for skeleton
- Add input port that have default value for skeleton
- Fix incorrect type for variable's output port
- Fix route check inside function node
- Fix error when triggering function output from variable node

# 0.8.15

### Bug Fix
- Fix internal status reset

### Changes
- Experimental code generation was migrated to [other repository](https://github.com/Blackprint/code-generation)

# 0.8.13

### Bug Fix
- Fix error for event and function node
- Fix imported instance event

### Feature
- Add experimental code generation

# 0.8.12

### Bug Fix
- Emit `updated` event when the node was updated
- Fix error when having private variable on function node
- Optimize code for improving the performance

# 0.8.11

### Feature
- Add options to disable cleaning the instance when importing JSON

### Bug Fix
- Fix incorrect reference that cause error when removing environment node
- Remove internal marker to avoid dynamic port connection on outer function port

# 0.8.10

### Deprecation
- Instance's exported JSON schema was updated, please import and re-export your old exported JSON before v1.0. The old schema will still importable on `engine-js`, but it will show a deprecation notice.

### Bug Fix
- Fix instance's createEvent call when importing JSON
- Fix node update using default input value when cable was disconnected

# 0.8.9

### Features
- Add custom event nodes
- Add event nodes feature

### Bug Fix
- Fix removed event listener when sketch container was removed
- Fix dynamic port marker on internal interface
- Fix type assigned on variable node
- Force output port that use union to be Any type
- Move port type re-assigment for output port
- Improve output port's type when using port feature
- Update error message and remove unused event emit
- Validate namespace name

# 0.8.8

### Features
- Handle namespaced variable or nodes
- Add support for branched cable on route cable
- Add `initPorts` for dynamically initializing ports

### Bug Fix
- Disable port manipulation on locked instance
- Put id as title if doesn't have custom title
- Fix route port call on branched cable
- Avoid calling update on cable connection when the node having input route
- Show cable flow on route cable
- Cast port name to string

v0.8.7 is skipped

# 0.8.6

### Improvement
- Improve typings to make implementation more easier

### Bug Fix
- Replace dot settings's internal save name with underscore

# 0.8.5

### Improvement
- Improve TypeScript definitions

# 0.8.4

### Bug Fix
- Improve and fix type definition that not published to NPM
- Fix error when using stepMode

# 0.8.3

### Features
- Improve module exports
- Add Skeleton import feature
- Add experimental `Blackprint.Types.Slot` for ports with lazy type assignment
- Improve code for step mode execution

### Bug Fix
- Fix and improve TypeScript definition file
- Improve import performance when using variable or function node
- Save port configuration and use it for creating function port

### Deprecated
Deprecation below may breaking in v0.8.10, the other engine (`engine-python` and `engine-php`) will not have this breaking changes as it already correctly implemented. This changes was happen because I was forgot to move `Route` object reference from `Blackprint.Port.Route` to `Blackprint.Types.Route` when releasing this `engine-js` module, I'm sorry about that 😅.

```js
// Before (You will get deprecation notice on the console if still using this)
Blackprint.Port.Route

// After
Blackprint.Types.Route
```

# 0.8.2

### Features
- Emit `destroy` event when the instance was destroyed

### Bug Fix
- Fix VirtualType validation
- Fix error when using VirtualType
- Fix VirtualType and throw error on unrecognized type
- Emit internal event for engine-js
- Add internal destroyed flag

# 0.8.1

### Features
- Add experimental feature to lock the instance
- Improve security for environment variable node by using connection rule

### Bug Fix
- Emit internal event when function port was renamed
- Fix event to be emitted to root instance
- Fix function node that was not being initialized if created manually at runtime
- Fix route port connection and array input data
- Immediate init interface for single node creation
- Improve performance and fix execution order for with `StructOf` feature
- Reset updated cable status when disconnected and minor changes

# 0.8.0

### Features
- Add `waitOnce` for waiting for an event with Promise
- Add pausible execution feature and change node execution order (experimental, please expect changes in version 0.8)
- Add VirtualType port feature
- Export cable input order for Sketch instance

### Bug Fix
- Fix `value` event trigger
- Fix execution order for custom function node
- Fix incorrect value when using function port's node
- Fix cable input order
- Fix route and partial update
- Fix incorrect iface id references
- Clear port cache when reusing port
- Avoid re-emitting event on updated cable
- Avoid using ArrayOf port for custom function node

### Breaking Changes
- Remove deprecated function `instance.getNode()`, please use `instance.iface[id]` or `instance.ifaceList[index]`

```js
let instance = new Blackprint.Engine();
instance.importJSON('...');

// Get iface by node id
instance.getNode('nodeId'); // Before
instance.iface['nodeId']; // After

// Get iface by node index
instance.getNode(0); // Before
instance.ifaceList[0]; // After
```

- `.update` function will no longer receive cable parameter if `.partialUpdate` is not set to true

```js
// Before
class extends Blackprint.Node {
    update(cable){...}
}

// After
class extends Blackprint.Node {
    constructor(){
        this.partialUpdate = true;
    }

    update(cable){...}
}
```

# 0.7.5

### Features
- Add isRoute flag on route port
- Add `json.importing` event
- Update ES6 remote module loader for Node.js

### Bug Fix
- Remove symbols from var or function id
- Fix route port connection
- Fix port switches initialization
- Fix port value for function node and fix update priority

# 0.7.4

### Features
- Improve TypeScript definition file

### Bug Fix
- Reset every struct port into null
- Fix port feature that must be already breaking for this version
- Fix error if the portName was a number type

# 0.7.3

### Bug Fix
- Fix skipped cache removal for route mode

# 0.7.2

### Features
- Add `isGhost` on interface for standalone port

### Bug Fix
- Fix index error when creating new function
- Allow module import from `http:` for internal network support (like company network)

# 0.7.1

### Features
- Add feature to allow output resyncronization

# 0.7.0

### Features
- Add `node.instance` property that can be used to access current instance for the node
- Add TypeScript definition
- Add feature to split port with structure
- Add feature to use default input with primitive type when the port is not connected
- Add `node.log` for emit logging data to instance
- Add callable route port output type
- Add route port to handle data flow
- Dynamically add empty environment variable if not exist
- Add event name as parameter
- Add node for handling environment variables
- Emit event when node id was changed
- Emit event when node will be deleted
- Emit event when creating new variables/function
- Emit event when renaming environment variable
- Finishing function node and the separated I/O node

### Bug Fix
- Fix import for append mode
- Fix initial value for variable node
- Fix feature for renamine function port
- Fix data request and saved data
- Fix `Port.Trigger` type and add `routeTo`
- Fix incorrect port check for function node
- Fix function's input/output node
- Fix variable scope id and route connection
- Fix returned object from `getNode`
- Fix route pass for custom function node
- Fix `cable.disconnect` event that not emitted on iface
- Fix dynamic port for custom function input/output node
- Fix variable node scope
- Fix bug for environment variable
- Avoid emitting `cable.disconnect` event to instance twice
- Restrict connection between dynamic port

### Breaking Changes
- Port's `Any` type is no longer use `null`, please use `Blackprint.Types.Any` instead
- `update(port, source, cable)` will now only receive single arguments `update(cable)`. Please use `cable.input` to obtain `port`, and `cable.output` to obtain `source`.
- `request(port, sourceIface)` will now only receive single arguments `request(cable)`. Please use `cable.output` to obtain `port`, and `cable.input.iface` to obtain `sourceIface`.

```js
class MyNode extends Blackprint.Node {
    static input = {
        // Before
        AnyType: null,

        // After
        AnyType: Blackprint.Types.Any,
    }

    // Before
    update(port, source, cable){}
    // After
    update(cable){} // port = cable.input, source = cable.output

    // Before
    request(port, sourceIface){}
    // After
    request(cable){} // port = cable.output, sourceIface = cable.input.iface
}
```

# 0.6.6

### Bug Fix
- Fix data type validation for any type

# 0.6.5

### Features
- Add used variable nodes's reference list
- Add support for exporting custom function and variable
- Add feature to rename/delete port for custom function node
- Add support to use port feature for custom function node
- Add to do list to prepare for breaking changes
- Add destroy function
- Emit event when JSON was imported
- Finishing custom variable and function node

### Bug Fix
- Fix for copying custom function node
- Fix callable port for function node
- Fix variable node for callable port
- Fix port type checker for ArrayOf
- Fix type validation
- `_list` must be not enumerable
- Allow connect to union port with similar types
- Improve `value` event listener
- Skip module loader if no URL input
- Skip check for `undefined` port but allow `null` port
- Make some internal properties configurable

# 0.6.4

### Bug Fix
- Disallow use of arrow function
- Fix unit test that was using `Blackprint.OutputPort` and `Blackprint.InputPort`
- Fix undefined value on array port
- Fix and simplify version check

# 0.6.3

### Bug Fix
- Fix field name
- Fix node deletion
- Fix undeleted root nodes when deleting module

### Features
- Add colors when downloading module
- Put unresolved module conflict into pending list
- Add `onModuleConflict` to handle conflict externally
- Add support for remote engine
- Add `Blackprint.Environment.loadFromURL = true` if the environment prefer to use module from URL
- Improve ESM module loader

# 0.6.2

### Bug Fix
- Fix module version checker
- Add spaces to `BP-Union` class
- Make `_event` field writable
- Remove unused function and some minor changes
- Fix incorrect field name
- Fix some error when Sketch is being run on Jest environment

### Features
- Add port `call` listener (for Trigger port) and fix `connectPort`
- Add feature for using newest module and delete nodes by module URL
- Add options to skip some import data
- Throw error when the port type is undefined

# 0.6.1

### Bug Fix
- Fix `registerNode` and `registerInterface` to be used for decorator

### Features
- Add `Blackprint.OutputPort` and `Blackprint.InputPort` for testing or scripting

# 0.6.0

### Features
- Add feature to rename port
- Add utils to help fix minified class name
- Add instance storage for variables, functions

### Breaking Changes
- Creating input/output port dynamically now become:
    - After: `node.createPort("input" | "output", name, type)`
    - Before: `node.input.add(name, type)`
- Deleting input/output port dynamically now become:
    - After: `node.deletePort("input" | "output", name)`
    - Before: `node.input.delete(name)`
- Input/output port name that start with `_` will be ignored
- Rename some function and mark it as private
- `node.input` and `node.output` construction now must be changed to static class variable

<details>
    <summary>Click here to open details</summary>

```js
class MyCustomNode extends Blackprint.Node {
    // Before
    input = { MyInput: Number };
    output = { MyOutput: Number };

    // After
    static input = { MyInput: Number };
    static output = { MyOutput: Number };
}
```
</details>

# 0.5.2

### Bug Fix
- Fix error when moving nodes from sketch
- Fix `Any` type data when trying to drop cable to the node header
- Fix incorrect cable arrangement when the sketch is being reimported
- Fix cable order when being connected from input port
- Fix port value that was not updated because of cache
- Fix default port value

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