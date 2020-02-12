import { DISCORD_TOKEN } from './config';
import { DiscordRx } from './adapters/discord/discordRx';
import { loadActions } from 'loadActions';

const client = new DiscordRx();

loadActions(client);

client.login(DISCORD_TOKEN);
