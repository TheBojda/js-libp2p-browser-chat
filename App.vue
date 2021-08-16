<template>
  <div>
    <p>Your peerId: {{ myPeerId }}</p>
    <p>
      Other peerId:
      <input type="text" style="width: 420px" v-model="otherPeerId" /><button
        @click="findOtherPeer"
      >
        Find
      </button>
    </p>
    <p v-for="(multiaddr, idx) in otherPeerMultiaddrs" :key="'ma_' + idx">
      Other peer multiaddr: {{ multiaddr.toString() }}
    </p>
    <p v-for="(protocol, idx) in otherPeerProtocols" :key="'p_' + idx">
      Other peer protocol: {{ protocol }}
    </p>
    <div v-if="otherPeerMultiaddrs.length > 0 && otherPeerProtocols.length > 0">
      <p>
        {{ otherPeerMultiaddr }}{{ otherPeerProtocol }}
        <button @click="dialProtocol">Dial protocol</button>
      </p>
    </div>
    <p v-if="remotePeerId">
      Remote peer connected: {{ remotePeerId.toString() }}
    </p>
    <p v-for="(msg, idx) in messages" :key="'msg_' + idx">
      {{ msg }}
    </p>
    <div v-if="chatQueue">
      <input type="text" style="width: 600px" v-model="chatMessage" /><button
        @click="sendMessage"
      >
        Send message
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import "babel-polyfill";
import Libp2p from "libp2p";
import Websockets from "libp2p-websockets";
import WebRTCStar from "libp2p-webrtc-star";
import { NOISE } from "libp2p-noise";
import Mplex from "libp2p-mplex";
import Bootstrap from "libp2p-bootstrap";
import KadDHT from "libp2p-kad-dht";
import PeerId from "peer-id";
import pushable from "it-pushable";
import pipe from "it-pipe";
import { array2str, str2array } from "./utils";
import { Component, Vue } from "vue-property-decorator";

const chatProtocol = "/chat/1.0.0";

@Component
export default class App extends Vue {
  private libp2p: Libp2p;
  private myPeerId: string = "";
  private otherPeerId: string = "";
  private otherPeerMultiaddrs: any[] = [];
  private otherPeerProtocols: string[] = [];
  private otherPeerMultiaddr: string = "";
  private otherPeerProtocol: string = "";
  private remotePeerId: any = "";
  private chatMessage: string = "";
  private messages: string[] = [];
  private chatQueue: any = false;

  async init() {
    this.libp2p = await Libp2p.create({
      addresses: {
        listen: [
          "/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star",
          "/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star",
        ],
      },
      modules: {
        transport: [Websockets, WebRTCStar],
        connEncryption: [NOISE],
        streamMuxer: [Mplex],
        peerDiscovery: [Bootstrap],
        dht: KadDHT,
      },
      config: {
        peerDiscovery: {
          [Bootstrap.tag]: {
            enabled: true,
            list: [
              "/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
              "/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb",
              "/dnsaddr/bootstrap.libp2p.io/p2p/QmZa1sAxajnQjVM8WjWXoMbmPd7NsWhfKsPkErzpm9wGkp",
              "/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa",
              "/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt",
            ],
          },
        },
        dht: {
          enabled: true,
        },
      },
    });
    await this.libp2p.start();
    this.myPeerId = this.libp2p.peerId.toB58String();
    this.libp2p.handle(chatProtocol, ({ connection, stream, protocol }) => {
      this.remotePeerId = connection.remoteAddr.getPeerId();
      pipe(
        stream,
        (source) => {
          return (async function* () {
            for await (const buf of source) yield array2str(buf.slice());
          })();
        },
        async (source) => {
          for await (const msg of source) {
            this.messages.push("> " + msg);
          }
        }
      );
    });
  }

  mounted() {
    this.init();
  }

  async findOtherPeer() {
    let peerId = PeerId.parse(this.otherPeerId);
    let result = await this.libp2p.peerRouting.findPeer(peerId);
    this.otherPeerMultiaddrs = result.multiaddrs;
    this.otherPeerProtocols = this.libp2p.peerStore.protoBook.get(peerId);
    this.otherPeerMultiaddr = this.otherPeerMultiaddrs[0];
    this.otherPeerProtocol = chatProtocol;
  }

  async dialProtocol() {
    let peerId = PeerId.parse(this.otherPeerId);
    const { stream, protocol } = await this.libp2p.dialProtocol(
      peerId,
      chatProtocol
    );
    this.chatQueue = pushable();
    pipe(
      this.chatQueue,
      (source) => {
        return (async function* () {
          for await (const msg of source) yield str2array(msg);
        })();
      },
      stream
    );
  }

  sendMessage() {
    this.chatQueue.push(this.chatMessage);
    this.messages.push("< " + this.chatMessage);
    this.chatMessage = "";
  }
}
</script>

<style>
body {
  padding: 20px;
}
</style>
