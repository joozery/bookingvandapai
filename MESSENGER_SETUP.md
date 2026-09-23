# Messenger trip replies

## Production server environment variables (server only)

Production is hosted separately from Vercel at https://dapaidernpai.com. Set these values on that server, not on Vercel, unless Vercel is later chosen to receive the webhook.

Local preparation: `.env.local` contains a generated `MESSENGER_VERIFY_TOKEN` and empty slots for the other four variables. Copy only the MESSENGER variables to the production server through a secure channel; do not overwrite its existing database/auth configuration. The file is ignored by Git and will not be included in a git pull. The Graph API version must be filled from the actual Meta app settings; no version was guessed.

- `MESSENGER_PAGE_ACCESS_TOKEN`: a NEW Page token for Dapaidernpai. Revoke the token previously shared in chat.
- `MESSENGER_APP_SECRET`: App Secret from the same Meta app.
- `MESSENGER_VERIFY_TOKEN`: a long random value you create; enter the identical value in Meta's Webhook form.
- `MESSENGER_PAGE_ID`: numeric Facebook Page ID, not the app ID or page username.
- `MESSENGER_GRAPH_API_VERSION`: the supported Graph API version selected for your Meta app, including the `v` prefix.

Set these in the production service's environment (or `.env.local` if running Next.js directly), then build and restart the service. Docker/PM2 users must ensure the variables reach the running process. Do not use NEXT_PUBLIC_ prefixes.

## Domain and Meta setup

1. Ensure dapaidernpai.com points to the production server and has valid HTTPS. Forward `/api/messenger/webhook` to the Next.js service without authentication or redirects.
2. Deploy the webhook code and environment variables.
3. In Meta Messenger Webhook settings, enter Callback URL `https://dapaidernpai.com/api/messenger/webhook` and the matching Verify Token. The GET handler returns Meta's challenge only with a valid verification token.
4. Subscribe the app to the Dapaidernpai Page, with `messaging_referrals` and `messaging_postbacks`. Enable/configure the Messenger Get Started button if required for first-time conversations. Referral data can arrive directly or inside the initial postback.
5. Test using an account allowed by your app's development mode. Click a trip's contact button, enter Messenger, and tap Get Started if prompted.
6. Complete the permissions/review/publishing requirements shown by Meta before enabling replies for general customers. The Send API needs pages_messaging; customer replies must comply with Meta's messaging window.

## Behavior

Trip cards link to `https://m.me/Dapaidernpai?ref=trip%3A<encoded-trip-id>`.
The webhook validates the SHA-256 signature against the app secret and checks the configured Page ID before looking up the trip. The Page sends a reply containing trip name, Thai departure date, time and pickup location. Closed or missing trips get an explanatory reply. Ordinary messages, echo events and non-trip referrals are ignored; this does not create a booking or send messages on the customer's behalf.

## Verification and limitations

Run `node --test tests/messenger.test.cjs` and `npm run build`.
Tests use mocks; no real Facebook messages are sent. Real delivery requires Page credentials, Meta event subscriptions, permissions and a deployed endpoint. A plain browser visit to the webhook without verification parameters returns 403 when configured; this is expected.
Processing errors return 500 so Meta can retry. Persistent event deduplication/queueing is not implemented: a retried batch can repeat a reply already sent, and unusually large batches can exceed the hosting request timeout. Add a durable queue and event store before using this for high-volume messaging.

Changing the website domain does not change the m.me link. Update the Meta Callback URL if switching domains and keep it on a direct HTTPS endpoint (avoid redirects).
