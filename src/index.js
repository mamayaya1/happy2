import { createServer } from "node:http";
import { hostname } from "node:os";
import wisp from "wisp-server-node";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";

// Import Ultraviolet as default (CommonJS)
import ultraviolet from "@titaniumnetwork-dev/ultraviolet";
const { uvPath, BareServer } = ultraviolet;

import { publicPath } from "ultraviolet-static";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

// Create Fastify instance
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

// Static assets
fastify.register(fastifyStatic, { root: publicPath, decorateReply: true });
fastify.get("/uv/uv.config.js", (req, res) => res.sendFile("uv/uv.config.js", publicPath));
fastify.register(fastifyStatic, { root: uvPath, prefix: "/uv/", decorateReply: false });
fastify.register(fastifyStatic, { root: epoxyPath, prefix: "/epoxy/", decorateReply: false });
fastify.register(fastifyStatic, { root: baremuxPath, prefix: "/baremux/", decorateReply: false });

// Bootstrap
async function main() {
  // ✅ Use BareServer class instead of createBareServer
  const bare = new BareServer();

  // Proxy route
  fastify.all("/service/*", (req, reply) => {
    bare.request(req.raw, reply.raw);
  });

  // Debug route
  fastify.get("/debug", (req, reply) => {
    reply.send({ ok: true });
  });

  let port = parseInt(process.env.PORT || "");
  if (isNaN(port)) port = 8080;

  fastify.listen({ port, host: "0.0.0.0" }, (err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`Listening on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
