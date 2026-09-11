// WSP-2.3 -- region-level category bias for the native puzzle-word command
// (get_puzzle_words, src/lib.rs). This is a hand-maintained mirror of
// src/regionTuning.ts's category-bias half, scoped the same way that file
// documents: WSP-2.2 (a concurrent, separate issue) owns the full region
// data module; this only carries what get_puzzle_words needs to apply the
// same category bias the web path applies, so a region's identity isn't
// silently web-only.
//
// The favored-category lists and weights below must match
// data/region_category_bias.json exactly -- that JSON file is the single
// source of truth both platforms' parity tests check against
// (src/backend.test.ts on the TS side, test_region_category_bias_parity
// below on this side). A literally-shared data format isn't practical here:
// get_puzzle_words is a compiled, offline-capable native command with no
// runtime file access to arbitrary app-relative paths (categories/mod.rs
// itself is generated Rust source for the same reason, see
// scripts/gen_categories.py), so the JSON fixture is read only by tests,
// not by this file's production code path. Keeping the two hand-maintained
// tables in sync is exactly what the parity test exists to catch a drift
// in, on both sides, rather than trusting hand-editing discipline alone.

use crate::categories::Category;

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum RegionId {
    GlowingGrove,
    SunlitFalls,
    CrystalConservatory,
    MosswoodHollows,
    CloudreachSummit,
    VerdantBeyond,
}

impl RegionId {
    /// Parses the same kebab-case region ids src/regionTuning.ts's `RegionId`
    /// type uses (e.g. "glowing-grove"), since that's what crosses the Tauri
    /// IPC boundary as a plain string. Returns None for anything else --
    /// callers fall back to the unbiased tier-pool cycle rather than panic
    /// on an unrecognized id (e.g. a future region id this native build
    /// hasn't been updated for yet).
    pub fn from_str(id: &str) -> Option<RegionId> {
        match id {
            "glowing-grove" => Some(RegionId::GlowingGrove),
            "sunlit-falls" => Some(RegionId::SunlitFalls),
            "crystal-conservatory" => Some(RegionId::CrystalConservatory),
            "mosswood-hollows" => Some(RegionId::MosswoodHollows),
            "cloudreach-summit" => Some(RegionId::CloudreachSummit),
            "verdant-beyond" => Some(RegionId::VerdantBeyond),
            _ => None,
        }
    }

    /// Mirrors src/regionTuning.ts's regionIdForLevel: the six frozen level
    /// ranges from WordSprout_1.0_Plan.md section 2.1, with anything past
    /// level 100 (or, defensively, below level 1) resolving to the last
    /// region rather than panicking -- play continues past level 100
    /// (WSP-2.4/2.7), it doesn't leave every region behind.
    #[allow(dead_code)] // exercised by tests; not yet called by get_puzzle_words itself, which takes region_id from the caller (see lib.rs)
    pub fn for_level(level: usize) -> RegionId {
        match level {
            1..=20 => RegionId::GlowingGrove,
            21..=30 => RegionId::SunlitFalls,
            31..=40 => RegionId::CrystalConservatory,
            41..=50 => RegionId::MosswoodHollows,
            51..=70 => RegionId::CloudreachSummit,
            _ => RegionId::VerdantBeyond,
        }
    }
}

pub struct CategoryBias {
    pub favored: &'static [&'static str],
    pub weight: usize,
}

/// Must match data/region_category_bias.json exactly (see module doc
/// comment above) -- test_region_category_bias_parity checks this directly.
pub fn category_bias(region: RegionId) -> CategoryBias {
    match region {
        RegionId::GlowingGrove => CategoryBias {
            favored: &["Family", "Pets", "Farm Animals", "Gardening", "Nature"],
            weight: 2,
        },
        RegionId::SunlitFalls => CategoryBias {
            favored: &["Beach & Summer", "Camping & Outdoors", "Sports", "Action & Adventure"],
            weight: 2,
        },
        RegionId::CrystalConservatory => CategoryBias {
            favored: &["Mythology", "Philosophy", "Etymology/Word Roots", "Astrology/Zodiac", "Literary Devices"],
            weight: 3,
        },
        RegionId::MosswoodHollows => CategoryBias {
            favored: &["Mystery & Thriller", "Fairy Tales", "Fantasy", "Mythical Creatures", "Forensics"],
            weight: 2,
        },
        RegionId::CloudreachSummit => CategoryBias {
            favored: &["Chemistry Elements/Terms", "Physics", "Computer Science", "Medical Terminology", "Legal Terms"],
            weight: 3,
        },
        RegionId::VerdantBeyond => CategoryBias {
            favored: &["Nature", "History", "Space & Astronomy"],
            weight: 2,
        },
    }
}

