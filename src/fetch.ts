import { 
    GraphSync,
    unixfsPathSelector,
    allSelector,
    Node,
    Kind,
    LinkLoader,
    parseContext,
    walkBlocks,
    SelectorNode,
  } from "@dcdn/graphsync";
  import {CID} from "multiformats";
  import type {Store} from "interface-store";
  import type {Multiaddr} from "multiaddr";
  import PeerId from "peer-id";
  import mime from "mime/lite";
  import {EventEmitter} from "events";
  import {UnixFS} from "ipfs-unixfs";
  
  const EXTENSION = "fil/data-transfer/1.1";
  
  const _event = new EventEmitter()
  
  _event.on('message', function (data) {
    console.log(data,'on message')
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
  export async function fetch(url: string, option: optionType){
    console.log('fetch 1234455');
    const {headers, exchange, provider, voucher, voucherType,store} = option;
    const {root, selector: sel} = unixfsPathSelector(url);
    let result:any = []
  
    await request()
  
    return new Response(result[0], {
      status: 200,
      headers,
    });
  
    async function request(){
      for await (let item of provider){
        const request = exchange.request(root, sel);
        
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
              Stor: sel,
              Vouch: voucher,
              VTyp: voucherType,
              XferID: id,
              RestartChannel: ["", "", 0],
            },
            Response: null,
          };
        }
        const pid = getPeerID(item);
        exchange.network.peerStore.addressBook.add(pid, [item]);
        request.open(pid, extensions);
        const content = resolve(root, sel, request,store,request.id);
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
        console.log(e);
        const {writable} = new TransformStream();
        const writer = writable.getWriter();
        writer.abort((e as Error).message);
      }
    }
  
  }
  
  export async function* resolve(
    root: CID,
    selector: SelectorNode,
    loader: LinkLoader,
    store:Store<CID, Uint8Array>,
    id:string
  ): AsyncIterable<Uint8Array> {
    let path = "";
    const has = await store.has(root)
    console.log(has,'has 123333');
    
    for await (const blk of walkBlocks(
      new Node(root),
      parseContext().parseSelector(selector),
      loader,
    )) {
      const _links = blk.value.Links
      if(_links){
        _links.forEach((item:any,index:any)=>{
          const _path = path + `/Hash/${index}/Links`;
          const _length = _links.length
          _event.emit('message', {path:_path,links:_length,id})
          
        })
      }
      path = path + '/Hash/0/Links'
      console.log(blk,'blk 888');
  
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
        console.log(11122222);
        
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