# Analytics events

Google Analytics 4 is loaded on public pages with measurement id `G-QHBHKRHCZJ` (property `539727341`). Account pages do not load the analytics script. Confirmed signup, storefront and purchase events from those pages are sent as single hits, with the same Do Not Track and Global Privacy Control checks as the public tag. Nothing in this list includes an email, name, message, training detail or Strava field.

Events are sent only on `anystride.com` and `www.anystride.com`, and only in production. Preview and local hosts are ignored. PostHog, when configured, receives the same product events on public pages only. It does not receive `page_view`, `scroll_depth` or `engaged_time`.

`sign_up` and `purchase` are deduped in the browser. Reloading the success page does not send them again.

## Sign-up and login

The live account form is one email field. `/account/sign-up` redirects to `/account/sign-in`. Coach entry is `/coaching/apply`. Both call Supabase magic-link sign-in with account creation enabled, so the form cannot tell a new address from a returning one. `sign_up` and `login` are chosen only after `/account/callback` exchanges the email code.

A signup is the first session of an account whose email was confirmed within the last 15 minutes and created within the last day. Every other confirmed callback is a login. The callback sets a five-minute cookie, `anystride_ae`, containing only `sign_up` or `login`, an entry (`coach`, `runner`, `checkout` or `invite`) and a random nonce. The next page sends the event once and deletes the cookie.

| Event | When it fires | Params |
| --- | --- | --- |
| `sign_up_start` | First focus or submit of the email field | `method` = `email`, `entry` |
| `sign_up_abandon` | The field was used and the link request did not succeed before the page closed or the route changed | `method`, `entry`, `step_name` = `email`, `step_number` = `1`, `last_field` = `email` |
| `sign_up` | Callback classified a new confirmed account | `method` = `email`, `entry` |
| `login` | Callback classified a returning confirmed account | `method` = `email`, `entry` |

`entry` is the validated return path: `coach` for `/account/services` or `/account/coach`, `checkout` for a service checkout, `invite` for `/account/athletes`, otherwise `runner`.

## Coach storefront

The storefront editor is `/account/storefront`, for a pending or approved coach. It is one page, not a wizard. The checklist steps that exist in the product are the profile, a service offer, and Stripe payout onboarding. Publishing is a separate action and only appears after approval.

| Event | When it fires | Params |
| --- | --- | --- |
| `coach_storefront_start` | The editor is opened. Once per browser session | none |
| `coach_storefront_step` | A profile or service form is saved, or Stripe payout onboarding is opened | `step_name`, `step_number` |
| `coach_storefront_abandon` | A profile or service form was focused and left before a successful save | `step_name`, `step_number`, `last_field` |
| `coach_storefront_publish` | “Publish my profile” succeeds. Taking a profile offline does not fire it | none |

Step names and numbers:

| `step_name` | `step_number` | What happened |
| --- | --- | --- |
| `profile` | 1 | Profile saved |
| `service` | 2 | Service offer saved and sent for review |
| `payouts` | 3 | Stripe payout onboarding opened |

`last_field` is the field name only (`slug`, `headline`, `location`, `approach`, `title`, `price`, and the other storefront inputs). The value is never sent. Payout completion inside Stripe is not visible to the site, so step 3 is the handoff, not a confirmed connected account.

## Service purchase

Paid purchases are one-time coaching packages and consultations on a published storefront. The buyer reviews the offer at `/account/checkout/[serviceId]`, then continues to Stripe Checkout. Payment is confirmed only when the order status is `paid` or `partially_refunded` on `/account/orders/[orderId]`. The return URL alone does not confirm payment.

These events fire for live payments only. Test mode and the separate sandbox workspace checkout are omitted so they are not counted as revenue.

| Event | When it fires | Params |
| --- | --- | --- |
| `view_item` | A signed-out or signed-in buyer opens a live, available offer that is not their own. Once per item per session | `currency`, `value`, `items` |
| `begin_checkout` | Stripe Checkout is opened. Once per order id per session | `currency`, `value`, `transaction_id`, `items` |
| `checkout_abandon` | A signed-in buyer leaves the offer page without opening Stripe | `currency`, `value`, `items`, `step_name` = `offer`, `step_number` = `1` |
| `purchase` | The buyer opens an order whose server status is paid or partially refunded. Once per order, including later visits | `currency`, `value`, `transaction_id`, `items` |

