import { filter } from 'rxjs/operators';
import { Message } from 'discord.js';

export const skipBots = () => filter((message: Message) => !message.author.bot);
