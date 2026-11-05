import type {
  Comparison,
  Expression,
  RuleAction,
  RuleCase,
  RuleCondition,
  RuleDocument,
  RuleSchemaResponse,
  SideWrite,
  SideWriteField,
} from "../../services/rules-api";

/**
 * Editor-only wrappers that give every case, condition and clause a stable id.
 *
 * WHY THIS EXISTS
 *
 * Order is meaningful — cases are tried top to bottom, conditions run in
 * sequence — so those lists are drag-reorderable. Dragging needs a key that
 * belongs to the ROW, not to its position: keyed by array index, a reorder
 * shuffles the keys underneath React and it reconciles the wrong rows, so the
 * box you dragged keeps the values of the box that used to be there.
 *
 * Clauses carry one too. They are not draggable, but they ARE added and removed
 * from the middle of a list, and an index key there produces the same class of
 * bug when someone deletes clause 1 of three.
 *
 * The id is a client-side concern and must never reach the API. Every schema on
 * the backend is `extra="forbid"`, so an unstripped `_uid` is a 422 rather than
 * a silently accepted junk field — which is the behaviour you want, but only if
 * the stripping is in one place. That place is `toDocument`.
 *
 *     server document  --toEditor-->  editor state  --toDocument-->  server
 */

export interface EditorClause extends Comparison {
  _uid: string;
}

export interface EditorExpression extends Omit<Expression, "clause" | "args"> {
  _uid: string;
  clause?: EditorClause | null;
  args?: EditorExpression[] | null;
}

export interface EditorCondition extends Omit<RuleCondition, "expression"> {
  _uid: string;
  expression: EditorExpression;
}

export interface EditorSideWrite extends Omit<SideWrite, "when"> {
  // Mapping rows are added and removed from the middle of a list, which is the
  // same class of bug an index key produces for clauses.
  _uid: string;
  when?: EditorExpression | null;
}

export interface EditorCase extends Omit<RuleCase, "conditions"> {
  _uid: string;
  conditions: EditorCondition[];
}

export interface EditorDocument extends Omit<RuleDocument, "cases"> {
  cases: EditorCase[];
}

let counter = 0;

/**
 * Unique for this editor session, which is all that is needed — these ids never
 * leave the browser, so they need no global uniqueness and no crypto.
 */
export function newUid(prefix = "r"): string {
  counter += 1;
  return `${prefix}${counter}`;
}

// --------------------------------------------------------------------------
// server -> editor
// --------------------------------------------------------------------------

function toEditorExpression(expression: Expression): EditorExpression {
  return {
    ...expression,
    _uid: newUid("e"),
    clause: expression.clause ? { ...expression.clause, _uid: newUid("l") } : null,
    args: expression.args ? expression.args.map(toEditorExpression) : null,
  };
}

export function toEditorCondition(condition: RuleCondition): EditorCondition {
  return {
    ...condition,
    _uid: newUid("c"),
    expression: toEditorExpression(condition.expression),
  };
}

/**
 * Every action on a case, rebuilt through `fn`.
 *
 * Actions sit in three places — `always`, the case's final `outcomes`, and each
 * condition's `outcomes` — and anything that has to touch all of them wants to
 * say so once. Both directions of the side-write conversion below walk exactly
 * this set, and getting one of the seven slots wrong is a save that fails on
 * only some documents.
 */
function mapActions(ruleCase: RuleCase, fn: (action: RuleAction) => RuleAction): RuleCase {
  const slots = (outcomes: Record<string, unknown> | null | undefined) => {
    if (!outcomes) return outcomes;
    const next: Record<string, unknown> = { ...outcomes };
    for (const slot of ["none", "one", "many"]) {
      if (next[slot]) next[slot] = fn(next[slot] as RuleAction);
    }
    return next;
  };

  return {
    ...ruleCase,
    ...(ruleCase.always ? { always: fn(ruleCase.always) } : {}),
    ...(ruleCase.outcomes
      ? { outcomes: slots(ruleCase.outcomes as unknown as Record<string, unknown>) as never }
      : {}),
    ...(ruleCase.conditions
      ? {
          conditions: ruleCase.conditions.map((condition) => ({
            ...condition,
            outcomes: slots(
              condition.outcomes as unknown as Record<string, unknown>
            ) as never,
          })),
        }
      : {}),
  };
}

