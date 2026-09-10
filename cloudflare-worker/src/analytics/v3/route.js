import { getV3CoreSummary, getV3Diagnostics } from './queries.js';
import { renderDashboardV3, renderV3Diagnostics } from './renderer.js';
import { updateV3Rollups } from './updater.js';

function normalizeWindow(value) { return ['today', 'yesterday', '7d', '30d'].includes(value) ? value : 'today'; }
function responseHeaders(type) { return { 'Content-Type': type, 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache', Expires: '0', Vary: 'Authorization' }; }

export async function handleDashboardV3Request(request, env) {
  try {
    const url = new URL(request.url);
    const summary = await getV3CoreSummary(env, { windowKey: normalizeWindow(url.searchParams.get('window')) });
    return new Response(renderDashboardV3({ summary }), { headers: responseHeaders('text/html; charset=utf-8') });
  } catch (error) {
    return new Response(`V3 dashboard error: ${error?.message || String(error)}`, { status: 500, headers: responseHeaders('text/plain; charset=utf-8') });
  }
}

export async function handleDashboardV3UpdateRequest(request, env) {
  try {
    const url = new URL(request.url);
    const result = await updateV3Rollups(env, { maxRows: url.searchParams.get('maxRows') || 5000 });
    return new Response(JSON.stringify(result), { headers: responseHeaders('application/json; charset=utf-8') });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || String(error) }), { status: 500, headers: responseHeaders('application/json; charset=utf-8') });
  }
}

export async function handleDashboardV3DiagnosticsRequest(request, env) {
  try {
    const url = new URL(request.url);
    const data = await getV3Diagnostics(env, { windowKey: normalizeWindow(url.searchParams.get('window')) });
    return new Response(renderV3Diagnostics(data), { headers: responseHeaders('text/html; charset=utf-8') });
  } catch (error) {
    return new Response(`V3 diagnostics error: ${error?.message || String(error)}`, { status: 500, headers: responseHeaders('text/plain; charset=utf-8') });
  }
}
