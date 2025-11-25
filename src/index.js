import { createServer } from "node:http";
import { hostname } from "node:os";
import wisp from "wisp-server-node";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";

import { publicPath } from "ultraviolet-static";
import { uvPath, createBareServer } from "@titaniumnetwork-dev/ultraviolet";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

// 1. Create Fastify instance
const fastify = Fastify({
  serverFactory: (handler) => {
    return createServer()
      .on("request", (req, res) => {
        res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
        res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
        handler(req, res);
      })
      .on("upgrade", (req, socket, head) => {
        if (req.url.endsWith("/wisp/")) wisp.routeRequest(req, socket, head);
        else socket.end();
      });
  },
});

// 2. Register static assets
fastify.register(fastifyStatic, { root: publicPath, decorateReply: true });
fastify.get("/uv/uv.config.js", (req, res) => res.sendFile("uv/uv.config.js", publicPath));
fastify.register(fastifyStatic, { root: uvPath, prefix: "/uv/", decorateReply: false });
fastify.register(fastifyStatic, { root: epoxyPath, prefix: "/epoxy/", decorateReply: false });
fastify.register(fastifyStatic, { root: baremuxPath, prefix: "/baremux/", decorateReply: false });

// 3. Bootstrap async
async function main() {
  const uv = await createBareServer();

  // 4. Register proxy route
  fastify.all("/service/*", (req, reply) => {
    uv.handleRequest(req.raw, reply.raw);
  });

  // 5. Start server
  let port = parseInt(process.env.PORT || "");
  if (isNaN(port)) port = 8080;

  fastify.listen({ port, host: "0.0.0.0" }, (err, address) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    const addr = fastify.server.address();
    console.log("Listening on:");
    console.log(`\thttp://localhost:${addr.port}`);
    console.log(`\thttp://${hostname()}:${addr.port}`);
    console.log(
      `\thttp://${addr.family === "IPv6" ? `[${addr.address}]` : addr.address}:${addr.port}`
    );
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
  console.log("SIGTERM signal received: closing HTTP server");
  fastify.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