`value` is the original service price in major currency units (USD, EUR or GBP), from 1 to 1,000. A partial refund still reports the original total. `transaction_id` is the order id. Each `items` entry is `{ item_id, item_category, price, quantity }`. `item_id` is the service id. `item_category` is `package` or `consultation`. Titles, coach names and emails are not included.

Leaving the offer to create an account does not fire `checkout_abandon`. That drop-off is `view_item` without `begin_checkout`, plus `sign_up_start` with `entry` = `checkout` if they use the email form. Drop-off on the Stripe page is `begin_checkout` without `purchase`. The site cannot see which Stripe field they last used.

## Public pages, bounce and engagement

The Google tag sends the first page view for a full document load. After that, each new public pathname from the App Router sends one `page_view`. Rendering the same path again does not send another. Those later views set `page_path` and `page_location` without the query string. Account paths and `/coaching/payment-return` are not page views.

| Event | When it fires | Params |
| --- | --- | --- |
| `page_view` | Each public pathname, once until the path changes | `page_path`, `page_location` |
| `scroll_depth` | 25, 50, 75 and 90 percent of a scrollable landing page | `page_path`, `percent_scrolled` |
| `engaged_time` | The landing page stayed visible for 10 seconds | `page_path`, `engagement_time_msec` = `10000` |

Scroll depth and engaged time run on `/plans`, `/guides`, `/racers`, `/coaches`, and `/coaching` except `/coaching/apply`. `/coaching` itself redirects to `/coaches`, which is the coaching landing page. Pages that fit in the window do not emit scroll events. Time spent in a hidden tab does not count.

GA4 enhanced measurement may also record its own `scroll` event at 90 percent. Use `scroll_depth` for the four thresholds. This code does not change enhanced measurement. If the property’s “page changes based on browser history events” option is on, a client navigation can receive that automatic page view as well as the one sent here. Turn that history option off in GA4 if the page-view count looks doubled.

## Free plan activation

Full schedules already start from the date form on the plan page (`plan_activated`). These events measure that form. Parameters are the public plan slug and, on an enrolled experiment page, the experiment id and variant. The start date, distance units’ selected value, mileage, names, email and Strava fields are dropped.

| Event | When it fires | Params |
| --- | --- | --- |
| `plan_experiment_exposure` | An enrolled plan page assigned a variant. Once per browser tab session | `plan_slug`, `experiment`, `variant` |
| `plan_activation_view` | Any part of the start module entered the viewport. Once per tab session | `plan_slug`, and `experiment` + `variant` when enrolled |
| `plan_activation_start` | The visitor first focuses the date or the distance-unit control, before a successful start | `plan_slug`, `step_name` = `start_date`, `step_number` = `1`, `last_field` |
| `plan_activation_abandon` | That form was started and left before a successful start | `plan_slug`, `step_name`, `step_number`, `last_field` |
| `plan_activated` | A valid start date was submitted. Unchanged event | `plan_slug`, plus `experiment` and `variant` on an enrolled page |
| `plan_calendar_download` | Calendar download requested after a start | `plan_slug`, plus `experiment` and `variant` on an enrolled page |

`last_field` is `start_date` or `distance_unit`. It is the control name, not the date or the unit the visitor picked. `experiment` is `plan_start_cta`. `variant` is `control` or `treatment`. A variant is kept only when the experiment id is present.

Enrolled pages are listed in `PLAN_START_EXPERIMENT_SLUGS`. Today that is `/plans/pfitzinger-18-55`. Other plan slugs can be added there. The assignment is a 50/50 draw stored in the `anystride_xv` cookie and in local storage under `anystride:experiment:plan_start_cta`. Nothing else is stored. The same browser keeps the same variant. Control is the current page. Treatment adds an above-the-fold start path; on an explainer page that path saves a start date and downloads week markers only, not the book’s daily workouts.

`plan_experiment_exposure` is the denominator for a landing-session comparison. It is one hit per tab session on the enrolled page, which is close to a landing session and is not GA4’s own session count. `plan_activation_view` does not fire for control on an explainer page, because that page has no start module.

Read the Pfitzinger result in Explore → Free form:

1. Register event-scoped custom dimensions for `experiment`, `variant` and `plan_slug` if they are not already dimensions.
2. Rows: `variant`. Columns or a filter breakdown: Event name.
3. Filter `experiment` exactly `plan_start_cta` and `plan_slug` exactly `pfitzinger-18-55`.
4. Values: Event count.
5. Keep `plan_experiment_exposure`, `plan_activation_view`, `plan_activation_start`, `plan_activation_abandon`, `plan_activated` and `plan_calendar_download`.

