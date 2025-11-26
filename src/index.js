import { createServer } from "node:http";
import { hostname } from "node:os";

import Fastify from "fastify";
import fastifyStatic from "@fastify/static";

import { publicPath } from "ultraviolet-static";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

import { createBareServer } from "@tomphttp/bare-server-node";

// ✅ Bare server instance (v2.0.6 API)
// Must be a POSIX-style path string starting and ending with "/"
const bareServer = createBareServer("/bare-data/");

const fastify = Fastify({
  serverFactory: (handler) => {
    const httpServer = createServer();

    httpServer.on("request", (req, res) => {
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
      res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");

      // Let Bare handle /v1, /v2, /v3
      if (req.url.startsWith("/v1/") || req.url.startsWith("/v2/") || req.url.startsWith("/v3/")) {
        bareServer.routeRequest(req, res);
      } else {
        handler(req, res); // Fastify handles normal routes
      }
    });

    httpServer.on("upgrade", (req, socket, head) => {
      if (req.url.startsWith("/v1/") || req.url.startsWith("/v2/") || req.url.startsWith("/v3/")) {
        bareServer.routeUpgrade(req, socket, head);
      } else if (req.url.startsWith("/baremux/")) {
        // TODO: BareMux upgrade handler
      } else {
        socket.end();
      }
    });

    return httpServer;
  },
});

// ✅ Ultraviolet static assets
fastify.register(fastifyStatic, { root: publicPath, decorateReply: true });
fastify.get("/uv/uv.config.js", (req, res) =>
  res.sendFile("uv/uv.config.js", publicPath)
);
fastify.register(fastifyStatic, { root: uvPath, prefix: "/uv/", decorateReply: false });
fastify.register(fastifyStatic, { root: epoxyPath, prefix: "/epoxy/", decorateReply: false });
fastify.register(fastifyStatic, { root: baremuxPath, prefix: "/baremux/", decorateReply: false });

// ✅ Route to forward UV service requests directly to Bare
fastify.all("/uv/service/*", (req, res) => {
  // Rewrite the URL so Bare sees /v2/...
  req.url = req.url.replace("/uv/service/", "/v2/");
  bareServer.routeRequest(req.raw, res.raw);
});

// ✅ Debug route
fastify.get("/debug", async () => ({ ok: true }));

// ✅ Start server
let port = parseInt(process.env.PORT || "");
if (isNaN(port)) port = 8080;

fastify.listen({ port, host: "0.0.0.0" }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Listening on http://${hostname()}:${port}`);
});
