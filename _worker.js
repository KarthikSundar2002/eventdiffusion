// Cloudflare Pages, advanced mode (2026-11-24). Pages' static file serving ignores HTTP Range requests: it answers
// 200 with the whole file, and Safari (macOS, iOS) will not play a video without 206 partial responses, while other
// browsers must re-download a whole clip to seek or loop. This serves byte ranges of the site's MP4s from the static
// files, streaming only the bytes asked for. _routes.json sends only the video folders here; everything else is plain
// static serving. Single ranges only (a multi-range request gets the whole file, which HTTP allows). The static files
// reach this code without a Content-Length, so publish.py writes each MP4's size into SIZES at export; a file missing
// from it is read once to find its length.
const SIZES = {"/assets/clips/bs_ergb__1_TEST__basket_08__k123/gap5_ev.mp4":501322,"/assets/clips/bs_ergb__1_TEST__basket_08__k123/gap5_time.mp4":2213817,"/assets/clips/bs_ergb__1_TEST__basket_08__k123/interp_ev.mp4":644373,"/assets/clips/bs_ergb__1_TEST__may29_water_tank_pouring_02__k190/gap5_ev.mp4":1312555,"/assets/clips/bs_ergb__1_TEST__may29_water_tank_pouring_02__k190/gap5_time.mp4":4170209,"/assets/clips/bs_ergb__1_TEST__may29_water_tank_pouring_02__k190/interp_ev.mp4":1929965,"/assets/clips/bs_ergb__1_TEST__paprika_1000_gain_control_02__k40/interp_ev.mp4":1797839,"/assets/clips/cear__outdoor__between-buildings_night_comb__k8527/gap5_ev.mp4":3634084,"/assets/clips/cear__outdoor__between-buildings_night_comb__k8527/gap5_time.mp4":3168539,"/assets/clips/cear__outdoor__between-buildings_night_comb__k8527/interp_ev.mp4":3718573,"/assets/clips/dsec__interlaken_00_b__k808/gap5_ev.mp4":1632475,"/assets/clips/dsec__interlaken_00_b__k808/gap5_time.mp4":6721820,"/assets/clips/dsec__interlaken_00_b__k808/interp_ev.mp4":1698925,"/assets/clips/dsec__zurich_city_12_a__k382/gap5_ev.mp4":801521,"/assets/clips/dsec__zurich_city_12_a__k382/gap5_time.mp4":6641427,"/assets/clips/dsec__zurich_city_12_a__k382/interp_ev.mp4":1155451,"/assets/clips/dsec__zurich_city_13_a__k189/gap5_ev.mp4":1341735,"/assets/clips/dsec__zurich_city_13_a__k189/gap5_time.mp4":4489983,"/assets/clips/dsec__zurich_city_13_a__k189/interp_ev.mp4":1612334,"/assets/clips/dsec__zurich_city_14_c__k595/gap5_ev.mp4":874092,"/assets/clips/dsec__zurich_city_14_c__k595/gap5_time.mp4":6813786,"/assets/clips/dsec__zurich_city_14_c__k595/interp_ev.mp4":1269437,"/assets/downstream/e2vid/interlaken_01_a_00754_00813.mp4":985107,"/assets/downstream/e2vid/interlaken_01_a_00850_00909.mp4":990052,"/assets/downstream/e2vid/interlaken_01_a_02061_02120.mp4":1385586,"/assets/downstream/e2vid/thun_01_b_00330_00389.mp4":1490477,"/assets/downstream/e2vid/zurich_city_12_a_00705_00764.mp4":1066749,"/assets/downstream/ess/zurich_city_14_c_000492_000550.mp4":790245,"/assets/downstream/ess/zurich_city_15_a_000480_000538.mp4":833977,"/assets/downstream/ess/zurich_city_15_a_000932_000990.mp4":623701,"/assets/forecast_clips/fire_02_ev.mp4":5491466,"/assets/forecast_clips/fire_02_time.mp4":1413231,"/assets/forecast_clips/paprika_1000_gain_control_02_ev.mp4":5118136,"/assets/forecast_clips/paprika_1000_gain_control_02_time.mp4":2005956,"/assets/hero/hero.mp4":1933478,"/assets/umbrella/umbrella.mp4":6431045}; // filled in by publish.py
const slice = (body, start, end) => {
  let pos = 0;
  return body.pipeThrough(new TransformStream({
    transform(chunk, ctl) {
      const a = Math.max(start - pos, 0), b = Math.min(end + 1 - pos, chunk.byteLength);
      if (b > a) ctl.enqueue(chunk.subarray(a, b));
      pos += chunk.byteLength;
      if (pos > end) ctl.terminate();
    },
  }));
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.endsWith('.mp4') || (request.method !== 'GET' && request.method !== 'HEAD')) return env.ASSETS.fetch(request);
    const plain = new Headers(request.headers); plain.delete('Range'); plain.delete('If-Range');
    const res = await env.ASSETS.fetch(new Request(url, { method: 'GET', headers: plain }));
    if (res.status !== 200 || !res.body) return res;
    let size = SIZES[url.pathname] || Number(res.headers.get('Content-Length')) || 0, body = res.body;
    if (!size) { const buf = await res.arrayBuffer(); size = buf.byteLength; body = new Blob([buf]).stream(); }
    const headers = new Headers(res.headers);
    headers.set('Accept-Ranges', 'bytes'); headers.set('Cache-Control', 'no-store');
    const m = /^bytes=(\d*)-(\d*)$/.exec((request.headers.get('Range') || '').trim());
    headers.set('Content-Length', String(size));
    if (!m || (!m[1] && !m[2])) return new Response(request.method === 'HEAD' ? null : body, { status: 200, headers });
    let start, end;
    if (m[1]) { start = Number(m[1]); end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1; }
    else { start = Math.max(0, size - Number(m[2])); end = size - 1; }
    if (start >= size || start > end) {
      body.cancel();
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}`, 'Cache-Control': 'no-store' } });
    }
    headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
    headers.set('Content-Length', String(end - start + 1));
    if (request.method === 'HEAD') { body.cancel(); return new Response(null, { status: 206, headers }); }
    const { readable, writable } = new FixedLengthStream(end - start + 1);
    slice(body, start, end).pipeTo(writable).catch(() => {});
    return new Response(readable, { status: 206, headers });
  },
};
