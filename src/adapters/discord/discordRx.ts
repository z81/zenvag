import {
  Client,
  RateLimitInfo,
  GuildMember,
  Message,
  MessageReaction,
  Collection,
  Guild,
  Role,
  Channel,
  UserResolvable,
  User,
  TextChannel,
  Snowflake,
  Emoji,
  ClientUserSettings,
  ClientUserGuildSettings,
} from 'discord.js';
import { Subject, Observable } from 'rxjs';
import { memoize } from 'lodash';
import { share } from 'rxjs/operators';

export class DiscordRx extends Client {
  protected eventSubjects = new Set();

  protected fromEvent = memoize(<A, T extends A[]>(eventName: string) => {
    const source = new Subject<T | A>();
    const observer = source.pipe(share());

    const handler = (...args: T): void => void source.next(args.length === 1 ? args[0] : args);

    this.on(eventName, handler);
    observer.subscribe(null, null, () => void this.off(eventName, handler));

    return observer;
  });

  public flow(event: 'channelCreate'): Observable<Channel>;
  public flow(event: 'channelDelete'): Observable<Channel>;
  public flow(event: 'channelPinsUpdate'): Observable<[Channel, Date]>;
  public flow(event: 'channelUpdate'): Observable<[Channel, Channel]>;
  public flow(event: 'clientUserGuildSettingsUpdate'): Observable<ClientUserGuildSettings>;
  public flow(event: 'clientUserSettingsUpdate'): Observable<ClientUserSettings>;
  public flow(event: 'debug'): Observable<string>;
  public flow(event: 'disconnect'): Observable<unknown>;
  public flow(event: 'emojiCreate'): Observable<Emoji>;
  public flow(event: 'emojiDelete'): Observable<Emoji>;
  public flow(event: 'emojiUpdate'): Observable<[Emoji, Emoji]>;
  public flow(event: 'error'): Observable<Error>;
  public flow(event: 'guildBanAdd'): Observable<[Guild, User]>;
  public flow(event: 'guildBanRemove'): Observable<[Guild, User]>;
  public flow(event: 'guildCreate'): Observable<Guild>;
  public flow(event: 'guildDelete'): Observable<Guild>;
  public flow(event: 'guildMemberAdd'): Observable<GuildMember>;
  public flow(event: 'guildMemberAvailable'): Observable<GuildMember>;
  public flow(event: 'guildMemberRemove'): Observable<GuildMember>;
  public flow(event: 'guildMembersChunk'): Observable<[GuildMember, Guild]>;
  public flow(event: 'guildMemberSpeaking'): Observable<[GuildMember, boolean]>;
  public flow(event: 'guildMemberUpdate'): Observable<[GuildMember, GuildMember]>;
  public flow(event: 'guildUnavailable'): Observable<Guild>;
  public flow(event: 'guildUpdate'): Observable<[Guild, Guild]>;
  public flow(event: 'guildIntegrationsUpdate'): Observable<Guild>;
  public flow(event: 'message'): Observable<Message>;
  public flow(event: 'messageDelete'): Observable<Message>;
  public flow(event: 'messageDeleteBulk'): Observable<[Collection<Snowflake, Message>]>;
  public flow(event: 'messageReactionAdd'): Observable<[MessageReaction, User]>;
  public flow(event: 'messageReactionRemove'): Observable<[MessageReaction, User]>;
  public flow(event: 'messageReactionRemoveAll'): Observable<Message>;
  public flow(event: 'messageUpdate'): Observable<[Message, Message]>;
  public flow(event: 'presenceUpdate'): Observable<[GuildMember, GuildMember]>;
  public flow(event: 'rateLimit'): Observable<RateLimitInfo>;
  public flow(event: 'ready'): Observable<undefined>;
  public flow(event: 'reconnecting'): Observable<undefined>;
  public flow(event: 'resume'): Observable<number>;
  public flow(event: 'roleCreate'): Observable<Role>;
  public flow(event: 'roleDelete'): Observable<Role>;
  public flow(event: 'roleUpdate'): Observable<[Role, Role]>;
  public flow(event: 'typingStart'): Observable<[Channel, User]>;
  public flow(event: 'typingStop'): Observable<[Channel, User]>;
  public flow(event: 'userNoteUpdate'): Observable<[UserResolvable, string, string]>;
  public flow(event: 'userUpdate'): Observable<[User, User]>;
  public flow(event: 'voiceStateUpdate'): Observable<[GuildMember, GuildMember]>;
  public flow(event: 'warn'): Observable<string>;
  public flow(event: 'webhookUpdate'): Observable<TextChannel>;
  public flow<T extends []>(eventName: string): Observable<T> {
    return this.fromEvent<T, T>(eventName);
  }
}