/**
 * Fold the pre-mapping shape into `write`, mirroring the backend.
 *
 * A document resolved from a pinned rule-set version still arrives as
 * `fields`/`values`, and without this it would render as an empty mapping list
 * — which reads as "this side-write writes nothing" and invites someone to
 * rebuild it by hand.
 */
function foldLegacySideWrite(side: SideWrite): SideWrite {
  if (side.write?.length) return side;
  const values = side.values ?? {};
  const constants = new Set(Object.keys(values).map((k) => k.toLowerCase()));
  const write: SideWriteField[] = [
    // A constant always beat a carried column of the same name, so folding
    // both would state the same column twice — which the backend rejects.
    ...(side.fields ?? [])
      .filter((f) => !constants.has(f.toLowerCase()))
      .map((f) => ({ column: f, field: f })),
    ...Object.entries(values)
      .filter(([, v]) => v != null)
      .map(([column, value]) => ({ column, value })),
  ];
  const { fields: _fields, values: _values, ...rest } = side;
  void _fields;
  void _values;
  return { ...rest, write };
}

function toEditorAction(action: RuleAction): RuleAction {
  if (!action.also?.length) return action;
  return {
    ...action,
    also: action.also.map((side) => {
      const folded = foldLegacySideWrite(side);
      return {
        ...folded,
        _uid: newUid("s"),
        when: folded.when ? toEditorExpression(folded.when) : null,
      } as EditorSideWrite as SideWrite;
    }),
  };
}

export function toEditorCase(ruleCase: RuleCase): EditorCase {
  // Conditions are taken from the MAPPED case, not the original — their
  // outcomes hold actions too, and reading them from `ruleCase` would quietly
  // discard every side-write conversion mapActions just made.
  const mapped = mapActions(ruleCase, toEditorAction);
  return {
    ...mapped,
    _uid: newUid("k"),
    conditions: (mapped.conditions ?? []).map(toEditorCondition),
  };
}

export function toEditor(document: RuleDocument): EditorDocument {
  return { ...document, cases: document.cases.map(toEditorCase) };
}

// --------------------------------------------------------------------------
// editor -> server
// --------------------------------------------------------------------------

function stripExpression(expression: EditorExpression): Expression {
  const { _uid, clause, args, ...rest } = expression;
  void _uid;
  const out: Expression = { ...rest };
  if (clause) {
    const { _uid: clauseUid, ...clauseRest } = clause;
    void clauseUid;
    out.clause = clauseRest;
  } else {
    delete out.clause;
  }
  if (args && args.length) {
    out.args = args.map(stripExpression);
  } else {
    delete out.args;
  }
  return out;
}

/**
 * Strip a side-write on the way out: its own uid, and the uids inside `when`.
 *
 * `also` rides to the server inside `...rest` below, so before this existed a
 * side-write condition carried its editor uids straight into a schema that
 * forbids extra keys — the same failure the case-level `when` note describes,
 * and with the same symptom: bare "Extra inputs are not permitted" pinned to
 * the case, naming neither the side-write nor the clause.
 */
function stripSideWrite(side: EditorSideWrite): SideWrite {
  const { _uid, when, ...rest } = side;
  void _uid;
  return {
    ...rest,
    ...(when ? { when: stripExpression(when) } : {}),
  };
}

/**
 * Is this mapping row finished enough to send?
 *
 * Building one takes several clicks — add the row, pick the source, pick the
 * destination — and every intermediate state is a document the backend rightly
 * rejects: a column with no name fails `min_length`, a side-write with no
 * columns fails "would write an empty row".
 *
 * So the editor keeps the half-built row and the SERVER never sees it. Without
 * this, clicking "Also write to another table" put the whole document into
 * error until the last dropdown was chosen, and reported it as "String should
 * have at least 1 character" against the condition's label — a message about a
 * field the author had not touched, in a place they were not looking.
 *
 * Incomplete rows are dropped on the way out, not silently lost: they stay on
 * screen, and the box flags each one in amber until it is whole.
 */
