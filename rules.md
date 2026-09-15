# Code Spacing and Dataset Preprocessing Rules

## Intent: Final Goal

Code, like poetry, should be both readable and pleasing to the eye.

The user directly defined the core principle as: **“Do consecutive statements look alike? If they do not, add a blank line between them.”**

Compare complete, consecutive statements at the same nesting level. Keep similar-looking single-line statements together, and separate statements that look different with a blank line. Large multiline expressions still require surrounding blank lines. “Looking alike” refers to the overall written form of the code, not exact character equality or shared semantic responsibilities. Semantics can help explain the code, but cannot replace this visual judgment.

This file records requirements from earlier conversations and the user's manual revisions to the first three batches of Java files, providing a basis for subsequent file-by-file preprocessing. The examples are confirmed, concrete decisions. Observations drawn from them must not be turned into unconditional rules without approval.

## Data: Rules and Evidence

### 1. Separate Different Forms of Expression with Blank Lines

The user explicitly identified boundaries between declarations and `if` statements, between declarations and function calls, and between other statements and `return`. Compare adjacent, complete statements at the same nesting level.

```java
Buffer buffer = createBuffer();

if (buffer.isEmpty()) {
  return;
}

consume(buffer);

return buffer;
```

When `return` is the first statement in a block, do not mechanically insert a blank line between it and the start of the block.

### 2. Similar Expressions May Stay Together Only When They Are Single-Line

Keep single-line statements of a similar kind and overall form together without adding a blank line after each one. Do not split a visually consistent group of declarations merely because their semantic actions can be distinguished as “querying,” “modifying,” and so on. Judge similarity using the complete statements; do not require every token or right-hand expression to be identical.

```java
long timeoutNanos = unit.toNanos(timeout);
long remainingNanos = timeoutNanos;
```

```java
putByte((byte) value);
putByte((byte) (value >>> 8));

return this;
```

### 3. Add Blank Lines Around Large Multiline Expressions

Even when adjacent expressions are of the same kind, a complete expression spanning multiple lines should be separated from neighboring statements by blank lines. Evaluate multiline declarations, assignments, calls, and control flow blocks as complete structures.

```java
waiterThreadUpdater = lookup.findVarHandle(Waiter.class, "thread", Thread.class);
waiterNextUpdater = lookup.findVarHandle(Waiter.class, "next", Waiter.class);

waitersUpdater =
    lookup.findVarHandle(AbstractFutureState.class, "waitersField", Waiter.class);

listenersUpdater =
    lookup.findVarHandle(AbstractFutureState.class, "listenersField", Listener.class);

valueUpdater = lookup.findVarHandle(AbstractFutureState.class, "valueField", Object.class);
```

Place blank lines outside complete expressions. Do not split argument lists, chained calls, continuation lines, or expression internals. When an expression is directly at the beginning or end of a block, do not add blank lines at the block edges merely to satisfy “blank lines on both sides.” Clauses such as `else`, `catch`, and `finally` remain part of their complete control structures.

### 4. Judge Similarity by the Complete Visual Form, Not Just Broad Syntax Categories

“All assignments,” “all calls,” or “all field declarations” is not enough to establish visual similarity. When reading statements individually, also observe whether declarations have initializers, the structure on both sides of assignments, call receivers and qualification, and field types and modifiers. Nor should every local difference cause a split: these are aspects to observe, and must be considered in the context of the overall form.

#### Separate Assignments of Call Results from Direct Reference Assignments

In `AbstractFutureState`, the user separated consecutive field offset calculations from storing the `unsafe` reference:

```java
VALUE_OFFSET = unsafe.objectFieldOffset(abstractFutureState.getDeclaredField("valueField"));
WAITER_THREAD_OFFSET = unsafe.objectFieldOffset(Waiter.class.getDeclaredField("thread"));
WAITER_NEXT_OFFSET = unsafe.objectFieldOffset(Waiter.class.getDeclaredField("next"));

UNSAFE = unsafe;
```

The first three statements repeat the form “field = method call on the same receiver”; the last changes to “field = direct reference.” Both the responsibility and the right-hand visual form change here. This must not be explained solely as “calculation versus storing a dependency.”

