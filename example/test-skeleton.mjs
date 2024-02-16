// node ./test-skeleton.mjs
// bun run ./test-skeleton.mjs
// deno run ./test-skeleton.mjs

// import Blackprint from '@blackprint/engine/skeleton';
import Blackprint from './../../dist/skeleton.min.js';

let aa = new Blackprint.Skeleton(`{"instance":{"Example/Math/Random":[{"i":0,"x":298,"y":73,"z":0,"output":{"Out":[{"i":2,"name":"A"}]}},{"i":1,"x":298,"y":239,"z":1,"output":{"Out":[{"i":2,"name":"B"}]}}],"Example/Math/Multiply":[{"i":2,"x":525,"y":155,"z":2,"output":{"Result":[{"i":3,"name":"Any"}]}}],"Example/Display/Logger":[{"i":3,"x":763,"y":169,"z":3,"id":"myLogger","input":{"Any":[{"i":2,"name":"Result"},{"i":5,"name":"Value"}]}}],"Example/Button/Simple":[{"i":4,"x":41,"y":59,"z":4,"id":"myButton","output":{"Clicked":[{"i":2,"name":"Exec"}]}}],"Example/Input/Simple":[{"i":5,"x":38,"y":281,"z":5,"id":"myInput","data":{"value":"saved input"},"output":{"Changed":[{"i":1,"name":"Re-seed"}],"Value":[{"i":3,"name":"Any"}]}}]},"moduleJS":["https://cdn.jsdelivr.net/npm/@blackprint/nodes@0.8/dist/nodes-example.mjs"]}`);

if(aa.ifaceList.length === 0) throw new Error("Failed to load");
else console.log("Ok");