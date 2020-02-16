import * as actions from './actions';
import { DiscordRx } from 'adapters/discord/discordRx';

export const initActions = <E>(client: DiscordRx, env: E) =>
  Object.entries(actions).forEach(([name, action]) => {
    if (typeof action !== 'function') {
      throw Error(`Action "${name}" is not a function`);
    }

    action(client, env);
  });
