import OmeggaPlugin, { OL, PS, PC } from 'omegga';

type Config = { foo: string };
type Storage = { bar: string };

export default class Plugin implements OmeggaPlugin<Config, Storage> {
  omegga: OL;
  config: PC<Config>;
  store: PS<Storage>;

  constructor(omegga: OL, config: PC<Config>, store: PS<Storage>) {
    this.omegga = omegga;
    this.config = config;
    this.store = store;
  }

  private checkForPlayer(plr: string): string {
    const lower = plr.toLowerCase();
    for (const p of this.omegga.getPlayers()) {
      if (p.name.toLowerCase() == lower) { return p.name; }
    }
    return null;
  }

  private cooldowns = {};
  private activeRequests = [];

  async init() {
    // Write your plugin!
    this.omegga.on('cmd:tpa', async (speaker: string, other: string) => {
      if (!other) { return; }
      const myTick = Date.now();

      if (this.cooldowns.hasOwnProperty(speaker)) {
        const CD = this.cooldowns[speaker];

        const diff = Date.now() - CD;
        if (diff <= 60000) {
          this.omegga.whisper(speaker, `You are on cooldown. <color="ff00ff">${Math.round(diff / 1000)}</> seconds remain.`);
          return;
        }
        delete this.cooldowns[speaker]; // Remove cooldown
      }


      const to = this.checkForPlayer(other.toLowerCase());
      if (!to) {
        console.log(`Unable to find player ${other}.`);
        return;
      }

      if (this.activeRequests[to]) { // false probably wont happen
        this.omegga.whisper(speaker, `${to} has an active TP request, please wait for them to accept or deny it.`);
        return;
      }

      this.omegga.whisper(to, `<color="ff00ff">${speaker}</> has sent you a TP request! Type <color="00ff00">/tpaccept</> or <color="ff0000">/tpdeny</> to respond.`);
      this.omegga.whisper(to, `Request will timeout after <color="ffff00">15</> seconds.`);
      this.omegga.whisper(speaker, `Successfully sent request to ${to}.`)

      this.activeRequests[to] = {from: speaker, tick: myTick};
      setTimeout(() => {
        if (this.activeRequests[to] && this.activeRequests[to].tick == myTick) {
          delete this.activeRequests[to];
          this.omegga.whisper(speaker, 'Request timed out.');
          this.omegga.whisper(to, 'Request timed out.');
        }
      }, 15000);
    });

    this.omegga.on('cmd:tpaccept', (speaker: string) => {
      if (this.activeRequests[speaker]) {
        const requestor = this.activeRequests[speaker].from;

        this.omegga.writeln(`Chat.Command /TP "${requestor}" "${speaker}"`);

        this.omegga.whisper(speaker, `Accepted request from ${requestor}.`);
        this.omegga.whisper(requestor, `${speaker} accepted your request!`);

        // Put the requestor on cooldown
        this.cooldowns[requestor] = Date.now();

        delete this.activeRequests[speaker];
      } else {
        this.omegga.whisper(speaker, 'You have no active requests');
      }
    });

    this.omegga.on('cmd:tpdeny', (speaker: string) => {
      if (this.activeRequests[speaker]) {
        const requestor = this.activeRequests[speaker].from;

        this.omegga.whisper(speaker, `Denied request from ${requestor}.`)
        this.omegga.whisper(requestor, `${speaker} denied your request.`);

        delete this.activeRequests[speaker];
      } else {
        this.omegga.whisper(speaker, 'You have no active requests.');
      }
    });

    return { registeredCommands: ['tpa', 'tpaccept', 'tpdeny'] };
  }

  async stop() {
    // Anything that needs to be cleaned up...
  }
}
