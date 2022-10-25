<p align="center"><a href="#" target="_blank" rel="noopener noreferrer"><img width="150" src="https://avatars2.githubusercontent.com/u/61224306?s=150&v=4" alt="Blackprint"></a></p>

<h1 align="center">Blackprint Engine for JavaScript</h1>
<p align="center">Run exported Blackprint on any JavaScript environment.</p>

<p align="center">
  <a href='https://github.com/Blackprint/Blackprint/blob/master/LICENSE'><img src='https://img.shields.io/badge/License-MIT-brightgreen.svg' height='20'></a>
  <a href='https://github.com/Blackprint/Blackprint/actions/workflows/build.yml'><img src='https://github.com/Blackprint/Blackprint/actions/workflows/build.yml/badge.svg?branch=master' height='20'></a>
  <a href='https://www.npmjs.com/package/@blackprint/engine'><img src='https://img.shields.io/npm/v/@blackprint/engine.svg' height='20'></a>
  <a href='https://discord.gg/cz9rh3a7d6'><img src='https://img.shields.io/discord/915881655921704971.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2' height='20'></a>
</p>

This repository is designed to be used together with [Blackprint](https://github.com/Blackprint/Blackprint) as the engine on the Browser, Node.js, Deno, and other JavaScript environment.

## Documentation
> Warning: This project haven't reach it stable version (semantic versioning at v1.0.0)<br>
> But please try to use it and help improve this project

If you want to port this engine to another programming language, please use [engine-php](https://github.com/Blackprint/engine-php) or [engine-python](https://github.com/Blackprint/engine-python) as a reference instead.

---

### Importing the Engine
Please specify the version when importing, breaking changes may happen on v0.\*.0 incremental.

Browser
```html
<script src="https://cdn.jsdelivr.net/npm/@blackprint/engine@0.8"></script>
<script>
    let instance = new Blackprint.Engine();
    instance.importJSON("{...}");
</script>
```

Node.js
```sh
# Add the dependency first
npm i @blackprint/engine@0.8
```

```js
let Blackprint = require('@blackprint/engine');

let instance = new Blackprint.Engine();
instance.importJSON("{...}");
```

Deno
```js
import Blackprint from 'https://cdn.skypack.dev/@blackprint/engine@0.8';

let instance = new Blackprint.Engine();
instance.importJSON("{...}");
```

> For Deno, you need to use `--allow-net` to allow importing modules from URL

---

### Creating Custom Nodes
You can use [this template](https://github.com/Blackprint/template-js) for creating new nodes, the template is designed for Browser/Node.js/Deno. By using `@blackprint/cli-tools` you can attach the compiler with the [Blackprint Editor](https://blackprint.github.io/) for fast development with hot reload for Browser. The template also contain some example + comment, and designed for URL module loader on Browser/Node.js/Deno.

You can also use different build tools like Rollup/WebPack/etc in case you're more familiar with it for your project, but currently you will lose `.sf` extension compiler and hot reloading or documenting the nodes _may_ be more complicated.

### Defining Blackprint Node and Interface
Because JavaScript does support class-based programming, we will create our custom nodes and interface by using `class`. Below is an example for plain JavaScript, in case your compiler does support for using decorator you can also use `@Blackprint.registerNode("...")` as class decorator.

```js
// Node will be initialized first by Blackprint Engine
// This should be used for initialize port structure and set the target interface
Blackprint.registerNode('LibraryName/FeatureName/Template',
class MyTemplate extends Blackprint.Node {
    // this == node

    // You can use type data like Number/String or "Blackprint.Port"
    // use "Blackprint.Port.Trigger" if it's callable port
    static input = {
        PortName1: Blackprint.Port.Default(Number, 123)
    };

    // Output only accept 1 type data
    // use "Function" if it's callable port
    static output = {
        PortName2: Number
    };

    constructor(instance){
        super(instance);

        // Interface path
        // Let it empty if you want to use default built-in interface
        // You don't need to '.registerInterface()' if using default interface
        let iface = this.setInterface('BPIC/LibraryName/FeatureName/Template');
        iface.title = 'My Title';
        iface.description = 'My Description';
    }

    // Put logic as minimum as you can in .registerNode
    // You can also put these function on .registerInterface instead
    init(){
        // Called before iface.init()
    }

    update(cable=null){
        // Triggered when any output value from other node are updated
        // And this node's input connected to that output

        /**
         * Using this .update() function is MORE recommended rather than listening
         * for value changes with event listener.
         * 
         * Multiple input update will be delayed by the internal execution order
         * and this function will be triggered once this node has turn to be updated
         * 
         * In case you need to partially update for specific ports
         * you can enable the mode by adding code below on your constructor function
         * > this.partialUpdate = true;
         * 
         * By using `.partialUpdate` when this node is going to be updated
         * this `.update` function will be called multiple times for every updated cable
         * and the `cable` parameter will no longer null, but it will referencing to the updated cable
         */ 
    }

    request(){
        // Triggered when other connected node is requesting
        // output from this node that have empty output
    }

    imported(){
        // When this node was successfully imported
    }
});
```

Let's also define our custom interface, this is optional and needed only if you want to provide access for other developer. Just like an API (Application Programming Interface).

```js
var Context = {IFace: {}};

// For Non-sketch interface
// - first parameter is named path must use BPIC prefix
// - second parameter is interface class, you can also use function for construct the interface
Blackprint.registerInterface('BPIC/LibraryName/FeatureName/Template',
Context.IFace.MyTemplate = class IMyTemplate extends Blackprint.Interface {
    // this == iface

    constructor(node){
        super(node); // 'node' object from .registerNode

        this.myData = 123;
        this._log = '...';

        // If the data was stored on this field ".data", they will be exported as JSON
        // (Property name with _ or $ will be ignored)
        this.data = {
            get value(){ return this._value },
            set value(val){ this._value = val },
        };

        // Creating object data with class is more recommended
        // this.data = new MyDataStructure(this);
    }

    // When importing nodes from JSON, this function will be called
    imported(data){
        // Use object assign to avoid replacing the object reference
        Object.assign(iface.data, data);
    }

    init(){
        // When Engine initializing this scope

        // ====== Port Shortcut ======
        const {
            IInput, IOutput, IProperty, // Port interface
            Input, Output, Property, // Port value
        } = this.ref;

        // Port interface can be used for registering event listener
        // Port value can be used for get/set the port value
        // By the way, Property is reserved feature, don't use it

        // this.output === IOutput
        // this.input === IInput
        // this.node.output === Output
        // this.node.input === Input

        // this.output.Test => Port Interface
        // this.node.output.Test => Number value
    }

    // Create custom getter and setter
    get log(){ return this._log }
    set log(val){
        this._log = val
    }
});
```

`Context.IFace.MyTemplate` need to be saved somewhere if you want to create Interface for Sketch that extends `IMyTemplate`.

### Defining Node Interface for Sketch
```js
// For Sketch Interface, this will being passed to ScarletsFrame
// - first parameter is IFace namespace
// - second parameter can be used for custom options (this is required if you're not using Blackprint compiler and want to define custom HTML)
// - third parameter can be placed on second parameter, it's must be class/function for construction
Blackprint.Sketch.registerInterface('BPIC/LibraryName/FeatureName/Template', {
  html: `
  <div class="node your-class" style="transform: translate({{ x }}px, {{ y }}px)">
    <sf-template path="Blackprint/nodes/template/header.sf"></sf-template>

    <div class="content">
      <div class="design-me">You can design me with CSS</div>

      <div class="left-port">
        <sf-template path="Blackprint/nodes/template/input-port.sf"></sf-template>
      </div>

      <div class="right-port">
        <sf-template path="Blackprint/nodes/template/output-port.sf"></sf-template>
      </div>
    </div>

    <sf-template path="Blackprint/nodes/template/other.sf"></sf-template>
  </div>`
},
class IMyTemplate extends Context.IFace.MyTemplate {
  // this == iface

  constructor(node){
    super(node); // 'node' object from .registerNode

    this.keepMe = $('<div>');
    this.keepMe.text("Hello world!");
    this.keepMe.css({
      width: '100%',
      textAlign: 'center'
    });

    // Any property on 'iface' can be binded with the HTML
    this.log = '123'; // <div attr="{{ log }}">{{ log }}</div>
  }

  // Will run once the node element was attached to DOM tree
  init(){
    // When ScarletsFrame initialized this HTML element

    // Run everytime ScarletsFrame hot reload current scope
    this.$el('.content').prepend(this.keepMe);
    var Node = this.node; // 'node' object from .registerNode

    // === Shortcut to get/set node's port value ===
    var My = this; // Shortcut
    // My.init = function(){...}

    // This is just a shortcut of "Node.input" and "Node.output"
    // initialized from Template.js
    const {
      IInput, IOutput, // Port interface
      Input, Output, // Port value
    } = My.ref; // My.ref === this.ref

    // Update the port value
    Output.PortName2 = 123; // This will also trigger 'value' event to connected input ports
    // Output.PortName2 === My.node.output.PortName2

    // Node event listener can only be registered after node init
    My.on('cable.connect', Context.EventSlot, function({ port, target, cable }){});

    // Can be used for IInput, IOutput
    // Control the port interface (event listener, add new port, etc)
    IInput.PortName1
      // When connected output node have updated the value
      // Also called after 'connect' event
      .on('value', Context.EventSlot, function({ target }){
        console.log("PortName1:", target);
      })

      // When connection success
      .on('connect', Context.EventSlot, function({ port, target, cable }){})

      // When connection closed
      // not being called if the connection doesn't happen before
      .on('disconnect', Context.EventSlot, function({ port, target, cable }){});

    function myLongTask(callback){
      setTimeout(()=> callback(true), 1000);
    }

    IOutput.PortName2
      // When this port are trying to connect with other node
      .on('connecting', Context.EventSlot, function({ port, target, activate }){
        myLongTask(function(success){
          if(success)
            activate(true) // Cable will be activated
          else activate(false) // Cable will be destroyed
        });

        // Empty = is like we're not giving the answer now
        activate() // Mark as async

        // Or destroy it now
        // activate(false)
      })

    // ...
  }

  // Below are optional life cycle, only for Blackprint.Sketch.Interface

  // This must use ScarletsFrame Development mode
  // Hot reload feature also must be activated -> "window.sf.hotReload(1);"
  hotReload(){
    console.log("Going to hot reload this object", this);
    this.hotReloading === true; // this will be true
  }

  hotReloadedHTML(){
    console.log("Was HTML changed/reloaded", this);
  }

  hotReloaded(){
    console.log("Hot reload active", this);

    // Let's call init again
    this.init();
  }

  /*
  destroy(){ this.init() }
  initClone(){ this.init() }
  destroyClone(){ this.init() }
  */
});
```

## Creating new Engine instance

```js
// Create Blackprint Engine instance
let instance = new Blackprint.Engine();

// You can import nodes with JSON
// if the nodes haven't been registered, this will throw an error
await instance.importJSON(`{...}`);

// You can also create the node dynamically
let iface = instance.createNode('LibraryName/FeatureName/Template', /* {..options..} */);

// Change the default data 'value' property
iface.data["value"] = 123;

// --- Obtaining Node from Interface
let node = iface.node;

// Assign the input port = 21
node.input["PortName2"] = 21;

// Get the value from output port
console.log(node.output["PortName2"]()); // 21

// --- Obtaining Interface by ID
// Can only work if the node's JSON/options has specified it's ID
let iface2 = instance.createNode('LibraryName/FeatureName/Template', {x: 10, y: 20, id: "foo"});
console.log(instance.iface["foo"].data["value"]);
```

### Example
Please visit the `/example` folder if you want to try the code.
![B71rGnn84k](https://user-images.githubusercontent.com/11073373/194287719-9e37b3a1-eb5a-4f58-a746-df982420299b.jpg)

## Contributing
Feel free to contribute any bug fix, improvement, report an issue or ask a feature for the Engine.

When improving this Blackprint Engine, you will need to clone the [main repository](https://github.com/Blackprint/Blackprint). For further instruction it will be written on the [documentation](http://stefansarya.gitbook.io/blackprint).

## License
MIT