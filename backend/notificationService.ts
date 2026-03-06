// eslint-disable-next-line @typescript-eslint/no-require-imports
const admin = require("firebase-admin") as {
  initializeApp(opts?: unknown): void;
  credential: { cert(c: Record<string, string>): unknown };
  messaging(): {
    send(m: {
      token: string;
      notification?: { title?: string; body?: string };
      data?: Record<string, string>;
      android?: unknown;
    }): Promise<string>;
  };
};
import { NotificationPayload } from "../types";
import { logger } from "../utils/logger";

let initialised = false;

function ensureInit(): void {
  if (initialised) return;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
    logger.info("Firebase Admin SDK initialised");
  } else {
    logger.warn("Firebase credentials not set — push notifications in mock mode");
  }
  initialised = true;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  mock?: boolean;
}

export async function sendPushNotification(
  payload: NotificationPayload
): Promise<SendResult> {
  ensureInit();

  const isMock =
    !process.env.FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !process.env.FIREBASE_PRIVATE_KEY;

  if (isMock) {
    logger.info({ payload }, "[MOCK] Push notification");
    return { success: true, mock: true, messageId: `mock-${Date.now()}` };
  }

  try {
    const message = {
      token: payload.fcm_token,
      notification: { title: payload.title, body: payload.body },
      data: {
        fence_id: payload.fence_id,
        device_id: payload.device_id,
        ...(payload.data ?? {}),
      },
      android: {
        priority: "high",
        notification: { channelId: "geo_context_alerts" },
      },
    };
    const messageId = await admin.messaging().send(message);
    logger.info({ messageId, device_id: payload.device_id }, "Push sent");
    return { success: true, messageId };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error({ error, device_id: payload.device_id }, "Push failed");
    return { success: false, error };
  }
}
