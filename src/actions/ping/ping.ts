import { iStartWith, skipBots } from './../../adapters/discord/operators';
import { DiscordRx } from 'adapters/discord/discordRx';

export const ping = (client: DiscordRx) => {
  client
    .flow('message')
    .pipe(skipBots(), iStartWith('!ping'))
    .subscribe(msg => {
      msg.reply('pong');
    });
};
