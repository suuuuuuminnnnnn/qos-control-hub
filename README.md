# qos-control-hub

NestJS 11 Hybrid App(HTTP + MQTT)으로 두 가지 NestJS 기여 기능을 실제 도메인에 적용한 데모 프로젝트.

1. **`@MessagePattern` extras.qos** — 핸들러별 MQTT 구독 QoS 분리
2. **PreRequest Hook** — Guards 실행 전 `AsyncLocalStorage` 컨텍스트 전파

---

## 핵심 개념

### 1. extras.qos

`@MessagePattern`의 두 번째 인수 `extras`에 `qos`를 지정하면 해당 핸들러가 그 QoS로 구독한다.

```typescript
// qos:0 — telemetry (유실 허용)
@MessagePattern('devices/+/telemetry', { extras: { qos: 0 } })

// qos:1 — ack (최소 1회 보장)
@MessagePattern('devices/+/acks', { extras: { qos: 1 } })
```

NestJS `ServerMqtt`의 `bindEvents`가 `handler.extras.qos`를 읽어 `mqttClient.subscribe` 옵션에 주입한다.

---

### 2. PreRequest Hook (ALS 전파)

Guards보다 먼저 실행되는 훅으로 `AsyncLocalStorage` 컨텍스트를 전파한다. 현재 NestJS 11.1.x 미구현이므로 `Server.setOnProcessingStartHook`으로 폴리필한다.

```
MQTT 메시지 수신
  └─ setOnProcessingStartHook 어댑터
       └─ als.run(store, () => next().subscribe(...))
            ├─ Guards 실행         ← getStore() 유효
            ├─ Interceptors 실행   ← getStore() 유효
            └─ Handler 실행        ← getStore() 유효
```

`als.run` 내부에서 `next()`를 호출하기 때문에, 이후 모든 비동기 체인에서 `AsyncLocalStorage.getStore()`가 동일한 store를 반환한다.

---

## 프로젝트 구조

```
qos-control-hub/
├── docker-compose.yml
├── mosquitto/config/mosquitto.conf
├── scripts/
│   └── simulator.ts              # 독립 디바이스 시뮬레이터
└── src/
    ├── main.ts                   # Hybrid app bootstrap
    ├── app.module.ts
    ├── common/
    │   ├── als/                  # AsyncLocalStorage 전역 모듈
    │   │   ├── als.module.ts
    │   │   ├── als.service.ts
    │   │   └── als.types.ts
    │   ├── hooks/
    │   │   └── prerequest.hook.ts  # makePreRequestHook 팩토리
    │   ├── guards/
    │   │   └── device-context.guard.ts  # ALS store 로그 (APP_GUARD)
    │   └── middleware/
    │       └── correlation.middleware.ts  # HTTP ALS 초기화
    ├── telemetry/                # @MessagePattern qos:0
    ├── ack/                      # @MessagePattern qos:1
    └── device/                   # POST /devices/:id/stop (raw mqtt qos:2)
```

---

## 실행

### 사전 조건

- Node.js 20+
- Docker

### 1. 의존성 설치

```bash
npm install
```

### 2. 브로커 실행

```bash
docker-compose up -d
```

### 3. 앱 실행

```bash
npm run dev
```

HTTP `:3000` + MQTT `:1883` 동시 구동.

### 4. 시뮬레이터 실행 (별도 터미널)

```bash
npm run sim

# chaos 모드: 30초마다 강제 재연결
npm run sim -- --chaos
```

---

## 동작 확인

**stop command 발행:**

```bash
curl -X POST localhost:3000/devices/dev-001/stop
```

```json
{
  "commandId": "550e8400-...",
  "correlationId": "f47ac10b-...",
  "status": "sent"
}
```

**시뮬레이터 로그 (최초 수신):**

```
[simulator] command 550e8400-...: applied
[simulator] ack published (qos:1) for 550e8400-...
```

**동일 curl 재호출 시 (멱등성):**

```
[simulator] command 550e8400-...: ignored_duplicate
```

**서버 로그 — telemetry, ack, guard 모두 동일 correlationId 출력:**

```
[DeviceContextGuard] correlationId=f47ac10b-... deviceId=dev-001
[telemetry|qos0] corr=f47ac10b-... dev=dev-001 bat=42
[ack|qos1] corr=f47ac10b-... cmd=550e8400-... status=ok
```

---

## 테스트

```bash
npm test
```

| 파일 | 검증 내용 |
|------|-----------|
| `prerequest.hook.spec.ts` | `next()` 내부에서 ALS `getStore()`가 유효한 store 반환 (correlationId, deviceId, transport) |
| `idempotency.spec.ts` | `processCommand` 멱등성 — 신규: `applied`, 중복: `ignored_duplicate` |

---

## MQTT QoS 정책

| 토픽 | 방향 | QoS | 이유 |
|------|------|-----|------|
| `devices/+/telemetry` | Device → Server | 0 | 유실 허용, 최신값만 의미 있음 |
| `devices/+/acks` | Device → Server | 1 | 명령 처리 결과 최소 1회 보장 |
| `devices/+/commands/stop` | Server → Device | 2 | 정확히 1회 전달 필수 |
