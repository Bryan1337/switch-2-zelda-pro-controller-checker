# Zelda controller stock monitor
Checks the official Nintendo Switch 2 Pro Controller The Legend of Zelda 40th Anniversary Edition, capped at €130 including Netherlands delivery.

## Coverage
- Coolblue: rendered product page and enabled purchase control.
- AllYourGames: rendered product page; price cap excludes inflated offers.
- Lobbes: rendered page plus cart confirmation; GitHub-hosted runners may be blocked, which is recorded as a failed check, never an in-stock result.

Bol, Nintendo Store and MediaMarkt are not yet included in this workflow. The separate hourly ChatGPT search covers additional retailers.

## Alerts
Discord webhook is read exclusively from Actions secret DISCORD_WEBHOOK_URL. The webhook is verified without posting a test message. No secrets are committed. Alerts require the exact edition, positive stock signal next to an enabled purchase control and an unambiguous price. Recommendations, sold-out text, preorders and uncertain states are excluded.

Each run uploads a JSON report and browser screenshots under Actions artifacts (3-day retention). Check failures appear in the report. Deduplication uses Actions cache; eviction can cause a repeat alert.

## Schedule
Runs every five minutes (minutes 2, 7, 12, etc.) plus manual workflow dispatch. Hosted validation and browser fixtures passed; Discord webhook verification returned HTTP 200. GitHub schedules can be delayed. No purchases are made.

## Validation
Node rule tests and rendered browser fixtures cover positive stock, unavailable Lobbes, disabled buttons, contradictory stock, recommendations and ambiguous prices.
