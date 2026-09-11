# 代码留白与数据集预处理规则

## Intent：最终目标

代码如诗，不仅要好读，还要好看。

用户对核心原则的直接定义是：**“连续挨着的语句长得像不像，长得不像的就要加入空行。”**

判断对象是同一层级连续相邻的完整语句。长得像的单行语句连写，长得不像的语句之间加空行；大段多行表达式仍遵循前后留白的要求。这里的“像不像”指代码呈现出来的整体书写形态，不是要求字符完全相同，也不是判断语义职责是否相同。语义可以帮助读懂代码，但不能替代这个视觉判断。

本文件记录用户此前对话中的要求，以及用户对前三批 Java 文件的手动修订，作为后续逐文件预处理的依据。实例是已确认的具体判断；从实例归纳的观察维度不能擅自变成无条件规则。

## Data：规则与依据

### 1. 不同类型的表达方式之间需要空行

用户明确指出的边界包括：声明到 `if`、声明到函数调用，以及其他语句到 `return`。判断对象是同一层级相邻的完整语句。

```java
Buffer buffer = createBuffer();

if (buffer.isEmpty()) {
  return;
}

consume(buffer);

return buffer;
```

`return` 是块中第一条语句时，不在它与块起始位置之间机械插入空行。

### 2. 同类表达式连写的前提是它们都是单行

单行且整体表现形式相近的同类语句连续书写，不逐行添加空行。不能仅因语义上能区分出“查询”“修改”等动作，就拆开形式一致的一组声明。形式是否相近要结合完整语句判断，不能要求所有词元或右侧表达式完全相同。

```java
long timeoutNanos = unit.toNanos(timeout);
long remainingNanos = timeoutNanos;
```

```java
putByte((byte) value);
putByte((byte) (value >>> 8));

return this;
```

### 3. 大段多行表达式前后需要空行

即使相邻表达式同类，只要完整表达式跨多行，也应在其与前后相邻语句之间留白。多行声明、赋值、调用及控制流程块都应按完整结构判断。

```java
waiterThreadUpdater = lookup.findVarHandle(Waiter.class, "thread", Thread.class);
waiterNextUpdater = lookup.findVarHandle(Waiter.class, "next", Waiter.class);

waitersUpdater =
    lookup.findVarHandle(AbstractFutureState.class, "waitersField", Waiter.class);

listenersUpdater =
    lookup.findVarHandle(AbstractFutureState.class, "listenersField", Listener.class);

valueUpdater = lookup.findVarHandle(AbstractFutureState.class, "valueField", Object.class);
```

留白位于完整表达式外侧，不拆开参数列表、链式调用、续行或表达式内部。表达式紧邻块首尾时，不为凑齐“前后空行”增加块边缘空行；`else`、`catch`、`finally` 等仍属于其完整控制结构。

### 4. “同类”依据完整表现形式判断，不能只看粗粒度语法类别

“都是赋值”“都是调用”“都是字段声明”不足以判断表现形式相同。逐个阅读时，要进一步观察声明是否带初始化、赋值左右两侧的结构、调用的接收者与限定方式，以及字段的类型和修饰形式。也不能只看到局部差异就拆段：这些是观察维度，需要结合整体形式判断。

#### 调用结果赋值与直接引用赋值分段

用户在 `AbstractFutureState` 中将连续的字段偏移量计算与保存 `unsafe` 引用分开：

```java
VALUE_OFFSET = unsafe.objectFieldOffset(abstractFutureState.getDeclaredField("valueField"));
WAITER_THREAD_OFFSET = unsafe.objectFieldOffset(Waiter.class.getDeclaredField("thread"));
WAITER_NEXT_OFFSET = unsafe.objectFieldOffset(Waiter.class.getDeclaredField("next"));

UNSAFE = unsafe;
```

前三句重复“字段 = 同一接收者的方法调用”的形式；最后一句变为“字段 = 直接引用”。这里既有职责变化，也有明确的右侧表现形式变化，不能只解释为“计算与保存依赖”。

