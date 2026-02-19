import { handleDashboardRequest } from './dashboard/route.js'
import { handleTrackRequest } from './collector.js'

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    if (url.pathname === '/__k4stats') {
      return handleDashboardRequest(request, env, ctx)
    }

    if (url.pathname === '/track') {
      return handleTrackRequest(request, env, ctx)
    }

    return new Response('Not Found', { status: 404 })
  }
}
