import * as mqtt from 'mqtt';

const DEVICE_ID = process.env.DEVICE_ID ?? 'dev-001';
const BROKER_URL = process.env.MQTT_URL ?? 'mqtt://localhost:1883';
const CHAOS_MODE = process.argv.includes('--chaos');

export function processCommand(
  commandId: string,
  processed: Set<string>,
): 'applied' | 'ignored_duplicate' {
  if (processed.has(commandId)) {
    return 'ignored_duplicate';
  }
  processed.add(commandId);
  return 'applied';
}

function createClient(url: string): mqtt.MqttClient {
  return mqtt.connect(url);
}

function startSimulator(): void {
  const processedCommandIds = new Set<string>();
  let client = createClient(BROKER_URL);

  client.on('connect', () => {
    console.log(`[simulator] connected to ${BROKER_URL} as ${DEVICE_ID}`);

    client.subscribe(
      `devices/${DEVICE_ID}/commands/stop`,
      { qos: 2 },
      (err) => {
        if (err) console.error('[simulator] subscribe error', err);
        else console.log(`[simulator] subscribed to commands/stop (qos:2)`);
      },
    );

    const telemetryInterval = setInterval(() => {
      const payload = JSON.stringify({
        deviceId: DEVICE_ID,
        battery: Math.floor(Math.random() * 100),
        ts: Date.now(),
      });
      client.publish(`devices/${DEVICE_ID}/telemetry`, payload, { qos: 0 });
      console.log(`[simulator] telemetry published (qos:0)`);
    }, 1000);

    if (CHAOS_MODE) {
      setInterval(() => {
        console.log('[simulator] chaos: reconnecting...');
        clearInterval(telemetryInterval);
        client.end(false, {}, () => {
          client = createClient(BROKER_URL);
          startSimulator();
        });
      }, 30_000);
    }
  });

  client.on('message', (topic, buffer) => {
    if (!topic.endsWith('/commands/stop')) return;

    let payload: { commandId?: string; type?: string };
    try {
      payload = JSON.parse(buffer.toString()) as {
        commandId?: string;
        type?: string;
      };
    } catch {
      console.error('[simulator] invalid JSON command');
      return;
    }

    const { commandId } = payload;
    if (!commandId) return;

    const result = processCommand(commandId, processedCommandIds);
    console.log(`[simulator] command ${commandId}: ${result}`);

    if (result === 'applied') {
      const ackPayload = JSON.stringify({
        commandId,
        deviceId: DEVICE_ID,
        status: 'ok',
        ts: Date.now(),
      });
      client.publish(`devices/${DEVICE_ID}/acks`, ackPayload, { qos: 1 });
      console.log(`[simulator] ack published (qos:1) for ${commandId}`);
    }
  });

  client.on('error', (err) => {
    console.error('[simulator] error', err);
  });
}

if (require.main === module) {
  startSimulator();
}
