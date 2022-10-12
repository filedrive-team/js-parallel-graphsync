```
npm i js-parallel-graphsync
```
### example
```
cd example
npm run start
```
serve
```
go run main.go
```

```
import { fetch } from 'js-parallel-graphsync'
import { push, GraphSync} from "@dcdn/graphsync";
import {Multiaddr} from "multiaddr";
import type {Store} from "interface-store";
import type {CID} from "multiformats";
import {create as createLibp2p, Libp2p} from "libp2p";
import WebSockets from "libp2p-websockets";
import Mplex from "libp2p-mplex";
import {Noise} from "@chainsafe/libp2p-noise";
import {Cachestore} from "@dcdn/cachestore";

class Client {
  exchange: GraphSync;
  store: Store<CID, Uint8Array>;
  constructor(net: Libp2p, store: Store<CID, Uint8Array>) {
    console.log('constructor');
    
    this.store = store;
    this.exchange = new GraphSync(net, store);
    this.exchange.start();
  }
  fetch(path: string, maddr: string): Promise<Response> {
    const peerAddr = new Multiaddr(maddr);
    return fetch(path, {
      exchange: this.exchange,
      headers: {},
      provider: peerAddr,
      voucher: ["any"],
      voucherType: "BasicVoucher",
    });
  }
  push(path: string, maddr: string): Promise<void> {
    const peerAddr = new Multiaddr(maddr);
    return push(path, {
      exchange: this.exchange,
      maddr: peerAddr,
      voucher: ["any"],
      voucherType: "BasicVoucher",
    });
  }
}


async function createClient(): Promise<Client> {
    const blocks = new Cachestore("/graphsync/blocks");
    await blocks.open();
    const libp2p = await createLibp2p({
      modules: {
        transport: [WebSockets],
        connEncryption: [new Noise()],
        streamMuxer: [Mplex],
      },
      config: {
        transport: {
          [WebSockets.prototype[Symbol.toStringTag]]: {
            filter: filters.all,
          },
        },
        peerDiscovery: {
          autoDial: false,
        },
      },
    });
    await libp2p.start();
    return new Client(libp2p, blocks);
}

createClient().then((client) => {
    const root = 'bafybeianqrfazwlwp4jxzg72ecfhw7ag4iomlxnix4hqpft5aqrufhkira'
    const maddr = '/ip4/127.0.0.1/tcp/41507/ws/p2p/QmQSUNRnyZAZQXmi1E2QzpT4kh8N4PwDRvpgMh4wC2WgJz'
    client.fetch(root, maddr)
});

```
