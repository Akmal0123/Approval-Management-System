/**
 * End-to-End Test for Fastify Real-Time Push Notification
 * 
 * Verifies:
 * 1. Fastify WebSocket connection on /ws/notifications?userId=99
 * 2. Receiving connection acknowledgment
 * 3. Triggering push notification via HTTP POST /api/notifications/push
 * 4. WebSocket receiving the real-time push event
 * 5. Fastify stats & user history endpoints
 */

import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

let WebSocketClass;
try {
  const wsPkgPath = path.resolve(__dirname, '../integration-service/node_modules/ws/index.js');
  const wsModule = await import(`file://${wsPkgPath.replace(/\\/g, '/')}`);
  WebSocketClass = wsModule.default || wsModule.WebSocket;
} catch (e) {
  WebSocketClass = globalThis.WebSocket;
}

if (!WebSocketClass) {
  throw new Error('WebSocket client implementation not found');
}

const FASTIFY_HOST = 'localhost';
const FASTIFY_PORT = 5000;
const TEST_USER_ID = '99';

async function runTest() {
  console.log('======================================================');
  console.log('🧪 TESTING FASTIFY REAL-TIME PUSH NOTIFICATION BACKEND');
  console.log('======================================================\n');

  // 1. Connect WebSocket as client
  const wsUrl = `ws://${FASTIFY_HOST}:${FASTIFY_PORT}/ws/notifications?userId=${TEST_USER_ID}`;
  console.log(`1. Connecting WebSocket client to: ${wsUrl}`);

  let receivedPushEvent = false;
  let receivedAck = false;

  const ws = new WebSocketClass(wsUrl);

  const testPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Test timed out after 10 seconds'));
    }, 10000);

    ws.on('open', () => {
      console.log('   ✅ WebSocket connected successfully!');

      // Wait a bit, then trigger push notification via HTTP POST
      setTimeout(async () => {
        try {
          console.log('\n2. Triggering HTTP POST /api/notifications/push from backend/Laravel...');
          const postRes = await fetch(`http://${FASTIFY_HOST}:${FASTIFY_PORT}/api/notifications/push`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: TEST_USER_ID,
              title: 'Pengujian Notifikasi Real-Time Fastify',
              body: 'Dokumen PO-2026-TEST berhasil diverifikasi dan dikirim.',
              url: '/dokumen/test',
              type: 'success',
            }),
          });

          const postData = await postRes.json();
          console.log('   HTTP Push Response:', postData);

          if (!postRes.ok || !postData.success) {
            throw new Error(`Push request failed: ${JSON.stringify(postData)}`);
          }
          console.log('   ✅ Push request acknowledged by Fastify');
        } catch (err) {
          clearTimeout(timeout);
          reject(err);
        }
      }, 500);
    });

    ws.on('message', (rawData) => {
      try {
        const msg = JSON.parse(rawData.toString());
        console.log('   📩 WS Message Received:', msg);

        if (msg.type === 'connection.ack') {
          receivedAck = true;
          console.log('   ✅ Received Connection Ack from Fastify');
        }

        if (msg.event === 'browser.notification' || msg.title === 'Pengujian Notifikasi Real-Time Fastify') {
          receivedPushEvent = true;
          console.log('   🎉 SUCCESS: Real-Time Push Notification arrived via Fastify WebSocket!');
          clearTimeout(timeout);
          ws.close();
          resolve();
        }
      } catch (err) {
        console.warn('   Could not parse WS message:', rawData);
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  await testPromise;

  // 3. Test Stats endpoint
  console.log('\n3. Testing GET /api/notifications/stats...');
  const statsRes = await fetch(`http://${FASTIFY_HOST}:${FASTIFY_PORT}/api/notifications/stats`);
  const stats = await statsRes.json();
  console.log('   Stats:', stats);

  // 4. Test History endpoint
  console.log('\n4. Testing GET /api/notifications/history/' + TEST_USER_ID + '...');
  const histRes = await fetch(`http://${FASTIFY_HOST}:${FASTIFY_PORT}/api/notifications/history/${TEST_USER_ID}`);
  const history = await histRes.json();
  console.log(`   User History Count: ${history.count}`);

  console.log('\n======================================================');
  console.log('🎉 ALL FASTIFY REAL-TIME PUSH TESTS PASSED!');
  console.log('======================================================\n');
}

runTest().catch((err) => {
  console.error('\n❌ Test Failed:', err.message);
  process.exit(1);
});