function isCompleteEntry(entry: SideWriteField): boolean {
  if (!entry.column?.trim()) return false;
  if (entry.source) return true;
  if (entry.field?.trim()) return true;
  // An untyped constant is a row someone is still filling in. `0` and `false`
  // are real values and stay.
  return entry.value != null && entry.value !== "";
}

function stripAction(action: RuleAction): RuleAction {
  if (!action.also?.length) return action;
  return {
    ...action,
    also: action.also
      .map((side) => {
        const stripped = stripSideWrite(side as EditorSideWrite);
        return { ...stripped, write: (stripped.write ?? []).filter(isCompleteEntry) };
      })
      // A side-write with no table chosen, or nothing left to write, is not yet
      // a side-write.
      .filter((side) => side.table?.trim() && side.write.length),
  };
}

/**
 * Strip every `_uid` on the way out. The single place this happens — see the
 * module note on why it must be.
 */
export function toDocument(document: EditorDocument): RuleDocument {
  return {
    ...document,
    cases: document.cases.map((editorCase) => {
      const ruleCase = mapActions(editorCase as unknown as RuleCase, stripAction) as EditorCase;
      // `when` is pulled out and stripped like any other expression. It was
      // riding along inside `...rest` with its editor uids still attached, and
      // the backend forbids extra keys — so the moment a case had a switch
      // condition, saving and previewing both failed with two bare "Extra
      // inputs are not permitted" (the group's uid and its clause's), pinned to
      // the case with nothing to say which key was at fault.
      const { _uid, conditions, when, ...rest } = ruleCase;
      void _uid;
      const cleaned: RuleCase = {
        ...rest,
        ...(when ? { when: stripExpression(when as EditorExpression) } : {}),
        conditions: conditions.map((condition) => {
          const { _uid: conditionUid, expression, ...conditionRest } = condition;
          void conditionUid;
          return { ...conditionRest, expression: stripExpression(expression) };
        }),
      };
      // An append case carries no funnel; sending an empty `conditions` array
      // alongside `always` is exactly the "both shapes at once" the backend
      // rejects.
      if (cleaned.always != null) {
        delete cleaned.conditions;
        cleaned.outcomes = null;
      }
      return cleaned;
    }),
  };
}

/** Reorder a list to match a dragged sequence of uids. */
export function reorderByUid<T extends { _uid: string }>(items: T[], uids: string[]): T[] {
  const byUid = new Map(items.map((item) => [item._uid, item]));
  const next = uids.map((uid) => byUid.get(uid)).filter((item): item is T => item != null);
  // Defensive: if a uid went missing mid-drag, keep the stragglers rather than
  // dropping a condition someone wrote.
  for (const item of items) {
    if (!uids.includes(item._uid)) next.push(item);
  }
  return next;
}

// --------------------------------------------------------------------------
// Builders
// --------------------------------------------------------------------------

export function blankClause(schema?: RuleSchemaResponse): EditorClause {
  const column = schema?.destination_columns?.[0] ?? "";
  // A CONDITION clause, so check-only columns are out: they classify a record
  // in the switch and the backend rejects them here. Filtering the default
  // matters as much as filtering the dropdown — `incoming_fields` is sorted, so
  // a carried column named `email` would otherwise be the value every new
  // condition opened with, and the first thing anyone did would be rejected.
  const carried = new Set((schema?.check_only ?? []).map((c) => c.toLowerCase()));
  const usable = (schema?.incoming_fields ?? []).filter(
    (f) => !carried.has(f.toLowerCase())
  );
  const field = usable.includes(column) ? column : usable[0] ?? column;
  return {
    _uid: newUid("l"),
    left: { column },
    op: "eq",
    field,
    normalise: ["trim", "lower"],
  };
}

/**
 * A clause that tests a field on the ARRIVING RECORD, not a destination column.
 *
 * Used by a case's `when` and by a side-write's — both ask a question about the
 * record in hand rather than comparing it against rows of a table. Lives here
 * rather than beside either caller so the two cannot drift.
 */
