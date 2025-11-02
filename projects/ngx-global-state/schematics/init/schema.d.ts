export interface Schema {
  appId?: string;
  channelPrefix?: string;
  crossApp?: string;
  persistence?: 'session' | 'local' | 'none';
}
