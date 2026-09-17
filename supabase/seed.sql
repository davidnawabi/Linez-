-- Sample venues for local development / demo purposes only.
-- Coordinates are placeholders in a single launch city (swap for the real
-- launch city + a real manually-curated venue list before going live --
-- see ARCHITECTURE.md "Open questions").

insert into venues (name, address, geog, category, hours, cover_charge_info, is_fast_pass_partner)
values
  ('The Alley Bar', '123 Main St', st_setsrid(st_makepoint(-73.9857, 40.7484), 4326)::geography, 'bar',
    '{"thu": "18:00-02:00", "fri": "18:00-03:00", "sat": "18:00-03:00"}', null, false),
  ('Neon Club', '456 Broadway', st_setsrid(st_makepoint(-73.9880, 40.7505), 4326)::geography, 'club',
    '{"fri": "22:00-04:00", "sat": "22:00-04:00"}', '$20 cover after 11pm', true),
  ('Rooftop Lounge', '789 5th Ave', st_setsrid(st_makepoint(-73.9740, 40.7639), 4326)::geography, 'bar',
    '{"wed": "17:00-01:00", "thu": "17:00-01:00", "fri": "17:00-02:00", "sat": "17:00-02:00"}', null, false),
  ('Downtown Bistro', '321 Spring St', st_setsrid(st_makepoint(-74.0000, 40.7250), 4326)::geography, 'restaurant',
    '{"tue": "17:00-22:00", "wed": "17:00-22:00", "thu": "17:00-23:00", "fri": "17:00-23:00", "sat": "17:00-23:00"}', null, false),
  ('The Underground', '654 W 23rd St', st_setsrid(st_makepoint(-74.0020, 40.7460), 4326)::geography, 'club',
    '{"fri": "23:00-04:00", "sat": "23:00-04:00"}', '$25 cover', true);
