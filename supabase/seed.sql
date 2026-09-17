-- Launch city: New York, NY. Real, currently-operating venues across two
-- nightlife-dense areas (Lower East Side / East Village bars and clubs,
-- plus Manhattan/Brooklyn restaurants actually known for real walk-in
-- waits -- a good fit for a wait tracker), researched via web search on
-- 2026-09-17. Supersedes the Boston seed data from the previous launch
-- city decision (see ARCHITECTURE.md "Open questions").
--
-- IMPORTANT before this goes anywhere near production:
--   - Coordinates below are approximate (derived from street addresses,
--     not surveyed, except Peter Luger's which came with precise
--     coordinates from the source) -- good enough for local dev/demo
--     geofence testing, not for a real launch.
--   - Hours and cover charges are illustrative placeholders, not confirmed
--     with the venues. Real values must come from actually contacting each
--     venue (or scraping/licensing a source that keeps them current)
--     before any of this is presented to real users as live data.
--   - None of these venues have agreed to be in this app. Seeding their
--     names here is for local development only -- Venue Partner outreach
--     (and Fast Pass opt-in specifically) is a real-world business step,
--     not something this seed file can substitute for.

insert into venues (name, address, geog, category, hours, cover_charge_info, is_fast_pass_partner)
values
  ('Attaboy', '134 Eldridge St, New York, NY 10002',
    st_setsrid(st_makepoint(-73.9925, 40.7180), 4326)::geography, 'bar',
    '{"wed": "18:00-02:00", "thu": "18:00-02:00", "fri": "18:00-03:00", "sat": "18:00-03:00"}', null, false),

  ('The Back Room', '102 Norfolk St, New York, NY 10002',
    st_setsrid(st_makepoint(-73.9879, 40.7189), 4326)::geography, 'bar',
    '{"tue": "20:00-02:00", "wed": "20:00-02:00", "thu": "20:00-03:00", "fri": "20:00-04:00", "sat": "20:00-04:00"}', null, false),

  ('Death & Co', '433 E 6th St, New York, NY 10009',
    st_setsrid(st_makepoint(-73.9822, 40.7247), 4326)::geography, 'bar',
    '{"sun": "18:00-01:00", "mon": "18:00-01:00", "tue": "18:00-01:00", "wed": "18:00-01:00", "thu": "18:00-02:00", "fri": "18:00-02:00", "sat": "18:00-02:00"}', null, false),

  ('Bar Goto', '245 Eldridge St, New York, NY 10002',
    st_setsrid(st_makepoint(-73.9908, 40.7223), 4326)::geography, 'bar',
    '{"tue": "17:30-01:00", "wed": "17:30-01:00", "thu": "17:30-01:00", "fri": "17:30-02:00", "sat": "17:30-02:00"}', null, false),

  ('The Slipper Room', '167 Orchard St, New York, NY 10002',
    st_setsrid(st_makepoint(-73.9895, 40.7213), 4326)::geography, 'club',
    '{"thu": "20:00-01:00", "fri": "20:00-02:00", "sat": "20:00-02:00"}', 'Cover charge varies by show, typically $20-35', true),

  ('Carbone', '181 Thompson St, New York, NY 10012',
    st_setsrid(st_makepoint(-74.0004, 40.7284), 4326)::geography, 'restaurant',
    '{"sun": "17:00-23:00", "mon": "17:00-23:00", "tue": "17:00-23:00", "wed": "17:00-23:00", "thu": "17:00-00:00", "fri": "17:00-00:00", "sat": "17:00-00:00"}', null, true),

  ('Via Carota', '51 Grove St, New York, NY 10014',
    st_setsrid(st_makepoint(-74.0027, 40.7336), 4326)::geography, 'restaurant',
    '{"mon": "12:00-23:00", "tue": "12:00-23:00", "wed": "12:00-23:00", "thu": "12:00-23:00", "fri": "12:00-23:30", "sat": "12:00-23:30", "sun": "12:00-22:30"}', null, false),

  ('Clinton St. Baking Company', '4 Clinton St, New York, NY 10002',
    st_setsrid(st_makepoint(-73.9838, 40.7205), 4326)::geography, 'restaurant',
    '{"mon": "08:00-16:00", "tue": "08:00-16:00", "wed": "08:00-16:00", "thu": "08:00-16:00", "fri": "08:00-22:00", "sat": "09:00-22:00", "sun": "09:00-16:00"}', null, false),

  ('Peter Luger', '178 Broadway, Brooklyn, NY 11211',
    st_setsrid(st_makepoint(-73.9625144, 40.7098083), 4326)::geography, 'restaurant',
    '{"mon": "11:45-21:45", "tue": "11:45-21:45", "wed": "11:45-21:45", "thu": "11:45-21:45", "fri": "11:45-22:45", "sat": "11:45-22:45", "sun": "13:00-21:45"}', null, false);
