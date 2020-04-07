import { iStartWith, skipBots } from '../adapters/discord/operators';
import { DiscordRx } from 'adapters/discord/discordRx';
import { map } from 'rxjs/operators';
import { VoiceChannel } from 'discord.js';

const getStreamUrl = (name: string, quality = 320) => `http://air2.radiorecord.ru:9003/${name}_${quality}`;

// prettier-ignore
const genres = ["rr", "deep", "rv", "deti", "trancehits", "2step", "tecktonik", "neurofunk", "edmhits", "houseclss", "uplift", "darkside", "dream", "bighits", "househits", "synth", "progr", "jackin", "mt", "elect", "mf", "ibiza", "gold", "russianhits", "groovetribal", "complextro", "1970", "chillhouse", "1980", "cadillac", "rapclassics", "rap", "discofunk", "technopop", "eurodance", "russiangold", "drumhits", "liquidfunk", "jungle", "mix", "club", "trop", "goa", "fut", "tm", "chil", "mini", "ps", "rus", "vip", "hypno", "trancehouse", "mmbt", "sd90", "brks", "dub", "dc", "fbass", "rmx", "techno", "hbass", "teo", "trap", "pump", "rock", "mdl", "symph", "gop", "yo", "rave", "gast", "ansh", "naft"]

export const radio = (client: DiscordRx, { db }: any) => {
  const play = async (name: string, channel: VoiceChannel) => {
    const connection = await channel.join();
    connection.playArbitraryInput(getStreamUrl(name));
  };

  client
    .flow('message')
    .pipe(
      skipBots(),
      iStartWith('radio'),
      map(msg => [msg, msg.content.toLowerCase().split(' ')] as const),
    )
    .subscribe(([msg]) => {
      const [, cmd, name] = msg.content.toLowerCase().split(' ');

      switch (cmd) {
        case 'play':
          if (genres.includes(name)) {
            return void play(name, msg.member.voiceChannel);
          } else {
            return void msg.reply(`Неизвестное название радио! Список всех: ${genres.join(', ')}`);
          }
        case 'dc':
          msg.member.voiceChannel.leave();
      }
      return;
    });
};
