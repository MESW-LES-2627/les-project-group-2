-- US-3.4: pins are tagged as Stay, Visit, Activity, Food or Meeting Point.
-- Existing pins keep their meaning: sightseeing and other become visit, lodging becomes stay.
update public.pins set category = 'visit' where category in ('sightseeing', 'other');
update public.pins set category = 'stay' where category = 'lodging';

-- Anything else that is not a known category falls back to visit, so the constraint can be added safely.
update public.pins
set category = 'visit'
where category not in ('stay', 'visit', 'activity', 'food', 'meeting_point');

alter table public.pins alter column category set default 'visit';

alter table public.pins drop constraint if exists pins_category_check;
alter table public.pins
    add constraint pins_category_check
    check (category in ('stay', 'visit', 'activity', 'food', 'meeting_point'));