#### Separate Unqualified Calls from Qualified Calls

In `AbstractHasher`, the user separated byte processing from updating the buffer position:

```java
putBytes(b.array(), b.arrayOffset() + b.position(), b.remaining());

Java8Compatibility.position(b, b.limit());
```

The first statement appears as a direct `putBytes(...)` call, while the second uses the qualified form `Java8Compatibility.position(...)`. The user confirmed the separation here. The difference in responsibilities—processing data and updating a position—can aid understanding, but must not obscure the change in call form. This does not imply that every difference in receiver or function name requires separation.

#### Separate Constant Assignments from Assignments of Call Results

In both `AbstractIterator` files, the user separated the preliminary state assignment from the subsequent computation:

```java
state = State.FAILED; // temporary pessimism

next = computeNext();
```

The right-hand sides are a constant reference, `State.FAILED`, and a call, `computeNext()`, respectively. Their visual forms differ. Classifying them solely by the outer assignment syntax would miss this distinction.

#### Separate Member Reference Assignments from Numeric Initialization

The user added this separation in `AbstractMapBasedMultimap.setMap`:

```java
this.map = map;

totalSize = 0;
```

The left-hand side changes from a member access qualified by `this` to a direct field name, while the right-hand side changes from a reference to a numeric literal. The overall form changes. “Replacing data versus resetting statistics” is only a supporting explanation and cannot be the sole reason.

#### Separate Declarations Initialized by Calls from Bare Declarations

The user added this separation in `AbstractMapBasedMultiset.add`:

```java
Count frequency = backingMap.get(element);

int oldCount;
```

The first statement declares an object type initialized by a call; the second is a bare declaration of a conventional type. The visual forms on both sides change. Do not keep them together simply because both are local variable declarations. Conversely, do not generalize this to “initialized and uninitialized declarations must always be separated”; the simple null initialization example below should stay together.

#### Separate Conventional and Nonconventional Type Declarations When Their Right-Hand Sides Also Differ Significantly

The user added this separation in `AbstractNonStreamingHashFunction.hashUnencodedChars` and explicitly gave two reasons:

```java
int len = input.length();

ByteBuffer buffer = ByteBuffer.allocate(len * 2).order(ByteOrder.LITTLE_ENDIAN);
```

- The type declarations on the left differ: `int` is a conventional type, while `ByteBuffer` is a nonconventional type, giving the declarations different visual forms.
- The right-hand sides differ substantially: the first is a simple `input.length()` call, while the second includes arithmetic in an argument and chained calls, making its structure clearly different.

Together, these two aspects show that the statements “do not look alike.” Do not explain the distinction solely as a difference in length, call complexity, or semantic responsibilities such as obtaining a length versus creating a buffer. The distinction between conventional and nonconventional types follows the user's wording for this example; do not use it to invent a cross-language type allowlist.

#### Simple Null Initialization and Bare Declarations Can Stay Together

In `AbstractScheduledService`, the user removed the blank line between these statements:

```java
Throwable scheduleFailure = null;
Cancellable toReturn;
```

Both are short object-type declarations. `= null` introduces no complex right-hand structure, so they still look alike overall. Local differences such as type names or the presence of an initializer must not automatically trigger separation. Distinguish this case from the earlier combination of an object-type declaration initialized by a call and a bare declaration of a conventional type.

#### Do Not Split Simple Member Calls Solely Because Receiver Identities Differ

In `AbstractNonStreamingHashFunction`, the user removed the blank line between these statements:

```java
Java8Compatibility.flip(buffer);
newBuffer.put(buffer);
```

Both use the simple form `receiver.method(buffer)` and look similar overall, so they should stay together. One receiver being a class name and the other a variable name is not sufficient to require separation. The semantic difference between switching modes and copying data cannot replace visual judgment either. The earlier example separating an unqualified call from a qualified call must not be generalized into “different receivers require separation.”

#### Keep Visually Consistent Single-Line Declarations Together

The user removed a blank line the assistant had inserted between these statements:

```java
boolean wasEmpty = delegate.isEmpty();
boolean changed = delegate.add(value);
```

