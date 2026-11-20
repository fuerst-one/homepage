-- Expand the event vocabulary atomically; preserve events collected under rule v1.
-- Constraints are added NOT VALID so that replaying this file cannot reject rows
-- that later migrations allow; the migrate command validates the final ones.
ALTER TABLE visitor_profile_events
  DROP CONSTRAINT IF EXISTS visitor_profile_events_kind_check,
  ADD CONSTRAINT visitor_profile_events_kind_check CHECK (kind IN ('project_opened','project_read','filter_selected','service_viewed','enquiry_started','enquiry_submitted','recommendation_shown','recommendation_opened','preference_changed','project_details_viewed','case_study_viewed','project_section_read','gallery_explored','proof_opened','service_offer_viewed','service_collaboration_viewed','service_section_read','explorer_lens_selected','explorer_cluster_selected','explorer_term_selected','related_project_opened','topic_selected','project_returned','project_saved','project_unsaved','project_more','project_less','project_neutral')) NOT VALID,
  DROP CONSTRAINT IF EXISTS visitor_profile_events_rule_version_check,
  ADD CONSTRAINT visitor_profile_events_rule_version_check CHECK (rule_version IN (1,2)) NOT VALID;
