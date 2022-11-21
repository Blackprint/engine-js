// node ./test-skeleton.mjs
// deno run ./test-skeleton.mjs

// import Blackprint from '@blackprint/engine/skeleton';
import Blackprint from './../dist/skeleton.mjs';

let aa = new Blackprint.Skeleton(`{"_":{"moduleJS":["https://cdn.jsdelivr.net/npm/@blackprint/nodes@0.5/dist/nodes-example.mjs"]},"Example/Math/Random":[{"i":0,"x":298,"y":73,"output":{"Out":[{"i":2,"name":"A"}]}},{"i":1,"x":298,"y":239,"output":{"Out":[{"i":2,"name":"B"}]}}],"Example/Math/Multiply":[{"i":2,"x":525,"y":155,"output":{"Result":[{"i":3,"name":"Any"}]}}],"Example/Display/Logger":[{"i":3,"id":"myLogger","x":763,"y":169}],"Example/Button/Simple":[{"i":4,"id":"myButton","x":41,"y":59,"output":{"Clicked":[{"i":2,"name":"Exec"}]}}],"Example/Input/Simple":[{"i":5,"id":"myInput","x":38,"y":281,"data":{"value":"saved input"},"output":{"Changed":[{"i":1,"name":"Re-seed"}],"Value":[{"i":3,"name":"Any"}]}}]}`);

if(aa.ifaceList.length === 0) throw new Error("Failed to load");
else console.log("Ok");