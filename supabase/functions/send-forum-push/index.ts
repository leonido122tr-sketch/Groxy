// Edge Function: отправляет FCM push при создании forum_notifications
// Деплой: supabase functions deploy send-forum-push
// Секрет: FCM_SERVER_KEY (legacy server key из Firebase)

import { createClient } from 'npm:@supabase/supabase-js@2.36.0'

interface DBWebhookBody {
  record?: Record<string, unknown>
  new?: Record<string, unknown>
  payload?: { record?: Record<string, unknown> }
  id?: string
  user_id?: string
  [key: string]: unknown
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY') ?? ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

async function sendFcmLegacy(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  const url = 'https://fcm.googleapis.com/fcm/send'
  const payload: Record<string, unknown> = {
    to: token,
    notification: { title, body },
    data: data ?? {},
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `key=${FCM_SERVER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const text = await res.text()
  let json: unknown = null
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text }
  }
  return { ok: res.ok, status: res.status, response: json }
}

function extractRecord(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object') return null
  const b = body as DBWebhookBody
  if (b.record) return b.record as Record<string, unknown>
  if (b.new) return b.new as Record<string, unknown>
  if (b.payload?.record) return b.payload.record as Record<string, unknown>
  if (b.id && b.user_id) return b as unknown as Record<string, unknown>
  return null
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Only POST supported' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const contentType = req.headers.get('content-type') ?? ''
    let bodyObj: unknown
    if (contentType.includes('application/json')) {
      bodyObj = await req.json()
    } else {
      const txt = await req.text()
      try {
        bodyObj = JSON.parse(txt)
      } catch {
        bodyObj = {}
      }
    }

    const record = extractRecord(bodyObj)
    if (!record) {
      return new Response(JSON.stringify({ ok: false, reason: 'no_record_in_payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const userId = (record.user_id ?? record.userId) as string | null
    const topicId = (record.topic_id ?? record.topicId) as string | null
    const postId = (record.post_id ?? record.postId) as string | null
    const notificationId = record.id as string | null

    if (!userId) {
      return new Response(JSON.stringify({ ok: false, reason: 'no_user_id_in_record' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { data: profileData, error: profileErr } = await supabase
      .from('profiles')
      .select('id, push_notifications_enabled')
      .eq('id', userId)
      .limit(1)
      .maybeSingle()

    if (profileErr) console.error('Error fetching profile:', profileErr)
    const profile = profileData ?? null

    if (!profile) {
      return new Response(JSON.stringify({ ok: true, skipped: 'profile_not_found' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (profile.push_notifications_enabled === false) {
      return new Response(JSON.stringify({ ok: true, skipped: 'disabled_in_profile' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { data: tokensData, error: tokensErr } = await supabase
      .from('push_tokens')
      .select('id, token, platform')
      .eq('user_id', userId)

    if (tokensErr) {
      console.error('Error fetching push_tokens:', tokensErr)
      return new Response(JSON.stringify({ ok: false, reason: 'error_fetching_tokens' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const tokens = Array.isArray(tokensData) ? tokensData : []
    if (!tokens.length) {
      return new Response(JSON.stringify({ ok: true, skipped: 'no_tokens' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let topicTitle: string | null = null
    if (topicId) {
      const { data: topicData, error: topicErr } = await supabase
        .from('forum_topics')
        .select('id, title')
        .eq('id', topicId)
        .limit(1)
        .maybeSingle()
      if (!topicErr && topicData) topicTitle = topicData.title ?? null
    }

    const title = 'Новый комментарий в теме'
    const bodyText = topicTitle
      ? `В теме «${topicTitle}» появился новый комментарий.`
      : 'Появился новый комментарий в вашей теме.'

    const dataPayload: Record<string, string> = {
      notification_id: notificationId ? String(notificationId) : '',
      topic_id: topicId ? String(topicId) : '',
      post_id: postId ? String(postId) : '',
    }

    if (!FCM_SERVER_KEY) {
      console.error('Missing FCM_SERVER_KEY secret')
      return new Response(JSON.stringify({ ok: false, reason: 'missing_fcm_server_key' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const results: Array<{ token_id: string; ok: boolean; status?: number; error?: string; response?: unknown }> = []
    for (const t of tokens) {
      try {
        const res = await sendFcmLegacy(t.token, title, bodyText, dataPayload)
        results.push({ token_id: t.id, ok: res.ok, status: res.status, response: res.response })
      } catch (e) {
        console.error('Error sending FCM to token:', t.token, e)
        results.push({ token_id: t.id, ok: false, error: String(e) })
      }
    }

    return new Response(JSON.stringify({ ok: true, sent: results.length, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Unhandled error in send-forum-push:', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
