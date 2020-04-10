import { iStartWith, skipBots } from '../adapters/discord/operators';
import { DiscordRx } from 'adapters/discord/discordRx';
import got, { CancelableRequest } from 'got';
import { VoiceChannel } from 'discord.js';

const getStreamUrl = (name: string, quality = 320) => `http://air2.radiorecord.ru:9003/${name}_${quality}`;

const getTrackNameUrl = (name: string) => `https://www.radiorecord.ru/xml/${name}_online_v8.txt`;

// prettier-ignore
const genres = ["rr", "deep", "rv", "deti", "trancehits", "2step", "tecktonik", "neurofunk", "edmhits", "houseclss", "uplift", "darkside", "dream", "bighits", "househits", "synth", "progr", "jackin", "mt", "elect", "mf", "ibiza", "gold", "russianhits", "groovetribal", "complextro", "1970", "chillhouse", "1980", "cadillac", "rapclassics", "rap", "discofunk", "technopop", "eurodance", "russiangold", "drumhits", "liquidfunk", "jungle", "mix", "club", "trop", "goa", "fut", "tm", "chil", "mini", "ps", "rus", "vip", "hypno", "trancehouse", "mmbt", "sd90", "brks", "dub", "dc", "fbass", "rmx", "techno", "hbass", "teo", "trap", "pump", "rock", "mdl", "symph", "gop", "yo", "rave", "gast", "ansh", "naft"]

type TrackInfo = { artist: string; title: string };

export const radio = (client: DiscordRx) => {
  const play = async (name: string, channel: VoiceChannel) => {
    const connection = await channel.join();
    connection.playArbitraryInput(getStreamUrl(name));
  };

  let thisTrack: TrackInfo;
  let statusUpdaterTimer: number;
  let thisTrackRequest: CancelableRequest<TrackInfo>;
  const runStatusUpdater = (genre: string) => {
    clearInterval(statusUpdaterTimer);
    if (thisTrackRequest) {
      thisTrackRequest.cancel();
    }

    const updateInfo = async () => {
      try {
        thisTrackRequest = got.get(getTrackNameUrl(genre)).json<TrackInfo>();
        thisTrack = await thisTrackRequest;
        thisTrackRequest = undefined;

        await client.user.setActivity(`${thisTrack.artist} - ${thisTrack.title}`, { type: 'LISTENING' });
      } catch (e) {
        console.error(e);
      }
    };

    statusUpdaterTimer = +setInterval(updateInfo, 5000);
    updateInfo();
  };

  const stopPlaying = (voiceChannel: VoiceChannel) => {
    clearInterval(statusUpdaterTimer);
    thisTrack = undefined;
    voiceChannel.leave();
  };

  client
    .flow('message')
    .pipe(skipBots(), iStartWith('radio'))
    .subscribe(msg => {
      const [, cmd, name] = msg.content.toLowerCase().split(' ');

      switch (cmd) {
        case 'play':
          if (genres.includes(name)) {
            runStatusUpdater(name);
            return void play(name, msg.member.voiceChannel);
          } else {
            return void msg.reply(`Неизвестное название радио! \nСписок всех: ${genres.join(', ')}`);
          }
        case 'dc':
          return stopPlaying(msg.member.voiceChannel);
        case 'info':
          if (!thisTrack) {
            return void msg.reply(`Сейчас ничего не играет`);
          } else {
            return void msg.reply(`Сейчас играет: ${thisTrack.artist} - ${thisTrack.title}`);
          }
      }
    });
};
