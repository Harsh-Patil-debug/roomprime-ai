import { initialRooms, initialGuestRequests, type Room, type GuestRequest } from "./cleansync-data";

const env = import.meta.env;
const apiKey = env["VITE_MONGODB_DATA_API_KEY"] || "";
const apiBaseUrl = env["VITE_MONGODB_DATA_API_URL"] || "";
const databaseName = env["VITE_MONGODB_DATABASE"] || "roomflow";
const dataSourceName = env["VITE_MONGODB_DATASOURCE"] || "Cluster0";

export const isMongoConfigured = !!(
  apiKey && 
  apiBaseUrl && 
  !apiBaseUrl.includes("PLACEHOLDER")
);

// Simulated server-side database in memory for local demo/testing mode
let simRooms: Room[] = [...initialRooms];
let simRequests: GuestRequest[] = [...initialGuestRequests];

// MongoDB REST Data API Action helper
async function mongoAction(action: string, collection: string, body: any) {
  if (!isMongoConfigured) {
    throw new Error("MongoDB credentials not configured. Please check environment variables.");
  }
  
  const url = `${apiBaseUrl.replace(/\/$/, "")}/action/${action}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Request-Headers": "*",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      dataSource: dataSourceName,
      database: databaseName,
      collection,
      ...body,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`MongoDB API Error (${response.status}): ${errText}`);
  }

  return response.json();
}

export const mongoClient = {
  // 1. Get Rooms
  async getRooms(): Promise<Room[]> {
    if (!isMongoConfigured) {
      return simRooms;
    }
    try {
      const res = await mongoAction("find", "rooms", {});
      return (res.documents || []) as Room[];
    } catch (e) {
      console.warn("MongoDB failed, using mock data fallback: ", e);
      return simRooms;
    }
  },

  // 2. Update Room status
  async updateRoom(roomId: string, updates: Partial<Room>): Promise<boolean> {
    if (!isMongoConfigured) {
      simRooms = simRooms.map((r) => (r.id === roomId ? { ...r, ...updates } : r));
      return true;
    }
    try {
      await mongoAction("updateOne", "rooms", {
        filter: { id: roomId },
        update: { $set: updates },
        upsert: true,
      });
      return true;
    } catch (e) {
      console.error("MongoDB updateRoom error: ", e);
      return false;
    }
  },

  // 3. Get Guest Requests
  async getRequests(): Promise<GuestRequest[]> {
    if (!isMongoConfigured) {
      return simRequests;
    }
    try {
      const res = await mongoAction("find", "requests", {});
      return (res.documents || []) as GuestRequest[];
    } catch (e) {
      console.warn("MongoDB getRequests failed, using mock data fallback: ", e);
      return simRequests;
    }
  },

  // 4. Create Guest Request
  async insertRequest(req: GuestRequest): Promise<boolean> {
    if (!isMongoConfigured) {
      simRequests = [req, ...simRequests];
      return true;
    }
    try {
      await mongoAction("insertOne", "requests", {
        document: req,
      });
      return true;
    } catch (e) {
      console.error("MongoDB insertRequest error: ", e);
      return false;
    }
  },

  // 5. Update Guest Request Status / Details
  async updateRequest(reqId: string, updates: Partial<GuestRequest>): Promise<boolean> {
    if (!isMongoConfigured) {
      simRequests = simRequests.map((r) => (r.id === reqId ? { ...r, ...updates } : r));
      return true;
    }
    try {
      await mongoAction("updateOne", "requests", {
        filter: { id: reqId },
        update: { $set: updates },
      });
      return true;
    } catch (e) {
      console.error("MongoDB updateRequest error: ", e);
      return false;
    }
  },

  // 6. Reset database to initial dataset
  async resetDatabase(): Promise<boolean> {
    simRooms = [...initialRooms];
    simRequests = [...initialGuestRequests];
    
    if (isMongoConfigured) {
      try {
        // Clear collections
        await mongoAction("deleteMany", "rooms", { filter: {} });
        await mongoAction("deleteMany", "requests", { filter: {} });
        // Populate initial rooms
        for (const room of initialRooms) {
          await mongoAction("insertOne", "rooms", { document: room });
        }
        // Populate initial requests
        for (const req of initialGuestRequests) {
          await mongoAction("insertOne", "requests", { document: req });
        }
        return true;
      } catch (e) {
        console.error("MongoDB resetDatabase error: ", e);
        return false;
      }
    }
    return true;
  },

  // 7. Get user profile
  async getUser(userId: string): Promise<any | null> {
    if (!isMongoConfigured) {
      return null;
    }
    try {
      const res = await mongoAction("findOne", "users", { filter: { id: userId } });
      return res.document || null;
    } catch (e) {
      console.warn("MongoDB getUser error: ", e);
      return null;
    }
  },

  // 8. Save/Upsert user profile
  async saveUser(user: any): Promise<boolean> {
    if (!isMongoConfigured) {
      return true;
    }
    try {
      await mongoAction("updateOne", "users", {
        filter: { id: user.id },
        update: { $set: user },
        upsert: true,
      });
      return true;
    } catch (e) {
      console.error("MongoDB saveUser error: ", e);
      return false;
    }
  }
};
