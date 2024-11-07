# NodeMerlinWrtApi

The purpose of this project is to provide a library that can be used to

* connect to a router running the [Merlin] Firmware
* fetching infos regarding router, clients, traffic, etc.
* running arbitrary commands (untested)

## Installation

```shell
$# npm i --save node-merlin-wrt-api
```

## Usage

```js
"use strict";

const node_merlin_wrt_api = require("node-merlin-wrt-api");
(async () => {
    const api = new node_merlin_wrt_api.NodeMerlinWrtApi('admin', 'changeMe', 'https://192.168.1.1:8443', true);
    console.log('Api created');

    const token = await api.getAuthToken();
    console.log(`New Auth Token: "${token}"`);

    const data = await api.getClientList();
    console.log(`Recieved clients macs: ${JSON.stringify(data.macList)}`);

    await api.logout();
})().then(() => {
    process.exit();
}).catch(err => {
    console.error(err);
    process.exit(1);
});
```

## Development

Start the dev-Container described in `docker-compose.yml`-file:

```shell
$# docker-compose run --rm dev ash
/src $
```

### Debugging

whilst in the dev-containers shell, run:

```shell
$# npm run tsx -- --inspect-wait=0.0.0.0:9229 Example/example.ts
```

then attach your node inspector of choice to port `9229`, e.g. with vscode and the following configuration:

`.vscode/launch.json`:

```json
"configurations": [
  {
    "type": "node",
    "request": "attach",
    "name": "Docker: Attach to Node",
    "remoteRoot": "/usr/src/app",
    "port": 9229,
    "remoteRoot": "/src",
    "localRoot": "${workspaceFolder}"
  },
]
```
