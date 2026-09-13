-- 0115: the project's look. Style is not a per-cut choice: a film has one look, set on the project from a
-- list the school owns, and every prompt from that project starts with it (enforced server-side).
alter table public.orgs add column looks jsonb not null default '[
  {"key":"photoreal","label":"Photoreal","prompt":"Photorealistic live-action footage, natural light, real lenses, film grain"},
  {"key":"hand-drawn","label":"Hand-drawn 2D","prompt":"Hand-drawn 2D animation, ink outlines, flat colour, painted backgrounds in the style of a Studio Ghibli film"},
  {"key":"anime","label":"Anime","prompt":"Anime, cel-shaded characters, clean line art, detailed painted backgrounds"},
  {"key":"3d","label":"3D animation","prompt":"3D computer animation, soft global illumination, stylised characters, Pixar-like rendering"},
  {"key":"stop-motion","label":"Stop-motion","prompt":"Stop-motion animation, handmade puppets and sets, felt and clay textures, slight frame jitter"},
  {"key":"watercolour","label":"Watercolour","prompt":"Watercolour illustration in motion, soft edges, paper texture, muted palette"},
  {"key":"noir","label":"Film noir","prompt":"Black-and-white film noir, hard shadows, venetian-blind light, 1940s cinematography"},
  {"key":"documentary","label":"Documentary","prompt":"Handheld documentary footage, available light, observational framing"}
]'::jsonb;
comment on column public.orgs.looks is 'The school''s list of looks: [{key,label,prompt}]. Admin-editable; a project picks one key.';
alter table public.projects add column look text;
comment on column public.projects.look is 'Key into orgs.looks. Fixed per project; its prompt is prepended to every generation prompt.';