Both use the form `boolean variable = delegate.method(...)`. They look similar overall and should stay together. One querying and the other modifying is not sufficient reason to split them. Differences in method names or argument counts do not necessarily require separation either. This corrects the assistant's earlier overreliance on semantic phases when grouping statements.

#### Also Consider Types, Modifiers, and Declaration Forms in Field Sections

The user divided these fields into three groups:

```java
final Iterator<Map.Entry<E, Count>> entryIterator;

Map.@Nullable Entry<E, Count> currentEntry;

int occurrencesLeft;
boolean canRemove;
```

The first two groups have different visual forms: `final` with a nested generic type, and a qualified type with a type annotation. The last two statements are short primitive-type field declarations and stay together. Do not explain this edit solely as grouping responsibilities into an iterator, a current entry, and runtime state. Nor does it imply that “different type names always require a blank line.”

### 5. Boundaries of Manual Judgment and Generalization

- First identify complete statements and their single-line or multiline structure, then directly compare consecutive adjacent statements: do they look alike? Keep similar-looking single-line statements together, separate those that look different, and add blank lines around large multiline expressions.
- Compare the statements that are currently adjacent. Do not treat similar code elsewhere as part of the same consecutive group, and do not move code to form groups.
- Do not rely solely on broad AST node types or semantic responsibilities when separating statements. Statements with the same node type may still have clearly different visual forms.
- Do not treat every token difference as a separation point. Declarations in the same group may have different variable names, type names, arguments, or right-hand details; the overall visual form is what matters.
- When comparing declarations, consider both sides: conventional versus nonconventional types, type modifiers, and declaration structure on the left; simple values, simple calls, or complex chained expressions on the right. Do not consider only one side, and do not treat a simple `= null` like a complex call initializer.
- Preserve the specific layouts the user has confirmed. When examples do not establish a general boundary, do not extrapolate that “all statements of this kind must be separated.”
- These examples calibrate file-by-file judgment. They are not special rules matched by class, variable, or function name.

## Edges: Boundaries and Limitations

- The assistant must read, evaluate, and directly edit dataset files individually. Do not substitute the product model or batch formatting scripts for file-by-file judgment.
- Adjust only blank lines. Preserve all nonblank line content, indentation, code order, and line endings. Do not rename, refactor, or wrap lines.
- Keep comments attached to the code they describe. When separation is needed, place blank lines before the attached comments. Do not modify comment internals, code examples in documentation, or string contents.
- Do not split code at fixed line counts, mechanically add a blank line after every line, or use blank-line density as a substitute for readability judgment.
- Do not generate hardcoded formatting logic targeting specific examples, names, or file locations.
- Automation may be used only for read-only verification, diff comparison, and record generation. It cannot replace the manual spacing decisions required for this task.
- Do not overwrite corrections the user has already made. Follow the user's current scope and batch instructions.
- When the user asks to stop after completing a specified number of files, pause after verification and wait for review. Do not proceed to the next batch on your own.
- Do not initiate training, adjust the model, or modify product code as a consequence of data preprocessing alone.
- Do not generate test cases or use a browser to verify the UI unless the user requests it.
- When existing principles do not clearly resolve a detail that would affect subsequent processing decisions, ask the user to confirm it instead of extending the rules on your own.

## Answer: Deliverables and Success Criteria

Deliver directly modified dataset files, a clear processing scope, and verification results. For complex batches, follow the user's requirements by recording plans and execution details under `docs/<YYYY-MM-DD>/` with Chinese filenames, using the IDEA framework and including Mermaid architecture and data flow diagrams. Split any document that exceeds 1,000 lines.

Verification should confirm that only files within the authorized scope changed, that the byte sequence of nonblank lines remains identical, and that the user's existing edits were not overwritten. Reports must distinguish processed, unprocessed, and pending-review scopes.

After completion, review your own work: Were visual differences in declarations, initializers, assignments, or calls overlooked? Were statements mechanically kept together based only on broad syntax categories? Were visually consistent statements split again because their semantic actions differed? Were local token differences overgeneralized into separation rules? Were expression internals or comment attachments changed accidentally? Identical nonblank lines prove only that the edits stayed within scope; they do not prove that the spacing fully meets the desired aesthetic. Revisions following user review should continue to serve as calibration evidence.
