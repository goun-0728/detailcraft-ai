// Edge 대신 Node.js 런타임 사용 (타임아웃 60초, Edge는 30초 제한)
export const config = { runtime: 'nodejs', maxDuration: 60 };

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const body = req.body;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) { res.status(500).json({ error: 'API key not configured' }); return; }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: body.model || 'gpt-4o',
        max_tokens: body.max_tokens || 6000,
        messages: [
          { role: 'system', content: body.system || '' },
          ...(body.messages || [])
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      res.status(response.status).json({ error: data.error?.message || 'API error' });
      return;
    }

    // OpenAI 응답을 기존 형식으로 변환
    const converted = {
      content: [{
        type: 'text',
        text: data.choices?.[0]?.message?.content || ''
      }]
    };

    res.status(200).json(converted);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
