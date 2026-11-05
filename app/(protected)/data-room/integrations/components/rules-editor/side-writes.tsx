"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectGroup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  RuleSchemaResponse,
  SideWrite,
  SideWriteField,
} from "../../services/rules-api";
import {
  type EditorExpression,
  type EditorSideWrite,
  addToGroup,
  blankRecordClause,
  clauseLeaf,
  flatClauseUids,
  newUid,
  removeClause,
  replaceClause,
  setGroupOp,
} from "./editor-model";
import { ExpressionEditor } from "./expression-editor";

/**
 * Rows this action also writes to OTHER tables.
 *
 * The equity box on the business flowcharts: the engagement goes to
 * Engagements, the grant details go to Equity Grants.
 *
 * EVERY COLUMN NAMES BOTH ENDS. The arriving record calls it `shares`, the side
 * table calls it `equity_shares_promised`, and until a mapping could say so the
 * two had to share a name — which meant the name had to be a column on the MAIN
 * destination to survive the projection, which a side table's own vocabulary
 * never is. Side-writes were configurable and unable to fire.
 *
 * So the left-hand picker offers the ARRIVING RECORD's fields and the right-hand
 * one the side table's columns. Reading the target's columns on the left was the
 * old bug: it looked right, matched nothing, and carried nothing, silently.
 *
 * Bounded on purpose: a side-write gets a plain match key and one `when`, never
 * conditions of its own. A secondary table that needs narrowing logic deserves
 * its own job.
 */

const CONSTANT = "__constant__";
const THIS_RECORD = "this_record";

/**
 * Both spellings, because there are two.
 *
 * The rule schema reports `FieldType.MULTIPLE_RECORD_LINKS` where the field
 * type came through as an enum, and `multipleRecordLinks` where it came through
 * as Airtable's own camelCase string. Matching only the first is how this
 * silently offered no destinations at all.
 */
const isLinkField = (type?: string) => /record_?links?/i.test(type ?? "");

interface Props {
  also: SideWrite[];
  schema?: RuleSchemaResponse;
  disabled?: boolean;
  onChange: (next: SideWrite[]) => void;
}

