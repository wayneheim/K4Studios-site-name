import { handleDashboardRequest } from "./dashboard/route.js";
import { handleTrackRequest, handleTrackOptions } from "./collector.js";

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
