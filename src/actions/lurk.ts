import { iStartWith, skipBots } from '../adapters/discord/operators';
import { DiscordRx } from 'adapters/discord/discordRx';
import querystring from 'querystring';

const URL_PATH = 'http://lurkmore.to/';
const CMD = 'lurk';

export const lurk = (client: DiscordRx, { db }: any) => {
  client
    .flow('message')
    .pipe(skipBots(), iStartWith(CMD))
    .subscribe(async msg => {
      const text = msg.content.substr(CMD.length);
      const url = `${URL_PATH}${querystring.escape(text)}`;
      msg.reply(url);
    });
};
