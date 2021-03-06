import { iStartWith, skipBots } from '../../adapters/discord/operators';
import { DiscordRx } from 'adapters/discord/discordRx';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';

export const userRandom = async (client: DiscordRx) => {
  const { RANDOM_USER_ID } = process.env;
  const CACHE_FILE = path.join(os.tmpdir(), `${RANDOM_USER_ID}.json`);

  const filterMessages = (messages: string[]) =>
    messages.map(msg => msg.replace(/<@!?(\d*)>/, '')).filter(msg => !msg.startsWith('.'));

  const isCacheExists = await promisify(fs.exists)(CACHE_FILE);
  const userMessages: string[] = [];

  if (isCacheExists) {
    console.log('Cache file exists ' + CACHE_FILE);
    const cacheData = await promisify(fs.readFile)(CACHE_FILE, 'utf-8');
    userMessages.push(...filterMessages(JSON.parse(cacheData)));
  }

  const getRandomTime = () => (Math.floor(Math.random() * 120) + 1) * 60000;

  let timer: NodeJS.Timeout | undefined;

  client
    .flow('message')
    .pipe(skipBots(), iStartWith('user random'))
    .subscribe(async msg => {
      if (userMessages.length === 0) {
        let lastId: string | undefined = undefined;

        for (let i = 0; i < 100000; i += 100) {
          const messages = await msg.channel.fetchMessages({ limit: 100, before: lastId });

          console.log(`Load messages #${i}`);
          if (messages.size === 0) break;

          userMessages.push(
            ...messages
              .array()
              .filter(msg => msg.author.id === RANDOM_USER_ID)
              .map(msg => msg.content)
              .filter(msg => !!msg),
          );
          lastId = messages.last().id;
        }

        fs.writeFile(CACHE_FILE, JSON.stringify(userMessages), 'utf-8', () => {
          console.log(`Load messages completed `);
        });
      }

      const randomMessage = () => userMessages[Math.floor(Math.random() * userMessages.length)];

      const randomTimer = () => {
        timer = setTimeout(() => {
          msg.channel.send(randomMessage());
          randomTimer();
        }, getRandomTime());
      };

      if (timer === undefined) {
        randomTimer();
      }

      msg.channel.send([1, 1, 1, 1, 1].map(() => randomMessage()).join('\n'));
    });
};
