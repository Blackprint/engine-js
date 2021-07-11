<p align="center"><a href="#" target="_blank" rel="noopener noreferrer"><img width="150" src="https://avatars2.githubusercontent.com/u/61224306?s=150&v=4" alt="Blackprint"></a></p>

<h1 align="center">Blackprint Engine for JavaScript</h1>
<p align="center">Run exported Blackprint on any JavaScript environment.</p>

<p align="center">
    <a href='https://github.com/Blackprint/Blackprint/blob/master/LICENSE'><img src='https://img.shields.io/badge/License-MIT-brightgreen.svg' height='20'></a>
</p>

This repository is designed to be used together with [Blackprint](https://github.com/Blackprint/Blackprint) as the engine on the Browser, Node.js, Deno, and other JavaScript environment.

## Documentation
Please visit [Blackprint's Wiki](https://github.com/Blackprint/Blackprint/wiki/JavaScript-Standalone-Node-Engine) to see the documentation.

### Importing
Please specify the version when importing, breaking changes may happen on v0.\*.0 incremental.

Browser
```html
<script src="https://cdn.jsdelivr.net/npm/@blackprint/engine@0.1.0"></script>
<script>
	console.log(Blackprint.Engine);
</script>
```

Node.js
```sh
# Add the dependency first
npm i @blackprint/engine@0.1.0
```

```js
let Blackprint = require('@blackprint/engine');
let { Engine } = Blackprint;
```

Deno
```js
import Blackprint from 'https://cdn.skypack.dev/@blackprint/engine@0.1.0';
let { Engine } = Blackprint;
```

### Example
Please visit the `/example` folder if you want to see the code.
![9lM3o2Trur](https://user-images.githubusercontent.com/11073373/81947175-72616600-962a-11ea-8e83-cfb4ba0c85c2.png)

## Contributing
Feel free to contribute any bug fix, improvement, report an issue or ask a feature for the Engine.

When improving this Blackprint Engine, you will need to clone the main repository. For further instruction it will be written on the [documentation](http://stefansarya.gitbook.io/blackprint).