-- Rules v3: card clicks, viewed page regions and a per-signal strength.
-- Events collected under earlier rules keep their version and no strength.
ALTER TABLE visitor_profile_events
  ADD COLUMN IF NOT EXISTS strength double precision CHECK (strength IN (0.5,0.75,1)),
  DROP CONSTRAINT IF EXISTS visitor_profile_events_kind_check,
  ADD CONSTRAINT visitor_profile_events_kind_check CHECK (kind IN ('project_opened','project_read','filter_selected','service_viewed','enquiry_started','enquiry_submitted','recommendation_shown','recommendation_opened','preference_changed','project_details_viewed','case_study_viewed','project_section_read','gallery_explored','proof_opened','service_offer_viewed','service_collaboration_viewed','service_section_read','explorer_lens_selected','explorer_cluster_selected','explorer_term_selected','related_project_opened','topic_selected','project_returned','project_saved','project_unsaved','project_more','project_less','project_neutral','project_card_clicked','project_region_viewed')) NOT VALID,
  DROP CONSTRAINT IF EXISTS visitor_profile_events_rule_version_check,
  ADD CONSTRAINT visitor_profile_events_rule_version_check CHECK (rule_version IN (1,2,3)) NOT VALID;
