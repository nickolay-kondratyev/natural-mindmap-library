# Repel force: decisions made while fixing nid_5plujgmcff5uhtr5xx0xcu5dl_e

1. **Public API clean break:** `CollisionInput.pinnedIds` (one set) became `pinnedGroups` (list of sets, in drop order). No alias kept, because the package is 0.1.0 and the repo prefers clean breaks. Two existing tests changed only the field shape (`pinnedGroups: [new Set(...)]`); what they assert is unchanged.
2. **Dropped node near the root is now pushed off the root** (before, both stayed put and overlapped). Only happens near the root's box corners; dropping onto the root's shape still reparents. Kept because overlaps are unwanted.
3. **No push between nodes while a drag is in progress** (unchanged, existing design: the drop target must not slide away from the pointer). Nodes separate on drop.
