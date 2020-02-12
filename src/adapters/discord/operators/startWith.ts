import { filter } from 'rxjs/operators';
import { Message } from 'discord.js';

export const startWith = (str: string) => filter((message: Message) => message.content.startsWith(str));

export const iStartWith = (str: string) => {
  const text = str.toLocaleLowerCase();
  return filter((message: Message) => message.content.toLowerCase().startsWith(text));
};
