-- Launch city: Boston, MA. Real, currently-operating venues across two
-- nightlife-dense areas (Fenway/Lansdowne St and the North End/Back Bay),
-- researched via web search on 2026-09-17.
--
-- IMPORTANT before this goes anywhere near production:
--   - Coordinates below are approximate (derived from street addresses,
--     not surveyed) -- good enough for local dev/demo geofence testing,
--     not for a real launch.
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
  ('Bleacher Bar', '82A Lansdowne St, Boston, MA 02215',
    st_setsrid(st_makepoint(-71.0972, 42.3467), 4326)::geography, 'bar',
    '{"fri": "11:00-01:00", "sat": "11:00-01:00", "sun": "11:00-23:00"}', null, false),

  ('Cask ''N Flagon', '62 Brookline Ave, Boston, MA 02215',
    st_setsrid(st_makepoint(-71.0972, 42.3459), 4326)::geography, 'bar',
    '{"thu": "16:00-01:00", "fri": "16:00-02:00", "sat": "11:00-02:00"}', null, false),

  ('Game On!', '82 Lansdowne St, Boston, MA 02215',
    st_setsrid(st_makepoint(-71.0975, 42.3468), 4326)::geography, 'bar',
    '{"tue": "16:00-01:00", "fri": "16:00-02:00", "sat": "11:00-02:00"}', 'Cover charge on Red Sox game nights', true),

  ('The Lansdowne Pub', '9 Lansdowne St, Boston, MA 02215',
    st_setsrid(st_makepoint(-71.0980, 42.3466), 4326)::geography, 'bar',
    '{"thu": "17:00-02:00", "fri": "17:00-02:00", "sat": "17:00-02:00"}', null, false),

  ('Loretta''s Last Call', '1 Lansdowne St, Boston, MA 02215',
    st_setsrid(st_makepoint(-71.0983, 42.3464), 4326)::geography, 'club',
    '{"thu": "21:00-02:00", "fri": "21:00-02:00", "sat": "21:00-02:00"}', '$10-20 cover after 9pm', true),

  ('Tresca', '233 Hanover St, Boston, MA 02113',
    st_setsrid(st_makepoint(-71.0553, 42.3646), 4326)::geography, 'restaurant',
    '{"wed": "17:00-22:00", "thu": "17:00-22:00", "fri": "17:00-23:00", "sat": "17:00-23:00"}', null, false),

  ('Forcella', '43 Salem St, Boston, MA 02113',
    st_setsrid(st_makepoint(-71.0559, 42.3641), 4326)::geography, 'restaurant',
    '{"wed": "17:00-22:00", "thu": "17:00-22:00", "fri": "17:00-23:00", "sat": "17:00-23:00"}', null, false),

  ('OAK Long Bar + Kitchen', '138 St James Ave, Boston, MA 02116',
    st_setsrid(st_makepoint(-71.0776, 42.3496), 4326)::geography, 'restaurant',
    '{"thu": "16:00-23:00", "fri": "16:00-00:00", "sat": "10:00-00:00"}', null, false),

  ('Buttermilk & Bourbon', '160 Commonwealth Ave, Boston, MA 02116',
    st_setsrid(st_makepoint(-71.0827, 42.3505), 4326)::geography, 'restaurant',
    '{"wed": "17:00-22:00", "thu": "17:00-23:00", "fri": "17:00-00:00", "sat": "11:00-00:00"}', null, false);