Primary metric: `plan_activated` event count ÷ `plan_experiment_exposure` event count, compared by `variant`.

Secondary metrics, same filters:

- `plan_activation_view` ÷ `plan_experiment_exposure` (module reach; control on this explainer stays at zero views)
- `plan_activation_start` ÷ `plan_experiment_exposure`
- `plan_activation_abandon` ÷ `plan_activation_start`
- `plan_calendar_download` ÷ `plan_activated`

Do not mark the abandon, view or exposure events as key events.

## Events already on the site

These were already sent from public pages. Their parameters stay limited to public slugs and the enumerated preview values.

| Event | When it fires | Params |
| --- | --- | --- |
| `plan_finder_complete` | The plan finder finishes | none |
| `plan_activated` | A free plan is started | `plan_slug` (see Free plan activation for the experiment params) |
| `plan_resume` | A saved plan is resumed | `plan_slug` |
| `workout_complete` | A workout is marked complete | `plan_slug` |
| `plan_calendar_download` | A plan calendar is downloaded | `plan_slug` (see Free plan activation for the experiment params) |
| `plan_print` | A plan is printed | `plan_slug` |
| `race_source_click` | A race source link is clicked | `race_slug`, `link_kind` |
| `guide_plan_click` | A plan link inside a guide is clicked | `guide_slug`, `plan_slug` |
| `coach_application_open` | A link to `/coaching/apply`, or to coach sign-up, is clicked | none |
| `coaching_preview_interact` | The coaching preview changes role, screen, workout or calendar | `preview_role`, `preview_action` |
| `coaching_preview_signup` | The preview’s account link is clicked | `preview_role` |
| `coaching_category_open` | A coaching focus link is clicked | `coaching_focus` |
| `coach_match_open` | `/coaching/match` is clicked | none |
| `coach_match_request` | A coach-match enquiry is saved | none |
| `coach_contact_click` | A coach contact or booking link is clicked | `coach_slug` |
| `partnership_enquiry` | A partnership enquiry is saved | none |
| `race_hub_enquiry` | A race-hub enquiry is saved | none |

## Not instrumented

- Free training plans have no checkout. Starting one remains `plan_activated`. The funnel around that form is the Free plan activation section above.
- The coach application on `/account/services` is the review form that gates the storefront. It is not one of the three storefront steps. Opening the public apply link remains `coach_application_open`.
- Stripe-hosted checkout and Stripe payout onboarding do not report the last field on those sites.
- Test-mode storefront checkouts and the sandbox coaching checkout are not purchases.
- Training calendars, athlete records and Strava summaries are not sent.

A magic-link confirmation joins the earlier hit when it opens in a browser that already has the GA cookie, or in the same tab. A link opened in another browser is a separate client.

## GA4 explorations

Create these in Explore, as funnel explorations. Use user scope so a later step still counts if it happens in a new session, which is normal for the magic link and for Stripe. Break the sign-up funnel down by `entry`.

**Account sign-up**

1. `sign_up_start`
2. `sign_up`

Compare `login` beside this funnel. It is the returning branch of the same email form, not a step after `sign_up`. `sign_up_abandon` is the form drop-off before the link is requested. The gap from `sign_up_start` to `sign_up` also includes people who never open the email.

**Coach storefront**

1. `coach_storefront_start`
2. `coach_storefront_step` where `step_number` = 1 (`profile`)
3. `coach_storefront_step` where `step_number` = 2 (`service`)
4. `coach_storefront_step` where `step_number` = 3 (`payouts`)
5. `coach_storefront_publish`

`coach_storefront_abandon` shows the last field when a profile or service form was left unsaved. Pending coaches can save a profile but cannot add a service, open payouts or publish until approval, so they stop after step 2 in this list.

**Service purchase**

1. `view_item`
2. `begin_checkout`
3. `purchase`

Break this down by `item_category` (`package` or `consultation`). Use `value` and `currency` on `purchase` for revenue. `checkout_abandon` is only the signed-in offer page. Stripe drop-off is step 2 without step 3.

## Key events to mark

Mark these three as key events in GA4. Leave the others as ordinary events so abandonment, scrolling and page views do not count as conversions.

- `sign_up`
- `purchase`
- `coach_storefront_publish`
