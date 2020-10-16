<p align="center"><a href="#" target="_blank" rel="noopener noreferrer"><img width="150" src="https://avatars2.githubusercontent.com/u/61224306?s=150&v=4" alt="Blackprint"></a></p>

<h1 align="center">Blackprint Interpreter for JavaScript</h1>
<p align="center">Run exported Blackprint on any JavaScript environment.</p>

<p align="center">
    <a href='https://github.com/Blackprint/Blackprint/blob/master/LICENSE'><img src='https://img.shields.io/badge/License-MIT-brightgreen.svg' height='20'></a>
</p>

This repository is designed to be used together with [Blackprint](https://github.com/Blackprint/Blackprint) as the interpreter on the Browser, Node.js, Deno, and other JavaScript environment.

## Documentation
> Warning: This project haven't reach it stable version (semantic versioning at v1.0.0)<br>
> The available API is similar with Blackprint.Sketch
> The documentation here only write the different API

### Register new node interface type
An interface is designed for communicate the node handler with the JavaScript's runtime API. Because there're no HTML to be controlled, this would be little different with the browser version.

```js
// -> (node identifier, callback)
Blackprint.Interpreter.registerInterface('logger', function(iface, bind){
	// `bind` is used for bind `iface` property with a function
	// And polyfill for ScarletsFrame element binding system

	var myLog = '...';
	bind({
		get log(){
			return myLog;
		},
		set log(val){
			myLog = val;
			console.log(val);
		}
	});

	// After that, you can get/set from `iface` like a normal property
	// iface.log === '...';

	// In the iface object, it simillar with: https://github.com/Blackprint/Blackprint
	iface.clickMe = function(){...}
});
```

## Node handler registration
This is where we register our logic with Blackprint.<br>
If you already have the browser version, you can just copy it without changes.<br>
It should be compatible if it's not accessing any Browser API.<br>

```js
// -> (namespace, callback)
Blackprint.Interpreter.registerNode('myspace/button', function(node, iface){
    // Use iface handler from instance.registerInterface('button')
    iface.type = 'button';
    iface.title = "My simple button";

    // Called after `.button` have been clicked
    node.onclicked = function(ev){
        console.log("Henlo", ev);
    }
});
```

## Node handler registration
```js
// Create Blackprint Interpreter instance, `instance` in this documentation will refer to this
var instance = new Blackprint.Interpreter();

// Example: Create new node (after registration)
var node = instance.createNode('math/multiply', {/* node options */});

// Clear all nodes on this instance
instance.clearNodes();

// Example: Import nodes from JSON (after registration)
instance.importJSON(/* JSON || Object */);
```

### Example
![9lM3o2Trur](https://user-images.githubusercontent.com/11073373/81947175-72616600-962a-11ea-8e83-cfb4ba0c85c2.png)

This repository provide an example with the JSON too, and you can try it with Node.js or Deno:<br>

```sh
# Change your working directory into empty folder first
$ git clone --depth 1 https://github.com/Blackprint/interpreter-js .
$ npm i
$ node ./example/init.js
```