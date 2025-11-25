import { createBareServer } from "@tomphttp/bare-server-node";

// ✅ Bare requires a string that starts and ends with "/"
const bare = createBareServer("/bare/");

fastify.all("/service/*", (req, reply) => {
  bare.request(req.raw, reply.raw);
});
