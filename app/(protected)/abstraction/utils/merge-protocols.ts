import type { AbstractionProtocol } from "@/app/store/abstractionStore";

/** Keep in-memory protocol edits when refreshing from the OCR API. */
export function mergeProtocolsPreservingEdits(
  incoming: AbstractionProtocol[],
  previous: AbstractionProtocol[],
  editedIds: string[]
): AbstractionProtocol[] {
  if (editedIds.length === 0) {
    return incoming;
  }

  const merged = incoming.map((serverProtocol) => {
    const local = previous.find(
      (p) =>
        editedIds.includes(p.id) &&
        (p.id === serverProtocol.id || p.name === serverProtocol.name)
    );
    if (!local) return serverProtocol;

    return {
      ...serverProtocol,
      name: local.name,
      description: local.description,
      entities: local.entities,
      clauses: local.clauses,
      updatedAt: local.updatedAt,
    };
  });

  for (const local of previous) {
    const isDraft = local.id.startsWith("draft-");
    const onServer = incoming.some((p) => p.id === local.id || p.name === local.name);
    if ((isDraft || editedIds.includes(local.id)) && !onServer) {
      merged.push(local);
    }
  }

  return merged;
}
