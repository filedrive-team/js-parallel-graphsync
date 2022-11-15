import { 
    GraphSync,
    allSelector,
    Node,
    Kind,
    SelectorNode,
  } from "@dcdn/graphsync";
  import {CID} from "multiformats";
  import type {Store} from "interface-store";
  import type {Multiaddr} from "multiaddr";
  import PeerId from "peer-id";
  import mime from "mime/lite";
  import {EventEmitter} from "events";
  import {UnixFS} from "ipfs-unixfs";
  import { walkBlocks,parseContext,LinkLoader } from './traversal'
  import initWasm from './wasm_exec';
  const EXTENSION = "fil/data-transfer/1.1";
  
  const _event = new EventEmitter()
  
  _event.on('message', function (data) {
    //console.log(data,'message');
  })
  
  interface optionType {
    headers: {[key: string]: string};
    provider: any;
    exchange: GraphSync;
    voucher?: any;
    voucherType?: string;
    store:Store<CID, Uint8Array>,
    id:string
  };

  type FetchInit = {
    headers: {[key: string]: string};
    provider: any;
    exchange: GraphSync;
    voucher?: any;
    voucherType?: string;
    store:Store<CID, Uint8Array>,
    id:string
  };

  export async function pathToSelector(){
    initWasm();
    //@ts-ignore
    const go = new Go();
    const res = await WebAssembly.instantiateStreaming(fetch("./selector-12.wasm"), go.importObject);
    go.run(res.instance)
    
    //@ts-ignore
    const _selector = unionPathSelector('Links/0/Hash/Links/0/Hash/','Links/0/Hash/Links/1/Hash/')
    console.log(_selector,'unionPathSelectorunionPathSelectorunionPathSelector');
    // var str = `{"f":{"f>":{"Links":{"|":[{"f":{"f>":{"0":{"f":{"f>":{"Hash":{"f":{"f>":{"Links":{"|":[{"f":{"f>":{"0":{"f":{"f>":{"Hash":{"R":{":>":{"f":{"f>":{"Links":{"f":{"f>":{"0":{"f":{"f>":{"Hash":{"@":{}}}}}}}}}}},"l":{"none":{}}}}}}}}}},{"f":{"f>":{"2":{"f":{"f>":{"Hash":{"R":{":>":{"f":{"f>":{"Links":{"f":{"f>":{"0":{"f":{"f>":{"Hash":{"@":{}}}}}}}}}}},"l":{"none":{}}}}}}}}}}]}}}}}}}}}},{"f":{"f>":{"1":{"f":{"f>":{"Hash":{"f":{"f>":{"Links":{"f":{"f>":{"1":{"f":{"f>":{"Hash":{"R":{":>":{"f":{"f>":{"Links":{"f":{"f>":{"0":{"f":{"f>":{"Hash":{"@":{}}}}}}}}}}},"l":{"none":{}}}}}}}}}}}}}}}}}}}]}}}}`;
    // //@ts-ignore
    // const b = parseComplexSelectors(str)
    return _selector
  }

  export async function _fetch(url: string, init: FetchInit) {
    const {headers, exchange, provider, voucher, voucherType,store} = init;
    const {root} = unixfsPathSelector(url);
    const _wasm = await pathToSelector();
    // const sel = JSON.parse(_wasm)
    
    let result:any = []
    await pro()
    return new Response(result[0], {
      status: 200,
      headers,
    });
  
    async function pro(){
      for await (let item of provider){
        const request = exchange.request(root, item.selector);
        const extensions: {[key: string]: any} = {};
        if (voucher && voucherType) {
          const id = Date.now();
          extensions[EXTENSION] = {
            IsRq: true,
            Request: {
              BCid: root,
              Type: 0,
              Pull: true,
              Paus: false,
              Part: false,
              Stor: item.selector,
              Vouch: voucher,
              VTyp: voucherType,
              XferID: id,
              RestartChannel: ["", "", 0],
            },
            Response: null,
          };
        }
        console.log(item.peer,'item.peer000');
        
        const pid = getPeerID(item.peer);
        exchange.network.peerStore.addressBook.add(pid, [item.peer]);
        request.open(pid, extensions);
        
        const content = resolve(root, item.selector, request,store,request.id);
        const iterator = content[Symbol.asyncIterator]();
        const parts = url.split(".");
        const extension = parts.length > 1 ? parts.pop() : undefined;
        const mt = extension ? mime.getType(extension) : undefined;
        if (mt) {
          headers["content-type"] = mt;
        }
        await write(iterator);
        request.close();
      }
    }
  
  
    async function write(iterator:any) {
      try {
        const {readable, writable} = new TransformStream();
        const writer = writable.getWriter();
        let chunk = await iterator.next();
        while (chunk.value !== null && !chunk.done) {
          writer.write(chunk.value);
          chunk = await iterator.next();
        }
        result.push(readable);
        writer.close();
      } catch (e) {
        const {writable} = new TransformStream();
        const writer = writable.getWriter();
        writer.abort((e as Error).message);
      }
    }
  }

  export function generatePath(blk:any,result:string){
    // /Links/0/Hash
    
    return result;
  }
  
  export async function* resolve(
    root: CID,
    selector: SelectorNode,
    loader: LinkLoader,
    store:Store<CID, Uint8Array>,
    id:string
  ): AsyncIterable<Uint8Array> {
    let path = "";
    const pathArr = [''];
    const has = await store.has(root);
    const _s = parseContext().parseSelector(selector);
    console.log(_s,'parseContext().parseSelector(selector)');
    
    for await (const blk of walkBlocks(
      new Node(root),
      parseContext().parseSelector(selector),
      loader,
    )) {
      console.log(blk,'blkblkblk');
      
      if(blk.value.Links){
        const links = blk.value.Links;
        if(links.length){
          for (let i = 0; i <links.length; i++) {
            console.log(path+`Links/${i}/Hash/`);
          }
          path = path + 'Links/0/Hash/';
        }
      }
      // if not cbor or dagpb just return the bytes
      switch (blk.cid.code) {
        case 0x70:
        case 0x71:
          break;
        default:
          yield blk.bytes;
          continue;
      }
      if (blk.value.kind === Kind.Map && blk.value.Data) {
        try {
          const unixfs = UnixFS.unmarshal(blk.value.Data);
          if (unixfs.type === "file") {
            if (unixfs.data && unixfs.data.length) {
              yield unixfs.data;
            }
            continue;
          }
        } catch (e) {}
        // we're outside of unixfs territory
        // ignore
      }
    }
  }
  
  export function getPeerID(addr: Multiaddr): PeerId {
    const addrStr = addr.toString();
    const parts = addrStr.split("/");
    const idx = parts.indexOf("p2p") + 1;
    if (idx === 0) {
      throw new Error("Multiaddr does not contain p2p peer ID");
    }
    return PeerId.createFromB58String(parts[idx]);
  }

  export function unixfsPathSelector(path: string): {
    root: CID;
    selector: SelectorNode;
  } {
    
    const {root, segments} = parsePath(path);
    let selector = allSelector;
    if (segments.length === 0) {
      return {root, selector};
    }
    for (let i = segments.length - 1; i >= 0; i--) {
      selector = {
        "~": {
          as: "unixfs",
          ">": {
            f: {
              "f>": {
                [segments[i]]: selector,
              },
            },
          },
        },
      };
    }
    return {root, selector};
  }

export function parsePath(path: string): {root: CID; segments: string[]} {
  const comps = toPathComponents(path);
  const root = CID.parse(comps[0]);
  return {
    segments: comps.slice(1),
    root,
  };
}

export function toPathComponents(path = ""): string[] {
  // split on / unless escaped with \
  return (path.trim().match(/([^\\^/]|\\\/)+/g) || []).filter(Boolean);
}
