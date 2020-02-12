import * as actions from './actions';
import { DiscordRx } from 'adapters/discord/discordRx';

export const loadActions = (client: DiscordRx) =>
  Object.entries(actions).forEach(([name, action]) => {
    if (typeof action !== 'function') {
      throw Error(`Action "${name}" is not a function`);
    }

    action(client);
  });