export function SideWrites({ also, schema, disabled, onChange }: Props) {
  const tables = schema?.tables ?? [];
  const incoming = schema?.incoming_fields ?? [];
  const carried = new Set((schema?.check_only ?? []).map((c) => c.toLowerCase()));

  function patch(index: number, changes: Partial<EditorSideWrite>) {
    onChange(
      also.map((s, i) => (i === index ? ({ ...s, ...changes } as SideWrite) : s))
    );
  }

  function add() {
    const first = tables.find((t) => !t.is_destination) ?? tables[0];
    onChange([
      ...also,
      {
        _uid: newUid("s"),
        table: first?.name ?? "",
        action: "insert",
        write: [],
      } as EditorSideWrite as SideWrite,
    ]);
  }

  return (
    <div className="mt-1.5 space-y-1.5">
      {also.map((raw, i) => {
        const side = raw as EditorSideWrite;
        const target = tables.find((t) => t.name === side.table);
        const columns = target?.columns ?? [];
        const entries = side.write ?? [];
        const used = new Set(entries.map((e) => e.column.toLowerCase()));

        function setEntries(next: SideWriteField[]) {
          patch(i, { write: next });
        }

        // Same normalisation a case's `when` gets: a bare leaf becomes a group
        // on read so the editor never renders two different layouts for "one
        // clause" and "several".
        const whenGroup: EditorExpression | null = side.when
          ? side.when.op !== "clause"
            ? side.when
            : { _uid: newUid("e"), op: "and", args: [side.when] }
          : null;

        function setWhen(expression: EditorExpression | null) {
          patch(i, { when: expression });
        }

        return (
          <div
            key={side._uid ?? i}
            className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-2"
          >
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                also write to
              </span>

              <Select
                value={side.table || undefined}
                // Destination names belong to the old table, so they go with
                // it. The SOURCES are kept: they name the arriving record, which
                // has not changed, and retyping them is the tedious part.
                onValueChange={(table) =>
                  patch(i, {
                    table,
                    write: entries.map((e) =>
                      e.source != null
                        ? { column: "", source: e.source }
                        : e.field != null
                          ? { column: "", field: e.field }
                          : { column: "", value: e.value }
                    ),
                    match_on: [],
                  })
                }
                disabled={disabled}
              >
                <SelectTrigger className="h-7 w-[150px] bg-white font-mono text-[10px]">
                  <SelectValue placeholder="Table…" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((t) => (
                    <SelectItem key={t.name} value={t.name} className="font-mono text-xs">
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={side.action}
                onValueChange={(a) =>
                  patch(i, {
                    action: a as "insert" | "upsert",
                    // A key is required for upsert and rejected for insert.
                    match_on: a === "upsert" ? side.match_on ?? [] : [],
                  })
                }
                disabled={disabled}
              >
                <SelectTrigger className="h-7 w-[130px] bg-white text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="insert" className="text-xs">always add a row</SelectItem>
                  <SelectItem value="upsert" className="text-xs">match, else add</SelectItem>
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="ml-auto h-7 w-7 text-slate-400 hover:text-red-600"
                onClick={() => onChange(also.filter((_, j) => j !== i))}
                disabled={disabled}
                aria-label="Remove side-write"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="mt-1.5 space-y-1">
              {entries.map((entry, j) => (
                <MappingRow
                  key={j}
                  entry={entry}
                  incoming={incoming}
                  carried={carried}
                  columns={columns}
                  columnTypes={target?.column_types ?? {}}
                  used={used}
                  disabled={disabled}
                  onChange={(next) =>
                    setEntries(entries.map((e, k) => (k === j ? next : e)))
                  }
                  onRemove={() => setEntries(entries.filter((_, k) => k !== j))}
                />
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 text-[10px]"
                disabled={disabled || !side.table}
                onClick={() => {
                  // Default to the first unused source, paired with a side
                  // column of the same name where one exists — which makes the
                  // common case one click, and is all the older shape could say.
                  const field = incoming.find((f) => !used.has(f.toLowerCase()));
                  const column = columns.find(
                    (c) => c.toLowerCase() === (field ?? "").toLowerCase()
                  );
                  setEntries([
                    ...entries,
                    { column: column ?? "", field: field ?? "" },
                  ]);
                }}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add column
              </Button>
            </div>

            {side.action === "upsert" && (
              <div className="mt-1.5">
                <ColumnList
                  label="Match on"
                  columns={columns}
                  selected={side.match_on ?? []}
                  disabled={disabled}
                  onChange={(match_on) => patch(i, { match_on })}
                />
              </div>
            )}

            <label className="mt-1.5 flex items-center gap-1.5 text-[10px] text-indigo-700">
              <Checkbox
                checked={whenGroup != null}
                disabled={disabled}
                onCheckedChange={(on) =>
                  setWhen(
                    on === true
                      ? {
                          _uid: newUid("e"),
                          op: "and",
                          args: [clauseLeaf(blankRecordClause(schema))],
                        }
                      : null
                  )
                }
              />
              Only when…
              <span className="text-slate-500">
                — otherwise a row is written for every record this outcome handles
              </span>
            </label>

            {whenGroup && (
              <div className="mt-1 rounded-md border border-indigo-200 bg-white p-1.5">
                {/*
                  mode="record" is load-bearing, not cosmetic. A clause that
                  names a table is evaluated against that table's snapshot, and
                  side-write targets are never scanned — so a table-qualified
                  clause here raises and fails the whole run.
                */}
                <ExpressionEditor
                  expression={whenGroup}
                  errorFor={() => undefined}
                  mode="record"
                  targetTable={side.table}
                  schema={schema}
                  disabled={disabled}
                  totalClauses={flatClauseUids(whenGroup).length}
                  onChangeClause={(uid, next) =>
                    setWhen(replaceClause(whenGroup, uid, next))
                  }
                  onRemoveClause={(uid) => setWhen(removeClause(whenGroup, uid))}
                  onAddClause={(groupUid) =>
                    setWhen(
                      addToGroup(whenGroup, groupUid, clauseLeaf(blankRecordClause(schema)))
                    )
                  }
                  onAddGroup={(groupUid) =>
                    setWhen(
                      addToGroup(whenGroup, groupUid, {
                        _uid: newUid("e"),
                        op: "and",
                        args: [clauseLeaf(blankRecordClause(schema))],
                      })
                    )
                  }
                  onSetOp={(groupUid, op) => setWhen(setGroupOp(whenGroup, groupUid, op))}
                />
              </div>
            )}

            <Warnings
              entries={entries}
              columns={columns}
              columnTypes={target?.column_types ?? {}}
              incoming={incoming}
              table={side.table}
              action={side.action}
            />
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-6 text-[10px]"
        disabled={disabled || tables.length === 0}
        onClick={add}
      >
        <Plus className="mr-1 h-3 w-3" />
        Also write to another table
      </Button>
    </div>
  );
}

/** One column on the side table, and where its value comes from. */
function MappingRow({
  entry,
  incoming,
  carried,
  columns,
  columnTypes,
  used,
  disabled,
  onChange,
  onRemove,
}: {
  entry: SideWriteField;
  incoming: string[];
  carried: Set<string>;
  columns: string[];
  columnTypes: Record<string, string>;
  used: Set<string>;
  disabled?: boolean;
  onChange: (next: SideWriteField) => void;
  onRemove: () => void;
}) {
  const kind =
    entry.source === THIS_RECORD ? THIS_RECORD : entry.field != null ? "field" : CONSTANT;

  function setSource(v: string) {
    if (v === THIS_RECORD) {
      // Cleared only when the destination is KNOWN to be unable to hold a link.
      // An unrecognised type is not evidence against the column, and discarding
      // a correct choice because we could not read its type is the same
      // silent-wall mistake as filtering the list down to nothing.
      const type = columnTypes[entry.column];
      const column = type && !isLinkField(type) ? "" : entry.column;
      onChange({ column, source: THIS_RECORD });
    } else if (v === CONSTANT) {
      onChange({ column: entry.column, value: entry.value ?? "" });
    } else {
      onChange({ column: entry.column, field: v });
    }
  }

  // A record id can only land in a linked-record column, so that is what this
  // row is steered towards — but STEERED, not confined.
  //
  // Narrowing the list depends on recognising the table's field types, and if
  // that recognition fails the filter removes every option and the control
  // disables itself: the author is locked out of a column that was there all
  // along, with nothing on screen to say why. A hint that can silently become a
  // wall is worse than no hint. So when nothing matches, offer everything and
  // let the warning below carry the point instead.
  const links = columns.filter((c) => isLinkField(columnTypes[c]));
  const targets = kind === THIS_RECORD && links.length ? links : columns;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {kind === CONSTANT ? (
        <div className="flex items-center gap-1">
          <Select value={CONSTANT} onValueChange={setSource} disabled={disabled}>
            <SelectTrigger className="h-7 w-[92px] bg-white text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SourceOptions incoming={incoming} carried={carried} />
          </Select>
          <Input
            className="h-7 w-[132px] bg-white font-mono text-[10px]"
            placeholder="Fixed value"
            value={String(entry.value ?? "")}
            disabled={disabled}
            onChange={(e) => onChange({ column: entry.column, value: e.target.value })}
          />
        </div>
      ) : (
        <Select
          value={kind === THIS_RECORD ? THIS_RECORD : entry.field || undefined}
          onValueChange={setSource}
          disabled={disabled}
        >
          <SelectTrigger className="h-7 w-[228px] bg-white font-mono text-[10px]">
            <SelectValue placeholder="From…" />
          </SelectTrigger>
          <SourceOptions incoming={incoming} carried={carried} />
        </Select>
      )}

      <span className="text-[10px] text-indigo-700">→</span>

      <Select
        value={entry.column || undefined}
        onValueChange={(column) => onChange({ ...entry, column })}
        disabled={disabled || targets.length === 0}
      >
        <SelectTrigger className="h-7 w-[168px] bg-white font-mono text-[10px]">
          <SelectValue placeholder="Into…" />
        </SelectTrigger>
        <SelectContent>
          {targets.map((c) => (
            <SelectItem
              key={c}
              value={c}
              disabled={c !== entry.column && used.has(c.toLowerCase())}
              className="font-mono text-xs"
            >
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-slate-400 hover:text-red-600"
        onClick={onRemove}
        disabled={disabled}
        aria-label="Remove column"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

/**
 * The left-hand vocabulary: everything the record will carry.
 *
 * Carried columns are badged rather than hidden. They are legal sources here —
 * the deliberate inversion of the rule for conditions, which may not read one:
 * a condition compares against a destination table, while a side-write names a
 * translation between two, which is exactly where a carried name belongs.
 */
function SourceOptions({
  incoming,
  carried,
}: {
  incoming: string[];
  carried: Set<string>;
}) {
  return (
    <SelectContent>
      <SelectGroup>
        <SelectLabel className="text-[10px]">From the arriving record</SelectLabel>
        {incoming.map((f) => (
          <SelectItem key={f} value={f} className="font-mono text-xs">
            {f}
            {carried.has(f.toLowerCase()) && (
              <span className="ml-1.5 text-[9px] uppercase tracking-wide text-slate-400">
                carried
              </span>
            )}
          </SelectItem>
        ))}
      </SelectGroup>
      <SelectGroup>
        <SelectItem value={CONSTANT} className="text-xs">
          A fixed value…
        </SelectItem>
        <SelectItem value={THIS_RECORD} className="text-xs">
          This record — link back
        </SelectItem>
      </SelectGroup>
    </SelectContent>
  );
}

/**
 * What the backend will reject, said before the save rather than after it.
 *
 * The source warning is the one that matters: a column that is neither mapped
 * nor carried is stripped from the record before any rule runs, so the write
 * would be built from nothing — the failure that kept the equity placeholder
 * empty on every run without ever reporting anything.
 */
function Warnings({
  entries,
  columns,
  columnTypes,
  incoming,
  table,
  action,
}: {
  entries: SideWriteField[];
  columns: string[];
  columnTypes: Record<string, string>;
  incoming: string[];
  table: string;
  action: string;
}) {
  const known = new Set(columns.map((c) => c.toLowerCase()));
  const carriable = new Set(incoming.map((f) => f.toLowerCase()));

  const problems: string[] = [];
  if (!entries.length) {
    problems.push(
      "No columns yet — add at least one, or this side-write is not saved."
    );
  }
  for (const entry of entries) {
    if (!entry.column) {
      problems.push(
        `Choose where this goes on ${table || "the side table"} — until then the ` +
          `column is not saved.`
      );
    } else if (columns.length && !known.has(entry.column.toLowerCase())) {
      problems.push(`'${entry.column}' is not a column on ${table}.`);
    }
    if (entry.field && incoming.length && !carriable.has(entry.field.toLowerCase())) {
      problems.push(
        `The arriving record has no '${entry.field}'. Map it, or add it to the ` +
          `columns the rules read but never write.`
      );
    }
    // Only when the type is known AND says no. The destination list is no
    // longer narrowed when field types are unreadable, so this is what still
    // catches a link aimed at a text column — without ever being the reason a
    // column cannot be picked.
    if (
      entry.source === THIS_RECORD &&
      entry.column &&
      columnTypes[entry.column] &&
      !isLinkField(columnTypes[entry.column])
    ) {
      problems.push(
        `'${entry.column}' is not a linked-record column, so a record id written ` +
          `there would be text rather than a link.`
      );
    }
  }

  // Notes, not problems — nothing here needs fixing before saving.
  const notes: string[] = [];
  // The one case that can still come back unset, said plainly rather than
  // discovered from a run warning.
  if (entries.some((e) => e.source === THIS_RECORD)) {
    notes.push(
      "Linking back resolves against the row this rule writes — immediately when it " +
        "updates or merges, and after the write when it inserts. If this job has no " +
        "key that tells its rows apart, the link is left unset and reported rather " +
        "than guessed."
    );
  }
  if (action === "insert" && entries.length > 0) {
    notes.push(
      "Adds a row every run this outcome fires. Use “match, else add” with a key if " +
        "the same record can arrive twice."
    );
  }

  return (
    <>
      {problems.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {problems.map((p, i) => (
            <li key={i} className="text-[10px] font-medium text-amber-700">
              {p}
            </li>
          ))}
        </ul>
      )}
      {notes.map((n, i) => (
        <p key={i} className="mt-1 text-[10px] text-slate-500">
          {n}
        </p>
      ))}
    </>
  );
}

function ColumnList({
  label,
  columns,
  selected,
  disabled,
  onChange,
}: {
  label: string;
  columns: string[];
  selected: string[];
  disabled?: boolean;
  onChange: (next: string[]) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || columns.length === 0}
          className="h-7 w-full justify-start bg-white px-2 text-[10px] font-normal"
        >
          <span className="mr-1 font-bold text-slate-500">{label}:</span>
          <span className="truncate font-mono">
            {selected.length ? selected.join(", ") : "none"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-2" align="start">
        <div className="max-h-56 space-y-1 overflow-y-auto">
          {columns.map((column) => (
            <label
              key={column}
              className="flex items-center gap-2 rounded px-1 py-0.5 font-mono text-[11px] hover:bg-slate-50"
            >
              <Checkbox
                checked={selected.includes(column)}
                onCheckedChange={(on) =>
                  onChange(
                    on === true ? [...selected, column] : selected.filter((c) => c !== column)
                  )
                }
              />
              {column}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
