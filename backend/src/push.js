'use strict';
const webpush = require('web-push');
const supabase = require('./supabase');

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@festou.com.br',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

async function enviarPushCliente(cliente_pk, { title, body, url = '/minha-conta' }) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;
  if (!cliente_pk) return;

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('pk, endpoint, p256dh, auth')
    .eq('cliente_pk', cliente_pk);

  if (!subs?.length) return;

  const payload = JSON.stringify({ title, body, url });

  await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      ).catch(async err => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('pk', sub.pk);
        } else {
          console.warn(`[Push] Falha cliente ${cliente_pk}: ${err.message}`);
        }
      })
    )
  );
}

module.exports = { enviarPushCliente };
