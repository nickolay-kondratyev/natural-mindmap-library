# v1 ticket plan decisions (epic nid_hc65067veoxpca8wtir8bnj2e_e)

1. **Branch-to-branch repel (spec R8 sub-bullet)** — implemented as simple separation of overlapping branches (no physics) inside the branches ticket (nid_u8rb9nyllrir2j6ditgfhu7uo_e). Alternative was a separate later ticket. Chosen because it is asked for and the simple version fits the ticket.
2. **Dragged node positions** — the spec's node data has no position field. v1: the library keeps dragged positions in memory by node id and reports them via the position-change event, so hosts may persist them. Deferred: hosts passing saved positions back in (add when a host like Obsidian needs it).