#### 无限定调用与带限定者的调用分段

用户在 `AbstractHasher` 中将字节处理与缓冲区位置更新分开：

```java
putBytes(b.array(), b.arrayOffset() + b.position(), b.remaining());

Java8Compatibility.position(b, b.limit());
```

前一句以 `putBytes(...)` 直接调用的形式出现，后一句以 `Java8Compatibility.position(...)` 带限定者的形式出现。用户在此确认了分段；处理数据和更新位置的职责差异可以辅助理解，但不能掩盖调用表现形式的变化。不能据此推出任意接收者或函数名不同都必须分段。

#### 常量赋值与调用结果赋值分段

用户在两个 `AbstractIterator` 文件中均将预备状态设置与后续计算分开：

```java
state = State.FAILED; // temporary pessimism

next = computeNext();
```

右侧分别是 `State.FAILED` 常量引用和 `computeNext()` 调用，表现形式不同。只按外层赋值语句归类会漏掉这个差异。

#### 成员引用赋值与数值初始化分段

用户在 `AbstractMapBasedMultimap.setMap` 中补充：

```java
this.map = map;

totalSize = 0;
```

左侧从 `this` 限定的成员访问变为直接字段名，右侧从引用变为数值字面量，整体形式发生变化。“替换数据与重置统计”只是辅助解释，不能作为唯一理由。

#### 带调用初始化的声明与纯声明分段

用户在 `AbstractMapBasedMultiset.add` 中补充：

```java
Count frequency = backingMap.get(element);

int oldCount;
```

前一句是带调用初始化的对象类型声明，后一句是常规类型的纯声明，左右两侧的表现形式均有变化。不能因为都是局部变量声明就连写，也不能反过来归纳为“带初始化与不带初始化必然分段”；下面的简单 null 初始化实例应连写。

#### 常规类型与非常规类型的声明，加上右侧赋值明显不同，应分段

用户在 `AbstractNonStreamingHashFunction.hashUnencodedChars` 中补充，并明确说明了两个原因：

```java
int len = input.length();

ByteBuffer buffer = ByteBuffer.allocate(len * 2).order(ByteOrder.LITTLE_ENDIAN);
```

- 左侧类型声明不一致：`int` 是常规类型，`ByteBuffer` 是非常规类型，声明的表现形式有区别。
- 右侧赋值差别大：前一句是简单的 `input.length()`，后一句包含参数运算和连续链式调用，结构明显不同。

这两方面共同体现了“长得不像”。不能仅解释为长度不同、都是调用但复杂度不同，或获取长度与创建缓冲区的语义职责不同。常规类型与非常规类型沿用用户在此例中的区分，不据此擅自建立跨语言类型白名单。

#### 简单 null 初始化与纯声明可以连写

用户在 `AbstractScheduledService` 中删除了以下两句之间的空行：

```java
Throwable scheduleFailure = null;
Cancellable toReturn;
```

两句都是简短的对象类型声明，`= null` 没有引入复杂的右侧结构，整体仍然长得像。不同类型名、有无初始化这些局部差异不能自动触发分段。应与前面的对象类型调用初始化和常规类型纯声明的组合区分开。

#### 简单成员调用不因接收者身份不同而拆开

用户在 `AbstractNonStreamingHashFunction` 中删除了以下两句之间的空行：

```java
Java8Compatibility.flip(buffer);
newBuffer.put(buffer);
```

两句都是简单的 `接收者.方法(buffer)`，整体表现形式相近，应连写。一个接收者是类名、另一个是变量名，不足以要求分段；切换模式和复制数据的语义区别也不能替代外形判断。此前无限定调用与带限定调用分段的实例，不应推广成“接收者不同就分段”。

#### 形式一致的单行声明保持连续

用户删除了以下两句之间由助手加入的空行：

```java
boolean wasEmpty = delegate.isEmpty();
boolean changed = delegate.add(value);
```

