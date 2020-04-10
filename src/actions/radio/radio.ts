import { iStartWith, skipBots } from '../../adapters/discord/operators';
import { DiscordRx } from 'adapters/discord/discordRx';
import got from 'got';
import { VoiceChannel, Message } from 'discord.js';
import { radioStations } from './radioStations';

type TrackInfo = { artist: string; title: string };

const getStreamUrl = (name: string, quality = 320) => `http://air2.radiorecord.ru:9003/${name}_${quality}`;
const getTrackNameUrl = (name: string) => `https://www.radiorecord.ru/xml/${name}_online_v8.txt`;
// prettier-ignore
const getTrackInfo = (name: string) => got.get(getTrackNameUrl(name), { timeout: 4000 }).json<TrackInfo>();
const play = async (name: string, channel: VoiceChannel) =>
  channel.join().then(c => c.playArbitraryInput(getStreamUrl(name)));

const stations = radioStations.join(', ');
const radioCommands = `Текущий трек - radio info\nradio play название\n**Список радиостанций:** ${stations}`;

export const radio = (client: DiscordRx) => {
  const thisTrack = new Map<string, TrackInfo>();
  const statusUpdaterTimer = new Map<string, NodeJS.Timeout>();

  const runStatusUpdater = (name: string, id: string) => {
    clearInterval(statusUpdaterTimer.get(id));

    const updateInfo = () =>
      getTrackInfo(name)
        .then(track => thisTrack.set(id, track))
        .catch(err => console.error(err));

    statusUpdaterTimer.set(id, setInterval(updateInfo, 5000));
    updateInfo();
  };

  const stopPlaying = (voiceChannel: VoiceChannel, id: string) => {
    clearInterval(statusUpdaterTimer.get(id));
    thisTrack.delete(id);
    voiceChannel.leave();
  };

  const sendTrackInfo = (msg: Message) => {
    const trackInfo = thisTrack.get(msg.guild.id);
    const trackName =
      !trackInfo || trackInfo.artist === '' ? 'Неизвестный исполнитель' : `${trackInfo.artist} - ${trackInfo.title}`;
    msg.reply(`Сейчас играет: ${trackName}`);
  };

  client
    .flow('message')
    .pipe(skipBots(), iStartWith('radio'))
    .subscribe(msg => {
      const [, cmd, name] = msg.content.toLowerCase().split(' ', 4);

      switch (cmd) {
        case 'play':
          if (radioStations.includes(name)) {
            runStatusUpdater(name, msg.guild.id);
            return void play(name, msg.member.voiceChannel);
          } else {
            return void msg.reply(`Неизвестное название радио!\n ${radioCommands}`);
          }
        case 'dc':
          return void stopPlaying(msg.member.voiceChannel, msg.guild.id);
        case 'help':
          return void msg.reply(radioCommands);
        case 'info':
          if (!thisTrack) {
            return void msg.reply(`Сейчас ничего не играет`);
          } else {
            return void sendTrackInfo(msg);
          }
      }
    });
};
