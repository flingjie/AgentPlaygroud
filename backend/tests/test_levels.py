"""Tests for level definitions."""

from app.levels import ALL_LEVELS, HARNESS_SIX_KEYS, LEVELS_BY_ID


class TestLevels:
    def test_all_4_levels_exist(self):
        assert len(ALL_LEVELS) == 4

    def test_level_ids_are_unique(self):
        ids = [lvl.id for lvl in ALL_LEVELS]
        assert len(ids) == len(set(ids))

    def test_level_ids_match_registry(self):
        for lvl in ALL_LEVELS:
            assert LEVELS_BY_ID[lvl.id] is lvl

    def test_level_names_non_empty(self):
        for lvl in ALL_LEVELS:
            assert lvl.name
            assert isinstance(lvl.name, str)

    def test_level_descriptions_non_empty(self):
        for lvl in ALL_LEVELS:
            assert lvl.description
            assert isinstance(lvl.description, str)

    def test_target_success_rate_in_range(self):
        for lvl in ALL_LEVELS:
            assert 0.0 < lvl.target_success_rate <= 1.0

    def test_token_budget_positive(self):
        for lvl in ALL_LEVELS:
            assert lvl.token_budget > 0

    def test_token_budget_progression(self):
        """Each level should have an equal or larger token budget."""
        budgets = [lvl.token_budget for lvl in ALL_LEVELS]
        for i in range(1, len(budgets)):
            assert budgets[i] >= budgets[i - 1]

    def test_target_success_rate_progression(self):
        """Each level should have a higher target success rate."""
        rates = [lvl.target_success_rate for lvl in ALL_LEVELS]
        for i in range(1, len(rates)):
            assert rates[i] > rates[i - 1]

    def test_level_1_no_harness(self):
        l1 = LEVELS_BY_ID["level_1_raw"]
        assert l1.unlocked_harness == []
        assert l1.unlocked_loop is False
        assert l1.unlocked_graph is False

    def test_level_2_has_harness_no_loop(self):
        l2 = LEVELS_BY_ID["level_2_harness"]
        assert set(l2.unlocked_harness) == set(HARNESS_SIX_KEYS)
        assert l2.unlocked_loop is False
        assert l2.unlocked_graph is False

    def test_level_3_has_loop_no_graph(self):
        l3 = LEVELS_BY_ID["level_3_loop"]
        assert set(l3.unlocked_harness) == set(HARNESS_SIX_KEYS)
        assert l3.unlocked_loop is True
        assert l3.unlocked_graph is False

    def test_level_4_has_everything(self):
        l4 = LEVELS_BY_ID["level_4_graph"]
        assert len(l4.unlocked_harness) == 6
        assert set(l4.unlocked_harness) == set(HARNESS_SIX_KEYS)
        assert l4.unlocked_loop is True
        assert l4.unlocked_graph is True

    def test_lookup_missing_level(self):
        assert LEVELS_BY_ID.get("nonexistent") is None

    def test_all_levels_are_valid_pydantic(self):
        """LevelInfo models should validate without error."""
        for lvl in ALL_LEVELS:
            _ = lvl.id, lvl.name, lvl.target_success_rate, lvl.token_budget