两句都是 `boolean 变量 = delegate.方法(...)`，整体形式相近，应连写。一个查询、一个修改，不足以构成拆段理由；方法名和参数数量的不同也不必然要求分段。这纠正了助手此前过度依据语义阶段分段的做法。

#### 字段区也观察类型、修饰和声明形式

用户将以下字段分为三组：

```java
final Iterator<Map.Entry<E, Count>> entryIterator;

Map.@Nullable Entry<E, Count> currentEntry;

int occurrencesLeft;
boolean canRemove;
```

前两组分别具有 `final` 加嵌套泛型类型、带类型注解的限定类型这些不同表现形式；后两句都是简短的基本类型字段声明，保持连写。不能只将这个修改解释为按迭代器、当前条目和运行状态划分职责，也不能推出“类型名称不同就必须空行”。

### 5. 人工判断与归纳的边界

- 先识别完整语句及单行、多行结构，再直接比较连续相邻的语句：它们长得像不像？单行且长得像就连写，长得不像就加空行；大段多行表达式前后留白。
- 比较当前相邻的语句，不因远处存在同类代码就将它们视为连续的一组，也不移动代码来凑组。
- 不只依赖粗粒度 AST 节点类型，也不只依据语义职责分段。相同节点类型内部仍可能存在明显的形式差异。
- 不把每个词元差异都当成分段点。同组声明可以有不同变量名、类型名、参数或右侧细节，关键是整体表现形式。
- 比较声明时同时看左右两侧：左侧的常规类型与非常规类型、类型修饰和声明结构，以及右侧是简单值、简单调用还是复杂链式表达式。不要只看其中一侧，也不要把简单 `= null` 与复杂调用初始化等同处理。
- 保留用户已确认的具体布局。实例不足以确定普遍边界时，不擅自推广为“所有此类语句必须分段”。
- 这些实例用于校准逐文件判断，不是按类名、变量名或函数名匹配的特殊规则。

## Edges：边界与限制

- 数据集预处理由助手逐个阅读、判断并直接编辑。不得调用产品模型或批量格式化脚本代替逐文件判断。
- 只调整空行，保留所有非空行内容、缩进、代码顺序和行尾；不重命名、不重构、不折行。
- 保持注释与所说明代码的贴附关系，需要分段时在附属注释之前留白；不修改注释内部、文档代码示例或字符串内容。
- 不按固定行数分段，不给每行机械加空行，不以空行密度代替可读性判断。
- 不生成针对具体样例、名称或文件位置的硬编码格式化逻辑。
- 自动化只可用于只读核查、差异比较和记录生成，不能替代本次要求的人工留白决策。
- 不覆盖用户已完成的校正；处理范围和批次遵循用户当前指定。
- 用户要求完成指定数量后停止时，完成核查后暂停，等待审核，不自行扩展到下一批。
- 不因数据预处理自行启动训练、调整模型或修改产品代码。
- 用户未要求时，不生成测试用例，不调用浏览器确认 UI。
- 遇到现有原则无法明确解决、会影响后续处理口径的细节，不擅自扩展规则，应交由用户确认。

## Answer：交付与成功标准

交付直接修改的数据集文件、清晰的处理范围和核查结果。复杂批次按用户要求在 `docs/<YYYY-MM-DD>/` 下使用中文文件名记录计划与执行细节，采用 IDEA 框架，并提供 Mermaid 架构图和数据流图；单篇文档超过 1000 行时拆分。

核查应确认：只有授权范围内的文件发生变化，非空行字节序列保持一致，用户已有修改未被覆盖。报告必须区分已处理、未处理和待审核范围。

完成后进行自我审查：是否忽略了声明、初始化、赋值或调用的表现形式差异；是否只按粗粒度语法类型机械连写；是否又因语义动作不同而拆散了形式一致的语句；是否将局部词元差异过度推广为分段规则；是否误改表达式内部或注释贴附关系。非空行一致只能证明修改范围，不能证明留白审美已完全满足要求；用户审核后的修订应继续作为校准依据。
