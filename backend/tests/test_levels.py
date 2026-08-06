"""Tests for level definitions."""

from app.levels import ALL_LEVELS, HARNESS_SEVEN_KEYS, LEVELS_BY_ID


def test_six_levels_in_order():
    ids = [l.id for l in ALL_LEVELS]
    assert ids == [
        "level_1_raw", "level_2_harness", "level_3_loop",
        "level_4_loop_stack", "level_5_graph", "level_6_agent_system",
    ]


def test_level_names_and_labels():
    assert LEVELS_BY_ID["level_2_harness"].name == "Agent + Harness"
    assert LEVELS_BY_ID["level_2_harness"].learning_label == "Tool Agent"
    assert LEVELS_BY_ID["level_6_agent_system"].name == "Agent System"
    assert LEVELS_BY_ID["level_6_agent_system"].learning_label == "Agent Factory"


def test_harness_unlock_progression():
    assert LEVELS_BY_ID["level_1_raw"].unlocked_harness == []
    assert set(LEVELS_BY_ID["level_2_harness"].unlocked_harness) == set(HARNESS_SEVEN_KEYS)


def test_loop_stack_templates_by_level():
    assert LEVELS_BY_ID["level_4_loop_stack"].unlocked_loop_templates == ["single", "dual"]
    assert LEVELS_BY_ID["level_6_agent_system"].unlocked_loop_templates == ["factory"]
    assert LEVELS_BY_ID["level_3_loop"].unlocked_loop_stack is False


class TestLevels:
    def test_all_6_levels_exist(self):
        assert len(ALL_LEVELS) == 6

    def test_level_ids_are_unique(self):
        ids = [lvl.id for lvl in ALL_LEVELS]
        assert len(ids) == len(set(ids))

    def test_level_ids_match_registry(self):
        for lvl in ALL_LEVELS:
            assert LEVELS_BY_ID[lvl.id] is lvl

    def test_names_descriptions_labels_non_empty(self):
        for lvl in ALL_LEVELS:
            assert lvl.name and isinstance(lvl.name, str)
            assert lvl.description and isinstance(lvl.description, str)
            assert lvl.learning_label and isinstance(lvl.learning_label, str)

    def test_progression_monotonic(self):
        """Token budgets and target success rates must increase with level."""
        budgets = [lvl.token_budget for lvl in ALL_LEVELS]
        rates = [lvl.target_success_rate for lvl in ALL_LEVELS]
        for i in range(1, len(budgets)):
            assert budgets[i] > budgets[i - 1]
            assert rates[i] > rates[i - 1]

    def test_unlock_progression(self):
        l1 = LEVELS_BY_ID["level_1_raw"]
        l2 = LEVELS_BY_ID["level_2_harness"]
        l3 = LEVELS_BY_ID["level_3_loop"]
        l4 = LEVELS_BY_ID["level_4_loop_stack"]
        l5 = LEVELS_BY_ID["level_5_graph"]
        l6 = LEVELS_BY_ID["level_6_agent_system"]
        # Level 1: model alone
        assert l1.unlocked_harness == []
        assert not l1.unlocked_loop and not l1.unlocked_graph
        # Level 2: harness, still no loop
        assert set(l2.unlocked_harness) == set(HARNESS_SEVEN_KEYS)
        assert not l2.unlocked_loop
        # Level 3: loop, still no loop stack
        assert set(l3.unlocked_harness) == set(HARNESS_SEVEN_KEYS)
        assert l3.unlocked_loop and not l3.unlocked_loop_stack
        # Level 4: loop stack templates, no graph
        assert l4.unlocked_loop_stack
        assert l4.unlocked_loop_templates == ["single", "dual"]
        assert not l4.unlocked_graph
        # Level 5: graph on top of loop stack
        assert l5.unlocked_graph and l5.unlocked_loop_stack
        # Level 6: factory template + graph
        assert l6.unlocked_graph
        assert l6.unlocked_loop_templates == ["factory"]

    def test_lookup_missing_level(self):
        assert LEVELS_BY_ID.get("nonexistent") is None

    def test_all_levels_are_valid_pydantic(self):
        """LevelInfo models should validate without error."""
        for lvl in ALL_LEVELS:
            _ = lvl.id, lvl.name, lvl.target_success_rate, lvl.token_budget
