import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "url";
import { hostname } from "node:os";
import { server as wisp, logging } from "@mercuryworkshop/wisp-js/server";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCookie from "@fastify/cookie";
import fastifySession from "@fastify/session";

import { scramjetPath } from "@mercuryworkshop/scramjet/path";
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import { SITE_PASSWORD } from "../config.js";

const publicPath = fileURLToPath(new URL("../public/", import.meta.url));

// Wisp Configuration
logging.set_level(logging.NONE);
Object.assign(wisp.options, {
	allow_udp_streams: false,
	hostname_blacklist: [],
	dns_servers: ["1.1.1.1", "1.0.0.1"],
});

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

// --- Session / Cookie setup ---
fastify.register(fastifyCookie);
fastify.register(fastifySession, {
	secret: randomBytes(32).toString("hex"),
	cookie: {
		secure: false, // set to true behind HTTPS in production
		httpOnly: true,
		maxAge: 1000 * 60 * 60 * 24, // 24 hours
	},
});

// --- Auth gate ---
const publicPaths = ["/login.html", "/index.css", "/favicon.ico", "/api/login"];

fastify.addHook("preHandler", (req, reply, done) => {
	if (publicPaths.includes(req.url)) return done();
	if (req.session && req.session.authenticated) return done();
	// Serve login page for unauthenticated root requests
	reply.redirect("/login.html");
});

// --- Login route ---
fastify.post("/api/login", async (req, reply) => {
	const { password } = req.body || {};
	if (password === SITE_PASSWORD) {
		req.session.authenticated = true;
		return { success: true };
	}
	reply.code(401);
	return { success: false };
});

fastify.register(fastifyStatic, {
	root: publicPath,
	decorateReply: true,
});

fastify.register(fastifyStatic, {
	root: scramjetPath,
	prefix: "/scram/",
	decorateReply: false,
});

fastify.register(fastifyStatic, {
	root: libcurlPath,
	prefix: "/libcurl/",
	decorateReply: false,
});

fastify.register(fastifyStatic, {
	root: baremuxPath,
	prefix: "/baremux/",
	decorateReply: false,
});

fastify.setNotFoundHandler((req, reply) => {
	return reply.code(404).type("text/html").sendFile("404.html");
});

fastify.server.on("listening", () => {
	const address = fastify.server.address();
	console.log("Listening on:");
	console.log(`\thttp://localhost:${address.port}`);
	console.log(`\thttp://${hostname()}:${address.port}`);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
	console.log("SIGTERM signal received: closing HTTP server");
	fastify.close();
	process.exit(0);
}

let port = parseInt(process.env.PORT || "");
if (isNaN(port)) port = 8080;

fastify.listen({
	port: port,
	host: "0.0.0.0",
});