/// Mirrors src/regionTuning.ts's `buildBiasedCategorySequence` exactly:
/// every entry in `pool` appears at least once (a region's bias can never
/// exclude a category from ever being selected), and every entry whose name
/// is in `favored` appears `weight` times instead of once. Cycling an index
/// through this sequence (rather than through `pool` itself) is what makes
/// a region's favored categories come up more often while still
/// guaranteeing every category in the tier eventually gets a turn.
pub fn build_biased_sequence<'a>(
    pool: &[&'a Category],
    favored: &[&str],
    weight: usize,
) -> Vec<&'a Category> {
    let favored_set: std::collections::HashSet<&str> = favored.iter().copied().collect();
    let effective_weight = weight.max(1);
    let mut sequence = Vec::with_capacity(pool.len() * effective_weight.max(1));
    for item in pool {
        let times = if favored_set.contains(item.name) { effective_weight } else { 1 };
        for _ in 0..times {
            sequence.push(*item);
        }
    }
    sequence
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn region_id_round_trips_through_its_kebab_case_string() {
        let ids = [
            RegionId::GlowingGrove,
            RegionId::SunlitFalls,
            RegionId::CrystalConservatory,
            RegionId::MosswoodHollows,
            RegionId::CloudreachSummit,
            RegionId::VerdantBeyond,
        ];
        let strs = [
            "glowing-grove",
            "sunlit-falls",
            "crystal-conservatory",
            "mosswood-hollows",
            "cloudreach-summit",
            "verdant-beyond",
        ];
        for (id, s) in ids.iter().zip(strs.iter()) {
            assert_eq!(RegionId::from_str(s), Some(*id));
        }
        assert_eq!(RegionId::from_str("not-a-region"), None);
    }

    #[test]
    fn for_level_matches_the_frozen_plan_boundaries() {
        assert_eq!(RegionId::for_level(1), RegionId::GlowingGrove);
        assert_eq!(RegionId::for_level(20), RegionId::GlowingGrove);
        assert_eq!(RegionId::for_level(21), RegionId::SunlitFalls);
        assert_eq!(RegionId::for_level(30), RegionId::SunlitFalls);
        assert_eq!(RegionId::for_level(31), RegionId::CrystalConservatory);
        assert_eq!(RegionId::for_level(40), RegionId::CrystalConservatory);
        assert_eq!(RegionId::for_level(41), RegionId::MosswoodHollows);
        assert_eq!(RegionId::for_level(50), RegionId::MosswoodHollows);
        assert_eq!(RegionId::for_level(51), RegionId::CloudreachSummit);
        assert_eq!(RegionId::for_level(70), RegionId::CloudreachSummit);
        assert_eq!(RegionId::for_level(71), RegionId::VerdantBeyond);
        assert_eq!(RegionId::for_level(100), RegionId::VerdantBeyond);
        // Play continues past level 100 (WSP-2.4/2.7) -- still Verdant Beyond,
        // not a panic or an undefined region.
        assert_eq!(RegionId::for_level(150), RegionId::VerdantBeyond);
    }

    #[test]
    fn biased_sequence_never_drops_an_unfavored_category() {
        let a = Category { name: "A", tier: crate::categories::Tier::Standard, words: &["ONE"] };
        let b = Category { name: "B", tier: crate::categories::Tier::Standard, words: &["TWO"] };
        let c = Category { name: "C", tier: crate::categories::Tier::Standard, words: &["THREE"] };
        let pool = vec![&a, &b, &c];
        let sequence = build_biased_sequence(&pool, &["B"], 3);
        assert_eq!(sequence.len(), 5); // A once, B three times, C once
        assert_eq!(sequence.iter().filter(|c| c.name == "A").count(), 1);
        assert_eq!(sequence.iter().filter(|c| c.name == "B").count(), 3);
        assert_eq!(sequence.iter().filter(|c| c.name == "C").count(), 1);
    }

    #[test]
    fn biased_sequence_with_no_favorites_matches_the_plain_pool() {
        let a = Category { name: "A", tier: crate::categories::Tier::Standard, words: &["ONE"] };
        let b = Category { name: "B", tier: crate::categories::Tier::Standard, words: &["TWO"] };
        let pool = vec![&a, &b];
        let sequence = build_biased_sequence(&pool, &[], 5);
        assert_eq!(sequence.len(), pool.len());
        for (seq_item, pool_item) in sequence.iter().zip(pool.iter()) {
            assert_eq!(seq_item.name, pool_item.name);
        }
    }

    #[test]
    fn weight_below_one_is_treated_as_one_not_zero() {
        let a = Category { name: "A", tier: crate::categories::Tier::Standard, words: &["ONE"] };
        let pool = vec![&a];
        // weight is unsigned (usize) at the type level, so this really only
        // guards weight == 0; kept as an explicit test since a 0-weight
        // bias must never make a category disappear from the sequence.
        let sequence = build_biased_sequence(&pool, &["A"], 0);
        assert_eq!(sequence.len(), 1);
    }
}
