import { handleDashboardRequest } from "./dashboard/route.js";
import { handleTrackRequest, handleTrackOptions } from "./collector.js";
import { handleExportCSV, handleBlockIP, handleUnblockIP, handleRefreshBots } from "./admin.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Bot short-circuit for /track — verified bots get 204 silently
    if (
      url.pathname.startsWith('/track') &&
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
    if (url.pathname === "/track") {
      if (request.method === "OPTIONS") {
        return handleTrackOptions();
      }
      return handleTrackRequest(request, env, ctx);
    }

    // Passthrough — all other requests go to origin
    return fetch(request);
  }
};
