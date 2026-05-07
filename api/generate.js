export const config = { runtime: 'edge' };

export default async function handler(req) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  try {
    const body = await req.json();
    const { type } = body;

    const json = (data, status=200) => new Response(JSON.stringify(data), {
      status, headers: { ...cors, 'Content-Type': 'application/json' }
    });

    // ── Claude (기획/번역/분석) ──
    if (!type || type === 'plan' || type === 'translate' || type === 'analyze') {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) return json({ error: 'ANTHROPIC_API_KEY not set in Vercel environment variables' }, 500);

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: body.model || 'claude-sonnet-4-20250514',
          max_tokens: body.max_tokens || 6000,
          system: body.system || '',
          messages: body.messages || [],
        }),
      });

      const data = await res.json();
      if (!res.ok) return json({ error: data.error?.message || `Claude error ${res.status}` }, res.status);
      return json(data);
    }

    // ── DALL-E 3 (이미지 생성) ──
    if (type === 'image') {
      const key = process.env.OPENAI_API_KEY;
      if (!key) return json({ error: 'OPENAI_API_KEY not set in Vercel environment variables' }, 500);

      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: body.prompt,
          n: 1,
          size: body.size || '1024x1024',
          quality: 'hd',
          style: 'natural',
        }),
      });

      const data = await res.json();
      if (!res.ok) return json({ error: data.error?.message || `DALL-E error ${res.status}` }, res.status);
      return json({ url: data.data?.[0]?.url || null });
    }

    return json({ error: 'Unknown type' }, 400);

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
