# v1 ticket plan decisions (epic nid_hc65067veoxpca8wtir8bnj2e_e)

1. **Branch-to-branch repel (spec R8 sub-bullet)** — implemented as simple separation of overlapping branches (no physics) inside the branches ticket (nid_u8rb9nyllrir2j6ditgfhu7uo_e). Alternative was a separate later ticket. Chosen because it is asked for and the simple version fits the ticket.
2. **Dragged node positions** — the spec's node data has no position field. v1: the library keeps dragged positions in memory by node id and reports them via the position-change event, so hosts may persist them. Deferred: hosts passing saved positions back in (add when a host like Obsidian needs it).
3. **Drag push-apart timing (I2/R23)** — nearby nodes are pushed apart when the drag is dropped, not live during the drag; live push would shove the hovered drop target away and make drag-drop reparent (I3) impossible. Branches still re-route live. (ticket nid_m9bylgyu4bb098rqygf91vtuo_e)
4. **Delete affordance (I4)** — hover "x" button above each non-root node, no confirmation (undo is the host's job per spec). Keyboard delete is out of scope for v1.
5. **Add child (I4)** — a local draft node with an inline input appears; nothing is sent to the host until Enter (one round-trip, label correct from the start). Blur commits, Escape or empty label cancels.
6. **Inline rename styling** — uses the real font, size, bold, letter spacing; not stretch/slant (accepted for v1).
