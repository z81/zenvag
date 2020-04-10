import { DISCORD_TOKEN } from './config';
import { DiscordRx } from './adapters/discord/discordRx';
import { initActions } from './initActions';
import { take } from 'rxjs/operators';

const client = new DiscordRx();

client
  .flow('ready')
  .pipe(take(1))
  .subscribe(() => {
    console.log('ready');
  });

initActions(client);

client.login(DISCORD_TOKEN);
