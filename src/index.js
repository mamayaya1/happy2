import { createServer } from "node:http";
import { hostname } from "node:os";

import Fastify from "fastify";
import fastifyStatic from "@fastify/static";

import { publicPath } from "ultraviolet-static";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

// Fast, reliable Bare server
import { createBareServer } from "@tomphttp/bare-server-node";

const fastify = Fastify({
  serverFactory: (handler) => {
    return createServer()
      .on("request", (req, res) => {
        res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
        res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
        handler(req, res);
      })
      .on("upgrade", (req, socket, head) => {
        // Handle WebSocket upgrades if needed (BareMux/Epoxy)
        if (req.url.startsWith("/baremux/")) {
          // TODO: wire BareMux upgrade handler here
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

// ✅ Bare proxy route — directory string must start and end with "/"
const bare = createBareServer("/bare/");

fastify.all("/service/*", (req, reply) => {
  bare.request(req.raw, reply.raw);
});

// Debug route
fastify.get("/debug", async () => ({ ok: true }));

let port = parseInt(process.env.PORT || "");
if (isNaN(port)) port = 8080;

fastify.listen({ port, host: "0.0.0.0" }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Listening on http://${hostname()}:${port}`);
});
