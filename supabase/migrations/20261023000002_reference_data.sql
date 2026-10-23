-- Etkinlik türleri (CLAUDE.md §6.11). Kişisel veri içermez.
insert into public.activity_types (name, color, sort_order, in_rotation, default_capacity) values
  ('Bowling',           'blue-deep',   10, true, 4),
  ('Paintball',         'green-deep',  20, true, 4),
  ('Havuz',             'cyan',        30, true, 3),
  ('Fotoğraf',          'lilac',       40, true, 4),
  ('Workshop',          'amber',       50, true, 5),
  ('Stüdyo/Reels',      'pink',        60, true, 4),
  ('Sosyal Sorumluluk', 'green',       70, true, 5),
  ('Sunum',             'slate',       80, true, 5),
  ('Kitap Tahlili',     'brown',       90, true, 3),
  ('Film Tahlili',      'indigo',     100, true, 4),
  ('Liderlik',          'blue-light', 200, false, null),
  ('Şenlik',            'red-deep',   210, false, null),
  ('Serbest Gezi',      'teal',       220, false, null),
  ('Kamp',              'olive',      230, false, null),
  ('Konferans',         'gray',       240, false, null),
  ('Belgesel',          'purple',     250, false, null),
  ('Drama',             'orange',     260, false, null);
