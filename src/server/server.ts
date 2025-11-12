import { appRouter } from "@/backend/router/_app";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import cors from "cors";

const server = createHTTPServer({
  middleware: cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:4000",
      "http://localhost:5173",
    ],
  }),
  router: appRouter,
});

const PORT = process.env.SERVER_PORT || 4000;

server.listen(PORT, () => {
  console.log(`🚀 tRPC Server listening on http://localhost:${PORT}`);
  console.log(`📝 This is a development server only`);
});
