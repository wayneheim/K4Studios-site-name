import { handleDashboardRequest } from "./dashboard/route.js";
import { handleTrackRequest, handleTrackOptions, handleEdgeEvent, handleEdgeEventOptions, handleTrackEvent } from "./collector.js";
import { handleExportCSV, handleBlockIP, handleUnblockIP, handleRefreshBots } from "./admin.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Bot short-circuit for tracking endpoints — verified bots get 204 silently
    if (
      (url.pathname.startsWith('/track') || url.pathname.startsWith('/__k4e')) &&
      request.cf?.botManagement?.verifiedBot
    ) {
      return new Response(null, { status: 204 });
    }

    // Dashboard
    if (url.pathname === "/__k4stats") {
      return handleDashboardRequest(request, env, ctx);
    }

    // Admin API sub-paths
    if (url.pathname === "/__k4stats/export") {
      return handleExportCSV(request, env);
    }
    if (url.pathname === "/__k4stats/block" && request.method === "POST") {
      return handleBlockIP(request, env);
    }
    if (url.pathname === "/__k4stats/unblock" && request.method === "POST") {
      return handleUnblockIP(request, env);
    }
    if (url.pathname === "/__k4stats/refresh-bots" && request.method === "POST") {
      return handleRefreshBots(request, env);
    }

    // Track endpoint (humans only reach here)
    if (url.pathname === "/track" || url.pathname === "/__k4e") {
      if (request.method === "OPTIONS") {
        return handleTrackOptions();
      }
      return handleTrackRequest(request, env, ctx);
    }

    // Edge events (301/410/404 from Netlify functions)
    if (url.pathname === "/edge-event") {
      if (request.method === "OPTIONS") {
        return handleEdgeEventOptions();
      }
      return handleEdgeEvent(request, env);
    }

    // Event tracking (zoom, slideshow, chapter_view)
    if (url.pathname === "/__k4track/event") {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "86400"
          }
        });
      }
      if (request.method === "POST") {
        return handleTrackEvent(request, env, ctx);
      }
      return new Response('Method not allowed', { status: 405 });
    }

    // Passthrough — all other requests go to origin
    return fetch(request);
  }
};
