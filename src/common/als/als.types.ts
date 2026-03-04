export interface AlsStore {
  correlationId: string;
  deviceId?: string;
  commandId?: string;
  transport: 'mqtt' | 'http';
}
