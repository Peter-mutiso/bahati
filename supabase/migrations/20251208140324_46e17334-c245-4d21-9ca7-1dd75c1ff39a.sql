-- Change crash lane columns from single integer to array of integers
ALTER TABLE public.chicken_road_settings 
  DROP COLUMN IF EXISTS manual_crash_lane_easy,
  DROP COLUMN IF EXISTS manual_crash_lane_medium,
  DROP COLUMN IF EXISTS manual_crash_lane_hard,
  DROP COLUMN IF EXISTS manual_crash_lane_expert;

ALTER TABLE public.chicken_road_settings 
  ADD COLUMN manual_crash_lanes_easy integer[] DEFAULT '{}',
  ADD COLUMN manual_crash_lanes_medium integer[] DEFAULT '{}',
  ADD COLUMN manual_crash_lanes_hard integer[] DEFAULT '{}',
  ADD COLUMN manual_crash_lanes_expert integer[] DEFAULT '{}';