import { createServerFn } from "@tanstack/react-start";
import { mongoClient } from "./mongodb";
import { type Room, type GuestRequest } from "./cleansync-data";
import { sendWelcomeEmail } from "./mail";

// 1. Fetch Rooms from MongoDB
export const getRoomsFn = createServerFn({ method: "GET" }).handler(async () => {
  return await mongoClient.getRooms();
});

// 2. Update Room Status or Assignment in MongoDB
export const updateRoomFn = createServerFn({ method: "POST" })
  .validator((data: { id: string; updates: Partial<Room> }) => data)
  .handler(async ({ data }) => {
    return await mongoClient.updateRoom(data.id, data.updates);
  });

// 3. Fetch Guest Requests from MongoDB
export const getRequestsFn = createServerFn({ method: "GET" }).handler(async () => {
  return await mongoClient.getRequests();
});

// 4. Insert new Guest Request into MongoDB
export const insertRequestFn = createServerFn({ method: "POST" })
  .validator((data: GuestRequest) => data)
  .handler(async ({ data }) => {
    return await mongoClient.insertRequest(data);
  });

// 5. Update Guest Request Status or Details in MongoDB
export const updateRequestFn = createServerFn({ method: "POST" })
  .validator((data: { id: string; updates: Partial<GuestRequest> }) => data)
  .handler(async ({ data }) => {
    return await mongoClient.updateRequest(data.id, data.updates);
  });

// 6. Reset Database to initial dataset in MongoDB
export const resetDatabaseFn = createServerFn({ method: "POST" }).handler(async () => {
  return await mongoClient.resetDatabase();
});

// 7. Get Google Consent Screen Redirect URL
export const getGoogleAuthUrlFn = createServerFn({ method: "GET" }).handler(async () => {
  const env = import.meta.env;
  const clientId = env["VITE_GOOGLE_CLIENT_ID"] || "";
  const redirectUri = env["VITE_GOOGLE_REDIRECT_URI"] || "http://localhost:3000";
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile`;
});

// 8. Exchange Google OAuth Code for User Profile & Register inside MongoDB
export const loginWithGoogleCodeFn = createServerFn({ method: "POST" })
  .validator((data: { code: string }) => data)
  .handler(async ({ data }) => {
    const env = import.meta.env;
    const clientId = env["VITE_GOOGLE_CLIENT_ID"] || "";
    const clientSecret = env["VITE_GOOGLE_CLIENT_SECRET"] || "";
    const redirectUri = env["VITE_GOOGLE_REDIRECT_URI"] || "http://localhost:3000";

    // 1. Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: data.code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      throw new Error(`Google token exchange failed: ${errBody}`);
    }

    const tokens = await tokenRes.json();
    
    // 2. Query Google user info
    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userRes.ok) {
      throw new Error("Failed to fetch Google profile info.");
    }

    const googleUser = await userRes.json();
    
    // 3. Upsert user record in MongoDB users collection
    const userProfile = {
      id: googleUser.sub,
      email: googleUser.email,
      name: googleUser.name,
      avatarUrl: googleUser.picture || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
      role: "ops" as const, // default role
    };

    // Keep existing role if they already logged in before
    const existing = await mongoClient.getUser(userProfile.id);
    if (existing) {
      userProfile.role = existing.role;
    } else {
      await mongoClient.saveUser(userProfile);
      try {
        await sendWelcomeEmail(userProfile.email, userProfile.name);
      } catch (err) {
        console.error("Welcome email trigger failed in code login: ", err);
      }
    }

    return userProfile;
  });

// 9. Exchange Google GSI ID Token (JWT) for User Profile & Register inside MongoDB
export const loginWithGoogleTokenFn = createServerFn({ method: "POST" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    // 1. Verify token with Google's tokeninfo API
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${data.token}`);

    if (!verifyRes.ok) {
      const errBody = await verifyRes.text();
      throw new Error(`Google ID token verification failed: ${errBody}`);
    }

    const googleUser = await verifyRes.json();
    
    // 2. Upsert user record in MongoDB users collection
    const userProfile = {
      id: googleUser.sub,
      email: googleUser.email,
      name: googleUser.name,
      avatarUrl: googleUser.picture || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
      role: "ops" as const, // default role
    };

    // Keep existing role if they already logged in before
    const existing = await mongoClient.getUser(userProfile.id);
    if (existing) {
      userProfile.role = existing.role;
    } else {
      await mongoClient.saveUser(userProfile);
      try {
        await sendWelcomeEmail(userProfile.email, userProfile.name);
      } catch (err) {
        console.error("Welcome email trigger failed in token login: ", err);
      }
    }

    return userProfile;
  });

// 10. Manual Test Welcome Email Dispatcher from Dev Console
export const sendTestWelcomeEmailFn = createServerFn({ method: "POST" })
  .validator((data: { email: string; name: string }) => data)
  .handler(async ({ data }) => {
    return await sendWelcomeEmail(data.email, data.name);
  });
