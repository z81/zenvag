import { iStartWith, skipBots } from 'adapters/discord/operators';
import { DiscordRx } from 'adapters/discord/discordRx';
import got, { CancelableRequest } from 'got';
import { VoiceChannel } from 'discord.js';
import { radiostantions } from 'actions/radio/radiostantions';

const getStreamUrl = (name: string, quality = 320) => `http://air2.radiorecord.ru:9003/${name}_${quality}`;

const getTrackNameUrl = (name: string) => `https://www.radiorecord.ru/xml/${name}_online_v8.txt`;

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
          if (radiostantions.includes(name)) {
            runStatusUpdater(name);
            return void play(name, msg.member.voiceChannel);
          } else {
            return void msg.reply(`Неизвестное название радио! \nСписок всех: ${radiostantions.join(', ')}`);
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
