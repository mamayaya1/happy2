import { createServer } from "node:http";
import { hostname } from "node:os";
import wisp from "wisp-server-node";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";

// ✅ Ultraviolet Node Archive API
import ultraviolet from "@titaniumnetwork-dev/ultraviolet";
const { uvPath, createBareServer } = ultraviolet;

import { publicPath } from "ultraviolet-static";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

// Create Fastify instance with custom server factory
const fastify = Fastify({
  serverFactory: (handler) => {
    return createServer()
      .on("request", (req, res) => {
        // Security headers for COOP/COEP
        res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
        res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
        handler(req, res);
      })
      .on("upgrade", (req, socket, head) => {
        if (req.url.endsWith("/wisp/")) {
          wisp.routeRequest(req, socket, head);
        } else {
          socket.end();
        }
      });
  },
});

// Static assets
fastify.register(fastifyStatic, { root: publicPath, decorateReply: true });
fastify.get("/uv/uv.config.js", (req, res) =>
  res.sendFile("uv/uv.config.js", publicPath)
);
fastify.register(fastifyStatic, { root: uvPath, prefix: "/uv/", decorateReply: false });
fastify.register(fastifyStatic, { root: epoxyPath, prefix: "/epoxy/", decorateReply: false });
fastify.register(fastifyStatic, { root: baremuxPath, prefix: "/baremux/", decorateReply: false });

async function main() {
  // ✅ Use createBareServer from Ultraviolet-Node-Archive
  const bare = createBareServer();

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
    console.log(`Listening on http://${hostname()}:${port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