export function blankRecordClause(schema?: RuleSchemaResponse): EditorClause {
  return {
    _uid: newUid("l"),
    left: { column: schema?.incoming_fields?.[0] ?? "" },
    op: "is_true",
  };
}

/**
 * A condition's expression is always an `and` group, even with one clause.
 *
 * Keeping the shape uniform means adding a second clause never has to
 * restructure the tree, and the editor never has to render two different
 * layouts for "one clause" and "several".
 */
export function blankExpression(schema?: RuleSchemaResponse): EditorExpression {
  return {
    _uid: newUid("e"),
    op: "and",
    args: [{ _uid: newUid("e"), op: "clause", clause: blankClause(schema) }],
  };
}

export function blankCondition(schema?: RuleSchemaResponse): EditorCondition {
  return {
    _uid: newUid("c"),
    expression: blankExpression(schema),
    // `none` is required; `one` and `many` are left out so they fall through to
    // the next condition exactly as the backend defaults them.
    outcomes: { none: { action: "insert" } },
  };
}

/** Wrap a bare clause leaf so it can sit inside a group's args. */
export function clauseLeaf(clause: EditorClause): EditorExpression {
  return { _uid: newUid("e"), op: "clause", clause };
}

/** A sub-group, for the OR-of-ANDs shape a fallback key needs. */
export function blankGroup(
  op: "and" | "or",
  schema?: RuleSchemaResponse
): EditorExpression {
  return { _uid: newUid("e"), op, args: [clauseLeaf(blankClause(schema))] };
}

/**
 * Every clause uid in the order the BACKEND numbers them.
 *
 * Validation errors arrive located as `…clauses.{n}.left.column`, where n comes
 * from Expression.clauses() — a depth-first walk in argument order. The editor
 * has to number identically or an error lights up the wrong row, which is worse
 * than showing it at the top.
 */
export function flatClauseUids(expression: EditorExpression): string[] {
  if (expression.op === "clause") return expression.clause ? [expression.clause._uid] : [];
  return (expression.args ?? []).flatMap(flatClauseUids);
}

/** Replace one clause anywhere in the tree, by uid. */
export function replaceClause(
  expression: EditorExpression,
  uid: string,
  next: EditorClause
): EditorExpression {
  if (expression.op === "clause") {
    return expression.clause?._uid === uid ? { ...expression, clause: next } : expression;
  }
  return {
    ...expression,
    args: (expression.args ?? []).map((a) => replaceClause(a, uid, next)),
  };
}

/**
 * Remove one clause anywhere in the tree, by uid.
 *
 * A group left with no arguments is removed too — the backend rejects an empty
 * `and`, and leaving an invisible husk behind would produce a save error with
 * nothing on screen to point at.
 */
export function removeClause(
  expression: EditorExpression,
  uid: string
): EditorExpression | null {
  if (expression.op === "clause") {
    return expression.clause?._uid === uid ? null : expression;
  }
  const args = (expression.args ?? [])
    .map((a) => removeClause(a, uid))
    .filter((a): a is EditorExpression => a != null);
  return args.length ? { ...expression, args } : null;
}

/** Append an argument to a group, by the group's uid. */
export function addToGroup(
  expression: EditorExpression,
  groupUid: string,
  arg: EditorExpression
): EditorExpression {
  if (expression.op === "clause") return expression;
  if (expression._uid === groupUid) {
    return { ...expression, args: [...(expression.args ?? []), arg] };
  }
  return {
    ...expression,
    args: (expression.args ?? []).map((a) => addToGroup(a, groupUid, arg)),
  };
}

/** Change a group's joiner, by uid. */
export function setGroupOp(
  expression: EditorExpression,
  groupUid: string,
  op: "and" | "or"
): EditorExpression {
  if (expression.op === "clause") return expression;
  if (expression._uid === groupUid) return { ...expression, op };
  return {
    ...expression,
    args: (expression.args ?? []).map((a) => setGroupOp(a, groupUid, op)),
  };
}
