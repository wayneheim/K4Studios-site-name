import { getV2CanonicalSummary, getV2DebugTrace } from './queries.js';
import { renderDashboardV2, renderDebugTraceV2 } from './renderer.js';
import { refreshV2Drain } from './refresh.js';

function normalizeV2Window(rawWindow) {
  const allowed = new Set(['today', 'yesterday', '24h', '7d', 'all']);
  return allowed.has(rawWindow) ? rawWindow : 'today';
}

function getBestClientIP(request) {
  const cfIp = request.headers.get('CF-Connecting-IP') || null;
  const xff = request.headers.get('X-Forwarded-For') || null;

  const isIPv4 = (ip) => typeof ip === 'string' && ip.includes('.') && !ip.includes(':');

  if (isIPv4(cfIp)) return cfIp;

  if (xff) {
    const parts = xff.split(',').map((value) => value.trim()).filter(Boolean);
    const firstIPv4 = parts.find(isIPv4);
    if (firstIPv4) return firstIPv4;
    if (parts.length > 0) return parts[0];
  }

  return cfIp;
}

function withNoCache(headersInit = {}) {
  const headers = new Headers(headersInit);
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  headers.set('Pragma', 'no-cache');
  headers.set('Expires', '0');
  headers.set('Vary', 'Authorization');
  return headers;
}

export async function handleDashboardV2Request(request, env) {
  try {
    const url = new URL(request.url);
    const windowKey = normalizeV2Window(url.searchParams.get('window'));
    const excludeIp = url.searchParams.get('excludeIp') || null;
    const hideChardon = url.searchParams.get('hideChardon') === '1';
    const viewerIp = getBestClientIP(request);
    const summary = await getV2CanonicalSummary(env, { windowKey, excludeIp, viewerIp, hideChardon });
    const authHeader = request.headers.get('Authorization') || '';
    return new Response(renderDashboardV2({ summary, windowKey, authHeader }), {
      status: 200,
      headers: withNoCache({ 'Content-Type': 'text/html; charset=utf-8' })
    });
  } catch (error) {
    return new Response(`V2 dashboard error: ${error?.message || String(error)}`, {
      status: 500,
      headers: withNoCache({ 'Content-Type': 'text/plain; charset=utf-8' })
    });
  }
}

export async function handleDashboardV2DebugRequest(request, env) {
  try {
    const url = new URL(request.url);
    const filters = {
      sessionId: url.searchParams.get('session_id') || null,
      visitorId: url.searchParams.get('visitor_id') || null,
      pagePath: url.searchParams.get('page_path') || null,
      limit: Math.max(1, Math.min(Number(url.searchParams.get('limit') || '50'), 200)),
      minutes: Math.max(1, Math.min(Number(url.searchParams.get('minutes') || '120'), 1440))
    };
    const trace = await getV2DebugTrace(env, filters);
    const wantsJson = url.searchParams.get('format') === 'json';
    if (wantsJson) {
      return new Response(JSON.stringify({ filters, trace }, null, 2), {
        status: 200,
        headers: withNoCache({ 'Content-Type': 'application/json; charset=utf-8' })
      });
    }
    return new Response(renderDebugTraceV2({ filters, trace }), {
      status: 200,
      headers: withNoCache({ 'Content-Type': 'text/html; charset=utf-8' })
    });
  } catch (error) {
    return new Response(`V2 debug error: ${error?.message || String(error)}`, {
      status: 500,
      headers: withNoCache({ 'Content-Type': 'text/plain; charset=utf-8' })
    });
  }
}

export async function handleDashboardV2RefreshRequest(request, env) {
  try {
    const url = new URL(request.url);
    const batchSize = Math.max(1, Math.min(Number(url.searchParams.get('batch') || '1000'), 1000));
    const maxBatches = Math.max(1, Math.min(Number(url.searchParams.get('maxBatches') || '10'), 25));
    const forceRebuildFacts = url.searchParams.get('forceFacts') === '1';
    const summary = await refreshV2Drain(env, { batchSize, maxBatches, forceRebuildFacts });
    return new Response(JSON.stringify({ summary }, null, 2), {
      status: 200,
      headers: withNoCache({ 'Content-Type': 'application/json; charset=utf-8' })
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || String(error) }, null, 2), {
      status: 500,
      headers: withNoCache({ 'Content-Type': 'application/json; charset=utf-8' })
    });
  }
}